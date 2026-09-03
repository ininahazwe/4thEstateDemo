<?php
/**
 * Plugin Name: TFE Storytelling
 * Description: Champ REST "blocks" et case ACF "is_storytelling" pour le template storytelling du frontend headless.
 * Version: 1.0.0
 * Author: The Fourth Estate
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE
 *
 * Reprend, corrige et sort du functions.php du theme Foxiz deux blocs :
 *   1. register_rest_field('post', 'blocks', ...) — arbre de blocs Gutenberg
 *      expose a l'API pour le template storytelling ;
 *   2. le field group ACF contenant la case "is_storytelling".
 *
 * Deux raisons de les deplacer ici :
 *   - Foxiz est un theme commercial qui recoit des mises a jour : tout code
 *     ajoute dans son functions.php disparait a la premiere mise a jour.
 *   - un mu-plugin est charge avant le theme, sans activation, et survit a
 *     tout.
 *
 * ---------------------------------------------------------------------------
 * LE BUG CORRIGE
 *
 * L'ancienne version calculait le champ `blocks` a CHAQUE lecture REST d'un
 * post, y compris `context=edit` — la requete que l'editeur de blocs utilise
 * pour charger un post. Resultat observe : sur un post storytelling, ouvrir ou
 * rafraichir l'editeur affichait les blocs VIDES de leur contenu, et le
 * moindre enregistrement depuis cet etat ecrivait un post_content vide (perte
 * de donnees seche).
 *
 * L'editeur n'a aucun besoin de ce champ : il lit `content.raw`. On ne le
 * calcule donc plus du tout en contexte d'edition.
 *
 * ATTENTION a un piege : declarer `'context' => ['view']` dans le schema ne
 * suffit PAS. WordPress execute le get_callback d'abord et ne filtre par
 * contexte qu'ensuite, au moment de serialiser la reponse. C'est le
 * `return null` explicite en tete de callback qui fait le travail ; le schema
 * n'est qu'une ceinture-bretelles.
 *
 * ---------------------------------------------------------------------------
 * INSTALLATION
 *
 * 1. Deposer ce fichier dans wp-content/mu-plugins/.
 * 2. SUPPRIMER de functions.php les deux blocs qu'il remplace :
 *      - le add_action('rest_api_init', ...) qui enregistre 'blocks'
 *      - la fonction clean_block()
 *      - le acf_add_local_field_group() du groupe 'group_storytelling_template'
 *    Ne pas laisser les deux en place : le theme se charge APRES les
 *    mu-plugins, sa version de register_rest_field ecraserait celle-ci et le
 *    bug reviendrait. clean_block() provoquerait en plus un fatal
 *    "Cannot redeclare".
 *
 * VERIFICATION
 *   - editeur : ouvrir puis rafraichir un post storytelling → les blocs et
 *     leur contenu doivent rester affiches ;
 *   - front   : GET /wp-json/wp/v2/posts/<id>?_fields=id,blocks doit renvoyer
 *     l'arbre de blocs ;
 *   - edition : GET .../posts/<id>?context=edit (authentifie) ne doit PAS
 *     contenir de champ `blocks`.
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Garde-fou de recursion pour clean_block(). Les blocs Gutenberg s'imbriquent
 * (group > columns > column > paragraph…) mais jamais profondement ; une borne
 * evite qu'une structure anormale fasse exploser la pile.
 */
define( 'TFE_STORYTELLING_MAX_DEPTH', 10 );

// ---------------------------------------------------------------------------
// Champ REST `blocks`
// ---------------------------------------------------------------------------

add_action( 'rest_api_init', 'tfe_storytelling_register_rest_field' );

function tfe_storytelling_register_rest_field() {
    register_rest_field(
        'post',
        'blocks',
        array(
            'get_callback'    => 'tfe_storytelling_get_blocks',
            // Explicite : aucun chemin d'ecriture. Le champ est calcule, jamais recu.
            'update_callback' => null,
            'schema'          => array(
                'description' => 'Arbre de blocs Gutenberg (posts storytelling uniquement).',
                'type'        => array( 'array', 'null' ),
                // Jamais expose a l'editeur de blocs. Voir la note sur le piege
                // en tete de fichier : ceci ne remplace pas la garde dans le
                // callback, il la complete.
                'context'     => array( 'view' ),
                'readonly'    => true,
            ),
        )
    );
}

/**
 * @param array                $post_array Representation REST du post.
 * @param string               $field_name Nom du champ ('blocks').
 * @param WP_REST_Request|null $request    Requete en cours.
 * @return array|null
 */
