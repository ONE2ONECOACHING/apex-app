// APEX APP — Client : Onboarding (premier login)

const OnboardingPage = {
  profile: null,
  step: 1,
  TOTAL: 3,

  render() {
    return `<div id="onbWrap"></div>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile) { window.location.hash = '#login'; return; }
    if (profile.role === 'coach') { window.location.hash = '#coach-clients'; return; }
    this.profile = profile;
    this.step = 1;
    this.renderStep();
  },

  renderStep() {
    const wrap = document.getElementById('onbWrap');
    if (!wrap) return;
    switch (this.step) {
      case 1: wrap.innerHTML = this._step1(); break;
      case 2: wrap.innerHTML = this._step2(); break;
      case 3: wrap.innerHTML = this._step3(); break;
    }
  },

  _dots() {
    let html = '<div class="onb-dots">';
    for (let i = 1; i <= this.TOTAL; i++) {
      html += `<div class="onb-dot ${i === this.step ? 'active' : i < this.step ? 'done' : ''}"></div>`;
    }
    return html + '</div>';
  },

  _step1() {
    const prenom = this.profile.prenom || '';
    return `
      <div class="onb-screen">
        <div class="onb-logo">ONE2ONE — APEX</div>
        ${this._dots()}
        <div class="onb-welcome-icon">👊</div>
        <div class="onb-title">Bienvenue${prenom ? ',<br>' + prenom : ''} !</div>
        <div class="onb-sub">Quelques infos pour personnaliser<br>ton expérience.</div>
        <button class="btn btn-primary onb-btn" onclick="OnboardingPage.next()">Commencer →</button>
      </div>`;
  },

  _step2() {
    const p = this.profile;
    return `
      <div class="onb-screen">
        <div class="onb-logo">ONE2ONE — APEX</div>
        ${this._dots()}
        <div class="onb-title">Ton profil</div>
        <div class="onb-form">
          <div class="field">
            <label class="field-label">Prénom</label>
            <input class="input" id="onbPrenom" type="text" value="${p.prenom || ''}" placeholder="Ton prénom">
          </div>
          <div class="field">
            <label class="field-label">Âge</label>
            <input class="input" id="onbAge" type="number" value="${p.age || ''}" placeholder="ex : 28" min="10" max="100">
          </div>
          <div class="field">
            <label class="field-label">Genre</label>
            <div class="onb-toggle">
              <button type="button" id="onbH" class="onb-toggle-btn ${(!p.sexe || p.sexe === 'homme') ? 'active' : ''}" onclick="OnboardingPage._setSexe('homme')">Homme</button>
              <button type="button" id="onbF" class="onb-toggle-btn ${p.sexe === 'femme' ? 'active' : ''}" onclick="OnboardingPage._setSexe('femme')">Femme</button>
            </div>
          </div>
        </div>
        <div id="onbErr" style="margin-bottom:8px;"></div>
        <button class="btn btn-primary onb-btn" onclick="OnboardingPage.next()">Suivant →</button>
      </div>`;
  },

  _step3() {
    const p = this.profile;
    return `
      <div class="onb-screen">
        <div class="onb-logo">ONE2ONE — APEX</div>
        ${this._dots()}
        <div class="onb-title">Tes mesures</div>
        <div class="onb-form">
          <div class="field">
            <label class="field-label">Taille (cm)</label>
            <input class="input" id="onbTaille" type="number" value="${p.taille || ''}" placeholder="ex : 175" min="100" max="230">
          </div>
          <div class="field">
            <label class="field-label">Poids actuel (kg)</label>
            <input class="input" id="onbPoids" type="number" value="${p.poids || ''}" placeholder="ex : 78.5" step="0.1" min="30" max="300">
          </div>
        </div>
        <div id="onbErr" style="margin-bottom:8px;"></div>
        <button class="btn btn-primary onb-btn" onclick="OnboardingPage.finish()">C'est parti 🔥</button>
      </div>`;
  },

  _setSexe(val) {
    document.getElementById('onbH').classList.toggle('active', val === 'homme');
    document.getElementById('onbF').classList.toggle('active', val === 'femme');
    this._sexe = val;
  },

  _sexe: 'homme',

  next() {
    if (this.step === 1) {
      this.step = 2;
      this._sexe = this.profile.sexe || 'homme';
      this.renderStep();
      return;
    }
    if (this.step === 2) {
      const prenom = document.getElementById('onbPrenom').value.trim();
      const age    = parseInt(document.getElementById('onbAge').value);
      if (!prenom) { document.getElementById('onbErr').innerHTML = '<div class="alert alert-error">Saisis ton prénom.</div>'; return; }
      if (!age || age < 10 || age > 100) { document.getElementById('onbErr').innerHTML = '<div class="alert alert-error">Saisis ton âge.</div>'; return; }
      this._data2 = { prenom, age, sexe: this._sexe };
      this.step = 3;
      this.renderStep();
    }
  },

  async finish() {
    const taille = parseInt(document.getElementById('onbTaille').value);
    const poids  = parseFloat(document.getElementById('onbPoids').value);
    if (!taille || taille < 100 || taille > 230) { document.getElementById('onbErr').innerHTML = '<div class="alert alert-error">Saisis ta taille.</div>'; return; }
    if (!poids  || poids  < 30  || poids  > 300) { document.getElementById('onbErr').innerHTML = '<div class="alert alert-error">Saisis ton poids.</div>'; return; }

    const updates = {
      ...this._data2,
      taille,
      poids,
      poids_depart: this.profile.poids_depart || poids,
      onboarding_done: true
    };

    try {
      await db.updateProfile(this.profile.id, updates);
      // Mettre à jour le profil en mémoire
      Object.assign(Router.userProfile, updates);
      // Logger le poids de départ
      await db.logPoids(this.profile.id, todayStr(), poids).catch(() => {});
      window.location.hash = '#dashboard';
    } catch (e) {
      document.getElementById('onbErr').innerHTML = '<div class="alert alert-error">Erreur : ' + e.message + '</div>';
    }
  }
};
