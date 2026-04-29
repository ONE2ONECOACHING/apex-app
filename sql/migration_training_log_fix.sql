-- ============================================================
-- APEX — Fix migration training log
-- Corrige les policies RLS coach (pas de colonne coach_id)
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- Créer les tables si pas encore créées (idempotent)
CREATE TABLE IF NOT EXISTS seances_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  programme_id    UUID REFERENCES client_programmes(id) ON DELETE SET NULL,
  seance_id       UUID REFERENCES client_prog_seances(id) ON DELETE SET NULL,
  nom_seance      TEXT NOT NULL,
  date_seance     DATE NOT NULL,
  duree_secondes  INTEGER DEFAULT 0,
  statut          TEXT DEFAULT 'complete',
  created_at      TIMESTAMPTZ DEFAULT now()
);

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

CREATE INDEX IF NOT EXISTS idx_seances_log_client   ON seances_log(client_id, date_seance DESC);
CREATE INDEX IF NOT EXISTS idx_seances_log_sets_log ON seances_log_sets(log_id, ordre);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE seances_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE seances_log_sets ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent (re-run safe)
DROP POLICY IF EXISTS "seances_log_own"               ON seances_log;
DROP POLICY IF EXISTS "seances_log_coach_read"        ON seances_log;
DROP POLICY IF EXISTS "seances_log_sets_own"          ON seances_log_sets;
DROP POLICY IF EXISTS "seances_log_sets_coach_read"   ON seances_log_sets;

-- Client : lecture + écriture de ses propres logs
CREATE POLICY "seances_log_own" ON seances_log
  FOR ALL USING (client_id = auth.uid());

CREATE POLICY "seances_log_sets_own" ON seances_log_sets
  FOR ALL USING (
    log_id IN (SELECT id FROM seances_log WHERE client_id = auth.uid())
  );

-- Coach : lecture de tous les logs clients (role = 'coach')
CREATE POLICY "seances_log_coach_read" ON seances_log
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'coach'
  );

CREATE POLICY "seances_log_sets_coach_read" ON seances_log_sets
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'coach'
  );
