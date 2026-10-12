-- ============================================================================
-- APEX APP — Étape 3 : fiche client, séances au studio (12 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Ce que ça fait :
--   1. Programmes des clients :
--        client_programmes.nb_semaines  nombre de semaines de la phase
--                                       (repris du modèle d'origine)
--        client_prog_seances.lieu       « distance » (par défaut, tous les
--                                       programmes actuels) ou « studio »
--   2. Grille de séance au studio :
--        seances_studio_semaines  case « faite » d'une séance pour une semaine
--                                 de la phase (date, coach)
--        seances_studio_saisies   charge, reps et remarque d'un exercice pour
--                                 une semaine
--      Tous les coachs lisent et écrivent ; le client lit les siennes.
--   3. Profil coaching (table fiche_coach) : notes sur 3, tutoiement,
--      topo client. Réservé aux coachs : le client ne peut pas le lire.
--      Écriture : coach référent et gérants.
--
-- Ce que ça ne change pas : aucune donnée existante n'est modifiée, sauf le
-- remplissage de nb_semaines. Rien ne change pour les clients tant qu'aucune
-- séance n'est passée en « studio ».
--
-- Tout est dans une transaction : si une ligne échoue, rien n'est appliqué.
-- Relançable sans risque.
-- ============================================================================

begin;

-- ── 1. Programmes ───────────────────────────────────────────────────────────
alter table public.client_programmes
  add column if not exists nb_semaines integer not null default 4;

update public.client_programmes cp
set nb_semaines = t.nb_semaines
from public.prog_templates t
where cp.template_id = t.id
  and t.nb_semaines is not null
  and cp.nb_semaines is distinct from t.nb_semaines;

alter table public.client_prog_seances
  add column if not exists lieu text not null default 'distance';
alter table public.client_prog_seances drop constraint if exists client_prog_seances_lieu_check;
alter table public.client_prog_seances add constraint client_prog_seances_lieu_check
  check (lieu in ('distance', 'studio'));

-- ── 2. Grille de séance au studio ───────────────────────────────────────────
create table if not exists public.seances_studio_semaines (
  id         uuid primary key default gen_random_uuid(),
  seance_id  uuid not null references public.client_prog_seances(id) on delete cascade,
  semaine    integer not null check (semaine between 1 and 52),
  faite      boolean not null default true,
  faite_le   date not null default current_date,
  coach_id   uuid references public.profiles(id) on delete set null default auth.uid(),
  maj_le     timestamptz not null default now(),
  unique (seance_id, semaine)
);

create table if not exists public.seances_studio_saisies (
  id           uuid primary key default gen_random_uuid(),
  exercice_id  uuid not null references public.client_prog_exercices(id) on delete cascade,
  semaine      integer not null check (semaine between 1 and 52),
  charge       text,
  reps         text,
  remarque     text,
  maj_par      uuid references public.profiles(id) on delete set null default auth.uid(),
  maj_le       timestamptz not null default now(),
  unique (exercice_id, semaine)
);

create index if not exists seances_studio_semaines_seance_idx on public.seances_studio_semaines (seance_id);
create index if not exists seances_studio_saisies_exercice_idx on public.seances_studio_saisies (exercice_id);

alter table public.seances_studio_semaines enable row level security;
alter table public.seances_studio_saisies  enable row level security;

drop policy if exists studio_semaines_coach on public.seances_studio_semaines;
create policy studio_semaines_coach on public.seances_studio_semaines
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());

drop policy if exists studio_semaines_client_read on public.seances_studio_semaines;
create policy studio_semaines_client_read on public.seances_studio_semaines
  for select to authenticated
  using (exists (
    select 1 from public.client_prog_seances s
    join public.client_programmes p on p.id = s.programme_id
    where s.id = seances_studio_semaines.seance_id and p.client_id = auth.uid()
  ));

drop policy if exists studio_saisies_coach on public.seances_studio_saisies;
create policy studio_saisies_coach on public.seances_studio_saisies
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());

drop policy if exists studio_saisies_client_read on public.seances_studio_saisies;
create policy studio_saisies_client_read on public.seances_studio_saisies
  for select to authenticated
  using (exists (
    select 1 from public.client_prog_exercices e
    join public.client_prog_seances s on s.id = e.seance_id
    join public.client_programmes p on p.id = s.programme_id
    where e.id = seances_studio_saisies.exercice_id and p.client_id = auth.uid()
  ));

-- ── 3. Profil coaching ──────────────────────────────────────────────────────
create table if not exists public.fiche_coach (
  client_id      uuid primary key references public.profiles(id) on delete cascade,
  aime_discuter  smallint not null default 0 check (aime_discuter between 0 and 3),
  technique      smallint not null default 0 check (technique between 0 and 3),
  style_pro      smallint not null default 0 check (style_pro between 0 and 3),  -- bon copain (1) → pro (3)
  energie        smallint not null default 0 check (energie between 0 and 3),    -- douceur (1) → énergique (3)
  vouvoiement    boolean not null default false,
  topo           text,
  maj_par        uuid references public.profiles(id) on delete set null default auth.uid(),
  maj_le         timestamptz not null default now()
);

alter table public.fiche_coach enable row level security;

drop policy if exists fiche_coach_read  on public.fiche_coach;
drop policy if exists fiche_coach_write on public.fiche_coach;
create policy fiche_coach_read on public.fiche_coach
  for select to authenticated
  using (public.is_coach());
create policy fiche_coach_write on public.fiche_coach
  for all to authenticated
  using (public.est_referent(client_id) or public.is_gerant())
  with check (public.est_referent(client_id) or public.is_gerant());

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : les trois tables avec RLS active et leurs règles ; tous les
-- programmes en « distance ».
select 'table' as quoi, c.relname::text as objet,
       case when c.relrowsecurity then 'RLS active' else 'RLS DESACTIVEE' end as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('seances_studio_semaines', 'seances_studio_saisies', 'fiche_coach')
union all
select 'regle', tablename::text, policyname || ' | ' || cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('seances_studio_semaines', 'seances_studio_saisies', 'fiche_coach')
union all
select 'seances', lieu, count(*)::text
from public.client_prog_seances group by lieu
order by 1, 2;
