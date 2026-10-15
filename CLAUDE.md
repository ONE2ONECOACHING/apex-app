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
- Six comptes coach (9 octobre 2026) : Benjamin Cara et Christophe (gérants), Lola, Diego, Cyril, et le « Compte partagé » `one2onecoachingsport@gmail.com` (id `fe2c19c2-…`), toujours utilisé par l'équipe jusqu'à la bascule et à ne jamais supprimer sans transférer ses modèles (effacés en cascade avec lui). 59 clients, tous étiquetés `ben`, `chris` ou `lola`.
- `sql/2026-10-08_gerant_referent.sql` exécuté le 8 octobre 2026 : `profiles.is_gerant`, `profiles.coach_referent_id` (le compte partagé est référent de tous les clients pendant la transition), fonctions `is_gerant()` et `est_referent(client)`, trigger `protect_profile_role` étendu à ces colonnes.
- Le schéma de 11 tables centrales (dont `profiles`, `plans_nutritionnels`, `journal_entries`, `mesures`) n'est pas versionné dans `sql/` : il a été créé à la main dans Supabase.
- `sql/securite_2026-10-06.sql` a été exécuté en production le 6 octobre 2026 (protection du rôle, fonction `handle_new_user`, tables `poids_journal` et `habitudes_*` fermées, formations réservées aux connectés). L'inscription publique est désactivée dans Supabase Auth.
- Failles du 6 octobre corrigées et en production depuis le 9 octobre 2026 : mot de passe aléatoire (`invite-client`), `delete-client` réservé aux gérants et aux comptes clients, `send-push` réservé aux crons et aux coachs, `delete-user` supprimée. Étape 1 fusionnée sur `main` le 9 octobre 2026.
- Rappels automatiques : seule `cron-notifications` est déployée (`check-reminders` ne l'est pas). Elle appelle `send-push` avec `CRON_SECRET`, qui n'est pas un JWT : « Verify JWT » doit rester désactivé sur `send-push` (désactivé le 12 octobre 2026 ; avant, tous les rappels étaient refusés en 401). `send-push` fait elle-même le contrôle (CRON_SECRET ou compte coach). `push_notifications_log` note les tentatives, pas les envois réussis.
- Nouveaux coachs (13 octobre 2026) : `manage-team` pose `user_metadata.mdp_a_choisir`, le routeur leur impose `set-password` à la 1re connexion (puis tableau de bord). Les coachs créés avant ne sont pas concernés (choix de Benjamin).
- Risque accepté par Benjamin (8 octobre 2026) : les clients déjà inscrits qui n'ont jamais changé le mot de passe commun `Apex2026!` le gardent ; on ne force pas de changement pour eux (option B). Les nouveaux clients doivent choisir leur mot de passe avant l'onboarding (`user_metadata.mdp_personnel`).

## Étape 1 — Fondations (terminée, en production)

Rien ne doit changer pour les clients pendant cette étape.

1. Rôle gérant : fait (booléen `profiles.is_gerant`, le rôle reste `coach`).
2. Comptes : pour l'instant un seul compte de test (gérant Benjamin). Christophe, Lola, Diego et Cyril plus tard. Bibliothèque commune (modèles, bilans, formations) : `sql/2026-10-08_bibliotheque_commune.sql` exécuté le 8 octobre 2026, code sur la branche `etape-1-fondations` testé par Benjamin sur la preview Cloudflare (pas encore fusionné : on fusionne à la fin de l'étape 1). Benjamin donne les adresses des autres coachs le 9 octobre.
   Lot 5 (droits) : `sql/2026-10-08_droits_coachs.sql` exécuté le 8 octobre 2026 et vérifié avec `sql/2026-10-08_droits_test.sql` (conforme à la matrice). `handle_new_user` donne le compte partagé comme référent aux nouveaux clients (transition). Photos : `sql/2026-10-08_droits_photos.sql`.
   Lot 6 (écran Équipe) : `sql/2026-10-08_equipe.sql` exécuté, Edge Function `manage-team` déployée le 8 octobre 2026 (attention : dans le tableau de bord Supabase, saisir le nom avant de déployer, sinon l'adresse prend un nom aléatoire), création et suppression d'un coach test validées par Benjamin sur la preview.
   Lot 4 (référent dans l'app) : garder l'étiquette `coach_tag` affichée à côté du référent tant que l'équipe utilise le compte partagé (validé par Benjamin).
3. Écran Équipe : fait (lot 6).
4. Coach référent : fait (lot 4). Bascule faite le 12 octobre 2026 avec `sql/2026-10-12_bascule_referents.sql` : Benjamin 23 clients (21 « ben » + 2 sans étiquette), Christophe 33, Lola 5 ; plus aucun client rattaché au compte partagé. `handle_new_user` ne donne plus de référent par défaut : le coach qui crée le client le devient.
5. Droits : faits (lot 5).
6. Sécurité : en production (lot 7).

## Étape 2 — Agenda (en production depuis le 12 octobre 2026)

- `sql/2026-10-09_agenda.sql` exécuté le 9 octobre 2026 : `profiles.type_client` (`suivi` = studio + suivi, `distance` = suivi sans agenda, `studio` = studio sans suivi ; les 59 clients existants en `suivi`), `profiles.telephone`, `profiles.facturation_mixte`, tables `agenda_creneaux` (tous les coachs) et `agenda_suppressions` (copie automatique par trigger, lecture gérants).
- Clients du studio : vrai compte Supabase mais bloqué (`ban_duration`), email interne `studio-…@clients.one2onecoaching.fr` si pas d'email, créés par `invite-client` (`studio: true`), déployée le 9 octobre 2026.
- Écran `pages/coach/agenda.js` (route `coach-agenda`), bloc « Mes coachings du jour » sur le tableau de bord. Glisser-déposer (heure, jour, coach en vue jour, semaine voisine en tenant le créneau contre le bord, avec animation), durée par les bordures haute et basse. Testé par Benjamin sur la preview le 9 octobre 2026.
- Rendez-vous prospect (`sql/2026-10-12_agenda_prospects.sql`, en production le 12 octobre 2026) : `type = 'prospect'`, `prospect_nom` obligatoire, `prospect_tel`, jamais facturé. Récurrence toutes les 1 à 4 semaines, aussi sur un créneau existant ; le rythme d'une série se déduit de l'écart entre ses deux dernières séances.
- Les tests sur la preview ont laissé des lignes dans `agenda_suppressions` (client « Test Studio ») : à ignorer ou retirer avant la facturation (étape 6).

## Étape 3 — Fiche client et programmes (en production depuis le 12 octobre 2026)

- Décisions de Benjamin (12 octobre 2026) : phases enchaînées à la main comme avant ; à l'attribution d'une phase, le coach coche les séances du client puis choisit studio ou distance pour chacune ; le client voit sa grille du studio en lecture seule ; semaine en cours = première case « faite » non cochée.
- `sql/2026-10-12_fiche_entrainement.sql` : `client_programmes.nb_semaines`, `client_prog_seances.lieu` (`distance` par défaut), tables `seances_studio_semaines`, `seances_studio_saisies` (tous les coachs, lecture client) et `fiche_coach` (profil coaching, coachs uniquement, écriture référent et gérants).
- Éditeur de programmes (14 octobre 2026) : glisser-déposer des exercices (poignée ⠿, aussi vers une autre séance) et des séances. Un exercice déplacé sort de son superset. `saveClientProgrammeSeances` garde l'identifiant d'un exercice qui change de séance (lecture des exercices de tout le programme, suppressions à la fin).
- Écran `pages/coach/seance-studio.js` (route `coach-seance-studio`) : grille, et modification des exercices sur place. `saveClientProgrammeSeances` met à jour les exercices sur place : ne jamais revenir à « supprimer puis recréer », les saisies du studio y sont rattachées.
- Onglets de la fiche regroupés dans `coachClientNav` (`js/router.js`), masqués selon les droits ; onglet Infos : profil coaching et tableau des séances au studio (semaines 1 à 50).
- Remarques de la grille du studio réservées aux coachs (`sql/2026-10-15_remarques_studio_privees.sql`, exécuté le 15 octobre 2026) : le client lit ses charges et répétitions par `charges_studio_client()`, plus de lecture directe de `seances_studio_saisies`. Les « Notes coach » d'une séance (`client_prog_seances.notes_coach`, 📌) restent visibles du client : ce sont des consignes (choix de Benjamin).
- Côté client : rubrique « Au studio » ; `seances_log` reçoit maintenant `programme_id` et `seance_id`.
- Testé par Benjamin sur la preview le 12 octobre 2026.

## Interface coach et agenda téléphone (en production depuis le 12 octobre 2026)

- Menu de gauche (`afficherMenuCoach` dans `js/router.js`), tableau de bord `pages/coach/accueil.js` (route `coach-accueil`, page d'accueil des coachs) : coachings du jour, bilans à traiter, bilans en attente (comptés à partir du 12 octobre 2026, une ligne par client, relance), cycles d'entraînement (« ✓ Vu » = `client_programmes.fin_vue`).
- Cycles d'entraînement (tableau de bord) : semaines faites = nombre de fois où chaque séance du programme (hors cardio ; programme 100 % cardio : semaines cardio validées) a été faite depuis la plus récente de la date d'attribution (`created_at`) et de la date de début. Séance distance = `seances_log` reliée (`seance_id`) ou, pour les anciennes, même nom ; séance studio = semaines cochées dans la grille. Lecture des journaux par paquets de 1 000 lignes. Bouton « ↻ Repartir de zéro » (fiche › Entraînement) = nouvelle `date_debut`. Coachings du jour : seulement ceux en cours ou à venir.
- Programmes archivés (13 octobre 2026) : « Archiver » = `client_programmes.actif = false` (comme l'ancien « Retirer » : les anciens programmes retirés sont donc dans les archives). Écran `pages/coach/programme-archive.js` (route `coach-programme-archive`) : séances en lecture seule, charges par séance faite (`seances_log` reliée par `seance_id`, ou même nom pendant la durée du programme + 4 semaines), grille pour le studio, bouton « Réactiver ». Le client ne voit que les programmes actifs.
- Fiche client sur ordinateur (15 octobre 2026, `pages/coach/fiche.js`, ≥ 1 100 px) : onglets des fiches ouvertes (comme Safari, glissables, mémorisés dans `localStorage` par coach) et colonne « résumé » à gauche (prochain coaching, programme, nutrition, bilan, journal de suivi, profil), relue après chaque enregistrement dans la fiche. Messages de la fiche en pleine page. `Router.navigate` vers le même écran pour un autre client recharge l'écran (sinon pas de `hashchange`) et le bouton Retour suit. Plan alimentaire en colonnes essayé puis refusé par Benjamin : l'écran reste comme avant. Agenda : bouton « 📂 Fiches du jour » (mes coachings du jour pas encore terminés, ouverts en onglets).
- Bibliothèque à onglets (`biblioNav`), fiche client avec en-tête ; calcul TDEE dans Plan alimentaire › Calcul (`pages/coach/calcul-nutrition.js`). L'étiquette `coach_tag` n'est plus affichée : filtres et badges par coach référent.
- Page Clients (`pages/coach/clients.js`, 13 octobre 2026) : un seul tableau triable (client, référent, entraînement, nutrition, dernier bilan, alertes) avec filtres regroupés (Mes clients / Tous / Inactifs, type, référent, « À surveiller ») ; cartes sur téléphone. Pas de poids (choix de Benjamin). Les clients « studio sans suivi » n'ont jamais l'alerte « Sans plan alimentaire ».
- Clients inactifs : `profiles.actif = false` (bouton sur la fiche, filtre « Inactifs »), bilans automatiques arrêtés.
- Agenda sur téléphone (≤ 700 px) inspiré de Google Agenda : barre et en-tête fixes, couleurs pleines, bouton +, balayage, appui long pour déplacer. Compte partagé masqué de l'agenda et du choix du référent (`COMPTE_PARTAGE_ID`, `pages/coach/equipe.js`).

## Étape 4 — Journal de suivi (en production depuis le 12 octobre 2026)

- `sql/2026-10-12_journal_suivi.sql` : `journal_suivi` (une ligne par client et par lundi : nutrition et entraînement prévus / appliqués, retour, `fait`) et `journal_suivi_entete` (durée, 26 semaines par défaut, leviers). Référent en écriture, gérants en lecture, ni les autres coachs ni le client.
- Écran `pages/coach/journal-suivi.js` (route `coach-journal-suivi`, Suivi › Journal de suivi ; l'ancien « Journal » alimentaire s'appelle « Logbook »). Statuts et retards calculés par `JournalSuivi` : retard = deux dernières semaines passées non faites, uniquement à partir du 12 octobre 2026 (`JOURNAL_DEPART`). Bloc « Retards de suivi » sur le tableau de bord, badge dans la liste.
- Le journal part de `profiles.date_debut` (date de début du suivi, réglée dans Plan alimentaire › Calcul).

- Décalage d'une semaine (15 octobre 2026, demande de Benjamin) : le bilan part le samedi, donc le suivi d'une semaine se fait la semaine suivante. Semaine « à traiter » = la semaine dernière (`JournalSuivi.aTraiter()`, statut `a_faire`) ; la semaine en cours est « En cours » ; « En retard » = plus ancienne que la semaine à traiter. Retard du tableau de bord : les deux semaines d'avant la semaine à traiter non faites.
- Onglet « Suivi » (14 octobre 2026, `pages/coach/suivi.js`, route `coach-suivi`) : mes clients suivis de la semaine (journal de suivi fait / à faire / retard, dernier bilan, messages non lus), à faire en haut ; gérants : choix du coach. Compteur du menu = mes suivis à faire. Le journal de suivi ouvert depuis cet onglet (`depuisSuivi`) affiche « ‹ Suivi · Suivant › » (file dans `sessionStorage.suiviFile`).

## Étape 5 — Messageries (en production depuis le 13 octobre 2026)

- `sql/2026-10-13_messagerie.sql` et `sql/2026-10-13_messagerie_vu.sql` : `messages` (canal `suivi` = client ↔ référent, gérants en lecture ; canal `equipe` = client studio ↔ tous les coachs), `messages_lectures` (« Vu », heure posée par le serveur via `marquer_conversation_lue`), stockage privé `messages` (`<client>/<canal>/<fichier>`), `conversations_resume()`, les deux tables en direct (Realtime). Un message n'est jamais effacé : son auteur peut seulement le marquer supprimé.
- Conversation partagée `js/chat.js` (`Chat.ouvrir`), écrans `pages/coach/messagerie.js` (route `coach-messagerie`, notifications vers `#coach-messagerie?c=<client>&k=<canal>`), `pages/coach/client-messages.js`, `pages/client/messages.js` (route `messages`).
- Edge Function `message-push` (déployée le 13 octobre 2026) : notifie le client, le référent, ou pour un client studio le coach de son prochain rendez-vous. Les coachs sont maintenant abonnés aux notifications.
- Clients studio : bouton « Ouvrir l'accès à l'app » (`invite-client`, action `ouvrir_acces`), app réduite (Entraînement, Messages) imposée par le routeur.
- Messagerie coach (13 octobre 2026) : seulement les discussions existantes (la recherche montre aussi les clients sans message), filtre Toutes / Non lues, sans pastilles, lignes de même hauteur. « Non lu » = non lu par le coach connecté, uniquement sur les conversations où il peut répondre (choix de Benjamin : pas d'indicateur « pas lu par tel coach » pour les gérants). Prénom des coachs visible des clients via `prenoms_coachs()` (`sql/2026-10-13_prenoms_coachs.sql`, exécuté le 13 octobre 2026).
- Deux conversations pour les clients studio + suivi (13 octobre 2026, `sql/2026-10-13_messagerie_deux_canaux.sql` exécuté) : « Mon coach » (canal `suivi`, par défaut) et « Équipe ONE2ONE » (canal `equipe`, ex. prévenir d'un retard). Distance : `suivi` seulement ; studio sans suivi : `equipe` seulement.
- Transparence sur la lecture des conversations par les gérants : gérée hors de l'app par Benjamin (validation juridique à sa charge).

## Prochaines étapes

6. Formules, facturation, Stripe (retirer d'abord les suppressions de test « Test Studio » d'`agenda_suppressions`). 7. CRM. 8. Version mobile complète des coachs.

## Dépôt

- Une branche par chantier (preview Cloudflare sur l'adresse de la branche), fusionnée sur `main` après validation de Benjamin. Benjamin pousse avec GitHub Desktop : le terminal de Claude n'a pas accès à ses identifiants GitHub. Attention : s'il change de branche dans GitHub Desktop pendant que Claude travaille, les commits partent sur la mauvaise branche ; vérifier `git branch --show-current` avant chaque commit.
- Copier un fichier pour Benjamin : `LANG=en_US.UTF-8 pbcopy`, sinon les accents sont abîmés.
