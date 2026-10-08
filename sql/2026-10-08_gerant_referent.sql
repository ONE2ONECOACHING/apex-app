-- ============================================================================
-- APEX APP — Étape 1, lot 1 : rôle gérant et coach référent (8 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- AVANT DE LANCER : remplacer TON_EMAIL_ICI (section 4) par l'adresse du
-- compte gérant, déjà créé dans Authentication → Users.
--
-- Ce que ça fait :
--   1. Ajoute deux colonnes au profil :
--        is_gerant          (oui / non, non par défaut)
--        coach_referent_id  (le coach référent d'un client)
--   2. Ajoute deux fonctions utilisées plus tard par les règles d'accès :
--        is_gerant()             → la personne connectée est-elle gérante ?
--        est_referent(client)    → est-elle le référent de ce client ?
--   3. Protège ces colonnes : un client ne peut pas se nommer gérant ni
--      choisir son référent, un coach ne peut pas se nommer gérant.
--   4. Passe le compte indiqué en coach gérant.
--   5. Le compte coach partagé devient le référent de tous les clients
--      (rien ne change pour l'équipe tant que tout le monde l'utilise).
--
-- Ce que ça ne change pas : aucune règle d'accès existante, aucun écran.
-- Les clients ne voient aucune différence.
--
-- Tout est dans une transaction : si une ligne échoue, rien n'est appliqué.
-- Relançable sans risque.
-- ============================================================================

begin;

-- ── 1. Colonnes ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_gerant boolean not null default false;

-- « restrict » : impossible de supprimer un coach qui est encore référent
-- de clients ; il faut d'abord leur donner un autre référent.
alter table public.profiles
  add column if not exists coach_referent_id uuid
  references public.profiles(id) on delete restrict;

create index if not exists profiles_coach_referent_id_idx
  on public.profiles (coach_referent_id);

-- ── 2. Fonctions ────────────────────────────────────────────────────────────
create or replace function public.is_gerant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'coach' and is_gerant
  );
$$;

create or replace function public.est_referent(p_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_client and coach_referent_id = auth.uid()
  );
$$;

-- ── 3. Protection du rôle, du statut gérant et du référent ──────────────────
-- Les appels sans utilisateur (SQL Editor, Edge Functions en service_role)
-- ont auth.uid() = null et ne sont pas bloqués.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      if new.is_gerant or new.coach_referent_id is not null then
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
    end if;
  end if;

  -- Le référent doit être un compte coach.
  if new.coach_referent_id is not null and not exists (
    select 1 from public.profiles
    where id = new.coach_referent_id and role = 'coach'
  ) then
    raise exception 'Le coach référent doit être un compte coach';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before insert or update on public.profiles
  for each row execute function public.protect_profile_role();

-- ── 4. Compte gérant ────────────────────────────────────────────────────────
do $$
declare
  v_email text := 'TON_EMAIL_ICI';   -- ← remplacer par l'adresse du gérant
begin
  if not exists (select 1 from public.profiles where lower(email) = lower(v_email)) then
    raise exception 'Aucun compte avec l''adresse « % ». Crée-le d''abord dans Authentication → Users, puis relance.', v_email;
  end if;

  update public.profiles
  set role      = 'coach',
      is_gerant = true,
      prenom    = case when prenom = 'Client' then 'Benjamin' else prenom end,
      coach_referent_id = null
  where lower(email) = lower(v_email);
end;
$$;

-- ── 5. Compte partagé = référent de tous les clients ────────────────────────
update public.profiles
set coach_referent_id = 'fe2c19c2-e00f-4c4e-9543-3634022e42ff'
where role = 'client'
  and coach_referent_id is null
  and exists (
    select 1 from public.profiles
    where id = 'fe2c19c2-e00f-4c4e-9543-3634022e42ff' and role = 'coach'
  );

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : 2 comptes coach dont 1 gérant ; tous les clients ont un référent.
select role,
       count(*)                                   as comptes,
       count(*) filter (where is_gerant)          as gerants,
       count(*) filter (where coach_referent_id is not null) as avec_referent
from public.profiles
group by role
order by role;
