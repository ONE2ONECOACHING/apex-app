-- ============================================================================
-- APEX APP — Lot 3 de l'audit : traces fiables et pièces jointes (20 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
--   1. « Qui a fait quoi » ne peut plus être falsifié depuis le navigateur :
--      maj_par / coach_id / cree_par = le compte connecté, imposé par la base
--      (journal de suivi, profil coaching, notifications, grille du studio —
--      utile à la facturation —, créneaux de l'agenda). Les opérations des
--      fonctions serveur (crons) ne sont pas concernées.
--   2. Messages : une photo ou un vocal doit être rangé dans le dossier de sa
--      propre conversation (<client>/<canal>/…) ; impossible de pointer vers le
--      fichier d'une autre conversation. Les messages existants ne sont pas
--      vérifiés (NOT VALID), seuls les nouveaux.
--   3. Fonctions de la messagerie : réservées aux comptes connectés.
--
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

-- ── 1. Traces imposées ───────────────────────────────────────────────────────
create or replace function public.imposer_auteur()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- tg_argv[0] = colonne à remplir avec le compte connecté
  if auth.uid() is not null then
    new := jsonb_populate_record(new, jsonb_build_object(tg_argv[0], auth.uid()));
  end if;
  return new;
end;
$$;

drop trigger if exists imposer_auteur on public.journal_suivi;
create trigger imposer_auteur before insert or update on public.journal_suivi
  for each row execute function public.imposer_auteur('maj_par');

drop trigger if exists imposer_auteur on public.journal_suivi_entete;
create trigger imposer_auteur before insert or update on public.journal_suivi_entete
  for each row execute function public.imposer_auteur('maj_par');

drop trigger if exists imposer_auteur on public.fiche_coach;
create trigger imposer_auteur before insert or update on public.fiche_coach
  for each row execute function public.imposer_auteur('maj_par');

drop trigger if exists imposer_auteur on public.notifications_client;
create trigger imposer_auteur before insert or update on public.notifications_client
  for each row execute function public.imposer_auteur('maj_par');

drop trigger if exists imposer_auteur on public.seances_studio_saisies;
create trigger imposer_auteur before insert or update on public.seances_studio_saisies
  for each row execute function public.imposer_auteur('maj_par');

drop trigger if exists imposer_auteur on public.seances_studio_semaines;
create trigger imposer_auteur before insert or update on public.seances_studio_semaines
  for each row execute function public.imposer_auteur('coach_id');

drop trigger if exists imposer_auteur on public.agenda_creneaux;
create trigger imposer_auteur before insert on public.agenda_creneaux
  for each row execute function public.imposer_auteur('cree_par');

-- ── 2. Pièces jointes rangées dans leur conversation ────────────────────────
alter table public.messages drop constraint if exists messages_piece_dossier_check;
alter table public.messages add constraint messages_piece_dossier_check
  check (piece_path is null or piece_path like client_id::text || '/' || canal || '/%') not valid;

-- ── 3. Fonctions de la messagerie : comptes connectés seulement ─────────────
revoke all on function public.peut_lire_conversation(uuid, text) from public, anon;
grant execute on function public.peut_lire_conversation(uuid, text) to authenticated;
revoke all on function public.peut_ecrire_conversation(uuid, text) from public, anon;
grant execute on function public.peut_ecrire_conversation(uuid, text) to authenticated;
revoke all on function public.conversations_resume() from public, anon;
grant execute on function public.conversations_resume() to authenticated;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : 7 déclencheurs « imposer_auteur » et la contrainte des pièces jointes.
select 'declencheur' as quoi, c.relname::text as detail
from pg_trigger t join pg_class c on c.oid = t.tgrelid
where t.tgname = 'imposer_auteur' and not t.tgisinternal
union all
select 'contrainte', conname::text from pg_constraint where conname = 'messages_piece_dossier_check'
order by 1, 2;
