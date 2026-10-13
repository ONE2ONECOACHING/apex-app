-- ============================================================================
-- APEX APP — Messagerie : « Vu » fiable et en direct (13 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- 1. Fonction marquer_conversation_lue(client, canal) : l'heure de lecture
--    est celle du serveur (et non plus celle du téléphone, qui peut avoir
--    quelques secondes de retard et empêcher le « Vu »).
-- 2. La table messages_lectures passe en direct : le « Vu » s'affiche dès
--    que l'autre ouvre la conversation.
--
-- Les droits ne changent pas (la fonction applique les règles existantes).
-- Ne modifie aucune donnée. Transaction, relançable sans risque.
-- ============================================================================

begin;

create or replace function public.marquer_conversation_lue(p_client uuid, p_canal text)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.messages_lectures (client_id, canal, lecteur_id, lu_jusqu_a)
  values (p_client, p_canal, auth.uid(), now())
  on conflict (client_id, canal, lecteur_id) do update set lu_jusqu_a = now();
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages_lectures') then
    alter publication supabase_realtime add table public.messages_lectures;
  end if;
end;
$$;

commit;

-- Vérification (lecture seule) : attendu « messages » et « messages_lectures »
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and tablename like 'messages%'
order by 1;
