// APEX APP — Dashboard Client (progression poids + habitudes)

const DashboardPage = {
  profile: null,
  habitudes: [],
  habitudesJournal: [],
  pendingBilans: [],

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE</div>
          <div class="app-title" id="dashGreeting">Dashboard</div>
        </div>
        <button class="header-btn" onclick="Router.logout()" title="Déconnexion">⏻</button>
      </div>
      <div id="dashContent"><div class="spinner" style="margin-top:3rem;"></div></div>
      ${clientNav('dashboard')}`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile) return;
    if (profile.role === 'coach') { window.location.hash = '#coach-clients'; return; }

    this.profile = profile;
    document.getElementById('dashGreeting').textContent = 'Salut ' + (profile.prenom || '') + ' 👊';

    try {
      // Déclencher la création du bilan de la semaine si assignation active
      await db.ensureBilanInstance(profile.id).catch(() => {});

      [this.habitudes, this.habitudesJournal, this.pendingBilans] = await Promise.all([
        db.getHabitudes(profile.id).catch(() => []),
        db.getHabitudesJournal(profile.id, todayStr()).catch(() => []),
        db.getPendingBilans(profile.id).catch(() => [])
      ]);
      this.renderContent();
    } catch (e) {
      document.getElementById('dashContent').innerHTML = '<div class="alert alert-error">Erreur de chargement.</div>';
    }
  },

  renderContent() {
    const p = this.profile;
    const poidsActuel = p.poids ? parseFloat(p.poids) : null;
    const poidsDepart = p.poids_depart || null;
    const poidsObjectif = p.poids_objectif || null;

    let html = '';

    // Badge bilan en attente
    if (this.pendingBilans.length > 0) {
      const n = this.pendingBilans.length;
      html += `<div class="bilan-badge-card" onclick="window.location.hash='#client-bilan'">
        <div class="bilan-badge-icon">📝</div>
        <div>
          <div class="bilan-badge-title">${n} bilan${n > 1 ? 's' : ''} en attente</div>
          <div class="bilan-badge-sub">Remplis ton questionnaire hebdomadaire</div>
        </div>
        <div class="bilan-badge-arrow">›</div>
      </div>`;
    }

    // Carte poids
    html += `<div class="card card-dark">
      <div class="card-title">Mon poids</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;margin-bottom:12px;">
        <div>
          <div style="font-size:11px;color:var(--gray-muted);margin-bottom:2px;">Départ</div>
          <div style="font-size:18px;font-weight:700;">${poidsDepart ? poidsDepart + ' kg' : '—'}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--gold);margin-bottom:2px;">Actuel</div>
          <div style="font-size:24px;font-weight:700;color:var(--gold);">${poidsActuel ? poidsActuel + ' kg' : '—'}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--gray-muted);margin-bottom:2px;">Objectif</div>
          <div style="font-size:18px;font-weight:700;">${poidsObjectif ? poidsObjectif + ' kg' : '—'}</div>
        </div>
      </div>
      ${this.renderProgress(poidsDepart, poidsActuel, poidsObjectif)}
    </div>`;

    // Habitudes du jour
    if (this.habitudes.length > 0) {
      html += `<div class="card" style="margin-top:1rem;">
        <div class="card-title">Mes habitudes</div>`;
      this.habitudes.forEach(h => {
        const journal = this.habitudesJournal.find(j => j.habitude_id === h.id);
        const checked = journal ? journal.checked : false;
        html += `<div style="margin-bottom:0.75rem;">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
            <input type="checkbox" style="width:20px;height:20px;accent-color:var(--gold);cursor:pointer;" ${checked ? 'checked' : ''}
              onchange="DashboardPage.saveHabitude('${h.id}', this.checked)">
            <div>
              <div style="font-weight:500;font-size:14px;">${h.label}</div>
              ${h.tips ? `<div style="font-size:12px;color:var(--gray-muted);font-style:italic;">💡 ${h.tips}</div>` : ''}
            </div>
          </label>
        </div>`;
      });
      html += `</div>`;
    }

    document.getElementById('dashContent').innerHTML = html;
  },

  renderProgress(depart, actuel, objectif) {
    if (!depart || !actuel || !objectif || depart === objectif) return '';
    const loseGoal   = objectif < depart;          // true = objectif de perte
    const totalDelta = Math.abs(objectif - depart); // amplitude totale
    let pct, label;

    if (loseGoal) {
      const done = depart - actuel;  // positif = perdu, négatif = pris
      pct = Math.max(0, Math.min(100, Math.round(done / totalDelta * 100)));
      if (done < 0) {
        // Mauvaise direction : a pris du poids
        label = `+${Math.abs(done).toFixed(1)} kg pris · ${(actuel - objectif).toFixed(1)} kg à perdre`;
      } else {
        label = `−${done.toFixed(1)} kg perdus · ${Math.max(0, actuel - objectif).toFixed(1)} kg restants`;
      }
    } else {
      const done = actuel - depart;  // positif = pris, négatif = perdu
      pct = Math.max(0, Math.min(100, Math.round(done / totalDelta * 100)));
      if (done < 0) {
        // Mauvaise direction : a perdu du poids
        label = `−${Math.abs(done).toFixed(1)} kg perdus · ${(objectif - actuel).toFixed(1)} kg à prendre`;
      } else {
        label = `+${done.toFixed(1)} kg gagnés · ${Math.max(0, objectif - actuel).toFixed(1)} kg restants`;
      }
    }

    return `<div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray-muted);margin-bottom:4px;">
        <span>Progression</span><span>${pct}%</span>
      </div>
      <div class="pct-bar"><div class="pct-fill" style="width:${pct}%;background:var(--gold);"></div></div>
      <div style="font-size:12px;color:var(--gray-muted);margin-top:4px;text-align:center;">${label}</div>
    </div>`;
  },

  async saveHabitude(habitudeId, checked) {
    try {
      const saved = await db.upsertHabitudeJournal({
        profile_id: this.profile.id,
        habitude_id: habitudeId,
        date_entree: todayStr(),
        checked
      });
      const idx = this.habitudesJournal.findIndex(j => j.habitude_id === habitudeId);
      if (idx >= 0) this.habitudesJournal[idx] = saved;
      else this.habitudesJournal.push(saved);
    } catch (e) { console.error('Erreur habitude :', e); }
  }
};
