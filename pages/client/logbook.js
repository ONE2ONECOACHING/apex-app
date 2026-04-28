// APEX APP — Logbook Client (suivi alimentaire)

const LogbookPage = {
  currentDate: todayStr(),
  plan: null,
  entries: [],
  creneaux: ['petit_dejeuner', 'collation_matin', 'dejeuner', 'collation_apres_midi', 'diner', 'collation_soir'],

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX</div>
          <div class="app-title">Logbook</div>
        </div>
        <button class="header-btn" onclick="Router.logout()" title="Déconnexion">⏻</button>
      </div>

      <div class="tabs" style="margin-bottom:1rem;">
        <button class="tab active" onclick="window.location.hash='#logbook'">📖 Logbook</button>
        <button class="tab" onclick="window.location.hash='#plan'">📋 Plan</button>
        <button class="tab" onclick="window.location.hash='#recettes'">🍽️ Recettes</button>
      </div>

      <div class="date-nav">
        <button class="date-nav-btn" onclick="LogbookPage.changeDate(-1)">‹</button>
        <div class="date-nav-label" id="logDate"></div>
        <button class="date-nav-btn" onclick="LogbookPage.changeDate(1)">›</button>
      </div>

      <div id="logContent"><div class="spinner" style="margin-top:3rem;"></div></div>
      <div id="logRecap"></div>

      <nav class="nav-bottom"><div class="nav-inner">
        <a class="nav-item" href="#dashboard"><span class="nav-icon">🏠</span><span class="nav-label">Dashboard</span></a>
        <a class="nav-item active" href="#logbook"><span class="nav-icon">🥗</span><span class="nav-label">Nutrition</span></a>
      </div></nav>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile) return;
    if (profile.role === 'coach') { window.location.hash = '#coach-clients'; return; }
    this.updateDateLabel();
    await this.loadData();
  },

  updateDateLabel() {
    const label = document.getElementById('logDate');
    if (label) label.textContent = this.currentDate === todayStr() ? "Aujourd'hui" : formatDateFR(this.currentDate);
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
      [this.plan, this.entries] = await Promise.all([
        db.getActivePlan(profile.id),
        db.getJournalEntries(profile.id, this.currentDate)
      ]);
      this.renderContent();
    } catch (e) {
      document.getElementById('logContent').innerHTML = '<div class="alert alert-error">Erreur de chargement. Réessaie.</div>';
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
          ${pctBar(c.proteines, p.proteines_cible, 'var(--macro-p)')}
        </div>
        <div class="macro-item">
          <div class="macro-val">${Math.round(c.glucides)}g<span style="font-size:12px;color:var(--gray-light);font-weight:400;"> / ${p.glucides_cible}g</span></div>
          <div class="macro-label">Glucides</div>
          ${pctBar(c.glucides, p.glucides_cible, 'var(--macro-g)')}
        </div>
        <div class="macro-item">
          <div class="macro-val">${Math.round(c.lipides)}g<span style="font-size:12px;color:var(--gray-light);font-weight:400;"> / ${p.lipides_cible}g</span></div>
          <div class="macro-label">Lipides</div>
          ${pctBar(c.lipides, p.lipides_cible, 'var(--macro-l)')}
        </div>
      </div>
    </div>`;

    if (!this.plan) {
      html += `<div class="card card-accent">
        <div style="text-align:center;padding:0.5rem 0;">
          <div style="font-size:24px;margin-bottom:8px;">⏳</div>
          <div style="font-size:14px;font-weight:600;margin-bottom:4px;">Plan en attente</div>
          <div style="font-size:13px;color:var(--gray);">Ton coach prépare ton plan nutritionnel.</div>
        </div>
      </div>`;
    }

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
        const qtyLabel = e.quantite
          ? (e.unite === 'unité' ? `${e.quantite} unité${e.quantite > 1 ? 's' : ''}` : `${e.quantite}g`)
          : '';
        html += `<div class="entry-row">
          <div class="entry-info">
            <div class="entry-name">${e.nom}${qtyLabel ? ` <span style="font-size:11px;font-weight:500;color:var(--gold);background:var(--gold-light);border-radius:4px;padding:1px 5px;">${qtyLabel}</span>` : ''}</div>
            <div class="entry-macros">P: ${Math.round(e.proteines)}g · G: ${Math.round(e.glucides)}g · L: ${Math.round(e.lipides)}g</div>
          </div>
          <div class="entry-kcal">${e.calories} ${e.note ? '<span class="entry-note">' + noteEmoji(e.note) + '</span>' : ''}</div>
          <button class="entry-delete" onclick="LogbookPage.deleteEntry('${e.id}')" title="Supprimer">×</button>
        </div>`;
      });

      if (this.creneaux.includes(cr)) {
        html += `<button class="add-meal-btn" onclick="LogbookPage.addMeal('${cr}')">+ Ajouter un repas</button>`;
      }
      html += `</div>`;
    });

    if (this.entries.length >= 2) {
      html += `<button class="btn btn-secondary" style="margin-top:0.5rem;" onclick="LogbookPage.generateRecap()">📊 Récap de la journée</button>`;
    }

    document.getElementById('logContent').innerHTML = html;
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
    const recapEl = document.getElementById('logRecap');
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
