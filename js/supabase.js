// APEX APP — Supabase Client & Auth
let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);
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
      .order('prenom');
    if (error) throw error;
    return data;
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

  async createUser(email, password, prenom) {
    // Sauvegarder la session coach avant signUp (qui connecte automatiquement le nouveau user)
    const { data: { session: coachSession } } = await getSupabase().auth.getSession();

    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { prenom, role: 'client' } }
    });
    if (error) throw error;

    // Restaurer la session coach immédiatement
    if (coachSession) {
      await getSupabase().auth.setSession({
        access_token: coachSession.access_token,
        refresh_token: coachSession.refresh_token
      });
    }

    return data;
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
  }
};
