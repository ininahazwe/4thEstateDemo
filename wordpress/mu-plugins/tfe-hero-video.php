<?php
/**
 * Plugin Name: TFE — Hero video
 * Description: Ajoute un panneau « Hero video » dans la sidebar de l'éditeur de
 *              posts, sur le modèle de « Image mise en avant » : un bouton qui
 *              ouvre la médiathèque filtrée sur les vidéos, et expose l'URL
 *              choisie dans l'API REST sous la clé `hero_video`.
 * Author: The Fourth Estate
 * Version: 1.0.0
 *
 * ---------------------------------------------------------------------------
 * INSTALLATION : déposer ce fichier dans wp-content/mu-plugins/.
 * Les mu-plugins sont actifs d'office — rien à activer dans l'admin, et rien
 * qu'une mise à jour du thème Foxiz puisse écraser (c'est la raison pour
 * laquelle tfe-storytelling.php y vit déjà plutôt que dans functions.php).
 *
 * POURQUOI PAS ACF : le besoin tient en une meta (l'ID de la pièce jointe) et
 * un bouton. ACF apporterait un groupe de champs à maintenir et une dépendance
 * de plus pour ça. Le cœur de WordPress fournit déjà tout : register_post_meta
 * pour le stockage et l'exposition REST, MediaUpload pour le sélecteur — c'est
 * exactement le même composant que celui de « Image mise en avant ».
 *
 * CE QUE VOIT LE FRONT : un champ `hero_video` à la racine de l'objet post,
 * contenant l'URL du fichier ou `null`. Voir wpApi.article.ts (WpArticle.heroVideo).
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TFE_HERO_VIDEO_META = 'tfe_hero_video_id';

/**
 * Stockage : l'ID de la pièce jointe, et non son URL.
 *
 * Une URL enregistrée en dur casserait à la première migration de domaine ou au
 * moindre passage de wp-content sur un CDN, et laisserait un lien mort si le
 * fichier est remplacé dans la médiathèque. L'ID, lui, reste valable — l'URL est
 * résolue à la lecture (voir le champ REST plus bas).
 */
add_action( 'init', function () {
	register_post_meta( 'post', TFE_HERO_VIDEO_META, [
		'show_in_rest'  => true,
		'single'        => true,
		'type'          => 'integer',
		'default'       => 0,
		'auth_callback' => function () {
			return current_user_can( 'edit_posts' );
		},
	] );

	/**
	 * INDISPENSABLE : sans le support 'custom-fields', l'éditeur de blocs ne
	 * charge pas les meta du post et `editPost({ meta: … })` est ignoré en
	 * silence côté JS — le bouton semble marcher, mais rien n'est enregistré.
	 * C'est le piège classique de ce montage.
	 */
	add_post_type_support( 'post', 'custom-fields' );
} );

/**
 * Champ REST `hero_video` : l'URL résolue, pas l'ID.
 *
 * La meta brute est déjà exposée (show_in_rest), mais elle ne contient qu'un
 * ID : le front devrait alors faire une requête /wp/v2/media/{id} par article
 * pour obtenir l'URL. On résout ici, côté serveur, où le coût est nul.
 */
add_action( 'rest_api_init', function () {
	register_rest_field( 'post', 'hero_video', [
		'get_callback' => function ( $post ) {
			$attachment_id = (int) get_post_meta( $post['id'], TFE_HERO_VIDEO_META, true );
			if ( ! $attachment_id ) {
				return null;
			}

			$url = wp_get_attachment_url( $attachment_id );

			return $url ? $url : null;
		},
		'schema'       => [
			'description' => 'URL de la vidéo de hero, ou null.',
			'type'        => [ 'string', 'null' ],
			'context'     => [ 'view', 'edit' ],
		],
	] );
} );

/**
 * Panneau dans la sidebar de l'éditeur.
 *
 * JS écrit à la main avec wp.element.createElement plutôt qu'en JSX : pas de
 * JSX, donc pas de @wordpress/scripts, pas de node_modules ni d'étape de build
 * côté WordPress. Le fichier se dépose et fonctionne.
 */
