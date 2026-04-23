// APEX APP — Client : Recettes

const RecettesPage = {
  recettes: [],
  categorie: 'all',
  targetKcal: null,   // null = portion de base
  plusProteines: false,
  _openId: null,

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX</div>
          <div class="app-title">Recettes</div>
        </div>
        <button class="header-btn" onclick="Router.logout()" title="Déconnexion">⏻</button>
      </div>
      <div id="recFilters"></div>
      <div id="recList"><div class="spinner" style="margin-top:3rem;"></div></div>
      <div id="recModal"></div>
      <nav class="nav-bottom"><div class="nav-inner">
        <a class="nav-item" href="#dashboard"><span class="nav-icon">🏠</span><span class="nav-label">Dashboard</span></a>
        <a class="nav-item" href="#logbook"><span class="nav-icon">📖</span><span class="nav-label">Logbook</span></a>
        <a class="nav-item active" href="#recettes"><span class="nav-icon">🍽️</span><span class="nav-label">Recettes</span></a>
        <a class="nav-item" href="#plan"><span class="nav-icon">📋</span><span class="nav-label">Plan</span></a>
        <a class="nav-item" href="#historique"><span class="nav-icon">📈</span><span class="nav-label">Historique</span></a>
      </div></nav>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile) return;
    if (profile.role === 'coach') { window.location.hash = '#coach-clients'; return; }

    try {
      this.recettes = await db.getRecettes();
      this.renderFilters();
      this.renderList();
    } catch (e) {
      document.getElementById('recList').innerHTML =
        '<div class="alert alert-error">Erreur de chargement des recettes.</div>';
    }
  },

  // ── Helpers ────────────────────────────────────────────────

  catMeta(cat) {
    return {
      all:             { icon: '🍴', label: 'Tout' },
      petit_dej_sale:  { icon: '🥓', label: 'Matin salé' },
      petit_dej_sucre: { icon: '🥐', label: 'Matin sucré' },
      salade:          { icon: '🥗', label: 'Salade' },
      riz:             { icon: '🍚', label: 'Riz' },
      pates:           { icon: '🍝', label: 'Pâtes' },
    }[cat] || { icon: '🍴', label: cat };
  },

  /** Calcule les macros + ingrédients scalés pour une recette */
  scaleRecipe(r, targetKcal, plusProteines) {
    const factor = targetKcal ? targetKcal / r.base_kcal : 1;
    let kcal       = Math.round(targetKcal || r.base_kcal);
    let proteines  = Math.round(r.base_proteines * factor);
    let glucides   = Math.round(r.base_glucides  * factor);
    let lipides    = Math.round(r.base_lipides   * factor);

    const ingredients = (r.ingredients || []).map(ing => {
      const q = ing.quantite * factor;
      // Arrondi pratique : 5g pour poids/volumes, 0.5 pour unités
      const isWeight = (ing.unite === 'g' || ing.unite === 'ml');
      const qFmt = isWeight
        ? (Math.round(q / 5) * 5) || 5
        : (Math.round(q * 2) / 2) || 0.5;
      return { ...ing, qs: qFmt };
    });

    let boostIng = null;
    if (plusProteines && r.protein_boost) {
      const b = r.protein_boost;
      kcal      += Math.round(b.kcal      || 0);
      proteines += Math.round(b.proteines || 0);
      glucides  += Math.round(b.glucides  || 0);
      lipides   += Math.round(b.lipides   || 0);
      boostIng = b;
    }

    return { kcal, proteines, glucides, lipides, ingredients, boostIng, factor };
  },

  // ── Filtres ────────────────────────────────────────────────

  renderFilters() {
    const cats   = ['all','petit_dej_sale','petit_dej_sucre','salade','riz','pates'];
    const tiers  = [400, 500, 600, 700, 800];

    document.getElementById('recFilters').innerHTML = `
      <div class="rec-cats">
        ${cats.map(c => {
          const m = this.catMeta(c);
          return `<button class="rec-cat-btn${this.categorie === c ? ' active' : ''}"
            onclick="RecettesPage.setCategorie('${c}')">${m.icon} ${m.label}</button>`;
        }).join('')}
      </div>
      <div class="rec-kcal-row">
        <span class="rec-kcal-label">Portion&nbsp;:</span>
        <button class="rec-kcal-btn${this.targetKcal === null ? ' active' : ''}"
          onclick="RecettesPage.setKcal(null)">Base</button>
        ${tiers.map(t => `<button class="rec-kcal-btn${this.targetKcal === t ? ' active' : ''}"
          onclick="RecettesPage.setKcal(${t})">${t}</button>`).join('')}
        <button class="rec-prot-btn${this.plusProteines ? ' active' : ''}"
          onclick="RecettesPage.toggleProt()">+🥩 Prot</button>
      </div>`;
  },

  setCategorie(cat) {
    this.categorie = cat;
    this.renderFilters();
    this.renderList();
  },

  setKcal(kcal) {
    this.targetKcal = kcal;
    this.renderFilters();
    this.renderList();
    // Mettre à jour le modal si ouvert
    if (this._openId) this._renderModal();
  },

  toggleProt() {
    this.plusProteines = !this.plusProteines;
    this.renderFilters();
    this.renderList();
    if (this._openId) this._renderModal();
  },

  // ── Liste ──────────────────────────────────────────────────

  renderList() {
    const el = document.getElementById('recList');
    const filtered = this.categorie === 'all'
      ? this.recettes
      : this.recettes.filter(r => r.categorie === this.categorie);

    if (filtered.length === 0) {
      el.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <div class="empty-text">Aucune recette dans cette catégorie.</div>
      </div>`;
      return;
    }

    el.innerHTML = filtered.map(r => {
      const s   = this.scaleRecipe(r, this.targetKcal, this.plusProteines);
      const cat = this.catMeta(r.categorie);
      // Barre macro proportionnelle
      const tot = s.proteines * 4 + s.glucides * 4 + s.lipides * 9 || 1;
      const pP  = Math.round(s.proteines * 4 / tot * 100);
      const pG  = Math.round(s.glucides  * 4 / tot * 100);
      const pL  = Math.round(s.lipides   * 9 / tot * 100);

      return `
        <div class="rec-card" onclick="RecettesPage.openDetail('${r.id}')">
          <div class="rec-card-header">
            <div class="rec-cat-icon">${cat.icon}</div>
            <div class="rec-card-body">
              <div class="rec-card-nom">${r.nom}</div>
              <div class="rec-card-cat">${cat.label}${this.plusProteines && r.protein_boost ? ' · <span style="color:var(--macro-p)">+Prot</span>' : ''}</div>
            </div>
            <div class="rec-card-kcal">${s.kcal}<span style="font-size:11px;font-weight:400;color:var(--gray-muted)"> kcal</span></div>
          </div>
          <div class="rec-macros-row">
            <div class="rec-macro-chip rec-p">P ${s.proteines}g</div>
            <div class="rec-macro-chip rec-g">G ${s.glucides}g</div>
            <div class="rec-macro-chip rec-l">L ${s.lipides}g</div>
          </div>
          <div class="rec-bar">
            <div style="flex:${pP};background:var(--macro-p);"></div>
            <div style="flex:${pG};background:var(--macro-g);"></div>
            <div style="flex:${pL};background:var(--macro-l);"></div>
          </div>
        </div>`;
    }).join('');
  },

  // ── Détail / Modal ─────────────────────────────────────────

  openDetail(id) {
    this._openId = id;
    this._renderModal();
  },

  _renderModal() {
    const r = this.recettes.find(x => x.id === this._openId);
    if (!r) return;

    const s    = this.scaleRecipe(r, this.targetKcal, this.plusProteines);
    const cat  = this.catMeta(r.categorie);
    const tiers = [400, 500, 600, 700, 800];
    const portionLabel = this.targetKcal ? `${this.targetKcal} kcal` : 'Base';

    document.getElementById('recModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this){document.getElementById('recModal').innerHTML='';RecettesPage._openId=null;}">
        <div class="modal" style="padding-bottom:calc(1.5rem + env(safe-area-inset-bottom,12px));">

          <div class="modal-title">
            ${r.nom}
            <button class="modal-close" onclick="document.getElementById('recModal').innerHTML='';RecettesPage._openId=null;">×</button>
          </div>
          <div style="font-size:12px;color:var(--gray-muted);margin-top:-0.75rem;margin-bottom:1rem;">${cat.icon} ${cat.label}</div>

          <!-- Sélecteur portion -->
          <div style="margin-bottom:0.75rem;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-muted);margin-bottom:6px;">Portion</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;">
              <button class="rec-kcal-btn${this.targetKcal === null ? ' active' : ''}"
                onclick="RecettesPage.setKcal(null)">Base</button>
              ${tiers.map(t => `<button class="rec-kcal-btn${this.targetKcal === t ? ' active' : ''}"
                onclick="RecettesPage.setKcal(${t})">${t}</button>`).join('')}
            </div>
          </div>

          <!-- Toggle +protéines -->
          ${r.protein_boost ? `
            <button class="rec-prot-btn${this.plusProteines ? ' active' : ''}"
              onclick="RecettesPage.toggleProt()"
              style="margin-bottom:1rem;font-size:13px;width:100%;height:40px;border-radius:var(--radius-sm);">
              🥩 Option +Protéines ${this.plusProteines ? '✓ activée' : ''}
            </button>` : ''}

          <!-- Macros -->
          <div class="card card-dark" style="margin-bottom:1.25rem;">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">
              <div>
                <div style="font-size:22px;font-weight:700;color:var(--gold);line-height:1.1;">${s.kcal}</div>
                <div class="macro-label">kcal</div>
              </div>
              <div>
                <div class="macro-val">${s.proteines}g</div>
                <div class="macro-label" style="color:var(--macro-p)">Prot</div>
              </div>
              <div>
                <div class="macro-val">${s.glucides}g</div>
                <div class="macro-label" style="color:var(--macro-g)">Gluc</div>
              </div>
              <div>
                <div class="macro-val">${s.lipides}g</div>
                <div class="macro-label" style="color:var(--macro-l)">Lip</div>
              </div>
            </div>
          </div>

          <!-- Ingrédients -->
          <div class="rec-section-title">Ingrédients — portion ${portionLabel}</div>
          <div style="margin-bottom:1.25rem;">
            ${s.ingredients.map(ing => `
              <div class="rec-ingredient-row">
                <span>${ing.nom}</span>
                <span class="rec-ingredient-qty">${ing.qs} ${ing.unite}</span>
              </div>`).join('')}
            ${s.boostIng ? `
              <div class="rec-ingredient-row" style="background:rgba(59,130,246,0.06);border-radius:6px;padding:6px 4px;margin-top:2px;">
                <span style="color:var(--macro-p);">➕ ${s.boostIng.nom}</span>
                <span class="rec-ingredient-qty" style="color:var(--macro-p);">${s.boostIng.quantite} ${s.boostIng.unite}</span>
              </div>` : ''}
          </div>

          <!-- Préparation -->
          ${r.preparation ? `
            <div class="rec-section-title">Préparation</div>
            <div style="font-size:14px;color:var(--gray);line-height:1.75;margin-bottom:1.5rem;white-space:pre-line;">${r.preparation}</div>
          ` : ''}

          <!-- Ajouter au journal -->
          <div class="rec-section-title">Ajouter au journal</div>
          <select class="input" id="recCreneau" style="margin-bottom:0.75rem;">
            <option value="petit_dejeuner">🌅 Petit-déjeuner</option>
            <option value="collation_matin">🍎 Collation matin</option>
            <option value="dejeuner" selected>🍽️ Déjeuner</option>
            <option value="collation_apres_midi">🥜 Collation après-midi</option>
            <option value="diner">🌙 Dîner</option>
            <option value="collation_soir">🫖 Collation soir</option>
          </select>
          <div id="recAddResult"></div>
          <button class="btn btn-primary" onclick="RecettesPage.addToJournal('${r.id}')">
            📖 Ajouter au journal
          </button>

        </div>
      </div>`;
  },

  // ── Journal ────────────────────────────────────────────────

  async addToJournal(recetteId) {
    const r = this.recettes.find(x => x.id === recetteId);
    if (!r) return;

    const profile = Router.userProfile;
    if (!profile) return;

    const s       = this.scaleRecipe(r, this.targetKcal, this.plusProteines);
    const creneau = document.getElementById('recCreneau').value;
    const suffix  = [
      this.targetKcal   ? `${this.targetKcal} kcal` : '',
      this.plusProteines ? '+Prot'                  : ''
    ].filter(Boolean).join(' · ');

    const entry = {
      profile_id:   profile.id,
      date_entree:  todayStr(),
      creneau,
      nom:          r.nom + (suffix ? ` (${suffix})` : ''),
      calories:     s.kcal,
      proteines:    s.proteines,
      glucides:     s.glucides,
      lipides:      s.lipides,
      source:       'recette'
    };

    const btn = document.querySelector('#recModal .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Ajout…'; }

    try {
      await db.addJournalEntry(entry);
      document.getElementById('recAddResult').innerHTML =
        '<div class="alert alert-success" style="margin-bottom:0.5rem;">✓ Ajouté au journal !</div>';
      if (btn) { btn.disabled = false; btn.textContent = '📖 Ajouter au journal'; }
      setTimeout(() => {
        const el = document.getElementById('recAddResult');
        if (el) el.innerHTML = '';
      }, 2500);
    } catch (e) {
      document.getElementById('recAddResult').innerHTML =
        '<div class="alert alert-error" style="margin-bottom:0.5rem;">' + e.message + '</div>';
      if (btn) { btn.disabled = false; btn.textContent = '📖 Ajouter au journal'; }
    }
  }
};
