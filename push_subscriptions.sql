-- APEX APP — Push Notifications
-- Coller dans Supabase SQL Editor

-- Table des abonnements push (un par appareil)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint    TEXT NOT NULL,
  keys        JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ps_self" ON push_subscriptions
  FOR ALL USING (profile_id = auth.uid());

-- Table de log (évite les doublons de notifs)
CREATE TABLE IF NOT EXISTS push_notifications_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL,   -- 'bilan' | 'logbook' | 'habitudes'
  date_ref    DATE DEFAULT CURRENT_DATE,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, type, date_ref)
);

ALTER TABLE push_notifications_log ENABLE ROW LEVEL SECURITY;

-- Seul le service role peut écrire dans le log (via edge functions)
CREATE POLICY "pnl_service_only" ON push_notifications_log
  FOR ALL USING (false);
