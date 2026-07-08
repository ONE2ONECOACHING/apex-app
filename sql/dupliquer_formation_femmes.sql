-- APEX — Dupliquer "Formation Holistique Hommes" → "Formation Holistique Femmes"
-- Copie profonde : formation + modules + leçons (vidéo, texte, type, quizz).
-- Idempotent : ne recrée pas si "Formation Holistique Femmes" existe déjà.

DO $$
DECLARE
  v_src   UUID;
  v_coach UUID;
  v_new   UUID;
  m       RECORD;
  new_mid UUID;
BEGIN
  -- Source = la formation holistique existante (hors "Femmes")
  SELECT id, coach_id INTO v_src, v_coach
  FROM formations
  WHERE titre ILIKE '%holistique%' AND titre NOT ILIKE '%femme%'
  ORDER BY created_at LIMIT 1;

  IF v_src IS NULL THEN
    RAISE EXCEPTION 'Formation source introuvable.';
  END IF;

  IF EXISTS (SELECT 1 FROM formations WHERE titre = 'Formation Holistique Femmes' AND coach_id = v_coach) THEN
    RAISE NOTICE 'Formation Holistique Femmes existe déjà — rien à dupliquer.';
    RETURN;
  END IF;

  -- Copier la formation
  INSERT INTO formations (coach_id, titre, description)
  SELECT coach_id, 'Formation Holistique Femmes', description
  FROM formations WHERE id = v_src
  RETURNING id INTO v_new;

  -- Copier chaque module + ses leçons
  FOR m IN SELECT * FROM formation_modules WHERE formation_id = v_src ORDER BY ordre LOOP
    INSERT INTO formation_modules (formation_id, titre, description, ordre, unlock_day)
    VALUES (v_new, m.titre, m.description, m.ordre, m.unlock_day)
    RETURNING id INTO new_mid;

    INSERT INTO formation_lecons (module_id, titre, description, youtube_url, duree_min, ordre, type, questions)
    SELECT new_mid, titre, description, youtube_url, duree_min, ordre, type, questions
    FROM formation_lecons WHERE module_id = m.id ORDER BY ordre;
  END LOOP;

  RAISE NOTICE 'Formation Holistique Femmes créée (id %).', v_new;
END $$;
