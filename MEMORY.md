# Mémoire projet — 4thestate

## 2026-08-13 — Cover en position:fixed (mécanique BBC) — VÉRIFIÉ

Abandon définitif de l'approche sticky + piste par padding. Le cover reproduit
maintenant `.section.section-text-over-media.viewport-height` de la BBC.

**Structure :**

- `.am-cover-media` : `position: relative`, `height: var(--am-cover-height)`
  (100vh), `z-index: 0`. Bloc en FLUX qui ne fait que réserver la piste de
  scroll — équivalent de la `.section.viewport-height` BBC. Son `z-index: 0` +
  position:relative en fait un contexte d'empilement, donc tout le sous-arbre
  compte comme un seul plan z-0 face à ses frères.
- `.am-cover-media img` ET `.am-cover-overlay` : `position: fixed; top:0;
  left:0; width:100vw; height:100vh`. **Les deux** doivent être fixed, sinon le
  voile se décale de l'image au scroll.
- `position: relative` sur le parent ne fait PAS de lui le bloc conteneur des
  enfants fixed : ils restent calés sur la fenêtre. (Il faudrait un transform /
  filter / contain pour ça.)

**Pourquoi fixed et pas sticky** : un élément sticky reste dans le flux et
arrive donc par le bas de l'écran avant de s'épingler — pendant cette entrée
l'image SE DÉPLACE. Le seul moyen de l'éviter en sticky était la marge négative,
qui imposait une bande de blanc vide. `fixed` supprime le problème à la racine :
plus aucun padding sur `.container-background` (retour à 48px), plus de bande
blanche.

**Le hero a dû cesser d'être sticky** (`position: relative`, z-index 1).
Nécessité, pas esthétique : l'image de cover en fixed est peinte en permanence
sur toute la fenêtre. Pour qu'elle ne masque pas le hero au chargement, le hero
doit passer devant (z 1 > 0) ; mais sticky, il ne quitte jamais l'écran et
masquerait alors le cover pendant tout le reste de l'article (constaté). Un
z-index fixe ne peut pas être au-dessus puis en dessous. La BBC fait pareil :
sa section-titre est en position:absolute et défile.

**Empilement final** : cover fixed z-0 < hero z-1 < plaques `.container-background`
z-2. `.am-cover-text-flow` z-1, frère du cover → texte au-dessus de l'image.

**Mesuré aux 5 étapes** (fenêtre 772px) — `imgFixe` = [0,772] PARTOUT, l'image
ne bouge jamais :

| scrollY | état | fenêtre visible de l'image |
|---|---|---|
| 0 | haut de page, hero devant | 0px |
| 1250 | plaque0 remonte | 444px |
| 2000 | image seule | 772px (plein écran) |
| 3200 | plaque1 voile | 154px |
| 4200 | masquée | 0px |

**LIMITE CONNUE — plusieurs covers dans un même article.** Toutes les images
fixed sont peintes en permanence et partagent le z-index 0 : la dernière du DOM
passe donc devant les précédentes. Un article à 2 covers ou plus afficherait la
mauvaise image. C'est précisément pour ça que la BBC ajoute du JS. Correctif
possible : un IntersectionObserver qui bascule `visibility: hidden` sur un cover
dont la boîte en flux est hors écran (~20 lignes, même principe que
ArticleMediaVideoWrap). NON IMPLÉMENTÉ — le post de test n'a qu'un cover.

## 2026-08-13 — Analyse de la référence BBC + hauteurs hero/cover

Page de référence de Yv : bbc.co.uk/news/resources/idt-sh/sex_and_the_sugar_daddy
(le texte de son post de test en est repris). Inspectée dans le navigateur.

**Mécanique BBC — deux traitements distincts :**

- Section titre (première image) : `<picture>` en **`position: absolute`** dans
  une section de 100vh → elle défile normalement. **Aucun parallax sur le hero.**
- Parallax internes : `<picture>` en **`position: fixed`**, `top: 0`, hauteur
  pleine fenêtre, `z-index: 3`, dans une section de 100vh SANS fond opaque.
  Vérifié au scroll : la picture reste `fixed` et `top: 0` en permanence, même
  hors de sa section (mesuré à ±800px). Ce sont les sections de texte, opaques,
  qui glissent par-dessus.

Conclusion : le « parallax » n'en est pas un — rien ne se déplace à vitesse
différente, il y a une image immobile et du texte qui passe devant. C'est
exactement notre principe. La BBC utilise `fixed` + du JS pour gérer les
entrées/sorties parce que la page précède la fiabilité de `position: sticky` ;
notre `sticky` obtient le même résultat sans JS. **Rien à réarchitecturer.**

**Hauteurs posées (demande de Yv) :**

- `--am-hero-height: 90vh` (nouvelle variable, remplace le `height: 80vh` en
  dur). Pas 100vh : le hero est épinglé SOUS le header
  (`top: var(--headerHeight)`, mesuré à 84px), donc 90vh + header remplit déjà
  l'écran — à 100vh le bas serait coupé. Mesuré : 851px = 90.0vh, bas à 935px
  pour 945px de fenêtre. ✓
- `--am-cover-height: 100vh` — déjà en place. Mesuré : 945px = 100.0vh. ✓

Écart assumé avec la BBC : notre hero est `sticky` et non `absolute`, donc la
première plaque blanche vient le recouvrir en remontant, comme pour les covers.
Plus cohérent avec la suite de l'article.

## 2026-08-13 — Galerie survolable + cover en image de fond (VÉRIFIÉ AU NAVIGATEUR)

Première session avec l'extension Claude dans Chrome. Tout ce qui suit est
mesuré sur `http://localhost:3000/2026/08/story` (post 24175, viewport
1920×889), pas déduit.

### Galerie — vignettes carrées, format original au survol

`.am-gallery` : hauteur de rangée `--am-gallery-h: min(34vh, 320px)`, vignettes
carrées (width = height), `--am-gallery-shrink: 0.5` pour le retrait des
voisines.

- Survol : `.am-gallery-item:hover { width: auto }` + img `width: auto` →
  la largeur est dictée par l'image (hauteur imposée, largeur libre), donc
  **aucun besoin de connaître le ratio en CSS**. Mesuré : 558×302, ratio
  affiché 1.845 = ratio naturel 1.845 (1024×555). ✓
