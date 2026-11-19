-- ============================================================================
-- APEX APP — Ajout de la mandarine à la pièce (demande de Benjamin, 19 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Valeurs Ciqual approximatives (mandarine, pulpe crue), glucides sans les
-- fibres : pour 100 g, et pour une pièce épluchée (« unit », poids dans le nom).
-- La version aux 100 g n'est ajoutée que si elle n'existe pas déjà.
-- Relançable sans risque : un aliment déjà présent n'est pas ajouté deux fois.
-- ============================================================================

begin;

insert into public.aliments_bdd (nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
select v.nom, v.calories, v.proteines, v.glucides, v.lipides, v.fibres, v.mode, v.categorie
from (values
  ('Mandarine', 47, 0.8, 9.8, 0.2, 1.8, null, 'fruit'),
  ('Mandarine (1 pièce épluchée ≈ 70 g)', 33, 0.6, 6.9, 0.1, 1.3, 'unit', 'fruit')
) as v(nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
where not exists (select 1 from public.aliments_bdd a where lower(a.nom) = lower(v.nom))
  and not (v.mode is null and exists (select 1 from public.aliments_bdd a
           where a.nom ilike 'mandarine%' and a.mode is null and a.actif));

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : la mandarine à la pièce, et une seule mandarine aux 100 g active.
select nom, calories, proteines, glucides, lipides, fibres, mode, actif
from public.aliments_bdd
where nom ilike '%mandarine%'
order by mode nulls first, nom;
