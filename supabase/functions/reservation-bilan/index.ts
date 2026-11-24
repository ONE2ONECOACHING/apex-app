// APEX APP — Edge Function : reservation-bilan
// Appelée par la page publique bilan.html (prospects, sans compte).
//   GET  → créneaux libres pour le bilan + séance d'essai (1 h), de demain à J+7
//   POST → { debut, prenom, nom, telephone, email, source, site } : réserve, et
//          renvoie le jeton du questionnaire d'audit (page audit.html?j=…)
// Tout le calcul est dans la base (fonctions creneaux_bilan_libres et
// reserver_bilan, réservées à la clé de service). La page ne voit que des
// horaires, jamais l'agenda.
// « Verify JWT » doit être désactivé : les prospects n'ont pas de compte.
// Notification aux deux gérants à chaque réservation (send-push, CRON_SECRET).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET      = Deno.env.get("CRON_SECRET") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const quand = (iso: string) => new Date(iso).toLocaleString("fr-FR", {
  timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (req.method === "GET") {
    const { data, error } = await sb.rpc("creneaux_bilan_libres");
    if (error) return json({ error: "indisponible" }, 500);
    return json({ creneaux: (data || []).map((c: { debut: string }) => c.debut) });
  }

  if (req.method !== "POST") return json({ error: "méthode" }, 405);

  let d: Record<string, unknown>;
  try { d = await req.json(); } catch (_) { return json({ error: "champs" }, 400); }
  if (!d || typeof d !== "object") return json({ error: "champs" }, 400);
  // Champ caché « site » : rempli seulement par les robots
  if (d.site) return json({ ok: true });

  const debut = typeof d.debut === "string" ? new Date(d.debut) : null;
  if (!debut || isNaN(debut.getTime())) return json({ error: "champs" }, 400);

  // Frein anti-abus : pas plus de 15 réservations en ligne par heure
  const { count } = await sb.from("agenda_creneaux").select("id", { count: "exact", head: true })
    .eq("type", "prospect").is("cree_par", null).gte("cree_le", new Date(Date.now() - 3600e3).toISOString());
  if ((count || 0) >= 15) return json({ error: "trop" }, 429);

  const { data: r, error } = await sb.rpc("reserver_bilan", {
    p_debut: debut.toISOString(),
    p_prenom: String(d.prenom ?? ""), p_nom: String(d.nom ?? ""),
    p_telephone: String(d.telephone ?? ""), p_email: String(d.email ?? ""),
    p_source: String(d.source ?? "meta"),
  });
  if (error) return json({ error: "indisponible" }, 500);
  if (!r?.ok) return json(r || { error: "indisponible" }, r?.erreur === "pris" ? 409 : 400);

  // Notification aux gérants
  const { data: gerants } = await sb.from("profiles").select("id, prenom").eq("role", "coach").eq("is_gerant", true);
  const coach = (gerants || []).find((g) => g.id === r.coach_id)?.prenom || "";
  const qui = `${String(d.prenom ?? "").trim()} ${String(d.nom ?? "").trim()}`.trim();
  for (const g of gerants || []) {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CRON_SECRET}` },
        body: JSON.stringify({
          profileId: g.id,
          title: "📅 Bilan réservé en ligne",
          body: `${qui} · ${quand(r.debut)}${coach ? " avec " + coach : ""}`,
          url: `/#coach-crm?lead=${r.lead_id}`,
        }),
      });
    } catch (_) { /* gérant sans téléphone abonné */ }
  }
  // Lien du questionnaire d'audit (le même tant qu'il n'est pas rempli)
  let jeton: string | null = null;
  const { data: dejaAudit } = await sb.from("audits").select("jeton").eq("lead_id", r.lead_id)
    .eq("statut", "attente").order("cree_le", { ascending: false }).limit(1).maybeSingle();
  if (dejaAudit) jeton = dejaAudit.jeton;
  else {
    const { data: nv } = await sb.from("audits").insert({ lead_id: r.lead_id }).select("jeton").single();
    jeton = nv?.jeton || null;
  }
  return json({ ok: true, debut: r.debut, questionnaire: jeton });
});
