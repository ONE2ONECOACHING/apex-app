// APEX APP — Edge Function : compte Stripe du studio (gérants uniquement)
//   { action: 'clients' }                 → tous les clients Stripe (id, nom, email)
//   { action: 'fiche', customer }         → moyens de paiement, abonnements, derniers paiements
//   { action: 'etats', customers: [...] } → pour chaque client : carte enregistrée ? abonnement ?
//   { action: 'prelever', client_id, mois: 'AAAA-MM', montant, detail }
//                                         → débite la carte enregistrée (mois terminé seulement) ;
//                                           refus : lien de paiement Stripe (24 h) à envoyer
//   { action: 'nouveau_lien', id }        → nouveau lien pour un prélèvement refusé
//   { action: 'actualiser', ids: [...] }  → relit l'état des prélèvements en cours ou refusés
// Les prélèvements sont notés dans la table prelevements (écrite seulement ici).
// Secret à poser dans Supabase › Edge Functions › Secrets : STRIPE_SECRET_KEY
// (clé limitée « rk_… » : lecture des clients, moyens de paiement, abonnements
// et paiements ; écriture des PaymentIntents et des sessions Checkout).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const CUS = /^cus_[A-Za-z0-9]+$/;

async function stripe(chemin: string, params: Record<string, string> = {}) {
  const cle = Deno.env.get('STRIPE_SECRET_KEY');
  if (!cle) throw new Error('Clé Stripe absente : ajoute le secret STRIPE_SECRET_KEY dans Supabase.');
  const url = new URL('https://api.stripe.com/v1/' + chemin);
  for (const [k, v] of Object.entries(params)) url.searchParams.append(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${cle}` } });
  const json = await res.json();
  if (!res.ok) throw new Error('Stripe : ' + (json.error?.message || res.status));
  return json;
}

// Écriture : renvoie la réponse même en cas d'erreur (un refus de carte arrive en 402)
async function stripePost(chemin: string, params: Record<string, string>, cleIdem?: string) {
  const cle = Deno.env.get('STRIPE_SECRET_KEY');
  if (!cle) throw new Error('Clé Stripe absente : ajoute le secret STRIPE_SECRET_KEY dans Supabase.');
  const res = await fetch('https://api.stripe.com/v1/' + chemin, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cle}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(cleIdem ? { 'Idempotency-Key': cleIdem } : {}),
    },
    body: new URLSearchParams(params),
  });
  return { ok: res.ok, json: await res.json() };
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const URL_APP = 'https://app.one2onecoaching.fr/';

// Lien de paiement (session Checkout, valable 24 h) : le client paie et sa carte est gardée
async function creerLien(cus: string, centimes: number, description: string, prelevementId: string) {
  const { ok, json } = await stripePost('checkout/sessions', {
    mode: 'payment',
    customer: cus,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(centimes),
    'line_items[0][price_data][product_data][name]': description,
    'payment_intent_data[description]': description,
    'payment_intent_data[setup_future_usage]': 'off_session',
    'payment_intent_data[metadata][prelevement_id]': prelevementId,
    'metadata[prelevement_id]': prelevementId,
    success_url: URL_APP,
    cancel_url: URL_APP,
  });
  if (!ok) throw new Error('Lien de paiement : ' + (json.error?.message || 'erreur Stripe'));
  return { lien_session: json.id, lien_url: json.url, lien_expire: new Date(json.expires_at * 1000).toISOString() };
}

async function expirerLien(session: string | null) {
  if (session) await stripePost(`checkout/sessions/${session}/expire`, {}).catch(() => null);
}

// Toutes les pages d'une liste Stripe (100 par page)
async function tout(chemin: string, params: Record<string, string> = {}) {
  const lignes: any[] = [];
  let apres = '';
  for (let i = 0; i < 50; i++) {
    const page = await stripe(chemin, { ...params, limit: '100', ...(apres ? { starting_after: apres } : {}) });
    lignes.push(...page.data);
    if (!page.has_more || !page.data.length) break;
    apres = page.data[page.data.length - 1].id;
  }
  return lignes;
}

function moyen(pm: any) {
  if (pm.type === 'card') return { type: 'carte', marque: pm.card.brand, fin: pm.card.last4, expire: `${String(pm.card.exp_month).padStart(2, '0')}/${pm.card.exp_year}` };
  if (pm.type === 'sepa_debit') return { type: 'sepa', marque: 'Prélèvement SEPA', fin: pm.sepa_debit.last4 };
  return { type: pm.type };
}

function abonnement(s: any) {
  return {
    id: s.id,
    statut: s.status,
    fin_annoncee: s.cancel_at_period_end,
    prochaine: s.current_period_end ?? s.items?.data?.[0]?.current_period_end ?? null,
    lignes: (s.items?.data || []).map((it: any) => ({
      nom: it.price?.nickname || null,
      montant: it.price?.unit_amount != null ? it.price.unit_amount * (it.quantity || 1) / 100 : null,
      rythme: it.price?.recurring ? `${it.price.recurring.interval_count > 1 ? it.price.recurring.interval_count + ' ' : ''}${it.price.recurring.interval}` : null,
    })),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Non autorisé');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !caller) throw new Error('Non autorisé');
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles').select('role, is_gerant').eq('id', caller.id).single();
    if (!callerProfile || callerProfile.role !== 'coach' || !callerProfile.is_gerant) {
      throw new Error('Réservé aux gérants.');
    }

    const body = await req.json();
    let resultat: unknown;

    if (body.action === 'clients') {
      const clients = await tout('customers');
      resultat = clients.filter(c => !c.deleted).map(c => ({ id: c.id, nom: c.name || '', email: (c.email || '').toLowerCase(), cree: c.created }));

    } else if (body.action === 'fiche') {
      const cus = String(body.customer || '');
      if (!CUS.test(cus)) throw new Error('Client Stripe invalide');
      const [client, moyens, abos, paiements] = await Promise.all([
        stripe('customers/' + cus),
        stripe(`customers/${cus}/payment_methods`, { limit: '10' }),
        stripe('subscriptions', { customer: cus, status: 'all', limit: '10' }),
        stripe('charges', { customer: cus, limit: '10' }),
      ]);
      if (client.deleted) throw new Error('Ce client a été supprimé dans Stripe');
      const defaut = client.invoice_settings?.default_payment_method;
      resultat = {
        id: client.id, nom: client.name || '', email: client.email || '',
        moyens: moyens.data.map((pm: any) => ({ ...moyen(pm), defaut: pm.id === defaut })),
        abonnements: abos.data.map(abonnement),
        paiements: paiements.data.map((c: any) => ({
          date: c.created, montant: c.amount / 100, rembourse: c.amount_refunded / 100,
          statut: c.status, description: c.description || '', erreur: c.failure_message || '',
        })),
      };

    } else if (body.action === 'etats') {
      const ids: string[] = (Array.isArray(body.customers) ? body.customers : []).filter((x: unknown) => CUS.test(String(x)));
      // Abonnements : une seule liste pour tout le compte ; moyens de paiement : un appel par client
      const abos = await tout('subscriptions', { status: 'all' });
      const etats: Record<string, unknown> = {};
      for (let i = 0; i < ids.length; i += 10) {
        await Promise.all(ids.slice(i, i + 10).map(async id => {
          const pm = await stripe(`customers/${id}/payment_methods`, { limit: '1' }).catch(() => ({ data: [] }));
          const siens = abos.filter(s => s.customer === id && !['canceled', 'incomplete_expired'].includes(s.status));
          etats[id] = {
            moyen: pm.data[0] ? moyen(pm.data[0]) : null,
            abonnements: siens.map((s: any) => ({ statut: s.status, montant: (s.items?.data || []).reduce((t: number, it: any) => t + (it.price?.unit_amount || 0) * (it.quantity || 1), 0) / 100 })),
          };
        }));
      }
      resultat = etats;

    } else if (body.action === 'prelever') {
      const clientId = String(body.client_id || '');
      const mois = String(body.mois || '');
      if (!/^\d{4}-\d{2}$/.test(mois)) throw new Error('Mois invalide');
      const moisActuel = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' }).format(new Date());
      if (mois >= moisActuel) throw new Error('On ne prélève qu\'un mois terminé.');
      const montant = Math.round(Number(body.montant) * 100) / 100;
      if (!(montant > 0) || montant > 5000) throw new Error('Montant invalide');
      const centimes = Math.round(montant * 100);

      const [{ data: factu }, { data: client }] = await Promise.all([
        supabaseAdmin.from('facturation_clients').select('stripe_customer_id').eq('client_id', clientId).maybeSingle(),
        supabaseAdmin.from('profiles').select('prenom, nom, role').eq('id', clientId).maybeSingle(),
      ]);
      if (!client || client.role !== 'client') throw new Error('Client introuvable');
      const cus = factu?.stripe_customer_id;
      if (!cus) throw new Error('Ce client n\'est pas relié à Stripe.');

      const [a, m] = mois.split('-').map(Number);
      const detail = String(body.detail || '').trim().slice(0, 80);
      const description = `ONE2ONE · Séances ${MOIS[m - 1]} ${a}${detail ? ' (' + detail + ')' : ''}`;
      const clientNom = `${client.prenom || ''} ${client.nom || ''}`.trim();

      // Une ligne « en cours » d'abord : l'index unique empêche un double prélèvement
      const { data: ligne, error: insErr } = await supabaseAdmin.from('prelevements').insert({
        client_id: clientId, client_nom: clientNom, mois: `${mois}-01`, montant, description,
        stripe_customer_id: cus, cree_par: caller.id,
      }).select().single();
      if (insErr) {
        if (insErr.code === '23505') throw new Error('Ce mois est déjà prélevé (ou un prélèvement est en cours) pour ce client.');
        throw insErr;
      }
      const maj = async (champs: Record<string, unknown>) => {
        const { data } = await supabaseAdmin.from('prelevements')
          .update({ ...champs, maj_le: new Date().toISOString() }).eq('id', ligne.id).select().single();
        return data;
      };

      try {
        // Anciens liens de ce mois (refus précédents) : désactivés pour éviter un double paiement
        const { data: anciens } = await supabaseAdmin.from('prelevements')
          .select('id, lien_session').eq('client_id', clientId).eq('mois', `${mois}-01`).eq('statut', 'refuse').not('lien_session', 'is', null);
        for (const x of anciens || []) {
          await expirerLien(x.lien_session);
          await supabaseAdmin.from('prelevements').update({ lien_session: null, lien_url: null, lien_expire: null }).eq('id', x.id);
        }

        const [fiche, moyens] = await Promise.all([
          stripe('customers/' + cus),
          stripe(`customers/${cus}/payment_methods`, { limit: '10' }),
        ]);
        const defaut = fiche.invoice_settings?.default_payment_method;
        const pm = moyens.data.find((x: any) => x.id === defaut) || moyens.data[0];
        if (!pm) {
          const lien = await creerLien(cus, centimes, description, ligne.id);
          resultat = await maj({ statut: 'refuse', erreur: 'Aucune carte enregistrée', ...lien });
        } else {
          const { json } = await stripePost('payment_intents', {
            amount: String(centimes),
            currency: 'eur',
            customer: cus,
            payment_method: pm.id,
            off_session: 'true',
            confirm: 'true',
            'automatic_payment_methods[enabled]': 'true',
            'automatic_payment_methods[allow_redirects]': 'never',
            description,
            ...(fiche.email ? { receipt_email: fiche.email } : {}),
            'metadata[prelevement_id]': ligne.id,
            'metadata[client_id]': clientId,
            'metadata[mois]': mois,
          }, ligne.id);
          const pi = json.object === 'payment_intent' ? json : json.error?.payment_intent;
          if (pi?.status === 'succeeded') {
            resultat = await maj({ statut: 'reussi', stripe_payment_intent: pi.id });
          } else if (pi?.status === 'processing') {
            resultat = await maj({ stripe_payment_intent: pi.id });   // prélèvement SEPA : quelques jours
          } else {
            const erreur = json.error?.message || pi?.last_payment_error?.message || 'Paiement refusé';
            const lien = await creerLien(cus, centimes, description, ligne.id);
            resultat = await maj({ statut: 'refuse', erreur, stripe_payment_intent: pi?.id || null, ...lien });
          }
        }
      } catch (e) {
        await maj({ statut: 'refuse', erreur: e.message });
        throw e;
      }

    } else if (body.action === 'nouveau_lien') {
      const { data: p } = await supabaseAdmin.from('prelevements').select('*').eq('id', String(body.id || '')).maybeSingle();
      if (!p || p.statut !== 'refuse' || !p.stripe_customer_id) throw new Error('Prélèvement introuvable ou pas refusé');
      const { data: autre } = await supabaseAdmin.from('prelevements').select('id')
        .eq('client_id', p.client_id).eq('mois', p.mois).in('statut', ['en_cours', 'reussi']).limit(1);
      if (autre?.length) throw new Error('Ce mois a déjà été payé ou est en cours.');
      await expirerLien(p.lien_session);
      const lien = await creerLien(p.stripe_customer_id, Math.round(Number(p.montant) * 100), p.description, p.id);
      const { data } = await supabaseAdmin.from('prelevements')
        .update({ ...lien, maj_le: new Date().toISOString() }).eq('id', p.id).select().single();
      resultat = data;

    } else if (body.action === 'actualiser') {
      const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).slice(0, 200);
      const { data: lignes } = await supabaseAdmin.from('prelevements').select('*').in('id', ids);
      const sortie = [];
      for (const p of lignes || []) {
        let champs: Record<string, unknown> | null = null;
        if (p.statut === 'en_cours' && p.stripe_payment_intent) {
          const pi = await stripe('payment_intents/' + p.stripe_payment_intent).catch(() => null);
          if (pi?.status === 'succeeded') champs = { statut: 'reussi' };
          else if (pi && ['requires_payment_method', 'canceled'].includes(pi.status)) {
            champs = { statut: 'refuse', erreur: pi.last_payment_error?.message || 'Prélèvement refusé' };
          }
        } else if (p.statut === 'refuse' && p.lien_session) {
          const se = await stripe('checkout/sessions/' + p.lien_session).catch(() => null);
          if (se?.payment_status === 'paid') {
            champs = { statut: 'reussi', erreur: null, stripe_payment_intent: se.payment_intent, lien_session: null, lien_url: null, lien_expire: null };
          }
        }
        if (champs) {
          const { data, error } = await supabaseAdmin.from('prelevements')
            .update({ ...champs, maj_le: new Date().toISOString() }).eq('id', p.id).select().single();
          sortie.push(error ? p : data);
        } else sortie.push(p);
      }
      resultat = sortie;

    } else {
      throw new Error('Action inconnue');
    }

    return new Response(JSON.stringify(resultat), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
