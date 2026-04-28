// APEX APP — Supabase Client & Auth
let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY, {
      auth: { detectSessionInUrl: false } // On gère la session manuellement depuis le hash
    });
  }
  return _supabase;
}

const db = {
  // Auth
  async signIn(email, password) {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await getSupabase().auth.signOut();
  },

  async resetPassword(email) {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    if (error) throw error;
  },

  async updatePassword(newPassword) {
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  async verifyInviteToken(email, token) {
    // Vérifie l'OTP recovery directement — établit la session sans redirect
    const { data, error } = await getSupabase().auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });
    if (error) throw error;
    return data.session;
  },

  async restoreSession(accessToken, refreshToken) {
    const { error } = await getSupabase().auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  },

  async getSessionFromUrl() {
    // Extraire access_token + refresh_token du hash URL
    // ex: #access_token=xxx&refresh_token=yyy&type=recovery
    const hashStr = window.location.hash.substring(1);
    const params = new URLSearchParams(hashStr);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      // Établir explicitement la session depuis les tokens
      const { data, error } = await getSupabase().auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      return data.session;
    }

    // Fallback : session déjà en mémoire
    const { data } = await getSupabase().auth.getSession();
    return data.session;
  },

  async getUser() {
    const { data: { user } } = await getSupabase().auth.getUser();
    return user;
  },

  async getProfile(userId) {
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  // Plans nutritionnels
  async getActivePlan(profileId) {
    const { data, error } = await getSupabase()
      .from('plans_nutritionnels')
      .select('*')
      .eq('profile_id', profileId)
      .eq('actif', true)
      .order('semaine', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getPlanRepas(planId) {
    const { data, error } = await getSupabase()
      .from('plan_repas')
      .select('*')
      .eq('plan_id', planId)
      .order('position');
    if (error) throw error;
    return data;
  },

  // Journal
  async getJournalEntries(profileId, date) {
    const { data, error } = await getSupabase()
      .from('journal_entries')
      .select('*')
      .eq('profile_id', profileId)
      .eq('date_entree', date)
      .order('created_at');
    if (error) throw error;
    return data;
  },

  async addJournalEntry(entry) {
    const { data, error } = await getSupabase()
      .from('journal_entries')
      .insert(entry)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteJournalEntry(id) {
    const { error } = await getSupabase()
      .from('journal_entries')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getJournalRange(profileId, dateFrom, dateTo) {
    const { data, error } = await getSupabase()
      .from('journal_entries')
      .select('*')
      .eq('profile_id', profileId)
      .gte('date_entree', dateFrom)
      .lte('date_entree', dateTo)
      .order('date_entree', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Coach — Clients
  async getAllClients() {
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .neq('actif', false)
      .order('prenom');
    if (error) throw error;
    return data;
  },

  async deleteClient(profileId) {
    // Suppression complète via edge function (service role requis pour auth.users)
    const session = await getSupabase().auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error('Non connecté');

    const res = await fetch(`${APP_CONFIG.SUPABASE_URL}/functions/v1/delete-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ profileId }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
  },

  async updateProfile(id, updates) {
    const { data, error } = await getSupabase()
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createClientAccount(email, prenom, nom = '') {
    const session = await getSupabase().auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error('Non connecté');

    const res = await fetch(`${APP_CONFIG.SUPABASE_URL}/functions/v1/invite-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ email, prenom, nom }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json; // { profileId }
  },

  // Coach — Plans
  async upsertPlan(plan) {
    const { data, error } = await getSupabase()
      .from('plans_nutritionnels')
      .upsert(plan, { onConflict: 'profile_id,semaine' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePlanRepas(planId) {
    const { error } = await getSupabase()
      .from('plan_repas')
      .delete()
      .eq('plan_id', planId);
    if (error) throw error;
  },

  async insertPlanRepas(rows) {
    const { data, error } = await getSupabase()
      .from('plan_repas')
      .insert(rows)
      .select();
    if (error) throw error;
    return data;
  },

  // Push notifications
  async sendPush(profileId, title, body, url = '/') {
    const session = await getSupabase().auth.getSession();
    const token = session.data.session?.access_token;
    const res = await fetch(`${APP_CONFIG.SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ profileId, title, body, url }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json; // { sent: N }
  },

  async savePushSubscription(profileId, subscription) {
    const { error } = await getSupabase()
      .from('push_subscriptions')
      .upsert({
        profile_id: profileId,
        endpoint:   subscription.endpoint,
        keys:       subscription.keys
      }, { onConflict: 'profile_id,endpoint', ignoreDuplicates: true });
    if (error) throw error;
  },

  async updateActivePlanMacros(profileId, macros) {
    const { error } = await getSupabase()
      .from('plans_nutritionnels')
      .update({
        calories_cible:  macros.calories_cible,
        proteines_cible: macros.proteines_cible,
        glucides_cible:  macros.glucides_cible,
        lipides_cible:   macros.lipides_cible
      })
      .eq('profile_id', profileId)
      .eq('actif', true);
    if (error) throw error;
  },

  async deactivateOtherPlans(profileId, keepSemaine) {
    const { error } = await getSupabase()
      .from('plans_nutritionnels')
      .update({ actif: false })
      .eq('profile_id', profileId)
      .neq('semaine', keepSemaine)
      .eq('actif', true);
    if (error) throw error;
  },

  async getPlansForClient(profileId) {
    const { data, error } = await getSupabase()
      .from('plans_nutritionnels')
      .select('*')
      .eq('profile_id', profileId)
      .order('semaine');
    if (error) throw error;
    return data;
  },

  // Aliments BDD
  async searchAliments(query) {
    const { data, error } = await getSupabase()
      .from('aliments_bdd')
      .select('*')
      .ilike('nom', '%' + query + '%')
      .limit(15);
    if (error) throw error;
    return data;
  },

  // Activités sportives
  async getActivites(profileId) {
    const { data, error } = await getSupabase()
      .from('activites_sportives')
      .select('*')
      .eq('profile_id', profileId);
    if (error) throw error;
    return data;
  },

  async setActivites(profileId, activites) {
    await getSupabase().from('activites_sportives').delete().eq('profile_id', profileId);
    if (activites.length > 0) {
      const rows = activites.map(a => ({ profile_id: profileId, sport: a.sport, duree_minutes: a.duree_minutes, met: a.met }));
      await getSupabase().from('activites_sportives').insert(rows);
    }
  },

  // Bilans
  async upsertBilan(bilan) {
    const { data, error } = await getSupabase()
      .from('bilans_hebdo')
      .upsert(bilan, { onConflict: 'profile_id,semaine' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Repas enregistrés
  async getSavedMeals(profileId) {
    const { data, error } = await getSupabase()
      .from('repas_enregistres')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async saveMeal(meal) {
    const { data, error } = await getSupabase()
      .from('repas_enregistres')
      .insert(meal)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteSavedMeal(id) {
    const { error } = await getSupabase()
      .from('repas_enregistres')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getBilans(profileId) {
    const { data, error } = await getSupabase()
      .from('bilans_hebdo')
      .select('*')
      .eq('profile_id', profileId)
      .order('semaine');
    if (error) throw error;
    return data;
  },

  // Poids journal
  async getPoidsHistory(profileId, limit = 12) {
    const { data, error } = await getSupabase()
      .from('poids_journal')
      .select('*')
      .eq('profile_id', profileId)
      .order('date_entree', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async logPoids(profileId, date, poids) {
    const { data, error } = await getSupabase()
      .from('poids_journal')
      .upsert({ profile_id: profileId, date_entree: date, poids }, { onConflict: 'profile_id,date_entree' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Habitudes
  async getHabitudes(profileId) {
    const { data, error } = await getSupabase()
      .from('habitudes_config')
      .select('*')
      .eq('profile_id', profileId)
      .eq('actif', true)
      .order('position');
    if (error) throw error;
    return data || [];
  },

  async upsertHabitudeConfig(habitude) {
    const { data, error } = await getSupabase()
      .from('habitudes_config')
      .upsert(habitude)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteHabitudeConfig(id) {
    const { error } = await getSupabase()
      .from('habitudes_config')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getHabitudesJournal(profileId, date) {
    const { data, error } = await getSupabase()
      .from('habitudes_journal')
      .select('*')
      .eq('profile_id', profileId)
      .eq('date_entree', date);
    if (error) throw error;
    return data || [];
  },

  async getHabitudesJournalRange(profileId, dateFrom, dateTo) {
    const { data, error } = await getSupabase()
      .from('habitudes_journal')
      .select('*')
      .eq('profile_id', profileId)
      .gte('date_entree', dateFrom)
      .lte('date_entree', dateTo)
      .eq('checked', true);
    if (error) throw error;
    return data || [];
  },

  async upsertHabitudeJournal(entry) {
    const { data, error } = await getSupabase()
      .from('habitudes_journal')
      .upsert(entry, { onConflict: 'habitude_id,date_entree' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Recettes
  async getRecettes() {
    const { data, error } = await getSupabase()
      .from('recettes')
      .select('*')
      .eq('actif', true)
      .order('position');
    if (error) throw error;
    return data || [];
  },

  // ── Bilan hebdomadaire ────────────────────────────────────────

  async getBilanTemplates(coachId) {
    const { data, error } = await getSupabase()
      .from('bilan_templates')
      .select('*')
      .eq('coach_id', coachId)
      .eq('actif', true)
      .order('created_at');
    if (error) throw error;
    return data || [];
  },

  async upsertBilanTemplate(tpl) {
    const { data, error } = await getSupabase()
      .from('bilan_templates')
      .upsert(tpl)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteBilanTemplate(id) {
    const { error } = await getSupabase()
      .from('bilan_templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getBilanAssignation(clientId) {
    const { data, error } = await getSupabase()
      .from('bilan_assignations')
      .select('*, bilan_templates(*)')
      .eq('client_id', clientId)
      .single();
    if (error) throw error;
    return data;
  },

  async upsertBilanAssignation(assignation) {
    const { data, error } = await getSupabase()
      .from('bilan_assignations')
      .upsert(assignation, { onConflict: 'client_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeBilanAssignation(clientId) {
    const { error } = await getSupabase()
      .from('bilan_assignations')
      .delete()
      .eq('client_id', clientId);
    if (error) throw error;
  },

  async ensureBilanInstance(clientId) {
    const sb = getSupabase();
    // Récupérer l'assignation active du client
    const { data: asgn } = await sb
      .from('bilan_assignations')
      .select('*, bilan_templates(*)')
      .eq('client_id', clientId)
      .eq('actif', true)
      .single();
    if (!asgn) return null;

    // Calculer la date de déclenchement selon jour_envoi / heure_envoi
    const jourEnvoi  = asgn.jour_envoi  ?? 6;          // 0=dim … 6=sam
    const heureEnvoi = asgn.heure_envoi ?? '08:00';    // "HH:MM"
    const [hh, mm]   = heureEnvoi.split(':').map(Number);
    const now = new Date();
    const d   = new Date(now);

    // Revenir au dernier jour correspondant à jourEnvoi
    const daysBack = (now.getDay() - jourEnvoi + 7) % 7;
    d.setDate(d.getDate() - daysBack);
    d.setHours(0, 0, 0, 0);

    // Si c'est aujourd'hui mais l'heure de déclenchement n'est pas encore passée → semaine précédente
    if (daysBack === 0) {
      const triggerTime = new Date(d);
      triggerTime.setHours(hh, mm, 0, 0);
      if (now < triggerTime) d.setDate(d.getDate() - 7);
    }

    const semaine = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    // Upsert sans écraser si déjà existant
    await sb.from('bilan_instances').upsert({
      client_id: clientId,
      coach_id: asgn.coach_id,
      template_id: asgn.template_id,
      semaine,
      questions_snapshot: asgn.bilan_templates?.questions || []
    }, { onConflict: 'client_id,semaine', ignoreDuplicates: true });

    // Retourner l'instance (nouvelle ou existante)
    const { data, error } = await sb
      .from('bilan_instances')
      .select('*')
      .eq('client_id', clientId)
      .eq('semaine', semaine)
      .single();
    if (error) throw error;
    return data;
  },

  async getPendingBilans(clientId) {
    const { data, error } = await getSupabase()
      .from('bilan_instances')
      .select('*')
      .eq('client_id', clientId)
      .eq('statut', 'en_attente')
      .order('semaine');
    if (error) throw error;
    return data || [];
  },

  async getBilanInstancesForCoach(clientId) {
    const { data, error } = await getSupabase()
      .from('bilan_instances')
      .select('*')
      .eq('client_id', clientId)
      .order('semaine', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async completeBilan(instanceId, reponses) {
    const { data, error } = await getSupabase()
      .from('bilan_instances')
      .update({
        statut: 'complete',
        reponses,
        completed_at: new Date().toISOString()
      })
      .eq('id', instanceId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Coach Dashboard ───────────────────────────────────────────────────────

  async getAllActivePlans() {
    const { data, error } = await getSupabase()
      .from('plans_nutritionnels')
      .select('profile_id, calories_cible, proteines_cible, glucides_cible, lipides_cible, semaine')
      .eq('actif', true);
    if (error) throw error;
    return data || [];
  },

  async getRecentCompletedBilans(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data, error } = await getSupabase()
      .from('bilan_instances')
      .select('id, client_id, semaine, completed_at')
      .eq('statut', 'complete')
      .eq('coach_lu', false)
      .gte('completed_at', since.toISOString())
      .order('completed_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async markBilansAsRead(clientId) {
    const { error } = await getSupabase()
      .from('bilan_instances')
      .update({ coach_lu: true })
      .eq('client_id', clientId)
      .eq('statut', 'complete');
    if (error) throw error;
  },

  async getAllPendingBilans() {
    const { data, error } = await getSupabase()
      .from('bilan_instances')
      .select('id, client_id, semaine')
      .eq('statut', 'en_attente')
      .order('semaine', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getJournalEntriesForClients(profileIds, dateFrom, dateTo) {
    const { data, error } = await getSupabase()
      .from('journal_entries')
      .select('profile_id, date_entree, calories')
      .in('profile_id', profileIds)
      .gte('date_entree', dateFrom)
      .lte('date_entree', dateTo);
    if (error) throw error;
    return data || [];
  }
};
