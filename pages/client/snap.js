// APEX APP — Ajouter un repas (Base / Photo / Enregistrés)

const SnapPage = {
  base64: null,
  context: 'Restaurant',
  portions: 1,
  creneau: 'dejeuner',
  date: todayStr(),
  result: null,
  mode: 'base',
  _baseCache: [],
  _baseSelected: null,
  _pendingSave: null,
  _cart: [],
  _savedMeals: [],
  _offDebounce: null,
  _labelBase64: null,
  _labelData: null,
  contexts: ['Restaurant', 'Maison', 'Travail / Traiteur', 'Fast-food', 'Sport'],

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE</div>
          <div class="app-title">Ajouter un repas</div>
        </div>
        <button class="header-btn" onclick="history.back()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
      </div>

      <div class="field">
        <label class="field-label">Créneau</label>
        <select class="input" id="snapCreneau" onchange="SnapPage.creneau=this.value">
          <option value="petit_dejeuner">Petit-déjeuner</option>
          <option value="collation_matin">Collation matin</option>
          <option value="dejeuner" selected>Déjeuner</option>
          <option value="collation_apres_midi">Collation après-midi</option>
          <option value="diner">Dîner</option>
          <option value="collation_soir">Collation soir</option>
        </select>
      </div>

      <div class="tabs" id="snapTabs">
        <button class="tab active" onclick="SnapPage.setMode('base', this)">🔍 Base</button>
        <button class="tab" onclick="SnapPage.setMode('photo', this)">📷 Photo</button>
        <button class="tab" onclick="SnapPage.setMode('label', this)">📊 Étiquette</button>
        <button class="tab" onclick="SnapPage.setMode('saved', this)">⭐ Enregistrés</button>
      </div>

      <!-- MODE BASE -->
      <div id="snapModeBase">
        <div class="search-wrap" style="margin-bottom:0.5rem;">
          <span class="search-icon">🔍</span>
          <input class="input search-input" id="baseSearchInput" placeholder="Chercher un aliment…"
            oninput="SnapPage.baseSearch(this)" autocomplete="off">
          <div class="search-results" id="baseResults"></div>
        </div>

        <div id="baseSelected" style="display:none;">
          <div class="card" style="margin-bottom:0.5rem;">
            <div id="baseSelectedName" style="font-size:14px;font-weight:700;margin-bottom:8px;"></div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
              <label class="field-label" style="margin:0;white-space:nowrap;">Quantité</label>
              <input class="input" type="number" id="baseQty" style="width:90px;" oninput="SnapPage.updateBasePreview()">
              <span id="baseQtyUnit" style="font-size:13px;color:var(--gray-light);"></span>
            </div>
            <div id="basePreview" style="font-size:13px;color:var(--gray);margin-bottom:10px;"></div>
            <button class="btn btn-primary" onclick="SnapPage.addToCart()">Valider</button>
          </div>
        </div>

        <!-- Panier -->
        <div id="baseCart" style="display:none;">
          <div class="card">
            <div class="card-title">Repas en cours</div>
            <div id="baseCartItems"></div>
            <div id="baseCartTotal" style="font-size:13px;font-weight:600;margin-top:8px;padding-top:8px;border-top:1px solid var(--border);"></div>
          </div>
          <button class="btn btn-secondary" onclick="SnapPage.submitCart(true)">⭐ Enregistrer ce repas</button>
          <button class="btn btn-primary" style="margin-top:0.5rem;" onclick="SnapPage.submitCart(false)">Ajouter au journal →</button>
        </div>
      </div>

      <!-- MODE PHOTO -->
      <div id="snapModePhoto" style="display:none;">
        <div id="snapUploadZone" class="upload-zone" style="cursor:default;">
          <input type="file" id="snapFileCamera" accept="image/*" capture="environment" style="display:none;" onchange="SnapPage.onFile(event)">
          <input type="file" id="snapFileGallery" accept="image/*" style="display:none;" onchange="SnapPage.onFile(event)">
          <div class="upload-icon">📷</div>
          <div class="upload-title">Ajoute une photo de ton repas</div>
          <div class="upload-sub">Ton assiette, ton plat, ta collation</div>
          <div style="display:flex;gap:10px;margin-top:14px;">
            <button onclick="document.getElementById('snapFileCamera').click()" class="btn btn-primary" style="flex:1;margin:0;">📷 Appareil photo</button>
            <button onclick="document.getElementById('snapFileGallery').click()" class="btn btn-secondary" style="flex:1;margin:0;">🖼 Galerie</button>
          </div>
        </div>

        <div id="snapPreview" style="display:none;">
          <div class="preview-wrap">
            <img id="snapPreviewImg" class="preview-img" src="" alt="Aperçu">
            <button class="preview-remove" onclick="SnapPage.resetPhoto()">×</button>
          </div>
          <label class="field-label">Contexte</label>
          <div class="toggle-row" style="margin-bottom:1rem;" id="snapContextBtns"></div>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:1.25rem;">
            <span class="field-label" style="margin:0;">Portions</span>
            <div style="display:flex;align-items:center;gap:10px;">
              <button class="toggle-btn" onclick="SnapPage.chgPort(-1)" style="width:34px;padding:0;">−</button>
              <span style="font-size:16px;font-weight:600;min-width:20px;text-align:center;" id="snapPortVal">1</span>
              <button class="toggle-btn" onclick="SnapPage.chgPort(1)" style="width:34px;padding:0;">+</button>
            </div>
          </div>
          <div id="snapError"></div>
          <button class="btn btn-primary" id="snapBtn" onclick="SnapPage.analyze()">Analyser ce plat →</button>
        </div>
      </div>

      <!-- MODE ÉTIQUETTE -->
      <div id="snapModeLabel" style="display:none;">
        <div id="labelUploadZone" class="upload-zone" style="cursor:default;">
          <input type="file" id="labelFileCamera" accept="image/*" capture="environment" style="display:none;" onchange="SnapPage.onLabelFile(event)">
          <input type="file" id="labelFileGallery" accept="image/*" style="display:none;" onchange="SnapPage.onLabelFile(event)">
          <div class="upload-icon">📊</div>
          <div class="upload-title">Photo du tableau nutritionnel</div>
          <div class="upload-sub">Étiquette, emballage, plat préparé type PrepmyMeal…</div>
          <div style="display:flex;gap:10px;margin-top:14px;">
            <button onclick="document.getElementById('labelFileCamera').click()" class="btn btn-primary" style="flex:1;margin:0;">📷 Appareil photo</button>
            <button onclick="document.getElementById('labelFileGallery').click()" class="btn btn-secondary" style="flex:1;margin:0;">🖼 Galerie</button>
          </div>
        </div>
        <div id="labelPreview" style="display:none;">
          <div class="preview-wrap">
            <img id="labelPreviewImg" class="preview-img" src="" alt="">
            <button class="preview-remove" onclick="SnapPage.resetLabel()">×</button>
          </div>
          <div id="labelError"></div>
          <button class="btn btn-primary" id="labelBtn" onclick="SnapPage.analyzeLabel()">📊 Lire les valeurs →</button>
        </div>
        <div id="labelLoading" style="display:none;text-align:center;padding:2.5rem 1rem;">
          <div class="spinner"></div>
          <div class="loading-text">Lecture du tableau nutritionnel…</div>
        </div>
        <div id="labelResultDiv" style="display:none;"></div>
      </div>

      <!-- MODE ENREGISTRÉS -->
      <div id="snapModeSaved" style="display:none;">
        <div id="savedList"><div class="spinner" style="margin-top:2rem;"></div></div>
      </div>

      <!-- MODAL ENREGISTRER -->
      <div id="saveModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:none;align-items:center;justify-content:center;padding:1rem;">
        <div style="background:var(--white);border-radius:var(--radius);padding:1.25rem;width:100%;max-width:400px;">
          <div style="font-size:15px;font-weight:700;margin-bottom:1rem;">⭐ Enregistrer ce repas</div>
          <div class="field">
            <label class="field-label">Nom du repas</label>
            <input class="input" id="saveModalName" placeholder="Ex : Riz + poulet">
          </div>
          <div style="display:flex;gap:8px;margin-top:0.75rem;">
            <button class="btn btn-primary" style="flex:1;" onclick="SnapPage.confirmSave()">Enregistrer</button>
            <button class="btn btn-secondary" onclick="SnapPage.closeSaveModal()">Annuler</button>
          </div>
        </div>
      </div>

      <!-- LOADING + RÉSULTAT -->
      <div id="snapLoading" style="display:none;text-align:center;padding:3rem 1rem;">
        <div class="spinner"></div>
        <div class="loading-text" id="snapStep">Identification du plat…</div>
      </div>
      <div id="snapResult" style="display:none;"></div>

      ${clientNav('logbook')}`;
  },

  init() {
    const params = Router.getParams();
    if (params.creneau) this.creneau = params.creneau;
    if (params.date) this.date = params.date;
    else this.date = todayStr(); // reset date au cas où la page est réouverte un autre jour
    this.mode = 'base';
    this._baseSelected = null;
    this._cart = [];
    // Bug 30 — reset de toutes les propriétés persistantes
    this.base64       = null;
    this.result       = null;
    this._labelBase64 = null;
    this._labelData   = null;
    this._pendingSave = null;
    this.portions     = 1;
    // Bug 18 — nettoyage du handler click-outside s'il subsistait
    if (this._outsideHandler) {
      document.removeEventListener('click', this._outsideHandler);
      this._outsideHandler = null;
    }

    const select = document.getElementById('snapCreneau');
    if (select) select.value = this.creneau;

    const ctxContainer = document.getElementById('snapContextBtns');
    if (ctxContainer) {
      ctxContainer.innerHTML = this.contexts.map(c =>
        `<button class="toggle-btn ${c === this.context ? 'active' : ''}" onclick="SnapPage.setContext('${c}', this)">${c}</button>`
      ).join('');
    }
  },

  setMode(mode, btn) {
    this.mode = mode;
    document.querySelectorAll('#snapTabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('snapModeBase').style.display  = mode === 'base'  ? 'block' : 'none';
    document.getElementById('snapModePhoto').style.display = mode === 'photo' ? 'block' : 'none';
    document.getElementById('snapModeLabel').style.display = mode === 'label' ? 'block' : 'none';
    document.getElementById('snapModeSaved').style.display = mode === 'saved' ? 'block' : 'none';
    document.getElementById('snapResult').style.display = 'none';
    if (mode === 'saved') this.loadSaved();
  },

  // ── MODE BASE ────────────────────────────────────────────────────────────────

  async baseSearch(input) {
    const q = input.value.trim();
    const resultsEl = document.getElementById('baseResults');
    if (q.length < 2) { resultsEl.classList.remove('show'); clearTimeout(this._offDebounce); return; }

    // Résultats locaux immédiats
    const local = await db.searchAliments(q);
    this._renderSearchResults(local, [], resultsEl);

    // Open Food Facts en parallèle (debounce 450ms)
    clearTimeout(this._offDebounce);
    this._offDebounce = setTimeout(() => this._searchOFF(q, local), 450);

    // Bug 18 — un seul handler click-outside actif à la fois
    if (this._outsideHandler) document.removeEventListener('click', this._outsideHandler);
    setTimeout(() => {
      this._outsideHandler = (e) => {
        if (!resultsEl.contains(e.target) && e.target !== input) {
          resultsEl.classList.remove('show');
          document.removeEventListener('click', this._outsideHandler);
          this._outsideHandler = null;
        }
      };
      document.addEventListener('click', this._outsideHandler);
    }, 100);
  },

  async _searchOFF(q, localResults) {
    const resultsEl = document.getElementById('baseResults');
    try {
      const resp = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=15&fields=product_name,nutriments&action=process&lc=fr`,
        { signal: AbortSignal.timeout(5000) }
      );
      const data = await resp.json();
      const off = (data.products || [])
        .filter(p => p.product_name && p.nutriments && p.nutriments['energy-kcal_100g'] != null)
        .map(p => ({
          nom: p.product_name,
          calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
          proteines: Math.round(p.nutriments['proteins_100g'] || 0),
          glucides: Math.round(p.nutriments['carbohydrates_100g'] || 0),
          lipides: Math.round(p.nutriments['fat_100g'] || 0),
          mode: 'weight',
          source: 'off'
        }));
      this._renderSearchResults(localResults, off, resultsEl);
    } catch (e) { /* OFF indisponible, on garde les résultats locaux */ }
  },

  _renderSearchResults(local, off, resultsEl) {
    const all = [
      ...local.map(a => ({ ...a, source: 'local' })),
      ...off
    ];
    this._baseCache = all;
    if (all.length === 0) { resultsEl.classList.remove('show'); return; }

    resultsEl.innerHTML = all.map((a, i) => {
      const per = a.mode === 'unit' ? '/unité' : '/100g';
      const badge = a.source === 'local'
        ? `<span style="font-size:9px;background:#EFF6FF;color:#3B82F6;border-radius:3px;padding:1px 5px;font-weight:700;margin-left:4px;">PERSO</span>`
        : '';
      return `<div class="search-item" onclick="SnapPage.selectBase(${i})">
        <div class="search-item-name">${a.nom}${badge}</div>
        <div class="search-item-macros">${a.calories} kcal ${per} · <span style="color:#3B82F6;">P${a.proteines}g</span> <span style="color:#C4820A;">G${a.glucides}g</span> <span style="color:#E05252;">L${a.lipides}g</span></div>
      </div>`;
    }).join('');
    resultsEl.classList.add('show');
  },

  selectBase(index) {
    const a = this._baseCache[index];
    if (!a) return;
    this._baseSelected = a;
    document.getElementById('baseResults').classList.remove('show');
    document.getElementById('baseSearchInput').value = a.nom;
    const defaultQty = a.mode === 'unit' ? 1 : 100;
    document.getElementById('baseQty').value = defaultQty;
    document.getElementById('baseQtyUnit').textContent = a.mode === 'unit' ? 'unité(s)' : 'g';
    document.getElementById('baseSelectedName').textContent = a.nom;
    document.getElementById('baseSelected').style.display = 'block';
    this.updateBasePreview();
  },

  updateBasePreview() {
    const a = this._baseSelected;
    if (!a) return;
    const qty = +document.getElementById('baseQty').value || 0;
    const factor = a.mode === 'unit' ? qty : qty / 100;
    const kcal = Math.round(a.calories * factor);
    const p = Math.round(a.proteines * factor);
    const g = Math.round(a.glucides * factor);
    const l = Math.round(a.lipides * factor);
    document.getElementById('basePreview').innerHTML =
      `<strong>${kcal} kcal</strong> · <span style="color:#3B82F6;">P ${p}g</span> · <span style="color:#C4820A;">G ${g}g</span> · <span style="color:#E05252;">L ${l}g</span>`;
  },

  addToCart() {
    const a = this._baseSelected;
    if (!a) return;
    const qty = +document.getElementById('baseQty').value || 0;
    if (qty <= 0) { toast('Quantité invalide.', 'error'); return; }
    const factor = a.mode === 'unit' ? qty : qty / 100;
    this._cart.push({
      nom: a.nom,
      quantite: qty,
      unite: a.mode === 'unit' ? 'unité' : 'g',
      calories: Math.round(a.calories * factor),
      proteines: Math.round(a.proteines * factor),
      glucides: Math.round(a.glucides * factor),
      lipides: Math.round(a.lipides * factor)
    });
    // Reset sélection
    this._baseSelected = null;
    document.getElementById('baseSelected').style.display = 'none';
    document.getElementById('baseSearchInput').value = '';
    this.renderCart();
  },

  renderCart() {
    const cart = this._cart;
    if (cart.length === 0) {
      document.getElementById('baseCart').style.display = 'none';
      return;
    }
    document.getElementById('baseCart').style.display = 'block';

    document.getElementById('baseCartItems').innerHTML = cart.map((item, i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:13px;font-weight:600;">${item.nom} <span style="color:var(--gray-muted);font-weight:400;">${item.quantite}${item.unite}</span></div>
          <div style="font-size:11px;color:var(--gray-muted);">${item.calories} kcal · <span style="color:#3B82F6;">P${item.proteines}g</span> · <span style="color:#C4820A;">G${item.glucides}g</span> · <span style="color:#E05252;">L${item.lipides}g</span></div>
        </div>
        <button onclick="SnapPage.removeFromCart(${i})" style="background:none;border:none;font-size:18px;color:var(--gray-muted);cursor:pointer;padding:4px;">×</button>
      </div>
    `).join('');

    const total = cart.reduce((acc, item) => ({
      kcal: acc.kcal + item.calories,
      p: acc.p + item.proteines,
      g: acc.g + item.glucides,
      l: acc.l + item.lipides
    }), { kcal: 0, p: 0, g: 0, l: 0 });

    document.getElementById('baseCartTotal').innerHTML =
      `<strong>${total.kcal} kcal</strong> · <span style="color:#3B82F6;">P ${total.p}g</span> · <span style="color:#C4820A;">G ${total.g}g</span> · <span style="color:#E05252;">L ${total.l}g</span>`;
  },

  removeFromCart(index) {
    this._cart.splice(index, 1);
    this.renderCart();
  },

  async submitCart(andSave) {
    const profile = Router.userProfile;
    if (!profile || this._cart.length === 0) return;
    try {
      for (const item of this._cart) {
        await db.addJournalEntry({
          profile_id: profile.id,
          date_entree: this.date,
          creneau: this.creneau,
          nom: item.nom,
          quantite: item.quantite,
          unite: item.unite,
          calories: item.calories,
          proteines: item.proteines,
          glucides: item.glucides,
          lipides: item.lipides,
          source: 'base'
        });
      }
      if (andSave) {
        const total = this._cart.reduce((acc, i) => ({ calories: acc.calories + i.calories, proteines: acc.proteines + i.proteines, glucides: acc.glucides + i.glucides, lipides: acc.lipides + i.lipides }), { calories: 0, proteines: 0, glucides: 0, lipides: 0 });
        this._pendingSave = total;
        this.openSaveModal(this._cart.map(i => i.nom).join(' + '));
      } else {
        this._cart = [];
        Router.navigate('logbook');
      }
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  // ── UTILITAIRE : redimensionner + compresser une image avant envoi API ───────

  _resizeImage(file, maxPx = 1600, quality = 0.82) {
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width: w, height: h } = img;
        if (w > maxPx || h > maxPx) {
          if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
          else        { w = Math.round(w * maxPx / h); h = maxPx; }
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality).split(',')[1]);
      };
      img.src = url;
    });
  },

  // ── MODE PHOTO ───────────────────────────────────────────────────────────────

  onFile(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    // Bug 32 — révoquer l'URL précédente avant d'en créer une nouvelle
    if (this._photoUrl) { URL.revokeObjectURL(this._photoUrl); this._photoUrl = null; }
    // Aperçu immédiat
    this._photoUrl = URL.createObjectURL(file);
    document.getElementById('snapPreviewImg').src = this._photoUrl;
    document.getElementById('snapPreview').style.display = 'block';
    document.getElementById('snapUploadZone').style.display = 'none';
    // Compression avant envoi API (limite 5 MB)
    this._resizeImage(file).then(b64 => { this.base64 = b64; });
  },

  resetPhoto() {
    this.base64 = null;
    if (this._photoUrl) { URL.revokeObjectURL(this._photoUrl); this._photoUrl = null; }
    document.getElementById('snapPreview').style.display = 'none';
    document.getElementById('snapUploadZone').style.display = 'block';
    document.getElementById('snapFileCamera').value = '';
    document.getElementById('snapFileGallery').value = '';
  },

  setContext(ctx, btn) {
    this.context = ctx;
    document.querySelectorAll('#snapContextBtns .toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  },

  chgPort(d) {
    this.portions = Math.max(1, Math.min(5, this.portions + d));
    document.getElementById('snapPortVal').textContent = this.portions;
  },

  async analyze() {
    if (!this.base64) return;
    const btn = document.getElementById('snapBtn');
    btn.disabled = true;
    document.getElementById('snapModePhoto').style.display = 'none';
    document.getElementById('snapLoading').style.display = 'block';

    const steps = ['Identification du plat…', 'Estimation des portions…', 'Calcul des macros…', 'Analyse nutritionnelle…'];
    let si = 0;
    const stepEl = document.getElementById('snapStep');
    const timer = setInterval(() => { si = (si + 1) % steps.length; stepEl.textContent = steps[si]; }, 1800);

    try {
      const profile = Router.userProfile;
      let planMacros = null;
      if (profile) {
        const plan = await db.getActivePlan(profile.id);
        if (plan) {
          const entries = await db.getJournalEntries(profile.id, this.date);
          const consumed = entries.reduce((acc, e) => ({
            calories: acc.calories + (e.calories || 0),
            proteines: acc.proteines + (parseFloat(e.proteines) || 0),
            glucides: acc.glucides + (parseFloat(e.glucides) || 0),
            lipides: acc.lipides + (parseFloat(e.lipides) || 0)
          }), { calories: 0, proteines: 0, glucides: 0, lipides: 0 });
          planMacros = { ...plan, consumed };
        }
      }

      this.result = await SnapCalories.analyze(this.base64, this.context, this.portions, planMacros);
      clearInterval(timer);
      document.getElementById('snapLoading').style.display = 'none';
      this.renderResult();
    } catch (err) {
      clearInterval(timer);
      document.getElementById('snapLoading').style.display = 'none';
      document.getElementById('snapModePhoto').style.display = 'block';
      btn.disabled = false;
      document.getElementById('snapError').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  },

  renderResult() {
    const r = this.result;
    const kcal = Math.round(r.calories_total);
    const p = Math.round(r.proteins_g), g = Math.round(r.carbs_g), l = Math.round(r.fats_g);

    document.getElementById('snapResult').style.display = 'block';
    document.getElementById('snapResult').innerHTML = `
      <div style="font-size:20px;font-weight:700;margin-bottom:4px;">${r.dish_name || 'Plat analysé'}</div>
      <div style="font-size:13px;color:var(--gray-light);margin-bottom:1.25rem;line-height:1.5;">${r.description || ''}</div>

      <div class="card card-dark" style="text-align:center;">
        <div style="font-size:11px;color:var(--gray-light);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Calories estimées</div>
        <div style="font-size:48px;font-weight:700;color:var(--gold);line-height:1;">${kcal.toLocaleString('fr-FR')}<span style="font-size:18px;color:var(--gray-light);margin-left:4px;">kcal</span></div>
        <div style="font-size:12px;color:var(--gray);margin-top:8px;">${this.context} · ${this.portions > 1 ? this.portions + ' portions' : '1 portion'}</div>
      </div>

      <div class="macros-grid" style="margin-bottom:1rem;">
        <div class="card" style="text-align:center;margin:0;"><div class="macro-val" style="color:#3B82F6;">${p}g</div><div class="macro-label">Protéines</div><div class="macro-kcal">${p * 4} kcal</div></div>
        <div class="card" style="text-align:center;margin:0;"><div class="macro-val" style="color:#C4820A;">${g}g</div><div class="macro-label">Glucides</div><div class="macro-kcal">${g * 4} kcal</div></div>
        <div class="card" style="text-align:center;margin:0;"><div class="macro-val" style="color:#E05252;">${l}g</div><div class="macro-label">Lipides</div><div class="macro-kcal">${l * 9} kcal</div></div>
      </div>

      ${r.note ? `<div class="card card-accent" style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:28px;font-weight:700;color:var(--gold);">${r.note}/10</div>
        <div style="font-size:13px;color:var(--gray);line-height:1.5;">${r.feedback || r.tip || ''}</div>
      </div>` : ''}

      <button class="btn btn-primary" onclick="SnapPage.addToJournal(false)">Ajouter au journal →</button>
      <button class="btn btn-secondary" style="margin-top:0.5rem;" onclick="SnapPage.addToJournal(true)">💾 Ajouter + enregistrer ce repas</button>
      <button class="btn btn-secondary" style="margin-top:0.5rem;" onclick="SnapPage.resetAll()">Analyser un autre plat</button>
    `;
  },

  async addToJournal(andSave) {
    const r = this.result;
    const profile = Router.userProfile;
    if (!r || !profile) return;
    const entry = {
      profile_id: profile.id,
      date_entree: this.date,
      creneau: this.creneau,
      nom: r.dish_name || 'Plat',
      description: r.description || '',
      calories: Math.round(r.calories_total),
      proteines: Math.round(r.proteins_g),
      glucides: Math.round(r.carbs_g),
      lipides: Math.round(r.fats_g),
      source: 'snap_calories',
      note: r.note || null,
      feedback: r.feedback || r.tip || null,
      confidence: r.confidence || null
    };
    try {
      await db.addJournalEntry(entry);
      if (andSave) {
        this._pendingSave = { nom: r.dish_name || 'Plat', calories: entry.calories, proteines: entry.proteines, glucides: entry.glucides, lipides: entry.lipides };
        this.openSaveModal(r.dish_name || 'Plat');
      } else {
        Router.navigate('logbook');
      }
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  resetAll() {
    this.base64 = null;
    this.result = null;
    this.portions = 1;
    document.getElementById('snapResult').style.display = 'none';
    document.getElementById('snapModePhoto').style.display = 'block';
    document.getElementById('snapPreview').style.display = 'none';
    document.getElementById('snapUploadZone').style.display = 'block';
    document.getElementById('snapFileCamera').value = '';
    document.getElementById('snapFileGallery').value = '';
    document.getElementById('snapBtn').disabled = false;
    document.getElementById('snapPortVal').textContent = '1';
  },

  // ── MODE ENREGISTRÉS ─────────────────────────────────────────────────────────

  async loadSaved() {
    const profile = Router.userProfile;
    const el = document.getElementById('savedList');
    try {
      this._savedMeals = await db.getSavedMeals(profile.id);
      if (this._savedMeals.length === 0) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">⭐</div><div class="empty-text">Aucun repas enregistré.<br>Ajoute un repas depuis Base ou Photo et clique "Enregistrer ce repas".</div></div>';
        return;
      }
      el.innerHTML = this._savedMeals.map((m, i) => `
        <div class="card" style="display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="SnapPage.addSaved(${i})">
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:600;">${m.nom}</div>
            <div style="font-size:12px;color:var(--gray-muted);margin-top:2px;">
              ${m.calories} kcal · <span style="color:#3B82F6;">P ${m.proteines}g</span> · <span style="color:#C4820A;">G ${m.glucides}g</span> · <span style="color:#E05252;">L ${m.lipides}g</span>
            </div>
          </div>
          <button onclick="event.stopPropagation();SnapPage.deleteSaved('${m.id}')" style="background:none;border:none;font-size:18px;color:var(--gray-muted);cursor:pointer;padding:4px;">×</button>
        </div>
      `).join('');
    } catch (e) {
      el.innerHTML = '<div class="alert alert-error">Erreur de chargement.</div>';
    }
  },

  async addSaved(index) {
    const m = this._savedMeals[index];
    const profile = Router.userProfile;
    if (!m || !profile) return;
    try {
      await db.addJournalEntry({
        profile_id: profile.id,
        date_entree: this.date,
        creneau: this.creneau,
        nom: m.nom,
        calories: m.calories,
        proteines: m.proteines,
        glucides: m.glucides,
        lipides: m.lipides,
        source: 'saved'
      });
      Router.navigate('logbook');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  async deleteSaved(id) {
    if (!confirm('Supprimer ce repas enregistré ?')) return;
    try {
      await db.deleteSavedMeal(id);
      this._savedMeals = this._savedMeals.filter(m => m.id !== id);
      this.loadSaved();
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  // ── MODAL ENREGISTRER ────────────────────────────────────────────────────────

  openSaveModal(defaultName) {
    document.getElementById('saveModalName').value = defaultName || '';
    const modal = document.getElementById('saveModal');
    modal.style.display = 'flex';
  },

  closeSaveModal() {
    document.getElementById('saveModal').style.display = 'none';
    Router.navigate('logbook');
  },

  // ── MODE ÉTIQUETTE ────────────────────────────────────────────────────────────

  onLabelFile(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    // Bug 32 — révoquer l'URL précédente avant d'en créer une nouvelle
    if (this._labelUrl) { URL.revokeObjectURL(this._labelUrl); this._labelUrl = null; }
    // Aperçu immédiat
    this._labelUrl = URL.createObjectURL(file);
    document.getElementById('labelPreviewImg').src = this._labelUrl;
    document.getElementById('labelPreview').style.display    = 'block';
    document.getElementById('labelUploadZone').style.display = 'none';
    document.getElementById('labelResultDiv').style.display  = 'none';
    document.getElementById('labelError').innerHTML          = '';
    // Compression avant envoi API (limite 5 MB)
    this._resizeImage(file).then(b64 => { this._labelBase64 = b64; });
  },

  resetLabel() {
    this._labelBase64 = null;
    this._labelData   = null;
    if (this._labelUrl) { URL.revokeObjectURL(this._labelUrl); this._labelUrl = null; }
    document.getElementById('labelPreview').style.display    = 'none';
    document.getElementById('labelUploadZone').style.display = 'block';
    document.getElementById('labelResultDiv').style.display  = 'none';
    document.getElementById('labelFileCamera').value = '';
    document.getElementById('labelFileGallery').value = '';
    document.getElementById('labelError').innerHTML          = '';
    const btn = document.getElementById('labelBtn');
    if (btn) btn.disabled = false;
  },

  async analyzeLabel() {
    if (!this._labelBase64) return;
    const btn = document.getElementById('labelBtn');
    btn.disabled = true;
    document.getElementById('labelPreview').style.display  = 'none';
    document.getElementById('labelLoading').style.display  = 'block';
    try {
      this._labelData = await SnapCalories.analyzeLabel(this._labelBase64);
      document.getElementById('labelLoading').style.display  = 'none';
      document.getElementById('labelResultDiv').style.display = 'block';
      this._renderLabelResult(this._labelData);
    } catch (err) {
      document.getElementById('labelLoading').style.display = 'none';
      document.getElementById('labelPreview').style.display = 'block';
      btn.disabled = false;
      document.getElementById('labelError').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  },

  _renderLabelResult(d) {
    document.getElementById('labelResultDiv').innerHTML = `
      <div class="card">
        <div style="font-size:15px;font-weight:700;margin-bottom:4px;">${d.product_name || 'Produit'}</div>
        <div style="font-size:11px;color:var(--gray-muted);margin-bottom:12px;">Valeurs pour 100 g</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;margin-bottom:16px;">
          <div><div style="font-size:17px;font-weight:700;color:var(--gold);">${d.calories_100g}</div><div style="font-size:10px;color:var(--gray-muted);">kcal</div></div>
          <div><div style="font-size:17px;font-weight:700;color:#3B82F6;">${d.proteins_100g}g</div><div style="font-size:10px;color:var(--gray-muted);">Prot</div></div>
          <div><div style="font-size:17px;font-weight:700;color:#C4820A;">${d.carbs_100g}g</div><div style="font-size:10px;color:var(--gray-muted);">Gluc</div></div>
          <div><div style="font-size:17px;font-weight:700;color:#E05252;">${d.fats_100g}g</div><div style="font-size:10px;color:var(--gray-muted);">Lip</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <label class="field-label" style="margin:0;white-space:nowrap;">Quantité consommée</label>
          <input class="input" type="number" id="labelQtyInput" value="100" step="1" inputmode="numeric"
            style="width:90px;" oninput="SnapPage._updateLabelPreview()">
          <span style="font-size:13px;color:var(--gray-light);">g</span>
        </div>
        <div id="labelQtyPreview" style="font-size:13px;color:var(--gray);margin-bottom:14px;"></div>
        <button class="btn btn-primary" onclick="SnapPage.addLabelToCart()">Ajouter au panier</button>
        <button class="btn btn-ghost btn-small" style="margin-top:8px;width:100%;" onclick="SnapPage.resetLabel()">⟳ Autre photo</button>
      </div>`;
    this._updateLabelPreview();
  },

  _updateLabelPreview() {
    const d = this._labelData;
    if (!d) return;
    const qty = +document.getElementById('labelQtyInput')?.value || 0;
    const f = qty / 100;
    const el = document.getElementById('labelQtyPreview');
    if (el) el.innerHTML = `<strong>${Math.round(d.calories_100g * f)} kcal</strong> · <span style="color:#3B82F6;">P ${Math.round(d.proteins_100g * f)}g</span> · <span style="color:#C4820A;">G ${Math.round(d.carbs_100g * f)}g</span> · <span style="color:#E05252;">L ${Math.round(d.fats_100g * f)}g</span>`;
  },

  addLabelToCart() {
    const d = this._labelData;
    if (!d) return;
    const qty = +document.getElementById('labelQtyInput')?.value || 0;
    if (qty <= 0) { toast('Quantité invalide.', 'error'); return; }
    const f = qty / 100;
    this._cart.push({
      nom: d.product_name || 'Produit',
      quantite: qty, unite: 'g',
      calories:  Math.round(d.calories_100g  * f),
      proteines: Math.round(d.proteins_100g  * f),
      glucides:  Math.round(d.carbs_100g     * f),
      lipides:   Math.round(d.fats_100g      * f)
    });
    // Retour sur Base pour voir le panier
    document.querySelectorAll('#snapTabs .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#snapTabs .tab')[0].classList.add('active');
    document.getElementById('snapModeBase').style.display  = 'block';
    document.getElementById('snapModeLabel').style.display = 'none';
    this.mode = 'base';
    this.renderCart();
  },

  async confirmSave() {
    const nom = document.getElementById('saveModalName').value.trim();
    if (!nom) { toast('Donne un nom au repas.', 'error'); return; }
    const profile = Router.userProfile;
    const data = this._pendingSave;
    if (!data || !profile) { Router.navigate('logbook'); return; }
    try {
      await db.saveMeal({ profile_id: profile.id, nom, calories: data.calories, proteines: data.proteines, glucides: data.glucides, lipides: data.lipides });
      document.getElementById('saveModal').style.display = 'none';
      Router.navigate('logbook');
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  }
};
