<?php
/**
 * Plugin Name: TFE — Revalidation du front Next.js
 * Description: Rafraichit le front headless des qu'un contenu change, et rend l'etat de la liaison visible dans l'admin (Settings > Front revalidation).
 * Author: The Fourth Estate
 * Version: 2.0.0
 *
 * ---------------------------------------------------------------------------
 * CE QUI CHANGE PAR RAPPORT A LA v1
 *
 * La v1 sortait en silence si `TFE_REVALIDATE_URL` n'etait pas definie dans
 * wp-config.php. Rien ne le signalait : le site continuait de fonctionner, les
 * mises a jour arrivaient au bout de la fenetre ISR (5 a 10 min), et il fallait
 * un acces SSH plus le log PHP pour s'en apercevoir. C'est exactement ce qui
 * s'est produit le 28/08/2026.
 *
 * Trois changements pour que ce mode de panne disparaisse :
 *
 *   1. L'URL a une valeur par defaut (TFE_REVALIDATE_DEFAULT_URL). Il n'y a
 *      plus rien d'obligatoire a declarer pour que ca marche.
 *   2. Chaque envoi est enregistre — code HTTP, duree, erreur — et lisible dans
 *      Settings > Front revalidation. Plus besoin de SSH.
 *   3. Un bandeau d'alerte s'affiche en admin si le dernier envoi a echoue.
 *
 * ---------------------------------------------------------------------------
 * CONFIGURATION
 *
 * Rien n'est obligatoire. Chaque reglage est resolu dans cet ordre :
 *
 *   URL     : constante TFE_REVALIDATE_URL  ->  reglage en base  ->  defaut
 *   Secret  : constante TFE_REVALIDATE_SECRET  ->  reglage en base
 *
 * Le secret peut donc vivre dans wp-config.php (recommande : le dossier
 * wordpress/ du repo est versionne sur GitHub) OU etre saisi dans l'ecran
 * d'admin. Cote front, la meme valeur doit etre declaree en REVALIDATE_SECRET
 * dans cPanel > Application Manager.
 *
 * Sans secret, le front repond 401 et l'ecran d'admin l'affiche en rouge.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI L'ENVOI A LIEU SUR `shutdown`
 *
 * `transition_post_status` se declenche AVANT que les champs ACF ne soient
 * ecrits. Pinger a ce moment-la ferait regenerer la page a partir de l'ANCIENNE
 * valeur des champs : le front se rafraichirait pour afficher exactement ce
 * qu'il affichait deja.
 *
 * On accumule donc les chemins pendant la requete et on envoie une seule fois
 * sur `shutdown`, quand tout est en base. Dix sauvegardes dans la meme requete
 * ne produisent qu'un appel.
 *
 * L'appel est BLOQUANT — c'est le seul moyen de connaitre le code HTTP, donc de
 * pouvoir l'afficher. Pour que l'editeur n'attende pas, on ferme d'abord la
 * reponse HTTP avec fastcgi_finish_request() quand elle est disponible : le
 * navigateur a deja la page, le ping part apres. Sans elle, le timeout court
 * (4 s) borne l'attente.
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/** URL du front utilisee si aucune constante ni aucun reglage ne la fournit. */
const TFE_REVALIDATE_DEFAULT_URL = 'https://thefourthestategh.com/api/revalidate';

/** Option stockant l'URL et le secret saisis en admin. */
const TFE_REVALIDATE_OPTION = 'tfe_revalidate_settings';

/** Option stockant l'historique des envois. */
const TFE_REVALIDATE_HISTORY = 'tfe_revalidate_history';

/** Nombre d'envois conserves dans l'historique. */
const TFE_REVALIDATE_HISTORY_MAX = 25;

/**
 * Types de contenu qui alimentent le front.
 *
 * `video-story`, `highlight` et `composition` ne sont pas publics : leur
 * permalien ne veut rien dire, seule la home les affiche.
 */
