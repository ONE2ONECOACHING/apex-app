// APEX APP — Coach : Consultation Journal Client

const CoachJournalPage = {
  clientId: null,
  client: null,
  currentDate: todayStr(),
  entries: [],
  plan: null,

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX · COACH</div>
          <div class="app-title" id="cjTitle">Journal client</div>
        </div>
        <button class="header-btn" onclick="history.back()">←</button>
      </div>
      <div class="date-nav">
        <button class="date-nav-btn" onclick="CoachJournalPage.changeDate(-1)">‹</button>
        <div class="date-nav-label" id="cjDate"></div>
        <button class="date-nav-btn" onclick="CoachJournalPage.changeDate(1)">›</button>
      </div>
      <div id="cjContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    const params = Router.getParams();
    this.clientId = params.clientId;
    if (!this.clientId) { window.location.hash = '#coach-clients'; return; }

    try {
      this.client = await db.getProfile(this.clientId);
      this.plan = await db.getActivePlan(this.clientId);
      document.getElementById('cjTitle').textContent = 'Journal — ' + (this.client.prenom || 'Client');
      this.updateDateLabel();
      await this.loadData();
    } catch (e) {
      document.getElementById('cjContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  updateDateLabel() {
    const label = document.getElementById('cjDate');
    label.textContent = this.currentDate === todayStr() ? "Aujourd'hui" : formatDateFR(this.currentDate);
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
    this.entries = await db.getJournalEntries(this.clientId, this.currentDate);
    this.renderContent();
  },

  renderContent() {
    const el = document.getElementById('cjContent');
    const p = this.plan || { calories_cible: 0, proteines_cible: 0, glucides_cible: 0, lipides_cible: 0 };
    const c = this.entries.reduce((acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      proteines: acc.proteines + (parseFloat(e.proteines) || 0),
      glucides: acc.glucides + (parseFloat(e.glucides) || 0),
      lipides: acc.lipides + (parseFloat(e.lipides) || 0)
    }), { calories: 0, proteines: 0, glucides: 0, lipides: 0 });

    let html = `<div class="card card-dark">
      <div class="card-title">Bilan du jour</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;text-align:center;">
        <div><div class="macro-val">${Math.round(c.calories)}<span style="font-size:11px;color:var(--gray-light);font-weight:400;">/${p.calories_cible}</span></div><div class="macro-label">kcal</div>${pctBar(c.calories, p.calories_cible)}</div>
        <div><div class="macro-val">${Math.round(c.proteines)}g</div><div class="macro-label">Prot</div>${pctBar(c.proteines, p.proteines_cible)}</div>
        <div><div class="macro-val">${Math.round(c.glucides)}g</div><div class="macro-label">Gluc</div>${pctBar(c.glucides, p.glucides_cible)}</div>
        <div><div class="macro-val">${Math.round(c.lipides)}g</div><div class="macro-label">Lip</div>${pctBar(c.lipides, p.lipides_cible)}</div>
      </div>
    </div>`;

    if (this.entries.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Aucun repas enregistré ce jour.</div></div>';
    } else {
      const standardCreneaux = ['petit_dejeuner', 'collation_matin', 'dejeuner', 'collation_apres_midi', 'diner', 'collation_soir'];
      const extras = [...new Set(this.entries.map(e => e.creneau).filter(c => c && !standardCreneaux.includes(c)))];
      const creneaux = [...standardCreneaux, ...extras];
      creneaux.forEach(cr => {
        const items = this.entries.filter(e => e.creneau === cr);
        if (items.length === 0) return;

        html += `<div class="creneau-section"><div class="creneau-header"><div class="creneau-title">${creneauIcon(cr)} ${creneauLabel(cr)}</div></div>`;
        items.forEach(e => {
          html += `<div class="entry-row">
            <div class="entry-info">
              <div class="entry-name">${e.nom}</div>
              <div class="entry-macros">P:${Math.round(e.proteines)}g · G:${Math.round(e.glucides)}g · L:${Math.round(e.lipides)}g${e.source === 'snap_calories' ? ' · 📷' : ''}</div>
            </div>
            <div class="entry-kcal">${e.calories} ${e.note ? '<span class="entry-note">' + noteEmoji(e.note) + '</span>' : ''}</div>
          </div>`;
          if (e.feedback) html += `<div class="entry-feedback">💡 ${e.feedback}</div>`;
        });
        html += `</div>`;
      });
    }

    el.innerHTML = html;
  }
};
