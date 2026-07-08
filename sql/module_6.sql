-- APEX — Module 6 : Sommeil Santé (Partie 2) & TCA — leçon + quizz

-- ── 1) Contenu pédagogique ────────────────────────────────────────────────
UPDATE formation_lecons
SET youtube_url = 'https://www.youtube.com/watch?v=GLAC2z56dkI',
    description = $desc$🎯 Objectif du module

Approfondir l'optimisation du sommeil et comprendre le lien entre restriction excessive, stress et troubles du comportement alimentaire.

À la fin de ce module, tu dois être capable de :
Mettre en place une routine complète d'endormissement
Comprendre les mécanismes des compulsions alimentaires
Identifier les signaux d'alerte d'un rapport déséquilibré à l'alimentation
Éviter les stratégies extrêmes contre-productives

🌙 1. Optimiser concrètement son sommeil

Dans le module précédent, tu as compris l'importance du sommeil. Ici, on passe à l'optimisation concrète.

🛌 Créer une routine pré-sommeil

Ton cerveau a besoin d'un signal clair pour comprendre que la journée est terminée.

Routine simple (30 à 60 minutes avant le coucher) :
Lumière tamisée
Pas d'écran
Lecture légère ou étirements
Respiration calme

👉 La répétition crée l'automatisme.

🌡 Température & environnement

Le corps s'endort plus facilement lorsque la température interne baisse.

Optimise :
Chambre entre 18–19 °C
Obscurité complète
Pas de lumière LED
Téléphone hors du lit

☀️ Exposition matinale à la lumière

Expose-toi à la lumière naturelle dès le réveil :
Marche matinale
Lumière extérieure
Rideaux ouverts

Cela synchronise ton rythme circadien.

🍽 2. Comprendre les troubles du comportement alimentaire (TCA)

Les TCA ne concernent pas uniquement des cas extrêmes.

Ils commencent souvent par :
Restriction excessive
Rigidité alimentaire
Culpabilité après un écart
Alternance restriction / compulsion

🔁 Le cycle restriction – compulsion
Restriction sévère
Frustration
Perte de contrôle
Culpabilité
Nouvelle restriction

👉 Ce cycle détruit la relation à l'alimentation.

⚠️ Signaux d'alerte
Obsession constante pour la nourriture
Éviter des situations sociales par peur de manger
Se peser plusieurs fois par jour
Compensations excessives (cardio, jeûne prolongé)

Une transformation durable ne repose pas sur la punition.

⚖️ 3. Pourquoi la restriction excessive est contre-productive

Un déficit trop agressif entraîne :
Baisse de la leptine
Hausse de la ghréline
Augmentation des envies sucrées
Fatigue mentale

Plus tu restreins brutalement, plus ton corps résiste.

👉 La cohérence modérée bat l'extrême instable.

🧠 4. Stabiliser son rapport à l'alimentation

Quelques principes simples :
Ne pas supprimer totalement un macronutriment
Éviter les règles absolues ("jamais", "interdit")
Maintenir des repas structurés
Revenir au plan après un écart, sans compensation

Ton objectif n'est pas d'être parfait. Ton objectif est d'être constant.

🧠 À retenir
Le sommeil s'optimise par la régularité et la routine.
L'exposition matinale à la lumière améliore le rythme circadien.
La restriction excessive favorise les compulsions.
Le cycle restriction / culpabilité détruit la progression.
Une transformation durable repose sur la stabilité, pas l'extrême.

🎯 Actions à mettre en place cette semaine

✅ 1. Mettre en place une routine pré-sommeil
Choisis 2 à 3 habitudes fixes chaque soir.

✅ 2. T'exposer à la lumière naturelle le matin
Au moins 5 à 10 minutes dès le réveil.

✅ 3. Identifier ton niveau de restriction
Demande-toi :
Est-ce que je me prive excessivement ?
Est-ce que je compense (trop) après un écart ?

✅ 4. Si il y a, supprimer une règle alimentaire extrême
Exemple :
"Plus jamais de glucides le soir"
"Interdit de manger au restaurant"

✅ 5. Revenir au plan immédiatement après un écart
Pas de compensation. Pas de punition. Juste cohérence.$desc$
WHERE titre = 'Contenu pédagogique'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 6 %' AND f.titre ILIKE '%holistique%' LIMIT 1);

-- ── 2) Quizz ──────────────────────────────────────────────────────────────
UPDATE formation_lecons
SET type = 'quizz',
    questions = $q$[
  {"id":"q_m6_1","question":"Une routine pré-sommeil sert à :","options":[
    {"text":"Stimuler le système nerveux","correct":false},
    {"text":"Envoyer un signal de transition vers le repos","correct":true},
    {"text":"Augmenter le métabolisme","correct":false}]},
  {"id":"q_m6_2","question":"Le cycle restriction / compulsion est souvent déclenché par :","options":[
    {"text":"Un excès de protéines","correct":false},
    {"text":"Une restriction alimentaire trop agressive","correct":true},
    {"text":"Trop de sommeil","correct":false}]},
  {"id":"q_m6_3","question":"Une exposition à la lumière naturelle le matin :","options":[
    {"text":"Perturbe le rythme circadien","correct":false},
    {"text":"Améliore la synchronisation biologique","correct":true},
    {"text":"Augmente la production de mélatonine","correct":false}]},
  {"id":"q_m6_4","question":"Après un écart alimentaire, la meilleure stratégie est :","options":[
    {"text":"Jeûner le lendemain","correct":false},
    {"text":"Ajouter 1h de cardio","correct":false},
    {"text":"Revenir immédiatement au plan sans compensation","correct":true}]}
]$q$::jsonb
WHERE titre = 'QUIZ — Validation des acquis'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 6 %' AND f.titre ILIKE '%holistique%' LIMIT 1);
