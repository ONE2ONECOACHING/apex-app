-- APEX - Module Entrainement - Schema SQL complet
-- Executer dans Supabase > SQL Editor

-- 1. Bibliotheque d exercices
CREATE TABLE IF NOT EXISTS exercices_bdd (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom               TEXT NOT NULL,
  muscle_principal  TEXT NOT NULL,
  muscle_secondaire TEXT[] DEFAULT '{}',
  equipement        TEXT DEFAULT 'poids_corps',
  type_effort       TEXT DEFAULT 'reps',
  youtube_url       TEXT,
  description       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 2. Templates de programme
CREATE TABLE IF NOT EXISTS prog_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  description TEXT,
  nb_semaines INT DEFAULT 4,
  actif       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Seances dans un template
CREATE TABLE IF NOT EXISTS prog_template_seances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES prog_templates(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  jour        INT DEFAULT 0,
  ordre       INT DEFAULT 0,
  notes_coach TEXT
);

-- 4. Exercices dans une seance template
CREATE TABLE IF NOT EXISTS prog_template_exercices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seance_id      UUID NOT NULL REFERENCES prog_template_seances(id) ON DELETE CASCADE,
  exercice_id    UUID NOT NULL REFERENCES exercices_bdd(id),
  ordre          INT DEFAULT 0,
  series         INT DEFAULT 3,
  reps_cible     TEXT DEFAULT '10',
  charge_cible   TEXT,
  repos_secondes INT DEFAULT 90,
  notes          TEXT
);

-- 5. Programme assigne a un client
CREATE TABLE IF NOT EXISTS client_programmes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id    UUID NOT NULL REFERENCES profiles(id),
  template_id UUID REFERENCES prog_templates(id),
  nom         TEXT NOT NULL,
  date_debut  DATE,
  actif       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 6. Seances du programme client
CREATE TABLE IF NOT EXISTS client_prog_seances (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES client_programmes(id) ON DELETE CASCADE,
  nom          TEXT NOT NULL,
  jour         INT DEFAULT 0,
  ordre        INT DEFAULT 0,
  notes_coach  TEXT
);

-- 7. Exercices du programme client
CREATE TABLE IF NOT EXISTS client_prog_exercices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seance_id      UUID NOT NULL REFERENCES client_prog_seances(id) ON DELETE CASCADE,
  exercice_id    UUID NOT NULL REFERENCES exercices_bdd(id),
  ordre          INT DEFAULT 0,
  series         INT DEFAULT 3,
  reps_cible     TEXT DEFAULT '10',
  charge_cible   TEXT,
  repos_secondes INT DEFAULT 90,
  notes          TEXT
);

-- 8. Log de seances realisees
CREATE TABLE IF NOT EXISTS seances_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  programme_id  UUID REFERENCES client_programmes(id),
  seance_ref_id UUID REFERENCES client_prog_seances(id),
  date_seance   DATE NOT NULL DEFAULT CURRENT_DATE,
  debut_at      TIMESTAMPTZ,
  fin_at        TIMESTAMPTZ,
  notes_client  TEXT,
  statut        TEXT DEFAULT 'en_cours',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 9. Sets realises dans un log
CREATE TABLE IF NOT EXISTS seances_log_sets (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id                  UUID NOT NULL REFERENCES seances_log(id) ON DELETE CASCADE,
  exercice_id             UUID NOT NULL REFERENCES exercices_bdd(id),
  client_prog_exercice_id UUID REFERENCES client_prog_exercices(id),
  ordre                   INT DEFAULT 0,
  type_effort             TEXT DEFAULT 'reps',
  sets_data               JSONB DEFAULT '[]',
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE exercices_bdd           ENABLE ROW LEVEL SECURITY;
ALTER TABLE prog_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE prog_template_seances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE prog_template_exercices ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_programmes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_prog_seances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_prog_exercices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE seances_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE seances_log_sets        ENABLE ROW LEVEL SECURITY;

-- exercices_bdd
DROP POLICY IF EXISTS "exos_bdd_read"   ON exercices_bdd;
DROP POLICY IF EXISTS "exos_bdd_insert" ON exercices_bdd;
DROP POLICY IF EXISTS "exos_bdd_update" ON exercices_bdd;
DROP POLICY IF EXISTS "exos_bdd_delete" ON exercices_bdd;
CREATE POLICY "exos_bdd_read"   ON exercices_bdd FOR SELECT TO authenticated USING (true);
CREATE POLICY "exos_bdd_insert" ON exercices_bdd FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'coach');
CREATE POLICY "exos_bdd_update" ON exercices_bdd FOR UPDATE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'coach');
CREATE POLICY "exos_bdd_delete" ON exercices_bdd FOR DELETE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'coach');

