-- ============================================================
-- APEX — MEN WORK CONFIRME — Templates Phase 1 à 10
-- Source : MEN WORK' CONFIRME 2.xlsx
-- A exécuter dans Supabase > SQL Editor
-- ============================================================
-- Structure : CTEs enchaînées (INSERT … RETURNING) — pas de DO $$
-- Chaque phase = 1 statement avec ses séances + exercices
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. Exercices manquants dans exercices_bdd
-- ─────────────────────────────────────────────────────────────
INSERT INTO exercices_bdd (nom, muscle_principal, equipement, type_effort)
VALUES
  ('Crunch au mur', 'abdos', 'poids_corps', 'reps')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 1 — AMRAP 5min | 3 semaines
-- Accumulation | 3-4 rounds, 40-60 reps cible | R3min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'MEN WORK CONFIRME - Phase 1',
    'AMRAP 5min | Accumulation | 3-4 rounds, 40-60 reps cible | R3min',
    3, 'men_confirme'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché aux haltères',             1,3,'AMRAP',180,''),
    ('Lat Pulldown NEUTRE',                        2,3,'AMRAP',180,''),
    ('Leg curl assis',                             3,3,'AMRAP',180,''),
    ('Elevations latérales incliné 60° aux haltères',4,3,'AMRAP',180,''),
    ('Câble face pull',                            5,3,'AMRAP',180,''),
    ('Crunch au mur',                              6,3,'AMRAP',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Seated Row NEUTRE',                          1,3,'AMRAP',180,''),
    ('Hack Squat Machine',                         2,3,'AMRAP',180,''),
    ('Romanian Deadlift',                          3,3,'AMRAP',180,''),
    ('Développé militaire aux haltères (prise neutre)',4,3,'AMRAP',180,''),
    ('In line Curl supination',                    5,3,'AMRAP',180,''),
    ('DB Side Bend',                               6,3,'AMRAP',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Crossover câble milieu (neutre)',            1,3,'AMRAP',180,''),
    ('Tirage bûcheron (lats focus)',               2,3,'AMRAP',180,''),
    ('Leg Extension',                              3,3,'AMRAP',180,''),
    ('Elévations frontales aux haltères',          4,3,'AMRAP',180,''),
    ('Triceps extension à la corde',               5,3,'AMRAP',180,''),
    ('45° Back Extension',                         6,3,'AMRAP',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 1 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 2 — Vagues | 6 semaines
-- Intensification | 4×(12-12 → 10-10 → 8-8 → 6-6) | R2min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'MEN WORK CONFIRME - Phase 2',
    'Vagues | Intensification | 4×(12-12→10-10→8-8→6-6) | R2min',
    6, 'men_confirme'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché à la barre',               1,4,'12-6',120,'Vagues sem1-2: 12, sem3-4: 10, sem5-6: 8'),
    ('Traction Pronation',                         2,4,'12-6',120,''),
    ('Back Squat',                                 3,4,'12-6',120,''),
    ('Elevations latérales aux haltères',          4,4,'12-6',120,'Avec tempo contrôlé'),
    ('Standing Curl aux haltères (offset)',        5,4,'12-6',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Crossover câble haut',                       1,4,'12-6',120,''),
    ('Seated Row NEUTRE',                          2,4,'12-6',120,'Avec tempo contrôlé'),
    ('Romanian Deadlift',                          3,4,'12-6',120,''),
    ('EZ Bar Upright row',                         4,4,'12-6',120,''),
    ('In line Triceps extension 1 bras',           5,4,'12-6',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Développé incliné aux haltères',             1,4,'12-6',120,''),
    ('Flyes inversés (prise neutre)',               2,4,'12-6',120,''),
    ('Fentes arrières avec haltères',              3,4,'12-6',120,''),
    ('EZ Bar Scott Curl',                          4,4,'12-6',120,''),
    ('Garhammer raises',                           5,4,'12-6',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 2 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 3 — 1 & 1/4 | 6 semaines
-- Stress mécanique | 3×8-12 | R2min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'MEN WORK CONFIRME - Phase 3',
    '1 & 1/4 | Stress mécanique | 3×8-12 | R2min',
    6, 'men_confirme'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché aux haltères',             1,3,'8-12',120,'1 rep = descente + 1/4 + retour'),
    ('Chest supported  DBs Row',                  2,3,'8-12',120,'1 rep = montée + 1/4 + retour'),
    ('Back Squat',                                3,3,'8-12',120,'1 rep = descente + 1/4 + retour'),
    ('Elevations en Y incliné 45°',               4,3,'8-12',120,''),
    ('Spider Curl 30° aux haltères (supination)', 5,3,'8-12',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Flyes aux haltères',                        1,3,'8-12',120,''),
    ('Traction Supination',                       2,3,'8-12',120,''),
    ('Deficit Romanian Deadlift',                 3,3,'8-12',120,''),
    ('Développé militaire aux haltères (prise neutre)',4,3,'8-12',120,''),
    ('French Press à la corde',                   5,3,'8-12',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Peck deck machine',                         1,3,'8-12',120,''),
    ('Reverse Pec Deck Machine',                  2,3,'8-12',120,''),
    ('Bulgarian Split squat',                     3,3,'8-12',120,''),
    ('Pull Over à l''haltère',                    4,3,'8-12',120,''),
    ('Hollow leg raises',                         5,3,'8-12',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 3 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 4 — Rest Pause | 6 semaines
-- Intensification | 2-3 mini-sets @10/8/6RM, 15-20sec | R3min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'MEN WORK CONFIRME - Phase 4',
    'Rest Pause | Intensification | 2-3×max @10-8-6RM, 15-20sec entre mini-sets | R3min',
    6, 'men_confirme'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché à la barre',               1,3,'max',180,'@10RM sem1-2 | @8RM sem3-4 | @6RM sem5-6'),
    ('Seated Row NEUTRE',                         2,3,'max',180,''),
    ('Back Squat',                                3,3,'max',180,''),
    ('Elevations latérales aux haltères',         4,3,'max',180,''),
    ('In line Curl supination',                   5,3,'max',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Peck deck machine',                         1,3,'max',180,''),
    ('Lat Pulldown PRONATION',                    2,3,'max',180,''),
    ('Leg curl assis',                            3,3,'max',180,''),
    ('Développé militaire à la barre',            4,3,'max',180,''),
    ('Triceps extension à la corde',              5,3,'max',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Pull Over à l''haltère',                    1,3,'max',180,''),
    ('Tirage bûcheron (lats focus)',              2,3,'max',180,''),
    ('Leg Press wide stance',                     3,3,'max',180,''),
    ('Curl Incliné 30° aux haltères (offset)',    4,3,'max',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 4 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 5 — Superpump Régressif | 8 semaines
-- 6 vagues (8-6-4-4-6-8) | R1min30
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'MEN WORK CONFIRME - Phase 5',
    'Superpump Régressif | 6 vagues (8-6-4-4-6-8) | R1min30',
    8, 'men_confirme'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché à la barre',               1,6,'8-6-4-4-6-8',90,'6 vagues : charge ↘ puis ↗'),
    ('Traction Pronation',                         2,6,'8-6-4-4-6-8',90,''),
    ('Back Squat',                                 3,6,'8-6-4-4-6-8',90,''),
    ('Elevations latérales aux haltères',          4,6,'8-6-4-4-6-8',90,''),
    ('Standing Curl aux haltères (offset)',        5,6,'8-6-4-4-6-8',90,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Crossover câble haut',                       1,6,'8-6-4-4-6-8',90,''),
    ('Seated Row NEUTRE',                          2,6,'8-6-4-4-6-8',90,''),
    ('Romanian Deadlift',                          3,6,'8-6-4-4-6-8',90,''),
    ('EZ Bar Upright row',                         4,6,'8-6-4-4-6-8',90,''),
    ('In line Triceps extension 1 bras',           5,6,'8-6-4-4-6-8',90,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Développé incliné aux haltères',             1,6,'8-6-4-4-6-8',90,''),
    ('Flyes inversés (prise neutre)',               2,6,'8-6-4-4-6-8',90,''),
    ('Fentes arrières avec haltères',              3,6,'8-6-4-4-6-8',90,''),
    ('EZ Bar Scott Curl',                          4,6,'8-6-4-4-6-8',90,''),
    ('Garhammer raises',                           5,6,'8-6-4-4-6-8',90,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 5 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 6 — 1 & 1/4 Brûlant | 6 semaines
-- Stress mécanique | 3×8-12 | R2min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'MEN WORK CONFIRME - Phase 6',
    '1 & 1/4 Brûlant | Stress mécanique | 3×8-12 | R2min',
    6, 'men_confirme'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché aux haltères',             1,3,'8-12',120,'1 rep = descente + 1/4 + retour'),
    ('Chest supported  DBs Row',                  2,3,'8-12',120,''),
    ('Back Squat',                                3,3,'8-12',120,''),
    ('Elevations en Y incliné 45°',               4,3,'8-12',120,''),
    ('Spider Curl 30° aux haltères (supination)', 5,3,'8-12',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Flyes aux haltères',                        1,3,'8-12',120,''),
    ('Traction Supination',                       2,3,'8-12',120,''),
    ('Deficit Romanian Deadlift',                 3,3,'8-12',120,''),
    ('Développé militaire aux haltères (prise neutre)',4,3,'8-12',120,''),
    ('French Press à la corde',                   5,3,'8-12',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Peck deck machine',                         1,3,'8-12',120,''),
    ('Reverse Pec Deck Machine',                  2,3,'8-12',120,''),
    ('Bulgarian Split squat',                     3,3,'8-12',120,''),
    ('Pull Over à l''haltère',                    4,3,'8-12',120,''),
    ('Triceps kick back à la poulie',             5,3,'8-12',120,''),
    ('Hollow leg raises',                         6,3,'8-12',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 6 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 7 — Drop Set | 6 semaines
-- Intensification | 3×(70-80% → 60% → 50%) | 10-20sec entre drops
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'MEN WORK CONFIRME - Phase 7',
    'Drop Set | Intensification | 3×(70-80%→60%→50%) | 10-20sec entre drops | R3min',
    6, 'men_confirme'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché à la barre',               1,3,'10→8→6',180,'Drop: 70-80% → 60% → 50%'),
    ('Seated Row NEUTRE',                         2,3,'10→8→6',180,''),
    ('Back Squat',                                3,3,'10→8→6',180,''),
    ('Elevations latérales aux haltères',         4,3,'10→8→6',180,''),
    ('In line Curl supination',                   5,3,'10→8→6',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Peck deck machine',                         1,3,'10→8→6',180,''),
    ('Lat Pulldown PRONATION',                    2,3,'10→8→6',180,''),
    ('Leg curl assis',                            3,3,'10→8→6',180,''),
    ('Développé militaire à la barre',            4,3,'10→8→6',180,''),
    ('Triceps extension à la corde',              5,3,'10→8→6',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Pull Over à l''haltère',                    1,3,'10→8→6',180,''),
    ('Tirage bûcheron (lats focus)',              2,3,'10→8→6',180,''),
    ('Leg Press wide stance',                     3,3,'10→8→6',180,''),
    ('Curl Incliné 30° aux haltères (offset)',    4,3,'10→8→6',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 7 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 8 — Pyramide | 6 semaines
-- 4×(12-10-8-6 / 15-12-10-8) | R2min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'MEN WORK CONFIRME - Phase 8',
    'Pyramide | 4×(12-10-8-6 / 15-12-10-8) | R2min',
    6, 'men_confirme'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché à la barre',               1,4,'12-10-8-6',120,'Pyramide ascendante'),
    ('Traction Pronation',                         2,4,'12-10-8-6',120,''),
    ('Back Squat',                                 3,4,'15-12-10-8',120,''),
    ('Elevations latérales aux haltères',          4,4,'12-10-8-6',120,''),
    ('Standing Curl aux haltères (offset)',        5,4,'12-10-8-6',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Crossover câble haut',                       1,4,'12-10-8-6',120,''),
    ('Seated Row NEUTRE',                          2,4,'12-10-8-6',120,''),
    ('Romanian Deadlift',                          3,4,'15-12-10-8',120,''),
    ('EZ Bar Upright row',                         4,4,'12-10-8-6',120,''),
    ('In line Triceps extension 1 bras',           5,4,'12-10-8-6',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Développé incliné aux haltères',             1,4,'12-10-8-6',120,''),
    ('Flyes inversés (prise neutre)',               2,4,'12-10-8-6',120,''),
    ('Fentes arrières avec haltères',              3,4,'15-12-10-8',120,''),
    ('EZ Bar Scott Curl',                          4,4,'12-10-8-6',120,''),
    ('Garhammer raises',                           5,4,'12-10-8-6',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 8 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 9 — Iso Régressif | 6 semaines
-- 3×(5″iso+5 → 4″+4 → 3″+3) | R2-3min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'MEN WORK CONFIRME - Phase 9',
    'Iso Régressif | 3×(5″iso+5 → 4″+4 → 3″+3) | R2-3min',
    6, 'men_confirme'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché à la barre',               1,3,'5+5→4+4→3+3',150,'Iso régressif: 5″contraction + 5 reps'),
    ('Traction Supination',                        2,3,'5+5→4+4→3+3',150,''),
    ('Back Squat',                                 3,3,'5+5→4+4→3+3',150,''),
    ('Low Cable One arm latéral raise',            4,3,'5+5→4+4→3+3',150,''),
    ('Triceps Extension couché aux haltères',      5,3,'5+5→4+4→3+3',150,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Dips machine',                               1,3,'5+5→4+4→3+3',150,''),
    ('GHD Back extension focus fessiers',          2,3,'5+5→4+4→3+3',150,''),
    ('Tirage buste penché à la barre (pronation)', 3,3,'5+5→4+4→3+3',150,''),
    ('Landmine Press',                             4,3,'5+5→4+4→3+3',150,''),
    ('Standing Curl aux haltères (neutre)',        5,3,'5+5→4+4→3+3',150,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Développé incliné aux haltères',             1,3,'5+5→4+4→3+3',150,''),
    ('Gorilla row',                                2,3,'5+5→4+4→3+3',150,''),
    ('Romanian Deadlift sur 1 jambe',              3,3,'5+5→4+4→3+3',150,''),
    ('Half ghd sit ups',                           4,3,'5+5→4+4→3+3',150,''),
    ('Strict Hanging Leg raises',                  5,3,'5+5→4+4→3+3',150,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 9 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 10 — Série Organique Géante | 8 semaines
-- 6 vagues progressives | R1min30
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'MEN WORK CONFIRME - Phase 10',
    'Série Organique Géante | 6 vagues progressives | R1min30',
    8, 'men_confirme'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Développé couché à la barre',               1,6,'5→1RM',90,'Organique: 5reps@80% → 4@85% → 3@85% → 2@90% → 1@95% → 1RM'),
    ('Traction Pronation',                         2,6,'5→1RM',90,''),
    ('Back Squat',                                 3,6,'5→1RM',90,''),
    ('Elevations latérales aux haltères',          4,6,'5→1RM',90,''),
    ('Standing Curl aux haltères (offset)',        5,6,'5→1RM',90,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Crossover câble haut',                       1,6,'5→1RM',90,''),
    ('Seated Row NEUTRE',                          2,6,'5→1RM',90,''),
    ('Romanian Deadlift',                          3,6,'5→1RM',90,''),
    ('EZ Bar Upright row',                         4,6,'5→1RM',90,''),
    ('In line Triceps extension 1 bras',           5,6,'5→1RM',90,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Développé incliné aux haltères',             1,6,'5→1RM',90,''),
    ('Flyes inversés (prise neutre)',               2,6,'5→1RM',90,''),
    ('Fentes arrières avec haltères',              3,6,'5→1RM',90,''),
    ('EZ Bar Scott Curl',                          4,6,'5→1RM',90,''),
    ('Garhammer raises',                           5,6,'5→1RM',90,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 10 OK' AS result;
