import Link from 'next/link';
import { ShieldCheckIcon } from 'lucide-react';

/**
 * Emplacement latéral de la home (colonne droite de .zone-actu). Structure
 * calquée sur le DFP/GAM natif du thème
 * (aside.zone-aside[data-column=right] > .dfpcontainer > #pave_haut) : réutilise
 * la colonne 300px @min-width:1000px ([data-columns="2"] > [data-column=right])
 * définie dans base.css. #pave_haut doit rester non-vide pour que les styles
 * hérités s'appliquent (:not(:empty)).
 *
 * Contenu actuel : appel à témoignage (whistleblower) plutôt qu'une vraie pub —
 * même emplacement, prêt à accueillir le tag GAM le jour venu.
 * Sticky + animation : voir ads.css.
 */
export default function GoogleAdSlot() {
    return (
        <aside className="zone-aside" data-column="right">
            <div className="dfpcontainer">
                <div id="pave_haut" className="dfp-slot" data-format="pave_haut">
                    <div className="tip-spot">
                        <div className="tip-spot__pulse" aria-hidden="true">
                            <ShieldCheckIcon size={18} strokeWidth={2} />
                        </div>

                        <p className="tip-spot__title">Know something? <span>Send us the info!</span></p>

                        <p className="tip-spot__text">
                            Do you have any credible information or evidence that can help us
                            investigate an issue of public interest?
                        </p>

                        <p className="tip-spot__note">*Your identity will remain private!</p>

                        <Link className="tip-spot__cta" href="/whistleblower">
                            Send a tip
                        </Link>
                    </div>
                </div>
            </div>
        </aside>
    );
}
