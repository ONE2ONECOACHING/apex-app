-- ============================================================
-- APEX APP — Nettoyage COMPLET des doublons de bilan (v2)
-- Garde UNE seule instance par client par semaine ISO :
--   priorité 1 : statut complété
--   priorité 2 : complété le plus récemment
--   priorité 3 : clé semaine = lundi (canonique)
-- Supprime toutes les autres. À coller dans Supabase SQL Editor.
-- ============================================================

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, date_trunc('week', semaine)
      ORDER BY
        (statut = 'complete') DESC,                  -- complété d'abord
        completed_at DESC NULLS LAST,                -- le plus récent
        (EXTRACT(ISODOW FROM semaine) = 1) DESC,     -- clé lundi
        id
    ) AS rn
  FROM bilan_instances
)
DELETE FROM bilan_instances
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
