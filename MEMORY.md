# Mémoire projet — 4thestate

## 2026-08-11 — Hero branché sur l'onglet SPOTLIGHT du plugin Composition

Contexte : plugin WP `CapEDx Composition` v3.4 (dossier `Weave`, un seul fichier
`composition.php`) — UI admin à 5 onglets (spotlight, general-news,
anti-corruption, human-rights, our-impact) où l'édito choisit 5 articles et leur
ordre par `<select>`.

Reverse-engineering du stockage (onglet spotlight, `cp_make_spotlight()`) :

1. retire la catégorie `spotlight` + le tag `cp_spotlight` de TOUS les anciens
   posts spotlight ;
2. sur les 5 sélectionnés : pose catégorie `spotlight`, tag `cp_spotlight`, et
   écrit l'ordre en post meta **`cp_order_home`**.
3. **Sens de l'ordre** : `array_reverse()` avant la boucle `$i++` → la 1re
   position de l'UI admin reçoit la valeur `cp_order_home` la PLUS HAUTE.
   Ordre d'affichage = `cp_order_home` **DESC** (cohérent avec le
   `orderby=meta_value_num` DESC utilisé par le plugin côté admin).
   Les autres onglets utilisent la meta `cp_order` (pas `cp_order_home`).

Blocage API identifié : l'API REST WP ne sait pas trier sur un meta arbitraire
(`orderby` = enum fermé) et `cp_order_home` n'est pas `show_in_rest` → absente
de la réponse. Un ajout PHP est donc obligatoire. Choix retenu : `register_post_meta`
(léger) plutôt qu'un endpoint REST dédié, tri fait côté TS sur 5 posts.

Fichiers :

- **`tfe-composition-rest.php`** (NOUVEAU, à déposer dans
  `wp-content/mu-plugins/` côté WP — mu-plugin séparé pour survivre à une mise à
  jour du plugin CapEDx). `register_post_meta('post', …)` sur `cp_order_home`
  ET `cp_order` (la seconde déclarée d'avance, coût nul, évite un 2e déploiement
  quand les 4 autres zones passeront à l'ordre édito). `auth_callback => false`
  = lecture publique, écriture REST interdite (l'écriture reste le monopole de
  l'UI du plugin).
- `app/services/wpApi.spotlight.ts` (NOUVEAU) — autonome (pas d'import croisé
  `wpApi.ts`, convention `wpApi.archives.ts`). `getSpotlightArticles(limit=3)` :
  résout le term id de `spotlight` dynamiquement (pas d'ID en dur, cache 1h),
  fetch `?categories=<id>&per_page=10&_fields=id,slug,date,title,featured_media,meta`,
  tri `cp_order_home` DESC + départage date desc, `slice(limit)`, puis médias en
  1 requête `?include=`. Type de retour `SpotlightArticle` (volontairement plus
  étroit que `ArticleData` : pas de section/model/type/index à inventer).
  Helpers dupliqués localement : `buildHref`, `cleanHtmlTitle`, `pickImageUrl`,
  `BLUR_PLACEHOLDER`. Priorité de tailles image `large` d'abord (cartes ~1/3
  d'écran) et non `medium_large` comme le contexte 'card' de `wpApi.ts`.
- `app/components/Hero/Hero.tsx` (MODIFIÉ) — `getFourthEstateArticles().zone1
  .slice(0,3)` remplacé par `getSpotlightArticles(3)`. Markup inchangé.
  Supprimé au passage `formatPublished()` + la variable `publishedLabel` :
  code mort (calculée, jamais rendue dans le JSX).

Points d'attention :

- **Dégradation silencieuse** si le mu-plugin n'est pas déployé : `meta` absente
  → `readOrder()` renvoie 0 partout → le tri devient un no-op et le Hero affiche
  quand même 3 articles de la catégorie spotlight, mais dans l'ordre WP par
  défaut (date desc). Pas de crash, mais ordre édito ignoré. Vérif :
  `GET /wp-json/wp/v2/posts?categories=<id>&_fields=id,title,meta` doit exposer
  `meta.cp_order_home`.
- `cp_order_home` n'est JAMAIS supprimée quand un post quitte le spotlight (le
  plugin retire seulement catégorie + tag) → filtrer par la catégorie
  `spotlight` est obligatoire, la meta seule renverrait des posts périmés.
- `default => 0` dans `register_post_meta` rend indistinguables « meta absente »
  et « position 5 » — sans effet ici, les deux finissent en fin de tri.
- Les 4 autres onglets (`cp_order`) restent non branchés : Corruptionzone,
  HumanRightZone, ImpactZone, GeneralNewsZone ignorent toujours l'ordre choisi
  en admin et trient par date desc. Choix assumé (périmètre limité au Hero).
- Vérifs : `npx tsc --noEmit` OK (sur la machine de Yv), `php -l` OK sur le
  mu-plugin. **eslint non exécuté** : >120 s sur la machine, au-delà du cap de
  45 s par commande du pont device (chaque appel est un sandbox PID isolé, les
  process en arrière-plan sont tués). Pas de test réseau contre l'API WP.
- Un fichier vide `.lint-out.txt` (résidu de tentative eslint) a été déplacé
  dans `_to_delete/` à la racine du projet — à supprimer à la main, le pont
  device n'a pas le droit de `rm`.

## 2026-08-11 — Page /subscription (contenu WP page id 21955)

Fichiers modifiés/créés :

- `app/services/wpApi.page.ts` — ajout de `getWpPageById(id)`, variante de
  `getWpPage(slug)` mais fetch direct sur `${WP_BASE}/pages/{id}` (endpoint
  singulier, pas de filtre `slug`/`status` en query). Même contrat de retour
  (`WpPage`), même `revalidate: 3600` que `getWpPage`.
- `app/(routes)/subscription/page.tsx` — copie conforme du patron
  `about-us`/`privacy` (Header, SiteBannerV2, section unique `data-section
  ="subscription"`, `article-text` avec `dangerouslySetInnerHTML`),
  `PAGE_ID = 21955` au lieu d'un slug. `<SubscriptionBanner />` inclus avant
  `<SiteFooter />` (même emplacement que sur about-us/privacy).
- Ancienne page `app/(routes)/abonnements/page.tsx` (stub statique, texte en
  dur) laissée intacte — non demandée, doublon potentiel à trancher plus tard
  (garder les deux routes ? rediriger /abonnements → /subscription ?).

Points d'attention :

- Pas de test réseau possible dans la session (pas d'accès à l'API WP en
  live) — vérifier en local que la page WP id 21955 est bien `status:
  publish` (sinon `getWpPageById` renvoie `null` → `notFound()`).
- Aucun lien de nav ajouté vers /subscription (navigationData.ts /
  footerData.ts non touchés) — à faire si la page doit être accessible
  depuis le menu.

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
