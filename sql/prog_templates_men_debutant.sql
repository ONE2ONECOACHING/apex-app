-- ============================================================
-- APEX — MEN WORK DÉBUTANT — Templates Phase 2 à 10
-- Source : MEN WORK' DEBUTANT (1).xlsx
-- A exécuter dans Supabase > SQL Editor
-- ============================================================
-- Structure : CTEs enchaînées (INSERT … RETURNING) — pas de DO $$
-- Chaque phase = 1 statement avec ses séances + exercices
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. Migration : colonne tag
-- ─────────────────────────────────────────────────────────────
ALTER TABLE prog_templates ADD COLUMN IF NOT EXISTS tag TEXT;


-- ─────────────────────────────────────────────────────────────
-- 2. Exercices manquants dans exercices_bdd
-- ─────────────────────────────────────────────────────────────
INSERT INTO exercices_bdd (nom, muscle_principal, equipement, type_effort)
VALUES
  ('Développé couché à la barre',   'pectoraux', 'barre',  'reps'),
  ('Développé couché prise serrée', 'pectoraux', 'barre',  'reps'),
  ('Abdos à la roulette',           'abdos',     'autres', 'reps')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 2 — Superset Antagoniste | 6 semaines
-- Stress mécanique / Dommages musculaires
-- 3-4 supersets × 12-15 reps | R2min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (
  SELECT id FROM profiles WHERE role = 'coach' ORDER BY created_at LIMIT 1
),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'MEN WORK - Phase 2',
    'Superset Antagoniste | Stress mécanique / Dommages musculaires | 3-4 supersets × 12-15 reps | R2min',
    6, 'men'
  FROM _coach
  RETURNING id
),
_sa AS (
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  SELECT id, 'Séance A', 1 FROM _tpl RETURNING id
),
_sb AS (
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  SELECT id, 'Séance B', 2 FROM _tpl RETURNING id
),
_sc AS (
  INSERT INTO prog_template_seances (template_id, nom, ordre)
  SELECT id, 'Séance C', 3 FROM _tpl RETURNING id
),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché aux haltères',         1,3,'12-15',120,'SS1 avec Seated Row NEUTRE'),
    ('Seated Row NEUTRE',                      2,3,'12-15',120,'SS1 avec Développé couché'),
    ('Hack Squat Machine',                     3,3,'12-15',120,'SS2 avec Leg curl assis'),
    ('Leg curl assis',                         4,3,'12-15',120,'SS2 avec Hack Squat Machine'),
    ('Standing Curl aux haltères (offset)',    5,3,'12-15',120,'SS3 avec French Press corde'),
    ('French Press à la corde',                6,3,'12-15',120,'SS3 avec Curl offset'),
    ('V up croisée',                           7,3,'12-15', 90,'Finisher | SS avec Back Extension'),
    ('45° Back Extension',                     8,3,'12-15', 90,'Finisher | SS avec V up croisée')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Développé militaire aux haltères (prise neutre)', 1,3,'12-15',120,'SS1 avec Lat Pulldown pronation'),
    ('Lat Pulldown PRONATION',                          2,3,'12-15',120,'SS1 avec Dév militaire'),
    ('Peck deck machine',                               3,3,'12-15',120,'SS2 avec Élévations lat incliné 60°'),
    ('Elevations latérales incliné 60° aux haltères',  4,3,'12-15',120,'SS2 avec Peck deck'),
    ('Low câble curl avec barre courte',                5,3,'12-15',120,'SS3 avec Triceps corde'),
    ('Triceps extension à la corde',                    6,3,'12-15',120,'SS3 avec Low câble curl'),
    ('DRagon flag',                                     7,3,'12-15', 90,'Finisher | SS avec DB Side Bend'),
    ('DB Side Bend',                                    8,3,'12-15', 90,'Finisher | SS avec Dragon flag')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Crossover câble milieu (neutre)',   1,3,'12-15',120,'SS1 avec Tirage bûcheron'),
    ('Tirage bûcheron (lats focus)',      2,3,'12-15',120,'SS1 avec Crossover câble milieu'),
    ('Romanian Deadlift',                 3,3,'12-15',120,'SS2 avec Leg Extension'),
    ('Leg Extension',                     4,3,'12-15',120,'SS2 avec Romanian Deadlift'),
    ('Elévations frontales aux haltères', 5,3,'12-15',120,'SS3 avec Câble face pull'),
    ('Câble face pull',                   6,3,'12-15',120,'SS3 avec Élévations frontales')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 2 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 3 — Top Set Back Off | 6 semaines
