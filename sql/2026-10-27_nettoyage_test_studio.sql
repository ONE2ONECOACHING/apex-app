-- ============================================================================
-- APEX APP — Nettoyage avant la facturation (27 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Les essais de l'agenda sur la preview (9 octobre 2026) ont laissé des
-- créneaux supprimés du client « Test Studio » dans agenda_suppressions.
-- Ils sortiraient dans la liste des créneaux supprimés de la facturation :
-- on les retire. Rien d'autre n'est touché (ni l'agenda, ni les clients).
--
-- AVANT de lancer tout le script, tu peux voir ce qui sera retiré en
-- sélectionnant seulement la requête ci-dessous puis Run :
--
--   select client_nom, debut, supprime_le from public.agenda_suppressions
--   where client_nom ilike 'test studio%'
--      or client_id in (select id from public.profiles
--                       where trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) ilike 'test studio%')
--   order by debut;
--
-- Transaction, relançable sans risque (la 2e fois, il n'y a plus rien à retirer).
-- ============================================================================

begin;

delete from public.agenda_suppressions
where client_nom ilike 'test studio%'
   or client_id in (select id from public.profiles
                    where trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) ilike 'test studio%');

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : « Test Studio restants » = 0, puis les autres créneaux supprimés
-- (les vrais), qui restent pour la facturation.
select 'Test Studio restants' as quoi, count(*)::text as detail
from public.agenda_suppressions
where client_nom ilike 'test studio%'
   or client_id in (select id from public.profiles
                    where trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) ilike 'test studio%')
union all
select 'Autres créneaux supprimés (conservés)', count(*)::text
from public.agenda_suppressions;
