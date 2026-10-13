// APEX APP — Edge Function : message-push
// Notifie le(s) destinataire(s) d'un nouveau message de la messagerie.
//   { messageId }  — appelée par l'auteur juste après l'envoi.
// Destinataires :
//   auteur coach  → le client
//   client, canal « suivi »  → son coach référent
//   client, canal « equipe » → le coach de son prochain rendez-vous, sinon son référent

import webpush from "npm:web-push@3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY          = Deno.env.get("SUPABASE_ANON_KEY")!;

webpush.setVapidDetails("mailto:contact@one2onecoaching.fr", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!token) return json({ error: "Non autorisé" }, 401);
    const { data: { user }, error: authErr } = await createClient(SUPABASE_URL, ANON_KEY).auth.getUser(token);
    if (authErr || !user) return json({ error: "Non autorisé" }, 401);

    const { messageId } = await req.json();
    if (!messageId) return json({ error: "messageId requis" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: msg } = await sb.from("messages")
      .select("id, client_id, canal, auteur_id, texte, piece_type, supprime")
      .eq("id", messageId).single();
    // Seul l'auteur peut déclencher la notification de son message
    if (!msg || msg.auteur_id !== user.id || msg.supprime) return json({ error: "Accès refusé" }, 403);

    const { data: client } = await sb.from("profiles")
      .select("id, prenom, nom, coach_referent_id").eq("id", msg.client_id).single();
    const { data: auteur } = await sb.from("profiles")
      .select("prenom, role").eq("id", user.id).single();
    if (!client || !auteur) return json({ error: "Introuvable" }, 404);

    let destinataires: string[] = [];
    let url = "/#messages";
    if (auteur.role === "coach") {
      destinataires = [client.id];
    } else {
      url = `/#coach-messagerie?c=${client.id}&k=${msg.canal}`;
      if (msg.canal === "equipe") {
        const { data: prochain } = await sb.from("agenda_creneaux")
          .select("coach_id").eq("client_id", client.id).eq("type", "coaching")
          .gte("debut", new Date().toISOString()).order("debut").limit(1).maybeSingle();
        const coach = prochain?.coach_id || client.coach_referent_id;
        if (coach) destinataires = [coach];
      } else if (client.coach_referent_id) {
        destinataires = [client.coach_referent_id];
      }
    }
    destinataires = destinataires.filter(id => id && id !== user.id);
    if (!destinataires.length) return json({ sent: 0 });

    const titre = auteur.role === "coach"
      ? `💬 ${auteur.prenom || "Ton coach"}`
      : `💬 ${[client.prenom, client.nom].filter(Boolean).join(" ") || "Client"}`;
    const corps = msg.piece_type === "photo" ? "📷 Photo"
      : msg.piece_type === "vocal" ? "🎤 Message vocal"
      : (msg.texte || "").slice(0, 120);

    const { data: subs } = await sb.from("push_subscriptions").select("*").in("profile_id", destinataires);
    let sent = 0;
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({ title: titre, body: corps, url })
        );
        sent++;
      } catch (e: any) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          await sb.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
    return json({ sent });
  } catch (err: any) {
    return json({ error: err.message }, 400);
  }
});
