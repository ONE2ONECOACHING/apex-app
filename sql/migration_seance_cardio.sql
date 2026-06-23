-- Migration : séances cardio avec progression texte par semaine
ALTER TABLE prog_template_seances
  ADD COLUMN IF NOT EXISTS cardio       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cardio_weeks JSONB   DEFAULT '[]';

ALTER TABLE client_prog_seances
  ADD COLUMN IF NOT EXISTS cardio       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cardio_weeks JSONB   DEFAULT '[]';
-- cardio_weeks = ["texte semaine 1", "texte semaine 2", ...] (un par semaine)
