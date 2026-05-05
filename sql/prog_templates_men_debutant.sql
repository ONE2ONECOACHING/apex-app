-- ============================================================
-- APEX — MEN WORK DÉBUTANT — Templates de programme Phase 2 à 10
-- Source : MEN WORK' DEBUTANT (1).xlsx
-- A exécuter dans Supabase > SQL Editor
-- ============================================================
-- ⚠️  ORDRE D'EXÉCUTION :
--   1. Migration colonne tag (si pas encore faite)
--   2. Ajout exercices manquants
--   3. Bloc DO $$ (templates + séances + exercices)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- ÉTAPE 1 — Migration : colonne tag sur prog_templates
-- ─────────────────────────────────────────────────────────────
ALTER TABLE prog_templates ADD COLUMN IF NOT EXISTS tag TEXT;


-- ─────────────────────────────────────────────────────────────
-- ÉTAPE 2 — Exercices manquants dans exercices_bdd
-- ─────────────────────────────────────────────────────────────
INSERT INTO exercices_bdd (nom, muscle_principal, equipement, type_effort)
VALUES
  ('Développé couché à la barre',    'pectoraux', 'barre',  'reps'),
  ('Développé couché prise serrée',  'pectoraux', 'barre',  'reps'),
  ('Abdos à la roulette',            'abdos',     'autres', 'reps')
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- ÉTAPE 3 — Bloc principal : templates Phase 2 → 10
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_coach UUID;

  -- ── UUIDs Templates ──────────────────────────────────────
  t2  UUID; t3  UUID; t4  UUID; t5  UUID; t6  UUID;
  t7  UUID; t8  UUID; t9  UUID; t10 UUID;

  -- ── UUIDs Séances (a=1, b=2, c=3) ───────────────────────
  s2a UUID; s2b UUID; s2c UUID;
  s3a UUID; s3b UUID; s3c UUID;
  s4a UUID; s4b UUID; s4c UUID;
  s5a UUID; s5b UUID; s5c UUID;
  s6a UUID; s6b UUID; s6c UUID;
  s7a UUID; s7b UUID; s7c UUID;
  s8a UUID; s8b UUID; s8c UUID;
  s9a UUID; s9b UUID; s9c UUID;
  s10a UUID; s10b UUID; s10c UUID;

