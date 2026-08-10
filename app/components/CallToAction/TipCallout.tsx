import Link from 'next/link';
import { ShieldCheckIcon } from 'lucide-react';

/**
 * Appel à témoignage affiché dans la colonne droite de .zone-actu (home).
 *
 * Anciennement GoogleAdSlot, dans un markup DFP/GAM
 * (.dfpcontainer > #pave_haut.dfp-slot) : cette nomenclature est présente dans
 * les listes de filtres des bloqueurs de pub (EasyList & co), qui masquaient
 * donc le bloc alors qu'il ne contient aucune publicité. Les classes sont
 * neutres depuis.
 *
 * Sont conservés `zone-aside` et data-column="right" : ils portent la mise en
 * page (colonne 300px @≥1000px via [data-columns="2"] dans base.css) et le
 * sticky, et ne déclenchent aucun filtre.
 *
 * Styles : callout.css
 */
export default function TipCallout() {
    return (
        <aside className="zone-aside" data-column="right">
            <div className="tip-callout">
                <div className="tip-callout__icon" aria-hidden="true">
                    <ShieldCheckIcon size={18} strokeWidth={2} />
                </div>

                <p className="tip-callout__title">
                    Know something? <span>Send us the info!</span>
                </p>

                <p className="tip-callout__text">
                    Do you have any credible information or evidence that can help us
                    investigate an issue of public interest?
                </p>

                <p className="tip-callout__note">*Your identity will remain private!</p>

                <Link className="tip-callout__cta" href="/whistleblower">
                    Send a tip
                </Link>
            </div>
        </aside>
    );
}
