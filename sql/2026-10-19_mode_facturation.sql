-- ============================================================================
-- APEX APP — Mode de facturation d'un client (19 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Prépare l'étape 6 (facturation). Chaque client reçoit un mode :
--   abonnement     abonnement seul
--   consommation   séances à la consommation seules
--   mixte          abonnement + séances à la consommation
--   (vide)         pas encore défini
-- Les montants (abonnement mensuel, tarif horaire) viendront avec l'étape 6.
--
-- Les clients déjà cochés « Abonnement + séances à la consommation » passent
-- en « mixte » ; les autres restent « pas encore défini ».
-- L'ancienne case facturation_mixte est conservée et suit automatiquement le
-- mode (l'agenda s'en sert pour la case « inclus / en plus »).
-- Modifiable par les gérants seulement (comme la facturation aujourd'hui).
-- Transaction, relançable sans risque.
-- ============================================================================

begin;

alter table public.profiles add column if not exists mode_facturation text;

alter table public.profiles drop constraint if exists profiles_mode_facturation_check;
alter table public.profiles add constraint profiles_mode_facturation_check
  check (mode_facturation is null or mode_facturation in ('abonnement', 'consommation', 'mixte'));

-- Reprise de l'existant (une seule fois : seulement les clients sans mode)
update public.profiles set mode_facturation = 'mixte'
where facturation_mixte and mode_facturation is null;

-- facturation_mixte suit le mode
create or replace function public.profiles_sync_facturation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.mode_facturation is distinct from old.mode_facturation then
    new.facturation_mixte := (new.mode_facturation = 'mixte');
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_facturation on public.profiles;
create trigger profiles_sync_facturation
  before update on public.profiles
  for each row execute function public.profiles_sync_facturation();

-- Protection des profils : le mode de facturation est réservé aux gérants
-- (reprend la version du 17 octobre 2026 en ajoutant mode_facturation)
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
         or new.type_client <> 'suivi' or new.facturation_mixte
         or new.mode_facturation is not null then
        raise exception 'Création de profil non autorisée';
      end if;
    else
      if new.role is distinct from old.role and not public.is_gerant() then
        raise exception 'Modification du rôle non autorisée';
      end if;
      if new.is_gerant is distinct from old.is_gerant and not public.is_gerant() then
        raise exception 'Modification du statut gérant non autorisée';
      end if;
      if (new.facturation_mixte is distinct from old.facturation_mixte
          or new.mode_facturation is distinct from old.mode_facturation)
         and not public.is_gerant() then
        raise exception 'Modification de la facturation non autorisée';
      end if;
      if (new.coach_referent_id is distinct from old.coach_referent_id
          or new.type_client is distinct from old.type_client
          or new.telephone is distinct from old.telephone
          or new.actif is distinct from old.actif
          or new.date_debut is distinct from old.date_debut
          or new.semaine_courante is distinct from old.semaine_courante
          or new.email is distinct from old.email
          or new.coach_tag is distinct from old.coach_tag)
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

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : le nombre de clients par mode, et « mixte » = ceux qui étaient cochés.
select coalesce(mode_facturation, 'pas encore défini') as mode, count(*) as clients,
       count(*) filter (where facturation_mixte) as cases_mixte_cochees
from public.profiles
where role = 'client'
group by 1
order by 1;
