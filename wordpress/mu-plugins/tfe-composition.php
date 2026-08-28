<?php
/**
 * Plugin Name: TFE Composition
 * Description: Pick and order the articles featured on the headless frontend. Replaces the "CapEDx Composition" plugin.
 * Version: 1.1.0
 * Author: The Fourth Estate
 *
 * ---------------------------------------------------------------------------
 * PRINCIPE
 *
 * Une seule entree d'un type de contenu prive `composition`, portant un champ
 * ACF "Relationship" par zone. Le champ stocke UNE LISTE ORDONNEE D'IDS
 * d'articles — l'ordre de la liste EST l'ordre d'affichage.
 *
 * Difference avec l'ancien plugin : les articles ne sont jamais modifies.
 * Pas de categorie `spotlight` posee, pas de tag `cp_spotlight`, pas de meta
 * `cp_order_home` ecrite article par article, pas de wp_update_post() qui
 * bouscule `post_modified`. Tout tient dans une seule ligne de postmeta,
 * ecrite en une fois : l'enregistrement est atomique et instantane.
 *
 * Tous les textes affiches en admin sont en anglais (equipe anglophone).
 * Les commentaires restent en francais, comme le reste du projet.
 *
 * ---------------------------------------------------------------------------
 * INSTALLATION
 *
 * 1. Deposer ce fichier dans wp-content/mu-plugins/ (creer le dossier si
 *    absent). Les mu-plugins sont charges automatiquement, sans activation.
 * 2. ACF doit etre actif (version gratuite suffit — le champ Relationship en
 *    fait partie). Le groupe de champs est declare ICI en code : rien a creer
 *    a la main dans l'interface ACF, et il est versionne avec le projet.
 * 3. Aller dans le menu "Featured Articles" (barre laterale admin, sous
 *    Dashboard) : il ouvre directement l'unique entree a editer.
 *
 * VERIFICATION (doit renvoyer zones.spotlight = liste d'IDs) :
 *   GET /wp-json/wp/v2/composition?_fields=id,zones
 *
 * ---------------------------------------------------------------------------
 * AJOUTER UNE ZONE plus tard (news, anti-corruption, human-rights, our-impact)
 * Une seule chose a modifier : le tableau retourne par tfe_composition_zones().
 * Le champ ACF, l'exposition REST et l'admin suivent automatiquement.
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Slug du type de contenu (= rest_base : /wp-json/wp/v2/composition). */
define( 'TFE_COMPOSITION_CPT', 'composition' );

/** Option stockant l'ID de l'unique entree, pour ne pas la rechercher a chaque fois. */
define( 'TFE_COMPOSITION_OPTION_ID', 'tfe_composition_post_id' );

/** Prefixe des cles de champs ACF — sert a reconnaitre nos champs dans les filtres. */
define( 'TFE_COMPOSITION_FIELD_PREFIX', 'field_tfe_composition_' );

/**
 * Capability requise pour modifier la composition.
 * `edit_others_posts` = role Editor et au-dessus (un Author ne l'a pas).
 * Passer a 'edit_posts' pour l'ouvrir aussi aux auteurs.
 */
define( 'TFE_COMPOSITION_CAP', 'edit_others_posts' );

/**
 * Zones pilotees. La cle est le nom du champ ACF ET la cle renvoyee dans
 * l'API (`zones.<cle>`) — la changer casse le frontend.
 *
 * @return array<string, array{label: string, max: int, instructions: string}>
 */
function tfe_composition_zones() {
	return array(
		'spotlight' => array(
			'label'        => 'Spotlight — homepage Hero',
			'max'          => 5,
			'instructions' => 'Search for an article on the left, then click it to add. '
				. 'Drag and drop to reorder. '
				. 'The Hero displays the FIRST 3 articles of the list, top to bottom. '
				. 'Search matches article titles only.',
		),

		/*
		 * Zones a activer plus tard — decommenter suffit :
		 *
		 * 'general-news'    => array( 'label' => 'General News',    'max' => 5, 'instructions' => '' ),
		 * 'anti-corruption' => array( 'label' => 'Anti-Corruption', 'max' => 5, 'instructions' => '' ),
		 * 'human-rights'    => array( 'label' => 'Human Rights',    'max' => 5, 'instructions' => '' ),
		 * 'our-impact'      => array( 'label' => 'Our Impact',      'max' => 5, 'instructions' => '' ),
		 */
	);
}