- Voisines : `.am-gallery:has(.am-gallery-item:hover) .am-gallery-item:not(:hover)`
  → 151×302 mesuré. `:has()` et non `.am-gallery:hover …`, sinon survoler
  l'espace ENTRE deux vignettes resserrerait tout sans rien élargir.
- `flex: 0 0 auto` obligatoire : avec flex-grow, la place libérée serait
  réattribuée et annulerait l'effet.

**Deux pièges rencontrés, à ne pas réintroduire :**

1. `flex-wrap: nowrap` déborde horizontalement dès plus de 4 images. Repassé en
   `wrap` — sans risque de saut de ligne au survol, car la rangée RÉTRÉCIT
   (une vignette +170px, chacune des autres −150px).
2. En `flex-wrap: wrap`, l'image doit avoir une **hauteur explicite**
   (`height: var(--am-gallery-h)`) et non `height: 100%`. Le navigateur calcule
   la largeur intrinsèque des items pour décider des retours à la ligne, et à
   ce moment-là `100%` n'est pas résoluble : la largeur `auto` du survol tombait
   à **0** et la vignette disparaissait (mesuré `0x302`).

Note : `--am-cols`, posé inline par le composant, n'est plus utilisé par la CSS.

**Correctif après relecture du HTML réel** — les `<figure>` de galerie peuvent
porter un `<figcaption class="am-figcaption">`. La première version fixait
`height: var(--am-gallery-h)` + `overflow: hidden` sur la figure, ce qui
rognait totalement les légendes (mesuré : légende à 310px dans une figure de
302px). Corrigé : la figure n'a plus ni hauteur fixe ni overflow — c'est
l'IMAGE qui porte le carré (`height` + `object-fit: cover`, le recadrage
n'a pas besoin d'overflow). Figures mesurées après correction : 302×302 sans
légende, 302×326 avec. Légende forcée sur une ligne
(`white-space: nowrap` + ellipsis) : sinon elle se ré-enroule quand la vignette
se resserre au survol, ce qui fait varier la hauteur et sauter la rangée.

### Cover — image de fond épinglée, révélée puis voilée

Séquence demandée par Yv, obtenue et mesurée. Positions en coordonnées
document : hero [85,796], plaque0 [796,3055] (1371 de contenu + 889 de piste),
cover [2166,3055], texte [3500,4211], plaque1 [4211,7686].

- `--am-cover-height: 100vh`, `top: 0` (et non `--headerHeight` : c'est une
  image de FOND, elle passe sous le header, sinon 100vh + header déborde),
  `min-height: 100vh`.
- Piste de révélation réintroduite sur `.container-background:has(+ .am-cover-media)`
  (padding-bottom + margin-bottom négatif, somme nulle). Mesuré : le cover
  finit exactement là où la plaque finit (3055), donc à scrollY 2166 la plaque
  couvre pile tout l'écran, puis son bord inférieur découvre l'image du bas
  vers le haut. Capture d'écran à scrollY 2600 : bord de plaque à 455px,
  conforme au calcul. ✓
- **La correction qui a débloqué l'affaire** : `.am-cover-text-flow` passe de
  `margin-top: -70vh` à `margin-top: var(--am-cover-text-gap)` (+50vh). C'est
  le -70vh qui faisait remonter le texte DANS la piste, où la plaque le
  peignait en blanc — cause des deux échecs précédents. Le texte arrive
  maintenant 445px après la fin de la piste. Vérifié : « THE STUDENT » en blanc
  sur l'image épinglée à scrollY 3560, puis plaque1 qui monte la voiler. ✓
- Ne JAMAIS remettre un margin-top négatif sur `.am-cover-text-flow` sans
  revoir la règle `:has()` — c'est noté dans le CSS.

**Correctif : `--am-cover-reveal` ramenée de 100vh à 25vh.** Yv a relevé le
padding-bottom énorme sur la première plaque. Il est intentionnel (c'est la
piste), mais la conséquence que j'avais manquée : **la piste EST une bande de
blanc vide**, puisque la plaque doit recouvrir l'image pour la découvrir alors
que son contenu est déjà terminé. À 100vh, mesuré à scrollY 1639 :
`ecranEntierementBlanc: true` — un écran entier vide à traverser. À 25vh :
bande de 237px, image visible sur 708px, plus d'écran vide (vérifié en capture).

Règle à retenir : **`--am-cover-reveal` = hauteur exacte de la bande blanche
vide**. La garder bien en dessous de 100vh. `0` désactive proprement la
révélation (la règle `:has()` devient inopérante, l'image remonte par le bas
avant de s'épingler).

### Notes d'outillage navigateur

- `html { scroll-behavior: smooth }` (défini dans ce fichier CSS) fausse toute
  mesure après `scrollTo` : la mesure a lieu pendant l'animation. Forcer
  `document.documentElement.style.scrollBehavior='auto'` et
  `scrollTo({behavior:'instant'})` avant de mesurer.
- Le lazy-loading des images décale la mise en page entre deux appels et fait
  rater les coordonnées de survol. Forcer `img.loading='eager'` + attendre
  `decode()` avant de viser.
- Les coordonnées de `computer` sont dans l'espace de la capture (1568px de
  large ici), pas du viewport (1920px) : facteur 0.8167.
- `Page.captureScreenshot` a timeout plusieurs fois en batch ; l'appel isolé
  après une pause passe.


## 2026-08-13 — Typo du corps storytelling + retrait de la piste de révélation

### Typo : la source de vérité est article-layout.css, pas article-critical.css

Trois itérations ratées avant de trouver. Les valeurs réellement appliquées au
corps d'un article standard viennent de **`article-layout.css`**, importée
APRÈS `article-critical.css` dans layout.tsx, et qui pose un `!important` :

```css
.article .article-text { font-size: 1.25rem !important; line-height: 1.875rem; }
.article .article-text { font-family: var(--serifGeorgia), serif; }
```

- `--serifGeorgia: Georgia,"Times New Roman",Times,serif` (base.css:84)
- `--sans: "Fira Sans"…` (base.css:82) — c'est ce dont `.am-body` héritait,
  faute de déclaration de famille.

Erreurs commises, à ne pas refaire :

