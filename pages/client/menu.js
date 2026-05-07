// APEX APP — Client : Analyser la carte d'un restaurant

const MenuPage = {
  _base64: null,
  _result: null,
  _previewUrl: null,

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE</div>
          <div class="app-title">Carte restaurant</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#outils'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
      <div id="menuContent" style="padding:1rem 1rem 5rem;"></div>
      ${clientNav('outils')}`;
  },

  init() {
    const profile = Router.userProfile;
    if (!profile || profile.role === 'coach') { window.location.hash = '#outils'; return; }
    this._base64  = null;
    this._result  = null;
    this._previewUrl = null;
    this._renderUpload();
  },

  _renderUpload() {
    // Révoquer l'URL blob si l'utilisateur revient à l'écran d'upload
    if (this._previewUrl) { URL.revokeObjectURL(this._previewUrl); this._previewUrl = null; }
    document.getElementById('menuContent').innerHTML = `
      <div style="text-align:center;padding:1rem 0 0.5rem;">
        <div style="font-size:40px;margin-bottom:0.5rem;">🍽️</div>
        <div style="font-weight:700;font-size:17px;margin-bottom:6px;">Analyse de carte</div>
        <div style="font-size:14px;color:var(--gray-light);line-height:1.5;margin-bottom:1.5rem;">
          Prends en photo la carte du restaurant.<br>L'IA te recommande les meilleurs plats selon ton objectif.
        </div>
      </div>

      <label class="menu-upload-zone" id="menuUploadZone">
        <div class="menu-upload-icon">📷</div>
        <div class="menu-upload-label">Prendre une photo</div>
        <div class="menu-upload-sub">ou appuie pour choisir dans la galerie</div>
        <input type="file" accept="image/*" capture="environment"
          id="menuFileInput" style="display:none;" onchange="MenuPage._onFile(event)">
      </label>

      <label class="menu-upload-zone" style="margin-top:10px;padding:12px;">
        <div style="display:flex;align-items:center;gap:10px;font-size:14px;color:var(--gray);">
          <span style="font-size:20px;">🖼️</span> Importer depuis la galerie
        </div>
        <input type="file" accept="image/*"
          style="display:none;" onchange="MenuPage._onFile(event)">
      </label>

      <div id="menuErr" style="margin-top:12px;"></div>`;
  },

  async _onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Bug 31 — révoquer l'URL précédente avant d'en créer une nouvelle
    if (this._previewUrl) { URL.revokeObjectURL(this._previewUrl); this._previewUrl = null; }
    this._previewUrl = URL.createObjectURL(file);
    this._renderPreview();

    try {
      this._base64 = await this._resizeImage(file);
    } catch (_) {
      document.getElementById('menuErr').innerHTML = '<div class="alert alert-error">Erreur lors du chargement de l\'image.</div>';
    }
  },

  _renderPreview() {
    document.getElementById('menuContent').innerHTML = `
      <div style="margin-bottom:1rem;">
        <img src="${this._previewUrl}" alt="Carte" style="width:100%;border-radius:12px;max-height:280px;object-fit:cover;">
      </div>
      <div id="menuErr" style="margin-bottom:8px;"></div>
      <button class="btn btn-primary" style="width:100%;height:52px;font-size:15px;margin-bottom:10px;"
        onclick="MenuPage._analyze()">🤖 Analyser la carte</button>
      <button class="btn btn-secondary" style="width:100%;height:46px;"
        onclick="MenuPage._renderUpload()">← Choisir une autre photo</button>`;
  },

  async _analyze() {
    if (!this._base64) {
      document.getElementById('menuErr').innerHTML = '<div class="alert alert-error">Image non chargée. Réessaie.</div>';
      return;
    }

    // Loading
    document.getElementById('menuContent').innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;">
        <div class="spinner" style="margin:0 auto 1.5rem;"></div>
        <div id="menuStep" style="font-size:14px;color:var(--gray-light);">Lecture de la carte…</div>
      </div>`;

    const steps = ['Lecture de la carte…', 'Identification des plats…', 'Analyse nutritionnelle…', 'Sélection des meilleures options…'];
    let si = 0;
    const timer = setInterval(() => { si = (si + 1) % steps.length; const el = document.getElementById('menuStep'); if (el) el.textContent = steps[si]; }, 1600);

    try {
      // Charger le plan actif + logbook du jour pour personnaliser les recommandations
      const profile = Router.userProfile;
      let planProfile = null;
      if (profile) {
        try {
          const plan = await db.getActivePlan(profile.id);
          if (plan) {
            // Ce que le client a déjà mangé aujourd'hui
            const entries = await db.getJournalEntries(profile.id, todayStr());
            const consumed = entries.reduce((acc, e) => ({
              calories:  acc.calories  + (e.calories             || 0),
              proteines: acc.proteines + (parseFloat(e.proteines) || 0),
              glucides:  acc.glucides  + (parseFloat(e.glucides)  || 0),
              lipides:   acc.lipides   + (parseFloat(e.lipides)   || 0),
            }), { calories: 0, proteines: 0, glucides: 0, lipides: 0 });

            planProfile = {
              objectif:        profile.objectif,
              calories_cible:  plan.calories_cible,
              proteines_cible: plan.proteines_cible,
              glucides_cible:  plan.glucides_cible,
              lipides_cible:   plan.lipides_cible,
              consumed,
            };
          } else if (profile.objectif) {
            planProfile = { objectif: profile.objectif };
          }
        } catch (_) {}
      }

      this._result = await SnapCalories.analyzeMenu(this._base64, planProfile);
      clearInterval(timer);
      this._renderResult();
    } catch (err) {
      clearInterval(timer);
      document.getElementById('menuContent').innerHTML = `
        <div class="alert alert-error" style="margin-bottom:1rem;">${err.message}</div>
        <button class="btn btn-secondary" style="width:100%;" onclick="MenuPage._renderUpload()">← Recommencer</button>`;
    }
  },

  _renderResult() {
    const r = this._result;
    const topPick = r.top?.find(p => p.best) || r.top?.[0];

    let html = `
      <!-- Type de restaurant -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:1.25rem;">
        <img src="${this._previewUrl}" alt="" style="width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0;">
        <div>
          <div style="font-size:12px;color:var(--gray-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.07em;">Restaurant détecté</div>
          <div style="font-size:15px;font-weight:700;">${r.restaurant || 'Restaurant'}</div>
        </div>
      </div>

      <!-- Recommandations -->
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-muted);margin-bottom:10px;">✅ Meilleurs choix pour toi</div>`;

    (r.top || []).forEach(plat => {
      const isBest = plat.best || plat === topPick;
      html += `
        <div class="card${isBest ? ' card-accent' : ''}" style="margin-bottom:10px;${isBest ? 'border:1.5px solid var(--gold);' : ''}">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px;">
            <div style="font-weight:700;font-size:15px;">${plat.nom}</div>
            ${isBest ? `<span style="background:var(--gold);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap;flex-shrink:0;">Top choix</span>` : ''}
          </div>
          <div style="font-size:13px;color:var(--gray);margin-bottom:6px;">${plat.raison}</div>
          ${plat.macros ? `<div style="font-size:12px;color:var(--gray-muted);font-style:italic;">📊 ${plat.macros}</div>` : ''}
        </div>`;
    });

    // À éviter
    if (r.a_eviter) {
      html += `
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-muted);margin:1.25rem 0 10px;">⚠️ À éviter</div>
        <div class="card" style="border:1.5px solid #FFCDD2;background:#FFF8F8;">
          <div style="font-weight:700;font-size:15px;margin-bottom:4px;color:var(--error);">${r.a_eviter.nom}</div>
          <div style="font-size:13px;color:var(--gray);">${r.a_eviter.raison}</div>
        </div>`;
    }

    // Conseil
    if (r.conseil) {
      html += `
        <div style="background:var(--gold-light);border:1.5px solid var(--gold);border-radius:var(--radius-sm);padding:12px 14px;margin-top:1.25rem;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gold);margin-bottom:4px;">💡 Conseil</div>
          <div style="font-size:14px;color:var(--black);line-height:1.5;">${r.conseil}</div>
        </div>`;
    }

    // Bouton réanalyser
    html += `
      <button class="btn btn-secondary" style="width:100%;margin-top:1.5rem;height:48px;"
        onclick="MenuPage._renderUpload()">📷 Analyser une autre carte</button>`;

    document.getElementById('menuContent').innerHTML = html;
  },

  _resizeImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else       { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82).split(',')[1]);
      };
      img.onerror = reject;
      img.src = url;
    });
  }
};
