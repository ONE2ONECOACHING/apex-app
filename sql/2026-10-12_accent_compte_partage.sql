-- ============================================================================
-- APEX APP — Corriger l'accent du « Compte partagé » (12 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Le nom s'affichait « Compte partag√© » : l'accent avait été abîmé au
-- copier-coller du script de renommage. Le « é » est écrit ici par son code
-- (chr(233)) pour ne plus dépendre du copier-coller.
--
-- Ne touche à rien d'autre. Transaction, relançable sans risque.
-- ============================================================================

begin;

update public.profiles
set prenom = 'Compte partag' || chr(233)
where id = 'fe2c19c2-e00f-4c4e-9543-3634022e42ff';

commit;

-- Vérification (lecture seule) : attendu « Compte partagé »
select prenom from public.profiles where id = 'fe2c19c2-e00f-4c4e-9543-3634022e42ff';
