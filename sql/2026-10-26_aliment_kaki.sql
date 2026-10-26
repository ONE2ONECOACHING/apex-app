-- ============================================================================
-- APEX APP — Ajout du kaki (demande de Benjamin, 26 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Valeurs Ciqual approximatives, glucides sans les fibres : pour 100 g, et
-- pour une pièce (« unit », poids dans le nom).
-- Relançable sans risque : un aliment déjà présent n'est pas ajouté deux fois.
-- ============================================================================

begin;

insert into public.aliments_bdd (nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
select v.nom, v.calories, v.proteines, v.glucides, v.lipides, v.fibres, v.mode, v.categorie
from (values
  ('Kaki', 70, 0.6, 15.5, 0.2, 2.5, null, 'fruit'),
  ('Kaki (1 pièce ≈ 200 g)', 140, 1.2, 31.0, 0.4, 5.0, 'unit', 'fruit')
) as v(nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
where not exists (select 1 from public.aliments_bdd a where lower(a.nom) = lower(v.nom));

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : 2 lignes.
select nom, calories, proteines, glucides, lipides, fibres, mode, actif
from public.aliments_bdd
where nom in ('Kaki', 'Kaki (1 pièce ≈ 200 g)');
