-- Ajout series_data JSONB pour les séries individuelles (reps + charge par série)
ALTER TABLE prog_template_exercices ADD COLUMN IF NOT EXISTS series_data JSONB;
ALTER TABLE client_prog_exercices   ADD COLUMN IF NOT EXISTS series_data JSONB;