const TFE_REVALIDATE_POST_TYPES = array( 'post', 'page', 'video-story', 'highlight', 'composition' );

/** Plafond de chemins par envoi — la route Next en accepte 20. */
const TFE_REVALIDATE_MAX_PATHS = 20;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Resout URL et secret, en indiquant d'ou vient chaque valeur.
 *
 * La provenance est affichee en admin : c'est elle qui permet de comprendre
 * pourquoi une valeur n'est pas celle qu'on croit.
 *
 * @return array{url:string, secret:string, url_source:string, secret_source:string}
 */
function tfe_revalidate_config() {
    $stored = get_option( TFE_REVALIDATE_OPTION, array() );
    $stored = is_array( $stored ) ? $stored : array();

    if ( defined( 'TFE_REVALIDATE_URL' ) && '' !== (string) TFE_REVALIDATE_URL ) {
        $url        = (string) TFE_REVALIDATE_URL;
        $url_source = 'wp-config.php';
    } elseif ( ! empty( $stored['url'] ) ) {
        $url        = (string) $stored['url'];
        $url_source = 'settings screen';
    } else {
        $url        = TFE_REVALIDATE_DEFAULT_URL;
        $url_source = 'built-in default';
    }

    if ( defined( 'TFE_REVALIDATE_SECRET' ) && '' !== (string) TFE_REVALIDATE_SECRET ) {
        $secret        = (string) TFE_REVALIDATE_SECRET;
        $secret_source = 'wp-config.php';
    } elseif ( ! empty( $stored['secret'] ) ) {
        $secret        = (string) $stored['secret'];
        $secret_source = 'settings screen';
    } else {
        $secret        = '';
        $secret_source = 'missing';
    }

    return array(
            'url'           => $url,
            'secret'        => $secret,
            'url_source'    => $url_source,
            'secret_source' => $secret_source,
    );
}

// ---------------------------------------------------------------------------
// File d'attente des chemins
// ---------------------------------------------------------------------------

/**
 * File d'attente portee a la requete courante.
 *
 * Appeler avec un chemin pour l'ajouter, sans argument pour lire la liste.
 * Les cles du tableau servent de dedoublonnage.
 *
 * @param string|null $path Chemin absolu a ajouter, ou null pour lire.
 * @return string[]
 */
function tfe_revalidate_paths( $path = null ) {
    static $paths = array();

    if ( is_string( $path ) && '' !== $path ) {
        $paths[ $path ] = true;
    }

    return array_keys( $paths );
}

/**
 * Chemin public d'un contenu, ou '' s'il n'en a pas.
 *
 * Recalcule ici plutot que via get_permalink() : ce plugin doit rester autonome
 * si tfe-headless.php (qui filtre post_link) n'est pas deploye. Meme logique
 * que buildHref() cote Next : /YYYY/MM/slug, mois sur 2 chiffres.
 *
 * @param WP_Post $post
 * @return string
 */
function tfe_revalidate_path_for( $post ) {
    if ( '' === $post->post_name ) {
        return '';
    }

    if ( 'post' === $post->post_type ) {
        $year  = get_post_time( 'Y', false, $post );
        $month = get_post_time( 'm', false, $post );

        if ( empty( $year ) || empty( $month ) ) {
            return '';
        }

        return '/' . $year . '/' . $month . '/' . $post->post_name;
    }

    if ( 'page' === $post->post_type ) {
        return '/' . $post->post_name;
    }

    return '';
}

// ---------------------------------------------------------------------------
// Declencheurs
// ---------------------------------------------------------------------------

add_action( 'transition_post_status', 'tfe_revalidate_on_transition', 10, 3 );
/**
 * Publication, modification, mise a la corbeille.
 *
 * @param string  $new_status
 * @param string  $old_status
 * @param WP_Post $post
 */
