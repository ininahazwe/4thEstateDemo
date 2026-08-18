<?php
/**
 * Plugin Name: TFE — Garde-fous médias
 * Description: Plafonne le poids et les dimensions des IMAGES déposées dans la
 *              médiathèque, abaisse le seuil de redimensionnement automatique
 *              de WordPress et fixe la qualité de ré-encodage.
 * Author: The Fourth Estate
 * Version: 1.0.0
 *
 * ---------------------------------------------------------------------------
 * INSTALLATION : déposer ce fichier dans wp-content/mu-plugins/ du WP de
 * cms.thefourthestategh.com. Aucune constante à définir : les seuils sont en
 * haut du fichier, surchargeables depuis wp-config.php si besoin.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI PAS `upload_size_limit`
 *
 * Filtrer `upload_size_limit` serait plus simple (WordPress refuserait le
 * fichier côté navigateur, avant l'envoi) mais cette limite s'applique à TOUS
 * les types de fichiers. Elle casserait les vidéos de hero (cf.
 * tfe-hero-video.php), qui dépassent légitimement plusieurs mégaoctets. On
 * filtre donc à l'upload, en ne testant que les images.
 *
 * CE QUE LE VISITEUR NE VOIT PAS
 *
 * Le front sert les images via next/image (rewrite /wp-content/uploads/* de
 * next.config.ts) : il livre déjà de l'AVIF/WebP redimensionné, quelle que
 * soit la taille de l'original. Ces garde-fous ne servent donc PAS le confort
 * de lecture — ils protègent :
 *   1. la mémoire PHP à l'upload (une image de 6000×4000 px demande ~100 Mo à
 *      décompresser : au-delà, l'upload échoue avec une erreur incompréhensible
 *      pour le rédacteur, ou une vignette blanche) ;
 *   2. le disque cPanel, partagé avec les 4 autres apps du compte ;
 *   3. le CPU d'optimisation de Next au build et en ISR — le point sensible,
 *      cet hébergement mutualisé ayant déjà saturé sur la génération de 237
 *      pages (cf. staticPageGenerationTimeout: 180 et experimental.cpus: 1).
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Plafond de poids SOUHAITÉ pour une image, en octets.
 *
 * La limite réellement appliquée est le minimum de cette valeur et de celle du
 * serveur (voir tfe_media_max_bytes()). Depuis le relevage du 18/08/2026,
 * `upload_max_filesize = 32M` : c'est donc bien cette constante qui décide pour
 * les images, tandis que les vidéos de hero conservent les 32 Mo du serveur —
 * exactement le but du filtrage par type MIME.
 *
 * 8 Mo, et non 5 : la limite doit rester cohérente avec le plafond de surface.
 * Une photo de 16 mégapixels exportée en JPEG qualité 90 pèse 7 à 9 Mo ; la
 * refuser sur le poids alors qu'elle passe sur la surface produirait un message
 * contradictoire pour le rédacteur.
 */
if ( ! defined( 'TFE_MEDIA_MAX_BYTES' ) ) {
    define( 'TFE_MEDIA_MAX_BYTES', 8 * 1024 * 1024 );
}

/**
 * Surface maximale acceptée, en mégapixels.
 *
 * C'EST LA LIMITE QUI COMPTE, pas le poids du fichier ni la longueur d'un côté.
 *
 * L'éditeur actif de ce site est **GD**, pas ImageMagick (Santé du site →
 * Media Handling : « Active editor: WP_Image_Editor_GD » ; « Is the Imagick
 * library available? No »). GD décompresse l'image ENTIÈRE en mémoire —
 * largeur × hauteur × 4 octets — et en garde deux copies simultanées (source +
 * destination) pour redimensionner. Le coût dépend donc du NOMBRE DE PIXELS,
 * pas du côté le plus long : un panorama 6000×1000 (6 MP) coûte deux fois
 * moins qu'un 3000×4000 (12 MP), alors qu'il est bien plus « large ».
 *
 * BUDGET RÉEL : 256 Mo, et non les 128 Mo de `memory_limit`.
 *
 * C'est le point contre-intuitif. WordPress appelle
 * `wp_raise_memory_limit( 'image' )` avant toute manipulation d'image, ce qui
 * relève la limite à `WP_MAX_MEMORY_LIMIT` — la ligne « PHP memory limit (only
 * for admin screens): 256M » de la Santé du site. Calibrer sur 128 Mo
 * reviendrait donc à s'interdire la moitié de la mémoire disponible.
 *
 *     mémoire ≈ mégapixels × 4 octets × 2 copies
 *     12 MP (4032×3024, iPhone brut) →  ~96 Mo  ✅
 *     16 MP (4896×3264, reflex)      → ~128 Mo  ✅ limite retenue
 *     24 MP (6000×4000)              → ~192 Mo  ⚠️ tient mal avec WordPress chargé
 *     48 MP (8000×6000)              → ~384 Mo  ❌
 *
 * 16 MP laisse donc ~110 Mo pour WordPress, Foxiz, Elementor et les plugins de
 * sécurité pendant l'opération. Les photos de téléphone passent désormais sans
 * redimensionnement préalable — y compris les HEIC, dont la conversion en JPEG
 * (« Image format transforms ») passe elle aussi par GD.
 *
 * Si `imagick` est activé un jour, cette contrainte disparaît : ImageMagick
 * travaille par tuiles sur disque et le seuil peut largement remonter.
 */
