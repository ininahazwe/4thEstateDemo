<?php
/**
 * Plugin Name: TFE Highlights
 * Description: Les vignettes du bandeau d'accueil : type de contenu et champs declares en code, plus un ecran d'admin qui montre lesquelles sont reellement affichees.
 * Version: 2.0.0
 * Author: The Fourth Estate
 *
 * ---------------------------------------------------------------------------
 * PERIMETRE
 *
 * Type de contenu `highlight` = les 4 vignettes 44x44 du bandeau `SiteBannerV2`.
 * Consomme par `app/services/wpApi.highlight.ts`, rendu par
 * `app/components/SiteBannerV2/BannerHighlights.tsx`.
 *
 * Une vignette N'AFFICHE AUCUN ARTICLE. Elle POINTE vers /tag/{slug} (ou vers
 * une URL libre). Les articles sont rendus par la page /tag/[slug]. Un tag sans
 * article donne une vignette qui mene a une page vide — c'est une erreur
 * editoriale, pas un bug.
 *
 * ---------------------------------------------------------------------------
 * CONTRAT AVEC LE FRONT — a ne pas casser
 *
 * `GET /wp-json/wp/v2/highlight?per_page=4&status=publish&orderby=date&order=desc&_fields=id,acf`
 *
 * | Cle ACF     | Type       | Ce que le front en fait                        |
 * |-------------|------------|------------------------------------------------|
 * | `type`      | select     | 'serie'|'podcast'|'video'|'upcoming'. REQUIS :   |
 * |             |            | une entree sans type est ignoree cote front.     |
 * | `tag`       | taxonomy   | ID de terme (entier) ou null. Resolu -> le lien  |
 * |             |            | devient /tag/{slug} et le badge prend son nom.   |
 * | `badge`     | text       | Prime sur le nom du tag et sur le libelle du type|
 * | `title`     | text       | Texte affiche sur la vignette (PAS post_title)   |
 * | `href`      | text       | Utilise seulement si `tag` est vide/non resolu   |
 * | `thumbnail` | image (id) | Ignoree pour podcast et upcoming (icone fixe)    |
 *
 * Les `name` des champs sont les cles JSON. Les renommer casse le front en
 * silence : le champ disparait simplement de la reponse.
 *
 * ---------------------------------------------------------------------------
 * TROIS PIEGES DEJA PAYES, DOCUMENTES ICI POUR NE PAS Y RETOMBER
 *
 * 1. `show_in_rest => true` sur le GROUPE de champs est indispensable. Sans
 *    lui, ACF n'expose pas la cle `acf` en REST : l'API repond 200 avec des
 *    entrees vides et le bandeau disparait sans le moindre message d'erreur.
 *
 * 2. `href` est un champ `text`, PAS `url`. Le champ URL d'ACF refuse les
 *    chemins relatifs, or l'equipe saisit des liens internes comme `/tv`.
 *
 * 3. `save_terms => false` sur le champ `tag`. Selectionner un tag doit stocker
 *    une REFERENCE ; sans ce reglage ACF classe l'entree highlight dans ce tag,
 *    qui se met alors a apparaitre dans /tag/{slug} cote public.
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/** Slug du type de contenu (= rest_base : /wp-json/wp/v2/highlight). */
const TFE_HIGHLIGHT_CPT = 'highlight';

/** Cle du groupe de champs — sert a reconnaitre les groupes concurrents. */
const TFE_HIGHLIGHT_GROUP_KEY = 'group_tfe_highlight';

/** Prefixe des cles de champs. */
const TFE_HIGHLIGHT_FIELD_PREFIX = 'field_tfe_highlight_';

/**
 * Nombre de vignettes affichees par le bandeau.
 * Doit rester aligne avec `getHighlights(limit = 4)` cote front.
 */
const TFE_HIGHLIGHT_DISPLAYED = 4;

