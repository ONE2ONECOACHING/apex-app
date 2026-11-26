-- ============================================================================
-- APEX APP — CRM : les leads (23 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Un lead = une personne qui a rempli le formulaire Meta (envoyée par Make
-- à l'Edge Function lead-entrant) ou entrée à la main (Instagram, autre).
-- Parcours : à contacter (appel 1 + vocal, appel 2 + SMS, appel 3)
--   → setting (a répondu) → RDV studio → venu → vente
--   ou perdu (pas de vente) ou pas de réponse (3 appels sans réponse).
-- responsable_id vide = lead pas encore pris (« Nouveaux », visible des deux
-- gérants). rappel_le = rappel programmé (« rappelle-moi plus tard ») :
-- notification au responsable à l'heure dite (Edge Function rappel-coaching).
--
-- Droits : gérants seulement (lecture et écriture). Ni les coachs ni les
-- clients n'y ont accès. Les leads de Make sont écrits par l'Edge Function
-- avec la clé de service.
--
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  cree_le          timestamptz not null default now(),
  source           text not null default 'meta' check (source in ('meta', 'instagram', 'autre')),
  meta_lead_id     text unique,                    -- identifiant Meta : pas de doublon si Make renvoie
  prenom           text,
  nom              text,
  email            text,
  telephone        text,
  campagne         text,
  ensemble_pub     text,
  publicite        text,
  formulaire       jsonb not null default '{}'::jsonb,   -- autres réponses du formulaire (plus tard)
  responsable_id   uuid references public.profiles(id) on delete set null,
  etape            text not null default 'a_contacter'
                   check (etape in ('a_contacter', 'setting', 'rdv', 'venu', 'vente', 'perdu', 'sans_reponse')),
  relances         smallint not null default 0 check (relances between 0 and 3),  -- appels sans réponse
  prochaine_le     timestamptz default now(),      -- prochaine relance à faire
  rappel_le        timestamptz,                    -- rappel programmé avec le lead
  rappel_envoye_pour timestamptz,                  -- rappel déjà notifié pour cette heure
  chaleur          smallint check (chaleur between 0 and 3),
  notes            text,
  motif_perdu      text,
  rdv_creneau_id   uuid references public.agenda_creneaux(id) on delete set null,
  rdv_le           timestamptz,
  formule_id       uuid references public.formules(id) on delete set null,
  client_id        uuid references public.profiles(id) on delete set null,
  setting_le       timestamptz,                    -- dates d'étape, pour les chiffres
  venu_le          timestamptz,
  vente_le         timestamptz,
  clos_le          timestamptz,                    -- perdu ou pas de réponse
  historique       jsonb not null default '[]'::jsonb,   -- [{quand, qui, quoi}]
  maj_le           timestamptz not null default now(),
  maj_par          uuid references public.profiles(id) on delete set null
);

create index if not exists leads_cree_le_idx      on public.leads (cree_le desc);
create index if not exists leads_responsable_idx  on public.leads (responsable_id, etape);
create index if not exists leads_rappel_idx       on public.leads (rappel_le) where rappel_le is not null;

create or replace function public.leads_maj_le()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.maj_le := now();
  return new;
end;
$$;

drop trigger if exists leads_maj_le on public.leads;
create trigger leads_maj_le before update on public.leads
  for each row execute function public.leads_maj_le();

drop trigger if exists imposer_auteur on public.leads;
create trigger imposer_auteur before insert or update on public.leads
  for each row execute function public.imposer_auteur('maj_par');

alter table public.leads enable row level security;

drop policy if exists leads_gerants on public.leads;
create policy leads_gerants on public.leads
  for all to authenticated
  using (public.is_gerant())
  with check (public.is_gerant());

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : « leads : RLS active », la règle leads_gerants et deux triggers.
select 'table' as quoi,
       c.relname::text || case when c.relrowsecurity then ' : RLS active' else ' : RLS DESACTIVEE' end as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'leads'
union all
select 'regle', policyname || ' | ' || cmd
from pg_policies where schemaname = 'public' and tablename = 'leads'
union all
select 'trigger', tgname::text
from pg_trigger where tgrelid = 'public.leads'::regclass and not tgisinternal
order by 1, 2;
