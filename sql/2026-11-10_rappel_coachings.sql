-- ============================================================================
-- APEX APP — Rappel des coachings aux coachs, 30 minutes avant (10 novembre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- L'Edge Function rappel-coaching (lancée toutes les 5 minutes) envoie au
-- coach une notification « Tu vas coacher … » une demi-heure avant chaque
-- coaching ou rendez-vous prospect. Pour ne pas l'envoyer deux fois, elle note
-- ici l'heure de début pour laquelle le rappel est parti : si le créneau est
-- déplacé ensuite, un nouveau rappel partira pour la nouvelle heure.
--
-- Droits inchangés (agenda_creneaux : tous les coachs). La colonne est écrite
-- par la fonction avec la clé de service.
--
-- Ne modifie aucune donnée existante. Transaction, relançable sans risque.
-- ============================================================================

begin;

alter table public.agenda_creneaux add column if not exists rappel_envoye_pour timestamptz;

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : une ligne « rappel_envoye_pour : timestamp with time zone ».
select column_name::text || ' : ' || data_type as colonne
from information_schema.columns
where table_schema = 'public' and table_name = 'agenda_creneaux' and column_name = 'rappel_envoye_pour';
