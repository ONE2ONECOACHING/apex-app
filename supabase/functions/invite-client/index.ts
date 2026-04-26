// APEX APP — Edge Function : Création compte client
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const DEFAULT_PASSWORD = 'Apex2026!';

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

    const { email, prenom, nom } = await req.json();
    if (!email || !prenom) throw new Error('Email et prénom requis');

    // Sécurité : interdire de créer un client avec un email déjà coach
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('email', email)
      .single();
    if (existingProfile && existingProfile.role === 'coach') throw new Error('Cet email appartient déjà à un coach.');

    // Créer le user avec le mot de passe par défaut
    const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: DEFAULT_PASSWORD,
    });
    if (createErr && createErr.message !== 'User already registered') throw createErr;

    const userId = userData?.user?.id || (
      await supabaseAdmin.auth.admin.listUsers()
        .then(({ data }) => data.users.find(u => u.email === email)?.id)
    );
    if (!userId) throw new Error('Impossible de créer l\'utilisateur');

    // Créer / mettre à jour le profil client
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email,
      prenom,
      nom: nom || null,
      role: 'client',
      onboarding_done: false,
    }, { onConflict: 'id' });
    if (profileErr) throw profileErr;

    return new Response(
      JSON.stringify({ profileId: userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
