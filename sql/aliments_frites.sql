-- APEX APP — Ajout des frites (féculents)
-- Insert sécurisé : n'ajoute que si le nom n'existe pas déjà
INSERT INTO aliments_bdd (nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
SELECT v.nom, v.calories, v.proteines, v.glucides, v.lipides, v.fibres, v.mode, v.categorie
FROM (VALUES
  ('Frites friteuse',  312, 3.4, 41.0, 15.0, 3.8, NULL, 'feculent'),
  ('Frites au four',   190, 3.2, 30.0,  6.0, 3.5, NULL, 'feculent'),
  ('Frites airfryer',  160, 3.0, 27.0,  4.0, 3.5, NULL, 'feculent')
) AS v(nom, calories, proteines, glucides, lipides, fibres, mode, categorie)
WHERE NOT EXISTS (
  SELECT 1 FROM aliments_bdd a WHERE a.nom = v.nom
);
