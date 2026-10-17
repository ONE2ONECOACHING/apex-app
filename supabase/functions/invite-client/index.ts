// APEX APP — Edge Function : Création compte client
//   { email, prenom, nom, type_client? }           → client suivi (accès app) :
//                                                     'suivi' (studio + suivi) ou 'distance'
//   { studio: true, prenom, nom, telephone, email? } → client du studio, sans accès app
//   { action: 'ouvrir_acces', clientId, email? }      → donne l'accès app à un client studio
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// Recherche d'email insensible à la casse, sans jokers (% et _ pris tels quels)
const emailExact = (e: string) => e.replace(/[\\%_]/g, c => '\\' + c);

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
      .select('role, is_gerant')
      .eq('id', caller.id)
      .single();
    if (!callerProfile || callerProfile.role !== 'coach') throw new Error('Accès refusé');

    const body = await req.json();

    // ── Ouvrir l'accès à l'app d'un client du studio ───────────────────────
    if (body.action === 'ouvrir_acces') {
      const { data: cible } = await supabaseAdmin.from('profiles')
        .select('id, email, prenom, role, type_client, coach_referent_id').eq('id', body.clientId).single();
      if (!cible || cible.role !== 'client' || cible.type_client !== 'studio') {
        throw new Error('Réservé aux clients du studio sans suivi.');
      }
      // Accès déjà ouvert : seuls son référent et les gérants peuvent le refaire
      // (nouveau mot de passe), sinon n'importe quel coach prendrait le compte
      const { data: compte } = await supabaseAdmin.auth.admin.getUserById(cible.id);
      const bloque = !!compte?.user?.banned_until && new Date(compte.user.banned_until) > new Date();
      if (!bloque && !callerProfile.is_gerant && cible.coach_referent_id !== caller.id) {
        throw new Error("L'accès de ce client est déjà ouvert : seuls son coach référent et les gérants peuvent le réinitialiser.");
      }
      const emailInterne = /@clients\.one2onecoaching\.fr$/.test(cible.email || '');
      const nouvelEmail = String(body.email || '').trim().toLowerCase();
      if (emailInterne && !nouvelEmail) throw new Error('Indique l\'email du client.');
      if (nouvelEmail && nouvelEmail !== cible.email) {
        const { data: pris } = await supabaseAdmin.from('profiles')
          .select('id').ilike('email', emailExact(nouvelEmail)).neq('id', cible.id).maybeSingle();
        if (pris) throw new Error('Un compte existe déjà avec cet email.');
      }
      const email = nouvelEmail || cible.email;
      const password = randomPassword();
      const { error: majErr } = await supabaseAdmin.auth.admin.updateUserById(cible.id, {
        email, email_confirm: true, password, ban_duration: 'none',
      });
      if (majErr) throw majErr;
      await supabaseAdmin.from('profiles').update({ email }).eq('id', cible.id);
      return new Response(
        JSON.stringify({ email, password }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const studio = !!body.studio;
    const prenom = String(body.prenom || '').trim();
    const nom    = String(body.nom || '').trim();
    const telephone = String(body.telephone || '').trim();
    const typeSuivi = body.type_client === 'distance' ? 'distance' : 'suivi';
    // Client du studio sans email : adresse interne, jamais utilisée pour écrire
    const email = String(body.email || '').trim().toLowerCase()
      || (studio ? `studio-${crypto.randomUUID()}@clients.one2onecoaching.fr` : '');
    if (!prenom || !email) throw new Error(studio ? 'Prénom requis' : 'Email et prénom requis');

    // Un compte existant (client ou coach) n'est jamais modifié ici
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('email', emailExact(email))
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
      type_client: studio ? 'studio' : typeSuivi,
      // Le coach qui crée le client en devient le référent (tous les types de client)
      coach_referent_id: caller.id,
      ...(studio ? { telephone: telephone || null } : {}),
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