function tfe_revalidate_on_transition( $new_status, $old_status, $post ) {
    if ( ! $post instanceof WP_Post ) {
        return;
    }

    if ( ! in_array( $post->post_type, TFE_REVALIDATE_POST_TYPES, true ) ) {
        return;
    }

    if ( wp_is_post_autosave( $post ) || wp_is_post_revision( $post ) ) {
        return;
    }

    // Un brouillon retravaille dix fois ne concerne pas le front.
    if ( 'publish' !== $new_status && 'publish' !== $old_status ) {
        return;
    }

    // La home agrege tout : Hero, slider video, bandeau, dernieres publications.
    tfe_revalidate_paths( '/' );

    $path = tfe_revalidate_path_for( $post );
    if ( '' !== $path ) {
        tfe_revalidate_paths( $path );
    }
}

add_action( 'before_delete_post', 'tfe_revalidate_on_delete', 10, 2 );
/**
 * Suppression definitive — le chemin doit etre calcule AVANT que le post ne
 * disparaisse de la base.
 *
 * @param int          $post_id
 * @param WP_Post|null $post
 */
function tfe_revalidate_on_delete( $post_id, $post = null ) {
    $post = $post instanceof WP_Post ? $post : get_post( $post_id );

    if ( ! $post instanceof WP_Post ) {
        return;
    }

    if ( ! in_array( $post->post_type, TFE_REVALIDATE_POST_TYPES, true ) ) {
        return;
    }

    tfe_revalidate_paths( '/' );

    $path = tfe_revalidate_path_for( $post );
    if ( '' !== $path ) {
        tfe_revalidate_paths( $path );
    }
}

// Remplacer l'image a la une d'un article du Hero ne declenche AUCUNE
// transition de statut : sans ces trois hooks, le front garderait l'ancienne
// image jusqu'a expiration de l'ISR. C'etait un angle mort de la v1.
add_action( 'add_attachment', 'tfe_revalidate_on_attachment' );
add_action( 'edit_attachment', 'tfe_revalidate_on_attachment' );
add_action( 'delete_attachment', 'tfe_revalidate_on_attachment' );
/**
 * @param int $attachment_id
 */
function tfe_revalidate_on_attachment( $attachment_id ) {
    $parent_id = (int) wp_get_post_parent_id( $attachment_id );

    tfe_revalidate_paths( '/' );

    if ( $parent_id <= 0 ) {
        return;
    }

    $parent = get_post( $parent_id );
    if ( ! $parent instanceof WP_Post || 'publish' !== $parent->post_status ) {
        return;
    }

    $path = tfe_revalidate_path_for( $parent );
    if ( '' !== $path ) {
        tfe_revalidate_paths( $path );
    }
}

// ---------------------------------------------------------------------------
// Envoi
// ---------------------------------------------------------------------------

add_action( 'shutdown', 'tfe_revalidate_flush' );
/**
 * Envoie l'appel une fois la requete terminee.
 */
function tfe_revalidate_flush() {
    $paths = tfe_revalidate_paths();

    if ( empty( $paths ) ) {
        return;
    }

    // La reponse HTTP est deja construite : on la rend au navigateur avant de
    // partir en reseau, pour que l'editeur ne subisse pas l'attente.
    if ( function_exists( 'fastcgi_finish_request' ) ) {
        @fastcgi_finish_request(); // phpcs:ignore WordPress.PHP.NoSilencedErrors
    }

    tfe_revalidate_send( $paths, 'auto' );
}

/**
 * Envoie les chemins au front, enregistre le resultat, le retourne.
 *
 * @param string[] $paths   Chemins absolus.
 * @param string   $trigger 'auto' | 'manual' | 'test'
 * @return array{ok:bool, code:int, error:string, body:string, ms:int, paths:string[]}
 */
