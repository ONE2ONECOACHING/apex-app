-- ============================================================================
-- APEX APP — Étape 1, lot 5 : droits par coach (8 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Applique la matrice de droits du cahier des charges (docs/cahier-des-charges.md) :
--
--   Élément                          Référent   Autre coach   Gérant
--   Infos client (profil, activités) L + É      L             L + É
--   Plan alimentaire, habitudes      L + É      L             L
--   Bilans                           L + É      —             L
--   Mesures, poids                   L + É      —             L
--   Journal alimentaire, habitudes   L          —             L
--   Notes coach de la semaine        L + É      —             L
--   Programmes et séances            inchangé : tous les coachs
--
-- Un gérant référent d'un client garde l'écriture au titre de référent.
-- Supprimer un profil : gérants uniquement.
--
-- Ce que ça ne change pas :
--   - les règles des clients sur leurs propres données (aucune n'est touchée) ;
--   - le compte coach partagé : il est référent de tous les clients, il garde
--     exactement ses droits actuels ;
--   - les envois automatiques (crons) qui passent par le service role.
--
-- Tout est dans une transaction : si une ligne échoue, rien n'est appliqué.
-- Relançable sans risque.
-- ============================================================================

begin;

-- ── Transition : référent par défaut des nouveaux comptes ───────────────────
-- Tant que l'équipe travaille sur le compte partagé, tout nouveau client le
-- reçoit comme référent (sinon le compte partagé perdrait l'accès à son plan
-- et à ses bilans). À retirer quand chaque coach aura son compte.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, prenom, role, coach_referent_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'prenom', 'Client'),
    'client',
    (select id from public.profiles
     where id = 'fe2c19c2-e00f-4c4e-9543-3634022e42ff' and role = 'coach')
  );
  return new;
end;
$$;

-- Clients créés depuis le lot 1, restés sans référent
update public.profiles
set coach_referent_id = 'fe2c19c2-e00f-4c4e-9543-3634022e42ff'
where role = 'client'
  and coach_referent_id is null
  and exists (select 1 from public.profiles
              where id = 'fe2c19c2-e00f-4c4e-9543-3634022e42ff' and role = 'coach');

-- ── Infos client ────────────────────────────────────────────────────────────
-- Lecture (profiles_select) : inchangée (soi-même ou tout coach).
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.est_referent(id) or public.is_gerant())
  with check (id = auth.uid() or public.est_referent(id) or public.is_gerant());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_gerant());

drop policy if exists activites_coach_all   on public.activites_sportives;
drop policy if exists activites_coach_read  on public.activites_sportives;
drop policy if exists activites_coach_write on public.activites_sportives;
create policy activites_coach_read on public.activites_sportives
  for select to authenticated
  using (public.is_coach());
create policy activites_coach_write on public.activites_sportives
  for all to authenticated
  using (public.est_referent(profile_id) or public.is_gerant())
  with check (public.est_referent(profile_id) or public.is_gerant());

-- ── Plan alimentaire ────────────────────────────────────────────────────────
drop policy if exists plans_coach_all   on public.plans_nutritionnels;
drop policy if exists plans_coach_read  on public.plans_nutritionnels;
drop policy if exists plans_coach_write on public.plans_nutritionnels;
create policy plans_coach_read on public.plans_nutritionnels
  for select to authenticated
  using (public.is_coach());
create policy plans_coach_write on public.plans_nutritionnels
  for all to authenticated
  using (public.est_referent(profile_id))
  with check (public.est_referent(profile_id));

drop policy if exists plan_repas_coach_all   on public.plan_repas;
drop policy if exists plan_repas_coach_read  on public.plan_repas;
drop policy if exists plan_repas_coach_write on public.plan_repas;
create policy plan_repas_coach_read on public.plan_repas
  for select to authenticated
  using (public.is_coach());
create policy plan_repas_coach_write on public.plan_repas
  for all to authenticated
  using (exists (select 1 from public.plans_nutritionnels p
                 where p.id = plan_repas.plan_id and public.est_referent(p.profile_id)))
  with check (exists (select 1 from public.plans_nutritionnels p
                      where p.id = plan_repas.plan_id and public.est_referent(p.profile_id)));

-- Habitudes fixées par le coach : comme le plan
drop policy if exists habitudes_config_coach       on public.habitudes_config;
drop policy if exists habitudes_config_coach_read  on public.habitudes_config;
drop policy if exists habitudes_config_coach_write on public.habitudes_config;
create policy habitudes_config_coach_read on public.habitudes_config
  for select to authenticated
  using (public.is_coach());
create policy habitudes_config_coach_write on public.habitudes_config
  for all to authenticated
  using (public.est_referent(profile_id))
  with check (public.est_referent(profile_id));

