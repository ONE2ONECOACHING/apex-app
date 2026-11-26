-- ============================================================================
-- APEX APP — Pains suédois Wasa (demande de Benjamin, 19 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Les 4 variétés Wasa les plus courantes en France, d'après les étiquettes
-- (valeurs approximatives, glucides sans les fibres comme sur les étiquettes
-- européennes) : pour 100 g, et pour une tranche (« unit », poids dans le nom).
-- Le poids d'une tranche varie un peu d'un paquet à l'autre.
-- Relançable sans risque : un aliment déjà présent n'est pas ajouté deux fois.
-- ============================================================================

begin;

insert into public.aliments_bdd (nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
select v.nom, v.calories, v.proteines, v.glucides, v.lipides, v.fibres, v.mode, 'feculent'
from (values
  ('Pain Wasa Léger',                            345,  9.0, 67.0, 1.5, 18.0, null),
  ('Pain Wasa Léger (1 tranche ≈ 9 g)',           31,  0.8,  6.0, 0.1,  1.6, 'unit'),
  ('Pain Wasa Fibres',                           330, 13.0, 46.0, 5.0, 26.0, null),
  ('Pain Wasa Fibres (1 tranche ≈ 10 g)',         33,  1.3,  4.6, 0.5,  2.6, 'unit'),
  ('Pain Wasa Sésame et sel de mer',             375, 12.0, 59.0, 7.5, 17.0, null),
  ('Pain Wasa Sésame et sel de mer (1 tranche ≈ 11 g)', 41, 1.3, 6.5, 0.8, 1.9, 'unit'),
  ('Pain Wasa Original (seigle)',                335,  9.0, 64.0, 1.5, 17.0, null),
  ('Pain Wasa Original (seigle) (1 tranche ≈ 11 g)', 37, 1.0, 7.0, 0.2, 1.9, 'unit')
) as v(nom, calories, proteines, glucides, lipides, fibres, mode)
where not exists (select 1 from public.aliments_bdd a where lower(a.nom) = lower(v.nom));

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : les 8 lignes Wasa (et d'éventuels Wasa déjà présents avant).
select nom, calories, proteines, glucides, lipides, fibres, mode, actif
from public.aliments_bdd
where nom ilike '%wasa%'
order by nom;
