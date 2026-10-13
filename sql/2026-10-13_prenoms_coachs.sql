-- ============================================================================
-- APEX APP — Prénom du coach dans les conversations (13 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Un client ne peut pas lire les fiches des coachs (règles de sécurité) : dans
-- la conversation « Équipe » d'un client studio, chaque réponse s'affiche donc
-- « Coach ». Cette fonction donne seulement l'identifiant et le PRÉNOM des
-- coachs, à un utilisateur connecté, pour afficher « Lola », « Diego »…
-- Rien d'autre n'est exposé (ni nom, ni email, ni téléphone).
--
-- Ne modifie aucune donnée. Transaction, relançable sans risque.
-- ============================================================================

begin;

create or replace function public.prenoms_coachs()
returns table (id uuid, prenom text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.prenom
  from public.profiles p
  where p.role = 'coach' and auth.uid() is not null;
$$;

revoke all on function public.prenoms_coachs() from public, anon;
grant execute on function public.prenoms_coachs() to authenticated;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : la fonction existe, « security definer », exécutable par authenticated.
select p.proname as fonction,
       case when p.prosecdef then 'security definer' else 'security invoker' end as mode,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_peut,
       has_function_privilege('anon', p.oid, 'execute') as anon_peut
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'prenoms_coachs';
