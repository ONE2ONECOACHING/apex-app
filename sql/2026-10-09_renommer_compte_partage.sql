-- ============================================================================
-- APEX APP — Renommer le compte coach partagé (9 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- Le compte partagé s'appelait « Client » (prénom par défaut à sa création),
-- ce qui prêtait à confusion dans le menu « Coach référent » et l'écran Équipe.
-- Il s'appelle désormais « Compte partagé ».
--
-- Ne touche à rien d'autre. Tout est dans une transaction. Relançable.
-- ============================================================================

begin;

update public.profiles
set prenom = 'Compte partagé',
    nom    = null
where id = 'fe2c19c2-e00f-4c4e-9543-3634022e42ff'
  and role = 'coach';

commit;

-- ── Vérification (lecture seule) ────────────────────────────────────────────
-- Attendu : 6 comptes coach, dont « Compte partagé », Benjamin et Christophe
-- (gérants), Lola, Diego et Cyril.
select prenom, nom, email, is_gerant
from public.profiles
where role = 'coach'
order by is_gerant desc, prenom;
