-- Migration : note client par exercice dans le log de séance
ALTER TABLE seances_log_sets
  ADD COLUMN IF NOT EXISTS note_client TEXT;
