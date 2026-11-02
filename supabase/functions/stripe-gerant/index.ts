// APEX APP — Edge Function : lecture du compte Stripe du studio (gérants uniquement)
//   { action: 'clients' }                 → tous les clients Stripe (id, nom, email)
//   { action: 'fiche', customer }         → moyens de paiement, abonnements, derniers paiements
//   { action: 'etats', customers: [...] } → pour chaque client : carte enregistrée ? abonnement ?
// Lecture seule (étape 6b-1) : aucune écriture dans Stripe.
// Secret à poser dans Supabase › Edge Functions › Secrets : STRIPE_SECRET_KEY
// (clé limitée « rk_… » avec la lecture seule des clients, moyens de paiement,
// abonnements et paiements).
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