-- Stress mécanique / Intensification
-- Montée à 12RM, puis 3×12 à −10% | R2min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,'MEN WORK - Phase 3',
    'Top Set Back Off | Stress mécanique / Intensification | Montée à 12RM puis 3×12 −10% | R2min',
    6,'men' FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sa.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché à la barre',         1,4,'10-12',120,'Top Set → 12RM, puis 3×12 −10%'),
    ('Hack Squat Machine',                   2,4,'10-12',120,'Top Set → 12RM, puis 3×12 −10%'),
    ('Seated Row NEUTRE',                    3,3,'12',   120,NULL),
    ('Leg curl assis',                       4,3,'12',   120,NULL),
    ('French Press à la corde',              5,3,'12',   120,'Câble french press'),
    ('Standing Curl aux haltères (offset)',  6,3,'12',   120,'Biceps curl OFFSET')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sb.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sb CROSS JOIN (VALUES
    ('Traction Supination',                   1,4,'6-10', 120,'Pull ups variante | Top Set'),
    ('Romanian Deadlift',                     2,4,'10-12',120,'Top Set → 12RM, puis 3×12 −10%'),
    ('Elevations latérales aux haltères',     3,3,'12',   120,NULL),
    ('Triceps Extension couché aux haltères', 4,3,'12',   120,'Flat db extension'),
    ('Flyes inversés (prise neutre)',          5,3,'12',   120,'Reverse flyes'),
    ('Hollow leg raises',                     6,3,'15',    90,'Abdos finisher')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sc.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sc CROSS JOIN (VALUES
    ('Développé militaire à la barre', 1,4,'10-12',120,'Strict press | Top Set → 12RM'),
    ('Bulgarian Split squat',          2,4,'10-12',120,'Top Set → 12RM, puis 3×12 −10%'),
    ('Tirage bûcheron (lats focus)',   3,3,'12',   120,NULL),
    ('Flyes aux haltères',             4,3,'12',   120,'Flat DB flyes'),
    ('EZ Bar Scott Curl',              5,3,'12',   120,NULL),
    ('Abdos à la roulette',            6,3,'10-15', 90,'Abdos finisher')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
)
SELECT 'Phase 3 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 4 — Superpump Régressif | 6 semaines
-- Stress mécanique / Density Training | R2min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates(coach_id,nom,description,nb_semaines,tag)
  SELECT id,'MEN WORK - Phase 4',
    'Superpump Régressif | Stress mécanique / Density Training | 4 séries descendantes | R2min',
    6,'men' FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sa.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché à la barre',         1,4,'10-12',120,'Superpump régressif : −10% chaque série'),
    ('Hack Squat Machine',                   2,4,'10-12',120,'Superpump régressif : −10% chaque série'),
    ('Seated Row NEUTRE',                    3,3,'12',   120,NULL),
    ('Leg curl assis',                       4,3,'12',   120,NULL),
    ('French Press à la corde',              5,3,'12',   120,'Câble french press'),
    ('Standing Curl aux haltères (offset)',  6,3,'12',   120,'Biceps curl OFFSET')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sb.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sb CROSS JOIN (VALUES
    ('Traction Supination',                   1,4,'6-10', 120,'Pull ups variante | Superpump régressif'),
    ('Romanian Deadlift',                     2,4,'10-12',120,'Superpump régressif : −10% chaque série'),
    ('Elevations latérales aux haltères',     3,3,'12',   120,NULL),
    ('Triceps Extension couché aux haltères', 4,3,'12',   120,'Flat db extension'),
    ('Flyes inversés (prise neutre)',          5,3,'12',   120,'Reverse flyes'),
    ('Garhammer raises',                      6,3,'10-15', 90,'Abdos finisher')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sc.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sc CROSS JOIN (VALUES
    ('Développé militaire à la barre', 1,4,'10-12',120,'Strict press | Superpump régressif'),
    ('Bulgarian Split squat',          2,4,'10-12',120,'Superpump régressif : −10% chaque série'),
    ('Tirage bûcheron (lats focus)',   3,3,'12',   120,NULL),
    ('Flyes aux haltères',             4,3,'12',   120,'Flat DB flyes'),
    ('EZ Bar Scott Curl',              5,3,'12',   120,NULL),
    ('Abdos à la roulette',            6,3,'10-15', 90,'Abdos finisher')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
)
SELECT 'Phase 4 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 5 — Superset Agoniste | 6 semaines
-- Stress mécanique / Dommages musculaires
-- 3-4 supersets × 8-12 reps | R2min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates(coach_id,nom,description,nb_semaines,tag)
  SELECT id,'MEN WORK - Phase 5',
    'Superset Agoniste | Stress mécanique / Dommages musculaires | 3-4 supersets × 8-12 reps | R2min',
    6,'men' FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sa.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché prise serrée',             1,3,'8-12',120,'SS1 avec Triceps kick back'),
    ('Triceps kick back à la poulie',              2,3,'8-12',120,'SS1 avec Développé prise serrée'),
    ('Hack Squat Machine',                         3,3,'8-12',120,'SS2 avec Fente arrière'),
    ('Fente arrière',                              4,3,'8-12',120,'SS2 avec Hack Squat'),
    ('Tirage buste penché à la barre (pronation)', 5,3,'8-12',120,'SS3 avec Reverse Pec Deck'),
    ('Reverse Pec Deck Machine',                   6,3,'8-12',120,'SS3 avec Tirage buste penché'),
    ('V up croisée',                               7,3,'8-12', 90,'Finisher | SS avec Dragon flag'),
    ('DRagon flag',                                8,3,'8-12', 90,'Finisher | SS avec V up croisée')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sb.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sb CROSS JOIN (VALUES
    ('EZ Bar Upright row',                 1,3,'8-12',120,'SS1 avec Cobra Press'),
    ('Cobra Press',                         2,3,'8-12',120,'SS1 avec EZ Bar Upright row'),
    ('Straight Arm Pulldown',               3,3,'8-12',120,'SS2 avec Pull Over haltère'),
    ('Pull Over à l''haltère',              4,3,'8-12',120,'SS2 avec Straight Arm Pulldown'),
    ('Traction Supination',                 5,3,'8-12',120,'SS3 avec Curl neutre'),
    ('Standing Curl aux haltères (neutre)', 6,3,'8-12',120,'SS3 avec Traction supination'),
    ('45° Back Extension',                  7,3,'8-12', 90,'Finisher | SS avec DB Side Bend'),
    ('DB Side Bend',                        8,3,'8-12', 90,'Finisher | SS avec Back Extension')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sc.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sc CROSS JOIN (VALUES
    ('Chest Press Machine',                  1,3,'8-12',120,'SS1 avec Flat DB flyes 30°'),
    ('Flyes incliné 30° aux haltères',       2,3,'8-12',120,'SS1 avec Chest Press Machine'),
    ('Romanian Deadlift sur 1 jambe',        3,3,'8-12',120,'SS2 avec Leg curl assis'),
    ('Leg curl assis',                       4,3,'8-12',120,'SS2 avec RDL 1 jambe'),
    ('Seated Row NEUTRE',                    5,3,'8-12',120,'SS3 avec Chest supported flyes inversés'),
    ('Chest supported 30° Flyes inversés',   6,3,'8-12',120,'SS3 avec Seated Row')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
)
SELECT 'Phase 5 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 6 — German Volume Training | 4 semaines
-- Stress métabolique / Density Training | 6×10 | R1min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates(coach_id,nom,description,nb_semaines,tag)
  SELECT id,'MEN WORK - Phase 6',
    'German Volume Training | Stress métabolique / Density Training | 6×10 | R1min',
    4,'men' FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sa.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché à la barre', 1,6,'10',60,'GVT 6×10 | R1min'),
    ('Hack Squat Machine',          2,6,'10',60,'GVT 6×10 | R1min'),
    ('Lat Pulldown NEUTRE',         3,6,'10',60,'GVT 6×10 | Pegboard / Lat Pulldown'),
    ('Leg curl assis',              4,6,'10',60,'GVT 6×10 | R1min'),
    ('DBs Upright Row',             5,3,'12',90,'Accessoire'),
    ('45° Back Extension',          6,3,'12',90,'Accessoire | GHD Back extension')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sb.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sb CROSS JOIN (VALUES
    ('Seated Row NEUTRE',            1,6,'10',60,'GVT 6×10 | R1min'),
    ('Romanian Deadlift',            2,6,'10',60,'GVT 6×10 | haltères'),
    ('Crossover câble haut',         3,6,'10',60,'GVT 6×10 | Câble crossover'),
    ('Triceps extension à la corde', 4,3,'12',90,'Accessoire | X triceps extension'),
    ('Low câble curl avec barre courte', 5,3,'12',90,'Accessoire | Low câble curl supination')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sc.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sc CROSS JOIN (VALUES
    ('Chest Press Machine',                    1,6,'10',60,'GVT 6×10 | R1min'),
    ('Fente arrière',                           2,6,'10',60,'GVT 6×10 | Lunges'),
    ('Flyes inversés (prise neutre)',           3,3,'12',90,'Accessoire | Reverse flyes'),
    ('Lateral Deltoid Machine',                4,3,'12',90,'Accessoire'),
    ('Curl Incliné 30° aux haltères (offset)', 5,3,'12',90,'Accessoire | Inclined curl 45°'),
    ('V up',                                   6,3,'15',60,'Abdos finisher')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
)
SELECT 'Phase 6 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 7 — Superpump Version Courte | 6 semaines
-- Stress mécanique / Density Training | 3×10-12 | R90s
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates(coach_id,nom,description,nb_semaines,tag)
  SELECT id,'MEN WORK - Phase 7',
    'Superpump Version Courte | Stress mécanique / Density Training | 3×10-12 | R90s',
    6,'men' FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sa.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché à la barre',         1,3,'10-12',90,'Superpump version courte'),
    ('Hack Squat Machine',                   2,3,'10-12',90,NULL),
    ('Seated Row NEUTRE',                    3,3,'10-12',90,NULL),
    ('Leg curl assis',                       4,3,'10-12',90,NULL),
    ('French Press à la corde',              5,3,'10-12',90,'Câble french press'),
    ('Standing Curl aux haltères (offset)',  6,3,'10-12',90,'Biceps curl OFFSET')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sb.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sb CROSS JOIN (VALUES
    ('Traction Supination',                   1,3,'6-10', 90,'Pull ups variante'),
    ('Romanian Deadlift',                     2,3,'10-12',90,NULL),
    ('Elevations latérales aux haltères',     3,3,'10-12',90,NULL),
    ('Triceps Extension couché aux haltères', 4,3,'10-12',90,'Flat db extension'),
    ('Flyes inversés (prise neutre)',          5,3,'10-12',90,'Reverse flyes'),
    ('Garhammer raises',                      6,3,'10-15',60,'Abdos finisher')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sc.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sc CROSS JOIN (VALUES
    ('Développé militaire à la barre', 1,3,'10-12',90,'Strict press'),
    ('Bulgarian Split squat',          2,3,'10-12',90,NULL),
    ('Tirage bûcheron (lats focus)',   3,3,'10-12',90,NULL),
    ('Flyes aux haltères',             4,3,'10-12',90,'Flat DB flyes'),
    ('EZ Bar Scott Curl',              5,3,'10-12',90,NULL),
    ('Abdos à la roulette',            6,3,'10-15',60,'Abdos finisher')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
)
SELECT 'Phase 7 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 8 — 5×5 RM Force Max | 4 semaines
-- S1:3×3@85% → S2:3×2@90% → S3:3×1@95% → S4:1RM
-- Accessoires en superset 3×8-12
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates(coach_id,nom,description,nb_semaines,tag)
  SELECT id,'MEN WORK - Phase 8',
    '5×5 RM | Stress mécanique / Force max | S1:3×3@85% → S4:1RM | Accessoires en superset 3×8-12',
    4,'men' FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sa.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché à la barre',         1,5,'5',  180,'FORCE | S1:3×3@85% S2:3×2@90% S3:3×1@95% S4:1RM'),
    ('Hack Squat Machine',                   2,5,'5',  180,'FORCE | S1:3×3@85% S2:3×2@90% S3:3×1@95% S4:1RM'),
    ('Seated Row NEUTRE',                    3,3,'8-12', 90,'SS avec Leg curl assis'),
    ('Leg curl assis',                       4,3,'8-12', 90,'SS avec Seated Row'),
    ('French Press à la corde',              5,3,'8-12', 90,'SS avec Curl offset'),
    ('Standing Curl aux haltères (offset)',  6,3,'8-12', 90,'SS avec French Press')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sb.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sb CROSS JOIN (VALUES
    ('Traction Supination',                   1,5,'5',   180,'FORCE | S1:3×3@85% S2:3×2@90% S3:3×1@95% S4:1RM'),
    ('Romanian Deadlift',                     2,5,'5',   180,'FORCE | S1:3×3@85% S2:3×2@90% S3:3×1@95% S4:1RM'),
    ('Elevations latérales aux haltères',     3,3,'8-12', 90,'SS avec Reverse flyes'),
    ('Flyes inversés (prise neutre)',          4,3,'8-12', 90,'SS avec Élévations latérales'),
    ('Triceps Extension couché aux haltères', 5,3,'8-12', 90,'SS avec Strict Hanging Knee to elbow'),
    ('Strict Hanging Knee to elbow',          6,3,'10-15',90,'SS avec Flat db extension')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sc.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sc CROSS JOIN (VALUES
    ('Développé militaire à la barre', 1,5,'5',   180,'FORCE | S1:3×3@85% S2:3×2@90% S3:3×1@95% S4:1RM'),
    ('Bulgarian Split squat',          2,5,'5',   180,'FORCE | S1:3×3@85% S2:3×2@90% S3:3×1@95% S4:1RM'),
    ('Tirage bûcheron (lats focus)',   3,3,'8-12', 90,'SS avec Flat DB flyes'),
    ('Flyes aux haltères',             4,3,'8-12', 90,'SS avec Tirage bûcheron'),
    ('EZ Bar Scott Curl',              5,3,'8-12', 90,'SS avec Abdos roulette'),
    ('Abdos à la roulette',            6,3,'10-15',90,'SS avec EZ Bar Scott Curl')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
)
SELECT 'Phase 8 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 9 — Superset Synergiste | 6 semaines
-- Stress mécanique / Dommages musculaires
-- 3-4 supersets × 8-12 reps | R2min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates(coach_id,nom,description,nb_semaines,tag)
  SELECT id,'MEN WORK - Phase 9',
    'Superset Synergiste | Stress mécanique / Dommages musculaires | 3-4 supersets × 8-12 reps | R2min',
    6,'men' FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sa.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché prise serrée',             1,3,'8-12',120,'SS1 avec Curl neutre (synergiste)'),
    ('Standing Curl aux haltères (neutre)',         2,3,'8-12',120,'SS1 avec Dév couché prise serrée'),
    ('Hack Squat Machine',                          3,3,'8-12',120,'SS2 avec Leg curl allongé'),
    ('Leg curl allongé',                            4,3,'8-12',120,'SS2 avec Hack Squat'),
    ('Tirage buste penché à la barre (supination)', 5,3,'8-12',120,'SS3 avec DBs Upright Row'),
    ('DBs Upright Row',                             6,3,'8-12',120,'SS3 avec Tirage buste penché'),
    ('V up croisée',                                7,3,'8-12', 90,'Finisher | SS avec Dragon flag'),
    ('DRagon flag',                                 8,3,'8-12', 90,'Finisher | SS avec V up croisée')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sb.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sb CROSS JOIN (VALUES
    ('Pull Over à l''haltère',          1,3,'8-12',120,'SS1 avec Cobra Press'),
    ('Cobra Press',                      2,3,'8-12',120,'SS1 avec Pull Over haltère'),
    ('Straight Arm Pulldown',            3,3,'8-12',120,'SS2 avec Reverse Pec Deck'),
    ('Reverse Pec Deck Machine',         4,3,'8-12',120,'SS2 avec Straight Arm Pulldown'),
    ('Traction Supination',              5,3,'8-12',120,'SS3 avec In line Triceps extension'),
    ('In line Triceps extension 1 bras', 6,3,'8-12',120,'SS3 avec Traction supination'),
    ('45° Back Extension',               7,3,'8-12', 90,'Finisher | SS avec DB Side Bend'),
    ('DB Side Bend',                     8,3,'8-12', 90,'Finisher | SS avec Back Extension')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sc.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sc CROSS JOIN (VALUES
    ('Chest Press Machine',                  1,3,'8-12',120,'SS1 avec Reverse flyes 30°'),
    ('Flyes inversés (prise neutre)',         2,3,'8-12',120,'SS1 avec Chest Press Machine'),
    ('Romanian Deadlift sur 1 jambe',        3,3,'8-12',120,'SS2 avec Fentes'),
    ('Fente arrière',                         4,3,'8-12',120,'SS2 avec RDL 1 jambe'),
    ('Flyes aux haltères',                   5,3,'8-12',120,'SS3 avec Seated Row'),
    ('Seated Row NEUTRE',                    6,3,'8-12',120,'SS3 avec Flat DB flyes')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
)
SELECT 'Phase 9 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 10 — Série Organique Géante | 4 semaines
-- Stress métabolique / Dommages musculaires
-- 4×10-15 | R90s
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates(coach_id,nom,description,nb_semaines,tag)
  SELECT id,'MEN WORK - Phase 10',
    'Série Organique Géante | Stress métabolique / Dommages musculaires | 4×10-15 | R90s',
    4,'men' FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sa.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché à la barre',         1,4,'10-15',90,'Série organique géante'),
    ('Hack Squat Machine',                   2,4,'10-15',90,'Série organique géante'),
    ('Seated Row NEUTRE',                    3,4,'10-15',90,NULL),
    ('Leg curl assis',                       4,4,'10-15',90,NULL),
    ('French Press à la corde',              5,4,'10-15',90,'Câble french press'),
    ('Standing Curl aux haltères (offset)',  6,4,'10-15',90,'Biceps curl OFFSET')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sb.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sb CROSS JOIN (VALUES
    ('Traction Supination',                   1,4,'6-10', 90,'Pull ups variante'),
    ('Romanian Deadlift',                     2,4,'10-15',90,NULL),
    ('Elevations latérales aux haltères',     3,4,'10-15',90,NULL),
    ('Triceps Extension couché aux haltères', 4,4,'10-15',90,'Flat db extension'),
    ('Flyes inversés (prise neutre)',          5,4,'10-15',90,'Reverse flyes'),
    ('Hollow leg raises',                     6,4,'15',   60,'Abdos finisher')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices(seance_id,exercice_id,ordre,series,reps_cible,repos_secondes,notes)
  SELECT _sc.id,eb.id,t.ord,t.ser,t.reps,t.repos,t.note
  FROM _sc CROSS JOIN (VALUES
    ('Développé militaire à la barre', 1,4,'10-15',90,'Strict press | Série organique'),
    ('Bulgarian Split squat',          2,4,'10-15',90,NULL),
    ('Tirage bûcheron (lats focus)',   3,4,'10-15',90,NULL),
    ('Flyes aux haltères',             4,4,'10-15',90,'Flat DB flyes'),
    ('EZ Bar Scott Curl',              5,4,'10-15',90,NULL),
    ('Abdos à la roulette',            6,4,'10-15',60,'Abdos finisher')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom=t.nom
)
SELECT 'Phase 10 OK' AS result;


-- ─────────────────────────────────────────────────────────────
-- VÉRIFICATION — Décommenter et exécuter séparément
-- ─────────────────────────────────────────────────────────────
/*
SELECT
  pt.nom,
  pt.nb_semaines,
  pt.tag,
  COUNT(DISTINCT pts.id) AS nb_seances,
  COUNT(pte.id)          AS nb_exercices_total
FROM prog_templates pt
JOIN prog_template_seances pts ON pts.template_id = pt.id
JOIN prog_template_exercices pte ON pte.seance_id = pts.id
WHERE pt.nom LIKE 'MEN WORK%'
GROUP BY pt.id, pt.nom, pt.nb_semaines, pt.tag
ORDER BY pt.nom;
*/
