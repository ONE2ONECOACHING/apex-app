-- ============================================================================
-- APEX APP — Correctifs de sécurité urgents (6 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Ne modifie AUCUNE donnée : uniquement des règles d'accès et deux fonctions.
-- Tout est dans une transaction : si une ligne échoue, rien n'est appliqué.
-- Relançable sans risque (idempotent).
--
-- Ce que ça corrige :
--   1. Un client pouvait se donner le rôle « coach » en modifiant son profil.
--   2. Un compte créé avec role=coach dans ses métadonnées devenait coach.
--   3. poids_journal, habitudes_config et habitudes_journal étaient lisibles
--      et modifiables par n'importe qui, même sans être connecté.
--   4. Le contenu des formations était lisible sans être connecté.
--
-- Ce que ça ne change pas : les coachs voient toujours tous les clients
-- (le cloisonnement par coach fera l'objet d'un script séparé).
-- ============================================================================

begin;

-- ── 1. Le rôle d'un profil ne peut être changé que par un coach ─────────────
-- Les appels sans utilisateur (SQL Editor, Edge Functions en service_role)
-- ont auth.uid() = null et ne sont pas bloqués.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_coach() then
    raise exception 'Modification du rôle non autorisée';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ── 2. Tout nouveau compte est créé « client » ──────────────────────────────
-- Avant : le rôle était lu dans les métadonnées fournies à l'inscription.
-- Pour créer un coach : créer le compte, puis
--   update public.profiles set role = 'coach' where email = '...';
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, prenom, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'prenom', 'Client'),
    'client'
  );
  return new;
end;
$$;

-- Insertion directe d'un profil : uniquement le sien, uniquement en « client ».
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'client');

-- ── 3. Tables ouvertes à tous → le client voit les siennes, le coach lit ────

-- poids_journal
drop policy if exists all_poids   on public.poids_journal;
drop policy if exists poids_own   on public.poids_journal;
drop policy if exists poids_coach on public.poids_journal;
create policy poids_own on public.poids_journal
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
create policy poids_coach on public.poids_journal
  for select to authenticated
  using (public.is_coach());

-- habitudes_config (le coach les crée, le client les lit)
drop policy if exists all_habitudes_config   on public.habitudes_config;
drop policy if exists habitudes_config_own   on public.habitudes_config;
drop policy if exists habitudes_config_coach on public.habitudes_config;
create policy habitudes_config_own on public.habitudes_config
  for select to authenticated
  using (profile_id = auth.uid());
create policy habitudes_config_coach on public.habitudes_config
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());

-- habitudes_journal (le client coche, le coach lit)
drop policy if exists all_habitudes_journal   on public.habitudes_journal;
drop policy if exists habitudes_journal_own   on public.habitudes_journal;
drop policy if exists habitudes_journal_coach on public.habitudes_journal;
create policy habitudes_journal_own on public.habitudes_journal
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
create policy habitudes_journal_coach on public.habitudes_journal
  for select to authenticated
  using (public.is_coach());

-- ── 4. Formations : lecture réservée aux utilisateurs connectés ─────────────
alter policy "Client voir formations"       on public.formations        to authenticated;
alter policy "Client voir modules"          on public.formation_modules to authenticated;
alter policy "Client voir leçons assignées" on public.formation_lecons  to authenticated;

commit;

-- ── Vérification (lecture seule) : doit lister les nouvelles règles ─────────
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'poids_journal', 'habitudes_config',
                    'habitudes_journal', 'formations', 'formation_modules',
                    'formation_lecons')
order by tablename, policyname;
