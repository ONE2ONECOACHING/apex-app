-- ============================================================================
-- APEX APP — Suppression automatique des questionnaires d'audit (25 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Comme annoncé dans la politique de confidentialité : les réponses au
-- questionnaire (données de santé) d'un prospect qui n'est pas devenu client
-- sont supprimées 1 an après le questionnaire (ou après la création du lien
-- s'il n'a jamais été rempli). Les audits des leads devenus clients
-- (leads.client_id rempli) sont gardés.
--
-- Une tâche planifiée (pg_cron) fait le ménage chaque nuit à 3 h 15 (heure
-- de Paris en hiver ; pg_cron compte en heure UTC). Le lead lui-même reste
-- dans le CRM : seul son questionnaire et son audit sont effacés.
--
-- Transaction, relançable sans risque (la tâche est remplacée, pas doublée).
-- ============================================================================

begin;

create or replace function public.supprimer_audits_anciens()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.audits a
  using public.leads l
  where l.id = a.lead_id
    and l.client_id is null
    and coalesce(a.rempli_le, a.cree_le) < now() - interval '1 year';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Réservée à la tâche planifiée (aucun utilisateur de l'app)
revoke all on function public.supprimer_audits_anciens() from public, anon, authenticated;

-- Tâche de nuit (remplacée si elle existe déjà)
select cron.unschedule(jobid) from cron.job where jobname = 'supprimer-audits-anciens';
select cron.schedule('supprimer-audits-anciens', '15 2 * * *', 'select public.supprimer_audits_anciens()');

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : une ligne « supprimer-audits-anciens | 15 2 * * * | true », et
-- 0 audit à supprimer aujourd'hui (le plus ancien date du 24 novembre 2026).
select jobname, schedule, active from cron.job where jobname = 'supprimer-audits-anciens'
union all
select 'audits à supprimer aujourd''hui', count(*)::text, null
from public.audits a join public.leads l on l.id = a.lead_id
where l.client_id is null and coalesce(a.rempli_le, a.cree_le) < now() - interval '1 year';
