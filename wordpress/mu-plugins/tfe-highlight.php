<?php
/**
 * Plugin Name: TFE Highlight
 * Description: Declares the "highlight" post type and its fields in code — the four thumbnails of the homepage banner.
 * Version: 1.0.0
 * Author: The Fourth Estate
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER
 *
 * Le type de contenu `highlight` et son groupe de champs avaient ete crees a
 * la main dans l'interface d'ACF. Consequence : ils ne vivaient que dans la
 * base de donnees, disparaissaient a toute restauration, et n'apparaissaient
 * dans aucune revue de code. Tout est desormais declare ici, sur le modele de
 * `tfe-composition.php`.
 *
 * Textes d'admin en anglais (equipe anglophone), commentaires en francais
 * comme le reste du projet.
 *
 * ---------------------------------------------------------------------------
 * MIGRATION DEPUIS LA DECLARATION ACF — A FAIRE UNE FOIS, DANS CET ORDRE
 *
 * 1. Deposer ce fichier dans wp-content/mu-plugins/ (charge automatiquement).
 * 2. Aller dans ACF > Post Types : l'entree "highlight" y est encore active.
 *    Tant qu'elle l'est, C'EST ELLE QUI GAGNE et ce fichier ne declare rien
 *    (garde `post_type_exists` plus bas) — rien ne casse.
 * 3. Supprimer l'entree "highlight" dans ACF > Post Types.
 * 4. Supprimer le groupe de champs correspondant dans ACF > Field Groups.
 *    Le laisser ferait apparaitre les champs EN DOUBLE dans l'editeur : les
 *    deux groupes portent les memes `name`, ils ecrivent donc dans les memes
 *    cles de postmeta.
 * 5. Recharger un ecran d'admin. Un bandeau signale toute declaration
 *    concurrente restante (voir tfe_highlight_admin_notice).
 *
 * Les CONTENUS deja saisis ne bougent pas : ils sont stockes en postmeta,
 * indexes par le `name` des champs, identiques ici.
 *
 * ---------------------------------------------------------------------------
 * CHANGEMENT DE FORMAT DU CHAMP `tag`
 *
 * Le champ etait un texte libre : l'editeur y tapait indifferemment un nom
 * ("Big Push") ou un slug ("big-push"), et le front devait deviner. Il devient
 * un selecteur de taxonomie sur `post_tag`, avec `return_format => 'id'` :
 * ACF renvoie desormais un ID de terme (nombre).
 *
 * `app/services/wpApi.highlight.ts` accepte LES DEUX formats — nombre (nouveau)
 * et chaine (ancien) — le temps que les entrees existantes soient rouvertes et
 * reenregistrees. Ne pas retirer cette tolerance avant que ce soit fait.
 *
 * VERIFICATION : GET /wp-json/wp/v2/highlight?_fields=id,acf
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Slug du type de contenu (= rest_base : /wp-json/wp/v2/highlight). */
define( 'TFE_HIGHLIGHT_CPT', 'highlight' );

/** Cle du groupe de champs — sert a l'ecarter dans la detection de doublons. */
define( 'TFE_HIGHLIGHT_GROUP_KEY', 'group_tfe_highlight' );

/**
 * Types disponibles. La cle est la valeur stockee et lue par le front
 * (`HighlightType` dans wpApi.highlight.ts) — la changer casse l'affichage.
 *
 * @return array<string, string>
 */
function tfe_highlight_types() {
	return array(
		'serie'    => 'Series',
		'podcast'  => 'Podcast',
		'video'    => 'Video',
		'upcoming' => 'Coming soon',
	);
}

// ---------------------------------------------------------------------------
// Type de contenu
// ---------------------------------------------------------------------------

add_action( 'init', 'tfe_highlight_register_post_type', 20 );

/**
 * Type de contenu prive mais expose a l'API REST : WordPress ne sert que de
 * source de donnees, le rendu est fait par le front Next.
 *
 * Priorite 20, et garde `post_type_exists` : ACF enregistre ses types de
 * contenu d'interface tot dans `init`. Tant que l'entree ACF n'a pas ete
 * supprimee (etape 3 de la migration ci-dessus), on la laisse gagner plutot
 * que d'ecraser une declaration dont on ne connait pas les reglages exacts.
 */
