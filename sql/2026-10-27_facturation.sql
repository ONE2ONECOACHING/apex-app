-- ============================================================================
-- APEX APP — Étape 6a : formules et facturation des clients (27 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Choix de Benjamin (27 octobre 2026) :
--   - Les gérants créent eux-mêmes les formules d'abonnement (nom, prix
--     mensuel, durée d'engagement en mois, facultative) et les attribuent.
--   - Abonnement = montant fixe par mois, quel que soit le nombre de séances.
--   - Consommation = prix fixe par séance, propre à chaque client, saisi à la main.
--   - Duo sur deux comptes : un créneau par personne, chacun son prix (déjà partagé).
--
-- Ce que fait le script :
--   1. Table formules : le catalogue.
--   2. Table facturation_clients : une ligne par client (formule, montant
--      mensuel, prix par séance, date de début, fin d'engagement, note).
--      Le mode (abonnement / consommation / mixte) reste dans
--      profiles.mode_facturation (l'agenda s'en sert déjà).
--   3. Règles : les deux tables sont réservées aux gérants (lecture et
--      écriture). Ni les coachs ni les clients n'y ont accès.
--
-- Ce que ça ne change pas : aucune donnée existante.
-- Transaction, relançable sans risque.
-- ============================================================================

begin;

-- ── 1. Catalogue des formules ───────────────────────────────────────────────
create table if not exists public.formules (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null check (length(trim(nom)) > 0),
  prix_mensuel  numeric(10,2) not null check (prix_mensuel >= 0),
  duree_mois    integer check (duree_mois is null or duree_mois between 1 and 60),
  actif         boolean not null default true,   -- false = retirée du catalogue
  cree_le       timestamptz not null default now(),
  maj_le        timestamptz not null default now(),
  maj_par       uuid references public.profiles(id) on delete set null
);

alter table public.formules enable row level security;

drop policy if exists formules_gerants on public.formules;
create policy formules_gerants on public.formules
  for all to authenticated
  using (public.is_gerant())
  with check (public.is_gerant());

-- ── 2. Facturation de chaque client ─────────────────────────────────────────
create table if not exists public.facturation_clients (
  client_id           uuid primary key references public.profiles(id) on delete cascade,
  formule_id          uuid references public.formules(id) on delete set null,
  montant_abonnement  numeric(10,2) check (montant_abonnement is null or montant_abonnement >= 0),
  prix_seance         numeric(10,2) check (prix_seance is null or prix_seance >= 0),
  debut_abonnement    date,
  fin_engagement      date,
  note                text,
  maj_le              timestamptz not null default now(),
  maj_par             uuid references public.profiles(id) on delete set null
);

alter table public.facturation_clients enable row level security;

drop policy if exists facturation_clients_gerants on public.facturation_clients;
create policy facturation_clients_gerants on public.facturation_clients
  for all to authenticated
  using (public.is_gerant())
  with check (public.is_gerant());

-- ── 3. Auteur et heure de la dernière modification ──────────────────────────
create or replace function public.facturation_maj_le()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.maj_le := now();
  return new;
end;
$$;

drop trigger if exists maj_le on public.formules;
create trigger maj_le before insert or update on public.formules
  for each row execute function public.facturation_maj_le();
drop trigger if exists imposer_auteur on public.formules;
create trigger imposer_auteur before insert or update on public.formules
  for each row execute function public.imposer_auteur('maj_par');

drop trigger if exists maj_le on public.facturation_clients;
create trigger maj_le before insert or update on public.facturation_clients
  for each row execute function public.facturation_maj_le();
drop trigger if exists imposer_auteur on public.facturation_clients;
create trigger imposer_auteur before insert or update on public.facturation_clients
  for each row execute function public.imposer_auteur('maj_par');

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : les 2 tables avec la sécurité activée (RLS oui) et une seule
-- règle chacune, réservée aux gérants (is_gerant()).
select 'table' as quoi, c.relname::text as nom,
       case when c.relrowsecurity then 'RLS oui' else 'RLS NON' end as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('formules', 'facturation_clients')
union all
select 'regle', tablename::text, policyname || ' | ' || cmd || ' | ' || coalesce(qual, '-')
from pg_policies
where schemaname = 'public' and tablename in ('formules', 'facturation_clients')
order by 1, 2;
