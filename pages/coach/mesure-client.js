// APEX APP — Coach : Mesures d'un client

const CoachMesureClientPage = {
  clientId: null,
  clientName: '',
  history: [],
  _selectedMens: null,

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX · COACH</div>
          <div class="app-title" id="mesureCoachTitle">Mesures</div>
        </div>
        <button class="header-btn" onclick="history.back()">←</button>
      </div>
      <div id="mesureNav"></div>
      <div id="mesureCoachContent"><div class="spinner" style="margin-top:3rem;"></div></div>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile || profile.role !== 'coach') { window.location.hash = '#login'; return; }

    const params = Router.getParams();
    this.clientId   = params.clientId;
    this.clientName = params.clientName || 'Client';
    if (!this.clientId) { window.location.hash = '#coach-clients'; return; }

    const title = document.getElementById('mesureCoachTitle');
    if (title) title.textContent = this.clientName;
    const mesureNav = document.getElementById('mesureNav');
    if (mesureNav) mesureNav.innerHTML = coachClientNav(this.clientId, 'coach-mesure-client');

    try {
      this.history = await db.getClientMesures(this.clientId);
      this.renderContent();
    } catch (e) {
      document.getElementById('mesureCoachContent').innerHTML =
        '<div class="alert alert-error">Erreur de chargement.</div>';
    }
  },

  renderContent() {
    const el = document.getElementById('mesureCoachContent');
    if (this.history.length === 0) {
      el.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📏</div>
        <div class="empty-text">Aucune mesure enregistrée pour ce client.</div>
      </div>`;
      return;
    }

    let html = '';

    // ── Graphique poids ──
    const poidsEntries = this.history.filter(e => e.poids != null);
    if (poidsEntries.length >= 2) {
      html += `<div class="card card-dark">
        <div class="card-title">Évolution du poids</div>
        ${this._renderLineGraph(poidsEntries, 'poids', '#C4820A', 'cGrad', 'kg')}
      </div>`;
    }

    // ── Courbes mensurations ──
    html += this._renderMensurations();

    // ── Historique (du plus récent au plus ancien) ──
    const sorted = [...this.history].reverse();
    html += `<div class="card" style="margin-top:1rem;">
      <div class="card-title">Historique des mesures</div>`;

    sorted.forEach(m => {
      const hasData = m.poids || m.tour_taille || m.hanches || m.poitrine || m.bras || m.cuisse;
      html += `<div style="padding:12px 0;border-bottom:1px solid var(--border);">
        <div style="font-size:13px;font-weight:600;color:var(--gold);margin-bottom:8px;">
          ${formatDateFR(m.date_entree)}
        </div>
        ${hasData ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:${m.photos?.length > 0 ? '8px' : '0'};">
          ${m.poids       ? `<span class="mesure-chip mesure-chip-poids">⚖️ ${m.poids} kg</span>`         : ''}
          ${m.tour_taille ? `<span class="mesure-chip">Taille ${m.tour_taille} cm</span>`                 : ''}
          ${m.hanches     ? `<span class="mesure-chip">Hanches ${m.hanches} cm</span>`                    : ''}
          ${m.poitrine    ? `<span class="mesure-chip">Poitrine ${m.poitrine} cm</span>`                  : ''}
          ${m.bras        ? `<span class="mesure-chip">Bras ${m.bras} cm</span>`                          : ''}
          ${m.cuisse      ? `<span class="mesure-chip">Cuisse ${m.cuisse} cm</span>`                      : ''}
        </div>` : ''}
        ${m.photos && m.photos.length > 0 ? `
          <button class="btn btn-ghost btn-small"
            onclick="CoachMesureClientPage.togglePhotos('${m.date_entree}', this)">
            📷 ${m.photos.length} photo${m.photos.length > 1 ? 's' : ''} — Voir
          </button>
          <div id="coachPhotos_${m.date_entree}" style="margin-top:8px;"></div>
        ` : ''}
      </div>`;
    });

    html += `</div>`;
    el.innerHTML = html;
  },

  _renderMensurations() {
    const fieldsMeta = [
      { key: 'tour_taille', label: 'Taille'   },
      { key: 'hanches',     label: 'Hanches'  },
      { key: 'poitrine',    label: 'Poitrine' },
      { key: 'bras',        label: 'Bras'     },
      { key: 'cuisse',      label: 'Cuisse'   },
    ];
    const available = fieldsMeta.filter(f =>
      this.history.filter(e => e[f.key] != null).length >= 2
    );
    if (!available.length) return '';

    if (!this._selectedMens || !available.find(f => f.key === this._selectedMens)) {
      this._selectedMens = available[0].key;
    }
    const entries = this.history.filter(e => e[this._selectedMens] != null);

    return `<div class="card" style="margin-top:1rem;">
      <div class="card-title">Évolution des mensurations</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;">
        ${available.map(f => `
          <button class="rec-kcal-btn${this._selectedMens === f.key ? ' active' : ''}"
            onclick="CoachMesureClientPage._selectedMens='${f.key}';CoachMesureClientPage.renderContent()">
            ${f.label}
          </button>`).join('')}
      </div>
      ${this._renderLineGraph(entries, this._selectedMens, '#6366F1', 'cmsGrad', 'cm')}
    </div>`;
  },

  _renderLineGraph(entries, field, color, gradId, unit) {
    if (entries.length < 2) return '';
    const W = 300, H = 78, px = 20, py = 16, pb = 4;
    const values = entries.map(e => parseFloat(e[field]));
    const minV = Math.min(...values), maxV = Math.max(...values);
    const range = maxV - minV || 1;
    const innerH = H - py - pb;
    const xStep = (W - px * 2) / (entries.length - 1);
    const pts = entries.map((e, i) => ({
      x: px + i * xStep,
      y: py + (1 - (parseFloat(e[field]) - minV) / range) * innerH,
      v: parseFloat(e[field])
    }));
    const t = 0.25;
    let lp = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i-1)], p1 = pts[i],
            p2 = pts[i+1], p3 = pts[Math.min(pts.length-1, i+2)];
      lp += ` C ${(p1.x+(p2.x-p0.x)*t).toFixed(1)},${(p1.y+(p2.y-p0.y)*t).toFixed(1)}`
          + ` ${(p2.x-(p3.x-p1.x)*t).toFixed(1)},${(p2.y-(p3.y-p1.y)*t).toFixed(1)}`
          + ` ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    const ap   = lp + ` L ${pts[pts.length-1].x.toFixed(1)},${H} L ${pts[0].x.toFixed(1)},${H} Z`;
    const step = entries.length <= 8 ? 1 : Math.ceil(entries.length / 8);
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;overflow:visible;margin-top:8px;">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${color}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${ap}" fill="url(#${gradId})"/>
      <path d="${lp}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
      ${pts.map((p, i) => `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.8" fill="${color}"/>
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.6" fill="#1A1A1A"/>
        ${(i % step === 0 || i === pts.length - 1) ? `<text x="${p.x.toFixed(1)}" y="${(p.y-7).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="600" fill="${color}">${p.v}${unit}</text>` : ''}
      `).join('')}
    </svg>`;
  },

  async togglePhotos(date, btn) {
    const container = document.getElementById('coachPhotos_' + date);
    if (!container) return;

    // Si déjà chargé → toggle
    if (container.innerHTML) {
      container.innerHTML = '';
      const mesure = this.history.find(m => m.date_entree === date);
      btn.textContent = `📷 ${mesure?.photos?.length || 0} photo${mesure?.photos?.length > 1 ? 's' : ''} — Voir`;
      return;
    }

    btn.textContent = '⏳ Chargement…';
    const mesure = this.history.find(m => m.date_entree === date);
    if (!mesure?.photos?.length) { btn.textContent = 'Aucune photo'; return; }

    try {
      const urls = await Promise.all(mesure.photos.map(p => db.getMesurePhotoUrl(p)));
      container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        ${urls.map(url => `
          <img src="${url}"
            style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;cursor:pointer;"
            onclick="window.open('${url}','_blank')">`).join('')}
      </div>`;
      btn.textContent = '📷 Masquer';
    } catch (e) {
      btn.textContent = '⚠️ Erreur chargement';
    }
  }
};
