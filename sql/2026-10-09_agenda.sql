-- ============================================================================
-- APEX APP — Étape 2 : agenda et clients du studio (9 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Ce que ça fait :
--   1. Fiche client : trois nouvelles informations
--        type_client        « suivi » (tous les clients actuels) ou « studio »
--        telephone
--        facturation_mixte  client à la fois en abonnement et à la consommation
--      Un client ne peut modifier aucune des trois lui-même.
--   2. Table agenda_creneaux : rendez-vous de coaching et indisponibilités.
--      Tous les coachs (gérants compris) lisent et modifient tout l'agenda.
--      Les clients n'y ont pas accès.
--   3. Table agenda_suppressions : chaque créneau supprimé y est recopié
--      automatiquement (qui, quand, quel client). Lecture réservée aux
--      gérants ; personne ne peut la modifier ni l'effacer depuis l'app.
--   4. transferer_coach (écran Équipe) transfère aussi les créneaux.
--
-- Ce que ça ne change pas : aucune donnée existante, aucune règle existante.
-- Les clients actuels deviennent « suivi » (valeur par défaut).
--
-- Tout est dans une transaction : si une ligne échoue, rien n'est appliqué.
-- Relançable sans risque.
-- ============================================================================

begin;

-- ── 1. Fiche client ─────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists type_client text not null default 'suivi';
alter table public.profiles
  add column if not exists telephone text;
alter table public.profiles
  add column if not exists facturation_mixte boolean not null default false;

alter table public.profiles drop constraint if exists profiles_type_client_check;
alter table public.profiles add constraint profiles_type_client_check
  check (type_client in ('suivi', 'studio'));

-- Protection des colonnes sensibles (reprend le trigger du lot 1 et ajoute
-- type_client et facturation_mixte, modifiables par les coachs seulement).
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      if new.is_gerant or new.coach_referent_id is not null
         or new.type_client <> 'suivi' or new.facturation_mixte then
        raise exception 'Création de profil non autorisée';
      end if;
    else
      if new.role is distinct from old.role and not public.is_coach() then
        raise exception 'Modification du rôle non autorisée';
      end if;
      if new.is_gerant is distinct from old.is_gerant and not public.is_gerant() then
        raise exception 'Modification du statut gérant non autorisée';
      end if;
      if new.coach_referent_id is distinct from old.coach_referent_id
         and not public.is_coach() then
        raise exception 'Modification du coach référent non autorisée';
      end if;
      if (new.type_client is distinct from old.type_client
          or new.facturation_mixte is distinct from old.facturation_mixte)
         and not public.is_coach() then
        raise exception 'Modification non autorisée';
      end if;
    end if;
  end if;

  if new.coach_referent_id is not null and not exists (
    select 1 from public.profiles
    where id = new.coach_referent_id and role = 'coach'
  ) then
    raise exception 'Le coach référent doit être un compte coach';
  end if;

  return new;
end;
$$;

-- ── 2. Agenda ───────────────────────────────────────────────────────────────
create table if not exists public.agenda_creneaux (
  id              uuid primary key default gen_random_uuid(),
  type            text not null default 'coaching'
                  check (type in ('coaching', 'indispo')),
  coach_id        uuid not null references public.profiles(id) on delete restrict,
  client_id       uuid references public.profiles(id) on delete cascade,
  debut           timestamptz not null,
  fin             timestamptz not null,
  journee_entiere boolean not null default false,
  en_plus         boolean not null default false,  -- false = inclus dans l'abonnement
  notes           text,
  serie_id        uuid,                            -- créneaux d'une même récurrence
  cree_par        uuid references public.profiles(id) on delete set null default auth.uid(),
  cree_le         timestamptz not null default now(),
  constraint agenda_creneaux_fin_check check (fin > debut),
  constraint agenda_creneaux_client_check check (
    (type = 'coaching' and client_id is not null)
    or (type = 'indispo' and client_id is null)
  )
);

create index if not exists agenda_creneaux_debut_idx  on public.agenda_creneaux (debut);
create index if not exists agenda_creneaux_coach_idx  on public.agenda_creneaux (coach_id, debut);
create index if not exists agenda_creneaux_client_idx on public.agenda_creneaux (client_id, debut);
create index if not exists agenda_creneaux_serie_idx  on public.agenda_creneaux (serie_id);

alter table public.agenda_creneaux enable row level security;

drop policy if exists agenda_coach_all on public.agenda_creneaux;
create policy agenda_coach_all on public.agenda_creneaux
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());

