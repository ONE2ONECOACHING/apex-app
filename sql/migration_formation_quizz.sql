-- Migration : ajout type + questions sur les leçons de formation
ALTER TABLE formation_lecons ADD COLUMN IF NOT EXISTS type      TEXT    DEFAULT 'lecon'; -- 'lecon' | 'quizz'
ALTER TABLE formation_lecons ADD COLUMN IF NOT EXISTS questions JSONB   DEFAULT '[]';
-- questions = [{ id, question, options: [{text, correct}], explication? }]
