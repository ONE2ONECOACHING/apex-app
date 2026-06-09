-- APEX APP — Module Formation en ligne

CREATE TABLE IF NOT EXISTS formations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  titre       TEXT NOT NULL,
  description TEXT,
  genre       TEXT DEFAULT 'tous', -- 'hommes' | 'femmes' | 'tous'
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS formation_modules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  titre        TEXT NOT NULL,
  description  TEXT,
  ordre        INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS formation_lecons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   UUID NOT NULL REFERENCES formation_modules(id) ON DELETE CASCADE,
  titre       TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT,
  duree_min   INT,
  ordre       INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS formation_assignations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  coach_id     UUID REFERENCES profiles(id),
  assigned_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, formation_id)
);

CREATE TABLE IF NOT EXISTS formation_progression (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lecon_id     UUID NOT NULL REFERENCES formation_lecons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, lecon_id)
);

-- RLS
ALTER TABLE formations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_modules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_lecons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_assignations ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_progression  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach gère ses formations"      ON formations             FOR ALL USING (coach_id = auth.uid());
CREATE POLICY "Coach gère ses modules"         ON formation_modules      FOR ALL USING (EXISTS (SELECT 1 FROM formations f WHERE f.id = formation_id AND f.coach_id = auth.uid()));
CREATE POLICY "Coach gère ses leçons"          ON formation_lecons       FOR ALL USING (EXISTS (SELECT 1 FROM formation_modules m JOIN formations f ON f.id = m.formation_id WHERE m.id = module_id AND f.coach_id = auth.uid()));
CREATE POLICY "Coach gère ses assignations"    ON formation_assignations FOR ALL USING (coach_id = auth.uid());
CREATE POLICY "Client voit ses formations"     ON formation_assignations FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Client voir leçons assignées"   ON formation_lecons       FOR SELECT USING (true);
CREATE POLICY "Client voir modules"            ON formation_modules      FOR SELECT USING (true);
CREATE POLICY "Client voir formations"         ON formations             FOR SELECT USING (true);
CREATE POLICY "Client gère sa progression"     ON formation_progression  FOR ALL USING (client_id = auth.uid());
CREATE POLICY "Coach voit progression clients" ON formation_progression  FOR SELECT USING (EXISTS (SELECT 1 FROM formation_assignations a WHERE a.client_id = formation_progression.client_id AND a.coach_id = auth.uid()));