BEGIN
  -- Récupérer le 1er coach (ORDER BY created_at)
  SELECT id INTO v_coach FROM profiles WHERE role = 'coach' ORDER BY created_at LIMIT 1;
  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'Aucun profil coach trouvé dans la table profiles.';
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- PHASE 2 — Superset Antagoniste | 6 semaines
  -- Stress mécanique / Dommages musculaires
  -- 3-4 supersets × 12-15 reps | R2min
  -- ══════════════════════════════════════════════════════════
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  VALUES (v_coach,
    'MEN WORK - Phase 2',
    'Superset Antagoniste | Stress mécanique / Dommages musculaires | 3-4 supersets × 12-15 reps | R2min',
    6, 'men')
  RETURNING id INTO t2;

  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t2, 'Séance A', 1) RETURNING id INTO s2a;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t2, 'Séance B', 2) RETURNING id INTO s2b;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t2, 'Séance C', 3) RETURNING id INTO s2c;

  -- Séance A — Push/Pull + Jambes + Bras
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s2a, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé couché aux haltères',          1, 3, '12-15', 120, 'SS1 avec Seated Row NEUTRE'),
    ('Seated Row NEUTRE',                       2, 3, '12-15', 120, 'SS1 avec Développé couché'),
    ('Hack Squat Machine',                      3, 3, '12-15', 120, 'SS2 avec Leg curl assis'),
    ('Leg curl assis',                          4, 3, '12-15', 120, 'SS2 avec Hack Squat Machine'),
    ('Standing Curl aux haltères (offset)',     5, 3, '12-15', 120, 'SS3 avec French Press corde'),
    ('French Press à la corde',                 6, 3, '12-15', 120, 'SS3 avec Curl offset'),
    ('V up croisée',                            7, 3, '12-15',  90, 'Finisher | SS avec Back Extension'),
    ('45° Back Extension',                      8, 3, '12-15',  90, 'Finisher | SS avec V up croisée')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance B — Épaules/Dos + Pec + Bras + Abdos
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s2b, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé militaire aux haltères (prise neutre)', 1, 3, '12-15', 120, 'SS1 avec Lat Pulldown pronation'),
    ('Lat Pulldown PRONATION',                          2, 3, '12-15', 120, 'SS1 avec Dév militaire'),
    ('Peck deck machine',                               3, 3, '12-15', 120, 'SS2 avec Élévations lat incliné 60°'),
    ('Elevations latérales incliné 60° aux haltères',  4, 3, '12-15', 120, 'SS2 avec Peck deck'),
    ('Low câble curl avec barre courte',                5, 3, '12-15', 120, 'SS3 avec Triceps corde'),
    ('Triceps extension à la corde',                    6, 3, '12-15', 120, 'SS3 avec Low câble curl'),
    ('DRagon flag',                                     7, 3, '12-15',  90, 'Finisher | SS avec DB Side Bend'),
    ('DB Side Bend',                                    8, 3, '12-15',  90, 'Finisher | SS avec Dragon flag')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance C — Pec/Dos + Jambes + Épaules
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s2c, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Crossover câble milieu (neutre)',   1, 3, '12-15', 120, 'SS1 avec Tirage bûcheron'),
    ('Tirage bûcheron (lats focus)',      2, 3, '12-15', 120, 'SS1 avec Crossover câble milieu'),
    ('Romanian Deadlift',                 3, 3, '12-15', 120, 'SS2 avec Leg Extension'),
    ('Leg Extension',                     4, 3, '12-15', 120, 'SS2 avec Romanian Deadlift'),
    ('Elévations frontales aux haltères', 5, 3, '12-15', 120, 'SS3 avec Câble face pull'),
    ('Câble face pull',                   6, 3, '12-15', 120, 'SS3 avec Élévations frontales')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;


  -- ══════════════════════════════════════════════════════════
  -- PHASE 3 — Top Set Back Off | 6 semaines
  -- Stress mécanique / Intensification
  -- Montée jusqu'à 12RM, puis 3×12 à −10% | R2min
  -- ══════════════════════════════════════════════════════════
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  VALUES (v_coach,
    'MEN WORK - Phase 3',
    'Top Set Back Off | Stress mécanique / Intensification | Montée à 12RM puis 3×12 −10% | R2min',
    6, 'men')
  RETURNING id INTO t3;

  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t3, 'Séance A', 1) RETURNING id INTO s3a;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t3, 'Séance B', 2) RETURNING id INTO s3b;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t3, 'Séance C', 3) RETURNING id INTO s3c;

  -- Séance A — Push + Jambes + Bras
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s3a, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé couché à la barre',        1, 4, '10-12', 120, 'Top Set → 12RM, puis 3×12 −10%'),
    ('Hack Squat Machine',                 2, 4, '10-12', 120, 'Top Set → 12RM, puis 3×12 −10%'),
    ('Seated Row NEUTRE',                  3, 3, '12',    120, NULL),
    ('Leg curl assis',                     4, 3, '12',    120, NULL),
    ('French Press à la corde',            5, 3, '12',    120, 'Câble french press'),
    ('Standing Curl aux haltères (offset)', 6, 3, '12',   120, 'Biceps curl OFFSET')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance B — Pull + Ischio + Épaules + Pec + Abdos
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s3b, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Traction Supination',                 1, 4, '6-10',  120, 'Pull ups variante | Top Set'),
    ('Romanian Deadlift',                   2, 4, '10-12', 120, 'Top Set → 12RM, puis 3×12 −10%'),
    ('Elevations latérales aux haltères',   3, 3, '12',    120, NULL),
    ('Triceps Extension couché aux haltères', 4, 3, '12',  120, 'Flat db extension'),
    ('Flyes inversés (prise neutre)',        5, 3, '12',   120, 'Reverse flyes'),
    ('Hollow leg raises',                   6, 3, '15',    90,  'Abdos finisher')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance C — OHP + Jambes + Dos + Pec + Biceps + Abdos
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s3c, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé militaire à la barre',  1, 4, '10-12', 120, 'Strict press | Top Set → 12RM'),
    ('Bulgarian Split squat',           2, 4, '10-12', 120, 'Top Set → 12RM, puis 3×12 −10%'),
    ('Tirage bûcheron (lats focus)',    3, 3, '12',    120, NULL),
    ('Flyes aux haltères',              4, 3, '12',    120, 'Flat DB flyes'),
    ('EZ Bar Scott Curl',               5, 3, '12',    120, NULL),
    ('Abdos à la roulette',             6, 3, '10-15',  90, 'Abdos finisher')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;


  -- ══════════════════════════════════════════════════════════
  -- PHASE 4 — Superpump Régressif | 6 semaines
  -- Stress mécanique / Density Training
  -- Séries descendantes, même exercices Phase 3 | R2min
  -- ══════════════════════════════════════════════════════════
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  VALUES (v_coach,
    'MEN WORK - Phase 4',
    'Superpump Régressif | Stress mécanique / Density Training | 4 séries descendantes | R2min',
    6, 'men')
  RETURNING id INTO t4;

  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t4, 'Séance A', 1) RETURNING id INTO s4a;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t4, 'Séance B', 2) RETURNING id INTO s4b;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t4, 'Séance C', 3) RETURNING id INTO s4c;

  -- Séance A — identique Phase 3 S1 (même exercices)
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s4a, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé couché à la barre',         1, 4, '10-12', 120, 'Superpump régressif : −10% chaque série'),
    ('Hack Squat Machine',                  2, 4, '10-12', 120, 'Superpump régressif : −10% chaque série'),
    ('Seated Row NEUTRE',                   3, 3, '12',    120, NULL),
    ('Leg curl assis',                      4, 3, '12',    120, NULL),
    ('French Press à la corde',             5, 3, '12',    120, 'Câble french press'),
    ('Standing Curl aux haltères (offset)', 6, 3, '12',   120, 'Biceps curl OFFSET')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance B — même exercices Phase 3, abdos = Garhammer raises
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s4b, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Traction Supination',                   1, 4, '6-10',  120, 'Pull ups variante | Superpump régressif'),
    ('Romanian Deadlift',                     2, 4, '10-12', 120, 'Superpump régressif : −10% chaque série'),
    ('Elevations latérales aux haltères',     3, 3, '12',    120, NULL),
    ('Triceps Extension couché aux haltères', 4, 3, '12',    120, 'Flat db extension'),
    ('Flyes inversés (prise neutre)',          5, 3, '12',   120, 'Reverse flyes'),
    ('Garhammer raises',                      6, 3, '10-15',  90, 'Abdos finisher')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance C — même exercices Phase 3 S3
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s4c, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé militaire à la barre', 1, 4, '10-12', 120, 'Strict press | Superpump régressif'),
    ('Bulgarian Split squat',          2, 4, '10-12', 120, 'Superpump régressif : −10% chaque série'),
    ('Tirage bûcheron (lats focus)',   3, 3, '12',    120, NULL),
    ('Flyes aux haltères',             4, 3, '12',    120, 'Flat DB flyes'),
    ('EZ Bar Scott Curl',              5, 3, '12',    120, NULL),
    ('Abdos à la roulette',            6, 3, '10-15',  90, 'Abdos finisher')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;


  -- ══════════════════════════════════════════════════════════
  -- PHASE 5 — Superset Agoniste | 6 semaines
  -- Stress mécanique / Dommages musculaires
  -- 3-4 supersets × 8-12 reps | R2min
  -- ══════════════════════════════════════════════════════════
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  VALUES (v_coach,
    'MEN WORK - Phase 5',
    'Superset Agoniste | Stress mécanique / Dommages musculaires | 3-4 supersets × 8-12 reps | R2min',
    6, 'men')
  RETURNING id INTO t5;

  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t5, 'Séance A', 1) RETURNING id INTO s5a;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t5, 'Séance B', 2) RETURNING id INTO s5b;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t5, 'Séance C', 3) RETURNING id INTO s5c;

  -- Séance A — Triceps/Pec + Jambes + Dos/Masse + Abdos
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s5a, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé couché prise serrée',          1, 3, '8-12', 120, 'SS1 avec Triceps kick back'),
    ('Triceps kick back à la poulie',           2, 3, '8-12', 120, 'SS1 avec Développé prise serrée'),
    ('Hack Squat Machine',                      3, 3, '8-12', 120, 'SS2 avec Fente arrière'),
    ('Fente arrière',                           4, 3, '8-12', 120, 'SS2 avec Hack Squat'),
    ('Tirage buste penché à la barre (pronation)', 5, 3, '8-12', 120, 'SS3 avec Reverse Pec Deck'),
    ('Reverse Pec Deck Machine',                6, 3, '8-12', 120, 'SS3 avec Tirage buste penché'),
    ('V up croisée',                            7, 3, '8-12',  90, 'Finisher | SS avec Dragon flag'),
    ('DRagon flag',                             8, 3, '8-12',  90, 'Finisher | SS avec V up croisée')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance B — Épaules + Grand dorsal + Biceps/Triceps + Abdos
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s5b, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('EZ Bar Upright row',                1, 3, '8-12', 120, 'SS1 avec Cobra Press'),
    ('Cobra Press',                        2, 3, '8-12', 120, 'SS1 avec EZ Bar Upright row'),
    ('Straight Arm Pulldown',              3, 3, '8-12', 120, 'SS2 avec Pull Over haltère'),
    ('Pull Over à l''haltère',             4, 3, '8-12', 120, 'SS2 avec Straight Arm Pulldown'),
    ('Traction Supination',                5, 3, '8-12', 120, 'SS3 avec Curl neutre'),
    ('Standing Curl aux haltères (neutre)', 6, 3, '8-12', 120, 'SS3 avec Traction supination'),
    ('45° Back Extension',                 7, 3, '8-12',  90, 'Finisher | SS avec DB Side Bend'),
    ('DB Side Bend',                       8, 3, '8-12',  90, 'Finisher | SS avec Back Extension')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance C — Pec + Ischio/Jambes + Dos
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s5c, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Chest Press Machine',                    1, 3, '8-12', 120, 'SS1 avec Flat DB flyes 30°'),
    ('Flyes incliné 30° aux haltères',          2, 3, '8-12', 120, 'SS1 avec Chest Press Machine'),
    ('Romanian Deadlift sur 1 jambe',           3, 3, '8-12', 120, 'SS2 avec Leg curl assis'),
    ('Leg curl assis',                          4, 3, '8-12', 120, 'SS2 avec RDL 1 jambe'),
    ('Seated Row NEUTRE',                       5, 3, '8-12', 120, 'SS3 avec Chest supported flyes inversés'),
    ('Chest supported 30° Flyes inversés',      6, 3, '8-12', 120, 'SS3 avec Seated Row')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;


  -- ══════════════════════════════════════════════════════════
  -- PHASE 6 — German Volume Training | 4 semaines
  -- Stress métabolique / Density Training
  -- 6×10 | R1min
  -- ══════════════════════════════════════════════════════════
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  VALUES (v_coach,
    'MEN WORK - Phase 6',
    'German Volume Training | Stress métabolique / Density Training | 6×10 | R1min',
    4, 'men')
  RETURNING id INTO t6;

  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t6, 'Séance A', 1) RETURNING id INTO s6a;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t6, 'Séance B', 2) RETURNING id INTO s6b;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t6, 'Séance C', 3) RETURNING id INTO s6c;

  -- Séance A — Corps entier (German Volume)
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s6a, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé couché à la barre', 1, 6, '10', 60, 'GVT 6×10 | R1min'),
    ('Hack Squat Machine',          2, 6, '10', 60, 'GVT 6×10 | R1min'),
    ('Lat Pulldown NEUTRE',         3, 6, '10', 60, 'GVT 6×10 | Pegboard / Lat Pulldown'),
    ('Leg curl assis',              4, 6, '10', 60, 'GVT 6×10 | R1min'),
    ('DBs Upright Row',             5, 3, '12', 90, 'Accessoire'),
    ('45° Back Extension',          6, 3, '12', 90, 'Accessoire | GHD Back extension')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance B — Dos/Jambes + Pec/Triceps + Biceps
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s6b, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Seated Row NEUTRE',            1, 6, '10', 60, 'GVT 6×10 | R1min'),
    ('Romanian Deadlift',            2, 6, '10', 60, 'GVT 6×10 | haltères'),
    ('Crossover câble haut',         3, 6, '10', 60, 'GVT 6×10 | Câble crossover'),
    ('Triceps extension à la corde', 4, 3, '12', 90, 'Accessoire | X triceps extension'),
    ('Low câble curl avec barre courte', 5, 3, '12', 90, 'Accessoire | Low câble curl supination')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance C — Pec/Machine + Jambes + Épaules + Biceps + Abdos
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s6c, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Chest Press Machine',                    1, 6, '10', 60, 'GVT 6×10 | R1min'),
    ('Fente arrière',                           2, 6, '10', 60, 'GVT 6×10 | Lunges'),
    ('Flyes inversés (prise neutre)',           3, 3, '12', 90, 'Accessoire | Reverse flyes'),
    ('Lateral Deltoid Machine',                4, 3, '12', 90, 'Accessoire'),
    ('Curl Incliné 30° aux haltères (offset)', 5, 3, '12', 90, 'Accessoire | Inclined curl 45°'),
    ('V up',                                   6, 3, '15', 60, 'Abdos finisher')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;


  -- ══════════════════════════════════════════════════════════
  -- PHASE 7 — Superpump Version Courte | 6 semaines
  -- Stress mécanique / Density Training
  -- 3 séries × 10-12 reps | R90s
  -- ══════════════════════════════════════════════════════════
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  VALUES (v_coach,
    'MEN WORK - Phase 7',
    'Superpump Version Courte | Stress mécanique / Density Training | 3×10-12 | R90s',
    6, 'men')
  RETURNING id INTO t7;

  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t7, 'Séance A', 1) RETURNING id INTO s7a;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t7, 'Séance B', 2) RETURNING id INTO s7b;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t7, 'Séance C', 3) RETURNING id INTO s7c;

  -- Séance A — Push + Jambes + Bras (version courte Phase 3/4)
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s7a, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé couché à la barre',         1, 3, '10-12', 90, 'Superpump version courte'),
    ('Hack Squat Machine',                  2, 3, '10-12', 90, NULL),
    ('Seated Row NEUTRE',                   3, 3, '10-12', 90, NULL),
    ('Leg curl assis',                      4, 3, '10-12', 90, NULL),
    ('French Press à la corde',             5, 3, '10-12', 90, 'Câble french press'),
    ('Standing Curl aux haltères (offset)', 6, 3, '10-12', 90, 'Biceps curl OFFSET')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance B — Pull + Ischio + Épaules + Pec + Abdos
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s7b, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Traction Supination',                   1, 3, '6-10',  90, 'Pull ups variante'),
    ('Romanian Deadlift',                     2, 3, '10-12', 90, NULL),
    ('Elevations latérales aux haltères',     3, 3, '10-12', 90, NULL),
    ('Triceps Extension couché aux haltères', 4, 3, '10-12', 90, 'Flat db extension'),
    ('Flyes inversés (prise neutre)',          5, 3, '10-12', 90, 'Reverse flyes'),
    ('Garhammer raises',                      6, 3, '10-15', 60, 'Abdos finisher')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance C — OHP + Jambes + Dos + Pec + Biceps + Abdos
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s7c, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé militaire à la barre', 1, 3, '10-12', 90, 'Strict press'),
    ('Bulgarian Split squat',          2, 3, '10-12', 90, NULL),
    ('Tirage bûcheron (lats focus)',   3, 3, '10-12', 90, NULL),
    ('Flyes aux haltères',             4, 3, '10-12', 90, 'Flat DB flyes'),
    ('EZ Bar Scott Curl',              5, 3, '10-12', 90, NULL),
    ('Abdos à la roulette',            6, 3, '10-15', 60, 'Abdos finisher')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;


  -- ══════════════════════════════════════════════════════════
  -- PHASE 8 — 5×5 RM | 4 semaines
  -- Stress mécanique / Force maximale
  -- Protocole intensification : S1→3×3@85%, S2→3×2@90%,
  --   S3→3×1@95%, S4→1RM | Accessoires en superset 3×8-12
  -- ══════════════════════════════════════════════════════════
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  VALUES (v_coach,
    'MEN WORK - Phase 8',
    '5×5 RM | Stress mécanique / Force max | S1:3×3@85% → S4:1RM | Accessoires en superset 3×8-12',
    4, 'men')
  RETURNING id INTO t8;

  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t8, 'Séance A', 1) RETURNING id INTO s8a;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t8, 'Séance B', 2) RETURNING id INTO s8b;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t8, 'Séance C', 3) RETURNING id INTO s8c;

  -- Séance A — Bench + Squat (5x5) + Accessoires en superset
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s8a, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé couché à la barre',         1, 5, '5', 180, 'FORCE | S1:3×3@85% S2:3×2@90% S3:3×1@95% S4:1RM'),
    ('Hack Squat Machine',                  2, 5, '5', 180, 'FORCE | S1:3×3@85% S2:3×2@90% S3:3×1@95% S4:1RM'),
    ('Seated Row NEUTRE',                   3, 3, '8-12', 90, 'SS avec Leg curl assis'),
    ('Leg curl assis',                      4, 3, '8-12', 90, 'SS avec Seated Row'),
    ('French Press à la corde',             5, 3, '8-12', 90, 'SS avec Curl offset'),
    ('Standing Curl aux haltères (offset)', 6, 3, '8-12', 90, 'SS avec French Press')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance B — Pull ups + RDL (5x5) + Accessoires en superset
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s8b, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Traction Supination',                   1, 5, '5',    180, 'FORCE | S1:3×3@85% S2:3×2@90% S3:3×1@95% S4:1RM'),
    ('Romanian Deadlift',                     2, 5, '5',    180, 'FORCE | S1:3×3@85% S2:3×2@90% S3:3×1@95% S4:1RM'),
    ('Elevations latérales aux haltères',     3, 3, '8-12',  90, 'SS avec Reverse flyes'),
    ('Flyes inversés (prise neutre)',          4, 3, '8-12',  90, 'SS avec Élévations latérales'),
    ('Triceps Extension couché aux haltères', 5, 3, '8-12',  90, 'SS avec Strict Hanging Knee to elbow'),
    ('Strict Hanging Knee to elbow',          6, 3, '10-15', 90, 'SS avec Flat db extension')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance C — OHP + Bulgarian SS (5x5) + Accessoires en superset
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s8c, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé militaire à la barre',  1, 5, '5',    180, 'FORCE | S1:3×3@85% S2:3×2@90% S3:3×1@95% S4:1RM'),
    ('Bulgarian Split squat',           2, 5, '5',    180, 'FORCE | S1:3×3@85% S2:3×2@90% S3:3×1@95% S4:1RM'),
    ('Tirage bûcheron (lats focus)',    3, 3, '8-12',  90, 'SS avec Flat DB flyes'),
    ('Flyes aux haltères',              4, 3, '8-12',  90, 'SS avec Tirage bûcheron'),
    ('EZ Bar Scott Curl',               5, 3, '8-12',  90, 'SS avec Abdos roulette'),
    ('Abdos à la roulette',             6, 3, '10-15', 90, 'SS avec EZ Bar Scott Curl')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;


  -- ══════════════════════════════════════════════════════════
  -- PHASE 9 — Superset Synergiste | 6 semaines
  -- Stress mécanique / Dommages musculaires
  -- 3-4 supersets × 8-12 reps | R2min
  -- ══════════════════════════════════════════════════════════
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  VALUES (v_coach,
    'MEN WORK - Phase 9',
    'Superset Synergiste | Stress mécanique / Dommages musculaires | 3-4 supersets × 8-12 reps | R2min',
    6, 'men')
  RETURNING id INTO t9;

  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t9, 'Séance A', 1) RETURNING id INTO s9a;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t9, 'Séance B', 2) RETURNING id INTO s9b;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t9, 'Séance C', 3) RETURNING id INTO s9c;

  -- Séance A — Pec/Triceps synergiste + Jambes + Dos/Épaules + Abdos
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s9a, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé couché prise serrée',          1, 3, '8-12', 120, 'SS1 avec Curl neutre (synergiste)'),
    ('Standing Curl aux haltères (neutre)',     2, 3, '8-12', 120, 'SS1 avec Dév couché prise serrée'),
    ('Hack Squat Machine',                      3, 3, '8-12', 120, 'SS2 avec Leg curl allongé'),
    ('Leg curl allongé',                        4, 3, '8-12', 120, 'SS2 avec Hack Squat'),
    ('Tirage buste penché à la barre (supination)', 5, 3, '8-12', 120, 'SS3 avec DBs Upright Row'),
    ('DBs Upright Row',                         6, 3, '8-12', 120, 'SS3 avec Tirage buste penché'),
    ('V up croisée',                            7, 3, '8-12',  90, 'Finisher | SS avec Dragon flag'),
    ('DRagon flag',                             8, 3, '8-12',  90, 'Finisher | SS avec V up croisée')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance B — Grand dorsal + Dos + Triceps/Traction + Abdos
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s9b, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Pull Over à l''haltère',          1, 3, '8-12', 120, 'SS1 avec Cobra Press'),
    ('Cobra Press',                      2, 3, '8-12', 120, 'SS1 avec Pull Over haltère'),
    ('Straight Arm Pulldown',            3, 3, '8-12', 120, 'SS2 avec Reverse Pec Deck'),
    ('Reverse Pec Deck Machine',         4, 3, '8-12', 120, 'SS2 avec Straight Arm Pulldown'),
    ('Traction Supination',              5, 3, '8-12', 120, 'SS3 avec In line Triceps extension'),
    ('In line Triceps extension 1 bras', 6, 3, '8-12', 120, 'SS3 avec Traction supination'),
    ('45° Back Extension',               7, 3, '8-12',  90, 'Finisher | SS avec DB Side Bend'),
    ('DB Side Bend',                     8, 3, '8-12',  90, 'Finisher | SS avec Back Extension')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance C — Pec + Ischio + Dos/Pec
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s9c, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Chest Press Machine',                 1, 3, '8-12', 120, 'SS1 avec Reverse flyes 30°'),
    ('Flyes inversés (prise neutre)',        2, 3, '8-12', 120, 'SS1 avec Chest Press Machine'),
    ('Romanian Deadlift sur 1 jambe',       3, 3, '8-12', 120, 'SS2 avec Fentes'),
    ('Fente arrière',                        4, 3, '8-12', 120, 'SS2 avec RDL 1 jambe'),
    ('Flyes aux haltères',                  5, 3, '8-12', 120, 'SS3 avec Seated Row'),
    ('Seated Row NEUTRE',                   6, 3, '8-12', 120, 'SS3 avec Flat DB flyes')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;


  -- ══════════════════════════════════════════════════════════
  -- PHASE 10 — Série Organique Géante | 4 semaines
  -- Stress métabolique / Dommages musculaires
  -- 4 séries × 10-15 reps | R90s
  -- ══════════════════════════════════════════════════════════
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  VALUES (v_coach,
    'MEN WORK - Phase 10',
    'Série Organique Géante | Stress métabolique / Dommages musculaires | 4×10-15 | R90s',
    4, 'men')
  RETURNING id INTO t10;

  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t10, 'Séance A', 1) RETURNING id INTO s10a;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t10, 'Séance B', 2) RETURNING id INTO s10b;
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  VALUES (t10, 'Séance C', 3) RETURNING id INTO s10c;

  -- Séance A — Push + Jambes + Bras (Série Organique)
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s10a, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé couché à la barre',         1, 4, '10-15', 90, 'Série organique géante'),
    ('Hack Squat Machine',                  2, 4, '10-15', 90, 'Série organique géante'),
    ('Seated Row NEUTRE',                   3, 4, '10-15', 90, NULL),
    ('Leg curl assis',                      4, 4, '10-15', 90, NULL),
    ('French Press à la corde',             5, 4, '10-15', 90, 'Câble french press'),
    ('Standing Curl aux haltères (offset)', 6, 4, '10-15', 90, 'Biceps curl OFFSET')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance B — Pull + Ischio + Épaules + Pec + Abdos
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s10b, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Traction Supination',                   1, 4, '6-10',  90, 'Pull ups variante'),
    ('Romanian Deadlift',                     2, 4, '10-15', 90, NULL),
    ('Elevations latérales aux haltères',     3, 4, '10-15', 90, NULL),
    ('Triceps Extension couché aux haltères', 4, 4, '10-15', 90, 'Flat db extension'),
    ('Flyes inversés (prise neutre)',          5, 4, '10-15', 90, 'Reverse flyes'),
    ('Hollow leg raises',                     6, 4, '15',    60, 'Abdos finisher')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  -- Séance C — OHP + Jambes + Dos + Pec + Biceps + Abdos
  INSERT INTO prog_template_exercices
    (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT s10c, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM (VALUES
    ('Développé militaire à la barre', 1, 4, '10-15', 90, 'Strict press | Série organique'),
    ('Bulgarian Split squat',          2, 4, '10-15', 90, NULL),
    ('Tirage bûcheron (lats focus)',   3, 4, '10-15', 90, NULL),
    ('Flyes aux haltères',             4, 4, '10-15', 90, 'Flat DB flyes'),
    ('EZ Bar Scott Curl',              5, 4, '10-15', 90, NULL),
    ('Abdos à la roulette',            6, 4, '10-15', 60, 'Abdos finisher')
  ) AS t(nom, ord, ser, reps, repos, note)
  JOIN exercices_bdd eb ON eb.nom = t.nom;

  RAISE NOTICE 'Templates Phase 2 à 10 créés avec succès pour coach %', v_coach;

END $$;


-- ─────────────────────────────────────────────────────────────
-- VÉRIFICATION — Voir les templates créés
-- ─────────────────────────────────────────────────────────────
/*
SELECT
  pt.nom,
  pt.description,
  pt.nb_semaines,
  pt.tag,
  COUNT(DISTINCT pts.id) AS nb_seances,
  COUNT(pte.id) AS nb_exercices_total
FROM prog_templates pt
JOIN prog_template_seances pts ON pts.template_id = pt.id
JOIN prog_template_exercices pte ON pte.seance_id = pts.id
WHERE pt.nom LIKE 'MEN WORK%'
GROUP BY pt.id, pt.nom, pt.description, pt.nb_semaines, pt.tag
ORDER BY pt.nom;
*/