if ( ! defined( 'TFE_MEDIA_MAX_MEGAPIXELS' ) ) {
    define( 'TFE_MEDIA_MAX_MEGAPIXELS', 16 );
}

/**
 * Longueur maximale d'un côté, en pixels.
 *
 * Garde-fou secondaire, contre les images extrêmement étirées : une bande de
 * 30000×200 ne fait que 6 MP (donc passe le test ci-dessus) mais ne veut rien
 * dire éditorialement, et certaines bibliothèques plafonnent la dimension d'un
 * côté indépendamment de la surface.
 */
if ( ! defined( 'TFE_MEDIA_MAX_DIMENSION' ) ) {
    define( 'TFE_MEDIA_MAX_DIMENSION', 5000 );
}

/**
 * Seuil au-delà duquel WordPress crée une version « -scaled » et sert
 * celle-ci partout.
 *
 * Défaut WordPress : 2560 px. Abaissé à 2048 : au-delà, plus aucun affichage
 * du front n'en profite (la plus grande image utile est le hero), mais chaque
 * pixel se paie en disque et en temps d'optimisation.
 */
if ( ! defined( 'TFE_MEDIA_SCALE_THRESHOLD' ) ) {
    define( 'TFE_MEDIA_SCALE_THRESHOLD', 2048 );
}

/**
 * Qualité de ré-encodage JPEG/WebP par WordPress. Défaut WordPress : 82.
 */
if ( ! defined( 'TFE_MEDIA_QUALITY' ) ) {
    define( 'TFE_MEDIA_QUALITY', 82 );
}

/**
 * Types d'images soumis aux garde-fous.
 *
 * `image/gif` en est EXCLU volontairement : le redimensionnement de WordPress
 * aplatit les GIF animés (on perd l'animation), et ces fichiers sont rares et
 * déjà petits sur ce site. Les SVG ne sont pas concernés non plus : ils ne sont
 * pas bitmap, et leur upload est de toute façon bloqué par WordPress.
 *
 * @return string[]
 */
function tfe_media_guarded_mimes() {
    return array( 'image/jpeg', 'image/png', 'image/webp', 'image/avif' );
}

/**
 * Limite de poids réellement appliquée.
 *
 * On prend le MINIMUM entre notre plafond et celui du serveur
 * (`wp_max_upload_size()` = min de upload_max_filesize et post_max_size).
 * Sans ce calcul, le message d'erreur annoncerait une limite de 5 Mo alors que
 * PHP coupe à 2 Mo : le rédacteur verrait un refus brut du serveur, sans
 * explication, pour un fichier que notre message présente comme acceptable.
 *
 * @return int Octets.
 */
function tfe_media_max_bytes() {
    $server = (int) wp_max_upload_size();

    if ( $server > 0 ) {
        return min( (int) TFE_MEDIA_MAX_BYTES, $server );
    }

    return (int) TFE_MEDIA_MAX_BYTES;
}

/**
 * Refuse une image trop lourde ou trop grande, AVANT qu'elle n'entre dans la
 * médiathèque.
 *
 * `wp_handle_upload_prefilter` couvre tous les chemins d'upload : médiathèque,
 * bouton « Image mise en avant », insertion dans un bloc, et Elementor. Poser
 * un `$file['error']` remonte le message tel quel dans l'interface.
 *
 * @param array $file Entrée de $_FILES en cours de traitement.
 * @return array
 */
