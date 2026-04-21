// APEX APP — Snap Calories (photo → ajout au journal)

const SnapPage = {
  base64: null,
  context: 'Restaurant',
  portions: 1,
  creneau: 'dejeuner',
  date: todayStr(),
  result: null,
  contexts: ['Restaurant', 'Maison', 'Travail / Traiteur', 'Fast-food', 'Sport'],

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX</div>
          <div class="app-title">Snap Calories</div>
          <div class="app-subtitle">Prends ton repas en photo pour l'ajouter au journal</div>
        </div>
      </div>

      <div id="snapMain">
        <div class="field">
          <label class="field-label">Créneau du repas</label>
          <select class="input" id="snapCreneau" onchange="SnapPage.creneau=this.value">
            <option value="petit_dejeuner">Petit-déjeuner</option>
            <option value="collation_matin">Collation matin</option>
            <option value="dejeuner" selected>Déjeuner</option>
            <option value="collation_apres_midi">Collation après-midi</option>
            <option value="diner">Dîner</option>
            <option value="collation_soir">Collation soir</option>
          </select>
        </div>

        <div id="snapUploadZone" class="upload-zone">
          <input type="file" id="snapFile" accept="image/*" capture="environment" onchange="SnapPage.onFile(event)">
          <div class="upload-icon">📷</div>
          <div class="upload-title">Prends ou importe une photo</div>
          <div class="upload-sub">Ton assiette, ton plat, ta collation</div>
        </div>

        <div id="snapPreview" style="display:none;">
          <div class="preview-wrap">
            <img id="snapPreviewImg" class="preview-img" src="" alt="Aperçu">
            <button class="preview-remove" onclick="SnapPage.resetPhoto()">×</button>
          </div>

          <label class="field-label">Contexte du repas</label>
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

      <div id="snapLoading" style="display:none;text-align:center;padding:3rem 1rem;">
        <div class="spinner"></div>
        <div class="loading-text" id="snapStep">Identification du plat…</div>
      </div>

      <div id="snapResult" style="display:none;"></div>

      <nav class="nav-bottom"><div class="nav-inner">
        <a class="nav-item" href="#dashboard"><span class="nav-icon">📊</span><span class="nav-label">Suivi</span></a>
        <a class="nav-item" href="#plan"><span class="nav-icon">📋</span><span class="nav-label">Plan</span></a>
        <a class="nav-item active" href="#snap"><span class="nav-icon">📷</span><span class="nav-label">Snap</span></a>
        <a class="nav-item" href="#historique"><span class="nav-icon">📈</span><span class="nav-label">Historique</span></a>
      </div></nav>`;
  },

  init() {
    const params = Router.getParams();
    if (params.creneau) this.creneau = params.creneau;
    if (params.date) this.date = params.date;

    const select = document.getElementById('snapCreneau');
    if (select) select.value = this.creneau;

    // Context buttons
    const ctxContainer = document.getElementById('snapContextBtns');
    if (ctxContainer) {
      ctxContainer.innerHTML = this.contexts.map(c =>
        `<button class="toggle-btn ${c === this.context ? 'active' : ''}" onclick="SnapPage.setContext('${c}', this)">${c}</button>`
      ).join('');
    }
  },

  onFile(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      this.base64 = ev.target.result.split(',')[1];
      document.getElementById('snapPreviewImg').src = ev.target.result;
      document.getElementById('snapPreview').style.display = 'block';
      document.getElementById('snapUploadZone').style.display = 'none';
    };
    reader.readAsDataURL(file);
  },

  resetPhoto() {
    this.base64 = null;
    document.getElementById('snapPreview').style.display = 'none';
    document.getElementById('snapUploadZone').style.display = 'block';
    document.getElementById('snapFile').value = '';
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

    document.getElementById('snapMain').style.display = 'none';
    document.getElementById('snapLoading').style.display = 'block';

    const steps = ['Identification du plat…', 'Estimation des portions…', 'Calcul des macros…', 'Analyse nutritionnelle…'];
    let si = 0;
    const stepEl = document.getElementById('snapStep');
    const timer = setInterval(() => { si = (si + 1) % steps.length; stepEl.textContent = steps[si]; }, 1800);

    try {
      // Charger le plan pour le feedback contextuel
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
      document.getElementById('snapMain').style.display = 'block';
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
        <div class="card" style="text-align:center;margin:0;">
          <div class="macro-val">${p}g</div><div class="macro-label">Protéines</div><div class="macro-kcal">${p * 4} kcal</div>
        </div>
        <div class="card" style="text-align:center;margin:0;">
          <div class="macro-val">${g}g</div><div class="macro-label">Glucides</div><div class="macro-kcal">${g * 4} kcal</div>
        </div>
        <div class="card" style="text-align:center;margin:0;">
          <div class="macro-val">${l}g</div><div class="macro-label">Lipides</div><div class="macro-kcal">${l * 9} kcal</div>
        </div>
      </div>

      ${r.note ? `<div class="card card-accent" style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:28px;font-weight:700;color:var(--gold);">${r.note}/10</div>
        <div style="font-size:13px;color:var(--gray);line-height:1.5;">${r.feedback || r.tip || ''}</div>
      </div>` : ''}

      ${r.tip && r.feedback ? `<div class="card"><div style="font-size:13px;font-weight:600;margin-bottom:4px;">💡 Conseil</div><div style="font-size:13px;color:var(--gray);line-height:1.5;">${r.tip}</div></div>` : ''}

      <button class="btn btn-primary" onclick="SnapPage.addToJournal()">Ajouter au journal →</button>
      <button class="btn btn-secondary" style="margin-top:0.5rem;" onclick="SnapPage.resetAll()">Analyser un autre plat</button>
    `;
  },

  async addToJournal() {
    const r = this.result;
    const profile = Router.userProfile;
    if (!r || !profile) return;

    try {
      await db.addJournalEntry({
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
      });

      Router.navigate('dashboard');
    } catch (e) {
      alert('Erreur : ' + e.message);
    }
  },

  resetAll() {
    this.base64 = null;
    this.result = null;
    this.portions = 1;
    document.getElementById('snapResult').style.display = 'none';
    document.getElementById('snapMain').style.display = 'block';
    document.getElementById('snapPreview').style.display = 'none';
    document.getElementById('snapUploadZone').style.display = 'block';
    document.getElementById('snapFile').value = '';
    document.getElementById('snapBtn').disabled = false;
    document.getElementById('snapPortVal').textContent = '1';
  }
};
