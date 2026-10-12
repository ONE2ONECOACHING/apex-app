-- ============================================================================
-- APEX APP — Phases terminées « vues » (12 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Ajoute client_programmes.fin_vue : quand un coach clique « ✓ Vu » sur une
-- phase terminée du tableau de bord, elle n'y apparaît plus. Le programme
-- n'est ni effacé ni retiré au client.
--
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

alter table public.client_programmes
  add column if not exists fin_vue boolean not null default false;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : une ligne fin_vue | boolean | false.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'client_programmes' and column_name = 'fin_vue';
