// APEX APP — Coach : Éditeur Plan Alimentaire

const CoachPlanEditPage = {
  clientId: null,
  client: null,
  plans: [],
  currentPlan: null,
  repas: [],
  semaine: 1,
  creneaux: ['petit_dejeuner_sale', 'petit_dejeuner_sucre', 'collation_matin', 'dejeuner', 'collation_apres_midi', 'diner', 'collation_soir'],
  _searchCache: {},

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="peTitle">Plan alimentaire</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#coach-clients'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
      </div>
      <div id="peNav"></div>
      <div id="peContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    // Reset complet de l'état pour éviter toute fuite entre clients
    this.clientId    = null;
    this.client      = null;
    this.plans       = [];
    this.currentPlan = null;
    this.repas       = [];
    this.semaine     = 1;
    this._searchCache = {};

    const params = Router.getParams();
    this.clientId = params.clientId;
    if (!this.clientId) { window.location.hash = '#coach-clients'; return; }

    try {
      this.client = await db.getProfile(this.clientId);
      this.plans = await db.getPlansForClient(this.clientId);
      document.getElementById('peTitle').textContent = 'Plan alimentaire — ' + (this.client.prenom || 'Client');
      const peNav = document.getElementById('peNav');
      if (peNav) peNav.innerHTML = coachClientNav(this.clientId, 'coach-plan-edit');

      // Charger le plan actif
      const activePlan = this.plans.find(p => p.actif) || this.plans[0];
      if (activePlan) {
        this.semaine     = activePlan.semaine;
        this.currentPlan = activePlan;
        this.repas       = await db.getPlanRepas(activePlan.id);
      }

      this.renderEditor();
    } catch (e) {
      document.getElementById('peContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  renderEditor() {
    // Garder ce qui est en cours de saisie (notes, objectifs) à chaque nouvel affichage
    const notesEl = document.getElementById('peNotes');
    if (notesEl && this.currentPlan) this.currentPlan.notes = notesEl.value;
    const saisie = id => document.getElementById(id)?.value;
    const enCours = { kcal: saisie('peKcal'), prot: saisie('peProt'), gluc: saisie('peGluc'), lip: saisie('peLip') };

    const c = this.client;
    const p = this.currentPlan;

    // Objectifs : saisie en cours, sinon plan actif, sinon estimation
    const cal  = +(enCours.kcal ?? (p ? p.calories_cible : (c.tdee ? (c.objectif === 'perte' ? c.tdee - 350 : c.tdee) : 2000)));
    const prot = +(enCours.prot ?? (p ? p.proteines_cible : Math.round((c.poids || 80) * 2)));
    const lip  = +(enCours.lip  ?? (p ? p.lipides_cible : Math.round(cal * 0.25 / 9)));
    const gluc = +(enCours.gluc ?? (p ? p.glucides_cible : Math.round((cal - prot * 4 - lip * 9) / 4)));

    // Barre du haut : objectifs, total du plan, actions (reste visible en défilant)
    let html = `
      <div class="pe-barre">
        <div class="pe-objectifs">
          <div class="pe-obj"><label>Kcal</label><input class="input" type="number" id="peKcal" value="${cal}" oninput="CoachPlanEditPage._onKcalInput()"></div>
          <div class="pe-obj"><label>Prot (g)</label><input class="input" type="number" id="peProt" value="${prot}" oninput="CoachPlanEditPage._onMacroInput()"></div>
          <div class="pe-obj"><label>Gluc (g)</label><input class="input" type="number" id="peGluc" value="${gluc}" oninput="CoachPlanEditPage._onMacroInput()"></div>
          <div class="pe-obj"><label>Lip (g)</label><input class="input" type="number" id="peLip" value="${lip}" oninput="CoachPlanEditPage._onMacroInput()"></div>
        </div>
        <div class="pe-totaux" id="peTotaux"></div>
        <div class="pe-actions">
          <button class="btn btn-secondary btn-small" onclick="CoachPlanEditPage.showGeneratorModal()">⚡ Générer</button>
          <button class="btn btn-primary btn-small" onclick="CoachPlanEditPage.save()">💾 Enregistrer</button>
        </div>
      </div>
      <div id="peSaveMsg"></div>
      <div class="card pe-notes">
        <label class="field-label">Notes coach</label>
        <textarea class="input" id="peNotes" rows="2" placeholder="Visible par le client dans son plan">${escHtml(p ? (p.notes || '') : '')}</textarea>
      </div>
      <div class="pe-grille">`;

    // Repas par créneau, en colonnes (les deux petits-déjeuners sont au choix)
    this.creneaux.forEach(cr => {
      const items = this.repas.filter(r => r.creneau === cr);
      const somme = k => Math.round(items.reduce((t, r) => t + parseFloat(r[k] || 0), 0));
      const isAlt = cr === 'petit_dejeuner_sale' || cr === 'petit_dejeuner_sucre';
      html += `
        <div class="card pe-repas ${isAlt ? 'option' : ''}">
          <div class="pe-repas-tete">
            <div class="pe-repas-nom">${creneauLabel(cr)}${cr === 'petit_dejeuner_sucre' ? ' <span class="pe-ou">ou</span>' : ''}${isAlt ? ' <span class="pe-option">au choix</span>' : ''}</div>
            <div class="pe-repas-kcal">${somme('calories')} kcal
              ${items.length ? `<div class="pe-macros"><span class="p">P ${somme('proteines')}</span> · <span class="g">G ${somme('glucides')}</span> · <span class="l">L ${somme('lipides')}</span></div>` : ''}
            </div>
          </div>
          ${items.map(r => {
            const idx = this.repas.indexOf(r);
            return `
            <div class="pe-aliment">
              <div class="pe-aliment-nom">${escHtml(r.aliment_nom)}
                <div class="pe-macros">${Math.round(r.calories)} kcal · P ${Math.round(r.proteines)} · G ${Math.round(r.glucides)} · L ${Math.round(r.lipides)}</div>
              </div>
              <div class="pe-qte"><input class="input" type="number" value="${r.quantite}" onchange="CoachPlanEditPage.updateQty(${idx}, this.value)"><span>${r.unite === 'g' ? 'g' : 'u'}</span></div>
              <button class="pe-retirer" aria-label="Retirer" onclick="CoachPlanEditPage.removeItem(${idx})">×</button>
            </div>`;
          }).join('')}
          <div class="search-wrap pe-recherche">
            <span class="search-icon">🔍</span>
            <input class="input search-input" placeholder="Ajouter un aliment…" oninput="CoachPlanEditPage.search(this, '${cr}')" onfocus="CoachPlanEditPage.search(this, '${cr}')">
            <div class="search-results" id="sr-${cr}"></div>
          </div>
        </div>`;
    });
    html += '</div>';

    document.getElementById('peContent').innerHTML = html;
    this._majTotaux();
  },

  // Total du plan face aux objectifs (petit-déjeuner salé ou sucré : le plus élevé des deux)
  _majTotaux() {
    const el = document.getElementById('peTotaux');
    if (!el) return;
    const altCreneaux = ['petit_dejeuner_sale', 'petit_dejeuner_sucre'];
    const somme = (liste, k) => liste.reduce((t, r) => t + parseFloat(r[k] || 0), 0);
    const alts = altCreneaux.map(cr => this.repas.filter(r => r.creneau === cr));
    const meilleur = somme(alts[0], 'calories') >= somme(alts[1], 'calories') ? alts[0] : alts[1];
    const compte = this.repas.filter(r => !altCreneaux.includes(r.creneau)).concat(meilleur);
    const val = { kcal: somme(compte, 'calories'), prot: somme(compte, 'proteines'), gluc: somme(compte, 'glucides'), lip: somme(compte, 'lipides') };
    const obj = { kcal: +document.getElementById('peKcal')?.value || 0, prot: +document.getElementById('peProt')?.value || 0,
                  gluc: +document.getElementById('peGluc')?.value || 0, lip: +document.getElementById('peLip')?.value || 0 };
    const ecart = (v, o) => {
      if (!o) return '';
      const d = Math.round(v) - o, pct = Math.abs(d) / o;
      const cls = pct <= 0.05 ? 'ok' : pct <= 0.12 ? 'moyen' : 'loin';
      return `<span class="pe-ecart ${cls}">${d > 0 ? '+' : ''}${d}</span>`;
    };
    const case_ = (k, label, unite) => `<div class="pe-total ${k}"><b>${Math.round(val[k])}${unite}</b><span>/ ${obj[k]}${unite} ${label}</span>${ecart(val[k], obj[k])}</div>`;
    el.innerHTML = `<div class="pe-total-titre">Total du plan</div>
      ${case_('kcal', 'kcal', '')}${case_('prot', 'P', 'g')}${case_('gluc', 'G', 'g')}${case_('lip', 'L', 'g')}`;
  },

  async search(input, creneau) {
    const q = input.value.trim();
    const resultsEl = document.getElementById('sr-' + creneau);
    if (q.length < 2) { resultsEl.classList.remove('show'); return; }

    const aliments = await db.searchAliments(q);
    if (aliments.length === 0) { resultsEl.classList.remove('show'); return; }

    this._searchCache[creneau] = aliments;
    resultsEl.innerHTML = aliments.map((a, i) => {
      const per = a.mode === 'unit' ? '/unité' : '/100g';
      return `<div class="search-item" onclick="CoachPlanEditPage.pickFromCache('${creneau}', ${i})">
        <div class="search-item-name">${a.nom}</div>
        <div class="search-item-macros">${a.calories} kcal ${per} · P:${a.proteines}g G:${a.glucides}g L:${a.lipides}g</div>
      </div>`;
    }).join('');
    resultsEl.classList.add('show');

    // Fermer au clic extérieur
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!resultsEl.contains(e.target) && e.target !== input) {
          resultsEl.classList.remove('show');
          document.removeEventListener('click', handler);
        }
      });
    }, 100);
  },

  pickFromCache(creneau, index) {
    const aliment = (this._searchCache[creneau] || [])[index];
    if (aliment) this.addItem(creneau, aliment);
  },

  addItem(creneau, aliment) {
    const qty = aliment.mode === 'unit' ? 1 : 100;
    const factor = aliment.mode === 'unit' ? 1 : 1;

    this.repas.push({
      creneau: creneau,
      aliment_nom: aliment.nom,
      quantite: qty,
      unite: aliment.mode === 'unit' ? 'unité' : 'g',
      calories: aliment.calories * factor,
      proteines: aliment.proteines * factor,
      glucides: aliment.glucides * factor,
      lipides: aliment.lipides * factor,
      fibres: (aliment.fibres || 0) * factor,
      position: this.repas.filter(r => r.creneau === creneau).length,
      _aliment: aliment // garder pour recalcul
    });

    this.renderEditor();
  },

  updateQty(idx, newQty) {
    const r = this.repas[idx];
    const a = r._aliment;
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty < 0) return; // saisie invalide → on ignore

    if (a) {
      // Aliment connu (ajouté pendant cette session) → recalcul depuis les valeurs /100g
      // Pour mode 'unit' : 1 unité = perG grammes (ex: 1 oeuf = 60g)
      const factor = a.mode === 'unit' ? qty * ((a.perG || 100) / 100) : qty / 100;
      r.calories  = Math.round((a.calories  || 0) * factor * 10) / 10;
      r.proteines = Math.round((a.proteines || 0) * factor * 10) / 10;
      r.glucides  = Math.round((a.glucides  || 0) * factor * 10) / 10;
      r.lipides   = Math.round((a.lipides   || 0) * factor * 10) / 10;
      r.fibres    = Math.round((a.fibres    || 0) * factor * 10) / 10;
    } else if (r.quantite > 0 && qty > 0) {
      // Plan chargé depuis la DB : recalcul par ratio nouvelle/ancienne quantité
      // Guard : qty > 0 ET r.quantite > 0 → pas de division par zéro, pas de ratio nul
      const ratio = qty / r.quantite;
      r.calories  = Math.round(r.calories          * ratio * 10) / 10;
      r.proteines = Math.round(r.proteines         * ratio * 10) / 10;
      r.glucides  = Math.round(r.glucides          * ratio * 10) / 10;
      r.lipides   = Math.round(r.lipides           * ratio * 10) / 10;
      r.fibres    = Math.round((r.fibres || 0)     * ratio * 10) / 10;
    }

    r.quantite = qty; // mise à jour après le calcul du ratio
    this.renderEditor();
  },

  removeItem(idx) {
    this.repas.splice(idx, 1);
    this.renderEditor();
  },

  // ── Synchronisation kcal ↔ macros ───────────────────────────────────────

  _onMacroInput() {
    const p = +document.getElementById('peProt').value || 0;
    const g = +document.getElementById('peGluc').value || 0;
    const l = +document.getElementById('peLip').value  || 0;
    document.getElementById('peKcal').value = Math.round(p * 4 + g * 4 + l * 9);
    this._majTotaux();
  },

  _onKcalInput() {
    const newKcal = +document.getElementById('peKcal').value || 0;
    const p = +document.getElementById('peProt').value || 0;
    const g = +document.getElementById('peGluc').value || 0;
    const l = +document.getElementById('peLip').value  || 0;
    const curKcal = p * 4 + g * 4 + l * 9;
    if (!curKcal || !newKcal) { this._majTotaux(); return; }
    const ratio = newKcal / curKcal;
    document.getElementById('peProt').value = Math.round(p * ratio);
    document.getElementById('peGluc').value = Math.round(g * ratio);
    document.getElementById('peLip').value  = Math.round(l * ratio);
    this._majTotaux();
  },

  showGeneratorModal() {
    const existing = document.getElementById('pgModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'pgModal';
    modal.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1000;display:flex;align-items:flex-end;" onclick="if(event.target===this)document.getElementById('pgModal').remove()">
        <div style="background:var(--white);border-radius:16px 16px 0 0;padding:1.5rem;width:100%;max-height:85vh;overflow-y:auto;">
          <div style="font-size:16px;font-weight:700;margin-bottom:1.25rem;">⚡ Générer un plan</div>

          <div class="field">
            <label class="field-label">Repas principaux</label>
            <div style="display:flex;gap:8px;">
              <button id="pgR3" class="tag-pill-btn active-ben" onclick="CoachPlanEditPage._pgSetRepas(3)">3 repas</button>
              <button id="pgR2" class="tag-pill-btn" onclick="CoachPlanEditPage._pgSetRepas(2)">2 repas</button>
            </div>
          </div>

          <div class="field">
            <label class="field-label">Collations</label>
            <div style="display:flex;gap:16px;flex-wrap:wrap;">
              <label style="display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer;">
                <input type="checkbox" id="pgCM"> Matin
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer;">
                <input type="checkbox" id="pgCA"> Après-midi
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer;">
                <input type="checkbox" id="pgCS" checked> Soir
              </label>
            </div>
          </div>

          <div class="field">
            <label class="field-label">Options alimentaires</label>
            <div style="display:flex;gap:20px;flex-wrap:wrap;">
              <label style="display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer;">
                <input type="checkbox" id="pgVege"> 🥦 Végétarien
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer;">
                <input type="checkbox" id="pgWhey"> 💪 Whey protéine
              </label>
            </div>
          </div>

          <div style="background:var(--bg);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--gray);margin-bottom:1rem;">
            Les macros cibles utilisées sont celles renseignées dans les objectifs du plan.
          </div>

          <div class="btn-row">
            <button class="btn btn-secondary" onclick="document.getElementById('pgModal').remove()">Annuler</button>
            <button class="btn btn-primary" onclick="CoachPlanEditPage._pgConfirm()">⚡ Générer le plan</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    this._pgRepas = 3;
  },

  _pgSetRepas(n) {
    this._pgRepas = n;
    document.getElementById('pgR2').className = 'tag-pill-btn' + (n === 2 ? ' active-ben' : '');
    document.getElementById('pgR3').className = 'tag-pill-btn' + (n === 3 ? ' active-ben' : '');
  },

  _pgConfirm() {
    const opts = {
      nbRepas:    this._pgRepas || 3,
      colMatin:   document.getElementById('pgCM').checked,
      colAprem:   document.getElementById('pgCA').checked,
      colSoir:    document.getElementById('pgCS').checked,
      vegetarien: document.getElementById('pgVege').checked,
      whey:       document.getElementById('pgWhey').checked,
    };

    const targets = {
      calories:  +document.getElementById('peKcal')?.value || this.currentPlan?.calories_cible  || 2000,
      proteines: +document.getElementById('peProt')?.value || this.currentPlan?.proteines_cible || 160,
      glucides:  +document.getElementById('peGluc')?.value || this.currentPlan?.glucides_cible  || 200,
      lipides:   +document.getElementById('peLip')?.value  || this.currentPlan?.lipides_cible   || 55,
    };

    this.repas = PlanGenerator.generate(opts, targets);
    document.getElementById('pgModal').remove();
    this.renderEditor();
  },

  async save() {
    const plan = {
      profile_id: this.clientId,
      semaine: this.semaine,
      phase: this.currentPlan?.phase || this.client?.phase || 'relance',
      calories_cible: +document.getElementById('peKcal').value || 2000,
      proteines_cible: +document.getElementById('peProt').value || 160,
      glucides_cible: +document.getElementById('peGluc').value || 200,
      lipides_cible: +document.getElementById('peLip').value || 55,
      notes: document.getElementById('peNotes').value.trim() || null,
      actif: true
    };

    try {
      // Désactiver les anciens plans actifs (UPDATE ciblé, pas d'upsert)
      await db.deactivateOtherPlans(this.clientId, this.semaine);

      // Upsert plan
      const savedPlan = await db.upsertPlan(plan);
      this.currentPlan = savedPlan;

      // Supprimer anciens repas et insérer les nouveaux
      await db.deletePlanRepas(savedPlan.id);
      if (this.repas.length > 0) {
        const rows = this.repas.map((r, i) => ({
          plan_id: savedPlan.id,
          creneau: r.creneau,
          aliment_nom: r.aliment_nom,
          quantite: r.quantite,
          unite: r.unite || 'g',
          calories: r.calories,
          proteines: r.proteines,
          glucides: r.glucides,
          lipides: r.lipides,
          fibres: r.fibres || 0,
          position: i
        }));
        await db.insertPlanRepas(rows);
      }

      // Recharger les plans
      this.plans = await db.getPlansForClient(this.clientId);

      // Notifier le client
      db.sendPush(
        this.clientId,
        '📋 Nouveau plan disponible !',
        'Ton coach a publié ton plan nutritionnel. Consulte-le dès maintenant.',
        '/#plan'
      ).catch((e) => console.warn('Push plan failed:', e));

      const msg = document.getElementById('peSaveMsg');
      if (msg) {
        msg.innerHTML = '<div class="alert alert-success">✅ Plan enregistré</div>';
        setTimeout(() => { msg.innerHTML = ''; }, 3000);
      }
    } catch (e) {
      const msg = document.getElementById('peSaveMsg');
      if (msg) msg.innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  }
};
