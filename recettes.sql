-- ============================================================
--  APEX APP — Table RECETTES + seed 26 recettes
--  À exécuter dans l'éditeur SQL Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS recettes (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  nom              TEXT    NOT NULL,
  categorie        TEXT    NOT NULL,   -- petit_dej_sale | petit_dej_sucre | salade | riz | pates
  ingredients      JSONB   NOT NULL DEFAULT '[]'::jsonb,
  preparation      TEXT,
  base_kcal        INTEGER NOT NULL,
  base_proteines   NUMERIC(6,1) NOT NULL DEFAULT 0,
  base_glucides    NUMERIC(6,1) NOT NULL DEFAULT 0,
  base_lipides     NUMERIC(6,1) NOT NULL DEFAULT 0,
  protein_boost    JSONB,   -- ingredient bonus option +protéines
  actif            BOOLEAN DEFAULT true,
  position         INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recettes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recettes_read" ON recettes;
CREATE POLICY "recettes_read"
  ON recettes FOR SELECT
  TO authenticated
  USING (actif = true);

-- ============================================================
--  SEED — 26 recettes
-- ============================================================

INSERT INTO recettes (nom, categorie, ingredients, preparation, base_kcal, base_proteines, base_glucides, base_lipides, protein_boost, position) VALUES

-- ── PETIT-DÉJEUNER SALÉ ──────────────────────────────────────
(
  'Bagel œufs & poulet',
  'petit_dej_sale',
  '[
    {"nom":"Bagel","quantite":1,"unite":"pièce"},
    {"nom":"Œufs entiers","quantite":2,"unite":"pièces"},
    {"nom":"Blanc de poulet","quantite":40,"unite":"g"},
    {"nom":"Laitue","quantite":30,"unite":"g"},
    {"nom":"Tomate","quantite":50,"unite":"g"},
    {"nom":"Mayonnaise légère","quantite":10,"unite":"g"}
  ]'::jsonb,
  '1. Faire cuire les œufs (brouillés ou au plat) dans une poêle légèrement huilée.
2. Couper et toaster le bagel.
3. Faire chauffer le poulet à la poêle ou utiliser du poulet cuit.
4. Assembler : laitue, tomate, poulet, œufs, mayo.',
  470, 32, 50, 13,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  1
),

(
  'English muffin bacon & œufs',
  'petit_dej_sale',
  '[
    {"nom":"English muffins","quantite":2,"unite":"pièces"},
    {"nom":"Tranches de bacon","quantite":3,"unite":"tranches"},
    {"nom":"Œufs entiers","quantite":2,"unite":"pièces"},
    {"nom":"Cheddar","quantite":25,"unite":"g"},
    {"nom":"Salade verte","quantite":30,"unite":"g"}
  ]'::jsonb,
  '1. Griller les english muffins.
2. Faire cuire le bacon croustillant à la poêle.
3. Cuire les œufs au plat.
4. Assembler : muffin, bacon, œuf, cheddar, salade.
5. Optionnel : passer 1 min sous le gril pour faire fondre le fromage.',
  666, 38, 50, 30,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  2
),

(
  'Wrap œuf & dinde',
  'petit_dej_sale',
  '[
    {"nom":"Grande tortilla de blé","quantite":1,"unite":"pièce"},
    {"nom":"Œufs entiers","quantite":2,"unite":"pièces"},
    {"nom":"Blanc de dinde","quantite":80,"unite":"g"},
    {"nom":"Épinards frais","quantite":40,"unite":"g"},
    {"nom":"Avocat","quantite":0.25,"unite":"pièce"},
    {"nom":"Sauce piquante","quantite":5,"unite":"g"}
  ]'::jsonb,
  '1. Faire revenir la dinde en lamelles dans une poêle.
2. Brouiller les œufs avec les épinards.
3. Écraser l'avocat en guacamole rapide.
4. Étaler sur la tortilla, ajouter dinde, œufs, avocat.
5. Rouler serré et couper en deux.',
  502, 38, 40, 18,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  3
),

