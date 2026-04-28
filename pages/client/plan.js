// APEX APP — Plan Alimentaire Client (lecture)

const PlanPage = {
  plan: null,
  repas: [],
  creneaux: ['petit_dejeuner_sale', 'petit_dejeuner_sucre', 'collation_matin', 'dejeuner', 'collation_apres_midi', 'diner', 'collation_soir'],

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX</div>
          <div class="app-title">Mon plan alimentaire</div>
        </div>
        <button class="header-btn" onclick="Router.logout()">⏻</button>
      </div>
      <div class="tabs" style="margin-bottom:1rem;">
        <button class="tab" onclick="window.location.hash='#logbook'">📖 Logbook</button>
        <button class="tab active" onclick="window.location.hash='#plan'">📋 Plan</button>
        <button class="tab" onclick="window.location.hash='#recettes'">🍽️ Recettes</button>
      </div>
      <div id="planContent"><div class="spinner" style="margin-top:3rem;"></div></div>
      <nav class="nav-bottom"><div class="nav-inner">
        <a class="nav-item" href="#dashboard"><span class="nav-icon">🏠</span><span class="nav-label">Dashboard</span></a>
        <a class="nav-item active" href="#logbook"><span class="nav-icon">🥗</span><span class="nav-label">Nutrition</span></a>
      </div></nav>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile) return;

    try {
      this.plan = await db.getActivePlan(profile.id);
      if (this.plan) this.repas = await db.getPlanRepas(this.plan.id);
      this.renderContent();
    } catch (e) {
      document.getElementById('planContent').innerHTML = '<div class="alert alert-error">Erreur de chargement.</div>';
    }
  },

  renderContent() {
    const el = document.getElementById('planContent');
    if (!this.plan) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Ton coach n'a pas encore créé ton plan alimentaire.<br>Il sera visible ici dès qu'il sera prêt.</div></div>`;
      return;
    }

    let html = '';

    // Objectifs
    html += `<div class="card card-dark">
      <div class="card-title">Objectifs — ${this.plan.phase ? this.plan.phase.charAt(0).toUpperCase() + this.plan.phase.slice(1) : ''}</div>
      <div class="macros-big">
        <span class="macros-big-val">${this.plan.calories_cible.toLocaleString('fr-FR')}</span>
        <span class="macros-big-unit">kcal / jour</span>
      </div>
      <div class="macros-grid" style="margin-top:12px;">
        <div class="macro-item"><div class="macro-val">${this.plan.proteines_cible}g</div><div class="macro-label">Protéines</div></div>
        <div class="macro-item"><div class="macro-val">${this.plan.glucides_cible}g</div><div class="macro-label">Glucides</div></div>
        <div class="macro-item"><div class="macro-val">${this.plan.lipides_cible}g</div><div class="macro-label">Lipides</div></div>
      </div>
    </div>`;

    if (this.plan.notes) {
      html += `<div class="card card-accent"><div style="font-size:13px;color:var(--gray);line-height:1.6;">💡 ${this.plan.notes}</div></div>`;
    }

    // Repas par créneau
    this.creneaux.forEach(cr => {
      const items = this.repas.filter(r => r.creneau === cr);
      if (items.length === 0) return;

      const crKcal = Math.round(items.reduce((s, r) => s + parseFloat(r.calories), 0));

      // Séparateur "OU" entre les 2 options petit-déj
      if (cr === 'petit_dejeuner_sucre' && this.repas.some(r => r.creneau === 'petit_dejeuner_sale')) {
        html += `<div style="text-align:center;font-size:12px;font-weight:700;color:var(--gray-muted);letter-spacing:0.1em;margin:4px 0;">— OU —</div>`;
      }

      html += `<div class="creneau-section">
        <div class="creneau-header">
          <div class="creneau-title">${creneauLabel(cr)}</div>
          <div class="creneau-kcal">${crKcal} kcal</div>
        </div>`;

      items.forEach(r => {
        html += `<div class="entry-row">
          <div class="entry-info">
            <div class="entry-name">${r.aliment_nom}</div>
            <div class="entry-macros">${r.quantite}${r.unite === 'g' ? 'g' : ' unité(s)'} · P:${Math.round(r.proteines)}g · G:${Math.round(r.glucides)}g · L:${Math.round(r.lipides)}g</div>
          </div>
          <div class="entry-kcal">${Math.round(r.calories)}</div>
        </div>`;
      });
      html += `</div>`;
    });

    el.innerHTML = html;
  }
};
