-- APEX — Formation FEMMES · Module 8 : Système Hormonal Féminin & Performance
-- Cible uniquement la "Formation Holistique Femmes".

-- ── 1) Contenu pédagogique (texte) — vidéo à remettre par le coach (femmes) ──
UPDATE formation_lecons
SET youtube_url = NULL,
    description = $desc$🎯 Objectif du module

Comprendre comment ton système hormonal féminin influence :
Ton énergie
Ta composition corporelle
Ta récupération
Tes performances
Ton appétit

À la fin de ce module, tu dois être capable de :
Comprendre le rôle des œstrogènes et de la progestérone
Identifier les phases de ton cycle menstruel
Adapter ton entraînement et ta nutrition à chaque phase
Décoder les variations de poids et d'appétit sans paniquer

🧠 1. Les bases du système hormonal féminin

Les hormones sont des messagers chimiques. Chez la femme, deux jouent un rôle central :
Œstrogènes : énergie, force, humeur, sensibilité à l'insuline
Progestérone : température corporelle, satiété, préparation du corps

À elles s'ajoutent le cortisol (stress) et l'insuline (gestion des glucides).

👉 Contrairement aux hommes, ton environnement hormonal évolue tout au long du mois. C'est normal, et c'est une force quand tu sais t'y adapter.

🌙 2. Le cycle menstruel et ses phases

Un cycle dure en moyenne 28 jours (mais 24 à 35 jours reste normal).

🔹 Phase folliculaire (jours 1 à 14)

Les œstrogènes montent progressivement.
Plus d'énergie
Plus de force
Meilleure récupération
Meilleure sensibilité à l'insuline

👉 C'est ta fenêtre idéale pour les séances intenses et les charges lourdes.

🔹 Ovulation (~jour 14)

Pic d'œstrogènes → pic de force et d'énergie.

🔹 Phase lutéale (jours 15 à 28)

La progestérone monte.
Énergie qui baisse un peu
Température corporelle plus haute
Rétention d'eau
Fringales plus fréquentes (surtout sucré)

👉 Période idéale pour un travail plus modéré, plus de récupération, et de la bienveillance.

⚖️ 3. Poids, eau et appétit : décoder les variations

Ton poids sur la balance varie naturellement au cours du cycle.

⚠️ En phase prémenstruelle, la rétention d'eau peut te faire prendre 1 à 2 kg sur la balance — ce n'est pas de la masse grasse.

👉 Ne te pèse pas en te comparant d'une semaine à l'autre : regarde la tendance sur plusieurs cycles.

Les fringales lutéales sont physiologiques : ton corps dépense légèrement plus d'énergie à cette période. Un petit surplus contrôlé n'est pas un échec.

😵 4. Cortisol, stress & cycle

Le stress chronique perturbe directement ton équilibre hormonal :
Cycle irrégulier ou perturbé
Sommeil altéré
Fringales accrues
Récupération plus lente

👉 Gérer ton stress, c'est aussi protéger ton cycle.

⚠️ 5. Le piège du déficit trop agressif

Un déficit calorique trop sévère ou une masse grasse trop basse peuvent :
Dérégler ou stopper le cycle (aménorrhée)
Baisser l'énergie et la libido
Fragiliser les os
Favoriser les compulsions

👉 Chez la femme, la cohérence modérée est encore plus importante que l'extrême.

💪 6. Adapter l'entraînement au cycle

Folliculaire → intensité, force, progression
Lutéale → volume modéré, technique, mobilité
Règles → écoute ton corps : bouge si tu te sens bien, allège si besoin

👉 Tu n'es pas obligée d'être à 100 % tout le mois. Travailler avec ton cycle bat travailler contre lui.

🧠 À retenir
Ton environnement hormonal évolue chaque mois — c'est normal.
La phase folliculaire est ta fenêtre de performance.
La rétention d'eau prémenstruelle fausse la balance.
Le stress chronique perturbe le cycle.
Un déficit trop agressif dérègle l'équilibre hormonal.

🎯 Actions à mettre en place cette semaine

✅ 1. Repérer ta phase actuelle
Note le jour de ton cycle.

✅ 2. Planifier tes séances intenses
En phase folliculaire de préférence.

✅ 3. Ne pas paniquer face au poids
Surtout en phase prémenstruelle.

✅ 4. Prioriser le sommeil et la gestion du stress
Ils protègent ton cycle.

✅ 5. Éviter les déficits extrêmes
La cohérence modérée avant tout.$desc$
WHERE titre = 'Contenu pédagogique'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 8 %' AND f.titre = 'Formation Holistique Femmes' LIMIT 1);

-- ── 2) Quizz ──────────────────────────────────────────────────────────────
UPDATE formation_lecons
SET type = 'quizz',
    questions = $q$[
  {"id":"q_f8_1","question":"Pendant la phase folliculaire (début du cycle) :","options":[
    {"text":"Les œstrogènes montent et favorisent l'énergie et la force","correct":true},
    {"text":"La progestérone domine et augmente la fatigue","correct":false},
    {"text":"Le métabolisme s'effondre","correct":false}]},
  {"id":"q_f8_2","question":"La rétention d'eau prémenstruelle :","options":[
    {"text":"Fait varier le poids sur la balance sans être une prise de gras","correct":true},
    {"text":"Signifie que tu as pris de la masse grasse","correct":false},
    {"text":"Doit te faire réduire fortement les calories","correct":false}]},
  {"id":"q_f8_3","question":"Les fringales en phase lutéale :","options":[
    {"text":"Sont physiologiques et liées à un léger besoin calorique accru","correct":true},
    {"text":"Sont un signe de manque de volonté","correct":false},
    {"text":"Doivent être totalement ignorées","correct":false}]},
  {"id":"q_f8_4","question":"Un déficit calorique trop agressif chez la femme peut :","options":[
    {"text":"Perturber ou stopper le cycle menstruel","correct":true},
    {"text":"Accélérer sainement les résultats","correct":false},
    {"text":"N'avoir aucun impact hormonal","correct":false}]}
]$q$::jsonb
WHERE titre = 'QUIZ — Validation des acquis'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 8 %' AND f.titre = 'Formation Holistique Femmes' LIMIT 1);

-- ── 3) Renommer le module (en dernier) ────────────────────────────────────
UPDATE formation_modules
SET titre = 'MODULE 8 — Système Hormonal Féminin & Performance'
WHERE titre ILIKE 'MODULE 8 %'
  AND formation_id = (SELECT id FROM formations WHERE titre = 'Formation Holistique Femmes' LIMIT 1);
