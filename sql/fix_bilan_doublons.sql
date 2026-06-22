-- ============================================================
-- APEX APP — Nettoyage des doublons de bilan
-- Cause : deux clés "semaine" différentes (samedi vs lundi)
-- créaient deux instances pour la même semaine.
-- À coller dans Supabase SQL Editor et Run (une seule fois).
-- ============================================================

-- 1) Si un bilan est COMPLÉTÉ et un autre EN ATTENTE dans la même semaine
--    → supprimer l'en_attente (on garde la réponse du client)
DELETE FROM bilan_instances bi
WHERE bi.statut = 'en_attente'
  AND EXISTS (
    SELECT 1 FROM bilan_instances c
    WHERE c.client_id = bi.client_id
      AND c.statut = 'complete'
      AND date_trunc('week', c.semaine) = date_trunc('week', bi.semaine)
  );

-- 2) Si DEUX bilans EN ATTENTE dans la même semaine
--    → garder celui du lundi, supprimer l'autre (samedi)
DELETE FROM bilan_instances bi
WHERE bi.statut = 'en_attente'
  AND EXTRACT(ISODOW FROM bi.semaine) <> 1   -- pas un lundi
  AND EXISTS (
    SELECT 1 FROM bilan_instances m
    WHERE m.client_id = bi.client_id
      AND m.statut = 'en_attente'
      AND date_trunc('week', m.semaine) = date_trunc('week', bi.semaine)
      AND m.id <> bi.id
  );