add_action( 'enqueue_block_editor_assets', function () {
	$screen = get_current_screen();

	// registerPlugin monte le panneau sur TOUS les types de contenu : on ne
	// charge le script que sur les posts, plutôt que de filtrer côté JS.
	if ( ! $screen || 'post' !== $screen->post_type ) {
		return;
	}

	$handle = 'tfe-hero-video-editor';

	wp_register_script(
		$handle,
		false, // pas de fichier : tout le code passe par wp_add_inline_script.
		[
			'wp-plugins',
			'wp-editor',
			'wp-edit-post',
			'wp-element',
			'wp-components',
			'wp-data',
			'wp-block-editor',
			'wp-i18n',
		],
		'1.0.0',
		true
	);
	wp_enqueue_script( $handle );

	$meta_key = TFE_HERO_VIDEO_META;

	$js = <<<JS
( function ( wp ) {
	if ( ! wp || ! wp.plugins || ! wp.element ) {
		return;
	}

	var el = wp.element.createElement;
	var __ = wp.i18n.__;

	// PluginDocumentSettingPanel a déménagé de wp.editPost vers wp.editor en
	// WordPress 6.6 ; l'ancien emplacement reste en alias mais émet un avis de
	// dépréciation. On prend le nouveau quand il existe.
	var PluginDocumentSettingPanel =
		( wp.editor && wp.editor.PluginDocumentSettingPanel ) ||
		( wp.editPost && wp.editPost.PluginDocumentSettingPanel );

	if ( ! PluginDocumentSettingPanel ) {
		return;
	}

	var MediaUpload      = wp.blockEditor.MediaUpload;
	var MediaUploadCheck = wp.blockEditor.MediaUploadCheck;
	var Button           = wp.components.Button;
	var META_KEY         = '{$meta_key}';

	function HeroVideoPanel() {
		var meta = wp.data.useSelect( function ( select ) {
			return select( 'core/editor' ).getEditedPostAttribute( 'meta' ) || {};
		}, [] );

		var editPost = wp.data.useDispatch( 'core/editor' ).editPost;
		var id = meta[ META_KEY ] ? parseInt( meta[ META_KEY ], 10 ) : 0;

		// getMedia() alimente l'aperçu. Le store 'core' résout la requête tout
		// seul et re-rend le panneau quand elle arrive.
		var media = wp.data.useSelect( function ( select ) {
			return id ? select( 'core' ).getMedia( id ) : null;
		}, [ id ] );

		function setVideo( nextId ) {
			var next = {};
			next[ META_KEY ] = nextId;
			editPost( { meta: next } );
		}

		return el(
			PluginDocumentSettingPanel,
			{
				name: 'tfe-hero-video',
				title: __( 'Hero video', 'tfe' ),
				className: 'tfe-hero-video-panel'
			},
			el(
				'p',
				{ style: { marginTop: 0, fontSize: '12px', color: '#757575' } },
				__( 'Plays on loop behind the title, in place of the featured image. Keep a featured image: it is used as the poster, and for sharing previews.', 'tfe' )
			),
			media && media.source_url
				? el( 'video', {
					src: media.source_url,
					muted: true,
					controls: true,
					preload: 'metadata',
					style: {
						width: '100%',
						display: 'block',
						marginBottom: '12px',
						background: '#111'
					}
				} )
				: null,
			el(
				MediaUploadCheck,
				null,
				el( MediaUpload, {
					allowedTypes: [ 'video' ],
					value: id,
					onSelect: function ( selected ) {
						setVideo( selected.id );
					},
					render: function ( props ) {
						return el(
							Button,
							{
								variant: 'secondary',
								onClick: props.open,
								style: { width: '100%', justifyContent: 'center' }
							},
							id ? __( 'Replace hero video', 'tfe' ) : __( 'Set hero video', 'tfe' )
						);
					}
				} )
			),
			id
				? el(
					Button,
					{
						variant: 'link',
						isDestructive: true,
						onClick: function () {
							setVideo( 0 );
						},
						style: { marginTop: '8px' }
					},
					__( 'Remove hero video', 'tfe' )
				)
				: null
		);
	}

	wp.plugins.registerPlugin( 'tfe-hero-video', { render: HeroVideoPanel } );
} )( window.wp );
JS;

	wp_add_inline_script( $handle, $js );
} );