1. m'être arrêté à `article-critical.css` (`font-size: 1.125rem`,
   `line-height: 1.6`) sans vérifier les feuilles importées après ;
2. avoir cru que `wp-block-paragraph` portait la typo — sa seule déclaration
   dans custom.css est `margin-top: 1rem`, absorbé de toute façon par la
   fusion des marges verticales entre paragraphes adjacents. La classe est
   conservée pour la parité de balisage, elle ne joue aucun rôle de rendu ;
3. avoir mis `.am-body` à 1.125rem alors que sa valeur d'origine, 1.25rem,
   était DÉJÀ la bonne (= 20px). Seuls manquaient `font-family` et le
   `line-height` (1.875rem = 30px, pas 1.6 = 32px).

État final de `.am-body` et `.am-list` : `var(--serifGeorgia)`, 1.25rem,
1.875rem. Conservé de l'itération précédente (correct, aligné sur
`.article .article-text`) : `p { margin: 0 }` + `p + p { margin-top: 1rem }`,
et les règles `em` / `strong` / `p a` (pointillé + survol `--sitePrimary`).

Non touché volontairement : `.am-heading`, `.am-quote`, `.am-cover-text`,
`.am-title` gardent la police sans-serif. La ligne
`/*font-family: var(--serifGeorgia)*/` commentée sur `.article-media` reste
commentée — l'appliquer là changerait titres, citations et textes de cover.

### Retrait de `.container-background:has(+ .am-cover-media)`

La piste de révélation (padding-bottom sur la plaque + margin-bottom négatif)
**recouvrait le texte de cover**. Cause structurelle, pas un réglage :
`.am-cover-text-flow` remonte de -70vh dans le cover, il tombe donc
nécessairement dans la bande de padding, peinte en blanc et en z-index 2
au-dessus du texte (z-index 1). Toute bande ≥ 70vh produit le même
recouvrement, et faire passer le texte au-dessus de la plaque ne réglerait
rien : blanc sur blanc avant révélation.

Règle et variable `--am-cover-reveal` supprimées. `.am-cover-media` revient à
son comportement d'origine (sticky dès qu'il atteint le header). L'effet
« révélé par la plaque précédente » demanderait de revoir la structure : piste
de scroll dédiée à l'image, texte de cover sorti du flux du cover. Non fait.


## 2026-08-13 — RÉSOLU : le champ REST `blocks` vidait les posts storytelling

### Symptôme et reproduction (par Yv)

1. post classique avec des blocs → enregistre, rafraîchit, blocs présents ✓
2. coche `is_storytelling` → le front prend bien la forme storytelling ✓
3. rafraîchit / réouvre l'éditeur → **les blocs et leurs contenus ont disparu**
4. tout enregistrement depuis cet état écrit `post_content = ''` → perte sèche

Constaté sur le post **24175** (slug `story`) : `acf.is_storytelling: true`,
`status: publish`, mais `blocks: []` ET `content.rendered` à **0 caractère**.
Deux signaux indépendants (l'un filtré par `the_content`, l'autre issu de
`parse_blocks` sur le contenu brut) → `post_content` réellement vide en base.

Le front n'était PAS en cause : la bascule se fait sur `article.isStorytelling`
seul, donc `ArticleMediaLayout` était bien monté — mais avec zéro bloc, d'où le
hero + la plaque auteur/outils et rien d'autre. « Il ne prend pas la forme »
était en fait « la forme est vide ».

### Cause

`register_rest_field('post', 'blocks', …)` dans le `functions.php` du thème
Foxiz calculait le champ à **chaque** lecture REST d'un post, y compris
`context=edit` — la requête dont l'éditeur de blocs dépend pour charger le
post. Isolation confirmée par Yv : en supprimant ce bloc, les blocs
réapparaissent immédiatement dans l'éditeur.

Défauts relevés dans le code d'origine :

- aucune garde sur `context` → calculé en édition, alors que l'éditeur lit
  `content.raw` et n'a aucun besoin de ce champ ;
- aucun `schema` → champ non déclaré, donc non filtrable par contexte ;
- pas de `function_exists('get_field')` → si ACF est désactivé, fatal
  « Call to undefined function » qui casse TOUTE réponse REST de posts ;
- fonction globale nommée `clean_block()` → nom assez générique pour entrer en
  collision avec un plugin (fatal « Cannot redeclare ») ;
- pas de garde sur `$post['id']`, ni de limite de récursion ;
- `innerHTML` conservé à chaque niveau d'imbrication → la charge duplique le
  contenu de l'article plusieurs fois dans la réponse d'édition, qui porte déjà
  `content.raw` + `content.rendered` + `excerpt.*`.

**Piège documenté** : `'context' => ['view']` dans le schéma ne suffit pas.
WordPress exécute le `get_callback` d'abord et ne filtre par contexte qu'au
moment de sérialiser. C'est le `return null` explicite en tête de callback qui
corrige ; le schéma n'est qu'une ceinture-bretelles.

### Correctif livré

**`tfe-storytelling.php`** (NOUVEAU mu-plugin, `wp-content/mu-plugins/`) —
reprend le champ REST ET le field group ACF `group_storytelling_template`
(mêmes `key`/`name`, donc les valeurs déjà saisies sont conservées).

- garde `context === 'edit'` → `return null` ;
- `schema` complet avec `'context' => ['view']`, `readonly` ;
- `update_callback => null` explicite ;
- gardes ACF / `$post['id']` / contenu vide (renvoie `[]` et non `null`) ;
- helper renommé `tfe_storytelling_clean_block()` + limite de profondeur
  `TFE_STORYTELLING_MAX_DEPTH = 10` ;
- field group accroché à `acf/init` et non au chargement du fichier : un
  mu-plugin se charge AVANT les plugins, donc avant ACF —
  `acf_add_local_field_group()` n'existe pas encore à ce moment-là.
- Forme de sortie vérifiée identique à l'interface `WpBlock` du front
  (`blockName`, `attrs`, `innerHTML`, `innerBlocks`), avec casts garantissant
  les types. `php -l` OK.

**Sortie du functions.php assumée** : Foxiz est un thème commercial mis à jour,
tout code dans son `functions.php` disparaît à la première mise à jour. Yv doit
**supprimer les trois blocs d'origine** (le `rest_api_init`, `clean_block()`, le
`acf_add_local_field_group`) — le thème se charge APRÈS les mu-plugins, sa
version écraserait sinon celle du mu-plugin et le bug reviendrait, plus un
fatal « Cannot redeclare » sur `clean_block`.

