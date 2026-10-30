-- ============================================================================
-- APEX APP — Laits végétaux (demande de Benjamin, 30 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Valeurs pour 100 ml (≈ 100 g), glucides sans les fibres, d'après Ciqual et
-- les étiquettes des marques courantes (Alpro, Oatly, Bjorg…).
-- Chaque nom contient « Boisson … » et « (lait de …) » : la recherche trouve
-- l'aliment qu'on tape « lait d'avoine », « boisson avoine » ou « avoine ».
-- Les deux boissons déjà présentes (soja nature, amande sans sucre) sont
-- renommées sur le même modèle ; leurs valeurs ne changent pas.
-- Relançable sans risque : un aliment déjà présent n'est pas ajouté deux fois.
-- ============================================================================

begin;

-- ── Renommage des deux boissons existantes ──────────────────────────────────
update public.aliments_bdd set nom = 'Boisson soja nature (lait de soja)'
where nom = 'Boisson soja nature';
update public.aliments_bdd set nom = 'Boisson amande sans sucre (lait d''amande)'
where nom = 'Boisson amande sans sucre';

-- ── Ajouts ──────────────────────────────────────────────────────────────────
insert into public.aliments_bdd (nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
select v.nom, v.calories, v.proteines, v.glucides, v.lipides, v.fibres, null, 'laitier'
from (values
  ('Boisson soja sans sucre (lait de soja)',               33, 3.3, 0.2, 1.8, 0.6),
  ('Boisson soja vanille (lait de soja)',                  50, 3.0, 6.0, 1.6, 0.6),
  ('Boisson soja chocolat (lait de soja)',                 62, 3.0, 8.3, 1.7, 0.9),
  ('Boisson amande sucrée (lait d''amande)',               24, 0.4, 3.0, 1.1, 0.3),
  ('Boisson avoine (lait d''avoine)',                      46, 1.0, 6.7, 1.5, 0.8),
  ('Boisson avoine barista (lait d''avoine)',              59, 1.0, 6.6, 3.0, 0.8),
  ('Boisson riz (lait de riz)',                            49, 0.1, 9.6, 1.0, 0.1),
  ('Boisson coco à boire (lait de coco, type Alpro)',      20, 0.1, 2.7, 0.9, 0.1),
  ('Boisson noisette (lait de noisette)',                  29, 0.4, 3.1, 1.6, 0.4),
  ('Boisson cajou (lait de cajou)',                        23, 0.5, 2.6, 1.1, 0.2),
  ('Boisson épeautre (lait d''épeautre)',                  45, 0.6, 8.0, 1.1, 0.3),
  ('Boisson pois (lait de pois, type Sproud)',             41, 2.0, 2.5, 2.5, 0.2)
) as v(nom, calories, proteines, glucides, lipides, fibres)
where not exists (select 1 from public.aliments_bdd a where lower(a.nom) = lower(v.nom));

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : 14 lignes, toutes actives.
select nom, calories, proteines, glucides, lipides, fibres, actif
from public.aliments_bdd
where nom like 'Boisson %(lait %'
order by nom;