function tfe_storytelling_get_blocks( $post_array, $field_name = '', $request = null ) {

    // ── LA correction ───────────────────────────────────────────────────
    // L'editeur de blocs charge le post en context=edit. Il lit content.raw
    // et n'utilise pas ce champ : le calculer ici alourdissait la reponse
    // dont il depend, au point de la rendre inexploitable.
    if ( $request instanceof WP_REST_Request && 'edit' === $request->get_param( 'context' ) ) {
        return null;
    }

    if ( empty( $post_array['id'] ) ) {
        return null;
    }

    $post_id = (int) $post_array['id'];

    // ACF peut etre desactive (maintenance, install neuve) : sans cette garde,
    // get_field() provoque un fatal "Call to undefined function" qui casse
    // TOUTE reponse REST de posts, pas seulement ce champ.
    if ( ! function_exists( 'get_field' ) ) {
        return null;
    }

    if ( ! get_field( 'is_storytelling', $post_id ) ) {
        return null;
    }

    $raw = get_post_field( 'post_content', $post_id );
    if ( ! is_string( $raw ) || '' === trim( $raw ) ) {
        // Contenu vide : renvoyer un tableau vide plutot que de laisser le
        // front croire qu'il a des blocs a afficher.
        return array();
    }

    return tfe_storytelling_clean_blocks( parse_blocks( $raw ), 0 );
}

/**
 * Nettoie une liste de blocs. Nom prefixe `tfe_` volontairement : l'ancienne
 * version declarait une fonction globale `clean_block()`, nom assez generique
 * pour entrer en collision avec un plugin et provoquer un fatal
 * "Cannot redeclare".
 *
 * @param array $blocks
 * @param int   $depth
 * @return array
 */
function tfe_storytelling_clean_blocks( $blocks, $depth = 0 ) {
    if ( ! is_array( $blocks ) || $depth > TFE_STORYTELLING_MAX_DEPTH ) {
        return array();
    }

    $cleaned = array();

    foreach ( $blocks as $block ) {
        $item = tfe_storytelling_clean_block( $block, $depth );
        if ( null !== $item ) {
            $cleaned[] = $item;
        }
    }

    // array_values implicite : $cleaned est construit par append, donc deja
    // indexe sequentiellement — indispensable pour serialiser en tableau JSON
    // et non en objet {"1": …}.
    return $cleaned;
}

/**
 * @param mixed $block
 * @param int   $depth
 * @return array|null
 */
function tfe_storytelling_clean_block( $block, $depth = 0 ) {
    if ( ! is_array( $block ) || empty( $block['blockName'] ) ) {
        // parse_blocks() renvoie aussi des entrees a blockName null pour les
        // blancs entre blocs : sans interet pour le front.
        return null;
    }

    return array(
        'blockName'   => (string) $block['blockName'],
        'attrs'       => isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array(),
        'innerHTML'   => isset( $block['innerHTML'] ) ? (string) $block['innerHTML'] : '',
        'innerBlocks' => tfe_storytelling_clean_blocks(
            isset( $block['innerBlocks'] ) ? $block['innerBlocks'] : array(),
            $depth + 1
        ),
    );
}

// ---------------------------------------------------------------------------
// Case ACF "is_storytelling"
// ---------------------------------------------------------------------------

add_action( 'acf/init', 'tfe_storytelling_register_acf_field' );

/**
 * Identique au groupe qui vivait dans functions.php (meme `key`, meme `name`),
 * pour que la valeur deja saisie sur les posts existants soit conservee.
 *
 * Accroche a `acf/init` plutot qu'execute au chargement du fichier : un
 * mu-plugin se charge AVANT les plugins, donc avant ACF —
 * acf_add_local_field_group() n'existe pas encore a ce moment-la.
 */
function tfe_storytelling_register_acf_field() {
    if ( ! function_exists( 'acf_add_local_field_group' ) ) {
        return;
    }

    acf_add_local_field_group(
        array(
            'key'          => 'group_storytelling_template',
            'title'        => 'Template',
            'fields'       => array(
                array(
                    'key'           => 'field_is_storytelling',
                    'label'         => 'Storytelling (audio/video layout)',
                    'name'          => 'is_storytelling',
                    'type'          => 'true_false',
                    'instructions'  => 'Check to use the storytelling template (ArticleMediaLayout) instead of the standard article template.',
                    'default_value' => 0,
                    'ui'            => 1,
                ),
            ),
            'location'     => array(
                array(
                    array(
                        'param'    => 'post_type',
                        'operator' => '==',
                        'value'    => 'post',
                    ),
                ),
            ),
            'position'     => 'side',
            'show_in_rest' => 1,
        )
    );
}