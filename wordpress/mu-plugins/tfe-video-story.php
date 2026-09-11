<?php
/**
 * Plugin Name: TFE Video Story
 * Description: Le slider "Reels" de la home (TikTok/YouTube/Facebook) : type de contenu et champs 100% natifs WordPress, sans ACF.
 * Version: 1.0.0
 * Author: The Fourth Estate
 *
 * ---------------------------------------------------------------------------
 * POURQUOI PAS ACF, ICI
 *
 * Les 4 champs sont tous scalaires (texte/URL), sans repeater ni relation —
 * exactement le cas ou ACF n'apporte aucune valeur. Contrairement a
 * tfe-highlight.php ou tfe-article-fields.php (mu-plugins qui VERSIONNENT une
 * declaration ACF, mais dependent toujours du plugin ACF actif au runtime),
 * ce fichier n'appelle aucune fonction ACF : `register_post_meta()` +
 * une meta box native suffisent. Zero dependance externe pour ce CPT.
 *
 * ---------------------------------------------------------------------------
 * CONTRAT AVEC LE FRONT — a ne pas casser
 *
 * `GET /wp-json/wp/v2/video-story?per_page=20&status=publish&orderby=date&order=desc&_fields=id,title,date,meta`
 *
 * Consomme par `app/services/wpApi.videoStory.ts`, rendu par
 * `app/components/VideoSlider/TikTokStoriesSlider.tsx`.
 *
 * | Cle meta                  | Ce que le front en fait                        |
 * |----------------------------|------------------------------------------------|
 * | `tfe_video_url`            | REQUIS. Plateforme detectee depuis l'URL cote  |
 * |                             | front (detectPlatform() dans Tiktokdemodata.ts)|
 * | `tfe_video_caption`        | Optionnel — sinon titre resolu via oEmbed      |
 * | `tfe_video_thumbnail`      | Optionnel (URL) — sinon thumbnail resolue par  |
 * |                             | plateforme (YouTube: predictible, TikTok/     |
 * |                             | Facebook: oEmbed serveur)                       |
 * | `tfe_video_duration`       | Optionnel, purement visuel ("1:42")            |
 *
 * `register_post_meta()` avec `show_in_rest => true` expose ces cles sous la
 * cle `meta` de la reponse REST — automatique, pas de filtre `_fields`
 * supplementaire a ecrire cote PHP.
 *
 * ---------------------------------------------------------------------------
 * MIGRATION DEPUIS L'ANCIEN CPT "video-story" (cree via ACF)
 *
 * Ordre a respecter sur le CMS :
 *
 * 1. Deposer ce fichier dans wp-content/mu-plugins/.
 * 2. Recharger un ecran d'admin : `tfe_video_story_migrate()` copie une seule
 *    fois les anciennes valeurs ACF (postmeta `url`, `caption`, `thumbnail`
 *    en ID d'attachment, `duration`) vers les nouvelles cles `tfe_video_*`.
 *    Rien n'est supprime, l'ancien postmeta ACF reste en base.
 * 3. Verifier le slider en front (les items existants doivent continuer a
 *    s'afficher a l'identique).
 * 4. Supprimer l'entree "video-story" dans ACF > Post Types, puis le groupe
 *    de champs correspondant dans ACF > Field Groups. Un bandeau d'admin
 *    (`tfe_video_story_notices()`) rappelle ces deux etapes tant qu'elles ne
 *    sont pas faites.
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/** Slug du type de contenu (= rest_base : /wp-json/wp/v2/video-story). */
const TFE_VIDEO_STORY_CPT = 'video-story';

/** Cles meta natives, exposees en REST sous `meta.*`. */
const TFE_VIDEO_STORY_META_URL       = 'tfe_video_url';
const TFE_VIDEO_STORY_META_CAPTION   = 'tfe_video_caption';
const TFE_VIDEO_STORY_META_THUMBNAIL = 'tfe_video_thumbnail';
const TFE_VIDEO_STORY_META_DURATION  = 'tfe_video_duration';