`wpApi.article.ts` : commentaire de `WpBlock` mis à jour (pointait vers
functions.php). `tsc --noEmit` OK.

### Garde-fou côté Next (implémenté)

`app/(routes)/[year]/[month]/[slug]/page.tsx` : la bascule ne se fait plus sur
`article.isStorytelling` seul.

```ts
const mediaBlocks = article.blocks ? mapWpBlocksToMediaBlocks(article.blocks) : [];
const useStorytelling = article.isStorytelling && mediaBlocks.length > 0;
```

- Le test porte sur les blocs **MAPPÉS**, pas les blocs bruts : un post peut
  avoir des blocs que `blockMapper` ne gère pas et qui donneraient quand même
  une page vide.
- Le mapping est calculé UNE fois et réutilisé au rendu (avant, il tournait
  dans le JSX).
- `useStorytelling` remplace `article.isStorytelling` aux trois endroits du
  rendu : masquage de `SiteBannerV2`, `data-template="media"` (qui pilote
  `#site-main[data-template="media"] { padding: 0 !important }`), et le choix
  du composant. Les trois doivent rester cohérents — un repli qui garderait
  `data-template="media"` donnerait un article standard sans padding.
- `console.warn` quand la case est cochée mais qu'il n'y a aucun bloc
  exploitable : le repli reste visible dans les logs plutôt que silencieux.

`tsc --noEmit` OK.

### Reste à faire

- Récupérer le contenu de 24175 via les révisions WP (requête SQL fournie :
  `SELECT ID, post_date, LENGTH(post_content) FROM <prefix>posts WHERE
  post_parent = 24175 AND post_type = 'revision'`).
- Déployer `tfe-storytelling.php` et retirer les 3 blocs du functions.php.

## 2026-08-11 — Storytelling : correctif hauteur cover + paragraphes assainis

### Correctif — la fenêtre de révélation du cover s'était effondrée

Régression introduite par la version précédente : `margin-top: -90vh` sur
`.am-cover-media` pré-épinglait bien l'image, mais **retirait aussi 90vh à la
hauteur du document** — or c'était exactement le budget de scroll pendant
lequel l'image restait visible. La section suivante remontait donc la
recouvrir presque immédiatement (fenêtre réduite à ~10vh).

Nouvelle approche, à somme nulle : la compensation se fait **dans la plaque
précédente**, plus dans le cover.

```css
.container-background:has(+ .am-cover-media) {
    padding-bottom: calc(var(--am-plate-padding) + var(--am-cover-reveal));
    margin-bottom:  calc(-1 * var(--am-cover-reveal));
}
```

- La plaque gagne une bande de fond blanc en bas (padding), le cover est
  remonté d'autant (le margin négatif fusionne avec le margin-top nul du
  cover). **Padding + margin = 0 → hauteur du document et position de tout ce
  qui suit strictement inchangées.**
- Le cover est déjà épinglé pendant toute la bande, masqué derrière elle
  (plaque z-index 2, cover z-index 0) ; le bord inférieur de la plaque le
  découvre en remontant.
- `.am-cover-media` ne porte plus AUCUN décalage → le `-70vh` de
  `.am-cover-text-flow` garde son calibrage d'origine.
- Variables déplacées sur `.article-media` : `--am-cover-height`,
  `--am-cover-reveal`, `--am-plate-padding`.

### Paragraphes assainis (choix de Yv : nettoyer le HTML, pas la CSS)

`blockMapper.ts`, cas `core/paragraph` : nouvelle fonction
`sanitizeInlineHtml()`.

- Ne conserve que les balises SÉMANTIQUES : `a, strong, b, em, i, br, sup,
  sub`. Tout le reste (`span`, `font`, `mark`, `u`, `small`…) est dépouillé —
  la balise disparaît, le texte reste. Aucun attribut conservé sauf `href`.
- Motif : l'éditeur WP laisse passer `<span style="color:…">`, des tailles de
  police en dur, des classes `has-*`. Sur un template dont la typo est imposée
  par le design, ça casse l'uniformité. (Les attributs du `<p>` lui-même
  étaient déjà écartés : le regex ne capture que l'intérieur de la balise.)
- **`decode()` retiré du chemin paragraphe** : la chaîne part en
  `dangerouslySetInnerHTML`, les entités doivent RESTER des entités. La
  décoder d'abord transformait un `&lt;script&gt;` saisi dans l'éditeur en
  vraie balise à l'affichage. Le test de vacuité se fait maintenant sur
  `stripTags(inner)`, ce qui écarte aussi `<p>&nbsp;</p>` et `<p><span></span></p>`.
- `href` non ré-échappé (valeur déjà encodée dans le HTML source, la
  ré-échapper donnerait `&amp;amp;`). Schémas hors
  `http(s)/mailto/tel//#` → `<a>` nu, pour ne pas laisser de `</a>` orphelin.
- Regex et non DOMParser : le mapper tourne côté serveur, pas de DOM. Noté
  dans le code que ce n'est PAS une frontière de sécurité (entrée = HTML
  produit par WP depuis la saisie rédaction).
- Vérifié par un script Node sur 13 cas (span coloré, font-size inline, mark,
  `<u>`, lien externe avec `&amp;` en query, lien interne, `javascript:`,
  entités, `&lt;script&gt;`, `<br>`, `<sup>`, imbrication, `<a>` sans href) :
  aucun résidu de mise en forme, entités préservées, `javascript:` neutralisé.
- Portée : uniquement le bloc `body`. `mediaText` passe déjà par `stripTags`.

Toujours pas de vérification visuelle possible (aucun Chrome connecté).
`tsc --noEmit` OK.

## 2026-08-11 — Storytelling : fond noir sur la vidéo + cover sticky permanent

### 1. `.container-background` passe en noir quand la vidéo est à l'écran