(
  'Avocado toast & poulet',
  'petit_dej_sale',
  '[
    {"nom":"Tranches de pain complet","quantite":2,"unite":"tranches"},
    {"nom":"Avocat mûr","quantite":0.5,"unite":"pièce"},
    {"nom":"Blanc de poulet cuit","quantite":60,"unite":"g"},
    {"nom":"Jus de citron","quantite":0.5,"unite":"citron"},
    {"nom":"Tomate","quantite":50,"unite":"g"},
    {"nom":"Flocons de piment","quantite":1,"unite":"pincée"}
  ]'::jsonb,
  '1. Toaster les tranches de pain.
2. Écraser l'avocat avec le jus de citron, sel, piment.
3. Tartiner généreusement sur le pain.
4. Ajouter les tranches de poulet et de tomate.
5. Finir avec les flocons de piment.',
  408, 28, 38, 15,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  4
),

(
  'Toast chèvre & miel',
  'petit_dej_sale',
  '[
    {"nom":"Tranches de pain complet","quantite":2,"unite":"tranches"},
    {"nom":"Fromage de chèvre frais","quantite":40,"unite":"g"},
    {"nom":"Miel","quantite":15,"unite":"g"},
    {"nom":"Cerneaux de noix","quantite":15,"unite":"g"},
    {"nom":"Roquette","quantite":20,"unite":"g"}
  ]'::jsonb,
  '1. Toaster les tranches de pain.
2. Tartiner le fromage de chèvre.
3. Ajouter la roquette, puis les noix concassées.
4. Terminer avec un filet de miel.',
  345, 14, 44, 10,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  5
),

(
  'Roulés jambon & fromage',
  'petit_dej_sale',
  '[
    {"nom":"Petite tortilla de blé","quantite":1,"unite":"pièce"},
    {"nom":"Jambon blanc","quantite":2,"unite":"tranches"},
    {"nom":"Fromage frais (type St Moret)","quantite":40,"unite":"g"},
    {"nom":"Concombre","quantite":40,"unite":"g"},
    {"nom":"Poivron rouge","quantite":30,"unite":"g"}
  ]'::jsonb,
  '1. Étaler le fromage frais sur la tortilla.
2. Disposer le jambon, le concombre en bâtonnets et le poivron.
3. Rouler fermement et couper en tronçons.
4. Servir frais.',
  262, 22, 16, 10,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  6
),

-- ── PETIT-DÉJEUNER SUCRÉ ──────────────────────────────────────
(
  'Smoothie protéiné',
  'petit_dej_sucre',
  '[
    {"nom":"Lait d''amande","quantite":200,"unite":"ml"},
    {"nom":"Banane","quantite":1,"unite":"pièce"},
    {"nom":"Beurre de cacahuète","quantite":15,"unite":"g"},
    {"nom":"Protéine en poudre (whey)","quantite":25,"unite":"g"},
    {"nom":"Graines de chia","quantite":5,"unite":"g"}
  ]'::jsonb,
  '1. Verser tous les ingrédients dans le blender.
2. Mixer 30 secondes à pleine puissance.
3. Ajouter des glaçons si souhaité.
4. Servir immédiatement.',
  303, 25, 34, 6,
  '{"nom":"Protéine en poudre (whey)","quantite":30,"unite":"g","kcal":110,"proteines":22,"glucides":3,"lipides":2}'::jsonb,
  7
),

(
  'Overnight oats banane & cacahuète',
  'petit_dej_sucre',
  '[
    {"nom":"Flocons d''avoine","quantite":60,"unite":"g"},
    {"nom":"Lait (vache ou végétal)","quantite":150,"unite":"ml"},
    {"nom":"Beurre de cacahuète","quantite":20,"unite":"g"},
    {"nom":"Banane","quantite":0.5,"unite":"pièce"},
    {"nom":"Miel","quantite":10,"unite":"g"},
    {"nom":"Graines de chia","quantite":10,"unite":"g"}
  ]'::jsonb,
  '1. Mélanger avoine, lait, graines de chia et miel dans un bocal.
