-- APEX — Module 4 : Nutrition Santé & Gestion du Stress (leçon + quizz)
-- Dollar-quoting ($tag$) → pas besoin d'échapper apostrophes / retours ligne.

-- ── 1) Contenu pédagogique (vidéo + texte) ────────────────────────────────
UPDATE formation_lecons
SET youtube_url = 'https://www.youtube.com/watch?v=njrw37Snbjg',
    description = $desc$🎯 Objectif du module

Garder une alimentation cohérente en vacances ou au restaurant
Lire une étiquette alimentaire intelligemment
Comprendre l'impact réel du stress sur ton corps
Mettre en place des outils simples pour réguler ton système nerveux

🏖 1. Adapter son alimentation en vacances ou au restaurant

L'objectif n'est pas d'être parfait. L'objectif est de maintenir une cohérence globale.

Ton corps ne fait pas la différence entre un repas à la maison et un repas au bord de la mer. Ce qui compte, c'est la moyenne calorique sur la semaine.

🌴 En vacances

Applique la règle du 80 / 20 :
80 % de repas équilibrés
20 % de flexibilité maîtrisée

Évite :
De sauter un repas pour "compenser"
D'enchaîner plusieurs excès
De tomber dans le mode "tout ou rien"

Bouge naturellement :
Marche
Nage
Randonnée
Vélo

👉 L'activité spontanée compense largement quelques plaisirs maîtrisés.

🍽 Au restaurant

Structure simple :
Entrée : salade, crudités, soupe.
Plat : source de protéines + légumes + féculents simples.
Dessert : fruit, sorbet ou dessert partagé.
Boissons : eau en priorité. Si alcool → un verre maximum.

👉 Ce n'est pas un repas plaisir qui pose problème. C'est l'accumulation sans cadre.

🏷 2. Savoir lire une étiquette & comprendre les labels

Lire une étiquette, c'est reprendre le contrôle.

Le marketing vend une image. Les ingrédients racontent la vérité.

🔎 La liste des ingrédients
Plus elle est courte, mieux c'est.
Les ingrédients sont classés par ordre de quantité.
Si sucre ou sirop apparaissent dans les 3 premiers → produit ultra-transformé.

Méfie-toi des synonymes :
Maltodextrine
Sirop de fructose
Amidon modifié
Huile végétale hydrogénée

👉 Ce sont souvent des sucres ou des graisses cachées.

🔢 Les valeurs nutritionnelles (pour 100 g)

Repères simples :
Protéines : > 10 g = bonne source
Sucres simples : idéalement < 10 g
Lipides saturés : < 3 g
Fibres : > 2 g = intéressant

🏅 Les labels alimentaires
Label Rouge → qualité gustative
AB / Bio → sans pesticides, mais pas forcément plus nutritif
Bleu Blanc Cœur → meilleur profil en Oméga 3
AOP / IGP → respect du terroir

👉 Astuce : si tu ne comprends pas la moitié des ingrédients, le produit n'est probablement pas fait pour toi.

😵 3. Comprendre l'impact du stress

Le stress est une réaction naturelle.

À court terme → utile. À long terme → destructeur.

Quand tu es stressé, ton système nerveux sympathique s'active :
Rythme cardiaque augmente
Respiration accélérée
Libération d'adrénaline et de cortisol

Ce mécanisme est utile ponctuellement. Mais chronique, il crée un déséquilibre.

⚠️ Conséquences d'un stress chronique
Cortisol élevé → rétention d'eau & stockage abdominal
Baisse de testostérone
Digestion perturbée
Sommeil altéré
Fatigue chronique
Difficulté à perdre du gras malgré un bon plan

👉 L'objectif n'est pas d'éliminer le stress. L'objectif est d'équilibrer sympathique et parasympathique.

🌬 4. Pratiques de relaxation de base

La respiration est le pont entre le corps et le mental.

🫁 Respiration 4-7-8
Inspire 4 secondes
Garde 7 secondes
Expire 8 secondes
Répète 3 à 5 cycles

Effets :
Ralentit le rythme cardiaque
Diminue la tension
Facilite l'endormissement

💓 Cohérence cardiaque
Inspire 5 secondes
Expire 5 secondes
Pendant 5 minutes
3 fois par jour

Des études montrent :
Réduction du stress de 20 à 30 % en 2 semaines
Amélioration du sommeil
Meilleure concentration

🧠 5. Gérer la charge mentale

Le stress vient souvent d'un manque de contrôle perçu.

Quand tout semble urgent, ton cerveau reste en alerte permanente.

🛠 Outils simples
Décharge mentale : écris tout ce que tu as en tête
Méthode Eisenhower : important / urgent
Planifie tes moments essentiels (sommeil, sport, repas)
Apprends à dire non

👉 Un mental organisé = un corps plus performant.

🧠 À retenir
La cohérence compte plus que la perfection.
Lire une étiquette permet d'éviter les pièges marketing.
Le stress chronique perturbe hormones, sommeil et digestion.
Les techniques respiratoires régulent le cortisol.
L'organisation réduit fortement la charge mentale.

🎯 Actions à mettre en place cette semaine

✅ 1. Appliquer la règle du 80/20
80 % de repas équilibrés, 20 % de flexibilité maîtrisée.

✅ 2. Lire une étiquette par jour
Analyse ingrédients, valeurs nutritionnelles et labels.

✅ 3. Pratiquer la respiration 4-7-8
3 à 5 cycles le soir avant de dormir.

✅ 4. Tester la cohérence cardiaque
5 minutes, 3 fois par jour.

✅ 5. Organiser ta semaine
Note tes tâches et planifie sommeil, repas et entraînement.$desc$
WHERE titre = 'Contenu pédagogique'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 4 %' AND f.titre ILIKE '%holistique%' LIMIT 1);

-- ── 2) Quizz ──────────────────────────────────────────────────────────────
UPDATE formation_lecons
SET type = 'quizz',
    questions = $q$[
  {"id":"q_m4_1","question":"La règle du 80/20 signifie :","options":[
    {"text":"80 % de discipline stricte, 20 % de relâchement total","correct":false},
    {"text":"80 % de calories issues des protéines, 20 % des lipides","correct":false},
    {"text":"80 % de cohérence alimentaire, 20 % de flexibilité maîtrisée","correct":true}]},
  {"id":"q_m4_2","question":"Si le sucre apparaît dans les 3 premiers ingrédients, cela signifie :","options":[
    {"text":"Que le produit contient principalement des fibres","correct":false},
    {"text":"Que le produit est fortement transformé et riche en sucres ajoutés","correct":true},
    {"text":"Que le produit est adapté à une perte de gras","correct":false}]},
  {"id":"q_m4_3","question":"Un stress chronique prolongé peut entraîner :","options":[
    {"text":"Une amélioration de la digestion grâce à l'adrénaline","correct":false},
    {"text":"Une augmentation du cortisol avec un impact sur le stockage abdominal","correct":true},
    {"text":"Une baisse du cortisol et une perte de gras facilitée","correct":false}]}
]$q$::jsonb
WHERE titre = 'QUIZ — Validation des acquis'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 4 %' AND f.titre ILIKE '%holistique%' LIMIT 1);
