-- =========================================================================
-- APEX — Fusion des doublons d'exercices créés par l'import WOMEN WORK
-- Pour chaque exercice SANS vidéo dont le nom (insensible casse/accents)
-- correspond à un exercice AVEC vidéo : on repointe les programmes vers la
-- version avec vidéo, puis on supprime le doublon.
-- Sûr et idempotent. À lancer dans Supabase > SQL Editor.
-- =========================================================================

-- Normalisation : minuscules + suppression des accents français courants
CREATE OR REPLACE FUNCTION _norm(t TEXT) RETURNS TEXT AS $f$
  SELECT translate(lower(btrim($1)),
    'àâäáéèêëíìîïóòôöúùûüç', 'aaaaeeeeiiiioooouuuuc');
$f$ LANGUAGE sql IMMUTABLE;

DO $$
DECLARE r RECORD; n INT := 0;
BEGIN
  FOR r IN
    SELECT nodup.id AS dup_id, keep.id AS keep_id, nodup.nom AS dup_nom
    FROM exercices_bdd nodup
    JOIN exercices_bdd keep
      ON _norm(nodup.nom) = _norm(keep.nom)
     AND nodup.id <> keep.id
     AND nodup.youtube_url IS NULL
     AND keep.youtube_url IS NOT NULL
  LOOP
    -- Repointer toutes les références vers la version avec vidéo
    UPDATE prog_template_exercices SET exercice_id = r.keep_id WHERE exercice_id = r.dup_id;
    UPDATE client_prog_exercices   SET exercice_id = r.keep_id WHERE exercice_id = r.dup_id;
    -- Supprimer le doublon
    DELETE FROM exercices_bdd WHERE id = r.dup_id;
    n := n + 1;
    RAISE NOTICE 'Fusionné : %', r.dup_nom;
  END LOOP;
  RAISE NOTICE '% doublon(s) fusionné(s).', n;
END $$;

DROP FUNCTION _norm(TEXT);

-- Diagnostic : exercices restants SANS vidéo (vrais nouveaux exercices à enrichir)
SELECT nom, muscle_principal
FROM exercices_bdd
WHERE youtube_url IS NULL
ORDER BY nom;
