<?php
/**
 * Plugin Name: TFE — Featured image (REST)
 * Description: Expose l'image mise en avant de chaque post directement dans
 *              l'API REST, sous la clé `tfe_featured_image`, avec la même
 *              forme qu'un objet média WordPress.
 * Author: The Fourth Estate
 * Version: 1.0.0
 *
 * ---------------------------------------------------------------------------
 * INSTALLATION : déposer ce fichier dans wp-content/mu-plugins/. Actif d'office.
 *
 * POURQUOI : le front lit l'image mise en avant via `_embed`
 * (`_embedded["wp:featuredmedia"]`). WordPress n'y place le média que s'il est
 * lisible publiquement. Une pièce jointe hérite du statut de l'article auquel
 * elle a été attachée à l'upload : si cet article est un brouillon ou privé,
 * `/wp/v2/media/{id}` répond 401/404 et l'embed disparaît, alors que l'article
 * publié qui l'utilise est, lui, public. Résultat : article sans vignette, sans
 * og:image (cas du post 25027, 03-11-2026).
 *
 * Ce champ est calculé à partir de l'article lui-même : il n'est visible que si
 * l'article l'est, et ne dépend plus du statut de la pièce jointe.
 *
 * CE QUE VOIT LE FRONT : `tfe_featured_image` à la racine du post, ou `null`.
 * Forme compatible avec un objet média REST (source_url, mime_type, alt_text,
 * caption.rendered, media_details.width/height/sizes) pour que
 * pickWpImageUrl() (wpApi.article.ts) le lise sans adaptation. Le front ne
 * l'utilise qu'en repli, quand l'embed est absent ou en erreur.
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', function () {
	register_rest_field( 'post', 'tfe_featured_image', [
		'get_callback' => 'tfe_featured_image_rest_value',
		'schema'       => [
			'description' => "Image mise en avant (forme d'objet média), ou null.",
			'type'        => [ 'object', 'null' ],
			'context'     => [ 'view', 'edit', 'embed' ],
		],
	] );
} );

function tfe_featured_image_rest_value( $post ) {
	$attachment_id = (int) get_post_thumbnail_id( $post['id'] );
	if ( ! $attachment_id ) {
		return null;
	}

	$full_url = wp_get_attachment_url( $attachment_id );
	if ( ! $full_url ) {
		return null;
	}

	$meta  = wp_get_attachment_metadata( $attachment_id );
	$sizes = [];

	if ( is_array( $meta ) && ! empty( $meta['sizes'] ) && is_array( $meta['sizes'] ) ) {
		foreach ( $meta['sizes'] as $size_name => $size ) {
			$src = wp_get_attachment_image_src( $attachment_id, $size_name );
			if ( ! $src ) {
				continue;
			}
			$sizes[ $size_name ] = [
				'source_url' => $src[0],
				'width'      => (int) $src[1],
				'height'     => (int) $src[2],
				'mime_type'  => isset( $size['mime-type'] ) ? $size['mime-type'] : get_post_mime_type( $attachment_id ),
			];
		}
	}

	$caption = wp_get_attachment_caption( $attachment_id );

	return [
		'id'            => $attachment_id,
		'source_url'    => $full_url,
		'mime_type'     => get_post_mime_type( $attachment_id ),
		'alt_text'      => (string) get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ),
		'caption'       => [ 'rendered' => $caption ? esc_html( $caption ) : '' ],
		'media_details' => [
			'width'  => is_array( $meta ) && isset( $meta['width'] ) ? (int) $meta['width'] : 0,
			'height' => is_array( $meta ) && isset( $meta['height'] ) ? (int) $meta['height'] : 0,
			// Objet (et non tableau vide) pour garder la forme JSON {} attendue.
			'sizes'  => (object) $sizes,
		],
	];
}

/*
 * ---------------------------------------------------------------------------
 * CORRECTION À LA SOURCE : rattacher l'image à l'article publié.
 *
 * Le champ REST ci-dessus ne couvre que les requêtes qui lisent le post. Les
 * listes (catégories, home, recherche, auteur, spotlight) récupèrent les images
 * par lot via `/wp/v2/media?include=…`, endpoint qui écarte les médias non
 * publics. Plutôt que de modifier une vingtaine d'appels côté front, on
 * supprime la cause : quand un article est publié, si son image mise en avant
 * est rattachée à un post non publié (brouillon, privé, supprimé), on la
 * rattache à cet article. Elle devient lisible partout.
 *
 * Réversible : le parent d'origine est conservé dans la meta
 * `_tfe_original_parent` de la pièce jointe.
 * ---------------------------------------------------------------------------
 */

