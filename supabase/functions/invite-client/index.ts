// APEX APP — Edge Function : Génération lien d'invitation client
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Vérifier que l'appelant est bien un coach connecté
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Non autorisé');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Vérifier le token JWT du coach
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !caller) throw new Error('Non autorisé');

    // Vérifier que le caller est un coach
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();
    if (!callerProfile || callerProfile.role !== 'coach') throw new Error('Accès refusé');

    const { email, prenom, nom, appUrl } = await req.json();
    if (!email || !prenom) throw new Error('Email et prénom requis');

    const redirectTo = `${appUrl}/#set-password`;

    // Générer le lien d'invitation (crée le user auth si inexistant)
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo },
    });
    if (linkErr) throw linkErr;

    const userId = linkData.user.id;

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
      JSON.stringify({
        link: linkData.properties.action_link,
        profileId: userId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
