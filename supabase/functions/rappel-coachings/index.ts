// APEX APP — Edge Function : rappel-coachings
// Lancée toutes les 5 minutes (Supabase › Integrations › Cron), avec
// Authorization: Bearer CRON_SECRET. Envoie à chaque coach une notification
// une demi-heure avant ses coachings et rendez-vous prospect :
// « Tu vas coacher Marie Dupont à 18:00 ». Un duo (même coach, même heure)
// donne une seule notification avec les deux prénoms.
// agenda_creneaux.rappel_envoye_pour = heure de début déjà rappelée (pas de
// doublon ; un créneau déplacé est rappelé pour sa nouvelle heure).
// « Verify JWT » doit être désactivé (CRON_SECRET n'est pas un JWT).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET      = Deno.env.get("CRON_SECRET") || "";
const AVANCE_MIN       = 32;   // rappel quand le début est dans les 32 prochaines minutes

const heure = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") || "";
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const maintenant = new Date();
  const limite = new Date(maintenant.getTime() + AVANCE_MIN * 60000);

  const { data: creneaux, error } = await sb
    .from("agenda_creneaux")
    .select("id, coach_id, client_id, type, debut, prospect_nom, rappel_envoye_pour, client:profiles!agenda_creneaux_client_id_fkey(prenom, nom)")
    .in("type", ["coaching", "prospect"])
    .gt("debut", maintenant.toISOString())
    .lte("debut", limite.toISOString());
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  // Pas encore rappelés pour cette heure de début, regroupés par coach et par heure
  const aRappeler = (creneaux || []).filter((c: any) =>
    c.coach_id && (!c.rappel_envoye_pour || new Date(c.rappel_envoye_pour).getTime() !== new Date(c.debut).getTime()));
  const groupes = new Map<string, any[]>();
  for (const c of aRappeler) {
    const cle = `${c.coach_id}|${c.debut}`;
    groupes.set(cle, [...(groupes.get(cle) || []), c]);
  }

  let envoyes = 0;
  for (const liste of groupes.values()) {
    const { coach_id, debut } = liste[0];
    const noms = liste.map((c: any) => c.type === "prospect"
      ? `${c.prospect_nom || "un prospect"} (prospect)`
      : `${c.client?.prenom || ""} ${c.client?.nom || ""}`.trim() || "un client");
    const qui = noms.length > 1 ? noms.slice(0, -1).join(", ") + " et " + noms[noms.length - 1] : noms[0];
    // Rappel noté d'abord : un envoi raté ne se répète pas toutes les 5 minutes
    const { error: majErr } = await sb.from("agenda_creneaux").update({ rappel_envoye_pour: debut }).in("id", liste.map((c: any) => c.id));
    if (majErr) continue;   // ex. colonne absente (script SQL pas exécuté) : ne rien envoyer plutôt qu'en boucle
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CRON_SECRET}` },
        body: JSON.stringify({
          profileId: coach_id,
          title: `Coaching à ${heure(debut)}`,
          body: `Tu vas coacher ${qui} à ${heure(debut)}.`,
          url: "/#coach-agenda",
        }),
      });
      envoyes++;
    } catch (_) { /* coach sans téléphone abonné : rien à faire */ }
  }

  return new Response(JSON.stringify({ creneaux: aRappeler.length, notifications: envoyes }), {
    headers: { "Content-Type": "application/json" },
  });
});