-- ── 3. Journal des suppressions ─────────────────────────────────────────────
create table if not exists public.agenda_suppressions (
  id           uuid primary key default gen_random_uuid(),
  creneau_id   uuid not null,
  type         text not null,
  coach_id     uuid,
  client_id    uuid,
  client_nom   text,           -- recopié : le client peut être supprimé ensuite
  debut        timestamptz not null,
  fin          timestamptz not null,
  en_plus      boolean not null,
  notes        text,
  serie_id     uuid,
  supprime_par uuid,           -- vide = suppression du compte client lui-même
  supprime_le  timestamptz not null default now()
);

create index if not exists agenda_suppressions_debut_idx on public.agenda_suppressions (debut);

alter table public.agenda_suppressions enable row level security;

drop policy if exists agenda_suppressions_gerant_read on public.agenda_suppressions;
create policy agenda_suppressions_gerant_read on public.agenda_suppressions
  for select to authenticated
  using (public.is_gerant());
-- Aucune règle d'écriture : seul le déclencheur ci-dessous y écrit.

create or replace function public.agenda_tracer_suppression()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into agenda_suppressions
    (creneau_id, type, coach_id, client_id, client_nom, debut, fin,
     en_plus, notes, serie_id, supprime_par)
  values
    (old.id, old.type, old.coach_id, old.client_id,
     (select trim(coalesce(prenom, '') || ' ' || coalesce(nom, ''))
      from profiles where id = old.client_id),
     old.debut, old.fin, old.en_plus, old.notes, old.serie_id, auth.uid());
  return old;
end;
$$;

drop trigger if exists agenda_creneaux_tracer_suppression on public.agenda_creneaux;
create trigger agenda_creneaux_tracer_suppression
  before delete on public.agenda_creneaux
  for each row execute function public.agenda_tracer_suppression();

-- ── 4. Transfert d'un coach supprimé (écran Équipe) ─────────────────────────
create or replace function public.transferer_coach(p_ancien uuid, p_nouveau uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_ancien = p_nouveau then
    raise exception 'Le remplaçant doit être un autre coach';
  end if;
  if not exists (select 1 from profiles where id = p_ancien and role = 'coach') then
    raise exception 'Coach à remplacer introuvable';
  end if;
  if not exists (select 1 from profiles where id = p_nouveau and role = 'coach') then
    raise exception 'Le remplaçant doit être un compte coach';
  end if;

  update profiles               set coach_referent_id = p_nouveau where coach_referent_id = p_ancien;
  update prog_templates         set coach_id = p_nouveau where coach_id = p_ancien;
  update bilan_templates        set coach_id = p_nouveau where coach_id = p_ancien;
  update formations             set coach_id = p_nouveau where coach_id = p_ancien;
  update client_programmes      set coach_id = p_nouveau where coach_id = p_ancien;
  update bilan_assignations     set coach_id = p_nouveau where coach_id = p_ancien;
  update bilan_instances        set coach_id = p_nouveau where coach_id = p_ancien;
  update formation_assignations set coach_id = p_nouveau where coach_id = p_ancien;
  update coach_notes            set coach_id = p_nouveau where coach_id = p_ancien;
  update agenda_creneaux        set coach_id = p_nouveau where coach_id = p_ancien;
end;
$$;

revoke all on function public.transferer_coach(uuid, uuid) from public, anon, authenticated;
grant execute on function public.transferer_coach(uuid, uuid) to service_role;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : les deux tables avec RLS active et leurs règles, et tous les
-- clients actuels en « suivi ».
select 'table' as quoi, c.relname::text as objet,
       case when c.relrowsecurity then 'RLS active' else 'RLS DESACTIVEE' end as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('agenda_creneaux', 'agenda_suppressions')
union all
select 'regle', tablename::text, policyname || ' | ' || cmd || ' | ' || coalesce(qual, '-')
from pg_policies
where schemaname = 'public' and tablename in ('agenda_creneaux', 'agenda_suppressions')
union all
select 'clients', type_client, count(*)::text
from public.profiles where role = 'client' group by type_client
order by 1, 2;
