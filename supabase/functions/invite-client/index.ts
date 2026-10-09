// APEX APP — Edge Function : Création compte client
//   { email, prenom, nom }                         → client suivi (accès app)
//   { studio: true, prenom, nom, telephone, email? } → client du studio, sans accès app
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// Mot de passe provisoire aléatoire, propre à chaque client (sans 0/O, 1/l/I)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
function randomPassword(length = 10): string {
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
      .select('role')
      .eq('id', caller.id)
      .single();
    if (!callerProfile || callerProfile.role !== 'coach') throw new Error('Accès refusé');

    const body = await req.json();
    const studio = !!body.studio;
    const prenom = String(body.prenom || '').trim();
    const nom    = String(body.nom || '').trim();
    const telephone = String(body.telephone || '').trim();
    // Client du studio sans email : adresse interne, jamais utilisée pour écrire
    const email = String(body.email || '').trim().toLowerCase()
      || (studio ? `studio-${crypto.randomUUID()}@clients.one2onecoaching.fr` : '');
    if (!prenom || !email) throw new Error(studio ? 'Prénom requis' : 'Email et prénom requis');

    // Un compte existant (client ou coach) n'est jamais modifié ici
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    if (existingProfile) throw new Error('Un compte existe déjà avec cet email.');

    const password = randomPassword();
    const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      // Client du studio : compte bloqué (personne ne connaît le mot de passe)
      ...(studio ? { ban_duration: '876000h' } : {}),
    });
    if (createErr) {
      if (/already/i.test(createErr.message)) throw new Error('Un compte existe déjà avec cet email.');
      throw createErr;
    }
    const userId = userData?.user?.id;
    if (!userId) throw new Error('Impossible de créer l\'utilisateur');

    // Compléter le profil client (créé par le trigger handle_new_user)
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email,
      prenom,
      nom: nom || null,
      role: 'client',
      onboarding_done: studio,
      ...(studio ? {
        type_client: 'studio',
        telephone: telephone || null,
        coach_referent_id: caller.id,
      } : {}),
    }, { onConflict: 'id' });
    if (profileErr) {
      if (studio) await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileErr;
    }

    return new Response(
      JSON.stringify(studio ? { profileId: userId } : { profileId: userId, password }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