function tfe_media_check_upload( $file ) {
    if ( ! empty( $file['error'] ) ) {
        return $file; // Déjà en erreur : ne pas masquer la cause d'origine.
    }

    $type = isset( $file['type'] ) ? strtolower( (string) $file['type'] ) : '';

    if ( ! in_array( $type, tfe_media_guarded_mimes(), true ) ) {
        return $file;
    }

    // 1) Poids.
    $size  = isset( $file['size'] ) ? (int) $file['size'] : 0;
    $limit = tfe_media_max_bytes();

    if ( $size > $limit ) {
        $file['error'] = sprintf(
        /* translators: 1: taille du fichier, 2: limite. */
            __( 'This image is %1$s, which is over the %2$s limit. Please export it at a smaller size or compress it (Squoosh, TinyPNG) before uploading.', 'tfe' ),
            size_format( $size, 1 ),
            size_format( $limit, 0 )
        );

        return $file;
    }

    // 2) Dimensions. getimagesize() ne lit que l'en-tête du fichier : il ne
    // décompresse pas l'image, donc ce test ne consomme pas la mémoire qu'il
    // sert justement à protéger.
    $dimensions = @getimagesize( $file['tmp_name'] );

    if ( is_array( $dimensions ) ) {
        $width  = isset( $dimensions[0] ) ? (int) $dimensions[0] : 0;
        $height = isset( $dimensions[1] ) ? (int) $dimensions[1] : 0;

        // 2a) Surface — la contrainte mémoire réelle avec GD.
        $megapixels = ( $width * $height ) / 1000000;

        if ( $megapixels > TFE_MEDIA_MAX_MEGAPIXELS ) {
            $file['error'] = sprintf(
            /* translators: 1: largeur, 2: hauteur, 3: mégapixels mesurés, 4: limite en mégapixels, 5: côté recommandé. */
                __( 'This image is %1$d×%2$d pixels (%3$s megapixels), over the %4$d megapixel limit — the server cannot resize it without running out of memory. Please export it at %5$d pixels on the long side before uploading; the website never displays anything larger.', 'tfe' ),
                $width,
                $height,
                number_format_i18n( $megapixels, 1 ),
                (int) TFE_MEDIA_MAX_MEGAPIXELS,
                (int) TFE_MEDIA_SCALE_THRESHOLD
            );

            return $file;
        }

        // 2b) Côté le plus long — garde-fou secondaire (images très étirées).
        if ( $width > TFE_MEDIA_MAX_DIMENSION || $height > TFE_MEDIA_MAX_DIMENSION ) {
            $file['error'] = sprintf(
            /* translators: 1: largeur, 2: hauteur, 3: limite en pixels. */
                __( 'This image is %1$d×%2$d pixels. Neither side may exceed %3$d pixels.', 'tfe' ),
                $width,
                $height,
                (int) TFE_MEDIA_MAX_DIMENSION
            );
        }
    }

    return $file;
}
add_filter( 'wp_handle_upload_prefilter', 'tfe_media_check_upload' );

/**
 * Seuil de création du « -scaled ».
 *
 * Retourne `false` pour les GIF : les scaler leur ferait perdre l'animation.
 *
 * @param int|bool $threshold Seuil courant.
 * @param array    $imagesize Dimensions détectées.
 * @param string   $file      Chemin du fichier.
 * @return int|bool
 */
function tfe_media_scale_threshold( $threshold, $imagesize = array(), $file = '' ) {
    if ( is_string( $file ) && '' !== $file && preg_match( '/\.gif$/i', $file ) ) {
        return false;
    }

    return (int) TFE_MEDIA_SCALE_THRESHOLD;
}
add_filter( 'big_image_size_threshold', 'tfe_media_scale_threshold', 10, 3 );

/**
 * Qualité de ré-encodage, tous formats confondus.
 *
 * @param int $quality Qualité courante.
 * @return int
 */
function tfe_media_quality( $quality ) {
    return (int) TFE_MEDIA_QUALITY;
}
add_filter( 'wp_editor_set_quality', 'tfe_media_quality' );

/**
 * Rappelle la règle sous le sélecteur de fichiers, pour que le rédacteur la
 * connaisse AVANT de perdre deux minutes à envoyer un fichier de 20 Mo depuis
 * une connexion lente.
 */
function tfe_media_upload_notice() {
    printf(
        '<p class="tfe-media-hint" style="margin:8px 0 0;color:#757575;font-size:12px;">%s</p>',
        esc_html(
            sprintf(
            /* translators: 1: limite de poids, 2: limite en mégapixels, 3: seuil de redimensionnement. */
                __( 'Images: %1$s maximum, %2$d megapixels maximum. Export at %3$d pixels on the long side — the website never displays anything larger, and photos straight out of a phone or camera are too large for this server to process.', 'tfe' ),
                size_format( tfe_media_max_bytes(), 0 ),
                (int) TFE_MEDIA_MAX_MEGAPIXELS,
                (int) TFE_MEDIA_SCALE_THRESHOLD
            )
        )
    );
}
add_action( 'post-upload-ui', 'tfe_media_upload_notice' );