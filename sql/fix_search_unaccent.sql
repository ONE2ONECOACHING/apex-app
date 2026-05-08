-- ============================================================
-- FIX : Recherche insensible aux accents (pate → pâtes)
-- à exécuter dans Supabase > SQL Editor
-- ============================================================

-- Activer l'extension unaccent (si pas déjà fait)
create extension if not exists unaccent schema extensions;

-- Accorder l'usage à tous les rôles utiles
grant usage on schema extensions to anon, authenticated, service_role;

-- Créer (ou remplacer) la fonction de recherche accent-insensible
create or replace function search_aliments(q text)
returns setof aliments_bdd
language sql
security definer
set search_path = public, extensions
as $$
  select *
  from aliments_bdd
  where extensions.unaccent(lower(nom)) ilike '%' || extensions.unaccent(lower(q)) || '%'
  order by
    -- Priorité : le nom commence par la recherche
    case when extensions.unaccent(lower(nom)) ilike extensions.unaccent(lower(q)) || '%' then 0 else 1 end,
    nom
  limit 20;
$$;

-- Accorder l'exécution aux rôles anon + authenticated
grant execute on function search_aliments(text) to anon, authenticated;
