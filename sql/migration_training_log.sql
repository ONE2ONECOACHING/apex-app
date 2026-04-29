-- ============================================================
-- APEX — Migration : logs d'entraînement
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1. Log de séance (une ligne par séance réalisée)
CREATE TABLE IF NOT EXISTS seances_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  programme_id    UUID REFERENCES client_programmes(id) ON DELETE SET NULL,
  seance_id       UUID REFERENCES client_prog_seances(id)  ON DELETE SET NULL,
  nom_seance      TEXT NOT NULL,
  date_seance     DATE NOT NULL,
  duree_secondes  INTEGER DEFAULT 0,
  statut          TEXT DEFAULT 'complete',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. Détail par exercice (toutes les séries réalisées)
CREATE TABLE IF NOT EXISTS seances_log_sets (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id                   UUID NOT NULL REFERENCES seances_log(id) ON DELETE CASCADE,
  exercice_id              UUID REFERENCES exercices_bdd(id) ON DELETE SET NULL,
  client_prog_exercice_id  UUID REFERENCES client_prog_exercices(id) ON DELETE SET NULL,
  ordre                    INTEGER DEFAULT 0,
  type_effort              TEXT DEFAULT 'reps',
  sets_data                JSONB DEFAULT '[]'::jsonb,
  created_at               TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_seances_log_client   ON seances_log(client_id, date_seance DESC);
CREATE INDEX IF NOT EXISTS idx_seances_log_sets_log ON seances_log_sets(log_id, ordre);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE seances_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE seances_log_sets ENABLE ROW LEVEL SECURITY;

-- Client : lecture + écriture de ses propres logs
CREATE POLICY "seances_log_own" ON seances_log
  FOR ALL USING (client_id = auth.uid());

CREATE POLICY "seances_log_sets_own" ON seances_log_sets
  FOR ALL USING (
    log_id IN (SELECT id FROM seances_log WHERE client_id = auth.uid())
  );

-- Coach : lecture des logs de ses clients
CREATE POLICY "seances_log_coach_read" ON seances_log
  FOR SELECT USING (
    client_id IN (SELECT id FROM profiles WHERE coach_id = auth.uid())
  );

CREATE POLICY "seances_log_sets_coach_read" ON seances_log_sets
  FOR SELECT USING (
    log_id IN (
      SELECT l.id FROM seances_log l
      JOIN profiles p ON p.id = l.client_id
      WHERE p.coach_id = auth.uid()
    )
  );