/** Cles postmeta de l'ancien groupe ACF, lues une seule fois a la migration. */
const TFE_VIDEO_STORY_LEGACY_URL       = 'url';
const TFE_VIDEO_STORY_LEGACY_CAPTION   = 'caption';
const TFE_VIDEO_STORY_LEGACY_THUMBNAIL = 'thumbnail';
const TFE_VIDEO_STORY_LEGACY_DURATION  = 'duration';

/** Empeche la migration de re-tourner a chaque chargement d'admin. */
const TFE_VIDEO_STORY_MIGRATED_OPTION = 'tfe_video_story_migrated_v1';

// ---------------------------------------------------------------------------
// Type de contenu
// ---------------------------------------------------------------------------

add_action( 'init', 'tfe_video_story_register_post_type', 20 );
/**
 * Priorite 20 et garde `post_type_exists()` : si l'ancienne declaration ACF >
 * Post Types est encore active, c'est elle qui gagne et ce fichier ne declare
 * rien — le temps que la migration (etape 4 en tete de fichier) soit faite.
 * `tfe_video_story_notices()` signale la situation en admin.
 */
function tfe_video_story_register_post_type() {
    global $tfe_video_story_acf_still_owns_type;

    // Pose un indicateur simple, sans dependre d'une fonction interne ACF
    // (acf_is_internal_post_type() a change de signature entre versions —
    // c'est exactement ce qui a fait planter tfe_video_story_notices()).
    $tfe_video_story_acf_still_owns_type = post_type_exists( TFE_VIDEO_STORY_CPT );

    if ( $tfe_video_story_acf_still_owns_type ) {
        return;
    }

    register_post_type(
        TFE_VIDEO_STORY_CPT,
        array(
            'label'               => 'Video Stories',
            'labels'              => array(
                'name'               => 'Video Stories',
                'singular_name'      => 'Video Story',
                'add_new'            => 'Add video story',
                'add_new_item'       => 'Add video story',
                'edit_item'          => 'Edit video story',
                'new_item'           => 'New video story',
                'view_item'          => 'View video story',
                'search_items'       => 'Search video stories',
                'not_found'          => 'No video story yet',
                'not_found_in_trash' => 'No video story in the bin',
                'all_items'          => 'All video stories',
                'menu_name'          => 'Video Stories',
            ),
            // Headless : aucune URL publique cote WordPress, mais expose en REST.
            'public'              => false,
            'publicly_queryable'  => false,
            'exclude_from_search' => true,
            'has_archive'         => false,
            'rewrite'             => false,
            'show_ui'             => true,
            'show_in_menu'        => true,
            'menu_position'       => 6,
            'menu_icon'           => 'dashicons-video-alt2',
            'show_in_rest'        => true,
            'rest_base'           => TFE_VIDEO_STORY_CPT,
            // 'custom-fields' est OBLIGATOIRE, meme si on n'utilise pas
            // l'ancienne boite "Champs personnalises" : WP_REST_Posts_Controller
            // conditionne la cle `meta` de la reponse REST a
            // post_type_supports( $post_type, 'custom-fields' ). Sans lui,
            // register_post_meta() peut etre parfaitement enregistre
            // (get_registered_meta_keys() les montre) et la reponse JSON
            // n'aura AUCUNE cle `meta` — sans le moindre message d'erreur.
            // Piege paye le 11/09/2026 : slider Reels vide en prod.
            'supports'            => array( 'title', 'custom-fields' ),
            'map_meta_cap'        => true,
            'capability_type'     => 'post',
        )
    );
}

// ---------------------------------------------------------------------------
// Champs, natifs WordPress — pas d'ACF
// ---------------------------------------------------------------------------

add_action( 'init', 'tfe_video_story_register_meta', 21 );
/**
 * `register_post_meta()` cote WordPress core : aucune dependance a un plugin
 * tiers. `show_in_rest => true` expose chaque cle sous `meta.*` en REST.
 */