/**
 * Libelles des types. Les CLES sont lues telles quelles par le front
 * (`HighlightType`) — ne jamais les renommer. Les valeurs sont libres.
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
 * Priorite 20 et garde `post_type_exists()` : tant qu'une declaration ACF >
 * Post Types survit, c'est elle qui gagne et ce fichier ne declare rien. Aucune
 * double declaration possible, rien ne casse pendant la transition — et
 * `tfe_highlight_notices()` signale la situation en admin.
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
                'name'               => 'Highlights',
                'singular_name'      => 'Highlight',
                'add_new'            => 'Add highlight',
                'add_new_item'       => 'Add highlight',
                'edit_item'          => 'Edit highlight',
                'new_item'           => 'New highlight',
                'view_item'          => 'View highlight',
                'search_items'       => 'Search highlights',
                'not_found'          => 'No highlight yet',
                'not_found_in_trash' => 'No highlight in the bin',
                'all_items'          => 'All highlights',
                'menu_name'          => 'Highlights',
            ),
            // Headless : aucune URL publique cote WordPress, mais expose en REST.
            'public'              => false,
            'publicly_queryable'  => false,
            'exclude_from_search' => true,
            'has_archive'         => false,
            'rewrite'             => false,
            'show_ui'             => true,
            'show_in_menu'        => true,
            'menu_position'       => 5,
            'menu_icon'           => 'dashicons-star-half',
            'show_in_rest'        => true,
            'rest_base'           => TFE_HIGHLIGHT_CPT,
            // Le titre sert d'etiquette dans la liste d'admin. Le texte affiche
            // sur la vignette est `acf.title`, pas celui-ci.
            'supports'            => array( 'title' ),
            'map_meta_cap'        => true,
            'capability_type'     => 'post',
        )
    );
}

// ---------------------------------------------------------------------------
// Champs ACF, declares en code
// ---------------------------------------------------------------------------

add_action( 'acf/init', 'tfe_highlight_register_fields' );
/**
 * Le groupe est versionne avec le projet : rien a recreer a la main apres une
 * reinstallation du CMS. C'est precisement ce qui a manque le 24/08/2026.
 */
function tfe_highlight_register_fields() {
    if ( ! function_exists( 'acf_add_local_field_group' ) ) {
        return;
    }

    $tag_key = TFE_HIGHLIGHT_FIELD_PREFIX . 'tag';

    acf_add_local_field_group(
        array(
            'key'                   => TFE_HIGHLIGHT_GROUP_KEY,
            'title'                 => 'Highlight',
            'menu_order'            => 0,
            'position'              => 'normal',
            'style'                 => 'default',
            'label_placement'       => 'top',
            'active'                => true,
            // INDISPENSABLE : sans ca, pas de cle `acf` en REST, le bandeau
            // se vide sans erreur. Voir le piege n.1 en tete de fichier.
            'show_in_rest'          => true,
            'hide_on_screen'        => array( 'the_content', 'excerpt', 'custom_fields', 'discussion', 'comments', 'slug', 'author', 'format', 'featured_image' ),
            'location'              => array(
                array(
                    array(
                        'param'    => 'post_type',
                        'operator' => '==',
                        'value'    => TFE_HIGHLIGHT_CPT,
                    ),
                ),
            ),
            'fields'                => array(

                array(
                    'key'           => TFE_HIGHLIGHT_FIELD_PREFIX . 'type',
                    'label'         => 'Type',
                    'name'          => 'type',
                    'type'          => 'select',
                    'instructions'  => 'Decides the icon and the default badge. Required — an entry without a type is skipped by the website.',
                    'required'      => 1,
                    'choices'       => tfe_highlight_types(),
                    'default_value' => 'serie',
                    'return_format' => 'value',
                    'allow_null'    => 0,
                    'multiple'      => 0,
                    'ui'            => 0,
                    'wrapper'       => array( 'width' => '50' ),
                ),

                array(
                    'key'           => $tag_key,
                    'label'         => 'Tag',
                    'name'          => 'tag',
                    'type'          => 'taxonomy',
                    'instructions'  => 'Where the thumbnail links to. Pick a tag and the link becomes /tag/{slug} automatically — no need to type a URL.',
                    'taxonomy'      => 'post_tag',
                    'field_type'    => 'select',
                    'add_term'      => 0,
                    // Voir le piege n.3 : on stocke une reference, on ne classe
                    // pas l'entree highlight dans ce tag.
                    'save_terms'    => 0,
                    'load_terms'    => 0,
                    'return_format' => 'id',
                    'allow_null'    => 1,
                    'multiple'      => 0,
                    'wrapper'       => array( 'width' => '50' ),
                ),

                array(
                    'key'          => TFE_HIGHLIGHT_FIELD_PREFIX . 'badge',
                    'label'        => 'Badge',
                    'name'         => 'badge',
                    'type'         => 'text',
                    'instructions' => 'Small label above the title. Leave empty to use the tag name, or the type label if there is no tag.',
                    'maxlength'    => 40,
                    'wrapper'      => array( 'width' => '50' ),
                ),

                array(
                    'key'          => TFE_HIGHLIGHT_FIELD_PREFIX . 'title',
                    'label'        => 'Title',
                    'name'         => 'title',
                    'type'         => 'text',
                    'instructions' => 'The text shown on the thumbnail. This is NOT the entry title above — that one is only a label for this admin list.',
                    'maxlength'    => 90,
                    'wrapper'      => array( 'width' => '50' ),
                ),

                array(
                    'key'               => TFE_HIGHLIGHT_FIELD_PREFIX . 'href',
                    'label'             => 'Link',
                    'name'              => 'href',
                    // Voir le piege n.2 : `text` et non `url`, pour accepter
                    // les chemins relatifs comme /tv.
                    'type'              => 'text',
                    'instructions'      => 'Only needed when no tag is selected. Accepts an internal path (/tv) or a full URL (https://youtube.com/...). Leave empty and the thumbnail is shown without any link — which is fine for a "Coming soon".',
                    'placeholder'       => '/tv',
                    'conditional_logic' => array(
                        array(
                            array(
                                'field'    => $tag_key,
                                'operator' => '==empty',
                            ),
                        ),
                    ),
                ),

                array(
                    'key'           => TFE_HIGHLIGHT_FIELD_PREFIX . 'thumbnail',
                    'label'         => 'Thumbnail',
                    'name'          => 'thumbnail',
                    'type'          => 'image',
                    'instructions'  => 'Square image, 88x88 pixels or more. Ignored for Podcast and Coming soon, which always use their fixed icon.',
                    'return_format' => 'id',
                    'preview_size'  => 'thumbnail',
                    'library'       => 'all',
                    'mime_types'    => 'jpg,jpeg,png,webp,avif',
                ),
            ),
        )
    );
}

