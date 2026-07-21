// ---------------------------------------------------------------------------
// wpApi.page.ts — dédié aux "Pages" WordPress classiques (menu Pages en
// admin, post_type=page), par opposition aux articles (post_type=post).
// Contenu géré entièrement côté WP par l'équipe édito, zéro texte en dur
// côté Next.js — la page /about-us (et toute future page du même type :
// /contact, /terms, /privacy…) affiche simplement ce que l'admin publie.
//
// Note : la page "about-us" est construite avec Elementor côté WP (widgets
// elementor-*), pas l'éditeur classique. content.rendered contient donc du
// HTML plus lourd qu'un article normal (colonnes, wrapper divs) — rendu tel
// quel via dangerouslySetInnerHTML comme pour les articles (ArticleContent),
// les divs Elementor s'affichent simplement en bloc empilé faute du CSS
// Elementor (non chargé ici), sans casser la lecture.
// ---------------------------------------------------------------------------

import { decode } from 'html-entities';

const WP_BASE = process.env.NEXT_PUBLIC_WP_API_URL || 'https://thefourthestategh.com/wp-json/wp/v2';

export interface WpPage {
    id: number;
    slug: string;
    title: string;
    content: string;
    excerpt: string;
}

interface WPPageRaw {
    id: number;
    slug: string;
    title: { rendered: string };
    content: { rendered: string };
    excerpt: { rendered: string };
}

function stripHtml(html: string): string {
    return decode(html).replace(/<[^>]*>/g, '').trim();
}

export async function getWpPage(slug: string): Promise<WpPage | null> {
    try {
        const res = await fetch(
            `${WP_BASE}/pages?slug=${slug}&status=publish`,
            { next: { revalidate: 3600 } }
        );
        if (!res.ok) return null;

        const pages: WPPageRaw[] = await res.json();
        const page = pages[0];
        if (!page) return null;

        return {
            id: page.id,
            slug: page.slug,
            title: decode(page.title.rendered),
            content: page.content.rendered,
            excerpt: stripHtml(page.excerpt.rendered),
        };

    } catch (error) {
        console.error(`Erreur wpApi.page [getWpPage(${slug})]:`, error);
        return null;
    }
}
