-- ============================================================================
-- APEX APP — État des lieux de la base (8 octobre 2026)
-- À coller dans Supabase → SQL Editor → Run.
--
-- LECTURE SEULE : ne modifie rien (aucune table, aucune règle, aucune donnée).
-- Relançable autant de fois que voulu.
--
-- Sert à préparer l'étape 1 (rôle gérant, coach référent, droits) :
--   1. règles d'accès (RLS) de chaque table
--   2. tables où le RLS est activé ou non
--   3. colonnes de chaque table (dont les 11 tables créées à la main)
--   4. liens entre tables (et ce qui se passe à la suppression d'un compte)
--   5. fonctions et déclencheurs
--   6. nombre de comptes par rôle, répartition des étiquettes coach
--   7. liste des clients sans étiquette coach (pour choisir leur référent)
--
-- Après le Run : bouton « Download CSV » au-dessus du résultat, puis
-- donner à Claude le chemin du fichier (ex. ~/Downloads/...csv).
-- Ne pas mettre ce fichier dans le dépôt : il contient des noms de clients.
-- ============================================================================

select ordre, section, objet, detail from (

  -- 1. Règles d'accès
  select 1 as ordre, 'regle' as section, tablename::text as objet,
         policyname || ' | ' || cmd || ' | ' || array_to_string(roles, ',')
         || ' | USING: ' || coalesce(qual, '-')
         || ' | CHECK: ' || coalesce(with_check, '-') as detail
  from pg_policies
  where schemaname = 'public'

  union all

  -- 2. RLS activé ou non
  select 2, 'rls', c.relname::text,
         case when c.relrowsecurity then 'RLS active' else 'RLS DESACTIVEE' end
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'

  union all

  -- 3. Colonnes
  select 3, 'colonne', table_name::text,
         column_name || ' ' || data_type
         || case when is_nullable = 'NO' then ' not null' else '' end
         || coalesce(' default ' || column_default, '')
  from information_schema.columns
  where table_schema = 'public'

  union all

  -- 4. Liens entre tables
  select 4, 'cle_etrangere', tc.relname::text,
         con.conname || ' : ' || pg_get_constraintdef(con.oid)
  from pg_constraint con
  join pg_class tc on tc.oid = con.conrelid
  join pg_namespace n on n.oid = tc.relnamespace
  where n.nspname = 'public' and con.contype in ('f', 'c', 'u')

  union all

  -- 5a. Fonctions
  select 5, 'fonction', p.proname::text, pg_get_functiondef(p.oid)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'

  union all

  -- 5b. Déclencheurs (y compris celui qui crée le profil à l'inscription)
  select 5, 'declencheur', event_object_schema || '.' || event_object_table,
         trigger_name || ' ' || action_timing || ' ' || event_manipulation
         || ' : ' || action_statement
  from information_schema.triggers
  where trigger_schema in ('public', 'auth')

  union all

  -- 6a. Comptes par rôle
  select 6, 'comptes', coalesce(role, '(vide)'), count(*)::text || ' profils'
  from public.profiles
  group by role

  union all

  -- 6b. Comptes coach existants
  select 6, 'compte_coach', email, 'id ' || id::text
  from public.profiles
  where role = 'coach'

  union all

  -- 6c. Répartition des étiquettes coach
  select 6, 'etiquettes', coalesce(nullif(coach_tag, ''), '(aucune)'),
         count(*)::text || ' clients'
  from public.profiles
  where role = 'client'
  group by coalesce(nullif(coach_tag, ''), '(aucune)')

  union all

  -- 7. Clients sans étiquette coach
  select 7, 'client_sans_etiquette',
         trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')),
         coalesce(email, '')
         || case when actif = false then ' (inactif)' else '' end
  from public.profiles
  where role = 'client' and coalesce(coach_tag, '') = ''

) inventaire
order by ordre, section, objet, detail;
