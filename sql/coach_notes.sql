-- APEX APP — Table notes hebdomadaires du coach par client
CREATE TABLE IF NOT EXISTS coach_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  semaine    DATE NOT NULL,
  note       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, semaine)
);
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach can manage own notes" ON coach_notes
  FOR ALL USING (coach_id = auth.uid());
