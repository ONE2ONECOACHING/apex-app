-- ============================================================================
-- APEX APP — Corrections de la base d'aliments (audit du 17 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Applique les 85 corrections de docs/audit-2026-10-17/anomalies_aliments.csv
-- (valeurs pour 100 g sauf « unit » = pour une pièce, d'après Ciqual) :
--   - glucides comptés avec les fibres (oléagineux, graines, chocolat…) ;
--   - valeurs fausses (moutarde, tofu, pestos, houmous, truite, saumon fumé…) ;
--   - « cru » / « cuit » précisé dans le nom des viandes ;
--   - noms corrigés (« pesé cru » → « … cru(e) ») ;
--   - doublons désactivés (pas supprimés) ;
--   - la recherche d'aliments ne propose plus les aliments désactivés.
--
-- Les plans et journaux déjà enregistrés ne changent pas (ils gardent leurs
-- valeurs). Relançable sans risque : chaque correction ne touche que l'ancien
-- nom, qui n'existe plus après la première exécution.
-- ============================================================================

begin;

-- ── Recherche : seulement les aliments actifs ───────────────────────────────
create or replace function public.search_aliments(q text)
returns setof public.aliments_bdd
language sql
security definer
set search_path = public, extensions
as $$
  select *
  from public.aliments_bdd
  where actif is not false
    and extensions.unaccent(lower(nom)) ilike '%' || extensions.unaccent(lower(q)) || '%'
  order by
    case when extensions.unaccent(lower(nom)) ilike extensions.unaccent(lower(q)) || '%' then 0 else 1 end,
    nom
  limit 20;
$$;

-- ── Doublons désactivés ─────────────────────────────────────────────────────
-- Steak haché 10 % : deux lignes identiques, on en garde une
update public.aliments_bdd set actif = false
where id = (select id from public.aliments_bdd where nom = 'Steak haché 10% MG' and actif is not false order by id offset 1 limit 1);
update public.aliments_bdd set actif = false where nom in ('Sauce pesto vert', 'Fromage blanc 20%', 'Pomme de terre vapeur', 'Couscous cuit');

-- ── Valeurs (et nom quand il change) ────────────────────────────────────────
-- (nom actuel, nouveau nom, kcal, prot, gluc, lip, fibres, catégorie) ; null = inchangé
update public.aliments_bdd a set
  nom       = coalesce(c.nouveau, a.nom),
  calories  = coalesce(c.kcal::int, a.calories),
  proteines = coalesce(c.p::numeric, a.proteines),
  glucides  = coalesce(c.g::numeric, a.glucides),
  lipides   = coalesce(c.l::numeric, a.lipides),
  fibres    = coalesce(c.f::numeric, a.fibres),
  categorie = coalesce(c.cat, a.categorie)
from (values
  ('Moutarde'::text,                'Moutarde de Dijon'::text,             160, 7::numeric, 4::numeric, 12::numeric, 3::numeric, null::text),
  ('Tofu ferme',                    null,                                  125, 13,   1.5,  7.5,  1,    null),
  ('Sauce pesto rouge',             null,                                  330, 5,    9,    30,   3,    null),
  ('Pesto basilic',                 'Pesto vert (basilic)',                480, 5,    6,    48,   2,    null),
  ('Graines de chia',               null,                                  null, null, 8,   null, null, null),
  ('Graines de lin',                null,                                  null, null, 2,   null, null, null),
  ('Noix de pécan',                 null,                                  null, null, 4,   null, null, null),
  ('Noix du Brésil',                null,                                  null, null, 4,   null, null, null),
  ('Noix',                          null,                                  null, null, 7,   null, null, null),
  ('Noisettes',                     null,                                  null, null, 7,   null, null, null),
  ('Amandes',                       null,                                  null, null, 8,   null, null, null),
  ('Cacahuètes',                    null,                                  null, null, 8,   null, null, null),
  ('Graines de courge',             null,                                  null, null, 5,   null, null, null),
  ('Pistaches',                     null,                                  null, null, 17,  null, null, null),
  ('Graines de sésame',             null,                                  null, null, 12,  null, null, null),
  ('Graines de tournesol',          null,                                  null, null, 11,  null, null, null),
  ('Beurre d''amande',              null,                                  null, null, 9,   null, null, null),
  ('Tahini (sésame)',               null,                                  null, null, 12,  null, null, null),
  ('Beurre de cacahuète',           null,                                  null, null, 14,  null, null, null),
  ('Chocolat noir 70%',             null,                                  null, null, 33,  null, 11,   null),
  ('Chocolat noir 85%',             null,                                  null, null, 18,  null, 13,   null),
  ('Pois chiches pesé cru',         'Pois chiches secs crus',              340, null, 46,   null, null, null),
  ('Houmous',                       null,                                  270, 7,    12,   21,   5,    null),
  ('Olives noires',                 'Olives noires (en saumure)',          180, null, null, 18,   null, null),
  ('Truite cuite',                  null,                                  155, 24,   null, 6.5,  null, null),
  ('Saumon fumé',                   null,                                  175, 22,   null, 9.5,  null, null),
  ('Porc (rôti)',                   'Rôti de porc cuit',                   185, 28,   0,    8,    null, null),
  ('Steak haché 5% MG',             'Steak haché 5% MG cru',               125, 21,   0,    5,    null, null),
  ('Steak haché 10% MG',            'Steak haché 10% MG cru',              null, null, null, null, null, null),
  ('Steak haché 15% MG',            'Steak haché 15% MG cru',              null, null, null, null, null, null),
  ('Galettes de sarrasin (farine)', 'Farine de sarrasin',                  null, null, null, null, null, null),
  ('Fromage blanc 3%',              'Fromage blanc 3% MG',                 75,  7,    4,    3.2,  null, null),
  ('Fromage blanc 40%',             'Fromage blanc 8% MG',                 null, null, null, null, null, null),
  ('Maïs en conserve',              null,                                  100, null, null, null, null, 'feculent'),
  ('Lait de coco',                  null,                                  null, null, null, null, null, 'condiment'),
  ('Bœuf, filet',                   'Bœuf, filet cru',                     null, null, null, null, null, null),
  ('Bœuf, entrecôte',               'Bœuf, entrecôte crue',                null, null, null, null, null, null),
  ('Bœuf, rumsteak',                'Bœuf, rumsteak cru',                  null, null, null, null, null, null),
  ('Veau, escalope',                'Veau, escalope crue',                 null, null, null, null, null, null),
  ('Porc, filet',                   'Porc, filet cru',                     null, null, null, null, null, null),
  ('Porc, côtelette',               'Porc, côtelette crue',                null, null, null, null, null, null),
  ('Agneau, gigot',                 'Agneau, gigot cru',                   null, null, null, null, null, null),
  ('Canard (aiguillettes)',         'Canard (aiguillettes) cru',           null, null, null, null, null, null),
  ('Canard (magret, sans peau)',    'Canard (magret, sans peau) cru',      null, null, null, null, null, null),
  ('Canard (cuisse)',               'Canard (cuisse) crue',                null, null, null, null, null, null),
  ('Steak de dinde haché',          'Steak de dinde haché cru',            null, null, null, null, null, null),
  ('Merguez',                       'Merguez crue',                        null, null, null, null, null, null),
  ('Chipolata',                     'Chipolata crue',                      null, null, null, null, null, null),
  ('Thon frais',                    'Thon frais cru',                      null, null, null, null, null, null),
  ('Mâche',                         null,                                  null, null, 1.5, null, null, null),
  ('Blanc d''oeuf liquide ml',      'Blanc d''œuf liquide (brique)',       null, null, null, null, null, null),
  ('Tomate séchée',                 'Tomate séchée (sans huile)',          null, null, null, null, null, 'legume'),
  ('Farine d''avoine Good Morning', 'Farine d''avoine',                    null, null, null, null, null, null),
  ('Céréales Coco Pops',            'Céréales chocolatées (type Coco Pops)', null, null, null, null, null, null),
  ('Carré frais 0%',                'Fromage frais 0% (type Carré frais)', null, null, null, null, null, null),
  ('Patate douce pesé cru',         'Patate douce crue',                   null, null, null, null, null, null),
  ('Patate pesée cru',              'Pomme de terre crue',                 null, null, null, null, null, null),
  ('Semoule pesé cru',              'Semoule crue',                        null, null, null, null, null, null),
  ('Semoule pesé cuit',             'Semoule (couscous) cuite',            null, null, null, null, null, null),
  ('Sarrasin pesé cru',             'Sarrasin cru',                        null, null, null, null, null, null),
  ('Sarrasin pesé cuit',            'Sarrasin cuit',                       null, null, null, null, null, null),
  ('Boulgour pesé cru',             'Boulgour cru',                        null, null, 64,  null, 12,   null),
  ('Lentilles corail pesé cru',     'Lentilles corail crues',              null, null, null, null, null, null),
  ('Lentilles vertes pesé cru',     'Lentilles vertes crues',              null, null, null, null, null, null),
  ('Haricots blancs pesé cru',      'Haricots blancs secs crus',           null, null, null, null, null, null),
  ('Haricots rouges pesé cru',      'Haricots rouges secs crus',           null, null, null, null, null, null),
  ('Riz basmati pesé cru',          'Riz basmati cru',                     null, null, null, null, null, null),
  ('Riz complet pesé cru',          'Riz complet cru',                     null, null, null, null, null, null),
  ('Pomme de terre cuite',          'Pomme de terre cuite (vapeur ou eau)', 80, 2,    17,   0.1,  2,    null),
  ('Oeuf entier /100g',             'Œuf entier (100 g)',                  null, null, null, null, null, null),
  ('Oeuf entier',                   'Œuf entier (1 pièce)',                75,  6.5,  0.3,  5.2,  null, null),
  ('Orange 1 moyenne',              null,                                  65,  1.3,  13,   0.2,  3,    null),
  ('Pomme 1 moyenne',               null,                                  78,  0.4,  17,   0.3,  3.5,  null),
  ('Framboises',                    null,                                  45,  null, 4.5,  null, null, null),
  ('Haricots rouges cuits',         null,                                  115, null, 14,   null, null, null),
  ('Lardons nature',                null,                                  290, 15,   0.5,  25,   null, null),
  ('Chèvre frais',                  null,                                  200, 11,   3,    16,   null, null)
) as c(ancien, nouveau, kcal, p, g, l, f, cat)
where a.nom = c.ancien and a.actif is not false;

-- ── Ajout : steak haché 5 % cuit ────────────────────────────────────────────
insert into public.aliments_bdd (nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
select 'Steak haché 5% MG cuit', 150, 26, 0, 5, 0, null, 'viande'
where not exists (select 1 from public.aliments_bdd where nom = 'Steak haché 5% MG cuit');

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : plus aucun ancien nom actif (0 ligne « ancien nom encore présent »),
-- le nombre d'aliments actifs et désactivés.
select 'ancien nom encore présent' as quoi, count(*)::text as detail
from public.aliments_bdd
where actif is not false and nom in ('Moutarde', 'Pesto basilic', 'Porc (rôti)', 'Steak haché 5% MG', 'Steak haché 10% MG',
  'Oeuf entier', 'Patate pesée cru', 'Semoule pesé cuit', 'Pomme de terre cuite', 'Boulgour pesé cru')
union all
select 'aliments actifs', count(*)::text from public.aliments_bdd where actif is not false
union all
select 'aliments désactivés (doublons)', count(*)::text from public.aliments_bdd where actif = false;
