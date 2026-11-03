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
