// APEX APP — Historique Client (7 / 30 jours)

const HistoriquePage = {
  range: 7,
  data: [],
  seances: [],
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
      [this.data, this.seances, this.habitudes, this.habitudesJournal] = await Promise.all([
        db.getJournalRange(profile.id, dateFrom, dateTo),
        db.getSeancesLogRange(profile.id, dateFrom, dateTo).catch(() => []),
        db.getHabitudes(profile.id).catch(() => []),
        db.getHabitudesJournalRange(profile.id, dateFrom, dateTo).catch(() => [])
      ]);
      this.renderContent();
    } catch (e) {
      document.getElementById('histContent').innerHTML = '<div class="alert alert-error">Erreur de chargement.</div>';
    }
  },

  _renderSeance(s) {
    const sets = (s.seances_log_sets || []).sort((a, b) => a.ordre - b.ordre);
    if (sets.length === 0) return '';

    const rows = sets.map(set => {
      const nom = set.exercices_bdd?.nom || '—';
      const data = set.sets_data || [];
      if (data.length === 0) return '';

      const setsStr = data.map((d, i) => {
        const reps   = d.reps   || '—';
        const charge = d.charge ? ` · ${d.charge}kg` : '';
        return `S${i + 1}: ${reps}${charge}`;
      }).join('&nbsp;&nbsp;');

      return `<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);">
        <span style="color:var(--black);font-weight:500;">${nom}</span>
        <span style="color:var(--gray-muted);margin-left:6px;">${setsStr}</span>
      </div>`;
    }).filter(Boolean).join('');

    if (!rows) return '';

    const dureeMin = s.duree_secondes ? Math.round(s.duree_secondes / 60) : null;
    return `
      <div style="margin-top:10px;background:var(--card-bg);border-radius:10px;padding:10px 12px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="font-size:14px;">💪</span>
          <span style="font-size:13px;font-weight:700;color:var(--black);">${s.seance_nom || 'Séance'}</span>
          ${dureeMin ? `<span style="font-size:11px;color:var(--gray-muted);margin-left:auto;">${dureeMin} min</span>` : ''}
        </div>
        ${rows}
      </div>`;
  },

  renderContent() {
    const el = document.getElementById('histContent');

    // Regrouper par date : nutrition + séances
    const days = {};
    this.data.forEach(e => {
      if (!days[e.date_entree]) days[e.date_entree] = { entries: [], seances: [] };
      days[e.date_entree].entries.push(e);
    });
    this.seances.forEach(s => {
      const d = s.date_seance;
      if (!days[d]) days[d] = { entries: [], seances: [] };
      days[d].seances.push(s);
    });

    if (Object.keys(days).length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Aucune donnée sur cette période.</div></div>';
      return;
    }

    const target = this.plan || { calories_cible: 0, proteines_cible: 0, glucides_cible: 0, lipides_cible: 0 };

    // Moyennes (nutrition uniquement)
    const nutritionDates = Object.keys(days).filter(d => days[d].entries.length > 0);
    let html = '';
    if (nutritionDates.length > 0) {
      const allEntries = nutritionDates.flatMap(d => days[d].entries);
      const avgCal  = Math.round(allEntries.reduce((s, e) => s + e.calories, 0) / nutritionDates.length);
      const avgProt = Math.round(allEntries.reduce((s, e) => s + parseFloat(e.proteines), 0) / nutritionDates.length);
      html += `<div class="card" style="margin-bottom:1rem;">
        <div class="card-title">Moyennes sur ${nutritionDates.length} jour${nutritionDates.length > 1 ? 's' : ''}</div>
        <div style="display:flex;gap:16px;">
          <div><span style="font-size:20px;font-weight:700;">${avgCal.toLocaleString('fr-FR')}</span> <span style="font-size:12px;color:var(--gray-light);">kcal/jour</span></div>
          <div><span style="font-size:20px;font-weight:700;">${avgProt}g</span> <span style="font-size:12px;color:var(--gray-light);">prot/jour</span></div>
        </div>
      </div>`;
    }

    // Jours
    Object.keys(days).sort((a, b) => b.localeCompare(a)).forEach(date => {
      const { entries, seances } = days[date];
      const cal  = entries.reduce((s, e) => s + e.calories, 0);
      const prot = Math.round(entries.reduce((s, e) => s + parseFloat(e.proteines), 0));
      const gluc = Math.round(entries.reduce((s, e) => s + parseFloat(e.glucides), 0));
      const lip  = Math.round(entries.reduce((s, e) => s + parseFloat(e.lipides), 0));
      const diff = target.calories_cible && cal ? cal - target.calories_cible : 0;
      const diffLabel = diff > 0 ? `+${diff}` : `${diff}`;
      const diffColor = Math.abs(diff) < 100 ? 'var(--success)' : diff > 0 ? 'var(--error)' : 'var(--gold)';

      const habitsChecked = this.habitudesJournal.filter(j => j.date_entree === date);

      html += `<div class="card" style="margin-bottom:0.75rem;">
        <div style="cursor:pointer;" onclick="LogbookPage.currentDate='${date}';window.location.hash='#logbook';">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="font-size:14px;font-weight:600;">${formatDateFR(date)}</div>
            ${target.calories_cible && cal ? `<div style="font-size:12px;font-weight:600;color:${diffColor};">${diffLabel} kcal</div>` : ''}
          </div>
          ${entries.length > 0 ? `
          <div style="display:flex;gap:12px;font-size:13px;color:var(--gray-light);">
            <span><strong style="color:var(--black);">${cal}</strong> kcal</span>
            <span>P:${prot}g</span><span>G:${gluc}g</span><span>L:${lip}g</span>
            <span style="margin-left:auto;font-size:12px;">${entries.length} repas</span>
          </div>
          ${target.calories_cible && cal ? pctBar(cal, target.calories_cible) : ''}` : '<div style="font-size:12px;color:var(--gray-muted);">Aucun repas enregistré</div>'}
          ${habitsChecked.length > 0 ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
            ${habitsChecked.map(j => {
              const h = this.habitudes.find(hh => hh.id === j.habitude_id);
              return h ? `<span style="font-size:11px;background:var(--gold-light);color:var(--gold);padding:2px 8px;border-radius:20px;">✅ ${h.label}</span>` : '';
            }).join('')}
          </div>` : ''}
        </div>
        ${seances.map(s => this._renderSeance(s)).join('')}
      </div>`;
    });

    el.innerHTML = html;
  }
};
