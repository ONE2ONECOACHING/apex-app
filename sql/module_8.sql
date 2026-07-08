-- APEX — Module 8 : Système Hormonal Masculin & Performance — leçon + quizz

-- ── 1) Contenu pédagogique ────────────────────────────────────────────────
UPDATE formation_lecons
SET youtube_url = 'https://www.youtube.com/watch?v=mQPgHrWJryQ',
    description = $desc$🎯 Objectif du module

Comprendre comment ton environnement hormonal influence :
Ta composition corporelle
Ta récupération
Ta performance
Ton énergie
Ta motivation

À la fin de ce module, tu dois être capable de :
Identifier les facteurs qui impactent la testostérone
Comprendre le rôle du cortisol
Faire le lien entre masse grasse et équilibre hormonal
Mettre en place des leviers naturels d'optimisation

🧠 1. Les bases du système hormonal masculin

Les hormones sont des messagers chimiques.

Elles régulent :
La construction musculaire
Le stockage des graisses
L'énergie
La récupération
L'humeur

Chez l'homme, les hormones clés sont :
Testostérone
Cortisol
Insuline
Hormone de croissance (GH)

🔥 2. La testostérone : hormone centrale

La testostérone influence :
La masse musculaire
La force
La densité osseuse
La libido
La motivation

Un niveau optimal favorise :
Une meilleure récupération
Une meilleure recomposition corporelle
Une meilleure performance globale

⚠️ Facteurs qui diminuent la testostérone
Manque de sommeil
Stress chronique
Excès de masse grasse
Déficit calorique trop prolongé
Manque d'entraînement de résistance

👉 L'hygiène de vie influence directement ton environnement hormonal.

😵 3. Le cortisol : utile mais dangereux en excès

Le cortisol est l'hormone du stress.

À court terme, il est utile :
Mobilisation d'énergie
Vigilance
Réaction rapide

Mais chronique, il entraîne :
Stockage abdominal
Fatigue persistante
Baisse de testostérone
Récupération altérée

👉 Le problème n'est pas le cortisol.
👉 Le problème est son élévation constante.

⚖️ 4. Masse grasse & équilibre hormonal

Un excès de masse grasse influence négativement :
La sensibilité à l'insuline
La conversion hormonale
L'environnement anabolique

Plus le taux de masse grasse augmente :
Plus la résistance à l'insuline progresse
Plus la régulation hormonale se détériore

👉 La recomposition corporelle améliore aussi l'environnement hormonal.

💪 5. L'entraînement & les hormones

L'entraînement de résistance :
Stimule la testostérone
Améliore la sensibilité à l'insuline
Favorise la sécrétion de GH

Mais :
Trop de volume
Pas assez de récupération
Peuvent produire l'effet inverse.

🧠 À retenir
Les hormones influencent directement ta transformation.
La testostérone est sensible au sommeil, au stress et à la masse grasse.
Le cortisol chronique freine la progression.
L'entraînement bien structuré améliore l'environnement hormonal.
L'hygiène de vie est le premier levier d'optimisation.

🎯 Actions à mettre en place cette semaine

✅ 1. Prioriser le sommeil
Minimum 7 heures régulières.

✅ 2. Réduire les sources de stress inutile
Organisation, respiration, planification.

✅ 3. Maintenir un entraînement structuré
2 à 4 séances de résistance par semaine.

✅ 4. Éviter les déficits trop agressifs
Si perte de gras : progression modérée.

✅ 5. Surveiller ton tour de taille
Indicateur simple de santé métabolique.$desc$
WHERE titre = 'Contenu pédagogique'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 8 %' AND f.titre ILIKE '%holistique%' LIMIT 1);

-- ── 2) Quizz ──────────────────────────────────────────────────────────────
UPDATE formation_lecons
SET type = 'quizz',
    questions = $q$[
  {"id":"q_m8_1","question":"La testostérone influence :","options":[
    {"text":"La masse musculaire","correct":true},
    {"text":"La libido","correct":true},
    {"text":"La souplesse","correct":false}]},
  {"id":"q_m8_2","question":"Un cortisol chroniquement élevé peut :","options":[
    {"text":"Améliorer la récupération","correct":false},
    {"text":"Favoriser le stockage abdominal","correct":true},
    {"text":"Augmenter la testostérone","correct":false}]},
  {"id":"q_m8_3","question":"Un excès de masse grasse peut :","options":[
    {"text":"Améliorer la sensibilité à l'insuline","correct":false},
    {"text":"Perturber l'équilibre hormonal","correct":true},
    {"text":"Accélérer la prise de muscle","correct":false}]},
  {"id":"q_m8_4","question":"L'entraînement de résistance :","options":[
    {"text":"N'influence pas les hormones","correct":false},
    {"text":"Peut améliorer l'environnement hormonal","correct":true},
    {"text":"Diminue systématiquement la testostérone","correct":false}]}
]$q$::jsonb
WHERE titre = 'QUIZ — Validation des acquis'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 8 %' AND f.titre ILIKE '%holistique%' LIMIT 1);
