// APEX APP — Historique Client (7 / 30 jours)

const HistoriquePage = {
  range: 7,
  data: [],
  plan: null,
  habitudes: [],
  habitudesJournal: [],

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE</div>
          <div class="app-title">Historique</div>
        </div>
      </div>
      <div class="tabs">
        <button class="tab active" onclick="HistoriquePage.setRange(7, this)">7 jours</button>
        <button class="tab" onclick="HistoriquePage.setRange(30, this)">30 jours</button>
      </div>
      <div id="histContent"><div class="spinner" style="margin-top:2rem;"></div></div>
      <nav class="nav-bottom"><div class="nav-inner">
        <a class="nav-item" href="#dashboard"><span class="nav-icon">🏠</span><span class="nav-label">Dashboard</span></a>
        <a class="nav-item" href="#logbook"><span class="nav-icon">📖</span><span class="nav-label">Logbook</span></a>
        <a class="nav-item" href="#recettes"><span class="nav-icon">🍽️</span><span class="nav-label">Recettes</span></a>
        <a class="nav-item" href="#plan"><span class="nav-icon">📋</span><span class="nav-label">Plan</span></a>
        <a class="nav-item active" href="#historique"><span class="nav-icon">📈</span><span class="nav-label">Historique</span></a>
      </div></nav>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile) return;
    this.plan = await db.getActivePlan(profile.id);
    await this.loadData();
  },

  async setRange(r, btn) {
    this.range = r;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    await this.loadData();
  },

  async loadData() {
    const profile = Router.userProfile;
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - this.range + 1);
    const dateFrom = formatDate(from);
    const dateTo = formatDate(today);

    try {
      [this.data, this.habitudes, this.habitudesJournal] = await Promise.all([
        db.getJournalRange(profile.id, dateFrom, dateTo),
        db.getHabitudes(profile.id).catch(() => []),
        db.getHabitudesJournalRange(profile.id, dateFrom, dateTo).catch(() => [])
      ]);
      this.renderContent();
    } catch (e) {
      document.getElementById('histContent').innerHTML = '<div class="alert alert-error">Erreur de chargement.</div>';
    }
  },

  renderContent() {
    const el = document.getElementById('histContent');
    if (this.data.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Aucune donnée sur cette période.</div></div>';
      return;
    }

    // Grouper par jour
    const days = {};
    this.data.forEach(e => {
      if (!days[e.date_entree]) days[e.date_entree] = [];
      days[e.date_entree].push(e);
    });

    const target = this.plan || { calories_cible: 0, proteines_cible: 0, glucides_cible: 0, lipides_cible: 0 };

    let html = '';

    // Moyennes
    const dates = Object.keys(days);
    const avgCal = Math.round(this.data.reduce((s, e) => s + e.calories, 0) / dates.length);
    const avgProt = Math.round(this.data.reduce((s, e) => s + parseFloat(e.proteines), 0) / dates.length);

    html += `<div class="card" style="margin-bottom:1rem;">
      <div class="card-title">Moyennes sur ${dates.length} jour${dates.length > 1 ? 's' : ''}</div>
      <div style="display:flex;gap:16px;">
        <div><span style="font-size:20px;font-weight:700;">${avgCal.toLocaleString('fr-FR')}</span> <span style="font-size:12px;color:var(--gray-light);">kcal/jour</span></div>
        <div><span style="font-size:20px;font-weight:700;">${avgProt}g</span> <span style="font-size:12px;color:var(--gray-light);">prot/jour</span></div>
      </div>
    </div>`;

    // Jours
    Object.keys(days).sort((a, b) => b.localeCompare(a)).forEach(date => {
      const entries = days[date];
      const cal = entries.reduce((s, e) => s + e.calories, 0);
      const prot = Math.round(entries.reduce((s, e) => s + parseFloat(e.proteines), 0));
      const gluc = Math.round(entries.reduce((s, e) => s + parseFloat(e.glucides), 0));
      const lip = Math.round(entries.reduce((s, e) => s + parseFloat(e.lipides), 0));
      const diff = target.calories_cible ? cal - target.calories_cible : 0;
      const diffLabel = diff > 0 ? `+${diff}` : `${diff}`;
      const diffColor = Math.abs(diff) < 100 ? 'var(--success)' : diff > 0 ? 'var(--error)' : 'var(--gold)';

      html += `<div class="card" style="cursor:pointer;" onclick="LogbookPage.currentDate='${date}';window.location.hash='#logbook';">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="font-size:14px;font-weight:600;">${formatDateFR(date)}</div>
          ${target.calories_cible ? `<div style="font-size:12px;font-weight:600;color:${diffColor};">${diffLabel} kcal</div>` : ''}
        </div>
        <div style="display:flex;gap:12px;font-size:13px;color:var(--gray-light);">
          <span><strong style="color:var(--black);">${cal}</strong> kcal</span>
          <span>P:${prot}g</span><span>G:${gluc}g</span><span>L:${lip}g</span>
          <span style="margin-left:auto;font-size:12px;">${entries.length} repas</span>
        </div>
        ${target.calories_cible ? pctBar(cal, target.calories_cible) : ''}
        ${(() => {
          const checked = this.habitudesJournal.filter(j => j.date_entree === date);
          if (checked.length === 0) return '';
          return `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
            ${checked.map(j => {
              const h = this.habitudes.find(hh => hh.id === j.habitude_id);
              return h ? `<span style="font-size:11px;background:var(--gold-light);color:var(--gold);padding:2px 8px;border-radius:20px;">✅ ${h.label}</span>` : '';
            }).join('')}
          </div>`;
        })()}
      </div>`;
    });

    el.innerHTML = html;
  }
};
