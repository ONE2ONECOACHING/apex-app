-- ============================================================================
-- APEX APP — Séances commencées gardées dans la base (29 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Nouvel écran de séance côté client : la séance commencée (séries cochées,
-- charges, notes) est enregistrée au fur et à mesure. Le client la reprend
-- même s'il ferme l'app, change de téléphone ou vide son navigateur.
-- Une ligne par client et par séance, effacée quand la séance est enregistrée.
--
-- Droits : uniquement le client lui-même (lecture et écriture). Les coachs
-- voient la séance quand elle est enregistrée, comme avant.
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

create table if not exists public.seances_en_cours (
  client_id  uuid not null references public.profiles(id) on delete cascade,
  seance_id  uuid not null references public.client_prog_seances(id) on delete cascade,
  etat       jsonb not null,
  maj_le     timestamptz not null default now(),
  primary key (client_id, seance_id)
);

alter table public.seances_en_cours enable row level security;

drop policy if exists seances_en_cours_client on public.seances_en_cours;
create policy seances_en_cours_client on public.seances_en_cours
  for all to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : « RLS oui » et une seule règle, réservée au client (auth.uid()).
select c.relname::text as table_, case when c.relrowsecurity then 'RLS oui' else 'RLS NON' end as securite,
       (select string_agg(policyname || ' | ' || cmd || ' | ' || coalesce(qual, '-'), ' ; ')
          from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as regles
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'seances_en_cours';
