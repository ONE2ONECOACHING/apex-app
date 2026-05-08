-- ============================================================
-- FIX : RLS activites_sportives
-- Erreur "new row violates row-level security policy"
-- à exécuter dans Supabase > SQL Editor
-- ============================================================

-- S'assurer que RLS est activé
alter table activites_sportives enable row level security;

-- Supprimer les anciennes policies si elles existent (idempotent)
drop policy if exists "activites_sportives_select" on activites_sportives;
drop policy if exists "activites_sportives_insert" on activites_sportives;
drop policy if exists "activites_sportives_delete" on activites_sportives;
drop policy if exists "activites_sportives_update" on activites_sportives;

-- SELECT : un client peut lire ses propres activités
create policy "activites_sportives_select"
  on activites_sportives for select
  using (auth.uid() = profile_id);

-- INSERT : un client peut insérer ses propres activités
create policy "activites_sportives_insert"
  on activites_sportives for insert
  with check (auth.uid() = profile_id);

-- DELETE : un client peut supprimer ses propres activités
create policy "activites_sportives_delete"
  on activites_sportives for delete
  using (auth.uid() = profile_id);

-- UPDATE : un client peut modifier ses propres activités
create policy "activites_sportives_update"
  on activites_sportives for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