2. Ajouter le beurre de cacahuète et mélanger.
3. Couvrir et réfrigérer une nuit (minimum 6h).
4. Le matin, couper la banane sur le dessus.',
  403, 14, 56, 13,
  '{"nom":"Protéine en poudre (whey)","quantite":30,"unite":"g","kcal":110,"proteines":22,"glucides":3,"lipides":2}'::jsonb,
  8
),

(
  'Pancakes protéinés',
  'petit_dej_sucre',
  '[
    {"nom":"Farine d''avoine","quantite":80,"unite":"g"},
    {"nom":"Œufs entiers","quantite":2,"unite":"pièces"},
    {"nom":"Lait","quantite":150,"unite":"ml"},
    {"nom":"Fromage blanc 0%","quantite":80,"unite":"g"},
    {"nom":"Beurre","quantite":10,"unite":"g"},
    {"nom":"Sirop d''érable","quantite":20,"unite":"ml"},
    {"nom":"Fruits rouges","quantite":50,"unite":"g"}
  ]'::jsonb,
  '1. Mélanger farine, œufs, lait et fromage blanc jusqu''à consistance lisse.
2. Faire chauffer le beurre dans une poêle antiadhésive.
3. Verser des petites portions et cuire 2-3 min de chaque côté.
4. Servir avec sirop d''érable et fruits rouges.',
  578, 28, 72, 16,
  '{"nom":"Protéine en poudre (whey)","quantite":30,"unite":"g","kcal":110,"proteines":22,"glucides":3,"lipides":2}'::jsonb,
  9
),

(
  'Cookies protéinés (lot)',
  'petit_dej_sucre',
  '[
    {"nom":"Flocons d''avoine","quantite":100,"unite":"g"},
    {"nom":"Protéine en poudre (whey)","quantite":40,"unite":"g"},
    {"nom":"Beurre de cacahuète","quantite":40,"unite":"g"},
    {"nom":"Miel","quantite":30,"unite":"g"},
    {"nom":"Œuf entier","quantite":1,"unite":"pièce"},
    {"nom":"Pépites de chocolat noir","quantite":30,"unite":"g"}
  ]'::jsonb,
  '1. Préchauffer le four à 180°C.
2. Mélanger tous les ingrédients dans un saladier.
3. Former des boules (environ 8 cookies) sur une plaque.
4. Aplatir légèrement chaque boule.
5. Cuire 12 min — les cookies durcissent en refroidissant.',
  577, 30, 65, 20,
  '{"nom":"Protéine en poudre (whey)","quantite":30,"unite":"g","kcal":110,"proteines":22,"glucides":3,"lipides":2}'::jsonb,
  10
),

-- ── SALADES ──────────────────────────────────────────────────
(
  'Salade grecque & poulet',
  'salade',
  '[
    {"nom":"Blanc de poulet grillé","quantite":120,"unite":"g"},
    {"nom":"Feta","quantite":60,"unite":"g"},
    {"nom":"Concombre","quantite":100,"unite":"g"},
    {"nom":"Tomates cerises","quantite":100,"unite":"g"},
    {"nom":"Olives noires","quantite":40,"unite":"g"},
    {"nom":"Huile d''olive","quantite":20,"unite":"ml"},
    {"nom":"Jus de citron","quantite":0.5,"unite":"citron"},
    {"nom":"Origan séché","quantite":1,"unite":"c.à.c."}
  ]'::jsonb,
  '1. Griller le poulet avec sel, origan et huile.
2. Couper concombre, tomates cerises, feta en dés.
3. Assembler dans un bol.
4. Préparer la vinaigrette : huile d''olive + citron + origan.
5. Ajouter les olives et assaisonner.',
  601, 42, 18, 40,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  11
),

