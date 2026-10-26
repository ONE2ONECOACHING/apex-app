-- ============================================================================
-- APEX APP — Plans cardio au studio ou à distance (26 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run, APRÈS 2026-10-26_plans_cardio.sql.
--
-- Choix de Benjamin : un plan cardio est « studio » (coachs seulement, comme
-- avant) ou « distance » (le client le voit dans son app et coche lui-même ses
-- séances faites). Le choix vaut pour tout le plan.
--   - cardio_plans.lieu : 'studio' (par défaut, plans existants) ou 'distance'.
--   - Le client n'a AUCUN accès direct aux tables cardio : il passe par deux
--     fonctions qui ne renvoient que ses plans « distance » en cours, sans la
--     note ni le repère « à modifier » (internes à l'équipe) :
--       plans_cardio_client()                 → lecture
--       cocher_seance_cardio(séance, faite)   → cocher / décocher
--   - attribuer_plan_cardio reçoit le lieu (studio par défaut).
-- Transaction, relançable sans risque.
-- ============================================================================

begin;

alter table public.cardio_plans add column if not exists lieu text not null default 'studio';
alter table public.cardio_plans drop constraint if exists cardio_plans_lieu_check;
alter table public.cardio_plans add constraint cardio_plans_lieu_check check (lieu in ('studio', 'distance'));

-- ── Attribuer un modèle : avec le lieu ──────────────────────────────────────
drop function if exists public.attribuer_plan_cardio(uuid, uuid);
create or replace function public.attribuer_plan_cardio(p_modele uuid, p_client uuid, p_lieu text default 'studio')
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
  insert into public.cardio_plans (client_id, modele_id, nom, lieu)
  select p_client, m.id, m.nom, coalesce(p_lieu, 'studio') from public.cardio_modeles m where m.id = p_modele
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

revoke all on function public.attribuer_plan_cardio(uuid, uuid, text) from public, anon;
grant execute on function public.attribuer_plan_cardio(uuid, uuid, text) to authenticated;

-- ── Client : ses plans « distance » en cours (sans note ni « à modifier ») ──
create or replace function public.plans_cardio_client()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'nom', p.nom,
           'phases', (
             select coalesce(jsonb_agg(jsonb_build_object(
                      'id', ph.id, 'nom', ph.nom, 'ordre', ph.ordre,
                      'seances', (
                        select coalesce(jsonb_agg(jsonb_build_object(
                                 'id', s.id, 'ordre', s.ordre, 'titre', s.titre, 'contenu', s.contenu,
                                 'faite', s.faite, 'faite_le', s.faite_le) order by s.ordre), '[]'::jsonb)
                        from public.cardio_seances s where s.phase_id = ph.id)
                    ) order by ph.ordre), '[]'::jsonb)
             from public.cardio_phases ph where ph.plan_id = p.id)
         ) order by p.cree_le desc), '[]'::jsonb)
  from public.cardio_plans p
  where p.client_id = auth.uid() and p.lieu = 'distance' and p.actif;
$$;

-- ── Client : cocher / décocher une séance de son plan « distance » en cours ─
create or replace function public.cocher_seance_cardio(p_seance uuid, p_faite boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.cardio_seances s
     set faite = p_faite,
         faite_le = case when p_faite then (now() at time zone 'Europe/Paris')::date end,
         faite_par = case when p_faite then auth.uid() end,
         maj_le = now()
   where s.id = p_seance
     and exists (select 1 from public.cardio_phases ph join public.cardio_plans p on p.id = ph.plan_id
                 where ph.id = s.phase_id and p.client_id = auth.uid() and p.lieu = 'distance' and p.actif);
  if not found then raise exception 'Séance introuvable'; end if;
end;
$$;

revoke all on function public.plans_cardio_client() from public, anon;
grant execute on function public.plans_cardio_client() to authenticated;
revoke all on function public.cocher_seance_cardio(uuid, boolean) from public, anon;
grant execute on function public.cocher_seance_cardio(uuid, boolean) to authenticated;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : la colonne lieu, 3 fonctions exécutables par authenticated, et
-- toujours une seule règle (« _coachs ») sur chacune des 3 tables cardio des clients.
select 'colonne' as quoi, column_name || ' (défaut ' || column_default || ')' as detail
from information_schema.columns where table_schema = 'public' and table_name = 'cardio_plans' and column_name = 'lieu'
union all
select 'fonction', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
       || case when has_function_privilege('authenticated', p.oid, 'execute') then ' : authenticated OK' else ' : NON exécutable' end
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('attribuer_plan_cardio', 'plans_cardio_client', 'cocher_seance_cardio')
union all
select 'regle', tablename || ' | ' || policyname from pg_policies
where schemaname = 'public' and tablename in ('cardio_plans', 'cardio_phases', 'cardio_seances')
order by 1, 2;
