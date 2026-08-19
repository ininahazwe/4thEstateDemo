/**
 * Decoupage titre / sous-titre pour les deux surfaces « hero ».
 *
 * Le titre WordPress reste TOUJOURS complet (contrainte SEO, cf.
 * wordpress/mu-plugins/tfe-article-fields.php). Le champ ACF `subtitle`
 * recopie sa partie finale ; cette fonction s'en sert uniquement pour savoir
 * ou couper a l'affichage.
 *
 * Regle de securite : si le sous-titre ne correspond pas exactement a la fin
 * du titre, on ne coupe pas. Le titre entier est alors rendu d'un seul bloc —
 * jamais de texte perdu, jamais de texte duplique.
 */

export interface TitleParts {
    /** Debut du titre, ou titre entier si aucun decoupage n'est possible. */
    lead: string;
    /** Fin du titre, a afficher en plus petit. `undefined` = pas de decoupage. */
    rest?: string;
}

/**
 * Normalise pour comparer : apostrophes typographiques ramenees a l'apostrophe
 * droite, espaces multiples reduits, minuscules.
 *
 * Indispensable : l'editeur WordPress transforme ' en ’ a la volee, un
 * copier-coller entre les deux champs ne donnerait donc jamais deux chaines
 * strictement identiques.
 */
function normalize(value: string): string {
    return value
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

export function splitTitle(title: string, subtitle?: string): TitleParts {
    const full = title.trim();
    const sub = subtitle?.trim();

    if (!sub) return { lead: full };

    const nFull = normalize(full);
    const nSub = normalize(sub);

    // Un sous-titre aussi long que le titre ne laisserait pas d'accroche.
    if (!nSub || nSub.length >= nFull.length || !nFull.endsWith(nSub)) {
        return { lead: full };
    }

    // On coupe sur la chaine D'ORIGINE, pas sur la version normalisee : les
    // longueurs peuvent differer (espaces multiples reduits). On repart donc
    // de la fin en comptant les caracteres du sous-titre tel qu'il est saisi.
    const cut = full.toLowerCase().lastIndexOf(sub.toLowerCase());
    if (cut <= 0) return { lead: full };

    // Retire le deux-points et les espaces qui separaient les deux parties.
    const lead = full.slice(0, cut).replace(/[\s:\u00A0\u202F]+$/u, '');
    const rest = full.slice(cut).trim();

    if (!lead || !rest) return { lead: full };

    return { lead, rest };
}
