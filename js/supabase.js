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
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { prenom, role: 'client' } }
    });
    if (error) throw error;
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

  async getBilans(profileId) {
    const { data, error } = await getSupabase()
      .from('bilans_hebdo')
      .select('*')
      .eq('profile_id', profileId)
      .order('semaine');
    if (error) throw error;
    return data;
  }
};