const TFE_FEATURED_IMAGE_ORIGINAL_PARENT_META = '_tfe_original_parent';

/**
 * Rattache l'image mise en avant de $post_id à cet article si son parent
 * actuel n'est pas public. Ne touche pas aux médias non attachés (parent 0),
 * déjà publics.
 */
function tfe_featured_image_adopt( $post_id ) {
	if ( 'publish' !== get_post_status( $post_id ) ) {
		return;
	}

	$attachment_id = (int) get_post_thumbnail_id( $post_id );
	if ( ! $attachment_id ) {
		return;
	}

	$attachment = get_post( $attachment_id );
	if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
		return;
	}

	$parent_id = (int) $attachment->post_parent;
	if ( 0 === $parent_id || (int) $post_id === $parent_id ) {
		return;
	}

	$parent = get_post( $parent_id );
	if ( $parent && 'publish' === $parent->post_status ) {
		return;
	}

	if ( '' === get_post_meta( $attachment_id, TFE_FEATURED_IMAGE_ORIGINAL_PARENT_META, true ) ) {
		update_post_meta( $attachment_id, TFE_FEATURED_IMAGE_ORIGINAL_PARENT_META, $parent_id );
	}

	wp_update_post( [
		'ID'          => $attachment_id,
		'post_parent' => (int) $post_id,
	] );
}

// À chaque enregistrement d'un article (publication, mise à jour, changement d'image).
add_action( 'save_post_post', function ( $post_id ) {
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
		return;
	}
	tfe_featured_image_adopt( $post_id );
}, 20 );

/**
 * Rattrapage des articles déjà publiés, au chargement de l'admin.
 *
 * Parcourt les articles publiés par lots de 200 (curseur sur l'ID) et passe
 * chacun dans tfe_featured_image_adopt(). On passe volontairement par
 * get_post_thumbnail_id() et non par une requête SQL sur la meta
 * `_thumbnail_id` : sur cette install, l'ID d'image mise en avant renvoyé par
 * WordPress (filtre `post_thumbnail_id`, thème ou extension) peut différer de
 * la meta brute (post 25027 : meta 24997, image réelle 24956). La v1 du
 * rattrapage, en SQL, passait donc à côté.
 */
const TFE_FEATURED_IMAGE_BACKFILL_CURSOR = 'tfe_featured_image_backfill_v2_cursor';
const TFE_FEATURED_IMAGE_BACKFILL_DONE   = 'tfe_featured_image_backfill_v2_done';

add_action( 'admin_init', function () {
	if ( get_option( TFE_FEATURED_IMAGE_BACKFILL_DONE ) ) {
		return;
	}

	global $wpdb;

	$cursor   = (int) get_option( TFE_FEATURED_IMAGE_BACKFILL_CURSOR, 0 );
	$post_ids = $wpdb->get_col( $wpdb->prepare(
		"SELECT ID FROM {$wpdb->posts}
		 WHERE post_type = 'post' AND post_status = 'publish' AND ID > %d
		 ORDER BY ID ASC
		 LIMIT 200",
		$cursor
	) );

	// Une erreur SQL renvoie aussi un tableau vide : ne pas la prendre pour
	// « plus rien à traiter ».
	if ( $wpdb->last_error ) {
		error_log( '[tfe-featured-image] backfill SQL error: ' . $wpdb->last_error );
		return;
	}

	if ( empty( $post_ids ) ) {
		update_option( TFE_FEATURED_IMAGE_BACKFILL_DONE, time(), false );
		delete_option( TFE_FEATURED_IMAGE_BACKFILL_CURSOR );
		return;
	}

	foreach ( $post_ids as $post_id ) {
		tfe_featured_image_adopt( (int) $post_id );
	}

	update_option( TFE_FEATURED_IMAGE_BACKFILL_CURSOR, (int) end( $post_ids ), false );
} );
