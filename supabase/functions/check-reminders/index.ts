// APEX APP — Edge Function : check-reminders
// Appelée par pg_cron toutes les heures
// Gère : bilan hebdo, rappel habitudes (21h), rappel logbook (21h)

import webpush from "npm:web-push@3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

webpush.setVapidDetails("mailto:contact@one2onecoaching.fr", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Envoie une push à tous les appareils d'un profil
async function pushTo(profileId: string, title: string, body: string, url = "/") {
  const { data: subs } = await sb.from("push_subscriptions").select("*").eq("profile_id", profileId);
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title, body, url })
      );
    } catch (e: any) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        await sb.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Heure courante en France (UTC+2 en été, UTC+1 en hiver)
  const now = new Date();
  const hourFR = now.getUTCHours() + 2; // approximation heure française (été)
  const todayStr = now.toISOString().slice(0, 10);

  // Récupérer tous les clients actifs
  const { data: clients } = await sb
    .from("profiles")
    .select("id, onboarding_done")
    .eq("role", "client")
    .eq("onboarding_done", true);

  let bilanSent = 0, habitudesSent = 0, logbookSent = 0;

  for (const client of clients || []) {
    const profileId = client.id;

    // ── 1. Bilan hebdomadaire ──────────────────────────────────────────────
    // Vérifie si une instance de bilan vient d'être créée pour cette semaine
    // (statut en_attente ET created_at dans la dernière heure)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const { data: newBilan } = await sb
      .from("bilan_instances")
      .select("id")
      .eq("client_id", profileId)
      .eq("statut", "en_attente")
      .gte("created_at", oneHourAgo)
      .limit(1)
      .single();

    if (newBilan) {
      await pushTo(profileId, "📝 Ton bilan hebdo t'attend !", "Prends 2 minutes pour faire le point sur ta semaine.", "/#client-bilan");
      bilanSent++;
    }

    // ── 2. Rappel habitudes à 21h ──────────────────────────────────────────
    if (hourFR === 21) {
      // Récupérer les habitudes actives du client
      const { data: habitudes } = await sb
        .from("habitudes_config")
        .select("id")
        .eq("profile_id", profileId)
        .eq("actif", true);

      if (habitudes && habitudes.length > 0) {
        // Compter celles cochées aujourd'hui
        const { count: cochees } = await sb
          .from("habitudes_journal")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", profileId)
          .eq("date_entree", todayStr)
          .eq("checked", true);

        if ((cochees || 0) < habitudes.length) {
          await pushTo(profileId, "✅ Habitudes du jour", `Tu as coché ${cochees || 0}/${habitudes.length} habitudes. Termine ta journée en beauté !`, "/#dashboard");
          habitudesSent++;
        }
      }
    }

    // ── 3. Rappel logbook à 21h ────────────────────────────────────────────
    if (hourFR === 21) {
      const { count: repas } = await sb
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId)
        .eq("date_entree", todayStr);

      if ((repas || 0) <= 1) {
        await pushTo(profileId, "🍽️ Pense à ton journal", "Tu n'as pas encore enregistré tes repas d'aujourd'hui.", "/#logbook");
        logbookSent++;
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, bilanSent, habitudesSent, logbookSent }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
