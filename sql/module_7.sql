-- APEX — Module 7 : Psychologie de la Transformation — leçon + quizz

-- ── 1) Contenu pédagogique ────────────────────────────────────────────────
UPDATE formation_lecons
SET youtube_url = 'https://www.youtube.com/watch?v=Xku1nPM1XKs',
    description = $desc$🎯 Objectif du module

Comprendre pourquoi la motivation ne suffit pas, et comment construire une discipline durable basée sur l'identité, la structure et la constance.

À la fin de ce module, tu dois être capable de :
Distinguer motivation et discipline
Mettre en place un minimum non négociable
Gérer les écarts sans saboter ta progression
Construire une identité cohérente avec tes objectifs

🔥 1. Motivation vs discipline

La motivation est émotionnelle.

Elle varie selon :
Ton énergie
Ton stress
Ton sommeil
Ton environnement

La discipline est structurelle.

Elle repose sur :
Des règles simples
Des habitudes répétées
Un cadre clair

👉 La motivation te fait commencer.
👉 La discipline te fait continuer.

🧬 2. L'identité précède les résultats

Tu n'obtiens pas ce que tu veux. Tu obtiens ce que tu répètes.

Différence clé :
❌ "Je veux perdre du gras."
✅ "Je suis quelqu'un qui s'entraîne régulièrement et s'organise."

Quand ton identité change :
Tes décisions deviennent cohérentes
Tes écarts diminuent
Ta constance augmente

📉 3. Le piège du perfectionnisme

Beaucoup sabotent leur progression en voulant être parfaits.

Pensée typique : "Si ce n'est pas optimal, ça ne vaut rien."

Or :
👉 80 % de cohérence sur 6 mois bat 100 % pendant 2 semaines.

Le perfectionnisme mène souvent à :
Pression excessive
Fatigue mentale
Abandon

La constance imparfaite est supérieure.

🛑 4. La règle des 2 jours

Un écart n'est pas un problème. Deux écarts consécutifs créent une spirale.

Règle simple :
👉 Ne jamais manquer deux fois de suite.
Rater une séance = acceptable
Abandonner la semaine = dérive

Cette règle protège ton élan.

🧱 5. Le minimum non négociable

Définis 3 règles que tu respectes même en semaine chargée.

Exemples :
2 séances minimum
Protéines à chaque repas
8 000 pas quotidiens

👉 Le minimum maintient la trajectoire.

🔁 6. Écart vs rechute

Un écart est ponctuel. Une rechute est un abandon du cadre.

Après un écart :
Pas de punition
Pas de compensation extrême
Retour immédiat au plan

👉 Le problème n'est pas l'écart.
👉 Le problème est l'histoire que tu te racontes après.

🧠 À retenir
La motivation est instable, la discipline est construite.
L'identité influence les comportements.
La constance à 80 % est suffisante.
La règle des 2 jours évite la spirale d'abandon.
Le minimum non négociable protège ta progression.

🎯 Actions à mettre en place cette semaine

✅ 1. Définir ton minimum non négociable
Choisis 3 règles simples et réalistes.

✅ 2. Appliquer la règle des 2 jours
Note-la quelque part si nécessaire.

✅ 3. Écrire ta phrase d'identité
"Je suis quelqu'un qui …"

✅ 4. Planifier 10 minutes chaque dimanche
Organisation = réduction du stress décisionnel.

✅ 5. Revenir immédiatement au plan après tout écart
Pas de compensation. Pas de restriction punitive.$desc$
WHERE titre = 'Contenu pédagogique'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 7 %' AND f.titre ILIKE '%holistique%' LIMIT 1);

-- ── 2) Quizz ──────────────────────────────────────────────────────────────
UPDATE formation_lecons
SET type = 'quizz',
    questions = $q$[
  {"id":"q_m7_1","question":"La motivation est :","options":[
    {"text":"Stable et constante","correct":false},
    {"text":"Variable et émotionnelle","correct":true},
    {"text":"Identique à la discipline","correct":false}]},
  {"id":"q_m7_2","question":"La règle des 2 jours sert à :","options":[
    {"text":"Doubler les entraînements","correct":false},
    {"text":"Éviter la spirale d'abandon","correct":true},
    {"text":"Réduire les calories","correct":false}]},
  {"id":"q_m7_3","question":"Le minimum non négociable permet :","options":[
    {"text":"D'accélérer brutalement la perte de gras","correct":false},
    {"text":"De maintenir la cohérence même en période difficile","correct":true},
    {"text":"De s'entraîner tous les jours","correct":false}]}
]$q$::jsonb
WHERE titre = 'QUIZ — Validation des acquis'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 7 %' AND f.titre ILIKE '%holistique%' LIMIT 1);
