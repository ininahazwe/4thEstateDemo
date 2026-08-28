<?php
/**
 * Plugin Name: TFE — Garde-fous médias
 * Description: Limites d'upload et de traitement d'image alignées sur le budget mémoire réel du serveur (128 Mo/image, GD sans Imagick).
 *
 * ⚠️ RECONSTRUCTION (24/08/2026) — ce fichier était pourtant documenté comme
 * "déjà déposé sur le CMS et actif" au 18/08 (claude/garde-fous-medias.md).
 * Sa disparition confirme que la réinstallation a bien tout emporté, pas
 * seulement les fichiers jamais déployés. Rebâti à partir des constantes et
 * de la logique documentées dans ce même fichier de projet.
 * À RELIRE avant déploiement — ce n'est pas le fichier d'origine.
 */

if (!defined('ABSPATH')) exit;

if (!defined('TFE_MEDIA_MAX_BYTES'))        define('TFE_MEDIA_MAX_BYTES', 8 * 1024 * 1024); // 8 Mo
if (!defined('TFE_MEDIA_MAX_MEGAPIXELS'))   define('TFE_MEDIA_MAX_MEGAPIXELS', 16);           // 16 MP ≈ 128 Mo en mémoire GD
if (!defined('TFE_MEDIA_MAX_DIMENSION'))    define('TFE_MEDIA_MAX_DIMENSION', 5000);          // px, garde-fou secondaire
if (!defined('TFE_MEDIA_SCALE_THRESHOLD'))  define('TFE_MEDIA_SCALE_THRESHOLD', 2048);        // défaut WP = 2560
if (!defined('TFE_MEDIA_QUALITY'))          define('TFE_MEDIA_QUALITY', 82);

function tfe_media_bitmap_mimes() {
    return ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
}

/**
 * Seuil natif WordPress de re-découpe des grandes images à l'upload.
 */
add_filter('big_image_size_threshold', function () {
    return TFE_MEDIA_SCALE_THRESHOLD;
});

/**
 * Qualité de ré-encodage JPEG/WebP, sur toutes les tailles générées.
 */
add_filter('wp_editor_set_quality', function ($quality, $mime_type) {
    if (in_array($mime_type, ['image/jpeg', 'image/webp'], true)) {
        return TFE_MEDIA_QUALITY;
    }
    return $quality;
}, 10, 2);

/**
 * Contrôle à l'upload : poids puis dimensions. Ne s'applique qu'aux mimes
 * bitmap — les vidéos de hero gardent les 32 Mo du serveur
 * (upload_max_filesize) : c'est pourquoi ce plugin ne touche pas à
 * upload_size_limit, qui s'appliquerait à tous les types de fichiers.
 */
add_filter('wp_handle_upload_prefilter', function ($file) {
    if (!in_array($file['type'], tfe_media_bitmap_mimes(), true)) {
        return $file;
    }

    $max_bytes = min(TFE_MEDIA_MAX_BYTES, wp_max_upload_size());
    if ($file['size'] > $max_bytes) {
        $file['error'] = sprintf(
            'Image trop lourde (%s Mo). Limite : %s Mo.',
            round($file['size'] / 1048576, 1),
            round($max_bytes / 1048576, 1)
        );
        return $file;
    }

    $info = @getimagesize($file['tmp_name']);
    if ($info) {
        [$width, $height] = $info;
        $megapixels = ($width * $height) / 1000000;

        if ($megapixels > TFE_MEDIA_MAX_MEGAPIXELS) {
            $file['error'] = sprintf(
                'Image trop grande (%.1f MP, %d×%d px). Limite : %d MP — au-delà, le traitement dépasse la mémoire PHP disponible (GD, sans Imagick).',
                $megapixels, $width, $height, TFE_MEDIA_MAX_MEGAPIXELS
            );
            return $file;
        }

        if ($width > TFE_MEDIA_MAX_DIMENSION || $height > TFE_MEDIA_MAX_DIMENSION) {
            $file['error'] = sprintf(
                'Dimension trop grande (%d×%d px). Limite : %d px sur le plus grand côté.',
                $width, $height, TFE_MEDIA_MAX_DIMENSION
            );
            return $file;
        }
    }

    return $file;
});