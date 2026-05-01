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
          <div class="app-logo">ONE2ONE — APEX · COACH</div>
          <div class="app-title" id="peTitle">Plan alimentaire</div>
        </div>
        <button class="header-btn" onclick="history.back()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
      </div>
      <div id="peNav"></div>
      <div id="peContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
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
        this.semaine = activePlan.semaine;
        this.currentPlan = activePlan;
        this.repas = await db.getPlanRepas(activePlan.id);
      } else {
        this.semaine = 1;
      }

      this.renderEditor();
    } catch (e) {
      document.getElementById('peContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  renderEditor() {
    const c = this.client;
    const p = this.currentPlan;

    let html = '';

    // Bouton générateur
    html += `<div style="display:flex;justify-content:flex-end;margin-bottom:1rem;">
      <button class="btn" style="height:36px;padding:0 12px;font-size:13px;white-space:nowrap;" onclick="CoachPlanEditPage.showGeneratorModal()">⚡ Générer</button>
    </div>`;

    // Macros cibles
    const cal = p ? p.calories_cible : (c.tdee ? (c.objectif === 'perte' ? c.tdee - 350 : c.tdee) : 2000);
    const prot = p ? p.proteines_cible : Math.round((c.poids || 80) * 2);
    const gluc = p ? p.glucides_cible : Math.round((cal - prot * 4 - Math.round(cal * 0.25 / 9) * 9) / 4);
    const lip = p ? p.lipides_cible : Math.round(cal * 0.25 / 9);

    html += `<div class="card">
      <div class="card-title">Objectifs macros</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;">
        <div class="field"><label class="field-label">Kcal</label><input class="input" type="number" id="peKcal" value="${cal}" oninput="CoachPlanEditPage._onKcalInput()"></div>
        <div class="field"><label class="field-label">Prot (g)</label><input class="input" type="number" id="peProt" value="${prot}" oninput="CoachPlanEditPage._onMacroInput()"></div>
        <div class="field"><label class="field-label">Gluc (g)</label><input class="input" type="number" id="peGluc" value="${gluc}" oninput="CoachPlanEditPage._onMacroInput()"></div>
        <div class="field"><label class="field-label">Lip (g)</label><input class="input" type="number" id="peLip" value="${lip}" oninput="CoachPlanEditPage._onMacroInput()"></div>
      </div>
      <div class="field"><label class="field-label">Notes coach</label><textarea class="input" id="peNotes" rows="2">${p ? (p.notes || '') : ''}</textarea></div>
    </div>`;

    // Repas par créneau
    this.creneaux.forEach(cr => {
      const items = this.repas.filter(r => r.creneau === cr);
      const crKcal = Math.round(items.reduce((s, r) => s + parseFloat(r.calories), 0));

      // Séparateur visuel "OU" entre les 2 options petit-déj
      if (cr === 'petit_dejeuner_sucre') {
        html += `<div style="text-align:center;font-size:12px;font-weight:700;color:var(--gray-muted);letter-spacing:0.1em;margin:4px 0;">— OU —</div>`;
      }

      const crProt = Math.round(items.reduce((s, r) => s + parseFloat(r.proteines), 0));
      const crGluc = Math.round(items.reduce((s, r) => s + parseFloat(r.glucides), 0));
      const crLip  = Math.round(items.reduce((s, r) => s + parseFloat(r.lipides), 0));
      const isAlt = cr === 'petit_dejeuner_sale' || cr === 'petit_dejeuner_sucre';
      html += `<div class="card" ${isAlt ? 'style="border-style:dashed;"' : ''}>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div class="card-title" style="margin:0;">${creneauLabel(cr)}${isAlt ? ' <span style="font-size:10px;color:var(--gray-muted);font-weight:400;">(option)</span>' : ''}</div>
          <div style="text-align:right;">
            <div style="font-size:13px;color:var(--gold);font-weight:600;">${crKcal} kcal</div>
            ${items.length > 0 ? `<div style="font-size:11px;margin-top:2px;"><span style="color:#3B82F6;">P ${crProt}g</span> · <span style="color:#C4820A;">G ${crGluc}g</span> · <span style="color:#E05252;">L ${crLip}g</span></div>` : ''}
          </div>
        </div>`;

      items.forEach((r, i) => {
        const idx = this.repas.indexOf(r);
        html += `<div style="display:grid;grid-template-columns:1fr 70px 36px;gap:6px;margin-bottom:6px;align-items:start;">
          <div>
            <div style="font-size:13px;font-weight:600;">${r.aliment_nom} <span style="font-size:11px;color:var(--gray-light);">${r.quantite}${r.unite === 'g' ? 'g' : 'u'} · ${Math.round(r.calories)} kcal</span></div>
            <div style="font-size:11px;color:var(--gray-muted);margin-top:2px;">P ${Math.round(r.proteines)}g · G ${Math.round(r.glucides)}g · L ${Math.round(r.lipides)}g</div>
          </div>
          <input class="input" type="number" value="${r.quantite}" style="height:32px;font-size:12px;text-align:center;margin-top:2px;" onchange="CoachPlanEditPage.updateQty(${idx}, this.value)">
          <button style="width:36px;height:32px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:16px;color:var(--gray-muted);margin-top:2px;" onclick="CoachPlanEditPage.removeItem(${idx})">×</button>
        </div>`;
      });

      // Recherche aliment
      html += `<div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input class="input search-input" placeholder="Chercher un aliment…" oninput="CoachPlanEditPage.search(this, '${cr}')" onfocus="CoachPlanEditPage.search(this, '${cr}')">
        <div class="search-results" id="sr-${cr}"></div>
      </div>`;

      html += `</div>`;
    });

    // Totaux — petit-déj salé/sucré sont des alternatives : on compte seulement le max des deux
    const altCreneaux = ['petit_dejeuner_sale', 'petit_dejeuner_sucre'];
    const altTotals = altCreneaux.map(cr => ({
      kcal: this.repas.filter(r => r.creneau === cr).reduce((s, r) => s + parseFloat(r.calories), 0),
      prot: this.repas.filter(r => r.creneau === cr).reduce((s, r) => s + parseFloat(r.proteines), 0),
      gluc: this.repas.filter(r => r.creneau === cr).reduce((s, r) => s + parseFloat(r.glucides), 0),
      lip:  this.repas.filter(r => r.creneau === cr).reduce((s, r) => s + parseFloat(r.lipides), 0),
    }));
    const bestAlt = altTotals[0].kcal >= altTotals[1].kcal ? altTotals[0] : altTotals[1];
    const autres = this.repas.filter(r => !altCreneaux.includes(r.creneau));
    const totalKcal = Math.round(autres.reduce((s, r) => s + parseFloat(r.calories), 0) + bestAlt.kcal);
    const totalProt = Math.round(autres.reduce((s, r) => s + parseFloat(r.proteines), 0) + bestAlt.prot);
    const totalGluc = Math.round(autres.reduce((s, r) => s + parseFloat(r.glucides), 0) + bestAlt.gluc);
    const totalLip  = Math.round(autres.reduce((s, r) => s + parseFloat(r.lipides), 0) + bestAlt.lip);

    // Objectifs (depuis les inputs ou valeurs courantes)
    const objKcal = +document.getElementById('peKcal')?.value || cal;
    const objProt = +document.getElementById('peProt')?.value || prot;
    const objGluc = +document.getElementById('peGluc')?.value || gluc;
    const objLip  = +document.getElementById('peLip')?.value  || lip;

    function diffTag(val, obj) {
      if (obj === 0) return '';
      const d = val - obj;
      const pct = Math.abs(d) / obj;
      const color = pct <= 0.05 ? '#639922' : pct <= 0.12 ? '#C4820A' : '#E05252';
      const sign = d > 0 ? '+' : '';
      return `<span style="font-size:11px;font-weight:600;color:${color};">${sign}${d}</span>`;
    }

    html += `<div class="card card-accent">
      <div class="card-title">Total du plan</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;text-align:center;">
        <div>
          <div style="font-size:18px;font-weight:700;">${totalKcal}</div>
          <div style="font-size:10px;color:var(--gray-light);">/ ${objKcal} kcal</div>
          <div style="margin-top:2px;">${diffTag(totalKcal, objKcal)}</div>
        </div>
        <div>
          <div style="font-size:18px;font-weight:700;color:#3B82F6;">${totalProt}g</div>
          <div style="font-size:10px;color:var(--gray-light);">/ ${objProt}g Prot</div>
          <div style="margin-top:2px;">${diffTag(totalProt, objProt)}</div>
        </div>
        <div>
          <div style="font-size:18px;font-weight:700;color:#C4820A;">${totalGluc}g</div>
          <div style="font-size:10px;color:var(--gray-light);">/ ${objGluc}g Gluc</div>
          <div style="margin-top:2px;">${diffTag(totalGluc, objGluc)}</div>
        </div>
        <div>
          <div style="font-size:18px;font-weight:700;color:#E05252;">${totalLip}g</div>
          <div style="font-size:10px;color:var(--gray-light);">/ ${objLip}g Lip</div>
          <div style="margin-top:2px;">${diffTag(totalLip, objLip)}</div>
        </div>
      </div>
    </div>`;

    html += `<button class="btn btn-primary" style="margin-top:0.5rem;" onclick="CoachPlanEditPage.save()">💾 Enregistrer le plan</button>
    <div id="peSaveMsg" style="margin-top:0.75rem;"></div>`;

    document.getElementById('peContent').innerHTML = html;
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
    const qty = parseFloat(newQty) || 0;

    if (a) {
      // Aliment connu (ajouté pendant cette session) → recalcul depuis les valeurs /100g
      // Pour mode 'unit' : 1 unité = perG grammes (ex: 1 oeuf = 60g)
      const factor = a.mode === 'unit' ? qty * ((a.perG || 100) / 100) : qty / 100;
      r.calories  = Math.round((a.calories  || 0) * factor * 10) / 10;
      r.proteines = Math.round((a.proteines || 0) * factor * 10) / 10;
      r.glucides  = Math.round((a.glucides  || 0) * factor * 10) / 10;
      r.lipides   = Math.round((a.lipides   || 0) * factor * 10) / 10;
      r.fibres    = Math.round((a.fibres    || 0) * factor * 10) / 10;
    } else if (r.quantite > 0) {
      // Plan chargé depuis la DB : recalcul par ratio nouvelle/ancienne quantité
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
  },

  _onKcalInput() {
    const newKcal = +document.getElementById('peKcal').value || 0;
    const p = +document.getElementById('peProt').value || 0;
    const g = +document.getElementById('peGluc').value || 0;
    const l = +document.getElementById('peLip').value  || 0;
    const curKcal = p * 4 + g * 4 + l * 9;
    if (!curKcal || !newKcal) return;
    const ratio = newKcal / curKcal;
    document.getElementById('peProt').value = Math.round(p * ratio);
    document.getElementById('peGluc').value = Math.round(g * ratio);
    document.getElementById('peLip').value  = Math.round(l * ratio);
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
