-- Migration : décalage de déblocage par client (formation déjà avancée sur Podia)
-- unlock_offset = jours à retrancher aux unlock_day des modules pour ce client.
ALTER TABLE formation_assignations
  ADD COLUMN IF NOT EXISTS unlock_offset INT DEFAULT 0;