-- prog_templates
DROP POLICY IF EXISTS "prog_tpl_all" ON prog_templates;
CREATE POLICY "prog_tpl_all" ON prog_templates FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'coach')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'coach');

-- prog_template_seances
DROP POLICY IF EXISTS "tpl_seances_all" ON prog_template_seances;
CREATE POLICY "tpl_seances_all" ON prog_template_seances FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'coach'
    AND template_id IN (SELECT id FROM prog_templates WHERE coach_id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'coach'
    AND template_id IN (SELECT id FROM prog_templates WHERE coach_id = auth.uid())
  );

-- prog_template_exercices
DROP POLICY IF EXISTS "tpl_exos_all" ON prog_template_exercices;
CREATE POLICY "tpl_exos_all" ON prog_template_exercices FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'coach'
    AND seance_id IN (
      SELECT s.id FROM prog_template_seances s
      JOIN prog_templates t ON t.id = s.template_id
      WHERE t.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'coach'
    AND seance_id IN (
      SELECT s.id FROM prog_template_seances s
      JOIN prog_templates t ON t.id = s.template_id
      WHERE t.coach_id = auth.uid()
    )
  );

-- client_programmes
DROP POLICY IF EXISTS "cprog_coach"       ON client_programmes;
DROP POLICY IF EXISTS "cprog_client_read" ON client_programmes;
CREATE POLICY "cprog_coach"       ON client_programmes FOR ALL    TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'coach') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'coach');
CREATE POLICY "cprog_client_read" ON client_programmes FOR SELECT TO authenticated USING (client_id = auth.uid());

-- client_prog_seances
DROP POLICY IF EXISTS "cseances_coach"       ON client_prog_seances;
DROP POLICY IF EXISTS "cseances_client_read" ON client_prog_seances;
CREATE POLICY "cseances_coach"       ON client_prog_seances FOR ALL    TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'coach') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'coach');
CREATE POLICY "cseances_client_read" ON client_prog_seances FOR SELECT TO authenticated USING (programme_id IN (SELECT id FROM client_programmes WHERE client_id = auth.uid()));

-- client_prog_exercices
DROP POLICY IF EXISTS "cexos_coach"       ON client_prog_exercices;
DROP POLICY IF EXISTS "cexos_client_read" ON client_prog_exercices;
CREATE POLICY "cexos_coach"       ON client_prog_exercices FOR ALL    TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'coach') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'coach');
CREATE POLICY "cexos_client_read" ON client_prog_exercices FOR SELECT TO authenticated USING (seance_id IN (SELECT s.id FROM client_prog_seances s JOIN client_programmes p ON p.id = s.programme_id WHERE p.client_id = auth.uid()));

-- seances_log
DROP POLICY IF EXISTS "slog_client_all" ON seances_log;
DROP POLICY IF EXISTS "slog_coach_read" ON seances_log;
CREATE POLICY "slog_client_all"  ON seances_log FOR ALL    TO authenticated USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE POLICY "slog_coach_read"  ON seances_log FOR SELECT TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'coach');

-- seances_log_sets
DROP POLICY IF EXISTS "ssets_client_all" ON seances_log_sets;
DROP POLICY IF EXISTS "ssets_coach_read" ON seances_log_sets;
CREATE POLICY "ssets_client_all" ON seances_log_sets FOR ALL    TO authenticated USING (log_id IN (SELECT id FROM seances_log WHERE client_id = auth.uid())) WITH CHECK (log_id IN (SELECT id FROM seances_log WHERE client_id = auth.uid()));
CREATE POLICY "ssets_coach_read" ON seances_log_sets FOR SELECT TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'coach');