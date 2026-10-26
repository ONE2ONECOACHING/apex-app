-- ============================================================================
-- APEX APP — Aliments pour les collations (26 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Valeurs d'après la table Ciqual (approximatives, arrondies).
-- « unit » = valeurs pour UNE pièce ; sinon pour 100 g.
--
--   1. Galette de riz soufflé : passe à l'unité (1 galette ≈ 7,5 g).
--   2. Ajouts :
--      - Compote sans sucre ajouté (1 gourde de 90 g)   → à l'unité
--      - Granola                                       → pour 100 g
--      - Galette de maïs soufflé (1 galette ≈ 8 g)      → à l'unité
--      - Datte Deglet Nour (1 datte ≈ 8 g)              → à l'unité
--
-- Les plans et journaux déjà enregistrés ne changent pas.
-- Relançable sans risque : un aliment déjà présent n'est pas ajouté deux fois.
-- ============================================================================

begin;

-- 1. Galette de riz à l'unité
update public.aliments_bdd
set nom = 'Galette de riz soufflé (1 galette ≈ 7,5 g)',
    calories = 29, proteines = 0.6, glucides = 6.0, lipides = 0.2, fibres = 0.1,
    mode = 'unit'
where nom = 'Galette de riz' and mode is null;

-- 2. Nouveaux aliments
insert into public.aliments_bdd (nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
select v.nom, v.calories, v.proteines, v.glucides, v.lipides, v.fibres, v.mode, v.categorie
from (values
  ('Compote sans sucre ajouté (1 gourde de 90 g)',  50, 0.3, 10.8,  0.2, 1.6, 'unit', 'fruit'),
  ('Granola',                                      450, 9.0, 62.0, 17.0, 6.0, null,   'feculent'),
  ('Galette de maïs soufflé (1 galette ≈ 8 g)',     31, 0.6,  6.4,  0.2, 0.3, 'unit', 'feculent'),
  ('Datte Deglet Nour (1 datte ≈ 8 g)',             23, 0.2,  5.3,  0.0, 0.6, 'unit', 'fruit')
) as v(nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
where not exists (select 1 from public.aliments_bdd a where a.nom = v.nom);

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : les 5 aliments ci-dessous, chacun une seule fois.
select nom, calories, proteines, glucides, lipides, fibres, coalesce(mode, '100 g') as pour
from public.aliments_bdd
where nom in ('Galette de riz soufflé (1 galette ≈ 7,5 g)', 'Compote sans sucre ajouté (1 gourde de 90 g)',
              'Granola', 'Galette de maïs soufflé (1 galette ≈ 8 g)', 'Datte Deglet Nour (1 datte ≈ 8 g)')
order by nom;
