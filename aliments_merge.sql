-- ============================================================
-- APEX APP — Merge ancienne BDD aliments
-- Coller dans Supabase SQL Editor
-- Insère uniquement les aliments absents (pas de doublons)
-- ============================================================

INSERT INTO aliments_bdd (nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
SELECT v.nom, v.calories, v.proteines, v.glucides, v.lipides, v.fibres, v.mode, v.categorie
FROM (VALUES

  -- 🧀 PRODUITS LAITIERS
  ('Carré frais 0%',               44,  8.0,  3.0,  0.1,  0.0, NULL,   'laitier'),
  ('Comté',                        400, 27.0,  0.5, 32.0,  0.0, NULL,   'laitier'),
  ('Fromage blanc 3%',              65,  7.0,  4.0,  3.0,  0.0, NULL,   'laitier'),

  -- 🌾 CÉRÉALES / FÉCULENTS
  ('Céréales Coco Pops',           387,  5.0, 85.0,  2.5,  2.0, NULL,   'feculent'),
  ('Crème de riz',                 370,  7.0, 83.0,  0.5,  1.0, NULL,   'feculent'),
  ('Farine d''avoine Good Morning', 356, 12.0, 57.4,  6.1, 13.5, NULL,   'feculent'),
  ('Riz basmati pesé cru',         348,  8.0, 77.0,  0.5,  1.0, NULL,   'feculent'),
  ('Riz complet pesé cru',         355,  7.5, 74.0,  2.7,  3.5, NULL,   'feculent'),
  ('Sarrasin pesé cru',            343, 13.0, 72.0,  3.4, 10.0, NULL,   'feculent'),
  ('Sarrasin pesé cuit',            92,  3.4, 20.0,  0.6,  2.7, NULL,   'feculent'),
  ('Semoule pesé cru',             360, 12.0, 73.0,  1.5,  3.5, NULL,   'feculent'),
  ('Semoule pesé cuit',            120,  4.0, 25.0,  0.5,  1.2, NULL,   'feculent'),
  ('Boulgour pesé cru',            342, 12.0, 68.0,  1.3, 18.0, NULL,   'feculent'),
  ('Patate douce pesé cru',         86,  1.6, 20.0,  0.1,  3.0, NULL,   'feculent'),
  ('Patate pesée cru',              77,  2.0, 17.0,  0.1,  2.2, NULL,   'feculent'),

  -- 🫘 LÉGUMINEUSES (pesées crues)
  ('Haricots blancs pesé cru',     330, 21.0, 55.0,  1.5, 16.0, NULL,   'legumineuse'),
  ('Haricots rouges pesé cru',     333, 22.0, 56.0,  1.5, 15.0, NULL,   'legumineuse'),
  ('Lentilles corail pesé cru',    330, 23.0, 55.0,  1.5,  6.0, NULL,   'legumineuse'),
  ('Lentilles vertes pesé cru',    320, 24.0, 50.0,  1.5, 11.0, NULL,   'legumineuse'),
  ('Pois chiches pesé cru',        364, 19.0, 61.0,  6.0, 17.0, NULL,   'legumineuse'),

  -- 🍓 FRUITS
  ('Fruits rouges (mix)',           40,  0.8,  7.0,  0.3,  3.0, NULL,   'fruit'),

  -- 🐟 POISSONS
  ('Thon frais',                   130, 28.0,  0.0,  1.3,  0.0, NULL,   'poisson'),

  -- 🥚 OEUFS
  ('Blanc d''oeuf liquide ml',      52, 11.0,  0.7,  0.2,  0.0, NULL,   'oeuf'),

  -- 🍝 CONDIMENTS / SAUCES
  ('Sauce bolognaise',             140,  8.0,  4.0, 10.0,  0.0, NULL,   'condiment'),
  ('Sauce carbonara',              130,  4.0,  5.0, 11.0,  0.0, NULL,   'condiment'),
  ('Sauce pesto rouge',            635, 10.0,  7.0, 63.0,  0.0, NULL,   'condiment'),
  ('Sauce pesto vert',             635, 10.0,  7.0, 63.0,  0.0, NULL,   'condiment'),

  -- 🍯 SUCRES
  ('Sirop d''érable',              260,  0.0, 67.0,  0.0,  0.0, NULL,   'sucre'),

  -- 🥩 VIANDE (pesée crue)
  ('Steak haché 10% MG',           175, 19.0,  0.0, 11.0,  0.0, NULL,   'viande'),

  -- 🥩 UNITÉS — VIANDE
  ('Bacon 1 tranche',               47,  3.6,  0.0,  3.5,  0.0, 'unit', 'viande'),

  -- 🥚 UNITÉS — OEUFS
  ('Blanc d''oeuf 1 pièce',         17,  3.6,  0.2,  0.1,  0.0, 'unit', 'oeuf'),

  -- 🍌 UNITÉS — FRUITS
  ('Banane 1 moyenne',             107,  1.3, 24.0,  0.4,  3.1, 'unit', 'fruit'),
  ('Clémentine 1 pièce',            33,  0.6,  7.0,  0.1,  1.2, 'unit', 'fruit'),
  ('Kiwi 1 moyen',                  46,  0.8,  9.0,  0.4,  2.3, 'unit', 'fruit'),
  ('Orange 1 moyenne',              94,  1.8, 18.8,  0.2,  4.8, 'unit', 'fruit'),
  ('Poire 1 moyenne',              103,  0.7, 21.6,  0.2,  5.6, 'unit', 'fruit'),
  ('Pomme 1 moyenne',               94,  0.5, 21.6,  0.4,  4.3, 'unit', 'fruit'),

  -- 🍞 UNITÉS — PAIN
  ('Pain blanc 1 tranche',          80,  2.4, 15.0,  0.9,  0.9, 'unit', 'feculent'),
  ('Pain complet 1 tranche',       100,  3.6, 17.6,  1.4,  2.8, 'unit', 'feculent'),
  ('Pain de seigle 1 tranche',      84,  3.0, 16.1,  0.6,  2.1, 'unit', 'feculent')

) AS v(nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
WHERE NOT EXISTS (
  SELECT 1 FROM aliments_bdd a WHERE a.nom = v.nom
);
