-- =========================================================================
-- APEX — Exercices Poids du corps + TRX (47 exercices)
-- À exécuter dans Supabase > SQL Editor
-- Sécurisé : n'insère pas si le nom existe déjà dans la base
-- =========================================================================

INSERT INTO exercices_bdd (nom, muscle_principal, equipement, type_effort, youtube_url)
SELECT v.nom, v.muscle_principal, v.equipement, v.type_effort, v.youtube_url
FROM (VALUES

  -- QUADRICEPS — Poids du corps
  ('Squat',                         'quadriceps', 'poids_corps', 'reps',  'https://youtube.com/shorts/gp9RByMsxJg'),
  ('Squat jump',                    'quadriceps', 'poids_corps', 'reps',  'https://youtu.be/YGGq0AE5Uyc'),
  ('Fente arrière',                 'quadriceps', 'poids_corps', 'reps',  'https://youtube.com/shorts/E6tX02Fh4WU'),
  ('Fente marchée',                 'quadriceps', 'poids_corps', 'reps',  'https://youtube.com/shorts/AOnH_Er2pxc'),
  ('Fentes sautées',                'quadriceps', 'poids_corps', 'reps',  'https://youtube.com/shorts/BSy8DBrSmCA'),
  ('Bulgarian split squat',         'quadriceps', 'poids_corps', 'reps',  'https://youtube.com/shorts/iQRmtvq_oDA'),
  ('Step-up (chaise)',              'quadriceps', 'poids_corps', 'reps',  'https://youtube.com/shorts/j8KN0jwWaRA'),

  -- QUADRICEPS — TRX
  ('Pistol squat assisté TRX',     'quadriceps', 'trx',         'reps',  'https://youtu.be/HqCHXb91yMQ'),

  -- ISCHIO-JAMBIERS — Poids du corps
  ('Romanian Deadlift',             'ischio',     'poids_corps', 'reps',  'https://youtube.com/shorts/6h2-tzPkkeY'),
  ('Romanian Deadlift sur 1 jambe','ischio',     'poids_corps', 'reps',  'https://youtube.com/shorts/xKaREP8gLsE'),

  -- FESSIERS — Poids du corps
  ('Hip thrust (canapé)',           'fessiers',   'poids_corps', 'reps',  'https://youtu.be/k2MxQE8gLjI'),
  ('Glute bridge',                  'fessiers',   'poids_corps', 'reps',  'https://youtube.com/shorts/_N0ljKF2eg4'),
  ('Glute bridge sur 1 jambe',     'fessiers',   'poids_corps', 'reps',  'https://youtube.com/shorts/F-6-YhRd0Go'),

  -- PECTORAUX — Poids du corps
  ('Pompes',                        'pectoraux',  'poids_corps', 'reps',  'https://youtube.com/shorts/WDIpL0pjun0'),
  ('Pompes sur les genoux',         'pectoraux',  'poids_corps', 'reps',  'https://youtube.com/shorts/WDIpL0pjun0'),
  ('Pompes inclinées',              'pectoraux',  'poids_corps', 'reps',  'https://youtu.be/Gvm5Q29UHbk'),
  ('Pompes déclinées',              'pectoraux',  'poids_corps', 'reps',  'https://youtube.com/shorts/lx-49Yjqm-Q'),

  -- PECTORAUX — TRX
  ('Pompes TRX',                    'pectoraux',  'trx',         'reps',  'https://youtu.be/M7Eba2uquic'),
  ('Ecartés au TRX',                'pectoraux',  'trx',         'reps',  'https://youtu.be/zA_3VfO-YoU'),

  -- DOS — Poids du corps
  ('Rowing sous table',             'dos',        'poids_corps', 'reps',  'https://youtube.com/shorts/kOqMZRfUIvE'),

  -- DOS — TRX
  ('Rowing unilatéral TRX',        'dos',        'trx',         'reps',  'https://youtu.be/kAASYsN5d9A'),
  ('Tirage neutre TRX',             'dos',        'trx',         'reps',  'https://youtu.be/9ukRrNTPpTw'),

  -- ÉPAULES — Poids du corps
  ('Pike push-up',                  'epaules',    'poids_corps', 'reps',  'https://youtu.be/XckEEwa1BPI'),

  -- ÉPAULES — TRX
  ('Face pull TRX',                 'epaules',    'trx',         'reps',  'https://youtu.be/gRkBe4WMpwE'),
  ('Y raise TRX',                   'epaules',    'trx',         'reps',  'https://youtu.be/YWShxRYCEj0'),

  -- BICEPS — TRX
  ('Curl biceps TRX',               'biceps',     'trx',         'reps',  'https://youtu.be/kXkbr42M1eA'),

  -- TRICEPS — Poids du corps
  ('Dips sur chaise',               'triceps',    'poids_corps', 'reps',  'https://youtube.com/shorts/qpUFUFFXZiY'),

  -- TRICEPS — TRX
  ('Extension triceps TRX',        'triceps',    'trx',         'reps',  'https://youtu.be/aOta-9zorps'),

  -- ABDOMINAUX — Poids du corps
  ('Planche',                       'abdos',      'poids_corps', 'temps', 'https://youtube.com/shorts/hvIcEUEeUAQ'),
  ('Planche latérale',              'abdos',      'poids_corps', 'temps', 'https://youtube.com/shorts/a7PIP2WHuKw'),
  ('Sit ups',                       'abdos',      'poids_corps', 'reps',  'https://youtube.com/shorts/o08gSFhxybs'),
  ('Relevés de jambes tendues',    'abdos',      'poids_corps', 'reps',  'https://youtube.com/shorts/DDma0FaSw0s'),
  ('Gainage latéral dynamique',    'abdos',      'poids_corps', 'reps',  'https://youtube.com/shorts/UYBKvf2YWtw'),
  ('Hollow crunch',                 'abdos',      'poids_corps', 'reps',  'https://youtu.be/zdHelE7DHwI'),
  ('Hollow leg raises',             'abdos',      'poids_corps', 'reps',  'https://youtu.be/94s-iYRBv5Y'),
  ('Mountain climber lent',         'abdos',      'poids_corps', 'reps',  'https://youtube.com/shorts/unaph55D7w4'),
  ('Copenhagen plank',              'abdos',      'poids_corps', 'temps', 'https://youtube.com/shorts/dC5g-x6iM0A'),
  ('Star plank',                    'abdos',      'poids_corps', 'temps', 'https://youtube.com/shorts/fcq5CLp25Lg'),
  ('Bird dog',                      'abdos',      'poids_corps', 'reps',  'https://youtube.com/shorts/YO9bbyrgJkI'),
  ('Dead bug',                      'abdos',      'poids_corps', 'reps',  'https://youtube.com/shorts/_IJiWSd8VM0'),

  -- ABDOMINAUX — TRX
  ('Abdos au TRX',                  'abdos',      'trx',         'reps',  'https://youtu.be/S1dYjrDxBN4'),

  -- CARDIO — Poids du corps
  ('Jumping jacks',                 'cardio',     'poids_corps', 'reps',  'https://www.youtube.com/watch?v=c4DAnQ6DtF8'),
  ('Down up',                       'cardio',     'poids_corps', 'reps',  'https://youtube.com/shorts/-N_tQKTew2k'),
  ('Burpees',                       'cardio',     'poids_corps', 'reps',  'https://www.youtube.com/watch?v=TU8QYVW0gDU'),
  ('Mountain climbers',             'cardio',     'poids_corps', 'reps',  'https://youtube.com/shorts/7W4JEfEKuC4'),
  ('Step up',                       'cardio',     'poids_corps', 'reps',  'https://youtube.com/shorts/S9uzCELLo_0'),
  ('Bear crawl',                    'cardio',     'poids_corps', 'reps',  'https://youtube.com/shorts/2gt9o6Ne9rU')

) AS v(nom, muscle_principal, equipement, type_effort, youtube_url)
WHERE NOT EXISTS (
  SELECT 1 FROM exercices_bdd WHERE exercices_bdd.nom = v.nom
);
