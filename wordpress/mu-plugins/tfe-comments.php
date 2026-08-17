<?php
/**
 * Plugin Name: TFE — Écriture de commentaires depuis le front Next.js
 * Description: Expose POST /wp-json/tfe/v1/comment, protégé par clé API, pour
 *              que le formulaire du front puisse déposer un commentaire sans
 *              qu'on ait à ouvrir l'écriture anonyme de /wp/v2/comments.
 * Author: The Fourth Estate
 * Version: 1.0.0
 *
 * ---------------------------------------------------------------------------
 * INSTALLATION
 *
 * 1. Déposer ce fichier dans wp-content/mu-plugins/ du WP de
 *    cms.thefourthestategh.com.
 *
 * 2. Ajouter dans wp-config.php, AVANT « That's all, stop editing » :
 *
 *        define( 'TFE_COMMENTS_API_KEY', '<clé aléatoire de 64 caractères>' );
 *
 *    Générer la clé : `openssl rand -hex 32`. Elle vit dans wp-config.php et
 *    non ici : le dossier wordpress/ du repo est versionné sur GitHub.
 *
 * 3. Côté front, déclarer dans cPanel → Application Manager (puis redémarrer) :
 *
 *        TFE_CMS_API_URL = https://cms.thefourthestategh.com/wp-json/tfe/v1
 *        TFE_CMS_API_KEY = <la même clé>
 *
 * ---------------------------------------------------------------------------
 * POURQUOI UN ENDPOINT DÉDIÉ PLUTÔT QUE rest_allow_anonymous_comments
 *
 * WordPress refuse POST /wp/v2/comments à un visiteur non authentifié
 * (`rest_comment_login_required`) tant qu'on n'active pas le filtre
 * `rest_allow_anonymous_comments`. Activer ce filtre ouvrirait l'écriture à
 * TOUT internet, pas seulement au front : n'importe quel script pourrait
 * inonder la file de modération sans passer par le honeypot ni la limite par
 * IP du front. Ici l'écriture exige la clé API, donc seul le serveur Next
 * peut écrire, et toute la validation du front reste incontournable.
 *
 * POURQUOI wp_handle_comment_submission()
 *
 * C'est la fonction qu'utilise wp-comments-post.php : elle applique les
 * champs requis (`require_name_email`), le contrôle de flood
 * (`check_comment_flood_db`), la détection de doublon, les commentaires
 * fermés, et surtout elle déclenche les hooks sur lesquels **Akismet** est
 * branché (actif sur ce site). Insérer avec wp_insert_comment() court-circuite
 * tout ça et fait entrer le spam directement en base.
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Enregistre la route d'écriture.
 */