- `app/components/Article/ArticleMediaVideoWrap.tsx` (NOUVEAU, client) —
  remplace le `<div className="am-video-wrap">` du composant serveur. Même
  markup, plus un IntersectionObserver qui pose/retire
  `container-background--dark` sur `el.closest('.container-background')`.
  - `rootMargin: '-25% 0px -25% 0px'` → bascule quand la vidéo entre dans la
    bande centrale du viewport, pas dès qu'un pixel dépasse en bas.
  - **Compteur en `WeakMap<Element, number>`** : indispensable si une même
    plaque contient DEUX vidéos, sinon la sortie d'écran de la première
    retirerait la classe alors que la seconde est encore visible. Décrément
    aussi au démontage (navigation client), sinon le compteur reste bloqué.
  - IntersectionObserver et non listener `scroll` : le calcul se fait hors du
    thread principal, pas de handler à chaque pixel.
- Appliqué aux DEUX cas qui utilisent `am-video-wrap` : `video` (fichier) et
  `embed` non-Spotify (iframe YouTube/Vimeo). Yv ne mentionnait que l'iframe,
  mais même wrapper et même intention visuelle.
- CSS : `.container-background--dark` (fond #000) + `transition` 0.45s,
  neutralisée sous `prefers-reduced-motion`.
- **Inversion du texte obligatoire, pas cosmétique** : sans elle le corps
  reste en `--siteText` (quasi noir) et devient illisible. Règles ajoutées sur
  `.am-heading`, `.am-body`, `.am-list`, `.am-quote` (+ `border-left-color`),
  `.am-figcaption`, `.default-authors`, `.author-link`, liens du corps. Les
  icônes des outils sont en `currentColor`, elles suivent seules.

### 2. `.am-cover-media` sticky en permanence (révélé par la plaque précédente)

Avant : l'image montait depuis le bas puis s'épinglait en atteignant le
header. Demande : qu'elle soit déjà en place et que la plaque blanche qui la
précède la découvre en remontant.

- Une seule ligne de fond : `margin-top: calc(-1 * var(--am-cover-height))`
  sur `.am-cover-media`, avec `--am-cover-height: 90vh` qui pilote aussi
  `height`/`max-height` (les deux DOIVENT rester égales, d'où la variable).
- Mécanique : l'image remonte de sa propre hauteur, donc derrière la plaque
  précédente (plaque z-index 2, image z-index 0). Le sticky s'active pendant
  que la plaque occupe encore l'écran ; c'est son bord inférieur qui, en
  remontant, découvre l'image du bas vers le haut.
- **Le texte de cover n'est pas affecté** : la boîte occupe toujours 90vh dans
  le flux, seul son point de départ bouge — le `margin-top: -70vh` de
  `.am-cover-text-flow` reste calibré.
- Garde-fou : `.container-background:has(+ .am-cover-media) { min-height: 90vh }`.
  Sans lui, une plaque plus courte que 90vh laisserait le cover déborder sur
  la section d'encore avant. Ciblé via `:has()` pour ne pas imposer cette
  hauteur aux plaques non concernées (section courte en fin d'article).
  `:has()` est supporté partout aujourd'hui ; à défaut la dégradation est
  simplement l'absence de garde-fou.

Points d'attention :

- **Rien n'a été vérifié visuellement** : aucun navigateur Chrome n'était
  connecté à la session (`list_connected_browsers` → []), et le conteneur
  cloud ne peut pas joindre le localhost:3000 de Yv. `tsc --noEmit` OK (exit 0)
  ne valide que le TypeScript, pas la chorégraphie de scroll. À valider par
  Yv : le seuil de bascule du fond noir, et le fait que la remontée de 90vh
  ne crée pas de chevauchement sur des articles réels.
- Le total de scroll de la page diminue de 90vh par cover (la remontée
  supprime la phase « l'image monte depuis le bas »).

## 2026-08-11 — Zone Health (duplication de HumanRights)

Catégorie WP `health` vérifiée en direct : **term id 105**, 47 articles publiés.

Fichiers créés — `app/components/Health/` :

- `Types.ts` — `HealthArticle`, identique à `HumanRightsArticle` sauf
  `section: 'health'`.
- `HealthCard.tsx` — copie de `HumanRightCard`. **Deux nettoyages** : imports
  lucide-react `Globe, Headphones, Bookmark` supprimés (aucun n'était utilisé,
  `Globe` n'apparaissait que dans du JSX commenté) et blocs JSX commentés
  (strapline, source) retirés. Rendu identique à l'original.
- `HealthZone.tsx` — copie de `HumanRightsZone`, même découpage `[1, 2, 2]`,
  lien vers `/category/health`, titre « Health ».

Fichiers modifiés :

- `app/services/wpApi.ts` — import du type, `CATEGORY_IDS.health = 105`, et
  `getHealthArticles()` calquée sur `getHumanRightArticles()`
  (préfixe d'id `health-post-`, étiquette de repli « Health »).
- `app/page.tsx` — import, ajout au `Promise.all` (9e position, l'ordre du
  tableau et celui du destructuring doivent rester alignés) et rendu de
  `<HealthZone />` juste après `<HumanRightsZone />`.

Points d'attention :

- **Aucun CSS ajouté, et c'est volontaire** : vérifié par grep, toute la mise
  en page vient de la classe `zone-tag` (31 occurrences dans le CSS). Les
  classes `zone-human-rights`, `zone-anti-corruption`, `zone-environment` et
  donc `zone-health` n'ont AUCUN style dédié — ce sont de simples points
  d'accroche. Dupliquer du CSS aurait été inutile.
- Placement sur la homepage entre Human Rights et le slider TikTok : choix par
  défaut, une ligne à déplacer dans `page.tsx` si Yv veut autre chose.
- « Health » n'a **pas** été ajouté à `navigationData.ts` (menu header) ni à
  `categoryConfig.ts` — décisions éditoriales, à faire sur demande. La page
  `/category/health` fonctionne déjà sans config (route `[slug]` générique).
- Incohérence latente repérée dans `getHumanRightArticles()` : le slug de repli
  passé à `resolveCategoryId` est `'human-right'` (singulier) alors que la
  catégorie réelle est `human-rights` (pluriel, cf. nav et lien de la zone).
  Sans effet aujourd'hui car `CATEGORY_IDS.humanRight = 121` court-circuite le
  repli — mais si cet ID devenait faux, le repli échouerait silencieusement et
  la zone afficherait les 5 derniers articles toutes catégories confondues.
- Vérif : `npx tsc --noEmit` OK (exit 0). Le typage valide au passage
  l'alignement du `Promise.all` (un décalage aurait fait échouer
  `<HealthZone articles={healthNews} />`). Pas de rendu testé en navigateur.

## 2026-08-11 — Page /contact-us (formulaire + envoi Gmail)

Mise en page calquée sur une maquette fournie par Yv (portfolio Dribbble d'une
agence UX). **Le contenu de la maquette a été écarté** : bureaux USA/Inde,
"Improve usability of your product", contact.growthux@gmail.com — rien à voir
avec TFE. Seule la structure est reprise.

Coordonnées réelles récupérées sur https://thefourthestategh.com/contact-us/ :
Aar-Bakor Street, Ogbojo, Accra, Ghana / +233 302 555327. Email public donné
par Yv : **thefourthestate@mfwa.org** (WebFetch masque les emails, il a fallu
demander).

Choix validés par Yv : colonne droite = "Other ways to reach us", champ
**Subject conservé** (comme le formulaire WP actuel), case à cocher pointant
vers **/privacy** (page existante) et non /terms (route inexistante), tout en
anglais.

Fichiers créés :

- `app/api/contact/route.ts` — **copie de la mécanique de /api/whistleblower** :
  nodemailer + `service: "gmail"` + mot de passe d'application Google,
  `runtime = "nodejs"` (SMTP impossible en Edge). Différences : corps en JSON
  (pas de pièce jointe donc pas de multipart), et name/email/subject requis
  (le contact n'est pas anonyme, contrairement à l'appel à témoignage).
  - `from` reste la boîte Gmail du site, jamais l'adresse du visiteur :
    usurper l'expéditeur casserait SPF/DKIM et enverrait tout en spam. C'est
    `replyTo` qui permet à la rédaction de répondre.
  - Consentement revalidé côté serveur (`consent !== true` → 400) : le
    verrou client ne protège pas d'une requête directe.
  - Longueurs bornées (name 200 / email 200 / subject 300 / message 10000).
  - **Honeypot** : champ `website` masqué en CSS, `tabIndex={-1}`,
    `aria-hidden`. S'il est rempli → réponse `{ok:true}` SANS envoi, pour ne
    pas indiquer au robot ce qui l'a trahi. En CSS, `position:absolute;
    left:-9999px` et surtout PAS `display:none` (des robots ignorent les
    champs en display:none).
- `app/components/Contact/ContactForm.tsx` — composant client, même machine à
  états `idle/sending/sent/error` que WhistleblowerForm, POST JSON.
- `app/(routes)/contact-us/page.tsx` — statique (`revalidate = 86400`), aucun
  fetch WP. En-tête centré + grille 2 colonnes. Colonne droite : 4 puces
  (whistleblower, proposer un sujet, don MFWA, droit de réponse), réseaux
  sociaux **réutilisés depuis `footerData.socialLinks`** (RSS filtré), bloc
  adresse Accra.
- `app/styles/contact.css` + import ajouté dans `layout.tsx` après
  `whistleblower.css`. Grille qui s'empile sous 900 px, dark mode.
  **Accent bordeaux #6d2929 du site conservé** au lieu du bouton noir de la
  maquette, pour rester cohérent avec le formulaire whistleblower.

Fichiers modifiés :

- `footerData.ts` — le lien "Contact us" pointait vers **`/contact`, route qui
  n'existe pas** (lien mort en prod). Corrigé en `/contact-us`.
- `sitemap.ts` — `/contact-us` ajouté aux routes statiques.

Points d'attention :

- **Variable d'env à ajouter : `CONTACT_TO`** (destinataire, défaut =
  `GMAIL_USER`). `.env.local` contient `GMAIL_USER=techsupport@gmail.com` et
  `WHISTLEBLOWER_TO=techsupport@gmail.com`, visiblement des valeurs de test —
  à corriger avant mise en ligne, sinon les messages partent dans le vide.
  Vérifier aussi que `GMAIL_APP_PASSWORD` est bien renseigné en prod (Vercel).
- Message non requis, comme sur le formulaire WP d'origine.
- Aucun lien ajouté dans la nav header (`navigationData.ts`) — seul le footer
  pointe vers la page.
- La page WP `/contact-us` existe toujours côté WordPress : prévoir la
  redirection au moment de la bascule du DNS.
- Vérif : `npx tsc --noEmit` OK (exit 0). Le passage de tsc valide au passage
  que `CheckCircle2 / Mail / MapPin / Phone` existent bien dans lucide-react
  v1.20. Pas de test d'envoi réel (pas d'accès SMTP depuis la session).

## 2026-08-11 — tfe-composition.php v1.1 : libellés EN + recherche par titre

- Tous les textes visibles en admin passés en **anglais** (équipe anglophone) :
  labels du CPT, entrée de menu, titre du groupe ACF, label et instructions du
  champ, titre de l'entrée unique, description du schéma REST. Le menu admin
  s'appelle désormais **"Featured Articles"** (plus "Composition") ; le slug du
  CPT et la clé d'API restent `composition` / `zones.spotlight` — inchangés,
  donc le service Next.js n'est pas impacté. Commentaires laissés en français,
  comme le reste du projet.
- **Recherche ACF restreinte aux titres.** Par défaut le champ Relationship
  délègue au `s` de WP_Query, qui balaie `post_title` + `post_excerpt` +
  `post_content` — inutilisable sur des articles d'investigation longs. ACF
  n'expose aucune option pour ça, donc deux étapes :
  1. `acf/fields/relationship/query` pose un query var maison
     `tfe_composition_title_search` (uniquement si `$args['s']` non vide, et
     uniquement sur nos champs — test sur le préfixe de clé
     `TFE_COMPOSITION_FIELD_PREFIX`) ;
  2. `posts_search` réécrit la clause SQL en `LIKE` sur `post_title` seul pour
     les requêtes marquées.
  Le marquage est indispensable : `posts_search` est un filtre **global**, il
  ne doit pas toucher la recherche du reste de l'admin ni du site. Les termes
  sont découpés sur les espaces et combinés en AND (« big push » matche « The
  Big Push initiative »). Recherche entre guillemets non gérée, inutile ici.
- Vérifié : `php -l` OK, extraction des littéraux de chaîne par `token_get_all`
  → plus aucun libellé français résiduel.
- Si l'entrée unique a déjà été créée par la v1.0, elle garde son ancien titre
  français « Composition de la page d'accueil » — à renommer à la main dans
  l'éditeur, le titre n'est utilisé nulle part ailleurs.

## 2026-08-11 — DÉCISION : remplacer Composition par un CPT + champ ACF Relationship

Yv a tranché : **option ACF Relationship**, et il est en **ACF gratuit** → pas
d'options page (`acf_add_options_page` = ACF Pro), donc repli sur un CPT
`composition` à entrée unique. Périmètre : zone `spotlight` / Hero uniquement.

Principe retenu : **une seule liste ordonnée d'IDs, à un seul endroit**, au lieu
de l'ordre éparpillé en meta sur chaque article. Les articles ne sont plus
jamais modifiés (ni catégorie, ni tag, ni `post_modified` bumpé).

Fichiers :

- **`tfe-composition.php`** (NOUVEAU, à déposer dans `wp-content/mu-plugins/`).
  Contenu :
  - CPT `composition` : `public => false` + `show_in_rest => true` (schéma
    headless standard : pas d'URL publique, mais lisible par l'API). Un post
    publié d'un CPT non public reste lisible en REST anonyme dès lors que
    `show_in_rest` est vrai — vérifié dans `WP_REST_Posts_Controller`.
  - Entrée unique : `create_posts => do_not_allow` + création paresseuse via
    `tfe_composition_get_singleton_id()` (option `tfe_composition_post_id`,
    filet de secours par `get_posts` si l'option a sauté, création réservée à
    `is_admin()`).
  - Menu admin "Composition" dont le slug EST une URL `post.php?post=<id>&action=edit`
    → WP en fait un lien direct vers l'unique entrée, pas de liste à 1 élément.
    `parent_file` filtré pour garder le surlignage.
  - Field group ACF déclaré **en code** via `acf_add_local_field_group()` sur
    `acf/init` (versionné, rien à cliquer dans l'UI ACF). Champ Relationship :
    `return_format => 'id'`, `elements => featured_image` (vignettes),
    `filters => search + taxonomy`, `max => 5`.
  - `register_rest_field('composition', 'zones')` → contrat figé
    `{ "spotlight": [id, id, …] }`, toujours un tableau d'entiers, jamais null.
    Volontairement PAS le champ `acf` natif, dont la forme varie selon la
    version d'ACF et le return_format.
  - Ajouter une zone plus tard = éditer le seul tableau `tfe_composition_zones()`
    (les 4 autres zones sont déjà écrites en commentaire) ; champ ACF, REST et
    admin suivent automatiquement.
  - Capability d'édition : `edit_others_posts` (= rôle Éditeur, pas Auteur),
    constante `TFE_COMPOSITION_CAP`.
- `app/services/wpApi.spotlight.ts` (RÉÉCRIT) — 2 requêtes :
  `/composition?per_page=1&_fields=id,zones` (revalidate 300, c'est le seul
  appel qui porte un choix édito) puis
  `/posts?include=<ids>&orderby=include` (revalidate 600).
  **`orderby=include`** est la clé : WP respecte alors l'ordre des IDs passés
  au lieu de retomber sur date desc — aucun retri côté JS.
  Signature `getSpotlightArticles(limit=3)` et interface `SpotlightArticle`
  conservées (champ `order` → `position`, 1-based). Hero.tsx : seul le
  commentaire d'en-tête change.

Points d'attention :

- **Pas de fallback** : composition vide ou injoignable → `[]` → le Hero se
  masque (`if (!articles.length) return null`). Tant que Yv n'a pas rempli le
  champ en admin, il n'y a pas de Hero sur la home. À remplir juste après le
  dépôt du mu-plugin.
- L'ancien **`tfe-composition-rest.php` devient inutile** — ne pas le déployer
  (ou le retirer s'il l'a déjà fait). Il ne sert qu'à l'ancienne lecture par
  meta `cp_order_home`.
- Le plugin CapEDx Composition reste installé et actif : ses failles
  (escalade de privilèges `manage_options` sur author/editor, AJAX sans nonce
  ni capability) sont toujours ouvertes. Le désinstaller une fois la nouvelle
  chaîne validée, puis nettoyer catégorie 100 `spotlight` + tag `cp_spotlight`
  sur les articles et supprimer les deux termes.
- Migration des données : inutile d'écrire un script, ce sont 5 articles à
  re-sélectionner une fois à la main.
- Vérifs : `php -l` OK, `npx tsc --noEmit` OK (exit 0, sur la machine de Yv).
  eslint toujours pas exécutable (>120 s, cap de 45 s du pont device).
  Pas encore de test contre l'API WP (le mu-plugin n'est pas déployé).
- API WP de prod lente/instable en lecture : plusieurs `/tags?include=` ont
  timeout pendant l'audit. Les appels `/categories` et `/posts` passent.

## 2026-08-11 — Audit du plugin Composition (décision remplacer/réparer en attente)

Vérifié en direct contre l'API WP de prod :

- catégorie `spotlight` = **term id 100**, `count: 5` (le plugin tient bien 5 posts).
- sur un post spotlight, `categories` = `[111, 100]` / `[109, 100]` → **100 arrive
  en dernier** (wp_set_post_categories en mode append). Donc `categories[0]` reste
  la vraie catégorie édito : le `tagOrCategory` de wpApi.ts n'affiche PAS
  "Spotlight" sur les cartes. Risque écarté (ordre non garanti par contrat, mais
  empiriquement stable).
- `meta` d'un post spotlight = `{_acf_changed, content-type, footnotes}` →
  **`cp_order_home` toujours absente : le mu-plugin n'est pas encore déployé.**
- tag **101** présent sur les 3 posts spotlight testés = quasi certainement
  `cp_spotlight` (id adjacent à la catégorie 100). Non confirmé : l'endpoint
  `/tags?include=` timeout côté WP de façon répétée (API prod lente/instable).

Défauts relevés dans `composition.php` (233 lignes) :

1. 🔴 `add_user_caps()` donne `manage_options` aux rôles `author` et `editor` à
   chaque `admin_init` → escalade de privilèges persistée en base (accès à tous
   les réglages WP). À supprimer + révoquer les caps déjà posées.
2. 🔴 `pl_wp_ajax_function()` : aucun `check_ajax_referer()`, aucun
   `current_user_can()`, IDs non castés → tout utilisateur connecté peut
   réécrire la homepage. (`wp_ajax_nopriv_myaction` ne matche pas l'action
   `pl_action` → non exploitable en anonyme, par chance.)
3. 🟠 Onglet HUMAN RIGHTS ne sauvegarde rien : typo JS `#posts_human-right`
   au lieu de `#posts_human-rights` → tableau vide, "success" affiché quand même.
4. 🟠 `sleep(1)` dans les deux boucles → ≥5 s par save, sans raison. Combiné au
   caractère non atomique de `cp_make_spotlight()` (retire la catégorie de TOUS
   les posts avant de réattribuer) : un timeout PHP en cours de route laisse le
   Hero vide.
5. 🟠 `wp_update_post()` sur les 5 posts à chaque save → bump de `post_modified`.
   Or `app/sitemap.ts` utilise `post.modified` comme `lastModified` → chaque
   changement de Hero signale aux moteurs 5 articles "modifiés".
6. 🟠 Le tag `cp_spotlight` est rendu aux lecteurs : `ArticleBody.tsx` affiche
   `article-tags` / `tags-list`, et `/tag/[slug]` existe → mot-clé parasite
   public. Idem `/category/spotlight` = page catégorie publique.
   (Ni l'un ni l'autre n'est dans `sitemap.ts`, qui ne liste que les articles
   + 4 routes statiques.)
7. Code mort : `nestable.js` enqueué jamais utilisé (le drag & drop était
   l'intention d'origine), `get_terms('category')` ancienne signature dont le
   résultat n'est jamais lu, `if ($i > 5)` inatteignable, sélecteur JS
   `#cp_posts` (la classe réelle est `.cp-posts`), `uninstall.php` vide (0 octet,
   ne nettoie pas les meta écrites), `check_duplicated_post()` non appelé pour
   spotlight (doublon possible → même article 2× dans le Hero).

Diagnostic de fond : le problème n'est pas le code mais le **modèle de données**
— la taxonomie (catégorie + tag) sert de stockage d'affichage, ce qui pollue la
taxonomie éditoriale et l'URL publique. Non réparable par patch.

Recommandation faite à Yv : 4 correctifs d'urgence (points 1-4) puis
remplacement par un champ **ACF Relationship** (ACF déjà exposé en REST dans
l'install, cf. `wpApi.highlight.ts`) — search + drag & drop natifs, stockage en
une ligne `wp_options` (atomique), ~0-40 lignes de PHP custom au lieu de 233.
Point à vérifier : `acf_add_options_page()` requiert ACF **Pro** ; sinon
repli sur un CPT `composition` à entrée unique. Décision non prise.

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

---

## Storytelling — hero sticky, cover en panneau confiné, galerie élastique (13/08/2026)

Refonte de l'empilement de `ArticleMediaLayout.tsx` + `app/styles/article-storytelling.css`.

**Cause racine du blocage précédent** : l'image de cover était en `position: fixed`,
donc peinte sur toute la fenêtre pendant TOUT l'article. Le hero devait passer devant
(z-index 1) pour ne pas être masqué au chargement, ce qui lui interdisait d'être sticky
(il aurait alors masqué le cover pour le reste de l'article). Confiner le cover débloque
le hero — les deux points ne sont pas indépendants.

1. **Hero** (`.am-hero-media`) — `position: sticky; top: var(--headerHeight)`,
   `height: var(--am-hero-height)` = 90vh, `z-index: 0`. Les plaques blanches
   (`.container-background`, z-index 2) remontent et le voilent par le bas ; il ne quitte
   jamais l'écran. `top` = `--headerHeight` (70px / 84px ≥1000px) et non 0 : `.site-header`
   est lui-même sticky top:0 dans le flux, donc à scrollY 0 la position naturelle du hero
   vaut déjà exactement `--headerHeight` → aucun décalage sticky, aucune bande vide en
   haut de page. Ne jamais poser overflow/clip/transform sur un ancêtre (casse le sticky).

2. **Cover** (`.am-cover-media`) — panneau autonome de 100vh DANS LE FLUX, `z-index: 2`,
   `overflow: hidden`, flex centré. L'image passe du `<img>` à un calque
   `.am-cover-image` (`position: absolute; inset: 0`) en
   **`background-attachment: fixed`** + `background-size: cover` : immobile au scroll ET
   peinte uniquement dans la surface du panneau. Le voile `.am-cover-overlay` passe en
   `absolute; inset: 0` (même géométrie → pas de désynchro).
   Le texte du cover vit désormais DANS le panneau (`.am-cover-text`, centré) :
   `.am-cover-text-flow` et `--am-cover-text-gap` sont **supprimés**.
   Repli `background-attachment: scroll` sous `@media (hover: none)` (iOS/Android gèrent
   mal `fixed`) et sous `prefers-reduced-motion`.
   Pistes écartées et pourquoi : `<img fixed>` (non clippable — `overflow:hidden` ne
   clippe pas un fixed, et `clip-path` sur le parent en fait le bloc conteneur donc
   l'image redevient mobile) ; `<img sticky>` dans 100vh (plage d'épinglage = 0).

3. **Galerie** (`.am-gallery-item`) — le `width: auto` du survol est remplacé par
   `calc(var(--am-gallery-h) * var(--am-gallery-grow))` (1.9). `auto` n'est pas
   interpolable (aucune animation à l'élargissement) et pouvait se résoudre à 0 en
   flex-wrap → la vignette survolée disparaissait. `object-fit: cover` maintenu au
   survol (le `contain` provoquait un saut). Retrait des voisines à 0.55,
   transition 0.55s `cubic-bezier(0.34, 1.28, 0.48, 1)` (léger dépassement = rendu
   élastique). Rangée toujours plus étroite au survol → aucun saut de ligne.

**Vérifs** : aucune référence orpheline à `am-cover-text-flow` / `am-cover-media img` /
`--am-cover-text-gap` dans app/. `npx tsc --noEmit` non exécuté (timeout de la session
sur la VM Windows) — modifs TSX limitées au remplacement d'un `<img>` par un `<div>`
avec `style={{ backgroundImage }}`.