function tfe_highlight_register_post_type() {
	if ( post_type_exists( TFE_HIGHLIGHT_CPT ) ) {
		return;
	}

	register_post_type(
		TFE_HIGHLIGHT_CPT,
		array(
			'label'               => 'Highlights',
			'labels'              => array(
				'name'          => 'Highlights',
				'singular_name' => 'Highlight',
				'add_new_item'  => 'Add highlight',
				'edit_item'     => 'Edit highlight',
				'search_items'  => 'Search highlights',
				'not_found'     => 'No highlight found',
			),
			'public'              => false,
			'publicly_queryable'  => false,
			'exclude_from_search' => true,
			'has_archive'         => false,
			'rewrite'             => false,
			'show_ui'             => true,
			'show_in_menu'        => true,
			'menu_position'       => 5,
			'menu_icon'           => 'dashicons-megaphone',
			'show_in_rest'        => true,
			'rest_base'           => TFE_HIGHLIGHT_CPT,
			// Le titre du post ne sert QU'a se reperer dans la liste d'admin :
			// le front affiche `acf.title`, pas `post_title`.
			'supports'            => array( 'title' ),
			'map_meta_cap'        => true,
			'capability_type'     => 'post',
		)
	);
}

// ---------------------------------------------------------------------------
// Champs ACF
// ---------------------------------------------------------------------------

add_action( 'acf/init', 'tfe_highlight_register_acf_fields' );

/**
 * Les `name` des champs sont le contrat avec le front : ils deviennent les
 * cles de `acf.*` dans la reponse REST. Ne pas les renommer.
 */
function tfe_highlight_register_acf_fields() {
	if ( ! function_exists( 'acf_add_local_field_group' ) ) {
		return;
	}

	acf_add_local_field_group(
		array(
			'key'             => TFE_HIGHLIGHT_GROUP_KEY,
			'title'           => 'Highlight',
			'fields'          => array(

				array(
					'key'           => 'field_tfe_highlight_type',
					'label'         => 'Type',
					'name'          => 'type',
					'type'          => 'select',
					'instructions'  => 'Sets the fallback badge label and the icon used when no thumbnail is set.',
					'required'      => 1,
					'choices'       => tfe_highlight_types(),
					'default_value' => 'serie',
					'return_format' => 'value',
					'allow_null'    => 0,
					'ui'            => 0,
				),

				array(
					'key'           => 'field_tfe_highlight_tag',
					'label'         => 'Tag',
					'name'          => 'tag',
					'type'          => 'taxonomy',
					'instructions'  => 'Optional. Pick an existing tag: the thumbnail then links to its archive page '
						. 'and the badge shows the tag name. Leave empty to use the Link field below instead.',
					'required'      => 0,
					'taxonomy'      => 'post_tag',
					'field_type'    => 'select',
					'allow_null'    => 1,
					'multiple'      => 0,
					// false : selectionner un tag ici ne doit PAS l'attacher a
					// l'entree highlight comme un vrai terme. On stocke une
					// reference, on ne classe pas le contenu.
					'add_term'      => 0,
					'save_terms'    => 0,
					'load_terms'    => 0,
					'return_format' => 'id',
				),

				array(
					'key'          => 'field_tfe_highlight_badge',
					'label'        => 'Badge',
					'name'         => 'badge',
					'type'         => 'text',
					'instructions' => 'Optional. Overrides the small label shown above the title. Leave empty and '
						. 'the badge falls back to the tag name, then to the generic label for the type above '
						. '(Series / Podcast / Video / Coming soon).',
					'required'     => 0,
					// Le badge est un libelle court dans une ligne de 44px :
					// au-dela il deborde ou tronque a l'affichage.
					'maxlength'    => 40,
					'placeholder'  => 'e.g. Investigation',
				),

				array(
					'key'          => 'field_tfe_highlight_title',
					'label'        => 'Title',
					'name'         => 'title',
					'type'         => 'text',
					'instructions' => 'Text displayed on the thumbnail.',
					'required'     => 0,
				),

				array(
					'key'               => 'field_tfe_highlight_href',
					'label'             => 'Link',
					'name'              => 'href',
					// Volontairement `text` et non `url` : le champ URL d'ACF
					// refuse les chemins relatifs, or la plupart des liens
					// visent des pages du site (/tv, /podcasts).
					'type'              => 'text',
					'instructions'      => 'Used only when no tag is selected above. Site paths like /tv, or a full '
						. 'https:// address for an external site. Leave empty and the thumbnail simply is not '
						. 'clickable — which is fine for a "Coming soon" entry.',
					'required'          => 0,
					'conditional_logic' => array(
						array(
							array(
								'field'    => 'field_tfe_highlight_tag',
								'operator' => '==empty',
							),
						),
					),
				),

				array(
					'key'           => 'field_tfe_highlight_thumbnail',
					'label'         => 'Thumbnail',
					'name'          => 'thumbnail',
					'type'          => 'image',
					'instructions'  => 'Displayed at 44x44. Ignored for Podcast and Coming soon, which always use '
						. 'their fixed icon.',
					'required'      => 0,
					'return_format' => 'id',
					'preview_size'  => 'thumbnail',
					'library'       => 'all',
					'mime_types'    => 'jpg,jpeg,png,webp,avif',
				),
			),
			'location'        => array(
				array(
					array(
						'param'    => 'post_type',
						'operator' => '==',
						'value'    => TFE_HIGHLIGHT_CPT,
					),
				),
			),
			'menu_order'      => 0,
			'position'        => 'normal',
			'style'           => 'default',
			'label_placement' => 'top',
			'hide_on_screen'  => array( 'the_content', 'excerpt', 'custom_fields', 'discussion', 'comments', 'slug' ),
			'active'          => true,
			// Indispensable : sans ca, ACF n'expose pas la cle `acf` dans la
			// reponse REST, et le front ne recoit plus rien.
			'show_in_rest'    => true,
		)
	);
}