function tfe_revalidate_send( array $paths, $trigger = 'auto' ) {
    $paths  = array_slice( array_values( array_unique( $paths ) ), 0, TFE_REVALIDATE_MAX_PATHS );
    $config = tfe_revalidate_config();

    $result = array(
            'ok'    => false,
            'code'  => 0,
            'error' => '',
            'body'  => '',
            'ms'    => 0,
            'paths' => $paths,
    );

    if ( '' === $config['secret'] ) {
        $result['error'] = 'No secret configured. Set TFE_REVALIDATE_SECRET in wp-config.php, or fill it in Settings > Front revalidation.';
        tfe_revalidate_record( $result, $trigger );
        return $result;
    }

    // fastcgi_finish_request() a deja rendu la main : un timeout genereux ne
    // coute plus rien a l'editeur, et evite de compter en echec un front
    // simplement occupe a regenerer une grosse page.
    $timeout = function_exists( 'fastcgi_finish_request' ) || 'auto' !== $trigger ? 10 : 4;

    $started = microtime( true );

    $response = wp_remote_post(
            $config['url'],
            array(
                    'timeout'  => $timeout,
                    'blocking' => true,
                    'headers'  => array(
                            'Content-Type'            => 'application/json',
                            'x-tfe-revalidate-secret' => $config['secret'],
                    ),
                    'body'     => wp_json_encode( array( 'paths' => $paths ) ),
            )
    );

    $result['ms'] = (int) round( ( microtime( true ) - $started ) * 1000 );

    if ( is_wp_error( $response ) ) {
        $result['error'] = $response->get_error_message();
        tfe_revalidate_record( $result, $trigger );
        return $result;
    }

    $result['code'] = (int) wp_remote_retrieve_response_code( $response );
    $result['body'] = (string) wp_remote_retrieve_body( $response );
    $result['ok']   = $result['code'] >= 200 && $result['code'] < 300;

    if ( ! $result['ok'] ) {
        // Traduction des codes en cause probable : c'est ce qu'on veut lire
        // dans l'admin, pas un numero nu.
        if ( 401 === $result['code'] ) {
            $result['error'] = 'Secret rejected by the frontend. wp-config.php and cPanel > Application Manager disagree.';
        } elseif ( 503 === $result['code'] ) {
            $result['error'] = 'REVALIDATE_SECRET is not set on the frontend (cPanel > Application Manager).';
        } elseif ( 404 === $result['code'] ) {
            $result['error'] = 'Endpoint not found. Check the revalidation URL.';
        } else {
            $result['error'] = 'Unexpected HTTP status.';
        }
    }

    tfe_revalidate_record( $result, $trigger );
    return $result;
}

/**
 * Ajoute une entree a l'historique, et journalise les echecs.
 *
 * @param array  $result
 * @param string $trigger
 */
function tfe_revalidate_record( array $result, $trigger ) {
    $history = get_option( TFE_REVALIDATE_HISTORY, array() );
    $history = is_array( $history ) ? $history : array();

    array_unshift(
            $history,
            array(
                    'time'    => time(),
                    'trigger' => $trigger,
                    'paths'   => $result['paths'],
                    'code'    => $result['code'],
                    'error'   => $result['error'],
                    'ms'      => $result['ms'],
                    'ok'      => $result['ok'],
            )
    );

    $history = array_slice( $history, 0, TFE_REVALIDATE_HISTORY_MAX );

    // autoload = false : cet historique n'est lu que sur l'ecran de reglages,
    // inutile de le charger a chaque requete du site.
    update_option( TFE_REVALIDATE_HISTORY, $history, false );

    if ( ! $result['ok'] ) {
        error_log(
                '[tfe-revalidate] ECHEC (' . $trigger . ') HTTP ' . $result['code']
                . ' pour ' . implode( ', ', $result['paths'] )
                . ' : ' . $result['error']
        );
    }
}

// ---------------------------------------------------------------------------
// Ecran d'admin
// ---------------------------------------------------------------------------

add_action( 'admin_menu', 'tfe_revalidate_admin_menu' );
/**
 * Settings > Front revalidation.
 */
function tfe_revalidate_admin_menu() {
    add_options_page(
            'Front revalidation',
            'Front revalidation',
            'manage_options',
            'tfe-revalidate',
            'tfe_revalidate_render_page'
    );
}

