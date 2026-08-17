<?php
/**
 * Plugin Name: TFE — Headless links & studio redirect
 * Description: Aligne le CMS sur son rôle de backend headless : les permaliens
 *              d'articles pointent vers le front Next.js, et la racine du CMS
 *              renvoie vers la page d'authentification au lieu d'exposer le
 *              thème Foxiz.
 * Author: The Fourth Estate
 * Version: 1.0.0
 *
 * ---------------------------------------------------------------------------
 * INSTALLATION : déposer ce fichier dans wp-content/mu-plugins/ du WordPress
 * de cms.thefourthestategh.com. Les mu-plugins sont actifs d'office et
 * survivent aux mises à jour de Foxiz — même raison que tfe-hero-video.php.
 *
 * CONTEXTE : depuis la bascule du 16/08/2026, thefourthestategh.com sert le
 * front Next.js et cms.thefourthestategh.com le WordPress. L'option `home` a dû
 * être ramenée sur le domaine du CMS, sinon rest_url() se construisait sur le
 * front et l'éditeur de blocs ne pouvait plus enregistrer (« Publishing failed.
 * Could not get a valid response from the server »). Effet de bord : les liens
 * « Voir l'article » de l'admin repointaient sur le CMS. C'est ce que corrige
 * la partie 1.
 *
 * CE QUI N'EST VOLONTAIREMENT PAS TOUCHÉ :
 * - L'aperçu (`preview_post_link`) reste sur le CMS : le front Next.js n'a pas
 *   de route de prévisualisation des brouillons. Les rédacteurs gardent donc un
 *   aperçu fonctionnel via le thème.
 * - Le champ REST `link` change lui aussi (il dérive de get_permalink), mais
 *   c'est sans conséquence : le front reconstruit ses URLs avec buildHref()
 *   à partir de la date et du slug, il ne lit jamais `link`.
 * - Les pages, les archives et les CPT gardent leurs permaliens d'origine :
 *   seuls les articles ont une route équivalente côté Next.
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Origine du front Next.js, sans slash final.
 */
const TFE_FRONT_ORIGIN = 'https://thefourthestategh.com';

/**
 * Chemin de la page d'authentification — le slug « Hide Backend » d'iThemes
 * Security. Laisser la chaîne vide pour s'en remettre à wp_login_url(), qui
 * suit automatiquement le réglage d'iThemes si le slug change un jour.
 */
const TFE_STUDIO_PATH = '/mfwa-studio';


/* -------------------------------------------------------------------------
 * 1. Permaliens des articles → front Next.js
 * ---------------------------------------------------------------------- */

/**
 * Réécrit le permalien d'un article vers /YYYY/MM/slug sur le domaine du front.
 *
 * Miroir exact de buildHref() (app/services/wpApi.ts) : mois sur deux chiffres,
 * date locale du site. Le site tourne en UTC (gmt_offset 0, et le Ghana est à
 * UTC+0), donc `false` en second argument de get_post_time() donne bien la même
 * valeur que le champ `date` de l'API REST, qui est ce que lit le front.
 *
 * @param string       $permalink Permalien calculé par WordPress.
 * @param WP_Post|int  $post      Article concerné.
 * @return string
 */
function tfe_headless_front_permalink( $permalink, $post ) {
	$post = get_post( $post );

	if ( ! $post instanceof WP_Post || 'post' !== $post->post_type ) {
		return $permalink;
	}

	// Brouillons et auto-drafts : ni slug définitif ni date fiable. On laisse
	// WordPress faire — c'est aussi ce que consulte l'aperçu, qui doit rester
	// sur le CMS.
	if ( '' === $post->post_name
		|| in_array( $post->post_status, array( 'auto-draft', 'draft', 'pending' ), true ) ) {
		return $permalink;
	}

	$year  = get_post_time( 'Y', false, $post );
	$month = get_post_time( 'm', false, $post );

	// Garde-fou : une date invalide renverrait /0/00/slug, un lien mort servi
	// en toute confiance. Mieux vaut le permalien d'origine.
	if ( empty( $year ) || empty( $month ) ) {
		return $permalink;
	}

	return TFE_FRONT_ORIGIN . '/' . $year . '/' . $month . '/' . $post->post_name;
}
add_filter( 'post_link', 'tfe_headless_front_permalink', 10, 2 );


/* -------------------------------------------------------------------------
 * 2. Racine du CMS → page d'authentification
 * ---------------------------------------------------------------------- */

/**
 * Renvoie la racine de cms.thefourthestategh.com vers l'écran de connexion.
 *
 * Accroché à `template_redirect`, donc uniquement sur les vues front-end
 * rendues par WordPress. N'intercepte ni /wp-json (REST), ni /wp-admin, ni
 * admin-ajax.php, ni wp-cron.php, ni les fichiers statiques de wp-content —
 * aucun de ces chemins ne passe par ce hook. Les gardes ci-dessous couvrent les
 * cas qui, eux, y passent.
 */
function tfe_headless_studio_redirect() {
	// Seule la racine est concernée : les articles doivent rester consultables
	// sur le CMS pour que l'aperçu des brouillons continue de fonctionner.
	if ( ! is_front_page() && ! is_home() ) {
		return;
	}

	if ( is_admin() || wp_doing_ajax() || wp_doing_cron() ) {
		return;
	}

	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
		return;
	}

	// Flux RSS, robots.txt et trackbacks passent par template_redirect et ne
	// doivent pas être détournés vers un écran de login.
	if ( is_feed() || is_robots() || is_trackback() ) {
		return;
	}

	$target = '' !== TFE_STUDIO_PATH ? home_url( TFE_STUDIO_PATH ) : wp_login_url();

	// Anti-boucle : si la cible est elle-même servie comme page d'accueil (slug
	// promu en front page par erreur), on ne redirige pas vers soi-même.
	$request_path = isset( $_SERVER['REQUEST_URI'] )
		? wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ), PHP_URL_PATH )
		: '/';
	$target_path  = wp_parse_url( $target, PHP_URL_PATH );

	if ( $target_path && untrailingslashit( (string) $request_path ) === untrailingslashit( $target_path ) ) {
		return;
	}

	// Un rédacteur déjà connecté n'a rien à faire sur un écran de login.
	if ( is_user_logged_in() ) {
		wp_safe_redirect( admin_url(), 302 );
		exit;
	}

	// 302 et non 301 : Cloudflare est devant ce domaine et un 301 se graverait
	// dans les navigateurs comme dans son cache. Revenir en arrière deviendrait
	// impossible sans purger tout le monde.
	wp_safe_redirect( $target, 302 );
	exit;
}
add_action( 'template_redirect', 'tfe_headless_studio_redirect' );
