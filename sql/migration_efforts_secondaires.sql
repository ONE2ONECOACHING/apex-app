-- Migration : Support des séries à double effort
-- Exemples : 5 reps @80% → 10s → max reps @60%  (Rest-Pause, Drop Set, Iso Régressif…)
-- À exécuter sur Supabase SQL Editor

ALTER TABLE prog_template_exercices
  ADD COLUMN IF NOT EXISTS reps_secondaire TEXT,        -- reps du 2e effort (ex: 'max', '6', '8-6-4')
  ADD COLUMN IF NOT EXISTS repos_intra_sec INTEGER;     -- repos intra-série entre effort 1 et 2 (ex: 10)

ALTER TABLE client_prog_exercices
  ADD COLUMN IF NOT EXISTS reps_secondaire TEXT,
  ADD COLUMN IF NOT EXISTS repos_intra_sec INTEGER;
