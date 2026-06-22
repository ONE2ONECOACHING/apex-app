// APEX APP — Edge Function : cron-notifications
// Tourne toutes les heures — vérifie qui doit recevoir une notif et l'envoie
// Appelable uniquement avec Authorization: Bearer CRON_SECRET

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET      = Deno.env.get("CRON_SECRET") || "";

// ── Timezone France dynamique (heure d'été / heure d'hiver) ─────────────────
function getLastSundayUTC(year: number, month: number): Date {
  // Dernier jour du mois
  const d = new Date(Date.UTC(year, month + 1, 0));
  // Reculer jusqu'au dimanche (getUTCDay() === 0)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

function getFranceOffset(now: Date): number {
  // Heure d'été : dernier dimanche de mars → dernier dimanche d'octobre (à 2h UTC)
  const year        = now.getUTCFullYear();
  const dstStart    = getLastSundayUTC(year, 2);  // Mars (mois 2, 0-indexé)
  dstStart.setUTCHours(1); // passage à 2h locale = 1h UTC
  const dstEnd      = getLastSundayUTC(year, 9);  // Octobre (mois 9)
  dstEnd.setUTCHours(1);
  return now >= dstStart && now < dstEnd ? 2 : 1;
}
// ─────────────────────────────────────────────────────────────────────────────

async function sendPush(profileId: string, title: string, body: string, url: string) {
  await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CRON_SECRET}`  // Appel interne sécurisé
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
  try {
    await sb.from("push_notifications_log")
      .insert({ profile_id: profileId, type, date_ref: dateRef });
  } catch (_) {}
}

Deno.serve(async (req) => {
  // ── Guard : accès uniquement via CRON_SECRET ───────────────────────────────
  const authHeader = req.headers.get("Authorization") || "";
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const now       = new Date();
  const tzOffset  = getFranceOffset(now);                    // Dynamique été/hiver
  const localHour = (now.getUTCHours() + tzOffset) % 24;
  const localDay  = new Date(now.getTime() + tzOffset * 3600000).getDay();
  const todayStr  = new Date(now.getTime() + tzOffset * 3600000)
    .toISOString().split("T")[0];

  const results = { bilan: 0, logbook: 0, habitudes: 0, bilan_rappel: 0 };

  // ── 1. BILAN ─────────────────────────────────────────────────────────────
  const { data: assignations } = await sb
    .from("bilan_assignations")
    .select("client_id, template_id, coach_id, jour_envoi, heure_envoi")
    .eq("actif", true);

  // Lundi de la semaine courante (clé semaine des instances)
  const localNowForBilan = new Date(now.getTime() + tzOffset * 3600000);
  const mondayBilan = new Date(localNowForBilan);
  mondayBilan.setUTCDate(localNowForBilan.getUTCDate() - ((localNowForBilan.getUTCDay() + 6) % 7));
  const semaineActuelle = mondayBilan.toISOString().split("T")[0];

  for (const asgn of assignations || []) {
    const jourEnvoi  = asgn.jour_envoi  ?? 6;
    const [hh, mm]   = (asgn.heure_envoi ?? "08:00").split(":").map(Number);

    // Heure de déclenchement cette semaine = jour_envoi à heure_envoi
    // offset depuis lundi : lundi=0 … dimanche=6
    const triggerOffset = (jourEnvoi === 0 ? 6 : jourEnvoi - 1);
    const trigger = new Date(mondayBilan);
    trigger.setUTCDate(mondayBilan.getUTCDate() + triggerOffset);
    trigger.setUTCHours(hh, mm || 0, 0, 0);

    // Pas encore l'heure de déclenchement → on attend (prochain run rattrapera)
    if (localNowForBilan < trigger) continue;

    // Déjà notifié cette semaine → skip (dédup par semaine, pas par heure)
    if (await alreadySent(sb, asgn.client_id, "bilan", semaineActuelle)) continue;

    // Créer l'instance si elle n'existe pas encore
    const { data: existing } = await sb
      .from("bilan_instances")
      .select("id")
      .eq("client_id", asgn.client_id)
      .eq("semaine", semaineActuelle)
      .maybeSingle();

    if (!existing) {
      const { data: tmpl } = await sb
        .from("bilan_templates")
        .select("questions")
        .eq("id", asgn.template_id)
        .single();
      await sb.from("bilan_instances").insert({
        client_id:          asgn.client_id,
        template_id:        asgn.template_id,
        coach_id:           asgn.coach_id,
        semaine:            semaineActuelle,
        statut:             "en_attente",
        questions_snapshot: tmpl?.questions || []
      });
    }

    await sendPush(asgn.client_id, "📝 Ton bilan de la semaine", "Ton bilan est disponible — prends 2 min pour le remplir 💪", "#client-bilan");
    await logSent(sb, asgn.client_id, "bilan", semaineActuelle);
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
    // Calculer le lundi de la semaine en cours (heure locale)
    const localNow = new Date(now.getTime() + tzOffset * 3600000);
    const monday   = new Date(localNow);
    monday.setUTCDate(localNow.getUTCDate() - ((localNow.getUTCDay() + 6) % 7));
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

  return new Response(JSON.stringify({ ok: true, tzOffset, localHour, ...results }), {
    headers: { "Content-Type": "application/json" }
  });
});