// ---------------------------------------------------------------------------
// Type de contenu
// ---------------------------------------------------------------------------

add_action( 'init', 'tfe_composition_register_post_type' );
/**
 * Type de contenu prive (aucune URL publique, absent des recherches et des
 * archives) mais expose a l'API REST — c'est le mode normal pour un CMS
 * headless : WordPress ne sert que de source de donnees.
 *
 * `create_posts => do_not_allow` empeche la creation d'une 2e entree : il n'y
 * a qu'une composition, la dupliquer n'aurait pas de sens.
 */
function tfe_composition_register_post_type() {
	register_post_type(
		TFE_COMPOSITION_CPT,
		array(
			'label'               => 'Featured Articles',
			'labels'              => array(
				'name'          => 'Featured Articles',
				'singular_name' => 'Featured Articles',
				'edit_item'     => 'Featured Articles',
				'search_items'  => 'Search featured articles',
				'not_found'     => 'No entry found',
			),
			'public'              => false,
			'publicly_queryable'  => false,
			'exclude_from_search' => true,
			'has_archive'         => false,
			'rewrite'             => false,
			'show_ui'             => true,
			// Masque l'entree native : on ajoute plus bas un lien de menu qui
			// ouvre directement l'unique entree, au lieu d'une liste a un element.
			'show_in_menu'        => false,
			'show_in_rest'        => true,
			'rest_base'           => TFE_COMPOSITION_CPT,
			'supports'            => array( 'title' ),
			'map_meta_cap'        => true,
			'capability_type'     => 'post',
			'capabilities'        => array(
				'create_posts' => 'do_not_allow',
			),
		)
	);
}

/**
 * ID de l'unique entree, creee a la volee si absente.
 *
 * La creation n'a lieu qu'en admin : inutile de risquer une ecriture en base
 * sur une requete front ou API.
 *
 * @return int 0 si l'entree n'existe pas encore et ne peut pas etre creee ici.
 */
function tfe_composition_get_singleton_id() {
	$post_id = (int) get_option( TFE_COMPOSITION_OPTION_ID, 0 );

	if ( $post_id > 0 ) {
		$status = get_post_status( $post_id );
		// 'trash' ou false (post supprime) => on repart sur une nouvelle entree.
		if ( 'publish' === $status ) {
			return $post_id;
		}
	}

	// Filet de securite : une entree existe peut-etre deja sans que l'option
	// soit renseignee (option effacee, restauration de base…).
	$existing = get_posts(
		array(
			'post_type'      => TFE_COMPOSITION_CPT,
			'post_status'    => 'publish',
			'posts_per_page' => 1,
			'fields'         => 'ids',
		)
	);

	if ( ! empty( $existing ) ) {
		update_option( TFE_COMPOSITION_OPTION_ID, (int) $existing[0], true );
		return (int) $existing[0];
	}

	if ( ! is_admin() ) {
		return 0;
	}

	$new_id = wp_insert_post(
		array(
			'post_type'   => TFE_COMPOSITION_CPT,
			'post_title'  => 'Homepage Featured Articles',
			'post_status' => 'publish',
		)
	);

	if ( is_wp_error( $new_id ) || ! $new_id ) {
		return 0;
	}

	update_option( TFE_COMPOSITION_OPTION_ID, (int) $new_id, true );
	return (int) $new_id;
}

// ---------------------------------------------------------------------------
// Menu admin — lien direct vers l'unique entree
// ---------------------------------------------------------------------------

add_action( 'admin_menu', 'tfe_composition_admin_menu' );
/**
 * Ajoute "Featured Articles" en haut de la barre laterale. Le slug du menu est
 * une URL (post.php?...) : WordPress transforme alors l'entree en simple lien,
 * ce qui evite a l'editeur de passer par une liste ne contenant qu'un element.
 */
