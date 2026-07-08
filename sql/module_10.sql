-- APEX — Module 10 : Stabiliser ses résultats & ne plus repartir de zéro — leçon + quizz

-- ── 1) Contenu pédagogique ────────────────────────────────────────────────
UPDATE formation_lecons
SET youtube_url = 'https://www.youtube.com/watch?v=JrgtFSXuOb0',
    description = $desc$🎯 La vraie réussite commence maintenant

Perdre du gras est une étape. Rester en forme durablement est le vrai défi.

Beaucoup d'hommes :
Font des efforts pendant 3 à 6 mois
Obtiennent des résultats
Relâchent progressivement
Reprennent le poids perdu

👉 L'objectif de ce module est simple : t'apprendre à ne plus jamais revenir en arrière.

Tu n'as pas besoin d'un nouveau programme. Tu as besoin d'un système stable.

🏆 1. Le maintien : la vraie victoire

Le maintien n'est pas une pause.

C'est :
La preuve que tu maîtrises
La validation de ton autonomie
L'objectif réel long terme

Un maintien réussi signifie :
Poids stable
Énergie stable
Performances stables
Relation apaisée avec l'alimentation

👉 Ce n'est pas être parfait. C'est être cohérent.

🔀 2. Les trois situations possibles après le suivi

🔹 1. Tu es satisfait de ton physique

C'est la situation idéale. Priorité : maintien.

Continue :
Tes 2 à 4 séances par semaine
Tes bases nutritionnelles
Ton suivi léger

Objectif : stabilité sur le long terme.

🔹 2. Tu veux encore affiner légèrement

Possible. Mais :
Déficit léger
Pas de restriction extrême
Pas de pression inutile

Un ajustement temporaire suffit.

🔹 3. Tu veux progresser en performance

Tu peux augmenter légèrement tes calories. Pas pour "faire une prise de masse", mais pour :
Être plus fort
Être plus dense
Améliorer tes performances

Toujours progressivement.

🛡 3. Le système anti-reprise

La reprise de poids ne vient pas d'un week-end. Elle vient :
D'un relâchement progressif
De l'arrêt du suivi
De la perte de repères

Installe un système simple :
1 à 2 pesées par semaine
2 à 3 règles non négociables
Un seuil d'alerte clair

📌 Le seuil d'alerte

Définis ton poids de forme. Si ton poids dépasse +2 kg au-dessus de ton poids de référence :

👉 Tu ajustes immédiatement. Petit déficit léger pendant 2 semaines, puis retour au maintien.

Pas de régime. Pas de panique.

🔧 4. La règle des micro-ajustements

L'autonomie consiste à corriger tôt.

Si dérive légère : –200 kcal ou +2 000 pas par jour, pendant 10 à 14 jours. Puis réévaluer.

👉 Les petits ajustements évitent les grandes corrections.

🧱 5. Les règles non négociables

Choisis 2 à 3 règles simples que tu maintiens toute l'année.

Exemples :
Minimum 3 séances par semaine
Protéines à chaque repas
8 000 pas minimum
7 heures de sommeil

Ce sont tes garde-fous.

🔭 6. Vision long terme réaliste

Ton objectif n'est pas d'être au plus sec de ta vie toute l'année.

Ton objectif est :
D'être en forme
D'avoir de l'énergie
D'être fort
De rester stable

80 % de cohérence suffit. La stabilité bat la perfection.

🧠 À retenir
Le maintien est la vraie réussite.
Les petits ajustements évitent les grandes reprises.
L'autonomie = corriger tôt sans paniquer.
La constance est plus importante que l'intensité.

🎯 Actions à mettre en place

✅ 1. Définir ton poids de forme
Un intervalle réaliste de référence.

✅ 2. Mettre en place 2 à 3 règles non négociables
Écris-les clairement.

✅ 3. Te peser 1 à 2 fois par semaine
Analyse la tendance, pas la journée.

✅ 4. Fixer ton seuil d'alerte (+2 kg)
Décide à l'avance de ton plan correctif.

✅ 5. Planifier un point mensuel
Une fois par mois : photos, poids moyen, bilan rapide.$desc$
WHERE titre = 'Contenu pédagogique'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 10 %' AND f.titre ILIKE '%holistique%' LIMIT 1);

-- ── 2) Quizz ──────────────────────────────────────────────────────────────
UPDATE formation_lecons
SET type = 'quizz',
    questions = $q$[
  {"id":"q_m10_1","question":"Le maintien signifie :","options":[
    {"text":"Arrêter toute structure","correct":false},
    {"text":"Stabiliser ses résultats avec des repères","correct":true},
    {"text":"Repartir en régime","correct":false}]},
  {"id":"q_m10_2","question":"Si ton poids dépasse de 2 kg ton poids de forme :","options":[
    {"text":"Tu ignores","correct":false},
    {"text":"Tu lances un régime drastique","correct":false},
    {"text":"Tu appliques un ajustement léger et temporaire","correct":true}]},
  {"id":"q_m10_3","question":"L'objectif long terme est :","options":[
    {"text":"Être au maximum toute l'année","correct":false},
    {"text":"Être stable et en forme durablement","correct":true},
    {"text":"Changer d'objectif chaque mois","correct":false}]},
  {"id":"q_m10_4","question":"L'autonomie signifie :","options":[
    {"text":"Improviser","correct":false},
    {"text":"Corriger tôt et intelligemment","correct":true},
    {"text":"Supprimer tout suivi","correct":false}]}
]$q$::jsonb
WHERE titre = 'QUIZ — Validation des acquis'
  AND module_id = (
    SELECT m.id FROM formation_modules m JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 10 %' AND f.titre ILIKE '%holistique%' LIMIT 1);