function tfe_video_story_register_meta() {
    register_post_meta(
        TFE_VIDEO_STORY_CPT,
        TFE_VIDEO_STORY_META_URL,
        array(
            'type'              => 'string',
            'single'            => true,
            'show_in_rest'      => true,
            'sanitize_callback' => 'esc_url_raw',
            'auth_callback'     => 'tfe_video_story_meta_auth',
        )
    );

    register_post_meta(
        TFE_VIDEO_STORY_CPT,
        TFE_VIDEO_STORY_META_CAPTION,
        array(
            'type'              => 'string',
            'single'            => true,
            'show_in_rest'      => true,
            'sanitize_callback' => 'sanitize_text_field',
            'auth_callback'     => 'tfe_video_story_meta_auth',
        )
    );

    register_post_meta(
        TFE_VIDEO_STORY_CPT,
        TFE_VIDEO_STORY_META_THUMBNAIL,
        array(
            'type'              => 'string',
            'single'            => true,
            'show_in_rest'      => true,
            'sanitize_callback' => 'esc_url_raw',
            'auth_callback'     => 'tfe_video_story_meta_auth',
        )
    );

    register_post_meta(
        TFE_VIDEO_STORY_CPT,
        TFE_VIDEO_STORY_META_DURATION,
        array(
            'type'              => 'string',
            'single'            => true,
            'show_in_rest'      => true,
            'sanitize_callback' => 'sanitize_text_field',
            'auth_callback'     => 'tfe_video_story_meta_auth',
        )
    );
}

/**
 * @return bool
 */
function tfe_video_story_meta_auth() {
    return current_user_can( 'edit_posts' );
}

// ---------------------------------------------------------------------------
// Meta box d'edition — remplace l'ecran ACF
// ---------------------------------------------------------------------------

add_action( 'add_meta_boxes_' . TFE_VIDEO_STORY_CPT, 'tfe_video_story_add_meta_box' );
function tfe_video_story_add_meta_box() {
    add_meta_box(
        'tfe_video_story_fields',
        'Video details',
        'tfe_video_story_render_meta_box',
        TFE_VIDEO_STORY_CPT,
        'normal',
        'high'
    );
}

/**
 * @param WP_Post $post
 */
function tfe_video_story_render_meta_box( $post ) {
    wp_nonce_field( 'tfe_video_story_save', 'tfe_video_story_nonce' );

    $url       = get_post_meta( $post->ID, TFE_VIDEO_STORY_META_URL, true );
    $caption   = get_post_meta( $post->ID, TFE_VIDEO_STORY_META_CAPTION, true );
    $thumbnail = get_post_meta( $post->ID, TFE_VIDEO_STORY_META_THUMBNAIL, true );
    $duration  = get_post_meta( $post->ID, TFE_VIDEO_STORY_META_DURATION, true );
    ?>
    <p>
        <label for="tfe_video_url"><strong>Video URL</strong> (required — TikTok, YouTube or Facebook)</label><br />
        <input type="url" id="tfe_video_url" name="tfe_video_url" class="widefat"
            value="<?php echo esc_attr( $url ); ?>"
            placeholder="https://www.tiktok.com/@.../video/..." />
    </p>
    <p>
        <label for="tfe_video_caption"><strong>Caption</strong> (optional — falls back to the oEmbed title)</label><br />
        <input type="text" id="tfe_video_caption" name="tfe_video_caption" class="widefat"
            value="<?php echo esc_attr( $caption ); ?>" maxlength="140" />
    </p>
    <p>
        <label for="tfe_video_duration"><strong>Duration</strong> (optional, display only — e.g. "1:42")</label><br />
        <input type="text" id="tfe_video_duration" name="tfe_video_duration"
            value="<?php echo esc_attr( $duration ); ?>" placeholder="1:42" style="width:100px" />
    </p>
    <p>
        <strong>Thumbnail</strong> (optional — resolved automatically otherwise: TikTok/Facebook via oEmbed, YouTube from the video ID)
    </p>
    <p>
        <img id="tfe_video_thumbnail_preview" src="<?php echo esc_url( $thumbnail ); ?>"
            style="max-width:160px;max-height:160px;display:<?php echo $thumbnail ? 'block' : 'none'; ?>;margin-bottom:8px;border-radius:4px;" />
    </p>
    <p>
        <input type="hidden" id="tfe_video_thumbnail" name="tfe_video_thumbnail" value="<?php echo esc_attr( $thumbnail ); ?>" />
        <button type="button" class="button" id="tfe_video_thumbnail_choose">Choose thumbnail</button>
        <button type="button" class="button" id="tfe_video_thumbnail_remove" style="<?php echo $thumbnail ? '' : 'display:none;'; ?>">Remove</button>
    </p>
    <script>
    (function () {
        var chooseBtn = document.getElementById('tfe_video_thumbnail_choose');
        var removeBtn = document.getElementById('tfe_video_thumbnail_remove');
        var input     = document.getElementById('tfe_video_thumbnail');
        var preview    = document.getElementById('tfe_video_thumbnail_preview');
        var frame      = null;

        chooseBtn.addEventListener('click', function (e) {
            e.preventDefault();

            if (frame) {
                frame.open();
                return;
            }

            frame = wp.media({
                title: 'Choose thumbnail',
                library: { type: 'image' },
                multiple: false,
                button: { text: 'Use this image' },
            });

            frame.on('select', function () {
                var attachment = frame.state().get('selection').first().toJSON();
                var url = (attachment.sizes && attachment.sizes.large) ? attachment.sizes.large.url : attachment.url;
                input.value = url;
                preview.src = url;
                preview.style.display = 'block';
                removeBtn.style.display = '';
            });

            frame.open();
        });

        removeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            input.value = '';
            preview.style.display = 'none';
            removeBtn.style.display = 'none';
        });
    }());
    </script>
    <?php
}