(
  'Salade lentilles & saumon',
  'salade',
  '[
    {"nom":"Filet de saumon","quantite":150,"unite":"g"},
    {"nom":"Lentilles cuites","quantite":150,"unite":"g"},
    {"nom":"Épinards frais","quantite":50,"unite":"g"},
    {"nom":"Tomates cerises","quantite":100,"unite":"g"},
    {"nom":"Graines de courge","quantite":15,"unite":"g"},
    {"nom":"Vinaigrette à l''huile d''olive","quantite":15,"unite":"ml"}
  ]'::jsonb,
  '1. Cuire le saumon à la poêle 3-4 min de chaque côté.
2. Rincer les lentilles cuites.
3. Assembler épinards, lentilles, tomates cerises.
4. Émietter le saumon tiède sur le dessus.
5. Parsemer de graines de courge et assaisonner.',
  678, 46, 48, 18,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  12
),

(
  'Salade crevettes & avocat',
  'salade',
  '[
    {"nom":"Crevettes décortiquées","quantite":150,"unite":"g"},
    {"nom":"Avocat","quantite":1,"unite":"pièce"},
    {"nom":"Salade mixte","quantite":60,"unite":"g"},
    {"nom":"Tomates cerises","quantite":80,"unite":"g"},
    {"nom":"Maïs","quantite":50,"unite":"g"},
    {"nom":"Vinaigrette citron-huile","quantite":15,"unite":"ml"}
  ]'::jsonb,
  '1. Faire sauter les crevettes à la poêle avec ail et huile d''olive.
2. Couper l''avocat en dés.
3. Dresser la salade, tomates, maïs.
4. Ajouter les crevettes tièdes et l''avocat.
5. Arroser de vinaigrette citron.',
  497, 38, 22, 28,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  13
),

(
  'Salade César poulet',
  'salade',
  '[
    {"nom":"Blanc de poulet grillé","quantite":140,"unite":"g"},
    {"nom":"Laitue romaine","quantite":80,"unite":"g"},
    {"nom":"Parmesan râpé","quantite":20,"unite":"g"},
    {"nom":"Croûtons","quantite":30,"unite":"g"},
    {"nom":"Sauce César","quantite":25,"unite":"g"},
    {"nom":"Jus de citron","quantite":0.5,"unite":"citron"}
  ]'::jsonb,
  '1. Griller le poulet assaisonné avec sel, poivre et herbes.
2. Couper la laitue romaine grossièrement.
3. Mélanger avec la sauce César et le jus de citron.
4. Ajouter les croûtons et le parmesan.
5. Disposer le poulet tranché sur le dessus.',
  482, 44, 22, 22,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  14
),

-- ── RIZ ──────────────────────────────────────────────────────
(
  'Bowl mexicain au riz',
  'riz',
  '[
    {"nom":"Riz basmati (cru)","quantite":150,"unite":"g"},
    {"nom":"Bœuf haché 5%","quantite":100,"unite":"g"},
    {"nom":"Haricots noirs en boîte","quantite":100,"unite":"g"},
    {"nom":"Maïs","quantite":60,"unite":"g"},
    {"nom":"Cheddar râpé","quantite":30,"unite":"g"},
    {"nom":"Crème fraîche légère","quantite":30,"unite":"g"},
    {"nom":"Salsa tomate","quantite":30,"unite":"g"},
    {"nom":"Épices mexicaines (cumin, paprika)","quantite":1,"unite":"c.à.c."}
  ]'::jsonb,
  '1. Cuire le riz basmati.
2. Faire revenir le bœuf haché avec les épices mexicaines.
3. Ajouter haricots noirs et maïs, réchauffer 2 min.
4. Dresser en bowl : riz, viande, haricots.
5. Garnir de cheddar, crème et salsa.',
  857, 44, 98, 32,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  15
),