// ---------------------------------------------------------------------------
// Ecran de liste : montrer ce qui est reellement affiche
// ---------------------------------------------------------------------------

add_filter( 'manage_' . TFE_HIGHLIGHT_CPT . '_posts_columns', 'tfe_highlight_columns' );
/**
 * Le bandeau ne prend que les 4 entrees publiees les plus recentes. Sans
 * indication, une 5e entree creee de bonne foi n'apparait jamais et personne ne
 * comprend pourquoi. Ces colonnes rendent la regle visible.
 *
 * @param array $columns
 * @return array
 */
function tfe_highlight_columns( $columns ) {
    $out = array();

    foreach ( $columns as $key => $label ) {
        $out[ $key ] = $label;

        if ( 'title' === $key ) {
            $out['tfe_live']      = 'On air';
            $out['tfe_thumbnail'] = 'Thumb';
            $out['tfe_type']      = 'Type';
            $out['tfe_badge']     = 'Badge';
            $out['tfe_target']    = 'Links to';
        }
    }

    return $out;
}

add_action( 'manage_' . TFE_HIGHLIGHT_CPT . '_posts_custom_column', 'tfe_highlight_column_content', 10, 2 );
/**
 * @param string $column
 * @param int    $post_id
 */
function tfe_highlight_column_content( $column, $post_id ) {
    if ( ! function_exists( 'get_field' ) ) {
        return;
    }

    switch ( $column ) {

        case 'tfe_live':
            $rank = tfe_highlight_rank( $post_id );

            if ( null === $rank ) {
                echo '<span style="color:#8c8f94">&mdash;</span>';
            } elseif ( $rank <= TFE_HIGHLIGHT_DISPLAYED ) {
                printf(
                    '<span style="color:#1a7f37" title="Shown in position %1$d of %2$d">&#9679; %1$d</span>',
                    (int) $rank,
                    (int) TFE_HIGHLIGHT_DISPLAYED
                );
            } else {
                printf(
                    '<span style="color:#b32d2e" title="Only the %d most recent published highlights are shown">not shown</span>',
                    (int) TFE_HIGHLIGHT_DISPLAYED
                );
            }
            break;

        case 'tfe_thumbnail':
            $type = (string) get_field( 'type', $post_id );

            if ( 'podcast' === $type || 'upcoming' === $type ) {
                echo '<span style="color:#8c8f94" title="This type always uses its fixed icon">fixed icon</span>';
                break;
            }

            $id = (int) get_field( 'thumbnail', $post_id );
            if ( $id > 0 ) {
                echo wp_get_attachment_image( $id, array( 40, 40 ), true, array( 'style' => 'border-radius:6px' ) );
            } else {
                echo '<span style="color:#8c8f94">&mdash;</span>';
            }
            break;

        case 'tfe_type':
            $type   = (string) get_field( 'type', $post_id );
            $labels = tfe_highlight_types();
            echo isset( $labels[ $type ] )
                ? esc_html( $labels[ $type ] )
                : '<span style="color:#b32d2e">missing</span>';
            break;

        case 'tfe_badge':
            $badge = trim( (string) get_field( 'badge', $post_id ) );

            if ( '' !== $badge ) {
                echo esc_html( $badge );
                break;
            }

            // Reproduit exactement la cascade du front : badge -> nom du tag ->
            // libelle du type. L'editeur voit ce qui sortira reellement.
            $term_id = (int) get_field( 'tag', $post_id );
            $term    = $term_id > 0 ? get_term( $term_id, 'post_tag' ) : null;

            if ( $term instanceof WP_Term ) {
                printf( '<em title="From the tag">%s</em>', esc_html( $term->name ) );
                break;
            }

            $labels = tfe_highlight_types();
            $type   = (string) get_field( 'type', $post_id );
            printf(
                '<em title="From the type">%s</em>',
                esc_html( isset( $labels[ $type ] ) ? $labels[ $type ] : '—' )
            );
            break;

        case 'tfe_target':
            $term_id = (int) get_field( 'tag', $post_id );
            $term    = $term_id > 0 ? get_term( $term_id, 'post_tag' ) : null;

            if ( $term instanceof WP_Term ) {
                printf(
                    '<code>/tag/%s</code> <span style="color:#8c8f94">(%d posts)</span>',
                    esc_html( $term->slug ),
                    (int) $term->count
                );
                break;
            }

            if ( $term_id > 0 ) {
                // Le terme a ete supprime depuis : le front ne resoudra rien et
                // retombera sur `href`. Autant le dire ici.
                printf(
                    '<span style="color:#b32d2e">tag #%d no longer exists</span>',
                    (int) $term_id
                );
                break;
            }

            $href = trim( (string) get_field( 'href', $post_id ) );
            if ( '' !== $href ) {
                echo '<code>' . esc_html( $href ) . '</code>';
                break;
            }

            echo '<span style="color:#8c8f94" title="The thumbnail is rendered without a link">no link</span>';
            break;
    }
}

