-- ============================================================================
-- APEX APP — Notes de passation entre coachs (2 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Petites notes datées et signées sur un client, pour le prochain coach qui
-- le coache (ex. « vient de se blesser au genou, y aller doucement »).
-- Affichées au-dessus de la grille du studio et signalées par 📌 dans
-- « Mes coachings du jour » et l'agenda. Une note « plus d'actualité » est
-- masquée (archivée), jamais effacée sauf par son auteur ou un gérant.
--
-- Droits : tous les coachs lisent, ajoutent et archivent ; seul l'auteur
-- corrige son texte ; suppression par l'auteur ou un gérant. Le client n'y a
-- jamais accès. L'auteur et les dates sont posés par le serveur.
--
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

create table if not exists public.notes_passation (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.profiles(id) on delete cascade,
  coach_id      uuid references public.profiles(id) on delete set null default auth.uid(),
  texte         text not null check (length(trim(texte)) > 0),
  created_at    timestamptz not null default now(),
  archivee      boolean not null default false,
  archivee_par  uuid references public.profiles(id) on delete set null,
  archivee_le   timestamptz
);

create index if not exists notes_passation_client_idx
  on public.notes_passation (client_id, created_at desc);

-- Auteur, dates et archivage posés par le serveur
create or replace function public.notes_passation_proteger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.coach_id   := coalesce(auth.uid(), new.coach_id);
    new.created_at := now();
    new.archivee   := false;
    new.archivee_par := null;
    new.archivee_le  := null;
  else
    new.client_id  := old.client_id;
    new.coach_id   := old.coach_id;
    new.created_at := old.created_at;
    if auth.uid() is distinct from old.coach_id then
      new.texte := old.texte;
    end if;
    if new.archivee is distinct from old.archivee then
      new.archivee_par := case when new.archivee then auth.uid() end;
      new.archivee_le  := case when new.archivee then now() end;
    else
      new.archivee_par := old.archivee_par;
      new.archivee_le  := old.archivee_le;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists notes_passation_proteger on public.notes_passation;
create trigger notes_passation_proteger before insert or update on public.notes_passation
  for each row execute function public.notes_passation_proteger();

alter table public.notes_passation enable row level security;

drop policy if exists notes_passation_lire      on public.notes_passation;
drop policy if exists notes_passation_creer     on public.notes_passation;
drop policy if exists notes_passation_modifier  on public.notes_passation;
drop policy if exists notes_passation_supprimer on public.notes_passation;
create policy notes_passation_lire on public.notes_passation
  for select to authenticated
  using (public.is_coach());
create policy notes_passation_creer on public.notes_passation
  for insert to authenticated
  with check (public.is_coach());
create policy notes_passation_modifier on public.notes_passation
  for update to authenticated
  using (public.is_coach())
  with check (public.is_coach());
create policy notes_passation_supprimer on public.notes_passation
  for delete to authenticated
  using (public.is_coach() and (coach_id = auth.uid() or public.is_gerant()));

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : la table « RLS active », ses quatre règles et le trigger.
select 'table' as quoi,
       c.relname::text || case when c.relrowsecurity then ' : RLS active' else ' : RLS DESACTIVEE' end as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'notes_passation'
union all
select 'regle', policyname || ' | ' || cmd
from pg_policies where schemaname = 'public' and tablename = 'notes_passation'
union all
select 'trigger', tgname::text
from pg_trigger where tgrelid = 'public.notes_passation'::regclass and not tgisinternal
order by 1, 2;
