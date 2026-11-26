// APEX APP — Edge Function : lead-entrant
// Appelée par Make à chaque nouveau lead Meta (module HTTP « Make a request »,
// méthode POST, corps JSON), avec l'en-tête  x-lead-secret: <LEAD_SECRET>.
// Enregistre le lead dans public.leads (pas de doublon : même meta_lead_id =
// lead déjà reçu) et prévient les gérants par notification.
// « Verify JWT » doit être désactivé (Make n'a pas de compte Supabase) :
// c'est le secret LEAD_SECRET qui protège la fonction.
//
// Champs acceptés (noms français ou noms Meta) :
//   prenom | first_name, nom | last_name, full_name (coupé en prénom / nom),
//   email, telephone | phone_number, campagne | campaign_name,
//   ensemble_pub | adset_name, publicite | ad_name, meta_lead_id | leadgen_id | id.
// Tout autre champ est gardé tel quel dans « formulaire » (questions à venir).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LEAD_SECRET      = Deno.env.get("LEAD_SECRET") || "";
const CRON_SECRET      = Deno.env.get("CRON_SECRET") || "";

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

const texte = (v: unknown) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, 300) : null;
};

const CONNUS = ["prenom", "first_name", "nom", "last_name", "full_name", "email", "telephone", "phone_number",
  "campagne", "campaign_name", "ensemble_pub", "adset_name", "publicite", "ad_name", "meta_lead_id", "leadgen_id", "id"];

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST attendu" }, 405);
  if (!LEAD_SECRET || req.headers.get("x-lead-secret") !== LEAD_SECRET) return json({ error: "Forbidden" }, 403);

  let d: Record<string, unknown>;
  try { d = await req.json(); } catch (_) { return json({ error: "JSON invalide" }, 400); }
  if (!d || typeof d !== "object") return json({ error: "JSON invalide" }, 400);

  let prenom = texte(d.prenom ?? d.first_name);
  let nom = texte(d.nom ?? d.last_name);
  const complet = texte(d.full_name);
  if (!prenom && !nom && complet) {
    const morceaux = complet.split(/\s+/);
    prenom = morceaux.shift() || null;
    nom = morceaux.join(" ") || null;
  }
  const lead = {
    source: "meta",
    meta_lead_id: texte(d.meta_lead_id ?? d.leadgen_id ?? d.id),
    prenom, nom,
    email: texte(d.email)?.toLowerCase() || null,
    telephone: texte(d.telephone ?? d.phone_number),
    campagne: texte(d.campagne ?? d.campaign_name),
    ensemble_pub: texte(d.ensemble_pub ?? d.adset_name),
    publicite: texte(d.publicite ?? d.ad_name),
    formulaire: Object.fromEntries(Object.entries(d).filter(([k]) => !CONNUS.includes(k)).slice(0, 30)),
  };
  if (!lead.prenom && !lead.nom && !lead.email && !lead.telephone) return json({ error: "Lead vide" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  if (lead.meta_lead_id) {
    const { data: deja } = await sb.from("leads").select("id").eq("meta_lead_id", lead.meta_lead_id).maybeSingle();
    if (deja) return json({ ok: true, doublon: true, id: deja.id });
  }
  const { data: cree, error } = await sb.from("leads").insert(lead).select("id").single();
  if (error) return json({ error: error.message }, 500);

  // Notification aux gérants
  const { data: gerants } = await sb.from("profiles").select("id").eq("role", "coach").eq("is_gerant", true);
  const qui = `${lead.prenom || ""} ${lead.nom || ""}`.trim() || lead.email || lead.telephone || "Nouveau lead";
  let envoyes = 0;
  for (const g of gerants || []) {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CRON_SECRET}` },
        body: JSON.stringify({
          profileId: g.id,
          title: "🎯 Nouveau lead",
          body: `${qui}${lead.publicite ? " · " + lead.publicite : ""}`,
          url: `/#coach-crm?lead=${cree.id}`,
        }),
      });
      envoyes++;
    } catch (_) { /* gérant sans téléphone abonné */ }
  }
  return json({ ok: true, id: cree.id, notifications: envoyes });
});
