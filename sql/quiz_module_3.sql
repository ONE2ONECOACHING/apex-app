-- APEX — Quizz Module 3 (Tracker ses calories & Optimiser sa digestion)
UPDATE formation_lecons
SET type = 'quizz',
    questions = '[
  {"id":"q_m3_1","question":"Pourquoi le tracking est-il utile ?","options":[
    {"text":"Pour manger moins automatiquement","correct":false},
    {"text":"Pour objectiver les apports caloriques","correct":true},
    {"text":"Pour supprimer les glucides","correct":false}]},
  {"id":"q_m3_2","question":"Un déficit calorique signifie :","options":[
    {"text":"Supprimer les lipides","correct":false},
    {"text":"Consommer moins que sa dépense énergétique","correct":true},
    {"text":"Faire plus de cardio uniquement","correct":false}]},
  {"id":"q_m3_3","question":"Bien mastiquer permet :","options":[
    {"text":"D''augmenter le métabolisme","correct":false},
    {"text":"D''améliorer la digestion et la satiété","correct":true},
    {"text":"De brûler plus de calories","correct":false}]}
]'::jsonb
WHERE titre = 'QUIZ — Validation des acquis'
  AND module_id = (
    SELECT m.id FROM formation_modules m
    JOIN formations f ON f.id = m.formation_id
    WHERE m.titre ILIKE 'MODULE 3 %' AND f.titre ILIKE '%holistique%'
    LIMIT 1
  );