// ---------------------------------------------------------------------------
// Detection des declarations concurrentes restantes
// ---------------------------------------------------------------------------

add_action( 'admin_notices', 'tfe_highlight_admin_notice' );

/**
 * Signale, sur les ecrans concernes, qu'une declaration faite dans l'interface
 * d'ACF coexiste encore avec celle de ce fichier.
 *
 * Sans ce garde-fou, le symptome (champs affiches en double, ou reglages du
 * type de contenu qui ne correspondent pas au code) est deroutant et se
 * diagnostique mal.
 */
function tfe_highlight_admin_notice() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( ! $screen || TFE_HIGHLIGHT_CPT !== $screen->post_type ) {
		return;
	}

	$problems = array();

	// a) Un type de contenu enregistre par ACF gagne sur le notre (priorite 20).
	if ( post_type_exists( TFE_HIGHLIGHT_CPT ) ) {
		$object = get_post_type_object( TFE_HIGHLIGHT_CPT );
		// Les types de contenu declares depuis l'interface d'ACF portent ce marqueur.
		if ( $object && ! empty( $object->acf_is_internal_post_type ) ) {
			$problems[] = 'the post type is still declared in <strong>ACF &rsaquo; Post Types</strong>, '
				. 'which overrides the one defined in <code>tfe-highlight.php</code>';
		}
	}

	// b) Un autre groupe de champs cible le meme type de contenu.
	if ( function_exists( 'acf_get_field_groups' ) ) {
		$groups = acf_get_field_groups( array( 'post_type' => TFE_HIGHLIGHT_CPT ) );
		foreach ( (array) $groups as $group ) {
			if ( isset( $group['key'] ) && TFE_HIGHLIGHT_GROUP_KEY !== $group['key'] ) {
				$problems[] = sprintf(
					'a second field group (<strong>%s</strong>) also targets this post type — '
						. 'its fields write to the same meta keys and will appear twice',
					esc_html( isset( $group['title'] ) ? $group['title'] : $group['key'] )
				);
			}
		}
	}

	if ( empty( $problems ) ) {
		return;
	}

	echo '<div class="notice notice-warning"><p><strong>TFE Highlight —</strong> duplicate declaration detected: '
		. wp_kses_post( implode( '; and ', $problems ) )
		. '. Delete the ACF interface entries to let the versioned code take over. '
		. 'Saved content is not affected.</p></div>';
}
