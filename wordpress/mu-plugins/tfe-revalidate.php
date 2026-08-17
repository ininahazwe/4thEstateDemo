<?php
/**
 * Plugin Name: TFE — Revalidation à la demande du front Next.js
 * Description: Ping la route /api/revalidate du front à chaque publication ou
 *              modification, pour que le changement soit visible tout de suite
 *              au lieu d'attendre la fenêtre ISR.
 * Author: The Fourth Estate
 * Version: 1.0.0
 *
 * ---------------------------------------------------------------------------
 * INSTALLATION
 *
 * 1. Déposer ce fichier dans wp-content/mu-plugins/ du WP de
 *    cms.thefourthestategh.com.
 *
 * 2. Ajouter dans wp-config.php, AVANT la ligne « That's all, stop editing » :
 *
 *        define( 'TFE_REVALIDATE_URL',    'https://thefourthestategh.com/api/revalidate' );
 *        define( 'TFE_REVALIDATE_SECRET', '<le même secret que côté Next>' );
 *
 *    Le secret vit dans wp-config.php et non en base ni dans ce fichier : le
 *    dossier wordpress/ du repo est versionné sur GitHub.
 *
 * 3. Côté front, déclarer REVALIDATE_SECRET (même valeur) dans cPanel →
 *    Application Manager, puis redémarrer l'app.
 *
 * Sans ces constantes le plugin ne fait rien et laisse une ligne dans le log
 * PHP — il ne casse jamais une publication.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI `shutdown` ET PAS UN PING DIRECT
 *
 * `transition_post_status` se déclenche AVANT que les champs ACF ne soient
 * écrits (ACF sauvegarde sur `save_post`, priorité 20). Pinger à ce moment-là
 * ferait régénérer la page à partir de l'ANCIENNE valeur des champs : le front
 * se rafraîchirait pour afficher exactement ce qu'il affichait déjà. C'est un
 * piège discret, et il donne l'impression que la revalidation ne marche pas.
 *
 * On se contente donc d'accumuler les chemins pendant la requête, et on envoie
 * une seule requête sur `shutdown`, quand tout est écrit en base. Bonus : dix
 * sauvegardes successives dans la même requête ne produisent qu'un seul appel.
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Types de contenu qui alimentent le front.
 *
 * `video-story`, `highlight` et `composition` ne sont pas publics : leur
 * permalien ne veut rien dire, seule la home les affiche.
 */
const TFE_REVALIDATE_POST_TYPES = array( 'post', 'page', 'video-story', 'highlight', 'composition' );

/**
 * File d'attente des chemins à revalider, portée à la requête courante.
 *
 * Appeler avec un chemin pour l'ajouter, sans argument pour lire la liste.
 * Les clés du tableau servent de dédoublonnage.
 *
 * @param string|null $path Chemin absolu à ajouter, ou null pour lire.
 * @return string[]
 */
function tfe_revalidate_paths( $path = null ) {
	static $paths = array();

	if ( is_string( $path ) && '' !== $path ) {
		$paths[ $path ] = true;
	}

	return array_keys( $paths );
}

/**
 * Note les chemins impactés par un changement de statut.
 *
 * @param string  $new_status Nouveau statut.
 * @param string  $old_status Ancien statut.
 * @param WP_Post $post       Contenu concerné.
 */
function tfe_revalidate_on_transition( $new_status, $old_status, $post ) {
	if ( ! $post instanceof WP_Post ) {
		return;
	}

	if ( ! in_array( $post->post_type, TFE_REVALIDATE_POST_TYPES, true ) ) {
		return;
	}

	if ( wp_is_post_autosave( $post ) || wp_is_post_revision( $post ) ) {
		return;
	}

	// Ne réagir que si le contenu entre dans l'état publié, en sort, ou y est
	// modifié. Un brouillon retravaillé dix fois ne concerne pas le front.
	if ( 'publish' !== $new_status && 'publish' !== $old_status ) {
		return;
	}

	// La home agrège tout : slider vidéos, Hero, dernières publications.
	tfe_revalidate_paths( '/' );

	if ( '' === $post->post_name ) {
		return;
	}

	if ( 'post' === $post->post_type ) {
		// Chemin recalculé ici plutôt que dérivé de get_permalink() : ce
		// plugin doit rester autonome si tfe-headless.php (qui filtre
		// post_link) n'est pas déployé. Même logique que buildHref() côté
		// Next : /YYYY/MM/slug, mois sur 2 chiffres, heure locale du site.
		$year  = get_post_time( 'Y', false, $post );
		$month = get_post_time( 'm', false, $post );

		if ( ! empty( $year ) && ! empty( $month ) ) {
			tfe_revalidate_paths( '/' . $year . '/' . $month . '/' . $post->post_name );
		}
	} elseif ( 'page' === $post->post_type ) {
		tfe_revalidate_paths( '/' . $post->post_name );
	}
}
add_action( 'transition_post_status', 'tfe_revalidate_on_transition', 10, 3 );

/**
 * Envoie l'appel de revalidation, une fois la requête terminée.
 */
function tfe_revalidate_flush() {
	$paths = tfe_revalidate_paths();

	if ( empty( $paths ) ) {
		return;
	}

	if ( ! defined( 'TFE_REVALIDATE_URL' ) || ! defined( 'TFE_REVALIDATE_SECRET' ) ) {
		error_log( '[tfe-revalidate] TFE_REVALIDATE_URL / TFE_REVALIDATE_SECRET absentes de wp-config.php : revalidation ignoree.' );
		return;
	}

	// En temps normal l'appel est non bloquant : la publication ne doit jamais
	// ralentir ni echouer parce que le front est indisponible. Le revers est
	// qu'on ne voit pas la reponse — d'ou le mode bloquant sous WP_DEBUG, pour
	// pouvoir diagnostiquer.
	$debug = defined( 'WP_DEBUG' ) && WP_DEBUG;

	$response = wp_remote_post(
		TFE_REVALIDATE_URL,
		array(
			'timeout'  => $debug ? 15 : 5,
			'blocking' => $debug,
			'headers'  => array(
				'Content-Type'            => 'application/json',
				'x-tfe-revalidate-secret' => TFE_REVALIDATE_SECRET,
			),
			'body'     => wp_json_encode( array( 'paths' => $paths ) ),
		)
	);

	if ( ! $debug ) {
		return;
	}

	if ( is_wp_error( $response ) ) {
		error_log( '[tfe-revalidate] echec : ' . $response->get_error_message() );
		return;
	}

	error_log(
		'[tfe-revalidate] HTTP ' . wp_remote_retrieve_response_code( $response )
		. ' pour ' . implode( ', ', $paths )
		. ' -> ' . wp_remote_retrieve_body( $response )
	);
}
add_action( 'shutdown', 'tfe_revalidate_flush' );
