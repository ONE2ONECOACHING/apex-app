-- ============================================================================
-- APEX APP — Messages non lus : seulement ceux des clients (17 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Avant : dans la conversation « Équipe » d'un client studio, quand un coach
-- répondait, tous les autres coachs voyaient la conversation « non lue ».
-- Maintenant (choix de Benjamin) : pour un coach, seuls les messages du client
-- comptent comme non lus. Pour le client, rien ne change (les messages des
-- coachs comptent).
--
-- Remplace seulement la fonction conversations_resume(). Ne modifie aucune
-- donnée. Transaction, relançable sans risque.
-- ============================================================================

begin;

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
             -- coach : seulement les messages du client ; client : ceux des coachs
             and (m.client_id = auth.uid() or m.auteur_id = m.client_id)
             and m.cree_le > coalesce(l.lu_jusqu_a, '-infinity'::timestamptz)
         )
  from public.messages m
  left join public.messages_lectures l
    on l.client_id = m.client_id and l.canal = m.canal and l.lecteur_id = auth.uid()
  group by m.client_id, m.canal, l.lu_jusqu_a;
$$;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : « seulement les messages du client : oui ».
select 'seulement les messages du client : ' ||
       case when position('m.auteur_id = m.client_id' in pg_get_functiondef('public.conversations_resume()'::regprocedure)) > 0
            then 'oui' else 'NON' end as verification;
