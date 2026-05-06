// APEX APP — Client : Tutoriel de l'application

const TutorialPage = {
  step: 0,
  TOTAL: 8,

  render() {
    return `<div id="tutWrap"></div>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile) { window.location.hash = '#login'; return; }
    if (profile.role === 'coach') { window.location.hash = '#coach-clients'; return; }
    this.step = 0;
    this.renderStep();
  },

  renderStep() {
    const wrap = document.getElementById('tutWrap');
    if (!wrap) return;
    const slides = this._slides();
    wrap.innerHTML = slides[this.step]();
  },

  _dots() {
    let html = '<div class="onb-dots">';
    for (let i = 0; i <= this.TOTAL; i++) {
      html += `<div class="onb-dot ${i === this.step ? 'active' : i < this.step ? 'done' : ''}"></div>`;
    }
    return html + '</div>';
  },

  _navHint(activeTab, subTabs, activeSubTab) {
    const tabs = [
      { key: 'dashboard',    icon: '🏠', label: 'Accueil' },
      { key: 'logbook',      icon: '🥗', label: 'Nutrition' },
      { key: 'entrainement', icon: '💪', label: 'Sport' },
      { key: 'mesure',       icon: '📏', label: 'Mesures' },
      { key: 'outils',       icon: '🛠️', label: 'Outils' },
    ];
    let html = `
      <div class="tuto-nav-hint">
        <div class="tuto-nav-hint-label">Retrouve ça ici</div>
        <div class="tuto-nav-preview">
          ${tabs.map(t => `
            <div class="tuto-nav-item${t.key === activeTab ? ' active' : ''}">
              <span class="tuto-nav-item-icon">${t.icon}</span>
              <span class="tuto-nav-item-label">${t.label}</span>
            </div>`).join('')}
        </div>`;
    if (subTabs && activeSubTab) {
      html += `<div class="tuto-subnav-preview">
        ${subTabs.map(s => `<div class="tuto-subnav-item${s.key === activeSubTab ? ' active' : ''}">${s.label}</div>`).join('')}
      </div>`;
    }
    html += `</div>`;
    return html;
  },

  _card(icon, title, bodyHtml, navHintHtml) {
    const isFirst = this.step === 0;
    const isLast  = this.step === this.TOTAL;
    return `
      <div class="onb-screen tuto-screen">
        <div class="onb-logo">ONE2ONE</div>
        ${this._dots()}
        <div class="onb-welcome-icon">${icon}</div>
        <div class="onb-title tuto-title">${title}</div>
        <div class="tuto-body">${bodyHtml}</div>
        ${navHintHtml || ''}
        <div class="tuto-btn-row">
          ${!isFirst ? `<button class="btn btn-secondary tuto-btn-secondary" onclick="TutorialPage.prev()">← Retour</button>` : ''}
          <button class="btn btn-primary tuto-btn-primary" onclick="TutorialPage.next()">
            ${isLast ? 'Aller sur mon dashboard →' : isFirst ? 'Découvrir →' : 'Suivant →'}
          </button>
        </div>
      </div>`;
  },

  _slides() {
    const nutrition_subtabs = [{ key: 'plan', label: 'Plan' }, { key: 'logbook', label: 'Logbook' }];
    return [
      // 0 – Intro
      () => this._card('🎉', "L'app est prête pour toi !",
        `<p class="tuto-text">Fais le tour de ton espace en quelques secondes. On te présente chaque outil pour que tu sois autonome dès aujourd'hui.</p>`
      ),
      // 1 – Dashboard
      () => this._card('🏠', 'Ton tableau de bord',
        `<p class="tuto-text">C'est ta page d'accueil : ta progression de poids, tes objectifs et tes habitudes du jour. Consulte-le chaque matin pour rester dans le rythme.</p>`,
        this._navHint('dashboard')
      ),
      // 2 – Bilans
      () => this._card('📋', 'Les bilans coach',
        `<p class="tuto-text">Tous les samedis matin, ton coach t'envoie un bilan avec des questions sur ta semaine : forme, énergie, sommeil, ressenti…</p>
         <div class="tuto-alert">⚠️ Ces retours sont indispensables. Sans tes réponses, ton coach ne peut pas ajuster ton suivi.<br><strong>Réponds avant dimanche soir 23h59.</strong></div>`,
        this._navHint('dashboard')
      ),
      // 3 – Plan
      () => this._card('📋', 'Ton plan nutritionnel',
        `<p class="tuto-text">Retrouve ici le plan alimentaire conçu par ton coach : tes objectifs caloriques, tes macros et tes repas types. C'est ta référence au quotidien.</p>`,
        this._navHint('logbook', nutrition_subtabs, 'plan')
      ),
      // 4 – Logbook
      () => this._card('📖', 'Ton journal alimentaire',
        `<p class="tuto-text">Chaque jour, note tout ce que tu consommes. Ton coach suit ta régularité en temps réel. Plus ton journal est complet, plus l'accompagnement est efficace.</p>`,
        this._navHint('logbook', nutrition_subtabs, 'logbook')
      ),
      // 5 – Saisir repas
      () => this._card('✍️', '3 façons de saisir tes repas',
        `<ul class="tuto-list">
          <li><span class="tuto-list-icon">✏️</span><div><strong>Manuellement</strong><br>Recherche un aliment dans la base</div></li>
          <li><span class="tuto-list-icon">📋</span><div><strong>Depuis ton plan</strong><br>Ajoute un repas type en un clic</div></li>
          <li><span class="tuto-list-icon">🍽️</span><div><strong>Photo d'un plat</strong><br>L'IA analyse et estime les macros</div></li>
        </ul>`,
        this._navHint('logbook', nutrition_subtabs, 'logbook')
      ),
      // 6 – Entraînement
      () => this._card('💪', "Ton programme d'entraînement",
        `<p class="tuto-text">Ton programme est ici : exercices, séries, répétitions et temps de repos. Séance par séance, suis ta progression et reste concentré sur tes objectifs.</p>`,
        this._navHint('entrainement')
      ),
      // 7 – Mesures
      () => this._card('📏', 'Ton suivi corporel',
        `<p class="tuto-text">Note ton poids quotidiennement ou chaque semaine pour suivre ta courbe. Renseigne tes mensurations et ajoute des photos de progression en début de mois. Ces données donnent à ton coach une vision précise de ta transformation pour adapter ton programme.</p>`,
        this._navHint('mesure')
      ),
      // 8 – C'est parti
      () => this._card('✅', 'Tu es prêt.',
        `<p class="tuto-text">Tu retrouveras ce tutoriel à tout moment dans l'onglet <strong>Outils</strong>. Ton coach est disponible pour toute question.</p>`,
        this._navHint('outils')
      ),
    ];
  },

  prev() {
    if (this.step > 0) { this.step--; this.renderStep(); }
  },

  next() {
    if (this.step < this.TOTAL) { this.step++; this.renderStep(); }
    else { window.location.hash = '#dashboard'; }
  }
};