add_action( 'admin_enqueue_scripts', 'tfe_video_story_enqueue_media' );
/**
 * @param string $hook
 */
function tfe_video_story_enqueue_media( $hook ) {
    if ( 'post.php' !== $hook && 'post-new.php' !== $hook ) {
        return;
    }

    $screen = get_current_screen();
    if ( ! $screen || TFE_VIDEO_STORY_CPT !== $screen->post_type ) {
        return;
    }

    wp_enqueue_media();
}

add_action( 'save_post_' . TFE_VIDEO_STORY_CPT, 'tfe_video_story_save', 10, 2 );
/**
 * @param int     $post_id
 * @param WP_Post $post
 */
function tfe_video_story_save( $post_id, $post ) {
    if ( ! isset( $_POST['tfe_video_story_nonce'] ) ||
        ! wp_verify_nonce( $_POST['tfe_video_story_nonce'], 'tfe_video_story_save' ) ) {
        return;
    }

    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
        return;
    }

    if ( ! current_user_can( 'edit_post', $post_id ) ) {
        return;
    }

    $fields = array(
        'tfe_video_url'       => 'esc_url_raw',
        'tfe_video_caption'   => 'sanitize_text_field',
        'tfe_video_thumbnail' => 'esc_url_raw',
        'tfe_video_duration'  => 'sanitize_text_field',
    );

    foreach ( $fields as $key => $sanitizer ) {
        if ( ! isset( $_POST[ $key ] ) ) {
            continue;
        }

        $value = call_user_func( $sanitizer, wp_unslash( $_POST[ $key ] ) );

        if ( '' === $value ) {
            delete_post_meta( $post_id, $key );
        } else {
            update_post_meta( $post_id, $key, $value );
        }
    }
}

// ---------------------------------------------------------------------------
// Migration une seule fois depuis l'ancien groupe ACF
// ---------------------------------------------------------------------------

add_action( 'admin_init', 'tfe_video_story_migrate' );
/**
 * Copie les anciennes valeurs ACF (postmeta bruts, pas passes par le
 * "return_format" d'ACF) vers les nouvelles cles natives. Ne s'execute
 * qu'une fois (drapeau en option), et ne touche jamais l'ancien postmeta —
 * en cas de souci, rien n'est perdu, on peut ré-executer la migration en
 * supprimant l'option `tfe_video_story_migrated_v1`.
 */
