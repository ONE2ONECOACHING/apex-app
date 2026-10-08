-- ============================================================================
-- APEX APP — Étape 1, lot 3 : bibliothèque commune (8 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Ce que ça fait : tous les comptes coach (gérants compris) peuvent lire,
-- créer, modifier et supprimer :
--   - les modèles de programmes (séances et exercices des modèles),
--   - les modèles de bilans,
--   - les formations (modules et leçons),
--   - les attributions de formations aux clients, et lire la progression.
-- Avant, seul le compte coach qui avait créé un modèle pouvait le modifier
-- (et, pour les formations, le voir dans l'espace coach).
--
-- Ce que ça ne change pas :
--   - les clients : leurs règles de lecture ne sont pas touchées ;
--   - le compte coach partagé : il est l'auteur de tout, il garde tout ;
--   - les programmes déjà attribués aux clients (règles inchangées) ;
--   - bilans des clients, notes coach, journal, mesures : traités au lot 5.
--
-- Tout est dans une transaction : si une ligne échoue, rien n'est appliqué.
-- Relançable sans risque.
-- ============================================================================

begin;

-- ── Modèles de programmes ───────────────────────────────────────────────────
-- prog_templates est déjà ouvert à tous les coachs (prog_tpl_all) : inchangé.
-- Séances et exercices des modèles : seulement ceux du coach auteur → tous.

drop policy if exists tpl_seances_all on public.prog_template_seances;
create policy tpl_seances_all on public.prog_template_seances
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());

drop policy if exists tpl_exos_all on public.prog_template_exercices;
create policy tpl_exos_all on public.prog_template_exercices
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());

-- ── Modèles de bilans ───────────────────────────────────────────────────────
-- Lecture (bt_select) : inchangée.
-- Création : le coach reste noté comme auteur.

drop policy if exists bt_insert on public.bilan_templates;
create policy bt_insert on public.bilan_templates
  for insert to authenticated
  with check (public.is_coach() and coach_id = auth.uid());

drop policy if exists bt_update on public.bilan_templates;
create policy bt_update on public.bilan_templates
  for update to authenticated
  using (public.is_coach())
  with check (public.is_coach());

drop policy if exists bt_delete on public.bilan_templates;
create policy bt_delete on public.bilan_templates
  for delete to authenticated
  using (public.is_coach());

-- ── Formations ──────────────────────────────────────────────────────────────
-- Les règles de lecture des clients (« Client voir … ») ne sont pas touchées.

drop policy if exists "Coach gère ses formations" on public.formations;
create policy "Coach gère ses formations" on public.formations
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());

drop policy if exists "Coach gère ses modules" on public.formation_modules;
create policy "Coach gère ses modules" on public.formation_modules
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());

drop policy if exists "Coach gère ses leçons" on public.formation_lecons;
create policy "Coach gère ses leçons" on public.formation_lecons
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());

drop policy if exists "Coach gère ses assignations" on public.formation_assignations;
create policy "Coach gère ses assignations" on public.formation_assignations
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());

drop policy if exists "Coach voit progression clients" on public.formation_progression;
create policy "Coach voit progression clients" on public.formation_progression
  for select to authenticated
  using (public.is_coach());

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : les règles « coach » ci-dessus affichent is_coach() et le rôle
-- authenticated ; les règles « client » sont inchangées.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('prog_templates', 'prog_template_seances',
                    'prog_template_exercices', 'bilan_templates',
                    'formations', 'formation_modules', 'formation_lecons',
                    'formation_assignations', 'formation_progression')
order by tablename, policyname;