function tfe_composition_admin_menu() {
	$post_id = tfe_composition_get_singleton_id();
	if ( ! $post_id ) {
		return;
	}

	add_menu_page(
		'Featured Articles',
		'Featured Articles',
		TFE_COMPOSITION_CAP,
		'post.php?post=' . $post_id . '&action=edit',
		'',
		'dashicons-star-filled',
		4
	);
}

add_filter( 'parent_file', 'tfe_composition_highlight_menu' );
/**
 * Garde l'entree de menu surlignee pendant l'edition (sans ca, WordPress
 * n'associe pas l'ecran d'edition a notre lien custom).
 *
 * @param string $parent_file
 * @return string
 */
function tfe_composition_highlight_menu( $parent_file ) {
	global $post;

	if ( $post instanceof WP_Post && TFE_COMPOSITION_CPT === $post->post_type ) {
		$post_id = tfe_composition_get_singleton_id();
		return 'post.php?post=' . $post_id . '&action=edit';
	}

	return $parent_file;
}

// ---------------------------------------------------------------------------
// Champs ACF (declares en code, pas dans l'interface)
// ---------------------------------------------------------------------------

add_action( 'acf/init', 'tfe_composition_register_acf_fields' );
/**
 * Un champ Relationship par zone.
 *
 * - `return_format => 'id'`  : ACF renvoie des IDs d'articles, pas des objets
 *                              complets — c'est tout ce dont le frontend a besoin.
 * - `elements => featured_image` : affiche les vignettes dans le selecteur,
 *                              beaucoup plus lisible pour l'editeur.
 * - `filters => search, taxonomy` : barre de recherche + filtre par categorie.
 *                              La recherche est restreinte aux titres plus bas.
 * - `max`                    : bloque au-dela de N articles.
 *
 * L'ordre est donne par le glisser-deposer dans la colonne de droite ; ACF
 * enregistre le tableau dans cet ordre exact.
 */
function tfe_composition_register_acf_fields() {
	if ( ! function_exists( 'acf_add_local_field_group' ) ) {
		return;
	}

	$fields = array();

	foreach ( tfe_composition_zones() as $name => $zone ) {
		$fields[] = array(
			'key'           => TFE_COMPOSITION_FIELD_PREFIX . str_replace( '-', '_', $name ),
			'label'         => $zone['label'],
			'name'          => $name,
			'type'          => 'relationship',
			'instructions'  => $zone['instructions'],
			'required'      => 0,
			'post_type'     => array( 'post' ),
			'taxonomy'      => array(),
			'filters'       => array( 'search', 'taxonomy' ),
			'elements'      => array( 'featured_image' ),
			'min'           => 0,
			'max'           => $zone['max'],
			'return_format' => 'id',
		);
	}

	acf_add_local_field_group(
		array(
			'key'             => 'group_tfe_composition',
			'title'           => 'Featured Articles',
			'fields'          => $fields,
			'location'        => array(
				array(
					array(
						'param'    => 'post_type',
						'operator' => '==',
						'value'    => TFE_COMPOSITION_CPT,
					),
				),
			),
			'menu_order'      => 0,
			'position'        => 'normal',
			'style'           => 'default',
			'label_placement' => 'top',
			'hide_on_screen'  => array( 'the_content', 'excerpt', 'custom_fields', 'discussion', 'comments', 'slug' ),
			'active'          => true,
			'show_in_rest'    => true,
		)
	);
}

// ---------------------------------------------------------------------------
// Recherche restreinte aux titres
// ---------------------------------------------------------------------------

/**
 * Par defaut, la recherche d'ACF Relationship delegue au parametre `s` de
 * WP_Query, qui balaie post_title MAIS AUSSI post_excerpt et post_content.
 * Sur des articles d'investigation longs, taper un nom courant remonte des
 * dizaines d'articles ou le mot n'apparait qu'en corps de texte : le
 * selecteur devient inutilisable.
 *
 * Deux etapes, parce qu'ACF n'expose pas d'option pour ca :
 *   1. marquer la requete d'ACF avec un query var maison (ci-dessous) ;
 *   2. reecrire la clause SQL de recherche pour les seules requetes marquees
 *      (tfe_composition_search_title_only plus bas).
 *
 * Le marquage est indispensable : `posts_search` est un filtre global, il ne
 * doit surtout pas alterer la recherche du reste de l'admin ni du site.
 */
