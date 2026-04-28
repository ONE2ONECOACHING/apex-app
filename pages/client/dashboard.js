// APEX APP — Dashboard Client (progression poids + habitudes)

const DashboardPage = {
  profile: null,
  poidsHistory: [],
  habitudes: [],
  habitudesJournal: [],
  pendingBilans: [],

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX</div>
          <div class="app-title" id="dashGreeting">Dashboard</div>
        </div>
        <button class="header-btn" onclick="Router.logout()" title="Déconnexion">⏻</button>
      </div>
      <div id="dashContent"><div class="spinner" style="margin-top:3rem;"></div></div>
      <nav class="nav-bottom"><div class="nav-inner">
        <a class="nav-item active" href="#dashboard"><span class="nav-icon">🏠</span><span class="nav-label">Dashboard</span></a>
        <a class="nav-item" href="#logbook"><span class="nav-icon">🥗</span><span class="nav-label">Nutrition</span></a>
      </div></nav>`;
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

      [this.poidsHistory, this.habitudes, this.habitudesJournal, this.pendingBilans] = await Promise.all([
        db.getPoidsHistory(profile.id),
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
    const history = this.poidsHistory;
    const poidsActuel = history.length > 0 ? parseFloat(history[history.length - 1].poids) : (p.poids || null);
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
      ${this.renderGraph(history)}
      <div style="margin-top:12px;" id="weightInputWrap">
        <button class="btn btn-ghost btn-small" style="width:100%;" onclick="DashboardPage.toggleWeightInput()">✏️ Enregistrer mon poids</button>
        <div id="weightInputDiv" style="display:none;margin-top:8px;">
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="number" class="input" id="newPoidsInput" placeholder="ex: 78.5" step="0.1" style="flex:1;height:40px;">
            <span style="font-size:14px;color:var(--gray-light);">kg</span>
            <button class="btn btn-primary btn-small" onclick="DashboardPage.saveWeight()">OK</button>
          </div>
        </div>
      </div>
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
    const totalDelta = Math.abs(objectif - depart);
    const doneDelta = Math.abs(actuel - depart);
    const pct = Math.min(100, Math.round(doneDelta / totalDelta * 100));
    const perdu = Math.abs(actuel - depart).toFixed(1);
    const reste = Math.abs(objectif - actuel).toFixed(1);
    const label = objectif < depart ? `−${perdu} kg perdus · ${reste} kg restants` : `+${perdu} kg gagnés · ${reste} kg restants`;
    return `<div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray-muted);margin-bottom:4px;">
        <span>Progression</span><span>${pct}%</span>
      </div>
      <div class="pct-bar"><div class="pct-fill" style="width:${pct}%;background:var(--gold);"></div></div>
      <div style="font-size:12px;color:var(--gray-muted);margin-top:4px;text-align:center;">${label}</div>
    </div>`;
  },

  renderGraph(entries) {
    if (entries.length < 2) return '';
    const W = 300, H = 78, px = 20, py = 16, pb = 4;
    const weights = entries.map(e => parseFloat(e.poids));
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const range = maxW - minW || 1;
    const innerH = H - py - pb;
    const xStep = (W - px * 2) / (entries.length - 1);

    const pts = entries.map((e, i) => ({
      x: px + i * xStep,
      y: py + (1 - (parseFloat(e.poids) - minW) / range) * innerH,
      w: parseFloat(e.poids)
    }));

    // Courbe lissée cardinal spline → cubic bezier
    const t = 0.25;
    let linePath = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = (p1.x + (p2.x - p0.x) * t).toFixed(1);
      const cp1y = (p1.y + (p2.y - p0.y) * t).toFixed(1);
      const cp2x = (p2.x - (p3.x - p1.x) * t).toFixed(1);
      const cp2y = (p2.y - (p3.y - p1.y) * t).toFixed(1);
      linePath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    const areaPath = linePath
      + ` L ${pts[pts.length-1].x.toFixed(1)},${H}`
      + ` L ${pts[0].x.toFixed(1)},${H} Z`;

    const step = entries.length <= 8 ? 1 : Math.ceil(entries.length / 8);
    const showLabel = i => i % step === 0 || i === pts.length - 1;

    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;overflow:visible;margin-top:6px;">
      <defs>
        <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#C4820A" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#C4820A" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#wGrad)"/>
      <path d="${linePath}" fill="none" stroke="#C4820A" stroke-width="1.8" stroke-linecap="round"/>
      ${pts.map((p, i) => `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.8" fill="#C4820A"/>
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.6" fill="#1A1A1A"/>
        ${showLabel(i) ? `<text x="${p.x.toFixed(1)}" y="${(p.y - 7).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="600" fill="#C4820A">${p.w}kg</text>` : ''}
      `).join('')}
    </svg>`;
  },

  toggleWeightInput() {
    const div = document.getElementById('weightInputDiv');
    div.style.display = div.style.display === 'none' ? '' : 'none';
    if (div.style.display !== 'none') document.getElementById('newPoidsInput').focus();
  },

  async saveWeight() {
    const val = parseFloat(document.getElementById('newPoidsInput').value);
    if (!val || val < 20 || val > 300) { alert('Poids invalide.'); return; }
    try {
      await db.logPoids(this.profile.id, todayStr(), val);
      await db.updateProfile(this.profile.id, { poids: val });
      this.poidsHistory = await db.getPoidsHistory(this.profile.id);
      Router.userProfile.poids = val;
      this.profile.poids = val;
      this.renderContent();
    } catch (e) { alert('Erreur : ' + e.message); }
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
