-- ============================================================================
-- APEX APP — CRM : vente « Autre » (formule ou tarif personnalisé) (23 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- À la vente d'un lead, en plus des formules du catalogue, choix « Autre » :
-- un nom libre (ex. « Coaching duo »), un montant et « par mois » ou
-- « par séance ». Repris dans la facturation du client à sa création
-- (abonnement mensuel ou prix de la séance).
--
-- Droits inchangés (table leads : gérants seulement).
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

alter table public.leads add column if not exists vente_libelle text;
alter table public.leads add column if not exists vente_montant numeric(10,2) check (vente_montant is null or vente_montant >= 0);
alter table public.leads add column if not exists vente_unite   text check (vente_unite is null or vente_unite in ('mois', 'seance'));

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : trois lignes, vente_libelle, vente_montant et vente_unite.
select column_name::text || ' : ' || data_type as colonne
from information_schema.columns
where table_schema = 'public' and table_name = 'leads' and column_name like 'vente_%' and column_name <> 'vente_le'
order by 1;
