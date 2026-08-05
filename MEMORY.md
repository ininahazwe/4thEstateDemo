# Mémoire projet — 4thestate

## 2026-08-05 — Page /archives (année → mois → liste)

Fichiers créés :

- `app/services/wpApi.archives.ts` — autonome (pas d'import croisé wpApi.ts, même
  convention que `wpApi.search.ts`).
  - `getArchiveYears()` : année du post le plus ancien (`orderby=date&order=asc&per_page=1`)
    → plage jusqu'à l'année courante, ordre décroissant. `revalidate: 86400`.
  - `getMonthArchive({year, month, page})` : `after`/`before` bornés hors mois
    (dernière seconde du mois précédent / 1er du mois suivant à 00:00:00) car les
    bornes WP sont strictes. `per_page = ARCHIVE_PER_PAGE = 50`, `orderby=date&order=desc`,
    pagination via `X-WP-Total` / `X-WP-TotalPages`. 400 = page hors limite → liste vide.
- `app/components/Archives/Types.ts` — `ArchiveItem`, `ArchivePagination`,
  `ArchiveMonthData`, `MONTH_NAMES`.
- `app/components/Archives/ArchiveYearGrid.tsx` — client component. Rectangles par
  année, clic → modal des 12 mois (pas d'appel réseau, choix validé : « 12 mois bruts,
  sans compteur »). Escape + clic overlay ferment, focus rendu au bouton déclencheur,
  `body.overflow` bloqué à l'ouverture.
- `app/components/Archives/ArchiveList.tsx` — liste `date | titre`, `<time dateTime>`.
- `app/components/Archives/Pagination.tsx` — copie du markup de `Search/Pagination`
  (`section.site-pagination`), URL `/archives/[year]/[month]?page=N`.
- `app/(routes)/archives/page.tsx` — statique, `revalidate = 86400`.
- `app/(routes)/archives/[year]/[month]/page.tsx` — `params`/`searchParams` en Promise
  (Next 16), `parseParams` valide 4 chiffres + mois 1-12 + année ≤ courante+1 sinon
  `notFound()`. `revalidate = 3600`.
- `app/styles/archives.css` + import ajouté dans `app/layout.tsx` après `search.css`.

Points d'attention :

- Pas de conflit avec la route racine `(routes)/[year]/[month]/[slug]` : le segment
  statique `archives` a priorité sur `[year]`.
- Aucun lien vers /archives ajouté dans `navigationData.ts` / `footerData.ts`.
- Vérifs passées : `npx tsc --noEmit` OK, `npx eslint` sur les nouveaux fichiers OK.
  Pas de test runtime contre l'API WP (fetch réseau indisponible dans la session).