function tfe_video_story_migrate() {
    if ( get_option( TFE_VIDEO_STORY_MIGRATED_OPTION ) ) {
        return;
    }

    $ids = get_posts(
        array(
            'post_type'        => TFE_VIDEO_STORY_CPT,
            'post_status'      => 'any',
            'posts_per_page'   => -1,
            'fields'           => 'ids',
            'suppress_filters' => false,
        )
    );

    foreach ( $ids as $post_id ) {
        // Ne jamais ecraser une valeur deja saisie via la nouvelle meta box.
        if ( '' !== (string) get_post_meta( $post_id, TFE_VIDEO_STORY_META_URL, true ) ) {
            continue;
        }

        $legacy_url      = (string) get_post_meta( $post_id, TFE_VIDEO_STORY_LEGACY_URL, true );
        $legacy_caption  = (string) get_post_meta( $post_id, TFE_VIDEO_STORY_LEGACY_CAPTION, true );
        $legacy_duration = (string) get_post_meta( $post_id, TFE_VIDEO_STORY_LEGACY_DURATION, true );
        $legacy_thumb_id = (int) get_post_meta( $post_id, TFE_VIDEO_STORY_LEGACY_THUMBNAIL, true );

        if ( '' === $legacy_url ) {
            continue;
        }

        update_post_meta( $post_id, TFE_VIDEO_STORY_META_URL, esc_url_raw( $legacy_url ) );

        if ( '' !== $legacy_caption ) {
            update_post_meta( $post_id, TFE_VIDEO_STORY_META_CAPTION, sanitize_text_field( $legacy_caption ) );
        }

        if ( '' !== $legacy_duration ) {
            update_post_meta( $post_id, TFE_VIDEO_STORY_META_DURATION, sanitize_text_field( $legacy_duration ) );
        }

        if ( $legacy_thumb_id > 0 ) {
            $thumb_url = wp_get_attachment_image_url( $legacy_thumb_id, 'large' ) ?: wp_get_attachment_url( $legacy_thumb_id );

            if ( $thumb_url ) {
                update_post_meta( $post_id, TFE_VIDEO_STORY_META_THUMBNAIL, esc_url_raw( $thumb_url ) );
            }
        }
    }

    update_option( TFE_VIDEO_STORY_MIGRATED_OPTION, current_time( 'mysql' ) );
}

// ---------------------------------------------------------------------------
// Ecran de liste : platform + apercu, pour verifier sans ouvrir chaque entree
// ---------------------------------------------------------------------------

add_filter( 'manage_' . TFE_VIDEO_STORY_CPT . '_posts_columns', 'tfe_video_story_columns' );
/**
 * @param array $columns
 * @return array
 */
function tfe_video_story_columns( $columns ) {
    $out = array();

    foreach ( $columns as $key => $label ) {
        $out[ $key ] = $label;

        if ( 'title' === $key ) {
            $out['tfe_thumbnail'] = 'Thumb';
            $out['tfe_platform']  = 'Platform';
            $out['tfe_url']       = 'URL';
        }
    }

    return $out;
}

add_action( 'manage_' . TFE_VIDEO_STORY_CPT . '_posts_custom_column', 'tfe_video_story_column_content', 10, 2 );
/**
 * @param string $column
 * @param int    $post_id
 */
function tfe_video_story_column_content( $column, $post_id ) {
    switch ( $column ) {

        case 'tfe_thumbnail':
            $thumb = get_post_meta( $post_id, TFE_VIDEO_STORY_META_THUMBNAIL, true );
            if ( $thumb ) {
                printf( '<img src="%s" style="width:40px;height:40px;object-fit:cover;border-radius:4px" />', esc_url( $thumb ) );
            } else {
                echo '<span style="color:#8c8f94" title="Resolved automatically at render time">auto</span>';
            }
            break;

        case 'tfe_platform':
            $url = (string) get_post_meta( $post_id, TFE_VIDEO_STORY_META_URL, true );
            echo esc_html( tfe_video_story_detect_platform( $url ) );
            break;

        case 'tfe_url':
            $url = (string) get_post_meta( $post_id, TFE_VIDEO_STORY_META_URL, true );
            if ( '' === $url ) {
                echo '<span style="color:#b32d2e">missing — never shown on the site</span>';
            } else {
                printf( '<a href="%1$s" target="_blank" rel="noopener noreferrer">%1$s</a>', esc_url( $url ) );
            }
            break;
    }
}

