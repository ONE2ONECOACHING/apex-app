// APEX APP — Coach : Éditeur Plan Alimentaire

const CoachPlanEditPage = {
  clientId: null,
  client: null,
  plans: [],
  currentPlan: null,
  repas: [],
  semaine: 1,
  creneaux: ['petit_dejeuner_sale', 'petit_dejeuner_sucre', 'collation_matin', 'dejeuner', 'collation_apres_midi', 'diner', 'collation_soir'],

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX · COACH</div>
          <div class="app-title" id="peTitle">Plan alimentaire</div>
        </div>
        <button class="header-btn" onclick="history.back()">←</button>
      </div>
      <div id="peContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    const params = Router.getParams();
    this.clientId = params.clientId;
    if (!this.clientId) { window.location.hash = '#coach-clients'; return; }

    try {
      this.client = await db.getProfile(this.clientId);
      this.plans = await db.getPlansForClient(this.clientId);
      document.getElementById('peTitle').textContent = 'Plan — ' + (this.client.prenom || 'Client');

      // Charger le plan actif ou semaine 1
      const activePlan = this.plans.find(p => p.actif) || this.plans[0];
      if (activePlan) {
        this.semaine = activePlan.semaine;
        this.currentPlan = activePlan;
        this.repas = await db.getPlanRepas(activePlan.id);
      } else {
        this.semaine = this.client.semaine_courante || 1;
      }

      this.renderEditor();
    } catch (e) {
      document.getElementById('peContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  async loadSemaine(sem) {
    this.semaine = sem;
    const plan = this.plans.find(p => p.semaine === sem);
    if (plan) {
      this.currentPlan = plan;
      this.repas = await db.getPlanRepas(plan.id);
    } else {
      this.currentPlan = null;
      this.repas = [];
    }
    this.renderEditor();
  },

  renderEditor() {
    const c = this.client;
    const p = this.currentPlan;
    const phases = ['relance', 'transformation', 'stabilisation'];

    let html = '';

    // Sélecteur semaine
    html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem;flex-wrap:wrap;">
      <label class="field-label" style="margin:0;">Semaine</label>
      <select class="input" style="width:80px;" onchange="CoachPlanEditPage.loadSemaine(+this.value)">
        ${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}" ${this.semaine === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}
      </select>
      <select class="input" style="width:150px;" id="pePhase">
        ${phases.map(ph => `<option value="${ph}" ${(p && p.phase === ph) || (!p && c.phase === ph) ? 'selected' : ''}>${ph.charAt(0).toUpperCase() + ph.slice(1)}</option>`).join('')}
      </select>
    </div>`;

    // Macros cibles
    const cal = p ? p.calories_cible : (c.tdee ? (c.objectif === 'perte' ? c.tdee - 350 : c.tdee) : 2000);
    const prot = p ? p.proteines_cible : Math.round((c.poids || 80) * 2);
    const gluc = p ? p.glucides_cible : Math.round((cal - prot * 4 - Math.round(cal * 0.25 / 9) * 9) / 4);
    const lip = p ? p.lipides_cible : Math.round(cal * 0.25 / 9);

    html += `<div class="card">
      <div class="card-title">Objectifs macros</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;">
        <div class="field"><label class="field-label">Kcal</label><input class="input" type="number" id="peKcal" value="${cal}"></div>
        <div class="field"><label class="field-label">Prot (g)</label><input class="input" type="number" id="peProt" value="${prot}"></div>
        <div class="field"><label class="field-label">Gluc (g)</label><input class="input" type="number" id="peGluc" value="${gluc}"></div>
        <div class="field"><label class="field-label">Lip (g)</label><input class="input" type="number" id="peLip" value="${lip}"></div>
      </div>
      <div class="field"><label class="field-label">Notes coach</label><textarea class="input" id="peNotes" rows="2">${p ? (p.notes || '') : ''}</textarea></div>
    </div>`;

    // Repas par créneau
    this.creneaux.forEach(cr => {
      const items = this.repas.filter(r => r.creneau === cr);
      const crKcal = Math.round(items.reduce((s, r) => s + parseFloat(r.calories), 0));

      html += `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div class="card-title" style="margin:0;">${creneauLabel(cr)}</div>
          <div style="font-size:13px;color:var(--gold);font-weight:600;">${crKcal} kcal</div>
        </div>`;

      items.forEach((r, i) => {
        const idx = this.repas.indexOf(r);
        html += `<div style="display:grid;grid-template-columns:1fr 70px 36px;gap:6px;margin-bottom:6px;align-items:center;">
          <div style="font-size:13px;font-weight:600;">${r.aliment_nom} <span style="font-size:11px;color:var(--gray-light);">${r.quantite}${r.unite === 'g' ? 'g' : 'u'} · ${Math.round(r.calories)} kcal</span></div>
          <input class="input" type="number" value="${r.quantite}" style="height:32px;font-size:12px;text-align:center;" onchange="CoachPlanEditPage.updateQty(${idx}, this.value)">
          <button style="width:36px;height:32px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:16px;color:var(--gray-muted);" onclick="CoachPlanEditPage.removeItem(${idx})">×</button>
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

    // Totaux
    const totalKcal = Math.round(this.repas.reduce((s, r) => s + parseFloat(r.calories), 0));
    const totalProt = Math.round(this.repas.reduce((s, r) => s + parseFloat(r.proteines), 0));
    const totalGluc = Math.round(this.repas.reduce((s, r) => s + parseFloat(r.glucides), 0));
    const totalLip = Math.round(this.repas.reduce((s, r) => s + parseFloat(r.lipides), 0));

    html += `<div class="card card-accent">
      <div class="card-title">Total du plan</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;text-align:center;">
        <div><div style="font-size:18px;font-weight:700;">${totalKcal}</div><div style="font-size:11px;color:var(--gray-light);">kcal</div></div>
        <div><div style="font-size:18px;font-weight:700;">${totalProt}g</div><div style="font-size:11px;color:var(--gray-light);">Prot</div></div>
        <div><div style="font-size:18px;font-weight:700;">${totalGluc}g</div><div style="font-size:11px;color:var(--gray-light);">Gluc</div></div>
        <div><div style="font-size:18px;font-weight:700;">${totalLip}g</div><div style="font-size:11px;color:var(--gray-light);">Lip</div></div>
      </div>
    </div>`;

    // Dupliquer + Sauvegarder
    html += `<div class="btn-row">
      <button class="btn btn-secondary" onclick="CoachPlanEditPage.duplicate()">📋 Dupliquer S${this.semaine} → S${this.semaine + 1}</button>
    </div>
    <button class="btn btn-primary" style="margin-top:0.5rem;" onclick="CoachPlanEditPage.save()">💾 Enregistrer le plan</button>
    <div id="peSaveMsg" style="margin-top:0.75rem;"></div>`;

    document.getElementById('peContent').innerHTML = html;
  },

  async search(input, creneau) {
    const q = input.value.trim();
    const resultsEl = document.getElementById('sr-' + creneau);
    if (q.length < 2) { resultsEl.classList.remove('show'); return; }

    const aliments = await db.searchAliments(q);
    if (aliments.length === 0) { resultsEl.classList.remove('show'); return; }

    resultsEl.innerHTML = aliments.map(a => {
      const per = a.mode === 'unit' ? '/unité' : '/100g';
      return `<div class="search-item" onclick="CoachPlanEditPage.addItem('${creneau}', ${JSON.stringify(a).replace(/'/g, "\\'")})">
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
    r.quantite = qty;

    if (a) {
      const factor = a.mode === 'unit' ? qty : qty / 100;
      r.calories = Math.round(a.calories * factor * 10) / 10;
      r.proteines = Math.round(a.proteines * factor * 10) / 10;
      r.glucides = Math.round(a.glucides * factor * 10) / 10;
      r.lipides = Math.round(a.lipides * factor * 10) / 10;
      r.fibres = Math.round((a.fibres || 0) * factor * 10) / 10;
    }

    this.renderEditor();
  },

  removeItem(idx) {
    this.repas.splice(idx, 1);
    this.renderEditor();
  },

  async duplicate() {
    if (this.repas.length === 0) { alert('Rien à dupliquer.'); return; }
    const nextSem = this.semaine + 1;
    if (nextSem > 16) { alert('Semaine max : 16'); return; }

    // Sauvegarder la semaine courante d'abord
    await this.save();
    // Dupliquer vers la semaine suivante
    this.semaine = nextSem;
    this.currentPlan = null;
    // Les repas restent (on les sauvegarde sur la nouvelle semaine)
    await this.save();
    await this.loadSemaine(nextSem);
  },

  async save() {
    const phase = document.getElementById('pePhase').value;
    const plan = {
      profile_id: this.clientId,
      semaine: this.semaine,
      phase: phase,
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

      const msg = document.getElementById('peSaveMsg');
      if (msg) {
        msg.innerHTML = '<div class="alert alert-success">✅ Plan semaine ' + this.semaine + ' enregistré</div>';
        setTimeout(() => { msg.innerHTML = ''; }, 3000);
      }
    } catch (e) {
      const msg = document.getElementById('peSaveMsg');
      if (msg) msg.innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  }
};
