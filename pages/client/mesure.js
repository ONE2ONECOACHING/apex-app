// APEX APP — Client : Mesures (poids, mensurations, photos)

const MesurePage = {
  currentDate: todayStr(),
  profileId: null,
  mesure: null,         // entrée du jour courant
  history: [],          // toutes les entrées (pour les graphiques)
  photoUrls: [],        // [{url, path}] signées pour la date courante
  _selectedMens: null,  // onglet mensuration actif

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE</div>
          <div class="app-title">Mes mesures</div>
        </div>
        <button class="header-btn" onclick="Router.logout()" title="Déconnexion">⏻</button>
      </div>

      <div class="date-nav">
        <button class="date-nav-btn" onclick="MesurePage.changeDate(-1)">‹</button>
        <div class="date-nav-label" id="mesureDate"></div>
        <button class="date-nav-btn" onclick="MesurePage.changeDate(1)">›</button>
      </div>

      <div id="mesureContent"><div class="spinner" style="margin-top:3rem;"></div></div>

      ${clientNav('mesure')}`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile) return;
    if (profile.role === 'coach') { window.location.hash = '#coach-clients'; return; }
    // Reset pour éviter d'afficher les données d'une session précédente
    this.currentDate   = todayStr();
    this.mesure        = null;
    this.history       = [];
    this.photoUrls     = [];
    this._selectedMens = null;
    this.profileId = profile.id;
    this.updateDateLabel();
    await this.loadAll();
  },

  updateDateLabel() {
    const el = document.getElementById('mesureDate');
    if (el) el.textContent = this.currentDate === todayStr() ? "Aujourd'hui" : formatDateFR(this.currentDate);
  },

  async changeDate(delta) {
    const d = new Date(this.currentDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    if (d > new Date()) return;
    this.currentDate = formatDate(d);
    this.updateDateLabel();
    try {
      this.mesure    = await db.getMesure(this.profileId, this.currentDate);
      this.photoUrls = await this._loadPhotoUrls(this.mesure);
    } catch (e) {
      this.mesure = null; this.photoUrls = [];
    }
    this.renderContent();
  },

  async loadAll() {
    try {
      [this.history, this.mesure] = await Promise.all([
        db.getMesures(this.profileId),
        db.getMesure(this.profileId, this.currentDate)
      ]);
      this.photoUrls = await this._loadPhotoUrls(this.mesure);
      this.renderContent();
    } catch (e) {
      document.getElementById('mesureContent').innerHTML =
        '<div class="alert alert-error">Erreur de chargement.</div>';
    }
  },

  async _loadPhotoUrls(mesure) {
    if (!mesure?.photos?.length) return [];
    try {
      const urls = await Promise.all(mesure.photos.map(p => db.getMesurePhotoUrl(p)));
      return urls.map((url, i) => ({ url, path: mesure.photos[i] }));
    } catch (_) { return []; }
  },

  // ── Render principal ─────────────────────────────────────────────────────

  renderContent() {
    const m = this.mesure || {};
    let html = '';

    // ── Carte poids ──
    const _poidsCard = `<div class="card card-dark">
      <div class="card-title">Poids</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="number" class="input" id="mesurePoids"
          placeholder="ex : 78.5" step="0.1" inputmode="decimal"
          value="${m.poids != null ? m.poids : ''}"
          style="flex:1;height:44px;">
        <span style="font-size:14px;color:var(--gray-light);">kg</span>
      </div>
      ${this._renderLineGraph(this.history.filter(e => e.poids != null), 'poids', '#C4820A', 'mGrad', 'kg')}
    </div>`;

    // ── Courbes côte à côte si mensurations disponibles ──
    const _mensCard = this._renderMensurations();
    if (_mensCard) {
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;">${_poidsCard}${_mensCard}</div>`;
    } else {
      html += _poidsCard;
    }

    // ── Saisie mensurations ──
    const fields = [
      { key: 'tour_taille', label: 'Tour de taille' },
      { key: 'hanches',     label: 'Hanches'        },
      { key: 'poitrine',    label: 'Poitrine'       },
      { key: 'bras',        label: 'Bras'           },
      { key: 'cuisse',      label: 'Cuisse'         },
    ];
    html += `<div class="card" style="margin-top:1rem;">
      <div class="card-title">Mensurations <span style="font-size:11px;font-weight:400;color:var(--gray-muted);">(cm)</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${fields.map(f => `
          <div>
            <div style="font-size:11px;color:var(--gray-muted);margin-bottom:4px;">${f.label}</div>
            <input type="number" class="input" id="mesure_${f.key}"
              placeholder="—" step="0.5" inputmode="decimal"
              value="${m[f.key] != null ? m[f.key] : ''}"
              style="height:40px;text-align:center;">
          </div>`).join('')}
      </div>
    </div>`;

    // ── Bouton enregistrer ──
    html += `<button class="btn btn-primary" style="margin-top:1rem;width:100%;"
      onclick="MesurePage.save()">✓ Enregistrer</button>
    <div id="mesureSaveResult" style="margin-top:0.5rem;"></div>`;

    // ── Photos ──
    html += `<div class="card" style="margin-top:1rem;">
      <div class="card-title">Photos</div>
      <div style="font-size:12px;color:var(--gray-muted);margin-bottom:12px;line-height:1.6;">
        💡 <span style="font-weight:600;">Face</span> · <span style="font-weight:600;">Profil</span> · <span style="font-weight:600;">Dos</span> — tenue de sport, même éclairage à chaque fois.
      </div>`;

    if (this.photoUrls.length > 0) {
      html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
        ${this.photoUrls.map((p, i) => `
          <div style="position:relative;">
            <img src="${p.url}"
              style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;display:block;"
              onclick="window.open('${p.url}','_blank')">
            <button onclick="MesurePage.deletePhoto('${p.path}',${i})"
              style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.65);
                     border:none;color:#fff;border-radius:50%;width:24px;height:24px;
                     font-size:14px;cursor:pointer;padding:0;line-height:24px;text-align:center;">×</button>
          </div>`).join('')}
      </div>`;
    } else {
      html += `<div style="font-size:13px;color:var(--gray-muted);margin-bottom:12px;">Aucune photo pour cette date.</div>`;
    }

    html += `<label class="btn btn-ghost btn-small"
        style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;">
        📷 Ajouter des photos
        <input type="file" accept="image/*" multiple style="display:none;"
          onchange="MesurePage.uploadPhotos(this)">
      </label>
      <div id="mesurePhotoResult" style="margin-top:0.5rem;"></div>
    </div>`;

    document.getElementById('mesureContent').innerHTML = html;
  },

  // ── Courbes ──────────────────────────────────────────────────────────────

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
            onclick="MesurePage._selectedMens='${f.key}';MesurePage.renderContent()">
            ${f.label}
          </button>`).join('')}
      </div>
      ${this._renderLineGraph(entries, this._selectedMens, '#6366F1', 'msGrad', 'cm')}
    </div>`;
  },

  /** Graphe SVG générique — réutilisé pour poids ET mensurations */
  _renderLineGraph(entries, field, color, gradId, unit) {
    if (entries.length < 2) return '';
    const W = 300, H = 78, px = 20, py = 16, pb = 4;
    const values  = entries.map(e => parseFloat(e[field]));
    const minV    = Math.min(...values), maxV = Math.max(...values);
    const range   = maxV - minV || 1;
    const innerH  = H - py - pb;
    const xStep   = (W - px * 2) / (entries.length - 1);
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

  // ── Actions ──────────────────────────────────────────────────────────────

  async save() {
    const poids       = parseFloat(document.getElementById('mesurePoids').value)        || null;
    const tour_taille = parseFloat(document.getElementById('mesure_tour_taille').value) || null;
    const hanches     = parseFloat(document.getElementById('mesure_hanches').value)     || null;
    const poitrine    = parseFloat(document.getElementById('mesure_poitrine').value)    || null;
    const bras        = parseFloat(document.getElementById('mesure_bras').value)        || null;
    const cuisse      = parseFloat(document.getElementById('mesure_cuisse').value)      || null;

    if (!poids && !tour_taille && !hanches && !poitrine && !bras && !cuisse) {
      document.getElementById('mesureSaveResult').innerHTML =
        '<div class="alert alert-error">Remplis au moins un champ.</div>';
      return;
    }
    if (poids && (poids < 20 || poids > 300)) {
      document.getElementById('mesureSaveResult').innerHTML =
        '<div class="alert alert-error">Poids invalide (20–300 kg).</div>';
      return;
    }

    const btn = document.querySelector('#mesureContent .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enregistrement…'; }

    try {
      const saved = await db.upsertMesure({
        profile_id: this.profileId, date_entree: this.currentDate,
        poids, tour_taille, hanches, poitrine, bras, cuisse,
        photos: this.mesure?.photos || []
      });
      this.mesure = saved;

      if (poids) {
        await db.updateProfile(this.profileId, { poids });
        Router.userProfile.poids = poids;
      }

      this.history = await db.getMesures(this.profileId);

      document.getElementById('mesureSaveResult').innerHTML =
        '<div class="alert alert-success">✓ Enregistré !</div>';
      setTimeout(() => {
        const el = document.getElementById('mesureSaveResult');
        if (el) el.innerHTML = '';
      }, 2000);
      this.renderContent();
    } catch (e) {
      document.getElementById('mesureSaveResult').innerHTML =
        '<div class="alert alert-error">' + e.message + '</div>';
      if (btn) { btn.disabled = false; btn.textContent = '✓ Enregistrer'; }
    }
  },

  async uploadPhotos(input) {
    const files = Array.from(input.files);
    if (!files.length) return;
    const resultEl = document.getElementById('mesurePhotoResult');
    resultEl.innerHTML = `<div style="font-size:13px;color:var(--gray-muted);">📤 Envoi… (0 / ${files.length})</div>`;
    try {
      const newPaths = [];
      for (let i = 0; i < files.length; i++) {
        resultEl.innerHTML = `<div style="font-size:13px;color:var(--gray-muted);">📤 Envoi… (${i+1} / ${files.length})</div>`;
        newPaths.push(await db.uploadMesurePhoto(this.profileId, this.currentDate, files[i]));
      }
      const m = this.mesure || {};
      const saved = await db.upsertMesure({
        profile_id: this.profileId, date_entree: this.currentDate,
        poids: m.poids||null, tour_taille: m.tour_taille||null,
        hanches: m.hanches||null, poitrine: m.poitrine||null,
        bras: m.bras||null, cuisse: m.cuisse||null,
        photos: [...(m.photos||[]), ...newPaths]
      });
      this.mesure    = saved;
      this.photoUrls = await this._loadPhotoUrls(saved);
      resultEl.innerHTML = '';
      this.renderContent();
    } catch (e) {
      resultEl.innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  async deletePhoto(path, _index) {
    if (!confirm('Supprimer cette photo ?')) return;
    try {
      await db.deleteMesurePhoto(path);
      const m     = this.mesure;
      const saved = await db.upsertMesure({
        profile_id: this.profileId, date_entree: this.currentDate,
        poids: m.poids||null, tour_taille: m.tour_taille||null,
        hanches: m.hanches||null, poitrine: m.poitrine||null,
        bras: m.bras||null, cuisse: m.cuisse||null,
        photos: (m.photos||[]).filter(p => p !== path)
      });
      this.mesure    = saved;
      this.photoUrls = await this._loadPhotoUrls(saved);
      this.renderContent();
    } catch (e) { alert('Erreur : ' + e.message); }
  }
};
