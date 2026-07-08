-- APEX — Module 5 : Sommeil Santé (Partie 1) — leçon + quizz

-- ── 1) Contenu pédagogique ────────────────────────────────────────────────
UPDATE formation_lecons
SET youtube_url = 'https://www.youtube.com/watch?v=GXyv0j5T2Jw',
    description = $desc$🎯 Objectif du module

Comprendre pourquoi le sommeil est un pilier fondamental de ta santé, de ta récupération et de ta progression physique.

À la fin de ce module, tu dois être capable de :
Expliquer le rôle biologique du sommeil
Comprendre les différentes phases du sommeil
Identifier les facteurs qui perturbent ton rythme circadien
Faire le lien entre manque de sommeil et dérèglement hormonal

🧠 1. Comprendre le rôle du sommeil

Le sommeil n'est pas une perte de temps. C'est une phase active de régénération biologique.

Pendant que tu dors, ton organisme :
Répare les tissus musculaires
Consolide la mémoire
Régule les hormones
Recharge les réserves énergétiques
Stabilise le système nerveux

Un bon sommeil permet de :
Favoriser la récupération physique
Maintenir la clarté mentale
Réguler les émotions
Soutenir l'immunité
Optimiser le fonctionnement hormonal

👉 À l'inverse, un manque de sommeil répété perturbe l'ensemble de ces mécanismes.

🔄 2. Les phases du sommeil

Chaque nuit est composée de cycles d'environ 90 minutes.

Une nuit réparatrice comprend entre 4 et 6 cycles, soit environ 6 à 9 heures de sommeil.

🌗 Sommeil léger (≈ 50 %)
Phase de transition
Ralentissement progressif
Baisse de la température corporelle

🌑 Sommeil profond (≈ 20 à 25 %)

C'est la phase de régénération physique.
Pic d'hormone de croissance (GH)
Réparation musculaire
Recharge énergétique

👉 Essentiel pour la récupération.

🌙 Sommeil paradoxal (≈ 20 à 25 %)
Activité cérébrale élevée
Rêves
Consolidation de la mémoire
Régulation émotionnelle

👉 Clé pour la performance cognitive et la stabilité mentale.

⏰ 3. Le rythme circadien : ton horloge interne

Ton corps suit un cycle biologique d'environ 24 heures : le rythme circadien.

Il régule :
Le sommeil
L'énergie
La faim
La température corporelle
La production hormonale

Le principal régulateur : la lumière.

🌅 Le matin

La lumière naturelle :
Bloque la mélatonine
Stimule le cortisol
Augmente la vigilance

🌆 Le soir

La baisse de luminosité :
Relance la production de mélatonine
Prépare ton corps à l'endormissement

👉 Des horaires irréguliers ou une exposition prolongée aux écrans perturbent ce mécanisme.

⚠️ 4. Les facteurs qui perturbent le sommeil

Plusieurs éléments altèrent la qualité du sommeil :
📱 Lumière bleue (écrans) → retarde la mélatonine
😵 Stress chronique → maintient l'alerte
🍽 Repas lourds ou tardifs → ralentissent l'endormissement
☕ Caféine tardive → réduit le sommeil profond
🍷 Alcool → perturbe les cycles
🏃 Manque d'activité physique → moins de fatigue naturelle

Ces perturbations répétées dérèglent ton équilibre nerveux et hormonal.

🔬 5. Les conséquences d'un manque de sommeil

Le manque de sommeil impacte directement :
Ta composition corporelle
Ton métabolisme
Ton équilibre hormonal

⚖️ Sur le plan hormonal
⬇️ Baisse de testostérone
⬇️ Baisse d'hormone de croissance (GH)
⬆️ Hausse du cortisol
⬇️ Baisse de leptine (satiété)
⬆️ Hausse de ghréline (faim)
⬇️ Sensibilité à l'insuline

👉 Résultat : plus d'appétit, plus de stockage, moins de récupération.

🧠 Sur le plan cognitif
Baisse de concentration
Irritabilité
Manque de motivation
Diminution des performances

🧠 À retenir
Le sommeil est une phase active et indispensable de régénération.
Chaque cycle de 90 minutes contient des phases essentielles à la récupération.
Le rythme circadien est piloté par la lumière.
Les écrans et les horaires irréguliers perturbent ce rythme.
Un manque de sommeil chronique dérègle hormones, appétit et progression.

🎯 Actions à mettre en place cette semaine

✅ 1. Se coucher et se réveiller à la même heure
Même le week-end si possible. La régularité renforce ton rythme circadien.

✅ 2. Couper les écrans 45 à 60 minutes avant le coucher
Pas de téléphone, ordinateur ou télévision.

✅ 3. Optimiser l'environnement
Chambre sombre
Température 18–19 °C
Silence ou bruit blanc

✅ 4. Limiter les excitants
Stop caféine après 14h
Éviter alcool le soir
Dîner léger$desc$
WHERE titre = 'Contenu pédagogique'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 5 %' AND f.titre ILIKE '%holistique%' LIMIT 1);

-- ── 2) Quizz ──────────────────────────────────────────────────────────────
UPDATE formation_lecons
SET type = 'quizz',
    questions = $q$[
  {"id":"q_m5_1","question":"Un cycle de sommeil dure environ :","options":[
    {"text":"45 minutes","correct":false},
    {"text":"90 minutes","correct":true},
    {"text":"3 heures","correct":false}]},
  {"id":"q_m5_2","question":"Le sommeil profond est essentiel car il permet :","options":[
    {"text":"La production d'adrénaline","correct":false},
    {"text":"La réparation musculaire et la sécrétion de GH","correct":true},
    {"text":"L'augmentation du cortisol","correct":false}]},
  {"id":"q_m5_3","question":"La lumière bleue le soir :","options":[
    {"text":"Favorise la production de mélatonine","correct":false},
    {"text":"Retarde l'endormissement","correct":true},
    {"text":"Améliore la récupération","correct":false}]},
  {"id":"q_m5_4","question":"Un manque de sommeil peut :","options":[
    {"text":"Diminuer l'appétit","correct":false},
    {"text":"Augmenter le cortisol et la faim","correct":true},
    {"text":"Accélérer la prise de muscle","correct":false}]}
]$q$::jsonb
WHERE titre = 'QUIZ — Validation des acquis'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 5 %' AND f.titre ILIKE '%holistique%' LIMIT 1);