add_action( 'admin_post_tfe_revalidate_save', 'tfe_revalidate_handle_save' );
/**
 * Enregistre URL et secret saisis a l'ecran.
 */
function tfe_revalidate_handle_save() {
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( 'Insufficient permissions.' );
    }

    check_admin_referer( 'tfe_revalidate_save' );

    $stored = get_option( TFE_REVALIDATE_OPTION, array() );
    $stored = is_array( $stored ) ? $stored : array();

    $url = isset( $_POST['tfe_url'] ) ? esc_url_raw( wp_unslash( $_POST['tfe_url'] ) ) : '';
    $stored['url'] = $url;

    // Champ secret laisse vide = on garde la valeur existante. Sans ca, ouvrir
    // la page et enregistrer effacerait le secret sans que personne ne le voie.
    $secret = isset( $_POST['tfe_secret'] ) ? trim( (string) wp_unslash( $_POST['tfe_secret'] ) ) : '';
    if ( '' !== $secret ) {
        $stored['secret'] = $secret;
    }

    update_option( TFE_REVALIDATE_OPTION, $stored, false );

    wp_safe_redirect( add_query_arg( 'tfe_msg', 'saved', admin_url( 'options-general.php?page=tfe-revalidate' ) ) );
    exit;
}

add_action( 'admin_post_tfe_revalidate_test', 'tfe_revalidate_handle_test' );
/**
 * Envoie un ping de test sur '/' et renvoie sur la page avec le verdict.
 */
function tfe_revalidate_handle_test() {
    // Volontairement plus permissif que l'enregistrement des reglages : le
    // bouton « Refresh front » de la barre d'admin sert aux editeurs, qui n'ont
    // pas manage_options. Declencher une regeneration ne divulgue rien et
    // n'ecrit rien.
    if ( ! current_user_can( 'edit_others_posts' ) ) {
        wp_die( 'Insufficient permissions.' );
    }

    check_admin_referer( 'tfe_revalidate_test' );

    $result = tfe_revalidate_send( array( '/' ), 'test' );

    // Un editeur n'a pas acces a options-general.php : on le renvoie d'ou il
    // vient, avec le verdict en parametre.
    $target = current_user_can( 'manage_options' )
            ? admin_url( 'options-general.php?page=tfe-revalidate' )
            : ( wp_get_referer() ? wp_get_referer() : admin_url() );

    wp_safe_redirect(
            add_query_arg( 'tfe_msg', $result['ok'] ? 'test-ok' : 'test-ko', $target )
    );
    exit;
}

/**
 * Rendu de l'ecran de reglages.
 */
