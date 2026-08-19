<?php
/**
 * Plugin Name: TFE Article Fields
 * Description: Editorial fields added to standard posts. Currently: the hero subtitle.
 * Version: 1.0.0
 * Author: The Fourth Estate
 *
 * ---------------------------------------------------------------------------
 * LE CHAMP `subtitle`
 *
 * Les titres d'enquete sont souvent construits en deux temps, separes par un
 * deux-points : une accroche courte, puis la question ou la precision.
 *
 *   « From Promise to Neglect: What happened to Koforidua's hospital? »
 *
 * Le front doit pouvoir afficher la seconde partie plus petite et en casse
 * normale. Ce champ lui dit OU couper.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI ON RECOPIE LA SECONDE PARTIE AU LIEU DE RACCOURCIR LE TITRE
 *
 * Contrainte posee : aucun impact SEO. Le titre WordPress reste donc COMPLET.
 * Consequence : la balise <title>, le contenu textuel du <h1>, le JSON-LD, le
 * sitemap et toutes les cartes du site (recherche, categories, auteur, tags,
 * archives) continuent de recevoir exactement la meme chaine qu'avant. Rien a
 * recomposer nulle part, donc aucune surface de regression.
 *
 * L'alternative — titre WP reduit a l'accroche, sous-titre porte par ce champ —
 * evitait la double saisie, mais imposait de recomposer titre + sous-titre dans
 * huit mappeurs differents. Le moindre oubli aurait affiche un titre tronque,
 * en silence. Choix assume : un peu de saisie en double contre zero risque.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI UN BANDEAU D'AVERTISSEMENT ET PAS UNE VALIDATION BLOQUANTE
 *
 * `acf/validate_value` s'execute pendant une requete AJAX qui ne transporte que
 * les champs ACF : le titre en cours d'edition n'est PAS encore en base et
 * n'est pas transmis. Une validation a ce moment-la comparerait le sous-titre
 * a l'ANCIEN titre — elle refuserait des saisies correctes et en accepterait
 * des fausses.
 *
 * Le controle est donc fait a l'affichage de l'ecran d'edition, quand titre et
 * sous-titre sont tous deux en base. Non bloquant, mais fiable — et un
 * sous-titre incoherent degrade l'affichage sans rien casser, ce qui ne
 * justifie pas d'empecher un enregistrement.
 *
 * VERIFICATION : GET /wp-json/wp/v2/posts?slug=<slug>&_fields=id,title,acf
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'TFE_ARTICLE_FIELDS_GROUP_KEY', 'group_tfe_article_fields' );

// ---------------------------------------------------------------------------
// Champ ACF
// ---------------------------------------------------------------------------

add_action( 'acf/init', 'tfe_article_fields_register' );

/**
 * Groupe distinct de celui qui porte deja `strapline` : les deux cohabitent
 * sans conflit, ACF empile les groupes cibles sur un meme type de contenu.
 * Le declarer ici plutot que dans l'interface le rend versionne et relisible.
 */
function tfe_article_fields_register() {
	if ( ! function_exists( 'acf_add_local_field_group' ) ) {
		return;
	}

	acf_add_local_field_group(
		array(
			'key'             => TFE_ARTICLE_FIELDS_GROUP_KEY,
			'title'           => 'Hero subtitle',
			'fields'          => array(
				array(
					'key'          => 'field_tfe_article_subtitle',
					'label'        => 'Subtitle',
					'name'         => 'subtitle',
					'type'         => 'text',
					'instructions' => 'Optional. Copy here the part of the title that should appear smaller — '
						. 'usually everything after the colon. Keep the full title above unchanged: it is what '
						. 'search engines and every article card across the site use. '
						. 'Example — title: "From Promise to Neglect: What happened to the hospital?", '
						. 'subtitle: "What happened to the hospital?"',
					'required'     => 0,
					'placeholder'  => 'What happened to the hospital?',
				),
			),
			'location'        => array(
				array(
					array(
						'param'    => 'post_type',
						'operator' => '==',
						'value'    => 'post',
					),
				),
			),
			// Colle le champ juste sous le titre : la saisie se fait dans la
			// foulee, ce qui limite les oublis.
			'position'        => 'acf_after_title',
			'menu_order'      => 0,
			'style'           => 'default',
			'label_placement' => 'top',
			'active'          => true,
			// Sans ca, ACF n'expose pas la cle `acf` en REST et le front ne
			// recoit jamais le sous-titre.
			'show_in_rest'    => true,
		)
	);
}

// ---------------------------------------------------------------------------
// Coherence titre / sous-titre
// ---------------------------------------------------------------------------

/**
 * Normalise pour comparer : entites decodees, apostrophes typographiques
 * ramenees a l'apostrophe droite, espaces multiples reduits, minuscules.
 *
 * Sans cette normalisation, un copier-coller depuis l'editeur (qui transforme
 * ' en ’) ne correspondrait jamais au titre.
 *
 * @param string $value
 * @return string
 */
function tfe_article_normalize( $value ) {
	$value = html_entity_decode( (string) $value, ENT_QUOTES, 'UTF-8' );
	$value = str_replace(
		array( "\xE2\x80\x99", "\xE2\x80\x98", "\xE2\x80\x9C", "\xE2\x80\x9D" ),
		array( "'", "'", '"', '"' ),
		$value
	);
	$value = preg_replace( '/\s+/u', ' ', $value );

	return trim( function_exists( 'mb_strtolower' ) ? mb_strtolower( $value, 'UTF-8' ) : strtolower( $value ) );
}

/**
 * Le sous-titre doit etre la fin exacte du titre — c'est ce qui permet au front
 * de couper sans jamais dupliquer ni perdre de texte.
 *
 * @param string $title
 * @param string $subtitle
 * @return bool
 */
function tfe_article_subtitle_matches( $title, $subtitle ) {
	$t = tfe_article_normalize( $title );
	$s = tfe_article_normalize( $subtitle );

	if ( '' === $s ) {
		return true;
	}

	if ( strlen( $s ) >= strlen( $t ) ) {
		return false;
	}

	return substr( $t, -strlen( $s ) ) === $s;
}

add_action( 'admin_notices', 'tfe_article_subtitle_notice' );

/**
 * Avertit sur l'ecran d'edition quand le sous-titre saisi ne se retrouve pas a
 * la fin du titre. Le front retombe alors sur le titre entier, non coupe : la
 * page reste correcte, mais l'effet recherche est perdu — d'ou l'avertissement.
 */
function tfe_article_subtitle_notice() {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

	if ( ! $screen || 'post' !== $screen->id || 'post' !== $screen->post_type ) {
		return;
	}

	if ( ! function_exists( 'get_field' ) ) {
		return;
	}

	$post_id = get_the_ID();
	if ( ! $post_id ) {
		return;
	}

	$subtitle = trim( (string) get_field( 'subtitle', $post_id ) );
	if ( '' === $subtitle ) {
		return;
	}

	$title = get_the_title( $post_id );
	if ( tfe_article_subtitle_matches( $title, $subtitle ) ) {
		return;
	}

	printf(
		'<div class="notice notice-warning"><p><strong>Subtitle mismatch —</strong> the subtitle you entered is not '
			. 'the ending of the title, so the front end will display the full title in one block instead of '
			. 'splitting it.<br>Title: <code>%s</code><br>Subtitle: <code>%s</code></p></div>',
		esc_html( $title ),
		esc_html( $subtitle )
	);
}
