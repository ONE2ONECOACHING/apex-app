-- ============================================================================
-- APEX APP — Suppression du lead de test « Lalou Cara »
-- (26 novembre 2026). À coller dans Supabase → SQL Editor → Run.
--
-- Efface le lead « Lalou Cara » créé en testant
-- la page bilan.html (seulement des leads qui ne sont pas devenus clients),
-- avec :
--   - leur RDV prospect dans l'agenda ;
--   - la trace de ce RDV dans les créneaux supprimés (sinon elle sortirait
--     dans la facturation du mois) ;
--   - leur questionnaire et leur audit (effacés en cascade avec le lead).
-- Ne touche à aucun autre lead ni à aucun compte. Relançable sans risque.
--
-- AVANT, tu peux voir ce qui sera effacé en sélectionnant seulement cette
-- requête puis Run :
--
--   select prenom, nom, telephone, etape, cree_le from public.leads
--   where client_id is null
--     and lower(trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')))
--         in ('lalou cara');
-- ============================================================================

begin;

-- 1. Leurs RDV prospect dans l'agenda
delete from public.agenda_creneaux
where type = 'prospect'
  and id in (select rdv_creneau_id from public.leads
             where client_id is null and rdv_creneau_id is not null
               and lower(trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')))
                   in ('lalou cara'));

-- 2. La trace de ces RDV dans les créneaux supprimés
delete from public.agenda_suppressions
where type = 'prospect'
  and lower(trim(coalesce(client_nom, ''))) in ('lalou cara');

-- 3. Les leads (questionnaires et audits partent avec)
delete from public.leads
where client_id is null
  and lower(trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')))
      in ('lalou cara');

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : 0 partout.
select 'lead de test restant' as quoi, count(*)::text as detail
from public.leads
where client_id is null
  and lower(trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')))
      in ('lalou cara')
union all
select 'RDV prospect de test restants', count(*)::text
from public.agenda_creneaux
where type = 'prospect'
  and lower(trim(coalesce(prospect_nom, ''))) in ('lalou cara')
union all
select 'audits sans lead', count(*)::text
from public.audits a
where not exists (select 1 from public.leads l where l.id = a.lead_id);