function tfe_revalidate_render_page() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }

    $config    = tfe_revalidate_config();
    $history   = get_option( TFE_REVALIDATE_HISTORY, array() );
    $history   = is_array( $history ) ? $history : array();
    $msg       = isset( $_GET['tfe_msg'] ) ? sanitize_key( wp_unslash( $_GET['tfe_msg'] ) ) : '';
    $has_const = defined( 'TFE_REVALIDATE_URL' ) && '' !== (string) TFE_REVALIDATE_URL;
    $sec_const = defined( 'TFE_REVALIDATE_SECRET' ) && '' !== (string) TFE_REVALIDATE_SECRET;
    $stored    = get_option( TFE_REVALIDATE_OPTION, array() );
    $stored    = is_array( $stored ) ? $stored : array();
    ?>
    <div class="wrap">
        <h1>Front revalidation</h1>

        <p>
            When content changes here, WordPress asks the Next.js frontend to rebuild
            the affected pages immediately, instead of waiting for its 5&ndash;10 minute
            cache window.
        </p>

        <?php if ( 'saved' === $msg ) : ?>
            <div class="notice notice-success"><p>Settings saved.</p></div>
        <?php elseif ( 'test-ok' === $msg ) : ?>
            <div class="notice notice-success"><p>Test ping succeeded. The link is working.</p></div>
        <?php elseif ( 'test-ko' === $msg ) : ?>
            <div class="notice notice-error"><p>Test ping failed. See the last attempt below.</p></div>
        <?php endif; ?>

        <h2>Current configuration</h2>
        <table class="widefat striped" style="max-width:920px">
            <tbody>
            <tr>
                <td style="width:160px"><strong>Endpoint</strong></td>
                <td><code><?php echo esc_html( $config['url'] ); ?></code></td>
                <td style="width:180px"><em>from <?php echo esc_html( $config['url_source'] ); ?></em></td>
            </tr>
            <tr>
                <td><strong>Shared secret</strong></td>
                <td>
                    <?php if ( '' === $config['secret'] ) : ?>
                        <span style="color:#b32d2e"><strong>Not set</strong> &mdash; every ping will be rejected.</span>
                    <?php else : ?>
                        <code><?php echo esc_html( str_repeat( '•', 12 ) ); ?></code> set
                    <?php endif; ?>
                </td>
                <td><em>from <?php echo esc_html( $config['secret_source'] ); ?></em></td>
            </tr>
            </tbody>
        </table>

        <p>
        <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline">
            <input type="hidden" name="action" value="tfe_revalidate_test" />
            <?php wp_nonce_field( 'tfe_revalidate_test' ); ?>
            <button type="submit" class="button button-primary">Send a test ping</button>
        </form>
        </p>

        <h2>Override</h2>
        <p>
            Values defined in <code>wp-config.php</code> always win and cannot be
            edited here. Use the fields below only if you prefer storing them in the
            database.
        </p>

        <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
            <input type="hidden" name="action" value="tfe_revalidate_save" />
            <?php wp_nonce_field( 'tfe_revalidate_save' ); ?>

            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="tfe_url">Endpoint URL</label></th>
                    <td>
                        <input name="tfe_url" id="tfe_url" type="url" class="regular-text code"
                               value="<?php echo esc_attr( isset( $stored['url'] ) ? $stored['url'] : '' ); ?>"
                               placeholder="<?php echo esc_attr( TFE_REVALIDATE_DEFAULT_URL ); ?>"
                                <?php disabled( $has_const ); ?> />
                        <p class="description">
                            <?php if ( $has_const ) : ?>
                                Defined in wp-config.php, this field is ignored.
                            <?php else : ?>
                                Leave empty to use the built-in default.
                            <?php endif; ?>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="tfe_secret">Shared secret</label></th>
                    <td>
                        <input name="tfe_secret" id="tfe_secret" type="password" class="regular-text code"
                               value="" autocomplete="new-password" <?php disabled( $sec_const ); ?> />
                        <p class="description">
                            <?php if ( $sec_const ) : ?>
                                Defined in wp-config.php, this field is ignored.
                            <?php else : ?>
                                Must match <code>REVALIDATE_SECRET</code> in cPanel &rsaquo; Application Manager.
                                Leave empty to keep the current value.
                            <?php endif; ?>
                        </p>
                    </td>
                </tr>
            </table>

            <?php submit_button(); ?>
        </form>

        <h2>Recent attempts</h2>
        <?php if ( empty( $history ) ) : ?>
            <p><em>Nothing yet. Publish something, or send a test ping.</em></p>
        <?php else : ?>
            <table class="widefat striped" style="max-width:920px">
                <thead>
                <tr>
                    <th style="width:150px">When</th>
                    <th style="width:80px">Trigger</th>
                    <th style="width:90px">Result</th>
                    <th style="width:70px">Time</th>
                    <th>Paths / error</th>
                </tr>
                </thead>
                <tbody>
                <?php foreach ( $history as $entry ) : ?>
                    <tr>
                        <td><?php echo esc_html( wp_date( 'j M Y, H:i:s', (int) $entry['time'] ) ); ?></td>
                        <td><?php echo esc_html( $entry['trigger'] ); ?></td>
                        <td>
                            <?php if ( ! empty( $entry['ok'] ) ) : ?>
                                <span style="color:#1a7f37"><strong>OK</strong> <?php echo (int) $entry['code']; ?></span>
                            <?php else : ?>
                                <span style="color:#b32d2e"><strong>FAILED</strong><?php echo $entry['code'] ? ' ' . (int) $entry['code'] : ''; ?></span>
                            <?php endif; ?>
                        </td>
                        <td><?php echo (int) $entry['ms']; ?>&nbsp;ms</td>
                        <td>
                            <code><?php echo esc_html( implode( ' ', (array) $entry['paths'] ) ); ?></code>
                            <?php if ( ! empty( $entry['error'] ) ) : ?>
                                <br /><span style="color:#b32d2e"><?php echo esc_html( $entry['error'] ); ?></span>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>
    </div>
    <?php
}

