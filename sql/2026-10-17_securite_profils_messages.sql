-- ============================================================================
-- APEX APP — Sécurité : profils et messages (17 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Corrige les points relevés par l'audit du 17 octobre :
--   1. Profils (trigger protect_profile_role) :
--      - changer le rôle d'un compte (client → coach) : gérants seulement
--        (avant : n'importe quel coach, donc un référent pouvait faire de son
--        client un coach ayant accès à toutes les données) ;
--      - facturation (« Abonnement + séances à la consommation ») : gérants
--        seulement, comme le prévoit la matrice de droits ;
--      - un client ne peut plus modifier lui-même son téléphone, son statut
--        actif/inactif, sa date de début de suivi, sa semaine courante, son
--        email ni son étiquette : seuls les coachs le peuvent.
--      Ce que le client remplit lui-même (prénom, âge, sexe, taille, poids,
--      objectif, métier, pas) reste modifiable par lui.
--   2. Messages : supprimer le compte d'un coach qui a écrit des messages
--      échouait (le trigger refusait que l'auteur passe à « vide ») ; les
--      messages restent, sans auteur.
--   3. Messages et « Vu » : l'heure est toujours celle du serveur (on ne peut
--      plus antidater ni postdater un message ou une lecture).
--
-- Les opérations faites par les fonctions serveur (clé de service : création
-- de compte, crons) ne sont pas concernées. Ne modifie aucune donnée.
-- Transaction, relançable sans risque.
-- ============================================================================

begin;

-- ── 1. Profils ──────────────────────────────────────────────────────────────
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
      if new.role is distinct from old.role and not public.is_gerant() then
        raise exception 'Modification du rôle non autorisée';
      end if;
      if new.is_gerant is distinct from old.is_gerant and not public.is_gerant() then
        raise exception 'Modification du statut gérant non autorisée';
      end if;
      if new.facturation_mixte is distinct from old.facturation_mixte and not public.is_gerant() then
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

-- ── 2. Messages : un compte supprimé laisse ses messages sans auteur ─────────
create or replace function public.messages_proteger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Suppression du compte de l'auteur (clé étrangère « on delete set null »)
  if new.auteur_id is null and old.auteur_id is not null
     and new.client_id = old.client_id and new.canal = old.canal
     and new.cree_le = old.cree_le and new.supprime = old.supprime
     and new.texte is not distinct from old.texte
     and new.piece_path is not distinct from old.piece_path then
    return new;
  end if;
  if new.client_id is distinct from old.client_id or new.canal is distinct from old.canal
     or new.auteur_id is distinct from old.auteur_id or new.cree_le is distinct from old.cree_le
     or not new.supprime then
    raise exception 'Un message ne peut pas être modifié, seulement supprimé';
  end if;
  new.texte := null;
  new.piece_type := null;
  new.piece_path := null;
  new.piece_duree := null;
  return new;
end;
$$;

-- ── 3. Heure du serveur pour les messages et les lectures ───────────────────
create or replace function public.messages_heure_serveur()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.cree_le := now();
  return new;
end;
$$;

drop trigger if exists messages_heure_serveur on public.messages;
create trigger messages_heure_serveur
  before insert on public.messages
  for each row execute function public.messages_heure_serveur();

create or replace function public.lectures_heure_serveur()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.lu_jusqu_a := now();
  return new;
end;
$$;

drop trigger if exists lectures_heure_serveur on public.messages_lectures;
create trigger lectures_heure_serveur
  before insert or update on public.messages_lectures
  for each row execute function public.lectures_heure_serveur();

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : les 3 fonctions mises à jour (« gérant pour le rôle : oui »,
-- « auteur supprimé accepté : oui ») et les 2 nouveaux déclencheurs.
select 'protect_profile_role' as quoi,
       'gérant pour le rôle : ' || case when position('role is distinct from old.role and not public.is_gerant()'
         in pg_get_functiondef('public.protect_profile_role()'::regprocedure)) > 0 then 'oui' else 'NON' end as detail
union all
select 'messages_proteger',
       'auteur supprimé accepté : ' || case when position('new.auteur_id is null and old.auteur_id is not null'
         in pg_get_functiondef('public.messages_proteger()'::regprocedure)) > 0 then 'oui' else 'NON' end
union all
select 'declencheur', tgname::text
from pg_trigger where tgname in ('messages_heure_serveur', 'lectures_heure_serveur') and not tgisinternal;
