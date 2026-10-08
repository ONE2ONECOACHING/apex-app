# APEX APP — ONE2ONE Coaching

Application du studio ONE2ONE (Saint-Estève, près de Perpignan). Côté client : une PWA de suivi nutrition, entraînement et formation. On y construit l'espace coach et gérant décrit dans `docs/cahier-des-charges.md` : lis-le avant toute tâche.

## Avec Benjamin

- Benjamin est gérant du studio et coach ; il n'est pas développeur de métier. Réponds en français, simplement, sans jargon inutile.
- Avant toute modification qui touche la production (base Supabase, Edge Functions, push sur `main`), explique ce qui va changer et attends son accord.
- Ne pars pas sur une conception qu'il n'a pas validée : en cas de doute sur le besoin, pose la question.

## Stack

- JavaScript sans framework ni build. `index.html` charge tous les scripts avec `?v=N` : incrémente `N` du fichier modifié, sinon le cache sert l'ancienne version.
- Routeur par hash : `js/router.js`. Toute la couche données : `js/supabase.js` (objet `db`). Écrans : `pages/client/` et `pages/coach/`. Styles : `css/app.css`.
- Supabase, projet `ahbeturxnnyukkuytesc`. La clé anon dans `js/config.js` est publique par nature ; la sécurité repose entièrement sur les règles RLS.
- Edge Functions dans `supabase/functions/` : elles ne se déploient pas avec un push.
- Hébergement Cloudflare Pages : **chaque push sur `main` part en production** chez les clients (app.one2onecoaching.fr). Travaille sur une branche ; Benjamin valide avant la fusion.
- L'analyse photo des repas passe par un Worker Cloudflare `apex-proxy-api` dont le code n'est pas dans ce dépôt.

## Règles

- Toute modification de la base = un script dans `sql/`, nommé `AAAA-MM-JJ_sujet.sql`, relançable sans casse, dans une transaction, avec une requête de vérification à la fin. Benjamin le relit et l'exécute lui-même dans le SQL Editor de Supabase.
- Jamais de secret dans le dépôt (clé service role, clé VAPID privée, CRON_SECRET, clés Stripe).
- Les données des clients sont des données de santé : chaque nouvelle table a ses règles RLS dès sa création, conformes à la matrice de droits du cahier des charges.
- Plusieurs règles RLS existantes testent `role = 'coach'` en dur. Toute évolution des rôles doit les reprendre une par une.

## État de la base (8 octobre 2026)

- 34 tables. Rôles dans `profiles.role` : `client` ou `coach` (contrainte `profiles_role_check`). Fonction `is_coach()`.
- Deux comptes coach : le compte partagé `one2onecoachingsport@gmail.com` (id `fe2c19c2-…`), toujours utilisé par toute l'équipe et à ne jamais supprimer (il est l'auteur des modèles, effacés en cascade avec lui), et le compte gérant de Benjamin (test). L'étiquette `profiles.coach_tag` (`ben`, `chris`, `lola`) reste affichée.
- `sql/2026-10-08_gerant_referent.sql` exécuté le 8 octobre 2026 : `profiles.is_gerant`, `profiles.coach_referent_id` (le compte partagé est référent de tous les clients pendant la transition), fonctions `is_gerant()` et `est_referent(client)`, trigger `protect_profile_role` étendu à ces colonnes.
- Le schéma de 11 tables centrales (dont `profiles`, `plans_nutritionnels`, `journal_entries`, `mesures`) n'est pas versionné dans `sql/` : il a été créé à la main dans Supabase.
- `sql/securite_2026-10-06.sql` a été exécuté en production le 6 octobre 2026 (protection du rôle, fonction `handle_new_user`, tables `poids_journal` et `habitudes_*` fermées, formations réservées aux connectés). L'inscription publique est désactivée dans Supabase Auth.
- Failles restantes : mot de passe par défaut identique pour tous les nouveaux clients (`invite-client` et `pages/coach/clients.js`) ; `delete-client` laisse tout coach supprimer n'importe quel compte ; `send-push` accepte tout utilisateur connecté.

## Étape en cours : 1 — Fondations

Rien ne doit changer pour les clients pendant cette étape.

1. Rôle gérant : fait (booléen `profiles.is_gerant`, le rôle reste `coach`).
2. Comptes : pour l'instant un seul compte de test (gérant Benjamin). Christophe, Lola, Diego et Cyril plus tard. Bibliothèque commune (modèles, bilans, formations) : `sql/2026-10-08_bibliotheque_commune.sql` exécuté le 8 octobre 2026, code sur la branche `etape-1-fondations` testé par Benjamin sur la preview Cloudflare (pas encore fusionné : on fusionne à la fin de l'étape 1). Benjamin donne les adresses des autres coachs le 9 octobre.
   Lot 4 (référent dans l'app) : garder l'étiquette `coach_tag` affichée à côté du référent tant que l'équipe utilise le compte partagé (validé par Benjamin).
3. Écran Équipe pour les gérants : ajouter ou supprimer un coach (Edge Function en service role, réservée aux gérants).
4. Coach référent : `profiles.coach_referent_id` sur chaque client, repris de `coach_tag` quand c'est possible.
5. Droits : réécrire les règles RLS selon la matrice du cahier des charges (référent, autres coachs, gérants).
6. Sécurité : mot de passe aléatoire à la création d'un client, restreindre `delete-client` (gérants, comptes clients uniquement) et `send-push`.

## Dépôt

- `.git/stale-index-lock-claude` est un fichier vide laissé par une session précédente : il peut être supprimé.
- `sql/securite_2026-10-06.sql`, `CLAUDE.md` et `docs/` ne sont pas encore commités.
