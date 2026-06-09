-- ============================================================
-- APEX APP — Seed : Formation Holistique Hommes
-- Colle dans Supabase SQL Editor et clique sur Run
-- Structure : 11 modules × (1 leçon + 1 quizz)
-- ============================================================

DO $$
DECLARE
  v_coach_id  UUID;
  v_formation UUID;
  v_module    UUID;
BEGIN

  -- Récupérer le coach_id depuis l'email
  SELECT id INTO v_coach_id FROM profiles WHERE role = 'coach' LIMIT 1;
  IF v_coach_id IS NULL THEN RAISE EXCEPTION 'Coach introuvable'; END IF;

  -- Insérer la formation (ou récupérer si déjà créée)
  SELECT id INTO v_formation FROM formations
    WHERE coach_id = v_coach_id AND titre ILIKE '%holistique%' LIMIT 1;

  IF v_formation IS NULL THEN
    INSERT INTO formations (coach_id, titre, description)
    VALUES (v_coach_id, 'Formation Holistique Hommes', 'Formation complète en nutrition, sommeil, hormones et psychologie de la transformation.')
    RETURNING id INTO v_formation;
  END IF;

  -- ── Commence ici ─────────────────────────────────────────────
  INSERT INTO formation_modules (formation_id, titre, ordre) VALUES (v_formation, 'Commence ici 🗺️', 0) RETURNING id INTO v_module;
  INSERT INTO formation_lecons (module_id, titre, type, ordre) VALUES (v_module, 'Bienvenue 🤝', 'lecon', 0);
  INSERT INTO formation_lecons (module_id, titre, type, ordre) VALUES (v_module, 'Comment utiliser la formation ?', 'lecon', 1);

  -- ── MODULE 1 ─────────────────────────────────────────────────
  INSERT INTO formation_modules (formation_id, titre, ordre) VALUES (v_formation, 'MODULE 1 — Introduction à la Nutrition', 1) RETURNING id INTO v_module;
  INSERT INTO formation_lecons (module_id, titre, type, ordre) VALUES (v_module, 'Contenu pédagogique', 'lecon', 0);
  INSERT INTO formation_lecons (module_id, titre, type, ordre, questions) VALUES (v_module, 'QUIZ — Validation des acquis', 'quizz', 1, '[]');

  -- ── MODULE 2 ─────────────────────────────────────────────────
  INSERT INTO formation_modules (formation_id, titre, ordre) VALUES (v_formation, 'MODULE 2 — Nutrition santé & NEAT', 2) RETURNING id INTO v_module;
  INSERT INTO formation_lecons (module_id, titre, type, ordre) VALUES (v_module, 'Contenu pédagogique', 'lecon', 0);
  INSERT INTO formation_lecons (module_id, titre, type, ordre, questions) VALUES (v_module, 'QUIZ — Validation des acquis', 'quizz', 1, '[]');

  -- ── MODULE 3 ─────────────────────────────────────────────────
  INSERT INTO formation_modules (formation_id, titre, ordre) VALUES (v_formation, 'MODULE 3 — Tracker ses calories & Optimiser sa digestion', 3) RETURNING id INTO v_module;
  INSERT INTO formation_lecons (module_id, titre, type, ordre) VALUES (v_module, 'Contenu pédagogique', 'lecon', 0);
  INSERT INTO formation_lecons (module_id, titre, type, ordre, questions) VALUES (v_module, 'QUIZ — Validation des acquis', 'quizz', 1, '[]');

  -- ── MODULE 4 ─────────────────────────────────────────────────
  INSERT INTO formation_modules (formation_id, titre, ordre) VALUES (v_formation, 'MODULE 4 — Nutrition Santé & Gestion du Stress', 4) RETURNING id INTO v_module;
  INSERT INTO formation_lecons (module_id, titre, type, ordre) VALUES (v_module, 'Contenu pédagogique', 'lecon', 0);
  INSERT INTO formation_lecons (module_id, titre, type, ordre, questions) VALUES (v_module, 'QUIZ — Validation des acquis', 'quizz', 1, '[]');

  -- ── MODULE 5 ─────────────────────────────────────────────────
  INSERT INTO formation_modules (formation_id, titre, ordre) VALUES (v_formation, 'MODULE 5 — Sommeil Santé (Partie 1)', 5) RETURNING id INTO v_module;
  INSERT INTO formation_lecons (module_id, titre, type, ordre) VALUES (v_module, 'Contenu pédagogique', 'lecon', 0);
  INSERT INTO formation_lecons (module_id, titre, type, ordre, questions) VALUES (v_module, 'QUIZ — Validation des acquis', 'quizz', 1, '[]');

  -- ── MODULE 6 ─────────────────────────────────────────────────
  INSERT INTO formation_modules (formation_id, titre, ordre) VALUES (v_formation, 'MODULE 6 — Sommeil Santé (Partie 2) & Troubles du Comportement Alimentaire', 6) RETURNING id INTO v_module;
  INSERT INTO formation_lecons (module_id, titre, type, ordre) VALUES (v_module, 'Contenu pédagogique', 'lecon', 0);
  INSERT INTO formation_lecons (module_id, titre, type, ordre, questions) VALUES (v_module, 'QUIZ — Validation des acquis', 'quizz', 1, '[]');

  -- ── MODULE 7 ─────────────────────────────────────────────────
  INSERT INTO formation_modules (formation_id, titre, ordre) VALUES (v_formation, 'MODULE 7 — Psychologie de la Transformation', 7) RETURNING id INTO v_module;
  INSERT INTO formation_lecons (module_id, titre, type, ordre) VALUES (v_module, 'Contenu pédagogique', 'lecon', 0);
  INSERT INTO formation_lecons (module_id, titre, type, ordre, questions) VALUES (v_module, 'QUIZ — Validation des acquis', 'quizz', 1, '[]');

  -- ── MODULE 8 ─────────────────────────────────────────────────
  INSERT INTO formation_modules (formation_id, titre, ordre) VALUES (v_formation, 'MODULE 8 — Système Hormonal Masculin & Performance', 8) RETURNING id INTO v_module;
  INSERT INTO formation_lecons (module_id, titre, type, ordre) VALUES (v_module, 'Contenu pédagogique', 'lecon', 0);
  INSERT INTO formation_lecons (module_id, titre, type, ordre, questions) VALUES (v_module, 'QUIZ — Validation des acquis', 'quizz', 1, '[]');

  -- ── MODULE 9 ─────────────────────────────────────────────────
  INSERT INTO formation_modules (formation_id, titre, ordre) VALUES (v_formation, 'MODULE 9 — Comprendre pour décider : Calories, équilibre énergétique & supplémentation', 9) RETURNING id INTO v_module;
  INSERT INTO formation_lecons (module_id, titre, type, ordre) VALUES (v_module, 'Contenu pédagogique', 'lecon', 0);
  INSERT INTO formation_lecons (module_id, titre, type, ordre, questions) VALUES (v_module, 'QUIZ — Validation des acquis', 'quizz', 1, '[]');

  -- ── MODULE 10 ────────────────────────────────────────────────
  INSERT INTO formation_modules (formation_id, titre, ordre) VALUES (v_formation, 'MODULE 10 — Stabiliser ses résultats & ne plus jamais repartir de zéro', 10) RETURNING id INTO v_module;
  INSERT INTO formation_lecons (module_id, titre, type, ordre) VALUES (v_module, 'Contenu pédagogique', 'lecon', 0);
  INSERT INTO formation_lecons (module_id, titre, type, ordre, questions) VALUES (v_module, 'QUIZ — Validation des acquis', 'quizz', 1, '[]');

  RAISE NOTICE 'Formation créée avec succès : %', v_formation;
END $$;