function tfe_comments_register_routes() {
	register_rest_route(
		'tfe/v1',
		'/comment',
		array(
			'methods'             => 'POST',
			'permission_callback' => 'tfe_comments_permission_check',
			'callback'            => 'tfe_comments_create',
			'args'                => array(
				'post'         => array(
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				),
				'parent'       => array(
					'type'              => 'integer',
					'default'           => 0,
					'sanitize_callback' => 'absint',
				),
				'author_name'  => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				),
				'author_email' => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_email',
				),
				'content'      => array(
					'required'          => true,
					'type'              => 'string',
					// Pas de sanitize ici : wp_handle_comment_submission()
					// applique déjà kses avec les règles de commentaire. Le
					// faire deux fois mangerait les apostrophes typographiques.
					'validate_callback' => 'tfe_comments_validate_content',
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'tfe_comments_register_routes' );

/**
 * Le corps du commentaire doit être non vide et de longueur raisonnable.
 *
 * @param mixed $value Valeur reçue.
 * @return bool|WP_Error
 */
function tfe_comments_validate_content( $value ) {
	if ( ! is_string( $value ) ) {
		return new WP_Error( 'tfe_comment_invalid', 'Commentaire invalide.', array( 'status' => 400 ) );
	}

	$length = mb_strlen( trim( $value ) );

	if ( $length < 5 || $length > 5000 ) {
		return new WP_Error(
			'tfe_comment_length',
			'Le commentaire doit contenir entre 5 et 5000 caractères.',
			array( 'status' => 400 )
		);
	}

	return true;
}

/**
 * Seul un appelant porteur de la clé API peut écrire.
 *
 * hash_equals() et non === : comparaison à temps constant, pour ne pas laisser
 * fuiter la clé caractère par caractère via le temps de réponse.
 *
 * @param WP_REST_Request $request Requête.
 * @return true|WP_Error
 */
function tfe_comments_permission_check( WP_REST_Request $request ) {
	if ( ! defined( 'TFE_COMMENTS_API_KEY' ) || '' === TFE_COMMENTS_API_KEY ) {
		error_log( '[tfe-comments] TFE_COMMENTS_API_KEY absente de wp-config.php : ecriture refusee.' );
		return new WP_Error( 'tfe_comments_unconfigured', 'Commentaires indisponibles.', array( 'status' => 503 ) );
	}

	$key = (string) $request->get_header( 'x-tfe-api-key' );

	if ( '' === $key || ! hash_equals( TFE_COMMENTS_API_KEY, $key ) ) {
		return new WP_Error( 'tfe_comments_forbidden', 'Clé API invalide.', array( 'status' => 403 ) );
	}

	return true;
}

/**
 * Force la modération, quelle que soit la configuration du site.
 *
 * Ne touche ni au verdict « spam » d'Akismet (qui doit rester spam et non
 * atterrir dans la file de modération), ni à une erreur remontée en amont.
 *
 * @param int|string|WP_Error $approved Verdict courant.
 * @return int|string|WP_Error
 */
function tfe_comments_force_hold( $approved ) {
	if ( is_wp_error( $approved ) || 'spam' === $approved || 'trash' === $approved ) {
		return $approved;
	}

	return 0; // 0 = en attente de modération.
}

/**
 * Dépose le commentaire.
 *
 * @param WP_REST_Request $request Requête.
 * @return WP_REST_Response|WP_Error
 */
function tfe_comments_create( WP_REST_Request $request ) {
	$post_id = (int) $request['post'];
	$post    = get_post( $post_id );

	if ( ! $post instanceof WP_Post || 'publish' !== $post->post_status ) {
		return new WP_Error( 'tfe_comments_post_invalid', 'Article introuvable.', array( 'status' => 404 ) );
	}

	if ( ! comments_open( $post_id ) ) {
		return new WP_Error(
			'tfe_comments_closed',
			'Les commentaires sont fermés sur cet article.',
			array( 'status' => 403 )
		);
	}

	// IP et user-agent du VISITEUR, transmis par le front.
	//
	// Sans ça, WordPress enregistrerait l'IP du serveur Next pour tous les
	// commentaires : Akismet perdrait son signal le plus utile, le contrôle de
	// flood bloquerait le deuxième commentaire du site entier, et les listes
	// noires par IP deviendraient inutilisables. Le front est la seule source
	// de confiance possible ici, et il n'est atteignable que via la clé API.
	$visitor_ip = filter_var( (string) $request->get_header( 'x-tfe-visitor-ip' ), FILTER_VALIDATE_IP );

	if ( $visitor_ip ) {
		$_SERVER['REMOTE_ADDR'] = $visitor_ip;
	}

	$visitor_ua = (string) $request->get_header( 'x-tfe-visitor-ua' );

	if ( '' !== $visitor_ua ) {
		$_SERVER['HTTP_USER_AGENT'] = substr( $visitor_ua, 0, 254 );
	}

	add_filter( 'pre_comment_approved', 'tfe_comments_force_hold', 999 );

	$comment = wp_handle_comment_submission(
		array(
			'comment_post_ID' => $post_id,
			'comment_parent'  => (int) $request['parent'],
			'author'          => (string) $request['author_name'],
			'email'           => (string) $request['author_email'],
			'url'             => '',
			'comment'         => (string) $request['content'],
		)
	);

	remove_filter( 'pre_comment_approved', 'tfe_comments_force_hold', 999 );

	if ( is_wp_error( $comment ) ) {
		$status = (int) ( $comment->get_error_data()['status'] ?? 400 );

		return new WP_Error(
			'tfe_comments_rejected',
			$comment->get_error_message(),
			array( 'status' => $status >= 400 ? $status : 400 )
		);
	}

	return new WP_REST_Response(
		array(
			'id'      => (int) $comment->comment_ID,
			'pending' => true,
		),
		201
	);
}

/**
 * Revalide la page de l'article quand un commentaire devient visible (ou cesse
 * de l'être) : sans ça, le commentaire fraîchement approuvé n'apparaîtrait
 * qu'à la prochaine fenêtre ISR.
 *
 * Réutilise la file d'attente de tfe-revalidate.php si ce plugin est déployé,
 * et ne fait rien sinon — les deux restent installables indépendamment.
 *
 * @param string     $new_status Nouveau statut.
 * @param string     $old_status Ancien statut.
 * @param WP_Comment $comment    Commentaire concerné.
 */
function tfe_comments_revalidate_on_status( $new_status, $old_status, $comment ) {
	if ( ! function_exists( 'tfe_revalidate_paths' ) ) {
		return;
	}

	if ( 'approved' !== $new_status && 'approved' !== $old_status ) {
		return;
	}

	$post = get_post( (int) $comment->comment_post_ID );

	if ( ! $post instanceof WP_Post || 'post' !== $post->post_type || '' === $post->post_name ) {
		return;
	}

	$year  = get_post_time( 'Y', false, $post );
	$month = get_post_time( 'm', false, $post );

	if ( ! empty( $year ) && ! empty( $month ) ) {
		tfe_revalidate_paths( '/' . $year . '/' . $month . '/' . $post->post_name );
	}
}
add_action( 'transition_comment_status', 'tfe_comments_revalidate_on_status', 10, 3 );