(
  'Poulet farci aux épinards',
  'riz',
  '[
    {"nom":"Blanc de poulet","quantite":180,"unite":"g"},
    {"nom":"Épinards frais","quantite":60,"unite":"g"},
    {"nom":"Fromage de chèvre","quantite":30,"unite":"g"},
    {"nom":"Riz (cru)","quantite":70,"unite":"g"},
    {"nom":"Ail","quantite":1,"unite":"gousse"},
    {"nom":"Herbes de Provence","quantite":1,"unite":"c.à.c."}
  ]'::jsonb,
  '1. Préchauffer le four à 200°C.
2. Faire revenir les épinards avec l''ail, laisser refroidir.
3. Couper le poulet en portefeuille et farcir d''épinards + chèvre.
4. Ficeler et enfourner 25 min.
5. Cuire le riz pendant ce temps. Servir ensemble.',
  514, 55, 32, 14,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  16
),

(
  'Curry de poulet',
  'riz',
  '[
    {"nom":"Blanc de poulet","quantite":150,"unite":"g"},
    {"nom":"Lait de coco (allégé)","quantite":150,"unite":"ml"},
    {"nom":"Riz basmati (cru)","quantite":70,"unite":"g"},
    {"nom":"Tomates concassées","quantite":80,"unite":"g"},
    {"nom":"Oignon","quantite":50,"unite":"g"},
    {"nom":"Pâte de curry jaune","quantite":15,"unite":"g"},
    {"nom":"Coriandre fraîche","quantite":10,"unite":"g"}
  ]'::jsonb,
  '1. Faire revenir l''oignon haché dans un peu d''huile.
2. Ajouter la pâte de curry, cuire 1 min.
3. Ajouter le poulet en dés, dorer 3 min.
4. Verser lait de coco et tomates. Mijoter 20 min.
5. Cuire le riz. Servir le curry sur le riz avec la coriandre.',
  661, 50, 50, 24,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  17
),

(
  'Sauté de courgettes & poulet',
  'riz',
  '[
    {"nom":"Blanc de poulet","quantite":130,"unite":"g"},
    {"nom":"Courgettes","quantite":150,"unite":"g"},
    {"nom":"Riz (cru)","quantite":70,"unite":"g"},
    {"nom":"Sauce soja","quantite":15,"unite":"ml"},
    {"nom":"Ail","quantite":2,"unite":"gousses"},
    {"nom":"Gingembre frais","quantite":5,"unite":"g"},
    {"nom":"Huile de sésame","quantite":10,"unite":"ml"}
  ]'::jsonb,
  '1. Cuire le riz.
2. Couper le poulet en lamelles, les courgettes en rondelles.
3. Faire chauffer l''huile de sésame, saisir le poulet.
4. Ajouter ail, gingembre et courgettes.
5. Déglacer avec la sauce soja. Servir sur le riz.',
  517, 42, 46, 14,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  18
),

(
  'Poisson au riz & pesto',
  'riz',
  '[
    {"nom":"Filet de poisson blanc (cabillaud)","quantite":160,"unite":"g"},
    {"nom":"Riz (cru)","quantite":70,"unite":"g"},
    {"nom":"Pesto basilic","quantite":20,"unite":"g"},
    {"nom":"Tomates cerises","quantite":80,"unite":"g"},
    {"nom":"Pignons de pin","quantite":10,"unite":"g"},
    {"nom":"Citron","quantite":0.5,"unite":"pièce"}
  ]'::jsonb,
  '1. Préchauffer le four à 200°C.
2. Badigeonner le poisson de pesto.
3. Enfourner 15 min avec les tomates cerises.
4. Cuire le riz pendant ce temps.
5. Servir le poisson sur le riz, parsemer de pignons et de citron.',
  608, 46, 58, 20,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  19
),

