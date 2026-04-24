-- ============================================================
--  APEX APP — Bilan hebdomadaire
--  Tables: bilan_templates, bilan_assignations, bilan_instances
-- ============================================================

CREATE TABLE IF NOT EXISTS bilan_templates (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id   UUID    REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nom        TEXT    NOT NULL,
  questions  JSONB   NOT NULL DEFAULT '[]'::jsonb,
  actif      BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bilan_assignations (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID    REFERENCES bilan_templates(id) ON DELETE CASCADE NOT NULL,
  client_id   UUID    REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id    UUID    REFERENCES profiles(id) NOT NULL,
  actif       BOOLEAN DEFAULT true,
  jour_envoi  INTEGER NOT NULL DEFAULT 6,   -- 0=dim … 6=sam
  heure_envoi TEXT    NOT NULL DEFAULT '08:00',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)   -- un seul template actif par client
);

CREATE TABLE IF NOT EXISTS bilan_instances (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id         UUID    REFERENCES bilan_templates(id),
  client_id           UUID    REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id            UUID    REFERENCES profiles(id),
  semaine             DATE    NOT NULL,   -- date du samedi déclencheur
  statut              TEXT    NOT NULL DEFAULT 'en_attente'
                              CHECK (statut IN ('en_attente', 'complete')),
  questions_snapshot  JSONB   DEFAULT '[]'::jsonb,
  reponses            JSONB   DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  UNIQUE(client_id, semaine)
);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE bilan_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bilan_assignations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bilan_instances   ENABLE ROW LEVEL SECURITY;

-- bilan_templates : lecture pour tous, écriture pour le coach propriétaire
DROP POLICY IF EXISTS "bt_select" ON bilan_templates;
DROP POLICY IF EXISTS "bt_insert" ON bilan_templates;
DROP POLICY IF EXISTS "bt_update" ON bilan_templates;
DROP POLICY IF EXISTS "bt_delete" ON bilan_templates;

CREATE POLICY "bt_select" ON bilan_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "bt_insert" ON bilan_templates FOR INSERT TO authenticated WITH CHECK (coach_id = auth.uid());
CREATE POLICY "bt_update" ON bilan_templates FOR UPDATE TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "bt_delete" ON bilan_templates FOR DELETE TO authenticated USING (coach_id = auth.uid());

-- bilan_assignations : coach gère, client lit la sienne
DROP POLICY IF EXISTS "ba_select" ON bilan_assignations;
DROP POLICY IF EXISTS "ba_insert" ON bilan_assignations;
DROP POLICY IF EXISTS "ba_update" ON bilan_assignations;
DROP POLICY IF EXISTS "ba_delete" ON bilan_assignations;

CREATE POLICY "ba_select" ON bilan_assignations FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR coach_id = auth.uid());
CREATE POLICY "ba_insert" ON bilan_assignations FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid());
CREATE POLICY "ba_update" ON bilan_assignations FOR UPDATE TO authenticated
  USING (coach_id = auth.uid());
CREATE POLICY "ba_delete" ON bilan_assignations FOR DELETE TO authenticated
  USING (coach_id = auth.uid());

-- bilan_instances : client crée/complète la sienne, coach lit tout
DROP POLICY IF EXISTS "bi_select" ON bilan_instances;
DROP POLICY IF EXISTS "bi_insert" ON bilan_instances;
DROP POLICY IF EXISTS "bi_update" ON bilan_instances;

CREATE POLICY "bi_select" ON bilan_instances FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR coach_id = auth.uid());
CREATE POLICY "bi_insert" ON bilan_instances FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());
CREATE POLICY "bi_update" ON bilan_instances FOR UPDATE TO authenticated
  USING (client_id = auth.uid());
