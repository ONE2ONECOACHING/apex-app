-- ============================================================================
-- APEX APP — Étape 6b-1 : relier les clients à leur fiche Stripe (2 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Ajoute à facturation_clients l'identifiant du client dans Stripe
-- (« cus_… »). L'app s'en sert pour afficher, en lecture seule, la carte
-- enregistrée, l'abonnement Stripe et les derniers paiements. Rien n'est
-- envoyé à Stripe : la lecture passe par l'Edge Function stripe-gerant,
-- réservée aux gérants.
--
-- Droits inchangés : facturation_clients reste réservée aux gérants.
-- Un même client Stripe ne peut être relié qu'à un seul client de l'app.
--
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

alter table public.facturation_clients
  add column if not exists stripe_customer_id text
  check (stripe_customer_id is null or stripe_customer_id ~ '^cus_[A-Za-z0-9]+$');

create unique index if not exists facturation_clients_stripe_unique
  on public.facturation_clients (stripe_customer_id)
  where stripe_customer_id is not null;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : la colonne stripe_customer_id (text) et l'index unique.
select 'colonne' as quoi, column_name::text || ' : ' || data_type as detail
from information_schema.columns
where table_schema = 'public' and table_name = 'facturation_clients' and column_name = 'stripe_customer_id'
union all
select 'index', indexname::text
from pg_indexes
where schemaname = 'public' and tablename = 'facturation_clients' and indexname = 'facturation_clients_stripe_unique';