-- ── PÂTES ────────────────────────────────────────────────────
(
  'Pâtes thon & câpres',
  'pates',
  '[
    {"nom":"Pâtes (cru)","quantite":100,"unite":"g"},
    {"nom":"Thon en boîte (au naturel)","quantite":140,"unite":"g"},
    {"nom":"Câpres","quantite":20,"unite":"g"},
    {"nom":"Tomates cerises","quantite":100,"unite":"g"},
    {"nom":"Huile d''olive","quantite":15,"unite":"ml"},
    {"nom":"Ail","quantite":2,"unite":"gousses"},
    {"nom":"Persil frais","quantite":10,"unite":"g"}
  ]'::jsonb,
  '1. Cuire les pâtes al dente.
2. Faire revenir l''ail dans l''huile d''olive.
3. Ajouter les tomates cerises, cuire 3 min.
4. Ajouter le thon égoutté et les câpres.
5. Mélanger avec les pâtes, finir avec persil et citron.',
  699, 42, 72, 22,
  '{"nom":"Thon en boîte (naturel)","quantite":80,"unite":"g","kcal":72,"proteines":16,"glucides":0,"lipides":1}'::jsonb,
  20
),

(
  'Salade de pâtes & poulet',
  'pates',
  '[
    {"nom":"Pâtes courtes (cru)","quantite":80,"unite":"g"},
    {"nom":"Blanc de poulet grillé","quantite":120,"unite":"g"},
    {"nom":"Tomates cerises","quantite":80,"unite":"g"},
    {"nom":"Maïs","quantite":60,"unite":"g"},
    {"nom":"Basilic frais","quantite":10,"unite":"g"},
    {"nom":"Huile d''olive","quantite":15,"unite":"ml"},
    {"nom":"Parmesan râpé","quantite":15,"unite":"g"}
  ]'::jsonb,
  '1. Cuire les pâtes al dente et laisser refroidir.
2. Griller le poulet et couper en lanières.
3. Mélanger pâtes, poulet, tomates, maïs.
4. Assaisonner à l''huile d''olive, sel, poivre.
5. Finir avec basilic frais et parmesan.',
  665, 46, 58, 22,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  21
),

(
  'Pâtes pesto & mozzarella',
  'pates',
  '[
    {"nom":"Pâtes (cru)","quantite":100,"unite":"g"},
    {"nom":"Pesto basilic","quantite":30,"unite":"g"},
    {"nom":"Mozzarella","quantite":80,"unite":"g"},
    {"nom":"Tomates cerises","quantite":80,"unite":"g"},
    {"nom":"Parmesan râpé","quantite":15,"unite":"g"},
    {"nom":"Basilic frais","quantite":8,"unite":"g"}
  ]'::jsonb,
  '1. Cuire les pâtes al dente.
2. Égoutter en gardant un peu d''eau de cuisson.
3. Mélanger les pâtes chaudes avec le pesto.
4. Ajouter la mozzarella déchirée et les tomates cerises.
5. Finir avec parmesan et basilic frais.',
  747, 28, 74, 36,
  '{"nom":"Blanc de poulet grillé","quantite":80,"unite":"g","kcal":132,"proteines":24.8,"glucides":0,"lipides":2.9}'::jsonb,
  22
),

(
  'Gnocchis aux champignons',
  'pates',
  '[
    {"nom":"Gnocchis de pomme de terre","quantite":250,"unite":"g"},
    {"nom":"Champignons de Paris","quantite":150,"unite":"g"},
    {"nom":"Crème fraîche légère","quantite":80,"unite":"ml"},
    {"nom":"Parmesan râpé","quantite":20,"unite":"g"},
    {"nom":"Ail","quantite":2,"unite":"gousses"},
    {"nom":"Beurre","quantite":10,"unite":"g"},
    {"nom":"Persil frais","quantite":8,"unite":"g"}
  ]'::jsonb,
  '1. Faire revenir l''ail dans le beurre.
