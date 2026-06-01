-- Migration complète : toutes les colonnes manquantes sur les tables d'entraînement
-- À exécuter UNE SEULE FOIS dans l'éditeur SQL Supabase

-- 1. Type d'effort
ALTER TABLE prog_template_exercices ADD COLUMN IF NOT EXISTS type_effort TEXT DEFAULT 'reps';
ALTER TABLE client_prog_exercices   ADD COLUMN IF NOT EXISTS type_effort TEXT DEFAULT 'reps';

-- 2. Superset
ALTER TABLE prog_template_exercices ADD COLUMN IF NOT EXISTS superset_groupe TEXT;
ALTER TABLE client_prog_exercices   ADD COLUMN IF NOT EXISTS superset_groupe TEXT;

-- 3. Données par série (JSONB)
ALTER TABLE prog_template_exercices ADD COLUMN IF NOT EXISTS series_data JSONB;
ALTER TABLE client_prog_exercices   ADD COLUMN IF NOT EXISTS series_data JSONB;
