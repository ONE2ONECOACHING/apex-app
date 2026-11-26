-- ============================================================================
-- APEX APP — Audits du bilan (24 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Le prospect remplit le questionnaire d'audit (page audit.html, lien
-- personnel ?j=<jeton>) : après sa réservation en ligne, ou envoyé à la main
-- depuis le CRM (« 📋 Envoyer le questionnaire »). Ses réponses partent à
-- l'Edge Function audit-bilan, qui fait rédiger l'audit par Claude et le
-- range ici (contenu structuré, mis en page par l'app aux couleurs du studio).
--
-- Statuts : attente (lien créé, pas encore rempli) → en_cours (rédaction) →
-- pret, ou erreur (relançable depuis le CRM).
--
-- Droits (données de santé) : gérants (lecture, création du lien) ; le coach
-- référent du client une fois le lead devenu client (lecture). Ni le prospect,
-- ni les autres coachs. Les réponses et l'audit ne sont écrits que par les
-- Edge Functions (clé de service).
--
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

create table if not exists public.audits (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  jeton       text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  statut      text not null default 'attente'
              check (statut in ('attente', 'en_cours', 'pret', 'erreur')),
  reponses    jsonb,                 -- [{section, question, reponse}]
  consentement_le timestamptz,       -- case « j'accepte que mes réponses soient analysées »
  rempli_le   timestamptz,
  contenu     jsonb,                 -- audit rédigé (structure fixe, voir audit-bilan)
  erreur      text,
  modele      text,
  usage       jsonb,                 -- jetons consommés (coût)
  cree_le     timestamptz not null default now(),
  cree_par    uuid references public.profiles(id) on delete set null default auth.uid(),
  genere_le   timestamptz
);

create index if not exists audits_lead_idx on public.audits (lead_id, cree_le desc);

alter table public.audits enable row level security;

drop policy if exists audits_lecture on public.audits;
create policy audits_lecture on public.audits
  for select to authenticated
  using (
    public.is_gerant()
    or exists (select 1 from public.leads l
               where l.id = audits.lead_id and l.client_id is not null
                 and public.est_referent(l.client_id))
  );

-- Les gérants créent le lien du questionnaire (rien d'autre : statut
-- « attente », sans réponses ni contenu)
drop policy if exists audits_creation on public.audits;
create policy audits_creation on public.audits
  for insert to authenticated
  with check (public.is_gerant() and statut = 'attente' and reponses is null and contenu is null);

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : « audits : RLS active » et les règles audits_creation, audits_lecture.
select 'table' as quoi,
       c.relname::text || case when c.relrowsecurity then ' : RLS active' else ' : RLS DESACTIVEE' end as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'audits'
union all
select 'regle', policyname || ' | ' || cmd
from pg_policies where schemaname = 'public' and tablename = 'audits'
order by 1, 2;
