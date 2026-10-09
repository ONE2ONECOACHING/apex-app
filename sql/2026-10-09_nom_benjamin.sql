-- ============================================================================
-- APEX APP — Ajouter le nom de famille de Benjamin (9 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Remplit le nom (« Cara ») du compte gérant de Benjamin, resté vide.
-- Ne touche à rien d'autre. Tout est dans une transaction. Relançable.
-- ============================================================================

begin;

update public.profiles
set nom = 'Cara'
where role = 'coach'
  and is_gerant
  and prenom = 'Benjamin'
  and id <> 'fe2c19c2-e00f-4c4e-9543-3634022e42ff';

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : Benjamin Cara, gérant.
select prenom, nom, is_gerant
from public.profiles
where role = 'coach'
order by is_gerant desc, prenom;
