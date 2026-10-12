-- ============================================================================
-- APEX APP — Étape 4 : journal de suivi (12 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Ce que ça fait :
--   1. Table journal_suivi : une ligne par client et par lundi (semaine).
--        nutrition : action prévue / modification appliquée
--        entraînement : action prévue / modification appliquée
--        retour du client (texte libre), case « Fait »
--   2. Table journal_suivi_entete : par client, la durée du suivi
--      (26 semaines par défaut) et les leviers prioritaires.
--   Droits (matrice du cahier des charges, « Journal de suivi ») :
--      coach référent : lecture et écriture ; gérants : lecture ;
--      autres coachs et client : aucun accès.
--
-- Ce que ça ne change pas : aucune donnée ni règle existante.
-- Tout est dans une transaction. Relançable sans risque.
-- ============================================================================

begin;

create table if not exists public.journal_suivi (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references public.profiles(id) on delete cascade,
  semaine                date not null,     -- lundi de la semaine
  nutrition_prevue       text,
  nutrition_appliquee    text,
  entrainement_prevu     text,
  entrainement_applique  text,
  retour                 text,
  fait                   boolean not null default false,
  fait_le                timestamptz,
  maj_par                uuid references public.profiles(id) on delete set null default auth.uid(),
  maj_le                 timestamptz not null default now(),
  unique (client_id, semaine),
  constraint journal_suivi_lundi_check check (extract(isodow from semaine) = 1)
);

create index if not exists journal_suivi_client_idx on public.journal_suivi (client_id, semaine);

create table if not exists public.journal_suivi_entete (
  client_id    uuid primary key references public.profiles(id) on delete cascade,
  nb_semaines  integer not null default 26 check (nb_semaines between 1 and 104),
  leviers      text,
  maj_par      uuid references public.profiles(id) on delete set null default auth.uid(),
  maj_le       timestamptz not null default now()
);

alter table public.journal_suivi        enable row level security;
alter table public.journal_suivi_entete enable row level security;

drop policy if exists journal_suivi_referent    on public.journal_suivi;
drop policy if exists journal_suivi_gerant_read on public.journal_suivi;
create policy journal_suivi_referent on public.journal_suivi
  for all to authenticated
  using (public.est_referent(client_id))
  with check (public.est_referent(client_id));
create policy journal_suivi_gerant_read on public.journal_suivi
  for select to authenticated
  using (public.is_gerant());

drop policy if exists journal_entete_referent    on public.journal_suivi_entete;
drop policy if exists journal_entete_gerant_read on public.journal_suivi_entete;
create policy journal_entete_referent on public.journal_suivi_entete
  for all to authenticated
  using (public.est_referent(client_id))
  with check (public.est_referent(client_id));
create policy journal_entete_gerant_read on public.journal_suivi_entete
  for select to authenticated
  using (public.is_gerant());

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : les deux tables avec « RLS active » et 2 règles chacune.
select 'table' as quoi, c.relname::text as objet,
       case when c.relrowsecurity then 'RLS active' else 'RLS DESACTIVEE' end as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('journal_suivi', 'journal_suivi_entete')
union all
select 'regle', tablename::text, policyname || ' | ' || cmd || ' | ' || coalesce(qual, '-')
from pg_policies
where schemaname = 'public' and tablename in ('journal_suivi', 'journal_suivi_entete')
order by 1, 2, 3;
