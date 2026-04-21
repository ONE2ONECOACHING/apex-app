// APEX APP — Dashboard Client (macros du jour + logbook)

const DashboardPage = {
  currentDate: todayStr(),
  plan: null,
  entries: [],
  creneaux: ['petit_dejeuner', 'collation_matin', 'dejeuner', 'collation_apres_midi', 'diner', 'collation_soir'],

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX</div>
          <div class="app-title" id="dashGreeting">Mon suivi</div>
        </div>
        <button class="header-btn" onclick="Router.logout()" title="Déconnexion">⏻</button>
      </div>

      <div class="date-nav">
        <button class="date-nav-btn" onclick="DashboardPage.changeDate(-1)">‹</button>
        <div class="date-nav-label" id="dashDate"></div>
        <button class="date-nav-btn" onclick="DashboardPage.changeDate(1)">›</button>
      </div>

      <div id="dashContent"><div class="spinner" style="margin-top:3rem;"></div></div>

      <div id="dashRecap"></div>

      <nav class="nav-bottom"><div class="nav-inner">
        <a class="nav-item active" href="#dashboard"><span class="nav-icon">📊</span><span class="nav-label">Suivi</span></a>
        <a class="nav-item" href="#plan"><span class="nav-icon">📋</span><span class="nav-label">Plan</span></a>
        <a class="nav-item" href="#snap"><span class="nav-icon">📷</span><span class="nav-label">Snap</span></a>
        <a class="nav-item" href="#historique"><span class="nav-icon">📈</span><span class="nav-label">Historique</span></a>
      </div></nav>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile) return;
    if (profile.role === 'coach') { window.location.hash = '#coach-clients'; return; }

    document.getElementById('dashGreeting').textContent = 'Salut ' + (profile.prenom || '') + ' 👊';
    this.updateDateLabel();
    await this.loadData();
  },

  updateDateLabel() {
    const label = document.getElementById('dashDate');
    if (this.currentDate === todayStr()) label.textContent = "Aujourd'hui";
    else label.textContent = formatDateFR(this.currentDate);
  },

  async changeDate(delta) {
    const d = new Date(this.currentDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    if (d > new Date()) return;
    this.currentDate = formatDate(d);
    this.updateDateLabel();
    await this.loadData();
  },

  async loadData() {
    const profile = Router.userProfile;
    try {
      this.plan = await db.getActivePlan(profile.id);
      this.entries = await db.getJournalEntries(profile.id, this.currentDate);
      this.renderContent();
    } catch (e) {
      document.getElementById('dashContent').innerHTML = '<div class="alert alert-error">Erreur de chargement. Réessaie.</div>';
      console.error(e);
    }
  },

  getConsumed() {
    return this.entries.reduce((acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      proteines: acc.proteines + (parseFloat(e.proteines) || 0),
      glucides: acc.glucides + (parseFloat(e.glucides) || 0),
      lipides: acc.lipides + (parseFloat(e.lipides) || 0)
    }), { calories: 0, proteines: 0, glucides: 0, lipides: 0 });
  },

  renderContent() {
    const c = this.getConsumed();
    const p = this.plan || { calories_cible: 0, proteines_cible: 0, glucides_cible: 0, lipides_cible: 0 };
    const remaining = Math.max(0, p.calories_cible - c.calories);

    let html = '';

    // Macros card
    html += `<div class="card card-dark">
      <div class="card-title">Calories du jour</div>
      <div class="macros-big">
        <span class="macros-big-val">${Math.round(c.calories).toLocaleString('fr-FR')}</span>
        <span class="macros-big-unit">/ ${p.calories_cible.toLocaleString('fr-FR')} kcal</span>
      </div>
      ${pctBar(c.calories, p.calories_cible)}
      <div class="macros-big-sub" style="margin-top:8px;">Reste ${remaining.toLocaleString('fr-FR')} kcal</div>
      <div class="macros-grid" style="margin-top:12px;">
        <div class="macro-item">
          <div class="macro-val">${Math.round(c.proteines)}g<span style="font-size:12px;color:var(--gray-light);font-weight:400;"> / ${p.proteines_cible}g</span></div>
          <div class="macro-label">Protéines</div>
          ${pctBar(c.proteines, p.proteines_cible)}
        </div>
        <div class="macro-item">
          <div class="macro-val">${Math.round(c.glucides)}g<span style="font-size:12px;color:var(--gray-light);font-weight:400;"> / ${p.glucides_cible}g</span></div>
          <div class="macro-label">Glucides</div>
          ${pctBar(c.glucides, p.glucides_cible)}
        </div>
        <div class="macro-item">
          <div class="macro-val">${Math.round(c.lipides)}g<span style="font-size:12px;color:var(--gray-light);font-weight:400;"> / ${p.lipides_cible}g</span></div>
          <div class="macro-label">Lipides</div>
          ${pctBar(c.lipides, p.lipides_cible)}
        </div>
      </div>
    </div>`;

    // No plan warning
    if (!this.plan) {
      html += `<div class="card card-accent">
        <div style="text-align:center;padding:0.5rem 0;">
          <div style="font-size:24px;margin-bottom:8px;">⏳</div>
          <div style="font-size:14px;font-weight:600;margin-bottom:4px;">Plan en attente</div>
          <div style="font-size:13px;color:var(--gray);">Ton coach est en train de préparer ton plan nutritionnel.</div>
        </div>
      </div>`;
    }

    // Journal par créneau — standards + tout créneau exotique présent dans les entries
    const extraCreneaux = [...new Set(this.entries.map(e => e.creneau).filter(c => c && !this.creneaux.includes(c)))];
    const allCreneaux = [...this.creneaux, ...extraCreneaux];
    allCreneaux.forEach(cr => {
      const crEntries = this.entries.filter(e => e.creneau === cr);
      const crKcal = crEntries.reduce((s, e) => s + (e.calories || 0), 0);

      html += `<div class="creneau-section">
        <div class="creneau-header">
          <div class="creneau-title">${creneauIcon(cr)} ${creneauLabel(cr)}</div>
          ${crKcal > 0 ? `<div class="creneau-kcal">${crKcal} kcal</div>` : ''}
        </div>`;

      crEntries.forEach(e => {
        html += `<div class="entry-row">
          <div class="entry-info">
            <div class="entry-name">${e.nom}</div>
            <div class="entry-macros">P: ${Math.round(e.proteines)}g · G: ${Math.round(e.glucides)}g · L: ${Math.round(e.lipides)}g</div>
          </div>
          <div class="entry-kcal">${e.calories} ${e.note ? '<span class="entry-note">' + noteEmoji(e.note) + '</span>' : ''}</div>
          <button class="entry-delete" onclick="DashboardPage.deleteEntry('${e.id}')" title="Supprimer">×</button>
        </div>`;
        if (e.feedback) {
          html += `<div class="entry-feedback">💡 ${e.feedback}</div>`;
        }
      });

      if (this.creneaux.includes(cr)) {
        html += `<button class="add-meal-btn" onclick="DashboardPage.addMeal('${cr}')">+ Ajouter un repas</button>`;
      }
      html += `</div>`;
    });

    // Bouton récap
    if (this.entries.length >= 3) {
      html += `<button class="btn btn-secondary" style="margin-top:0.5rem;" onclick="DashboardPage.generateRecap()">📊 Récap de la journée</button>`;
    }

    document.getElementById('dashContent').innerHTML = html;
  },

  addMeal(creneau) {
    Router.navigate('snap', { creneau, date: this.currentDate });
  },

  async deleteEntry(id) {
    if (!confirm('Supprimer cette entrée ?')) return;
    try {
      await db.deleteJournalEntry(id);
      this.entries = this.entries.filter(e => e.id !== id);
      this.renderContent();
    } catch (e) { alert('Erreur : ' + e.message); }
  },

  async generateRecap() {
    if (!this.plan || this.entries.length === 0) return;
    const recapEl = document.getElementById('dashRecap');
    recapEl.innerHTML = '<div style="text-align:center;padding:1rem;"><div class="spinner"></div><div class="loading-text">Génération du récap…</div></div>';

    try {
      const consumed = this.getConsumed();
      const recap = await SnapCalories.generateDailyRecap(this.plan, consumed, this.entries);
      recapEl.innerHTML = `<div class="recap-card">
        <div class="recap-title">${recap.emoji || '📊'} ${recap.titre || 'Récap du jour'} <span class="recap-note">${recap.note}/10</span></div>
        <div class="recap-text">${recap.resume}</div>
      </div>`;
    } catch (e) {
      recapEl.innerHTML = '<div class="alert alert-error">Impossible de générer le récap pour le moment.</div>';
    }
  }
};
