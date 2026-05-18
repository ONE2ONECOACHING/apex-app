-- ============================================================
-- APEX — WOMEN WORK DÉBUTANTE — Templates Phase 1 à 10
-- Source : WOMEN WORK' DEBUTANTE (1).xlsx
-- A exécuter dans Supabase > SQL Editor
-- Note : Phase 8 absente du fichier source (volontaire)
-- ============================================================
-- Structure : CTEs enchaînées (INSERT … RETURNING) — pas de DO $$
-- Chaque phase = 1 statement avec ses séances + exercices
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. Exercices manquants dans exercices_bdd
-- ─────────────────────────────────────────────────────────────
INSERT INTO exercices_bdd (nom, muscle_principal, equipement, type_effort)
VALUES
  ('Crunch au mur',         'abdos',    'poids_corps', 'reps'),
  ('Hip thrust (barre)',    'fessiers', 'barre',        'reps'),
  ('Fente arrière à la barre', 'fessiers', 'barre',    'reps')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 1 — AMRAP 5min | 5 semaines
-- Accumulation | 3-4 rounds | R3min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'WOMEN WORK DÉBUTANTE - Phase 1',
    'AMRAP 5min | Accumulation | 3-4 rounds | R3min',
    5, 'women_debutant'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Goblet Squat',                              1,3,'AMRAP',180,''),
    ('Seated Row NEUTRE',                         2,3,'AMRAP',180,''),
    ('Hip thrust (barre)',                         3,3,'AMRAP',180,''),
    ('Triceps extension à la corde',              4,3,'AMRAP',180,''),
    ('GHD Back extension focus fessiers',         5,3,'AMRAP',180,''),
    ('Crunch au mur',                             6,3,'AMRAP',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Hack Squat Machine',                        1,3,'AMRAP',180,''),
    ('Chest Press Machine',                       2,3,'AMRAP',180,''),
    ('Fentes arrières avec haltères',             3,3,'AMRAP',180,''),
    ('Elevations latérales aux haltères',         4,3,'AMRAP',180,''),
    ('Leg curl assis',                            5,3,'AMRAP',180,''),
    ('DB Side Bend',                              6,3,'AMRAP',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Abductor machine',                          1,3,'AMRAP',180,''),
    ('Romanian Deadlift',                         2,3,'AMRAP',180,''),
    ('Glute extension machine',                   3,3,'AMRAP',180,''),
    ('Leg Extension',                             4,3,'AMRAP',180,''),
    ('Adductor Machine',                          5,3,'AMRAP',180,''),
    ('Front plank',                               6,3,'60s',  180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 1 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 2 — Superset Antagoniste | 6 semaines
-- Accumulation | 3-4 SS × 12-15 reps | R2min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'WOMEN WORK DÉBUTANTE - Phase 2',
    'Superset Antagoniste | Accumulation | 3-4×12-15 | R2min',
    6, 'women_debutant'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Goblet Squat',                              1,3,'12-15',120,'SS1 avec Chest Press Machine'),
    ('Chest Press Machine',                       2,3,'12-15',120,'SS1 avec Goblet Squat'),
    ('Hip thrust (barre)',                         3,3,'12-15',120,'SS2 avec Elevations latérales'),
    ('Elevations latérales aux haltères',         4,3,'12-15',120,'SS2 avec Hip thrust'),
    ('GHD Back extension focus fessiers',         5,3,'12-15',120,'SS3 avec Abdos'),
    ('Hollow leg raises',                         6,3,'12-15',120,'SS3 avec Back extension')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Hack Squat Machine',                        1,3,'12-15',120,'SS1 avec Seated Row'),
    ('Seated Row NEUTRE',                         2,3,'12-15',120,'SS1 avec Hack Squat'),
    ('Romanian Deadlift',                         3,3,'12-15',120,'SS2 avec Triceps extension'),
    ('Triceps extension à la corde',              4,3,'12-15',120,'SS2 avec Romanian Deadlift'),
    ('Fentes arrières avec haltères',             5,3,'12-15',120,'SS3 avec Abdos'),
    ('Hollow leg raises',                         6,3,'12-15',120,'SS3 avec Fentes'),
    ('DB Side Bend',                              7,3,'12-15',120,'Solo')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Abductor machine',                          1,3,'12-15',120,'SS1 avec Adductor Machine'),
    ('Adductor Machine',                          2,3,'12-15',120,'SS1 avec Abductor machine'),
    ('Leg curl assis',                            3,3,'12-15',120,'SS2 avec Leg Extension'),
    ('Leg Extension',                             4,3,'12-15',120,'SS2 avec Leg curl'),
    ('Glute extension machine',                   5,3,'12-15',120,'SS3 avec Abdos'),
    ('Hollow leg raises',                         6,3,'12-15',120,'SS3 avec Glute extension')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 2 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 3 — Top Set Back Off | 6 semaines
-- Intensification | Montée à 12→10→8RM + 3×−10% | R2min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'WOMEN WORK DÉBUTANTE - Phase 3',
    'Top Set Back Off | Intensification | Montée à 12→10→8RM + 3 séries −10% | R2min',
    6, 'women_debutant'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Hack Squat Machine',                        1,4,'12→10→8',120,'Top set puis 3×−10%'),
    ('Lat Pulldown PRONATION',                    2,4,'12→10→8',120,''),
    ('Hip thrust (barre)',                         3,4,'12→10→8',120,''),
    ('Low câble glute extension',                 4,4,'12→10→8',120,''),
    ('Hollow leg raises',                         5,4,'12→10→8',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Fente arrière à la barre',                  1,4,'12→10→8',120,''),
    ('Dips machine',                              2,4,'12→10→8',120,''),
    ('GHD Back extension focus fessiers',         3,4,'12→10→8',120,''),
    ('Leg curl allongé',                          4,4,'12→10→8',120,''),
    ('Flyes inversés (prise neutre)',              5,4,'12→10→8',120,''),
    ('Crunch machine',                            6,4,'12→10→8',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Romanian Deadlift',                         1,4,'12→10→8',120,''),
    ('Peck deck machine',                         2,4,'12→10→8',120,''),
    ('Leg Extension',                             3,4,'12→10→8',120,''),
    ('Reverse Pec Deck Machine',                  4,4,'12→10→8',120,''),
    ('Abdos à la roulette',                       5,4,'12→10→8',120,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 3 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 4 — Cluster Rest Pause | 6 semaines
-- Intensification | 3×mini-sets @12→10→8RM, 10-20sec | R3min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'WOMEN WORK DÉBUTANTE - Phase 4',
    'Cluster Rest Pause | Intensification | 3×mini-sets @12→10→8RM, 10-20sec entre mini-sets | R3min',
    6, 'women_debutant'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Hack Squat Machine',                        1,3,'6-5-4',180,'Cluster: 10-20sec entre mini-sets | @12RM sem1-2'),
    ('Lat Pulldown PRONATION',                    2,3,'6-5-4',180,''),
    ('Hip thrust (barre)',                         3,3,'6-5-4',180,''),
    ('Low câble glute extension',                 4,3,'6-5-4',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Fente arrière à la barre',                  1,3,'6-5-4',180,''),
    ('Dips machine',                              2,3,'6-5-4',180,''),
    ('GHD Back extension focus fessiers',         3,3,'6-5-4',180,''),
    ('Leg curl allongé',                          4,3,'6-5-4',180,''),
    ('Flyes inversés (prise neutre)',              5,3,'6-5-4',180,''),
    ('Garhammer raises',                          6,3,'6-5-4',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Romanian Deadlift',                         1,3,'6-5-4',180,''),
    ('Peck deck machine',                         2,3,'6-5-4',180,''),
    ('Leg Extension',                             3,3,'6-5-4',180,''),
    ('Reverse Pec Deck Machine',                  4,3,'6-5-4',180,''),
    ('Abdos à la roulette',                       5,3,'6-5-4',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 4 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 5 — Supersets Antagoniste 8-12 | 6 semaines
-- Accumulation | 3-4 SS × 8-12 reps | R2min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'WOMEN WORK DÉBUTANTE - Phase 5',
    'Supersets Antagoniste | Accumulation | 3-4×8-12 | R2min',
    6, 'women_debutant'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Curtsy fentes à la barre',                  1,3,'8-12',120,'SS1 avec Câble abduction'),
    ('Low câble glute abduction',                 2,3,'8-12',120,'SS1 avec Curtsy fentes'),
    ('Chest Press Machine',                       3,3,'8-12',120,'SS2 avec Triceps extension'),
    ('Triceps extension à la corde',              4,3,'8-12',120,'SS2 avec Chest Press'),
    ('Bulgarian Split squat',                     5,3,'8-12',120,'SS3 avec V up croisée'),
    ('V up croisée',                              6,3,'8-12',120,'SS3 avec Bulgarian Split squat'),
    ('DRagon flag',                               7,3,'max', 60, 'Finisher solo')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Hack Squat Machine',                        1,3,'8-12',120,'SS1 avec Leg Extension'),
    ('Leg Extension',                             2,3,'8-12',120,'SS1 avec Hack Squat'),
    ('Seated Row NEUTRE',                         3,3,'8-12',120,'SS2 avec Elevations latérales'),
    ('Elevations latérales aux haltères',         4,3,'8-12',120,'SS2 avec Seated Row'),
    ('Romanian Deadlift',                         5,3,'8-12',120,'SS3 avec Leg curl'),
    ('Leg curl assis',                            6,3,'8-12',120,'SS3 avec Romanian Deadlift'),
    ('45° Back Extension',                        7,3,'8-12',120,'SS4 avec DB Side Bend'),
    ('DB Side Bend',                              8,3,'8-12',120,'SS4 avec Back Extension')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Hip thrust (barre)',                         1,3,'8-12',120,'SS1 avec Back extension'),
    ('GHD Back extension focus fessiers',         2,3,'8-12',120,'SS1 avec Hip thrust'),
    ('Adductor Machine',                          3,3,'8-12',120,'SS2 avec Copenhagen plank'),
    ('Copenhagen plank',                          4,3,'30s', 120,'SS2 avec Adductor Machine')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 5 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 6 — 6×10 Pur | 5 semaines
-- Accumulation | 6 sets ×10 reps | R1min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'WOMEN WORK DÉBUTANTE - Phase 6',
    '6×10 Pur | Accumulation | 6 sets ×10 reps | R1min',
    5, 'women_debutant'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Hip thrust (barre)',                         1,6,'10',60,''),
    ('Seated Row NEUTRE',                         2,6,'10',60,''),
    ('Curtsy fentes à la barre',                  3,6,'10',60,''),
    ('Triceps extension à la corde',              4,6,'10',60,''),
    ('Leg Extension',                             5,6,'10',60,''),
    ('Hollow leg raises',                         6,6,'10',60,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Hack Squat Machine',                        1,6,'10',60,''),
    ('Chest Press Machine',                       2,6,'10',60,''),
    ('Elevations latérales aux haltères',         3,6,'10',60,''),
    ('Leg curl assis',                            4,6,'10',60,''),
    ('V up',                                      5,6,'10',60,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Glute extension machine',                   1,6,'10',60,''),
    ('Romanian Deadlift',                         2,6,'10',60,''),
    ('Low câble glute abduction',                 3,6,'10',60,''),
    ('Adductor Machine',                          4,6,'10',60,''),
    ('V up',                                      5,6,'10',60,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 6 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 7 — Cluster 4×5/4/3 | 6 semaines
-- Intensification | 3×(4×5 → 4×4 → 4×3), 10sec | R2-3min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'WOMEN WORK DÉBUTANTE - Phase 7',
    'Cluster 4×5/4/3 | Intensification | 3×(4×5 → 4×4 → 4×3), 10sec entre reps | R2-3min',
    6, 'women_debutant'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Hack Squat Machine',                        1,3,'4×5→4×4→4×3',150,'@10RM cycle 3 | Cluster: 10sec entre reps'),
    ('Lat Pulldown PRONATION',                    2,3,'4×5→4×4→4×3',150,''),
    ('Hip thrust (barre)',                         3,3,'4×5→4×4→4×3',150,''),
    ('Low câble glute extension',                 4,3,'4×5→4×4→4×3',150,''),
    ('Hollow leg raises',                         5,3,'4×5→4×4→4×3',150,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Fente arrière à la barre',                  1,3,'4×5→4×4→4×3',150,''),
    ('Dips machine',                              2,3,'4×5→4×4→4×3',150,''),
    ('GHD Back extension focus fessiers',         3,3,'4×5→4×4→4×3',150,''),
    ('Leg curl allongé',                          4,3,'4×5→4×4→4×3',150,''),
    ('Flyes inversés (prise neutre)',              5,3,'4×5→4×4→4×3',150,''),
    ('Garhammer raises',                          6,3,'4×5→4×4→4×3',150,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Romanian Deadlift',                         1,3,'4×5→4×4→4×3',150,''),
    ('Peck deck machine',                         2,3,'4×5→4×4→4×3',150,''),
    ('Leg Extension',                             3,3,'4×5→4×4→4×3',150,''),
    ('Reverse Pec Deck Machine',                  4,3,'4×5→4×4→4×3',150,''),
    ('Abdos à la roulette',                       5,3,'4×5→4×4→4×3',150,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 7 OK' AS result;


-- Note : Phase 8 absente du fichier source Excel (volontaire)


-- ═══════════════════════════════════════════════════════════════
-- PHASE 9 — Supersets Antagoniste (avancé) | 6 semaines
-- Accumulation | 3-4 SS × 8-12 reps | R2min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'WOMEN WORK DÉBUTANTE - Phase 9',
    'Supersets Antagoniste Avancé | Accumulation | 3-4×8-12 | R2min',
    6, 'women_debutant'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Romanian Deadlift',                         1,3,'8-12',120,'SS1 avec Câble abduction'),
    ('Low câble glute abduction',                 2,3,'8-12',120,'SS1 avec Romanian Deadlift'),
    ('Chest Press Machine',                       3,3,'8-12',120,'SS2 avec Elevations latérales'),
    ('Elevations latérales aux haltères',         4,3,'8-12',120,'SS2 avec Chest Press'),
    ('Bulgarian Split squat',                     5,3,'8-12',120,'SS3 avec Back extension'),
    ('GHD Back extension focus fessiers',         6,3,'8-12',120,'SS3 avec Bulgarian Split squat'),
    ('V up croisée',                              7,3,'8-12',120,'SS4 avec Dragon flag'),
    ('DRagon flag',                               8,3,'max', 120,'SS4 avec V up croisée')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Hack Squat Machine',                        1,3,'8-12',120,'SS1 avec Adductor Machine'),
    ('Adductor Machine',                          2,3,'8-12',120,'SS1 avec Hack Squat'),
    ('Seated Row NEUTRE',                         3,3,'8-12',120,'SS2 avec Triceps extension'),
    ('Triceps extension à la corde',              4,3,'8-12',120,'SS2 avec Seated Row'),
    ('Curtsy fentes à la barre',                  5,3,'8-12',120,'SS3 avec Leg curl'),
    ('Leg curl assis',                            6,3,'8-12',120,'SS3 avec Curtsy fentes'),
    ('45° Back Extension',                        7,3,'8-12',120,'SS4 avec DB Side Bend'),
    ('DB Side Bend',                              8,3,'8-12',120,'SS4 avec Back Extension')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Hip thrust (barre)',                         1,3,'8-12',120,'SS1 avec abdos obliques'),
    ('Dynamic Lateral plank',                     2,3,'8-12',120,'SS1 avec Hip thrust'),
    ('Leg Extension',                             3,3,'8-12',120,'SS2 avec Copenhagen plank'),
    ('Copenhagen plank',                          4,3,'30s', 120,'SS2 avec Leg Extension')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 9 OK' AS result;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 10 — Organique Géant | 10 semaines
-- Intensification | Progression 5→1RM | R3min
-- ═══════════════════════════════════════════════════════════════
WITH
_coach AS (SELECT id FROM profiles WHERE role='coach' ORDER BY created_at LIMIT 1),
_tpl AS (
  INSERT INTO prog_templates (coach_id, nom, description, nb_semaines, tag)
  SELECT id,
    'WOMEN WORK DÉBUTANTE - Phase 10',
    'Organique Géant | Intensification | Progression 5reps@80% → 1RM sur 10 semaines | R3min',
    10, 'women_debutant'
  FROM _coach RETURNING id
),
_sa AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance A',1 FROM _tpl RETURNING id),
_sb AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance B',2 FROM _tpl RETURNING id),
_sc AS (INSERT INTO prog_template_seances(template_id,nom,ordre) SELECT id,'Séance C',3 FROM _tpl RETURNING id),
_ea AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sa.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sa CROSS JOIN (VALUES
    ('Hack Squat Machine',                        1,3,'5→1RM',180,'Sem1: 5@80%+max@60% | Sem10: 1RM'),
    ('Lat Pulldown PRONATION',                    2,3,'5→1RM',180,''),
    ('Hip thrust (barre)',                         3,3,'5→1RM',180,''),
    ('Low câble glute extension',                 4,3,'5→1RM',180,''),
    ('Hollow leg raises',                         5,3,'5→1RM',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_eb AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sb.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sb CROSS JOIN (VALUES
    ('Fente arrière à la barre',                  1,3,'5→1RM',180,''),
    ('Dips machine',                              2,3,'5→1RM',180,''),
    ('GHD Back extension focus fessiers',         3,3,'5→1RM',180,''),
    ('Leg curl allongé',                          4,3,'5→1RM',180,''),
    ('Hollow leg raises',                         5,3,'5→1RM',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
),
_ec AS (
  INSERT INTO prog_template_exercices (seance_id, exercice_id, ordre, series, reps_cible, repos_secondes, notes)
  SELECT _sc.id, eb.id, t.ord, t.ser, t.reps, t.repos, t.note
  FROM _sc CROSS JOIN (VALUES
    ('Romanian Deadlift',                         1,3,'5→1RM',180,''),
    ('Peck deck machine',                         2,3,'5→1RM',180,''),
    ('Leg Extension',                             3,3,'5→1RM',180,''),
    ('Reverse Pec Deck Machine',                  4,3,'5→1RM',180,''),
    ('Hollow leg raises',                         5,3,'5→1RM',180,'')
  ) AS t(nom,ord,ser,reps,repos,note)
  JOIN exercices_bdd eb ON eb.nom = t.nom
)
SELECT 'Phase 10 OK' AS result;
