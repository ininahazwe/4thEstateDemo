# Spec : endpoint `POST /status` — plugin WP membership (tfe-membership)

**Destinataire : Claude (ou dev) dans le projet du plugin WP membership** (`membership.thefourthestategh.com`, hors dépôt du front Next.js `4thestate`).

## Contexte

Le front Next.js (`4thestate`) stocke `is_active` / `tier` / `sync_pending` dans un JWT au login (`POST /authenticate` ou `POST /sso/consume`), puis ne les revérifie plus jamais pendant toute la durée de vie de la session (30 jours). Résultat : un compte activé (paiement traité, `sync_pending` levé) **après** l'ouverture de session en cours continue d'afficher "Join the community" côté header au lieu du badge membre actif, jusqu'à déconnexion/reconnexion.

Le front a été corrigé pour resynchroniser à la demande (`lib/auth.config.ts`, callback `jwt`, branche `trigger === "update"`, déclenchée par `Header.tsx` au focus de l'onglet). Il lui manque un endpoint côté WP pour aller chercher le statut à jour **sans re-authentifier** (pas de mot de passe disponible à ce stade, juste l'id utilisateur déjà connu du JWT).

## Endpoint à créer

```
POST {TFE_MEMBERSHIP_API_URL}/status
```

(même namespace `tfe/v1` que `/authenticate`, `/sso/consume`, `/sso/issue` — donc `POST /wp-json/tfe/v1/status` côté WP.)

### Authentification

Header `X-TFE-API-Key`, même clé partagée que les autres endpoints du plugin (`TFE_MEMBERSHIP_API_KEY` côté front). Requête sans clé ou avec clé invalide → `401`.

### Requête

```json
{ "user_id": 1234 }
```

`user_id` : l'identifiant WP de l'utilisateur (string ou int acceptés — le front l'envoie tel que stocké dans le JWT, casté en string).

### Réponse — succès (200)

Même shape que les champs membership déjà renvoyés par `/authenticate` et `/sso/consume`, pour rester cohérent :

```json
{
  "is_active": true,
  "tier": "supporter",
  "sync_pending": false
}
```

- `is_active` (bool, obligatoire)
- `tier` (string ou `null`, obligatoire)
- `sync_pending` (bool, obligatoire)

Pas besoin de renvoyer `id`/`email`/`name` : le front ne les réutilise pas dans cette branche, `user_id` suffit à identifier la requête.

### Réponses — erreurs

| Cas | Code | Corps |
|---|---|---|
| Clé API absente/invalide | 401 | `{ "message": "invalid_api_key" }` |
| `user_id` absent du body | 400 | `{ "message": "missing_user_id" }` |
| Utilisateur introuvable | 404 | `{ "message": "user_not_found" }` |

Le front traite tout code non-2xx comme un échec silencieux (il garde l'ancienne valeur du JWT plutôt que de dégrader un membre actif sur une panne passagère) — donc pas besoin de soigner particulièrement les messages d'erreur, juste des codes HTTP corrects.

### Exemple curl (pour tester une fois déployé)

```bash
curl -X POST "https://membership.thefourthestategh.com/wp-json/tfe/v1/status" \
  -H "Content-Type: application/json" \
  -H "X-TFE-API-Key: <clé>" \
  -d '{"user_id": 1234}'
```

## Notes d'implémentation suggérées

- Réutiliser la même logique de calcul d'`is_active`/`tier`/`sync_pending` que celle utilisée dans `/authenticate` et `/sso/consume` (probablement une fonction commune côté plugin) — pas de nouvelle règle métier à inventer, juste une nouvelle façon d'y accéder (par `user_id` plutôt que par identifiants).
- Endpoint interrogé potentiellement souvent (au focus de chaque onglet, throttlé à 60s côté front) : privilégier une lecture directe (meta utilisateur / table membership) plutôt qu'un appel à un service de paiement tiers à chaque requête, si ce n'est pas déjà le cas pour `/authenticate`.
- Pas d'effet de bord : lecture seule, aucune modification de l'utilisateur.

## Côté front (déjà fait, pour référence)

- `lib/auth.config.ts` : callback `jwt`, branche `trigger === "update"`, appelle `POST {TFE_MEMBERSHIP_API_URL}/status` avec `{ user_id: token.wpUserId }`.
- `app/components/Header/Header.tsx` : déclenche `useSession().update()` au montage et au focus de l'onglet, uniquement si connecté et affiché non-actif.

Une fois l'endpoint déployé côté WP, aucun changement supplémentaire n'est attendu côté front — le mécanisme est déjà branché et attend cette réponse.
