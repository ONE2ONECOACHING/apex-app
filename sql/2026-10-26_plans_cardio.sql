-- ============================================================================
-- APEX APP — Plans cardio (HYROX…) pour le studio (26 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Remplace les Google Sheets des plans cardio :
--   - Modèles (bibliothèque commune) : phases (onglets « HYROX prépa 1 »…),
--     chaque phase = séances numérotées en texte libre + titre court.
--   - Plan d'un client : copie complète d'un modèle (toutes les phases), puis
--     adaptée ; chaque séance a une case « faite » (date, coach), une note
--     (temps réalisé…) et un repère « à modifier ».
--
-- Droits (choix de Benjamin) : tous les coachs lisent et modifient ; le client
-- n'y a pas accès (rien dans son app).
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

-- ── Modèles ─────────────────────────────────────────────────────────────────
create table if not exists public.cardio_modeles (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  description text,
  actif       boolean not null default true,
  coach_id    uuid references public.profiles(id) on delete set null default auth.uid(),
  cree_le     timestamptz not null default now()
);

create table if not exists public.cardio_modele_phases (
  id         uuid primary key default gen_random_uuid(),
  modele_id  uuid not null references public.cardio_modeles(id) on delete cascade,
  nom        text not null default 'Phase',
  ordre      integer not null default 0
);

create table if not exists public.cardio_modele_seances (
  id        uuid primary key default gen_random_uuid(),
  phase_id  uuid not null references public.cardio_modele_phases(id) on delete cascade,
  ordre     integer not null default 0,
  titre     text,
  contenu   text
);

-- ── Plans des clients ───────────────────────────────────────────────────────
create table if not exists public.cardio_plans (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.profiles(id) on delete cascade,
  modele_id  uuid references public.cardio_modeles(id) on delete set null,
  nom        text not null,
  actif      boolean not null default true,
  cree_par   uuid references public.profiles(id) on delete set null default auth.uid(),
  cree_le    timestamptz not null default now()
);

create table if not exists public.cardio_phases (
  id       uuid primary key default gen_random_uuid(),
  plan_id  uuid not null references public.cardio_plans(id) on delete cascade,
  nom      text not null default 'Phase',
  ordre    integer not null default 0
);

create table if not exists public.cardio_seances (
  id          uuid primary key default gen_random_uuid(),
  phase_id    uuid not null references public.cardio_phases(id) on delete cascade,
  ordre       integer not null default 0,
  titre       text,
  contenu     text,
  note        text,
  a_modifier  boolean not null default false,
  faite       boolean not null default false,
  faite_le    date,
  faite_par   uuid references public.profiles(id) on delete set null,
  maj_par     uuid references public.profiles(id) on delete set null default auth.uid(),
  maj_le      timestamptz not null default now()
);

create index if not exists cardio_modele_phases_modele_idx on public.cardio_modele_phases (modele_id, ordre);
create index if not exists cardio_modele_seances_phase_idx on public.cardio_modele_seances (phase_id, ordre);
create index if not exists cardio_plans_client_idx         on public.cardio_plans (client_id);
create index if not exists cardio_phases_plan_idx          on public.cardio_phases (plan_id, ordre);
create index if not exists cardio_seances_phase_idx        on public.cardio_seances (phase_id, ordre);

-- ── Droits : tous les coachs, pas les clients ───────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['cardio_modeles', 'cardio_modele_phases', 'cardio_modele_seances',
                           'cardio_plans', 'cardio_phases', 'cardio_seances'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_coachs', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_coach()) with check (public.is_coach())',
                   t || '_coachs', t);
  end loop;
end;
$$;

-- Qui a modifié / coché : imposé par la base (comme le reste, lot 3 de l'audit)
drop trigger if exists imposer_auteur on public.cardio_seances;
create trigger imposer_auteur before insert or update on public.cardio_seances
  for each row execute function public.imposer_auteur('maj_par');

-- ── Attribuer un modèle à un client (copie complète, en une fois) ───────────
create or replace function public.attribuer_plan_cardio(p_modele uuid, p_client uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan uuid;
  ph record;
  v_phase uuid;
begin
  if not public.is_coach() then raise exception 'Réservé aux coachs'; end if;
  insert into public.cardio_plans (client_id, modele_id, nom)
  select p_client, m.id, m.nom from public.cardio_modeles m where m.id = p_modele
  returning id into v_plan;
  if v_plan is null then raise exception 'Modèle introuvable'; end if;
  for ph in select * from public.cardio_modele_phases where modele_id = p_modele order by ordre loop
    insert into public.cardio_phases (plan_id, nom, ordre) values (v_plan, ph.nom, ph.ordre)
    returning id into v_phase;
    insert into public.cardio_seances (phase_id, ordre, titre, contenu)
    select v_phase, s.ordre, s.titre, s.contenu
    from public.cardio_modele_seances s where s.phase_id = ph.id;
  end loop;
  return v_plan;
end;
$$;

-- ── Dupliquer un modèle ─────────────────────────────────────────────────────
create or replace function public.dupliquer_modele_cardio(p_modele uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_modele uuid;
  ph record;
  v_phase uuid;
begin
  if not public.is_coach() then raise exception 'Réservé aux coachs'; end if;
  insert into public.cardio_modeles (nom, description)
  select m.nom || ' (copie)', m.description from public.cardio_modeles m where m.id = p_modele
  returning id into v_modele;
  if v_modele is null then raise exception 'Modèle introuvable'; end if;
  for ph in select * from public.cardio_modele_phases where modele_id = p_modele order by ordre loop
    insert into public.cardio_modele_phases (modele_id, nom, ordre) values (v_modele, ph.nom, ph.ordre)
    returning id into v_phase;
    insert into public.cardio_modele_seances (phase_id, ordre, titre, contenu)
    select v_phase, s.ordre, s.titre, s.contenu
    from public.cardio_modele_seances s where s.phase_id = ph.id;
  end loop;
  return v_modele;
end;
$$;

revoke all on function public.attribuer_plan_cardio(uuid, uuid) from public, anon;
grant execute on function public.attribuer_plan_cardio(uuid, uuid) to authenticated;
revoke all on function public.dupliquer_modele_cardio(uuid) from public, anon;
grant execute on function public.dupliquer_modele_cardio(uuid) to authenticated;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : 6 tables « RLS active », 6 règles « _coachs », 2 fonctions.
select 'table' as quoi,
       c.relname::text || case when c.relrowsecurity then ' : RLS active' else ' : RLS DESACTIVEE' end as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('cardio_modeles', 'cardio_modele_phases', 'cardio_modele_seances', 'cardio_plans', 'cardio_phases', 'cardio_seances')
union all
select 'regle', tablename || ' | ' || policyname from pg_policies where policyname like '%\_coachs' escape '\' and tablename like 'cardio%'
union all
select 'fonction', proname::text from pg_proc where proname in ('attribuer_plan_cardio', 'dupliquer_modele_cardio')
order by 1, 2;
