# Cahier des charges — Espace coach et gérant ONE2ONE

Résumé validé par Benjamin le 8 octobre 2026. La version complète et commentée est un document Claude Docs tenu par Benjamin ; ce fichier en reprend toutes les décisions.

## Objectif

Réunir au même endroit tout ce qui sert à suivre un client, pour que les coachs gagnent du temps et que les gérants voient ce que font leurs coachs. Outil interne à ONE2ONE (pas de vente à d'autres coachs pour le moment). Ordinateur d'abord, mobile ensuite. Une seule base Supabase et une seule application. Démarrage à zéro : pas de reprise de l'historique Google Calendar ni des fichiers existants ; Benjamin importera lui-même les modèles de programmes.

| Aujourd'hui | Dans l'outil |
| --- | --- |
| Google Calendar | Agenda intégré |
| Un Google Sheets par client (programme présentiel) | Programmes et grille de séance sur la fiche client |
| Un classeur de suivi par coach | Journal de suivi sur la fiche client |
| WhatsApp pour le suivi | Messagerie intégrée (WhatsApp reste pour le reste) |
| Fichier KPI + notifications Slack (Make) | CRM |
| Fichier clientèle facturation | Catalogue des formules + bloc Facturation |

## Rôles

- Deux niveaux d'accès : **coach** et **gérant**. Un gérant est un coach comme les autres (avec ses propres clients), plus la lecture de tous les suivis et la partie financière.
- Équipe au lancement : Benjamin et Christophe (gérants), Lola, Diego et Cyril (coachs). Les gérants ajoutent ou suppriment des coachs.
- **Coach référent** : une attribution, pas un niveau d'accès. Tout client en a un (y compris les clients du studio sans suivi), choisi parmi les coachs, gérants compris. Il programme le client et répartit ses séances entre présentiel et distance. Un coach supprimé : ses clients doivent recevoir un nouveau référent.
- Au studio, tout coach peut coacher tout client.
- **Client suivi** (à distance ou nutrition) : application actuelle complète + ses séances en présentiel et ses charges.
- **Client du studio sans suivi** : accès limité (séances en présentiel, charges, messagerie générale). Pas de journal de suivi, de bilans ni de messagerie avec le référent.

## Droits sur la fiche d'un client

| Élément | Coach référent | Autre coach | Gérant |
| --- | --- | --- | --- |
| Séances en présentiel et grille | Lecture et écriture | Lecture et écriture | Lecture et écriture |
| Séances à distance | Lecture et écriture | Lecture et écriture | Lecture et écriture |
| Plan alimentaire | Lecture et écriture | Lecture seule | Lecture seule |
| Bilans | Lecture et écriture | Aucun accès | Lecture seule |
| Mesures, poids, photos | Lecture et écriture | Aucun accès | Lecture seule |
| Journal de suivi | Lecture et écriture | Aucun accès | Lecture seule |
| Messagerie de suivi | Lecture et écriture | Aucun accès | Lecture seule |
| Facturation, Stripe, CRM | Aucun accès | Aucun accès | Lecture et écriture |

Un gérant référent d'un client garde l'écriture sur ce client au titre de référent. Ces règles doivent être appliquées par la base (RLS), pas seulement par l'affichage.

## Tableau de bord du coach

1. Mes coachings du jour (aperçu agenda ; un clic ouvre la fiche client).
2. Bilans à traiter (remplis par mes clients, sans réponse).
3. Bilans en attente (clients qui n'ont pas répondu) avec une cloche de relance par notification push.
4. Cycles d'entraînement : où en est chaque client, fins de cycle en tête.

Blocs 2 à 4 : seulement les clients dont le coach est référent. Bloc 1 : tous ses rendez-vous.

## Agenda (priorité numéro un : aussi simple que Google Calendar)

- Prise de rendez-vous en cliquant sur un créneau ; coaching de 1 h par défaut, durée libre ; récurrences hebdomadaires ; notes.
- Indisponibilités (heures ou journées complètes) visibles de tous.
- Chacun (coach ou gérant) peut afficher ou masquer les agendas des autres, pour voir le remplissage de la salle.
- Vues jour et semaine sur ordinateur ; mobile plus tard.
- Facturation : un créneau présent est facturé, un créneau supprimé ne l'est pas (annulation tardive facturée = on laisse le créneau). Tout coach peut supprimer un créneau, même passé ; chaque suppression est tracée (qui, quand, quel client).
- Client à la fois en abonnement et à la consommation : à la création du créneau, une case « inclus dans l'abonnement » (par défaut) / « en plus ». La case n'apparaît que pour ces clients.

## Fiche client

Onglets : Infos (identité, objectif, fréquence, coach référent, durée du suivi, note libre), Entraînement, Plan alimentaire, Suivi (journal, bilans, mesures, photos), Messagerie, Facturation (gérants). Chaque onglet n'apparaît que si la personne y a droit.

### Programmes d'entraînement

- Bibliothèque de modèles : Men Work débutant, Woman Work débutant, Men Work confirmé, Woman Work confirmé, Fat Loss débutant, Hyrox, etc. Chaque modèle contient toutes ses phases (4 à 6 semaines, une méthode par phase : AMRAP 5 min, superset antagoniste, top set / back-off, 5x5…).
- Un ou plusieurs programmes par client (ex. renfo + cardio).
- Dans chaque phase, le référent répartit chaque séance entre présentiel et distance (ex. séance 1 au studio, séances 2 et 3 dans le plan à distance).
- Le nombre de séances par phase se choisit par client (ajout ou suppression depuis le modèle).
- Une fois attribué, le programme se modifie pour ce client sans toucher au modèle. Tous les coachs ont l'écriture (certains clients ont deux plans tenus par deux coachs).

### Grille de séance en présentiel

Reprend le Google Sheets actuel, remplie par le coach sur ordinateur pendant le coaching : pour chaque exercice, une colonne par semaine (charge, répétitions), semaines précédentes visibles. Saisie libre (« 2x12,5 kg », « 12-12-12-12 », exercice remplacé, remarque). Les séances à distance restent saisies par le client.

### Journal de suivi

Une ligne par lundi sur la durée du suivi (26 semaines par défaut, modifiable : plus court ou rallongé). Par semaine : nutrition et entraînement (action prévue, modification appliquée), retour du client, bilan du client affiché sur la ligne. Statut calculé (Fait, En cours, Planifié, En retard) ; deux semaines sans suivi = alerte « retard de suivi ». En-tête : avancement (4 / 26), leviers prioritaires, prochaine action. Actions planifiables à l'avance. Pas de blocs Adaptation / Progression / Intensification.

## Messageries

- Messagerie de suivi : une conversation continue par client suivi, avec son référent. Ergonomie proche de WhatsApp : bulles, émojis, photos, vocaux. Notifications push. Gérants : lecture de tout, filtres par coach et client, pas d'écriture. Autres coachs : aucun accès.
- Messagerie générale (clients du studio sans suivi) : une conversation « Équipe ONE2ONE » par client ; le client ne voit que ses échanges ; notification au coach prévu sur son prochain créneau, sinon au référent ; tous les coachs et gérants peuvent lire et répondre.
- Transparence : coachs et clients informés que les gérants lisent les conversations (à valider juridiquement).

## Espace gérant

- Équipe : ajout et suppression de coachs.
- Supervision : par coach, bilans non traités, retards de suivi, fins de cycle sans suite ; lecture des journaux et conversations.
- Catalogue des formules (nom, abonnement ou consommation, prix, durée). La formule vendue préremplit le bloc Facturation du client, qui reste modifiable (ajout d'un tarif à la consommation, changement de montant).
- Bloc Facturation par client : deux cases indépendantes, abonnement (montant mensuel) et tarif à la consommation (tarif horaire propre au client).
- Facturation du mois : une ligne par client. Total = abonnement + heures à la consommation × tarif horaire. Liste des créneaux supprimés du mois.
- Stripe : lien de paiement pour un premier paiement (qui enregistre le moyen de paiement) ; abonnement Stripe pour les abonnements ; prélèvement mensuel manuel pour la consommation. D'abord afficher le montant à prélever ; ensuite un bouton « Prélever » par client, confirmé par le gérant, sur le moyen de paiement enregistré, avec gestion des refus (proposer un lien de paiement). Espèces hors périmètre.
- Chiffre d'affaires facturé et encaissé depuis Stripe.
- CRM : leads Meta Ads arrivant par Make (Make envoie au CRM au lieu du fichier KPI et de Slack) ; champs nom, e-mail, téléphone, ensemble de publicités, publicité ; notification des gérants ; cinq relances datées (appel 1, message vocal, appel 2 + SMS, appel WhatsApp + vocal, SMS 2) ; prochaine action datée qui remonte sur le tableau de bord ; note 0 à 3 ; étapes setting call, RDV studio, venue, vente (formule du catalogue) ou perdu ; RDV inscrit dans l'agenda ; conversion lead → client en un clic ; indicateurs par période et par publicité. Réservé aux gérants.

## Ordre de construction

1. Fondations : comptes, rôle gérant, écran Équipe, coach référent, droits (RLS), mot de passe par défaut.
2. Agenda et coachings du jour.
3. Fiche client et programmes d'entraînement.
4. Journal de suivi et reste du tableau de bord.
5. Messageries.
6. Catalogue des formules, facturation, Stripe.
7. CRM.
8. Version mobile coachs.

Chaque étape est livrée et utilisée avant la suivante.

## Points ouverts (à trancher à leur étape)

- Catalogue des formules : liste et prix ; fichier clientèle facturation à examiner.
- Information juridique sur la lecture des conversations par les gérants.
- Modèles de programmes déjà en base : à revérifier avec Benjamin avant l'import.
