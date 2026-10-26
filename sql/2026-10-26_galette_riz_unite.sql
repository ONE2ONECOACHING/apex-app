-- ============================================================================
-- APEX APP — Galette de riz soufflé à l'unité (26 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- L'aliment « Galette de riz » (valeurs pour 100 g) passe à l'unité :
-- 1 galette de riz soufflé classique ≈ 7,5 g (Bjorg, Gerblé…), soit pour
-- une galette : 29 kcal, 0,6 g de protéines, 6,0 g de glucides, 0,2 g de
-- lipides, 0,1 g de fibres (d'après 382 kcal / 100 g).
--
-- Les plans et journaux déjà enregistrés ne changent pas (ils gardent leurs
-- valeurs) ; seules les prochaines recherches proposent la galette à l'unité.
-- Relançable sans risque (ne touche que la ligne encore pour 100 g).
-- ============================================================================

begin;

update public.aliments_bdd
set nom = 'Galette de riz soufflé (1 galette ≈ 7,5 g)',
    calories = 29, proteines = 0.6, glucides = 6.0, lipides = 0.2, fibres = 0.1,
    mode = 'unit'
where nom = 'Galette de riz' and mode is null;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : une ligne « Galette de riz soufflé (1 galette ≈ 7,5 g) », mode unit, 29 kcal.
select nom, calories, proteines, glucides, lipides, fibres, mode
from public.aliments_bdd
where nom ilike '%galette de riz%';
