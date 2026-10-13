-- ============================================================================
-- APEX APP — Étape 5 : messageries (13 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Ce que ça fait :
--   1. Table messages : une conversation par client et par canal
--        « suivi »  : client suivi ↔ son coach référent (gérants : lecture)
--        « equipe » : client studio ↔ toute l'équipe (tous les coachs)
--      Texte, photo ou vocal. L'auteur peut supprimer son message
--      (il devient « Message supprimé ») ; personne ne peut le modifier.
--   2. Table messages_lectures : jusqu'où chacun a lu (pour « Vu » et les
--      pastilles de non-lus).
--   3. Stockage privé « messages » pour les photos et les vocaux, avec les
--      mêmes droits que la conversation.
--   4. Fonction conversations_resume() : dernière activité et non-lus de
--      chaque conversation visible (pour la liste du coach et les badges).
--   5. Messages en direct (Supabase Realtime) sur la table messages.
--
-- Droits (cahier des charges) :
--   suivi  : lecture client, référent, gérants ; écriture client et référent
--   equipe : lecture et écriture client et tous les coachs (gérants compris)
--   Un client écrit dans « equipe » s'il est studio sans suivi, sinon « suivi ».
--
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

-- ── 1. Messages ─────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles(id) on delete cascade,
  canal       text not null check (canal in ('suivi', 'equipe')),
  auteur_id   uuid references public.profiles(id) on delete set null default auth.uid(),
  texte       text,
  piece_type  text check (piece_type in ('photo', 'vocal')),
  piece_path  text,
  piece_duree integer,             -- durée d'un vocal, en secondes
  supprime    boolean not null default false,
  cree_le     timestamptz not null default now(),
  constraint messages_contenu_check check (
    supprime or coalesce(trim(texte), '') <> '' or piece_path is not null
  )
);

create index if not exists messages_conversation_idx on public.messages (client_id, canal, cree_le);

-- Qui peut lire / écrire une conversation
create or replace function public.peut_lire_conversation(p_client uuid, p_canal text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = p_client
      or (p_canal = 'suivi'  and (public.est_referent(p_client) or public.is_gerant()))
      or (p_canal = 'equipe' and public.is_coach());
$$;

create or replace function public.peut_ecrire_conversation(p_client uuid, p_canal text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (auth.uid() = p_client and p_canal = (
            select case when type_client = 'studio' then 'equipe' else 'suivi' end
            from public.profiles where id = p_client))
      or (p_canal = 'suivi'  and public.est_referent(p_client))
      or (p_canal = 'equipe' and public.is_coach());
$$;

alter table public.messages enable row level security;

drop policy if exists messages_lire     on public.messages;
drop policy if exists messages_ecrire   on public.messages;
drop policy if exists messages_supprimer on public.messages;
create policy messages_lire on public.messages
  for select to authenticated
  using (public.peut_lire_conversation(client_id, canal));
create policy messages_ecrire on public.messages
  for insert to authenticated
  with check (auteur_id = auth.uid() and not supprime
              and public.peut_ecrire_conversation(client_id, canal));
create policy messages_supprimer on public.messages
  for update to authenticated
  using (auteur_id = auth.uid())
  with check (auteur_id = auth.uid());
-- Pas de règle de suppression : un message n'est jamais effacé de la base.

-- Une modification ne peut que marquer le message « supprimé » (et vider son contenu)
create or replace function public.messages_proteger()
returns trigger
language plpgsql
as $$
begin
  if new.client_id is distinct from old.client_id or new.canal is distinct from old.canal
     or new.auteur_id is distinct from old.auteur_id or new.cree_le is distinct from old.cree_le
     or not new.supprime then
    raise exception 'Un message ne peut pas être modifié, seulement supprimé';
  end if;
  new.texte := null;
  new.piece_type := null;
  new.piece_path := null;
  new.piece_duree := null;
  return new;
end;
$$;

drop trigger if exists messages_proteger on public.messages;
create trigger messages_proteger
  before update on public.messages
  for each row execute function public.messages_proteger();

-- ── 2. Lectures ─────────────────────────────────────────────────────────────
create table if not exists public.messages_lectures (
  client_id   uuid not null references public.profiles(id) on delete cascade,
  canal       text not null check (canal in ('suivi', 'equipe')),
  lecteur_id  uuid not null references public.profiles(id) on delete cascade,
  lu_jusqu_a  timestamptz not null default now(),
  primary key (client_id, canal, lecteur_id)
);

alter table public.messages_lectures enable row level security;

drop policy if exists lectures_lire   on public.messages_lectures;
drop policy if exists lectures_ecrire on public.messages_lectures;
create policy lectures_lire on public.messages_lectures
  for select to authenticated
  using (public.peut_lire_conversation(client_id, canal));
create policy lectures_ecrire on public.messages_lectures
  for all to authenticated
  using (lecteur_id = auth.uid())
  with check (lecteur_id = auth.uid() and public.peut_lire_conversation(client_id, canal));

-- ── 3. Stockage des photos et vocaux ────────────────────────────────────────
-- Chemin d'un fichier : <client_id>/<canal>/<nom>
insert into storage.buckets (id, name, public)
values ('messages', 'messages', false)
on conflict (id) do nothing;

drop policy if exists messages_fichiers_lire   on storage.objects;
drop policy if exists messages_fichiers_ecrire on storage.objects;
create policy messages_fichiers_lire on storage.objects
  for select to authenticated
  using (
    bucket_id = 'messages'
    and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    and public.peut_lire_conversation(((storage.foldername(name))[1])::uuid, (storage.foldername(name))[2])
  );
create policy messages_fichiers_ecrire on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'messages'
    and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    and public.peut_ecrire_conversation(((storage.foldername(name))[1])::uuid, (storage.foldername(name))[2])
  );

-- ── 4. Résumé des conversations visibles (les droits s'appliquent) ──────────
create or replace function public.conversations_resume()
returns table (
  client_id uuid, canal text, dernier_le timestamptz, dernier_texte text,
  dernier_type text, dernier_auteur uuid, non_lus bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select m.client_id, m.canal,
         max(m.cree_le) as dernier_le,
         (array_agg(case when m.supprime then 'Message supprimé' else m.texte end order by m.cree_le desc))[1],
         (array_agg(m.piece_type order by m.cree_le desc))[1],
         (array_agg(m.auteur_id order by m.cree_le desc))[1],
         count(*) filter (
           where m.auteur_id is distinct from auth.uid()
             and m.cree_le > coalesce(l.lu_jusqu_a, '-infinity'::timestamptz)
         )
  from public.messages m
  left join public.messages_lectures l
    on l.client_id = m.client_id and l.canal = m.canal and l.lecteur_id = auth.uid()
  group by m.client_id, m.canal, l.lu_jusqu_a;
$$;

-- ── 5. Messages en direct ───────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : 2 tables « RLS active », leurs règles, le stockage « messages »
-- (privé) et la table messages dans le direct.
select 'table' as quoi,
       c.relname::text || case when c.relrowsecurity then ' : RLS active' else ' : RLS DESACTIVEE' end as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('messages', 'messages_lectures')
union all
select 'regle', tablename || ' | ' || policyname || ' | ' || cmd
from pg_policies
where (schemaname = 'public' and tablename in ('messages', 'messages_lectures'))
   or (schemaname = 'storage' and policyname like 'messages_fichiers%')
union all
select 'stockage', id || case when public then ' : PUBLIC' else ' : privé' end
from storage.buckets where id = 'messages'
union all
select 'direct', tablename::text
from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages'
order by 1, 2;