/**
 * Rang d'une entree parmi les publiees, du plus recent au plus ancien.
 *
 * Meme tri que la requete du front (`orderby=date&order=desc`), donc la colonne
 * « On air » dit la verite meme si l'admin est trie autrement.
 *
 * @param int $post_id
 * @return int|null 1 = premiere position. null si l'entree n'est pas publiee.
 */
function tfe_highlight_rank( $post_id ) {
    static $order = null;

    if ( null === $order ) {
        $ids = get_posts(
            array(
                'post_type'        => TFE_HIGHLIGHT_CPT,
                'post_status'      => 'publish',
                'posts_per_page'   => 100,
                'orderby'          => 'date',
                'order'            => 'DESC',
                'fields'           => 'ids',
                'suppress_filters' => false,
            )
        );

        $order = array_flip( array_map( 'intval', $ids ) );
    }

    $post_id = (int) $post_id;

    return isset( $order[ $post_id ] ) ? $order[ $post_id ] + 1 : null;
}

add_action( 'admin_notices', 'tfe_highlight_notices' );
/**
 * Trois avertissements, dans l'ordre de gravite.
 */
function tfe_highlight_notices() {
    $screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

    if ( ! $screen || TFE_HIGHLIGHT_CPT !== $screen->post_type ) {
        return;
    }

    // 1. ACF absent : le type existe mais tous ses champs sont vides.
    if ( ! function_exists( 'acf_add_local_field_group' ) ) {
        echo '<div class="notice notice-error"><p><strong>Advanced Custom Fields is not active.</strong> '
            . 'Highlights have no fields without it, and the homepage banner will be empty.</p></div>';
        return;
    }

    // 2. Un autre groupe cible `highlight` : les champs apparaitraient en
    //    double, et l'un des deux ecraserait l'autre a l'enregistrement.
    if ( function_exists( 'acf_get_field_groups' ) ) {
        $others = array();

        foreach ( acf_get_field_groups( array( 'post_type' => TFE_HIGHLIGHT_CPT ) ) as $group ) {
            if ( isset( $group['key'] ) && TFE_HIGHLIGHT_GROUP_KEY !== $group['key'] ) {
                $others[] = isset( $group['title'] ) ? $group['title'] : $group['key'];
            }
        }

        if ( ! empty( $others ) ) {
            printf(
                '<div class="notice notice-warning"><p><strong>Duplicate field group detected:</strong> %s. '
                . 'Delete it in ACF &rsaquo; Field Groups — this plugin already declares the fields in code.</p></div>',
                esc_html( implode( ', ', $others ) )
            );
        }
    }

    // 3. Rappel de la regle des 4, sur l'ecran de liste uniquement.
    if ( 'edit' === $screen->base ) {
        $published = (int) wp_count_posts( TFE_HIGHLIGHT_CPT )->publish;

        if ( $published > TFE_HIGHLIGHT_DISPLAYED ) {
            printf(
                '<div class="notice notice-info"><p>The banner shows the <strong>%1$d most recently published</strong> '
                . 'highlights. You have %2$d published — the extra ones are marked <em>not shown</em> in the "On air" column. '
                . 'To bring one back, edit its publication date.</p></div>',
                (int) TFE_HIGHLIGHT_DISPLAYED,
                $published
            );
        }
    }
}