/**
 * Reproduit detectPlatform() de Tiktokdemodata.ts, pour affichage admin
 * uniquement — le front reste seul juge au rendu.
 *
 * @param string $url
 * @return string
 */
function tfe_video_story_detect_platform( $url ) {
    if ( '' === $url ) {
        return '—';
    }
    if ( preg_match( '/tiktok\.com/i', $url ) ) {
        return 'TikTok';
    }
    if ( preg_match( '/(youtube\.com|youtu\.be)/i', $url ) ) {
        return 'YouTube';
    }
    if ( preg_match( '/(facebook\.com|fb\.watch)/i', $url ) ) {
        return 'Facebook';
    }
    return 'unknown';
}

// ---------------------------------------------------------------------------
// Avertissements admin
// ---------------------------------------------------------------------------

add_action( 'admin_notices', 'tfe_video_story_notices' );
function tfe_video_story_notices() {
    $screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

    if ( ! $screen || TFE_VIDEO_STORY_CPT !== $screen->post_type ) {
        return;
    }

    // 1. L'ancienne declaration ACF > Post Types est toujours active : notre
    //    register_post_type() ne s'est pas execute (garde post_type_exists()).
    //    Indicateur pose par tfe_video_story_register_post_type() — pas
    //    d'appel a une fonction interne ACF, dont la signature varie selon
    //    la version (c'est ce qui causait le fatal ici).
    global $tfe_video_story_acf_still_owns_type;

    if ( ! empty( $tfe_video_story_acf_still_owns_type ) ) {
        echo '<div class="notice notice-warning"><p><strong>This screen is still served by ACF (or another plugin already registered this post type).</strong> '
            . 'Delete the "video-story" entry in ACF &rsaquo; Post Types so this plugin\'s native registration '
            . '(and the ACF-free meta box) takes over — see step 4 in tfe-video-story.php.</p></div>';
    }

    // 2. Un groupe de champs ACF cible encore video-story : les anciens champs
    //    et cette nouvelle meta box afficheraient les deux a la fois.
    if ( function_exists( 'acf_get_field_groups' ) ) {
        $groups = acf_get_field_groups( array( 'post_type' => TFE_VIDEO_STORY_CPT ) );

        if ( ! empty( $groups ) ) {
            $titles = array_map(
                static function ( $group ) {
                    return isset( $group['title'] ) ? $group['title'] : $group['key'];
                },
                $groups
            );

            printf(
                '<div class="notice notice-warning"><p><strong>ACF field group still targeting video-story:</strong> %s. '
                . 'Delete it in ACF &rsaquo; Field Groups — this plugin declares its own fields natively, no ACF needed.</p></div>',
                esc_html( implode( ', ', $titles ) )
            );
        }
    }

    // 3. Rappel non bloquant sur l'ecran de liste : les entrees sans URL sont
    //    silencieusement ignorees par le front (filter dans wpApi.videoStory.ts).
    if ( 'edit' === $screen->base ) {
        $missing = get_posts(
            array(
                'post_type'      => TFE_VIDEO_STORY_CPT,
                'post_status'    => 'publish',
                'posts_per_page' => -1,
                'fields'         => 'ids',
                'meta_query'     => array(
                    array(
                        'key'     => TFE_VIDEO_STORY_META_URL,
                        'compare' => 'NOT EXISTS',
                    ),
                ),
            )
        );

        if ( ! empty( $missing ) ) {
            printf(
                '<div class="notice notice-info"><p>%d published video story(ies) have no URL and are silently skipped on the site.</p></div>',
                count( $missing )
            );
        }
    }
}
