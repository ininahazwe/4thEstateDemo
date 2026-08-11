import { ChevronDown } from 'lucide-react';

interface FooterCollapsibleTitleProps {
    /** Identifiant unique de la colonne — relie l'input et le label. */
    id: string;
    children: React.ReactNode;
}

/**
 * Titre de colonne du footer, repliable en mobile (<760px).
 *
 * Le CSS du thème (global.css, media max-width:759px) pilote déjà le repli via
 * `.footer-links input:not(:checked) ~ .item { display:none }` — mais l'input
 * attendu n'existait nulle part dans le markup : l'accordéon ne fonctionnait
 * donc pas, et le chevron `:after` pointait vers la police `ci-icons`, absente
 * du projet (aucun @font-face, aucun fichier) → glyphe vide.
 *
 * Ici : vrai checkbox (accordéon CSS-only, aucun JS, composant serveur
 * préservé) + chevron lucide-react, cohérent avec le reste du projet.
 * Le `:after` d'origine est neutralisé dans footer-accordion.css.
 */
export default function FooterCollapsibleTitle({ id, children }: FooterCollapsibleTitleProps) {
    return (
        <>
            {/* Non coché par défaut = replié en mobile, conforme au CSS d'origine.
                En desktop la règle de repli ne s'applique pas (media query), les
                liens restent visibles quel que soit l'état. */}
            <input type="checkbox" id={id} className="footer-collapse-toggle" />
            <label className="footer-title" htmlFor={id}>
                {children}
                <ChevronDown
                    className="footer-title__chevron"
                    size={18}
                    strokeWidth={2}
                    aria-hidden="true"
                />
            </label>
        </>
    );
}