2. Ajouter les champignons émincés, cuire 5 min.
3. Verser la crème, laisser réduire 2 min.
4. Cuire les gnocchis dans l''eau bouillante (flottent quand cuits).
5. Mélanger gnocchis et sauce. Servir avec parmesan et persil.',
  614, 18, 76, 26,
  '{"nom":"Blanc de poulet grillé","quantite":80,"unite":"g","kcal":132,"proteines":24.8,"glucides":0,"lipides":2.9}'::jsonb,
  23
),

(
  'Gnocchis porc & moutarde',
  'pates',
  '[
    {"nom":"Gnocchis de pomme de terre","quantite":250,"unite":"g"},
    {"nom":"Filet de porc","quantite":120,"unite":"g"},
    {"nom":"Crème fraîche légère","quantite":80,"unite":"ml"},
    {"nom":"Moutarde de Dijon","quantite":20,"unite":"g"},
    {"nom":"Échalote","quantite":30,"unite":"g"},
    {"nom":"Herbes de Provence","quantite":1,"unite":"c.à.c."}
  ]'::jsonb,
  '1. Saisir le filet de porc en médaillons dans une poêle chaude.
2. Réserver et faire revenir l''échalote.
3. Déglacer avec la crème et ajouter la moutarde.
4. Remettre le porc, laisser mijoter 5 min.
5. Cuire les gnocchis, égoutter et mélanger à la sauce.',
  728, 38, 72, 28,
  '{"nom":"Blanc de poulet grillé","quantite":50,"unite":"g","kcal":82,"proteines":15.5,"glucides":0,"lipides":1.8}'::jsonb,
  24
),

(
  'Lasagnes bolognaise',
  'pates',
  '[
    {"nom":"Feuilles de lasagnes","quantite":120,"unite":"g"},
    {"nom":"Bœuf haché 5%","quantite":150,"unite":"g"},
    {"nom":"Béchamel","quantite":150,"unite":"ml"},
    {"nom":"Sauce tomate","quantite":100,"unite":"g"},
    {"nom":"Parmesan râpé","quantite":40,"unite":"g"},
    {"nom":"Oignon","quantite":50,"unite":"g"},
    {"nom":"Ail","quantite":2,"unite":"gousses"}
  ]'::jsonb,
  '1. Préparer la bolognaise : faire revenir oignon + ail + bœuf + sauce tomate. Mijoter 20 min.
2. Préparer une béchamel (beurre, farine, lait).
3. Dans un plat, alterner : sauce bolognaise, feuilles, béchamel, parmesan.
4. Finir par une couche de béchamel + parmesan.
5. Cuire au four à 180°C pendant 35-40 min.',
  973, 55, 85, 46,
  '{"nom":"Bœuf haché 5%","quantite":50,"unite":"g","kcal":72,"proteines":10,"glucides":0,"lipides":3.5}'::jsonb,
  25
),

(
  'Spaghetti bolognaise',
  'pates',
  '[
    {"nom":"Spaghetti (cru)","quantite":100,"unite":"g"},
    {"nom":"Bœuf haché 5%","quantite":150,"unite":"g"},
    {"nom":"Sauce tomate","quantite":100,"unite":"g"},
    {"nom":"Oignon","quantite":50,"unite":"g"},
    {"nom":"Ail","quantite":2,"unite":"gousses"},
    {"nom":"Parmesan râpé","quantite":20,"unite":"g"},
    {"nom":"Herbes italiennes","quantite":1,"unite":"c.à.c."}
  ]'::jsonb,
  '1. Faire revenir oignon et ail haché dans un peu d''huile.
2. Ajouter le bœuf haché, cuire jusqu''à coloration.
3. Verser la sauce tomate et les herbes. Mijoter 25-30 min.
4. Cuire les spaghetti al dente.
5. Servir avec la bolognaise et le parmesan râpé.',
  744, 42, 72, 26,
  '{"nom":"Bœuf haché 5%","quantite":50,"unite":"g","kcal":72,"proteines":10,"glucides":0,"lipides":3.5}'::jsonb,
  26
);
