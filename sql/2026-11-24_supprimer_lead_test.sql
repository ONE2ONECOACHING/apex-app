-- ============================================================================
-- APEX APP — Suppression du lead de test « Test CRM » (24 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Efface le lead envoyé pour tester Make (meta_lead_id = 'test-crm-1') et le
-- RDV prospect qui lui était rattaché dans l'agenda (s'il existe encore ; la
-- suppression est copiée dans agenda_suppressions comme toute suppression).
-- Ne touche à aucun autre lead. Relançable sans risque.
-- ============================================================================

begin;

delete from public.agenda_creneaux
where id in (select rdv_creneau_id from public.leads
             where meta_lead_id = 'test-crm-1' and rdv_creneau_id is not null)
  and type = 'prospect';

delete from public.leads where meta_lead_id = 'test-crm-1';

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : « Test CRM » n'apparaît plus. Les autres leads restent listés :
-- s'il en reste un de test (ajouté à la main), dis-le à Claude.
select prenom, nom, source, etape, cree_le
from public.leads
order by cree_le desc;
