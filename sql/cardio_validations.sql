-- APEX APP — Validations des séances cardio par le client
CREATE TABLE IF NOT EXISTS cardio_validations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seance_id     UUID NOT NULL,                 -- client_prog_seances.id
  semaine       INT  NOT NULL,                 -- numéro de semaine validé
  note_ressenti TEXT,                          -- 'dur' | 'bien' | 'feu'
  note_client   TEXT,
  completed_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, seance_id, semaine)
);

ALTER TABLE cardio_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client gère ses validations cardio" ON cardio_validations
  FOR ALL USING (client_id = auth.uid());

CREATE POLICY "Coach voit les validations" ON cardio_validations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'coach')
  );
