<?php
/**
 * Plugin Name: TFE Article Fields
 * Description: Registers ACF field group for article subtitle (two-part headline)
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Register ACF field group for article subtitle
add_action( 'acf/init', function() {
    if ( ! function_exists( 'acf_add_local_field_group' ) ) {
        return;
    }

    acf_add_local_field_group( array(
        'key'      => 'group_tfe_article_fields',
        'title'    => 'Article Fields',
        'fields'   => array(
            array(
                'key'             => 'field_tfe_subtitle',
                'label'           => 'Subtitle (end of title)',
                'name'            => 'subtitle',
                'type'            => 'text',
                'instructions'    => 'Enter the second part of the title that appears after the colon. It will be displayed in smaller font on the frontend.',
                'required'        => false,
                'position'        => 'acf_after_title',
                'show_in_rest'    => true,
            ),
        ),
        'location' => array(
            array(
                array(
                    'param'    => 'post_type',
                    'operator' => '==',
                    'value'    => 'post',
                ),
            ),
        ),
        'menu_order'            => 0,
        'position'              => 'normal',
        'style'                 => 'default',
        'label_placement'       => 'top',
        'instruction_placement' => 'label',
        'show_in_rest'          => true,
    ) );
} );

// Display coherence check notice if subtitle doesn't match title
add_action( 'admin_notices', function() {
    global $post;

    if ( ! $post || 'post' !== $post->post_type ) {
        return;
    }

    if ( ! function_exists( 'get_field' ) ) {
        return;
    }

    $title    = $post->post_title;
    $subtitle = get_field( 'subtitle', $post->ID );

    if ( empty( $subtitle ) ) {
        return;
    }

    // Normalize for comparison
    $normalize = function( $text ) {
        $text = html_entity_decode( $text, ENT_QUOTES, 'UTF-8' );
        $text = str_replace( "'", "'", $text ); // Convert curly apostrophe to straight
        $text = preg_replace( '/\s+/', ' ', $text ); // Reduce multiple spaces to one
        $text = strtolower( trim( $text ) );
        return $text;
    };

    $title_norm    = $normalize( $title );
    $subtitle_norm = $normalize( $subtitle );

    // Check if subtitle matches the end of the title
    if ( ! str_ends_with( $title_norm, $subtitle_norm ) ) {
        echo '<div class="notice notice-warning"><p>';
        printf(
            'The subtitle doesn\'t match the end of the title. The headline display may be incorrect. ' .
            'Title: "<strong>%s</strong>" | Subtitle: "<strong>%s</strong>"',
            esc_html( $title ),
            esc_html( $subtitle )
        );
        echo '</p></div>';
    }
} );