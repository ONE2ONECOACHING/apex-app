-- ============================================================================
-- APEX APP — Plans cardio : mouvements de la phase (12 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Comme les cases de couleur des Google Sheets : chaque phase a sa liste de
-- mouvements (nom libre + couleur), placés dans le texte des séances. Changer
-- un mouvement dans la liste le change dans toutes les séances de la phase.
--   mouvements = [{ "id": "k3f9", "nom": "KB Swing", "couleur": "#F4C7C3" }, …]
--   dans le texte d'une séance, un mouvement est noté {{m:k3f9}}.
--
-- Ce que fait le script :
--   1. Colonne mouvements sur les phases des modèles et des plans des clients.
--   2. attribuer_plan_cardio et dupliquer_modele_cardio copient aussi les
--      mouvements (même nom de fonction, mêmes paramètres).
--   3. plans_cardio_client renvoie aussi les mouvements de chaque phase, pour
--      afficher les vrais noms au client (toujours sans note ni « à modifier »).
-- Droits inchangés.
--
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

-- ── 1. Mouvements de la phase ───────────────────────────────────────────────
alter table public.cardio_modele_phases add column if not exists mouvements jsonb not null default '[]'::jsonb;
alter table public.cardio_phases        add column if not exists mouvements jsonb not null default '[]'::jsonb;

-- ── 2. Copies : avec les mouvements ─────────────────────────────────────────
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
    insert into public.cardio_phases (plan_id, nom, ordre, mouvements) values (v_plan, ph.nom, ph.ordre, ph.mouvements)
    returning id into v_phase;
    insert into public.cardio_seances (phase_id, ordre, titre, contenu)
    select v_phase, s.ordre, s.titre, s.contenu
    from public.cardio_modele_seances s where s.phase_id = ph.id;
  end loop;
  return v_plan;
end;
$$;

create or replace function public.dupliquer_modele_cardio(p_modele uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_modele uuid;
  ph record;
  v_phase uuid;
begin
  if not public.is_coach() then raise exception 'Réservé aux coachs'; end if;
  insert into public.cardio_modeles (nom, description)
  select m.nom || ' (copie)', m.description from public.cardio_modeles m where m.id = p_modele
  returning id into v_modele;
  if v_modele is null then raise exception 'Modèle introuvable'; end if;
  for ph in select * from public.cardio_modele_phases where modele_id = p_modele order by ordre loop
    insert into public.cardio_modele_phases (modele_id, nom, ordre, mouvements) values (v_modele, ph.nom, ph.ordre, ph.mouvements)
    returning id into v_phase;
    insert into public.cardio_modele_seances (phase_id, ordre, titre, contenu)
    select v_phase, s.ordre, s.titre, s.contenu
    from public.cardio_modele_seances s where s.phase_id = ph.id;
  end loop;
  return v_modele;
end;
$$;

-- ── 3. Client : ses plans « distance » en cours, avec les mouvements ────────
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
                      'id', ph.id, 'nom', ph.nom, 'ordre', ph.ordre, 'mouvements', ph.mouvements,
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

revoke all on function public.attribuer_plan_cardio(uuid, uuid, text) from public, anon;
grant execute on function public.attribuer_plan_cardio(uuid, uuid, text) to authenticated;
revoke all on function public.dupliquer_modele_cardio(uuid) from public, anon;
grant execute on function public.dupliquer_modele_cardio(uuid) to authenticated;
revoke all on function public.plans_cardio_client() from public, anon;
grant execute on function public.plans_cardio_client() to authenticated;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : 2 colonnes « mouvements » et 3 fonctions qui parlent de mouvements (oui).
select 'colonne' as quoi, table_name || '.' || column_name as detail
from information_schema.columns
where table_schema = 'public' and column_name = 'mouvements' and table_name in ('cardio_modele_phases', 'cardio_phases')
union all
select 'fonction', p.proname || ' : ' || case when pg_get_functiondef(p.oid) like '%mouvements%' then 'oui' else 'NON' end
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('attribuer_plan_cardio', 'dupliquer_modele_cardio', 'plans_cardio_client')
order by 1, 2;