-- ── Suivi : lecture référent et gérants ─────────────────────────────────────
drop policy if exists habitudes_journal_coach on public.habitudes_journal;
create policy habitudes_journal_coach on public.habitudes_journal
  for select to authenticated
  using (public.est_referent(profile_id) or public.is_gerant());

drop policy if exists journal_coach_select on public.journal_entries;
create policy journal_coach_select on public.journal_entries
  for select to authenticated
  using (public.est_referent(profile_id) or public.is_gerant());

-- ── Mesures et poids : référent L + É, gérants L ────────────────────────────
drop policy if exists coaches_read_client_mesures on public.mesures;
drop policy if exists mesures_referent            on public.mesures;
drop policy if exists mesures_gerant_read         on public.mesures;
create policy mesures_referent on public.mesures
  for all to authenticated
  using (public.est_referent(profile_id))
  with check (public.est_referent(profile_id));
create policy mesures_gerant_read on public.mesures
  for select to authenticated
  using (public.is_gerant());

drop policy if exists poids_coach         on public.poids_journal;
drop policy if exists poids_referent      on public.poids_journal;
drop policy if exists poids_gerant_read   on public.poids_journal;
create policy poids_referent on public.poids_journal
  for all to authenticated
  using (public.est_referent(profile_id))
  with check (public.est_referent(profile_id));
create policy poids_gerant_read on public.poids_journal
  for select to authenticated
  using (public.is_gerant());

-- ── Bilans : référent L + É, gérants L ──────────────────────────────────────
drop policy if exists bilans_coach_all     on public.bilans_hebdo;
drop policy if exists bilans_referent      on public.bilans_hebdo;
drop policy if exists bilans_gerant_read   on public.bilans_hebdo;
create policy bilans_referent on public.bilans_hebdo
  for all to authenticated
  using (public.est_referent(profile_id))
  with check (public.est_referent(profile_id));
create policy bilans_gerant_read on public.bilans_hebdo
  for select to authenticated
  using (public.is_gerant());

-- Bilans envoyés : bi_insert et bi_update (le client remplit) inchangés.
drop policy if exists bi_select on public.bilan_instances;
create policy bi_select on public.bilan_instances
  for select to authenticated
  using (client_id = auth.uid() or public.est_referent(client_id) or public.is_gerant());

drop policy if exists coaches_can_mark_bilans_read on public.bilan_instances;
create policy coaches_can_mark_bilans_read on public.bilan_instances
  for update to authenticated
  using (public.est_referent(client_id))
  with check (public.est_referent(client_id));

-- Programmation des bilans
drop policy if exists ba_select on public.bilan_assignations;
create policy ba_select on public.bilan_assignations
  for select to authenticated
  using (client_id = auth.uid() or public.est_referent(client_id) or public.is_gerant());

drop policy if exists ba_insert on public.bilan_assignations;
create policy ba_insert on public.bilan_assignations
  for insert to authenticated
  with check (public.est_referent(client_id) and coach_id = auth.uid());

drop policy if exists ba_update on public.bilan_assignations;
create policy ba_update on public.bilan_assignations
  for update to authenticated
  using (public.est_referent(client_id))
  with check (public.est_referent(client_id) and coach_id = auth.uid());

drop policy if exists ba_delete on public.bilan_assignations;
create policy ba_delete on public.bilan_assignations
  for delete to authenticated
  using (public.est_referent(client_id));

-- ── Notes coach de la semaine : référent L + É, gérants L ───────────────────
drop policy if exists "Coach can manage own notes" on public.coach_notes;
drop policy if exists coach_notes_referent         on public.coach_notes;
drop policy if exists coach_notes_gerant_read      on public.coach_notes;
create policy coach_notes_referent on public.coach_notes
  for all to authenticated
  using (public.est_referent(client_id))
  with check (public.est_referent(client_id) and coach_id = auth.uid());
create policy coach_notes_gerant_read on public.coach_notes
  for select to authenticated
  using (public.is_gerant());

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- 1. Règles « coach » des tables ci-dessus (les règles client sont inchangées).
-- 2. Règles du stockage des photos (lot suivant : à aligner sur la matrice).
select 'base' as zone, tablename::text as objet, policyname::text as regle,
       cmd::text as action, qual as condition
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'activites_sportives', 'plans_nutritionnels',
                    'plan_repas', 'habitudes_config', 'habitudes_journal',
                    'journal_entries', 'mesures', 'poids_journal', 'bilans_hebdo',
                    'bilan_instances', 'bilan_assignations', 'coach_notes')
union all
select 'stockage', tablename::text, policyname::text, cmd::text, qual
from pg_policies
where schemaname = 'storage'
order by 1, 2, 3;