// ---------------------------------------------------------------------------
// Alerte
// ---------------------------------------------------------------------------

add_action( 'admin_notices', 'tfe_revalidate_admin_notice' );
/**
 * Bandeau si le dernier envoi a echoue, ou si le secret manque.
 *
 * C'est le filet qui manquait : une liaison cassee se voit desormais sans
 * ouvrir quoi que ce soit.
 */
function tfe_revalidate_admin_notice() {
    // Retour du bouton « Refresh front » : visible par tous ceux qui peuvent
    // l'actionner, editeurs compris.
    $msg = isset( $_GET['tfe_msg'] ) ? sanitize_key( wp_unslash( $_GET['tfe_msg'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

    if ( 'test-ok' === $msg && ! current_user_can( 'manage_options' ) ) {
        echo '<div class="notice notice-success is-dismissible"><p>Homepage refreshed on the public website.</p></div>';
    } elseif ( 'test-ko' === $msg && ! current_user_can( 'manage_options' ) ) {
        echo '<div class="notice notice-error is-dismissible"><p>Could not refresh the public website. Ask an administrator to check Settings &rsaquo; Front revalidation.</p></div>';
    }

    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }

    $screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
    if ( $screen && 'settings_page_tfe-revalidate' === $screen->id ) {
        return; // La page dit deja tout, inutile d'empiler un bandeau.
    }

    $config = tfe_revalidate_config();
    $link   = admin_url( 'options-general.php?page=tfe-revalidate' );

    if ( '' === $config['secret'] ) {
        printf(
                '<div class="notice notice-error"><p><strong>Front revalidation is not configured.</strong> '
                . 'Content changes will take up to 10 minutes to appear on the website. '
                . '<a href="%s">Fix it</a></p></div>',
                esc_url( $link )
        );
        return;
    }

    $history = get_option( TFE_REVALIDATE_HISTORY, array() );
    $last    = ( is_array( $history ) && ! empty( $history[0] ) ) ? $history[0] : null;

    if ( $last && empty( $last['ok'] ) ) {
        printf(
                '<div class="notice notice-warning"><p><strong>The last revalidation ping failed.</strong> %s '
                . '<a href="%s">See details</a></p></div>',
                esc_html( (string) $last['error'] ),
                esc_url( $link )
        );
    }
}

// ---------------------------------------------------------------------------
// Bouton dans la barre d'admin
// ---------------------------------------------------------------------------

add_action( 'admin_bar_menu', 'tfe_revalidate_admin_bar', 90 );
/**
 * « Refresh front » pour les editeurs : force la regeneration de la home sans
 * avoir a reenregistrer un contenu.
 *
 * @param WP_Admin_Bar $bar
 */
function tfe_revalidate_admin_bar( $bar ) {
    if ( ! current_user_can( 'edit_others_posts' ) ) {
        return;
    }

    $bar->add_node(
            array(
                    'id'    => 'tfe-revalidate',
                    'title' => 'Refresh front',
                    'href'  => wp_nonce_url( admin_url( 'admin-post.php?action=tfe_revalidate_test' ), 'tfe_revalidate_test' ),
                    'meta'  => array( 'title' => 'Rebuild the homepage on the public website now' ),
            )
    );
}