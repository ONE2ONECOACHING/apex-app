// APEX APP — Edge Function : send-push
// Envoie une notification push à tous les appareils d'un profil

import webpush from "npm:web-push@3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY          = Deno.env.get("SUPABASE_ANON_KEY")!;
const CRON_SECRET       = Deno.env.get("CRON_SECRET") || "";

webpush.setVapidDetails(
  "mailto:contact@one2onecoaching.fr",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Authentification ────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") || "";
  const token      = authHeader.replace("Bearer ", "").trim();

  // 1. Appel interne depuis les crons (CRON_SECRET)
  const isCron = CRON_SECRET && token === CRON_SECRET;

  // 2. Appel depuis l'app coach (JWT utilisateur Supabase)
  if (!isCron) {
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const { error: authErr } = await createClient(SUPABASE_URL, ANON_KEY)
      .auth.getUser(token);
    if (authErr) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  const { profileId, title, body, url } = await req.json();
  if (!profileId || !title) {
    return new Response("Missing params", { status: 400, headers: corsHeaders });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("*")
    .eq("profile_id", profileId);

  let sent = 0;
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title, body, url: url || "/" })
      );
      sent++;
    } catch (e: any) {
      // Supprimer les abonnements expirés
      if (e.statusCode === 410 || e.statusCode === 404) {
        await sb.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
