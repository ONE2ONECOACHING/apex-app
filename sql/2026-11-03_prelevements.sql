-- ============================================================================
-- APEX APP — Étape 6b-2 : prélèvement des séances à la consommation (3 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Choix de Benjamin (3 novembre 2026) :
--   - on prélève un mois terminé seulement (début novembre → séances d'octobre) ;
--   - montant proposé = séances « facturées » × prix par séance, modifiable ;
--   - carte refusée : lien de paiement Stripe à copier et envoyer au client ;
--   - reçu Stripe envoyé au client quand le paiement passe.
--
-- Table prelevements : une ligne par tentative (qui, quand, combien, résultat).
-- Écrite uniquement par l'Edge Function stripe-gerant (clé de service) : les
-- gérants la lisent, personne ne l'écrit depuis l'app. Un client ne peut avoir
-- qu'un seul prélèvement réussi ou en cours par mois (pas de double débit) ;
-- après un refus, on peut réessayer.
--
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

create table if not exists public.prelevements (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid references public.profiles(id) on delete set null,
  client_nom             text,
  mois                   date not null check (extract(day from mois) = 1),
  montant                numeric(10,2) not null check (montant > 0),
  description            text,
  statut                 text not null default 'en_cours'
                         check (statut in ('en_cours', 'reussi', 'refuse')),
  erreur                 text,
  stripe_customer_id     text,
  stripe_payment_intent  text,
  lien_session           text,      -- session de paiement Stripe (lien envoyé après un refus)
  lien_url               text,
  lien_expire            timestamptz,
  cree_par               uuid references public.profiles(id) on delete set null,
  cree_le                timestamptz not null default now(),
  maj_le                 timestamptz not null default now()
);

create index if not exists prelevements_mois_idx on public.prelevements (mois);

-- Pas deux prélèvements réussis ou en cours pour le même client et le même mois
create unique index if not exists prelevements_un_par_mois
  on public.prelevements (client_id, mois)
  where statut in ('en_cours', 'reussi');

alter table public.prelevements enable row level security;

drop policy if exists prelevements_gerants_lire on public.prelevements;
create policy prelevements_gerants_lire on public.prelevements
  for select to authenticated
  using (public.is_gerant());
-- Aucune règle d'écriture : seule l'Edge Function (clé de service) écrit.

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : la table « RLS active », une seule règle (select) et les 2 index.
select 'table' as quoi,
       c.relname::text || case when c.relrowsecurity then ' : RLS active' else ' : RLS DESACTIVEE' end as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'prelevements'
union all
select 'regle', policyname || ' | ' || cmd
from pg_policies where schemaname = 'public' and tablename = 'prelevements'
union all
select 'index', indexname::text
from pg_indexes where schemaname = 'public' and tablename = 'prelevements' and indexname like 'prelevements\_%'
order by 1, 2;
