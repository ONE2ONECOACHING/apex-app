-- APEX — Module 9 : Comprendre pour décider (calories, énergie, supplémentation) — leçon + quizz

-- ── 1) Contenu pédagogique ────────────────────────────────────────────────
UPDATE formation_lecons
SET youtube_url = 'https://www.youtube.com/watch?v=O5bJkn8DiPg',
    description = $desc$🎯 Comprendre avant d'ajuster

À ce stade du parcours, tu as :
Structuré ton entraînement
Stabilisé ton alimentation
Observé des résultats visibles
Développé de la régularité

Il est normal que tu te poses maintenant des questions plus stratégiques :
Dois-je continuer à perdre du gras ?
Est-ce le bon moment pour augmenter légèrement mes calories ?
Comment éviter de reprendre du poids ?
Les suppléments sont-ils réellement utiles ?

👉 Ce module n'a pas pour but de te faire changer brutalement. Il a pour objectif de te donner la compréhension nécessaire pour décider intelligemment.

L'autonomie commence par la maîtrise des bases.

🧱 1. La règle fondamentale : la balance énergétique

Ton évolution physique dépend d'un principe simple : apports énergétiques vs dépenses énergétiques.
Si tu consommes plus que tu ne dépenses → prise de poids
Si tu consommes moins → perte de poids
Si tu consommes autant → maintien

Mais attention : perte de poids ≠ perte de gras.

Perdre du poids peut inclure :
Eau
Glycogène
Masse musculaire
Masse grasse

👉 L'objectif intelligent est toujours d'améliorer la composition corporelle.

🔢 2. Comprendre ta TDEE (dépense énergétique totale)

La TDEE correspond à l'énergie totale que ton corps dépense chaque jour.

Elle inclut :
Ton métabolisme de base
Ton activité physique
Ton NEAT (pas, mouvements quotidiens)
L'effet thermique des aliments

👉 C'est ton point d'ancrage stratégique.

Pour l'estimer, tu peux utiliser un calculateur énergétique en ligne.

Important : ce chiffre est une estimation. La réalité s'observe via :
Ton poids moyen
Tes photos
Tes performances
Tes sensations

🔻 3. Le déficit calorique intelligent

Si ton objectif est de perdre du gras :
Déficit modéré : –300 à –500 kcal

Un déficit trop agressif entraîne :
Fatigue
Baisse hormonale
Compulsions
Perte musculaire
Ralentissement métabolique

👉 La progressivité est plus durable que l'extrême.

Avant de réduire davantage les calories :
Augmente ton NEAT
Optimise ton sommeil
Maintiens tes performances

🔺 4. Quand augmenter ses calories (et quand éviter)

Augmenter ses calories n'est pas automatique.

Le taux de masse grasse de départ influence fortement :
L'environnement hormonal
La sensibilité à l'insuline
L'efficacité du surplus

👉 Plus le taux de masse grasse est élevé, moins l'augmentation calorique est efficace.

📊 Repères indicatifs de masse grasse (hommes)

🔹 10–15 % : environnement favorable, bonne sensibilité à l'insuline, augmentation calorique pertinente, progression musculaire plus efficace. Zone optimale pour progresser proprement.

🔹 15–20 % : zone intermédiaire, possible d'augmenter légèrement, surplus très modéré recommandé. Décision à nuancer selon ton objectif.

🔹 > 20 % : sensibilité à l'insuline moins optimale, risque de stockage de gras plus important, environnement moins favorable à la construction musculaire. Dans cette situation, continuer à perdre un peu de gras est souvent plus stratégique.

🎯 Comment estimer ton taux de masse grasse ?

Tu n'as pas besoin d'un examen médical complexe. Tu peux utiliser :
Le miroir
Des photos (face / profil / dos)
Ton tour de taille
Balance à impédancemétrie (repère évolutif)
Balance de salle type Tanita / InBody (indicateur, pas diagnostic absolu)

👉 L'objectif est de te situer dans une zone, pas d'avoir un chiffre parfait.

🔁 5. Si tu augmentes : fais-le intelligemment

Recommandation : +5 à +10 % maximum au-dessus de ta TDEE. +150 à +250 kcal au départ. Observation pendant 2 à 3 semaines.

Un surplus excessif :
N'accélère pas proportionnellement la construction musculaire
Augmente surtout le stockage de gras

💊 6. Supplémentation : hiérarchie des priorités

Avant de parler compléments :
Calories adaptées
Protéines suffisantes
Sommeil de qualité
Entraînement structuré

Les suppléments utiles :
Whey (si tu as du mal à atteindre ton quota de protéines)
Créatine monohydrate
Oméga 3
Magnésium
Vitamine D (si carence)

À éviter :
Brûleurs de graisse
Produits "détox"
Promesses marketing irréalistes

👉 Les suppléments optimisent. Ils ne remplacent jamais les bases.

🧠 À retenir
La balance énergétique reste la règle fondamentale.
Le déficit doit être modéré et progressif.
Le taux de masse grasse influence la pertinence d'une augmentation calorique.
Un surplus >10 % augmente surtout le stockage de gras.
Les suppléments sont secondaires par rapport aux bases.

🎯 Actions à mettre en place

✅ 1. Calculer ta TDEE
Note ton estimation actuelle.

✅ 2. Estimer ton taux de masse grasse
Situe-toi dans l'une des zones : 10–15 %, 15–20 %, > 20 %.

✅ 3. Identifier ta phase actuelle
Déficit, maintien ou légère augmentation ?

✅ 4. Clarifier ton objectif principal
Affiner ? Stabiliser ? Gagner en performance ? Un seul axe prioritaire.

✅ 5. Auditer ta supplémentation
Supprime ce qui est inutile.$desc$
WHERE titre = 'Contenu pédagogique'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 9 %' AND f.titre ILIKE '%holistique%' LIMIT 1);

-- ── 2) Quizz ──────────────────────────────────────────────────────────────
UPDATE formation_lecons
SET type = 'quizz',
    questions = $q$[
  {"id":"q_m9_1","question":"Un surplus supérieur à +10 % de ton TDEE :","options":[
    {"text":"Accélère fortement la construction musculaire","correct":false},
    {"text":"Augmente surtout le stockage de gras","correct":true},
    {"text":"Est indispensable pour progresser","correct":false}]},
  {"id":"q_m9_2","question":"Si ton taux de masse grasse est supérieur à 20 %, il est souvent plus pertinent de :","options":[
    {"text":"Augmenter fortement les calories","correct":false},
    {"text":"Continuer à perdre un peu de gras","correct":true},
    {"text":"Supprimer totalement les glucides","correct":false}]},
  {"id":"q_m9_3","question":"Un déficit trop agressif peut entraîner :","options":[
    {"text":"Une meilleure récupération","correct":false},
    {"text":"Une fatigue et une baisse hormonale","correct":true},
    {"text":"Une prise de muscle plus rapide","correct":false}]},
  {"id":"q_m9_4","question":"Les suppléments doivent :","options":[
    {"text":"Remplacer les bases nutritionnelles","correct":false},
    {"text":"Être la priorité en prise de masse","correct":false},
    {"text":"Arriver après calories, protéines, sommeil et entraînement","correct":true}]}
]$q$::jsonb
WHERE titre = 'QUIZ — Validation des acquis'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 9 %' AND f.titre ILIKE '%holistique%' LIMIT 1);
