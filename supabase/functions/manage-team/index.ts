// APEX APP — Edge Function : gestion de l'équipe (gérants uniquement)
//   { action: 'add', email, prenom, nom, gerant }  → crée un compte coach
//   { action: 'remove', coachId, remplacantId }    → transfère puis supprime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// Compte coach partagé par l'équipe pendant la transition : jamais supprimé ici
const COMPTE_PARTAGE = 'fe2c19c2-e00f-4c4e-9543-3634022e42ff';

// Mot de passe provisoire aléatoire (sans 0/O, 1/l/I)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
function randomPassword(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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
      .from('profiles')
      .select('role, is_gerant')
      .eq('id', caller.id)
      .single();
    if (!callerProfile || callerProfile.role !== 'coach' || !callerProfile.is_gerant) {
      throw new Error('Réservé aux gérants.');
    }

    const body = await req.json();

    // ── Ajouter un coach ─────────────────────────────────────────────────────
    if (body.action === 'add') {
      const email  = String(body.email || '').trim().toLowerCase();
      const prenom = String(body.prenom || '').trim();
      const nom    = String(body.nom || '').trim();
      if (!email || !prenom) throw new Error('Email et prénom requis');

      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle();
      if (existing) throw new Error('Un compte existe déjà avec cet email.');

      const password = randomPassword();
      const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
        user_metadata: { prenom },
      });
      if (createErr) {
        if (/already/i.test(createErr.message)) throw new Error('Un compte existe déjà avec cet email.');
        throw createErr;
      }
      const coachId = userData?.user?.id;
      if (!coachId) throw new Error('Impossible de créer le compte');

      // Le profil est créé « client » par handle_new_user : on le passe coach
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({
          role: 'coach',
          is_gerant: !!body.gerant,
          prenom,
          nom: nom || null,
          coach_referent_id: null,
          onboarding_done: true,
        })
        .eq('id', coachId);
      if (profileErr) {
        await supabaseAdmin.auth.admin.deleteUser(coachId);
        throw profileErr;
      }

      return new Response(
        JSON.stringify({ coachId, password }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Supprimer un coach ───────────────────────────────────────────────────
    if (body.action === 'remove') {
      const { coachId, remplacantId } = body;
      if (!coachId || !remplacantId) throw new Error('Coach et remplaçant requis');
      if (coachId === caller.id) throw new Error('Tu ne peux pas supprimer ton propre compte.');
      if (coachId === COMPTE_PARTAGE) throw new Error('Le compte partagé ne peut pas être supprimé pour l\'instant.');

      const { data: target } = await supabaseAdmin
        .from('profiles')
        .select('role, is_gerant')
        .eq('id', coachId)
        .single();
      if (!target || target.role !== 'coach') throw new Error('Ce compte n\'est pas un coach.');

      if (target.is_gerant) {
        const { count } = await supabaseAdmin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'coach')
          .eq('is_gerant', true);
        if ((count ?? 0) <= 1) throw new Error('Impossible de supprimer le dernier gérant.');
      }

      // Clients et contenus → remplaçant (en une seule transaction)
      const { error: transferErr } = await supabaseAdmin
        .rpc('transferer_coach', { p_ancien: coachId, p_nouveau: remplacantId });
      if (transferErr) throw transferErr;

      const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(coachId);
      if (deleteErr) throw deleteErr;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Action inconnue');

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