add_filter( 'acf/fields/relationship/query', 'tfe_composition_relationship_query', 10, 2 );

/**
 * @param array $args  Arguments WP_Query prepares par ACF.
 * @param array $field Champ ACF interroge.
 * @return array
 */
function tfe_composition_relationship_query( $args, $field ) {
	$key = isset( $field['key'] ) ? $field['key'] : '';

	// Ne cible que nos champs : les autres champs Relationship du site (s'il y
	// en a un jour) gardent le comportement standard.
	if ( 0 !== strpos( $key, TFE_COMPOSITION_FIELD_PREFIX ) ) {
		return $args;
	}

	if ( ! empty( $args['s'] ) ) {
		$args['tfe_composition_title_search'] = true;
	}

	return $args;
}

add_filter( 'posts_search', 'tfe_composition_search_title_only', 10, 2 );
/**
 * Remplace la clause de recherche par un LIKE sur post_title uniquement.
 *
 * Les termes sont decoupes sur les espaces et combines en AND : chercher
 * "big push" remonte "The Big Push initiative" comme "Push for a bigger
 * budget", sans exiger que les mots soient colles. Une recherche entre
 * guillemets n'est pas geree — inutile ici, on cherche sur des titres courts.
 *
 * @param string   $search   Clause SQL construite par WordPress.
 * @param WP_Query $wp_query Requete en cours.
 * @return string
 */
function tfe_composition_search_title_only( $search, $wp_query ) {
	if ( ! $wp_query->get( 'tfe_composition_title_search' ) ) {
		return $search;
	}

	$terms = trim( (string) $wp_query->get( 's' ) );
	if ( '' === $terms ) {
		return $search;
	}

	global $wpdb;

	$words = preg_split( '/\s+/', $terms, -1, PREG_SPLIT_NO_EMPTY );
	if ( empty( $words ) ) {
		return $search;
	}

	$clauses = array();
	foreach ( $words as $word ) {
		$clauses[] = $wpdb->prepare(
			"{$wpdb->posts}.post_title LIKE %s",
			'%' . $wpdb->esc_like( $word ) . '%'
		);
	}

	// La valeur de retour est concatenee dans le WHERE : elle doit commencer
	// par " AND ".
	return ' AND (' . implode( ' AND ', $clauses ) . ') ';
}

// ---------------------------------------------------------------------------
// Exposition REST
// ---------------------------------------------------------------------------

add_action( 'rest_api_init', 'tfe_composition_register_rest_field' );
/**
 * Expose un champ `zones` au format garanti : { "<zone>": [id, id, …] }.
 *
 * Pourquoi ne pas se contenter du champ `acf` natif : sa forme depend de la
 * version d'ACF et du return_format (IDs numeriques, chaines, ou objets
 * complets selon les cas). Ici le contrat est fige — toujours un tableau
 * d'entiers, toujours dans l'ordre choisi — et le frontend n'a rien a deviner.
 * Une zone vide renvoie un tableau vide, jamais null.
 */
function tfe_composition_register_rest_field() {
	register_rest_field(
		TFE_COMPOSITION_CPT,
		'zones',
		array(
			'get_callback' => 'tfe_composition_rest_zones',
			'schema'       => array(
				'description' => 'Featured articles per zone, in display order.',
				'type'        => 'object',
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
			),
		)
	);
}

/**
 * @param array $post_array Representation REST du post.
 * @return array<string, int[]>
 */
function tfe_composition_rest_zones( $post_array ) {
	$zones = array();

	foreach ( array_keys( tfe_composition_zones() ) as $name ) {
		$zones[ $name ] = array();

		if ( ! function_exists( 'get_field' ) ) {
			continue;
		}

		$value = get_field( $name, $post_array['id'] );
		if ( ! is_array( $value ) ) {
			continue;
		}

		// array_values() : reindexe apres filtrage, pour serialiser en tableau
		// JSON et non en objet {"1": …} si un element a ete ecarte.
		$zones[ $name ] = array_values(
			array_filter(
				array_map( 'intval', $value ),
				function ( $id ) {
					return $id > 0;
				}
			)
		);
	}

	return $zones;
}