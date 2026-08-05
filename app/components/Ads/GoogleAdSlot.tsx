/**
 * Emplacement pub Google (démo). Structure calquée sur le DFP/GAM natif du
 * thème (aside.zone-aside[data-column=right] > .dfpcontainer > #pave_haut) :
 * réutilise les CSS déjà présents dans base.css/home-critical.css pour
 * l'outline + le label "Publicité" ainsi que la colonne 300px @min-width:1000px
 * ([data-columns="2"] > [data-column=right]). #pave_haut doit rester non-vide
 * pour que ces styles s'appliquent (:not(:empty)) — le rectangle gris en est
 * le contenu, à remplacer par le tag GAM réel le jour venu.
 */
export default function GoogleAdSlot() {
    return (
        <aside className="zone-aside" data-column="right">
            <div className="dfpcontainer">
                <div id="pave_haut" className="dfp-slot" data-format="pave_haut" data-sticky="">
                    <div className="google-ad-slot">
                        <span className="google-ad-slot__label">Google Ad</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
