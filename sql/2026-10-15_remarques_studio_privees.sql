-- ============================================================================
-- APEX APP — Remarques de la grille du studio réservées aux coachs
-- (15 octobre 2026). À coller dans Supabase → SQL Editor → Run.
--
-- Dans la grille d'une séance au studio, le coach note pour chaque exercice et
-- chaque semaine : charge, répétitions et une remarque. Jusqu'ici, le client
-- pouvait lire toute la ligne, remarque comprise.
-- Maintenant :
--   - le client n'a plus accès direct à la table seances_studio_saisies ;
--   - il lit ses charges et répétitions par la fonction charges_studio_client(),
--     qui ne renvoie PAS la remarque, et seulement pour ses propres exercices.
-- Les droits des coachs ne changent pas. Aucune donnée n'est modifiée.
-- Transaction, relançable sans risque.
-- ============================================================================

begin;

drop policy if exists studio_saisies_client_read on public.seances_studio_saisies;

create or replace function public.charges_studio_client(p_exercices uuid[])
returns table (exercice_id uuid, semaine integer, charge text, reps text)
language sql
stable
security definer
set search_path = public
as $$
  select sa.exercice_id, sa.semaine, sa.charge, sa.reps
  from public.seances_studio_saisies sa
  join public.client_prog_exercices e on e.id = sa.exercice_id
  join public.client_prog_seances s   on s.id = e.seance_id
  join public.client_programmes p     on p.id = s.programme_id
  where sa.exercice_id = any (p_exercices)
    and p.client_id = auth.uid();
$$;

revoke all on function public.charges_studio_client(uuid[]) from public, anon;
grant execute on function public.charges_studio_client(uuid[]) to authenticated;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : une seule règle sur seances_studio_saisies (studio_saisies_coach)
-- et la fonction charges_studio_client, exécutable par authenticated.
select 'regle' as quoi, policyname::text as detail
from pg_policies where schemaname = 'public' and tablename = 'seances_studio_saisies'
union all
select 'fonction', p.proname || case when has_function_privilege('authenticated', p.oid, 'execute') then ' : authenticated OK' else ' : NON exécutable' end
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'charges_studio_client'
order by 1, 2;
