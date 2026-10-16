-- ============================================================================
-- APEX APP — Réglage des notifications par client (16 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Une ligne par client (créée au premier réglage) : chaque notification peut
-- être coupée. Sans ligne, tout est activé (comportement actuel).
--   bilan         bilan de la semaine disponible
--   rappel_bilan  rappel du dimanche 21 h si le bilan n'est pas rempli
--   journal       rappel du journal alimentaire (20 h)
--   habitudes     rappel des habitudes (21 h)
--   plan          nouveau plan alimentaire
-- Les notifications de messages restent toujours actives (choix de Benjamin).
--
-- Droits : lecture par le client lui-même et par les coachs ; modification par
-- le coach référent et les gérants. Les crons lisent avec la clé de service.
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

create table if not exists public.notifications_client (
  client_id     uuid primary key references public.profiles(id) on delete cascade,
  bilan         boolean not null default true,
  rappel_bilan  boolean not null default true,
  journal       boolean not null default true,
  habitudes     boolean not null default true,
  plan          boolean not null default true,
  maj_par       uuid references public.profiles(id) on delete set null default auth.uid(),
  maj_le        timestamptz not null default now()
);

alter table public.notifications_client enable row level security;

drop policy if exists notifications_client_lire     on public.notifications_client;
drop policy if exists notifications_client_creer    on public.notifications_client;
drop policy if exists notifications_client_modifier on public.notifications_client;
create policy notifications_client_lire on public.notifications_client
  for select to authenticated
  using (client_id = auth.uid() or public.is_coach());
create policy notifications_client_creer on public.notifications_client
  for insert to authenticated
  with check (public.est_referent(client_id) or public.is_gerant());
create policy notifications_client_modifier on public.notifications_client
  for update to authenticated
  using (public.est_referent(client_id) or public.is_gerant())
  with check (public.est_referent(client_id) or public.is_gerant());
-- Pas de règle de suppression : la ligne disparaît seulement avec le client.

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : la table « RLS active » et ses trois règles.
select 'table' as quoi,
       c.relname::text || case when c.relrowsecurity then ' : RLS active' else ' : RLS DESACTIVEE' end as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'notifications_client'
union all
select 'regle', policyname || ' | ' || cmd
from pg_policies where schemaname = 'public' and tablename = 'notifications_client'
order by 1, 2;
