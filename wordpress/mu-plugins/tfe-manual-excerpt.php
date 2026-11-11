<?php
/**
 * Plugin Name: TFE — Manual excerpt
 * Description: Expose en REST, sous la clé `manual_excerpt`, le texte saisi
 *              dans la boîte « Add an excerpt » de l'éditeur — et RIEN d'autre.
 * Author: The Fourth Estate
 * Version: 1.0.0
 *
 * ---------------------------------------------------------------------------
 * INSTALLATION : déposer ce fichier dans wp-content/mu-plugins/.
 *
 * POURQUOI : `excerpt.rendered` n'est jamais vide — quand la boîte est vide,
 * WordPress fabrique un extrait avec le début de l'article. Le front ne peut
 * pas lire `excerpt.raw` (réservé à context=edit, donc authentifié). Ce champ
 * lit directement `post_excerpt` en base : chaîne si l'excerpt a été saisi à
 * la main, `null` sinon. Le front n'affiche le chapô (.article-lede, hero
 * storytelling) que dans le premier cas. Voir wpApi.article.ts (pickLede).
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', function () {
	register_rest_field( 'post', 'manual_excerpt', [
		'get_callback' => function ( $post ) {
			$p = get_post( $post['id'] );
			if ( ! $p || post_password_required( $p ) ) {
				return null;
			}
			$text = trim( wp_strip_all_tags( (string) $p->post_excerpt ) );

			return '' !== $text ? $text : null;
		},
		'schema'       => [
			'description' => 'Excerpt saisi manuellement, ou null si la boîte est vide.',
			'type'        => [ 'string', 'null' ],
			'context'     => [ 'view', 'edit' ],
		],
	] );
} );
