-- Ajout type_effort sur les exercices de template et de programme client
ALTER TABLE prog_template_exercices ADD COLUMN IF NOT EXISTS type_effort TEXT DEFAULT 'reps';
ALTER TABLE client_prog_exercices   ADD COLUMN IF NOT EXISTS type_effort TEXT DEFAULT 'reps';
