-- ============================================================================
-- APEX APP — Aliments supplémentaires (audit du 17 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- 68 aliments de docs/audit-2026-10-17/aliments_a_ajouter.csv, valeurs Ciqual
-- approximatives : pour 100 g, ou pour une pièce (« unit », poids dans le nom).
-- Sans les aliments catalans (choix de Benjamin) ni ceux déjà présents.
-- Bière et vin : l'alcool n'a pas de colonne, leurs macros ne font pas les calories.
--
-- Relançable sans risque : un aliment déjà présent n'est pas ajouté deux fois.
-- ============================================================================

begin;

insert into public.aliments_bdd (nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
select v.nom, v.calories, v.proteines, v.glucides, v.lipides, v.fibres, v.mode, v.categorie
from (values
  ('Blanc de poulet cru', 115, 24, 0, 2, 0, null, 'viande'),
  ('Escalope de dinde crue', 105, 23.5, 0, 1.2, 0, null, 'viande'),
  ('Blanc de dinde (tranches)', 105, 20, 1.5, 2, 0, null, 'viande'),
  ('Blanc de poulet (tranches)', 105, 21, 1, 2, 0, null, 'viande'),
  ('Jambon blanc découenné dégraissé', 105, 20.5, 0.8, 2.5, 0, null, 'viande'),
  ('Œuf dur (1 pièce ≈ 50 g)', 72, 6.2, 0.2, 5.0, 0.0, 'unit', 'oeuf'),
  ('Yaourt protéiné nature (1 pot de 160 g, type HiPRO)', 88, 16.0, 6.4, 0.3, 0.0, 'unit', 'laitier'),
  ('Skyr aromatisé', 75, 9, 8.5, 0.2, 0, null, 'laitier'),
  ('Pâtes complètes crues', 350, 13, 63, 2.5, 8, null, 'feculent'),
  ('Pain de mie complet', 250, 9.5, 41, 4.5, 6.5, null, 'feculent'),
  ('Pain de mie complet (1 tranche ≈ 25 g)', 62, 2.4, 10.2, 1.1, 1.6, 'unit', 'feculent'),
  ('Wrap / tortilla de blé (1 galette ≈ 60 g)', 186, 5.1, 30.0, 4.5, 1.8, 'unit', 'feculent'),
  ('Bagel nature (1 pièce ≈ 85 g)', 221, 8.5, 42.5, 1.3, 2.1, 'unit', 'feculent'),
  ('English muffin (1 pièce ≈ 60 g)', 138, 5.1, 25.8, 1.2, 1.5, 'unit', 'feculent'),
  ('Barre protéinée (1 barre ≈ 60 g)', 216, 18.0, 21.0, 7.2, 3.0, 'unit', 'complement'),
  ('Boisson soja nature', 40, 3.5, 1.5, 2, 0.5, null, 'laitier'),
  ('Boisson amande sans sucre', 15, 0.5, 0.3, 1.2, 0.3, null, 'laitier'),
  ('Compote de pomme sans sucre ajouté (100 g)', 55, 0.3, 12, 0.2, 1.8, null, 'fruit'),
  ('Purée de pommes de terre (lait)', 85, 2, 13, 3, 1.3, null, 'feculent'),
  ('Gnocchi de pomme de terre', 155, 3.5, 32, 0.6, 2, null, 'feculent'),
  ('Lentilles en conserve égouttées', 100, 7.5, 13, 0.5, 5, null, 'legumineuse'),
  ('Pois chiches en conserve égouttés', 125, 7, 16, 2.5, 5.5, null, 'legumineuse'),
  ('Vinaigrette classique', 450, 0.5, 4, 47, 0, null, 'condiment'),
  ('Sardine fraîche grillée', 190, 25, 0, 10, 0, null, 'poisson'),
  ('Surimi', 110, 8, 15, 2, 0.5, null, 'poisson'),
  ('Calamar / encornet cuit', 105, 19, 2.5, 1.8, 0, null, 'poisson'),
  ('Poulpe cuit', 150, 27, 3, 2, 0, null, 'poisson'),
  ('Bavette de bœuf crue', 135, 21, 0, 5.5, 0, null, 'viande'),
  ('Lapin cuit', 190, 29, 0, 8, 0, null, 'viande'),
  ('Bûche de chèvre', 300, 19, 1, 25, 0, null, 'laitier'),
  ('Fromage de brebis (type Ossau-Iraty)', 400, 25, 0.5, 33, 0, null, 'laitier'),
  ('Mozzarella allégée', 165, 19, 1.5, 9, 0, null, 'laitier'),
  ('Mini fromage light (1 pièce ≈ 20 g, type Babybel light)', 42, 5.0, 0.1, 2.4, 0.0, 'unit', 'laitier'),
  ('Petit-suisse nature 2 % (1 pot de 60 g)', 51, 4.8, 2.4, 2.1, 0.0, 'unit', 'laitier'),
  ('Pain aux céréales', 260, 10, 43, 5, 6, null, 'feculent'),
  ('Pain pita', 270, 9, 54, 1.5, 2.5, null, 'feculent'),
  ('Biscottes', 410, 11, 72, 7, 4.5, null, 'feculent'),
  ('Vermicelles de riz crus', 360, 6, 80, 0.6, 1, null, 'feculent'),
  ('Polenta crue (semoule de maïs)', 360, 8, 75, 1.5, 4, null, 'feculent'),
  ('Pâtes fraîches crues', 280, 11, 50, 3, 2, null, 'feculent'),
  ('Dattes séchées (100 g)', 290, 2.5, 66, 0.4, 7, null, 'fruit'),
  ('Raisins secs', 305, 3, 67, 0.5, 4.5, null, 'fruit'),
  ('Abricots secs', 250, 3.5, 55, 0.5, 7, null, 'fruit'),
  ('Pruneaux', 235, 2.5, 55, 0.4, 7, null, 'fruit'),
  ('Nectarine / brugnon', 48, 1, 10, 0.3, 1.7, null, 'fruit'),
  ('Jus d''orange 100 % pur jus', 45, 0.7, 10, 0.1, 0.3, null, 'fruit'),
  ('Chou rouge cru', 30, 1.4, 5, 0.2, 2.5, null, 'legume'),
  ('Pousses d''épinards crues', 25, 2.9, 1.5, 0.4, 2.2, null, 'legume'),
  ('Tomates pelées en conserve', 22, 1.1, 3.5, 0.2, 1.1, null, 'legume'),
  ('Poêlée de légumes surgelés nature', 45, 1.8, 6, 1, 2.5, null, 'legume'),
  ('Soupe de légumes', 30, 0.9, 4, 1, 1.2, null, 'legume'),
  ('Ratatouille', 60, 1.2, 5, 4, 1.8, null, 'legume'),
  ('Gaspacho', 40, 0.8, 4, 2.3, 0.8, null, 'legume'),
  ('Cacao en poudre non sucré', 370, 22, 13, 20, 32, null, 'sucre'),
  ('Chocolat en poudre sucré', 385, 5, 80, 3.5, 6, null, 'sucre'),
  ('Pâte à tartiner cacao-noisette', 540, 6, 57, 31, 3.5, null, 'sucre'),
  ('Tapenade', 290, 2, 4, 29, 3, null, 'condiment'),
  ('Chorizo', 450, 24, 2, 39, 0, null, 'viande'),
  ('Paella (plat préparé)', 160, 9, 18, 5.5, 1, null, 'autre'),
  ('Taboulé du commerce', 160, 3.5, 22, 6, 2.5, null, 'autre'),
  ('Pizza margherita', 240, 10, 29, 9, 2, null, 'autre'),
  ('Croissant (1 pièce ≈ 45 g)', 184, 3.6, 20.2, 9.5, 0.9, 'unit', 'autre'),
  ('Pain au chocolat (1 pièce ≈ 60 g)', 252, 4.5, 27.6, 13.2, 1.5, 'unit', 'autre'),
  ('Barre de céréales (1 barre ≈ 25 g)', 100, 1.5, 17.0, 2.8, 1.0, 'unit', 'autre'),
  ('Biscuits petit-beurre', 440, 7.5, 75, 12, 2.5, null, 'autre'),
  ('Sauce barbecue', 150, 1, 35, 0.5, 0.5, null, 'condiment'),
  ('Bière blonde 5° (100 ml)', 42, 0.4, 3.5, 0, 0, null, 'autre'),
  ('Vin rouge 12° (100 ml)', 82, 0.1, 0.5, 0, 0, null, 'autre')
) as v(nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
where not exists (select 1 from public.aliments_bdd a where lower(a.nom) = lower(v.nom));

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : 68.
select count(*) as aliments_de_ce_script_presents
from public.aliments_bdd
where nom in ('Blanc de poulet cru', 'Escalope de dinde crue', 'Blanc de dinde (tranches)', 'Blanc de poulet (tranches)', 'Jambon blanc découenné dégraissé', 'Œuf dur (1 pièce ≈ 50 g)', 'Yaourt protéiné nature (1 pot de 160 g, type HiPRO)', 'Skyr aromatisé', 'Pâtes complètes crues', 'Pain de mie complet', 'Pain de mie complet (1 tranche ≈ 25 g)', 'Wrap / tortilla de blé (1 galette ≈ 60 g)', 'Bagel nature (1 pièce ≈ 85 g)', 'English muffin (1 pièce ≈ 60 g)', 'Barre protéinée (1 barre ≈ 60 g)', 'Boisson soja nature', 'Boisson amande sans sucre', 'Compote de pomme sans sucre ajouté (100 g)', 'Purée de pommes de terre (lait)', 'Gnocchi de pomme de terre', 'Lentilles en conserve égouttées', 'Pois chiches en conserve égouttés', 'Vinaigrette classique', 'Sardine fraîche grillée', 'Surimi', 'Calamar / encornet cuit', 'Poulpe cuit', 'Bavette de bœuf crue', 'Lapin cuit', 'Bûche de chèvre', 'Fromage de brebis (type Ossau-Iraty)', 'Mozzarella allégée', 'Mini fromage light (1 pièce ≈ 20 g, type Babybel light)', 'Petit-suisse nature 2 % (1 pot de 60 g)', 'Pain aux céréales', 'Pain pita', 'Biscottes', 'Vermicelles de riz crus', 'Polenta crue (semoule de maïs)', 'Pâtes fraîches crues', 'Dattes séchées (100 g)', 'Raisins secs', 'Abricots secs', 'Pruneaux', 'Nectarine / brugnon', 'Jus d''orange 100 % pur jus', 'Chou rouge cru', 'Pousses d''épinards crues', 'Tomates pelées en conserve', 'Poêlée de légumes surgelés nature', 'Soupe de légumes', 'Ratatouille', 'Gaspacho', 'Cacao en poudre non sucré', 'Chocolat en poudre sucré', 'Pâte à tartiner cacao-noisette', 'Tapenade', 'Chorizo', 'Paella (plat préparé)', 'Taboulé du commerce', 'Pizza margherita', 'Croissant (1 pièce ≈ 45 g)', 'Pain au chocolat (1 pièce ≈ 60 g)', 'Barre de céréales (1 barre ≈ 25 g)', 'Biscuits petit-beurre', 'Sauce barbecue', 'Bière blonde 5° (100 ml)', 'Vin rouge 12° (100 ml)');
