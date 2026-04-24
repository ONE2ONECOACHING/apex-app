// APEX APP — Edge Function : send-push
// Envoie une notification push à tous les appareils d'un profil

import webpush from "npm:web-push@3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(
  "mailto:contact@one2onecoaching.fr",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" }
    });
  }

  const { profileId, title, body, url } = await req.json();
  if (!profileId || !title) return new Response("Missing params", { status: 400 });

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
    headers: { "Content-Type": "application/json" }
  });
});
