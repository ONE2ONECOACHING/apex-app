// APEX APP — Edge Function : cron-notifications
// Tourne toutes les heures — vérifie qui doit recevoir une notif et l'envoie
// Heures en UTC+2 (France) — ajuster TZ_OFFSET si besoin

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY         = Deno.env.get("SUPABASE_ANON_KEY")!;
const TZ_OFFSET        = 2; // UTC+2 (France heure d'été — mettre 1 en hiver)

async function sendPush(profileId: string, title: string, body: string, url: string) {
  await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({ profileId, title, body, url })
  });
}

async function alreadySent(sb: any, profileId: string, type: string, dateRef: string) {
  const { data } = await sb
    .from("push_notifications_log")
    .select("id")
    .eq("profile_id", profileId)
    .eq("type", type)
    .eq("date_ref", dateRef)
    .maybeSingle();
  return !!data;
}

async function logSent(sb: any, profileId: string, type: string, dateRef: string) {
  await sb.from("push_notifications_log")
    .insert({ profile_id: profileId, type, date_ref: dateRef })
    .catch(() => {});
}

Deno.serve(async (_req) => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const now         = new Date();
  const localHour   = (now.getUTCHours() + TZ_OFFSET) % 24;
  const localDay    = now.getDay(); // 0=Dim, 1=Lun ... 6=Sam
  const todayStr    = now.toISOString().split("T")[0];

  const results = { bilan: 0, logbook: 0, habitudes: 0, bilan_rappel: 0 };

  // ── 1. BILAN ─────────────────────────────────────────────────────────────
  const { data: assignations } = await sb
    .from("bilan_assignations")
    .select("client_id, jour_envoi, heure_envoi")
    .eq("actif", true);

  for (const asgn of assignations || []) {
    const jourEnvoi  = asgn.jour_envoi  ?? 6;
    const [hh]       = (asgn.heure_envoi ?? "08:00").split(":").map(Number);
    if (localDay !== jourEnvoi || localHour !== hh) continue;

    // Vérifier bilan en attente
    const { data: pending } = await sb
      .from("bilan_instances")
      .select("id")
      .eq("client_id", asgn.client_id)
      .eq("statut", "en_attente")
      .limit(1);
    if (!pending?.length) continue;

    if (await alreadySent(sb, asgn.client_id, "bilan", todayStr)) continue;

    await sendPush(asgn.client_id, "📝 Bilan hebdomadaire", "Ton bilan de la semaine t'attend !", "#client-bilan");
    await logSent(sb, asgn.client_id, "bilan", todayStr);
    results.bilan++;
  }

  // ── 2. LOGBOOK (20h locale) ───────────────────────────────────────────────
  if (localHour === 20) {
    const { data: clients } = await sb
      .from("profiles")
      .select("id")
      .eq("role", "client")
      .neq("actif", false);

    for (const client of clients || []) {
      // Moins de 3 repas enregistrés aujourd'hui ?
      const { data: entries } = await sb
        .from("journal_entries")
        .select("id")
        .eq("profile_id", client.id)
        .eq("date_entree", todayStr);
      if ((entries?.length ?? 0) >= 3) continue;

      if (await alreadySent(sb, client.id, "logbook", todayStr)) continue;

      await sendPush(client.id, "📖 Logbook", "N'oublie pas de remplir ton journal alimentaire !", "#logbook");
      await logSent(sb, client.id, "logbook", todayStr);
      results.logbook++;
    }
  }

  // ── 3. HABITUDES (21h locale) ─────────────────────────────────────────────
  if (localHour === 21) {
    const { data: clients } = await sb
      .from("profiles")
      .select("id")
      .eq("role", "client")
      .neq("actif", false);

    for (const client of clients || []) {
      const { data: habitudes } = await sb
        .from("habitudes_config")
        .select("id")
        .eq("profile_id", client.id)
        .eq("actif", true);
      if (!habitudes?.length) continue;

      const { data: journal } = await sb
        .from("habitudes_journal")
        .select("habitude_id, checked")
        .eq("profile_id", client.id)
        .eq("date_entree", todayStr);

      const checkedIds = (journal || []).filter((j: any) => j.checked).map((j: any) => j.habitude_id);
      if (habitudes.every((h: any) => checkedIds.includes(h.id))) continue;

      if (await alreadySent(sb, client.id, "habitudes", todayStr)) continue;

      const done  = checkedIds.length;
      const total = habitudes.length;
      await sendPush(client.id, "✅ Habitudes", `${done}/${total} habitudes cochées — encore un effort !`, "#dashboard");
      await logSent(sb, client.id, "habitudes", todayStr);
      results.habitudes++;
    }
  }

  // ── 4. RAPPEL BILAN — DIMANCHE 21H ───────────────────────────────────────
  // Notifie tous les clients ayant un bilan encore en attente cette semaine
  if (localDay === 0 && localHour === 21) {
    // Calculer le lundi de la semaine en cours (UTC)
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
    const semaineStr = monday.toISOString().split("T")[0];

    const { data: pendingInstances } = await sb
      .from("bilan_instances")
      .select("client_id")
      .eq("statut", "en_attente")
      .eq("semaine", semaineStr);

    for (const inst of (pendingInstances || [])) {
      if (await alreadySent(sb, inst.client_id, "bilan_rappel_dimanche", semaineStr)) continue;

      await sendPush(
        inst.client_id,
        "⏰ Bilan de la semaine",
        "Tu n'as pas encore complété ton bilan — il reste ce soir !",
        "#client-bilan"
      );
      await logSent(sb, inst.client_id, "bilan_rappel_dimanche", semaineStr);
      results.bilan_rappel++;
    }
  }

  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { "Content-Type": "application/json" }
  });
});
