// APEX APP — Client : Onboarding (premier login)

const OnboardingPage = {
  profile: null,
  step: 1,
  TOTAL: 4,
  _sexe: 'homme',
  _activites: [],
  _data2: {},
  _data3: {},

  render() {
    return `<div id="onbWrap"></div>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile) { window.location.hash = '#login'; return; }
    if (profile.role === 'coach') { window.location.hash = '#coach-clients'; return; }
    this.profile = profile;
    this.step = 1;
    this._activites = [];
    this._data2 = {};
    this._data3 = {};
    this.renderStep();
  },

  renderStep() {
    const wrap = document.getElementById('onbWrap');
    if (!wrap) return;
    switch (this.step) {
      case 1: wrap.innerHTML = this._step1(); break;
      case 2: wrap.innerHTML = this._step2(); break;
      case 3: wrap.innerHTML = this._step3(); break;
      case 4: wrap.innerHTML = this._step4(); this._renderActivites(); break;
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
        <div class="onb-logo">ONE2ONE</div>
        ${this._dots()}
        <div class="onb-welcome-icon">👊</div>
        <div class="onb-title">Bienvenue${prenom ? ',<br>' + prenom : ''} !</div>
        <div class="onb-sub">Quelques infos pour personnaliser<br>ton expérience.</div>
        <button class="btn btn-primary onb-btn" onclick="OnboardingPage.next()">Commencer →</button>
      </div>`;
  },

  _step2() {
    const p = this.profile;
    const d = this._data2;
    return `
      <div class="onb-screen">
        <div class="onb-logo">ONE2ONE</div>
        ${this._dots()}
        <div class="onb-title">Ton profil</div>
        <div class="onb-form">
          <div class="field">
            <label class="field-label">Prénom</label>
            <input class="input" id="onbPrenom" type="text" value="${d.prenom || p.prenom || ''}" placeholder="Ton prénom">
          </div>
          <div class="field">
            <label class="field-label">Âge</label>
            <input class="input" id="onbAge" type="number" value="${d.age || p.age || ''}" placeholder="ex : 28" min="10" max="100">
          </div>
          <div class="field">
            <label class="field-label">Genre</label>
            <div class="onb-toggle">
              <button type="button" id="onbH" class="onb-toggle-btn ${(this._sexe || p.sexe || 'homme') === 'homme' ? 'active' : ''}" onclick="OnboardingPage._setSexe('homme')">Homme</button>
              <button type="button" id="onbF" class="onb-toggle-btn ${(this._sexe || p.sexe) === 'femme' ? 'active' : ''}" onclick="OnboardingPage._setSexe('femme')">Femme</button>
            </div>
          </div>
        </div>
        <div id="onbErr" style="margin-bottom:8px;"></div>
        <button class="btn btn-primary onb-btn" onclick="OnboardingPage.next()">Suivant →</button>
      </div>`;
  },

  _step3() {
    const p = this.profile;
    const d = this._data3;
    return `
      <div class="onb-screen">
        <div class="onb-logo">ONE2ONE</div>
        ${this._dots()}
        <div class="onb-title">Tes mesures</div>
        <div class="onb-form">
          <div class="field">
            <label class="field-label">Taille (cm)</label>
            <input class="input" id="onbTaille" type="number" value="${d.taille || p.taille || ''}" placeholder="ex : 175" min="100" max="230">
          </div>
          <div class="field">
            <label class="field-label">Poids actuel (kg)</label>
            <input class="input" id="onbPoids" type="number" value="${d.poids || p.poids || ''}" placeholder="ex : 78.5" step="0.1" min="30" max="300">
          </div>
          <div class="field">
            <label class="field-label">Poids objectif (kg)</label>
            <input class="input" id="onbPoidsObjectif" type="number" value="${d.poids_objectif || p.poids_objectif || ''}" placeholder="ex : 70" step="0.1" min="30" max="300">
          </div>
        </div>
        <div id="onbErr" style="margin-bottom:8px;"></div>
        <button class="btn btn-primary onb-btn" onclick="OnboardingPage.next()">Suivant →</button>
      </div>`;
  },

  _step4() {
    const p = this.profile;
    const metiers = [
      { v: 'sedentaire', l: 'Sédentaire (bureau, peu de déplacements)' },
      { v: 'leger',      l: 'Légèrement actif (déplacements, debout)' },
      { v: 'actif',      l: 'Actif (travail physique modéré)' },
      { v: 'tres_actif', l: 'Très physique (travail manuel intense)' }
    ];
    return `
      <div class="onb-screen">
        <div class="onb-logo">ONE2ONE</div>
        ${this._dots()}
        <div class="onb-title">Ton activité</div>
        <div class="onb-form">
          <div class="field">
            <label class="field-label">Type de métier</label>
            <select class="input" id="onbMetier">
              ${metiers.map(m => `<option value="${m.v}" ${(p.type_metier || 'sedentaire') === m.v ? 'selected' : ''}>${m.l}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label class="field-label">Pas par jour (en moyenne)</label>
            <input class="input" id="onbPas" type="number" value="${p.pas_par_jour || 5000}" min="0" max="50000" step="500" placeholder="ex : 7000">
          </div>
          <div class="field">
            <label class="field-label">Séances sportives</label>
            <div id="onbActivites"></div>
            <button class="add-meal-btn" style="margin-top:6px;" onclick="OnboardingPage._addActivite()">+ Ajouter une activité</button>
          </div>
        </div>
        <div id="onbErr" style="margin-bottom:8px;"></div>
        <button class="btn btn-primary onb-btn" onclick="OnboardingPage.finish()">C'est parti 🔥</button>
      </div>`;
  },

  _renderActivites() {
    const container = document.getElementById('onbActivites');
    if (!container) return;
    const sports = Object.keys(TDEE.METS);
    container.innerHTML = this._activites.map((a, i) => `
      <div style="display:grid;grid-template-columns:1fr 90px 36px;gap:8px;margin-bottom:6px;align-items:center;">
        <select class="input" onchange="OnboardingPage._activites[${i}].sport=this.value;OnboardingPage._activites[${i}].met=TDEE.METS[this.value]||5">
          ${sports.map(s => `<option value="${s}" ${a.sport === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <select class="input" onchange="OnboardingPage._activites[${i}].duree_minutes=parseInt(this.value)">
          ${[15,20,30,45,60,75,90,120].map(d => `<option value="${d}" ${a.duree_minutes === d ? 'selected' : ''}>${d} min</option>`).join('')}
        </select>
        <button style="width:36px;height:36px;border:1px solid var(--border);border-radius:8px;background:var(--white);cursor:pointer;font-size:18px;" onclick="OnboardingPage._removeActivite(${i})">×</button>
      </div>`).join('');
  },

  _addActivite() {
    this._activites.push({ sport: 'Musculation', duree_minutes: 45, met: 3.5 });
    this._renderActivites();
  },

  _removeActivite(i) {
    this._activites.splice(i, 1);
    this._renderActivites();
  },

  _setSexe(val) {
    this._sexe = val;
    const btnH = document.getElementById('onbH');
    const btnF = document.getElementById('onbF');
    if (btnH) btnH.classList.toggle('active', val === 'homme');
    if (btnF) btnF.classList.toggle('active', val === 'femme');
  },

  next() {
    if (this.step === 1) {
      this._sexe = this.profile.sexe || 'homme';
      this.step = 2;
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
      return;
    }

    if (this.step === 3) {
      const taille         = parseInt(document.getElementById('onbTaille').value);
      const poids          = parseFloat(document.getElementById('onbPoids').value);
      const poids_objectif = parseFloat(document.getElementById('onbPoidsObjectif').value);
      if (!taille || taille < 100 || taille > 230) { document.getElementById('onbErr').innerHTML = '<div class="alert alert-error">Saisis ta taille.</div>'; return; }
      if (!poids  || poids  < 30  || poids  > 300) { document.getElementById('onbErr').innerHTML = '<div class="alert alert-error">Saisis ton poids actuel.</div>'; return; }
      if (!poids_objectif || poids_objectif < 30 || poids_objectif > 300) { document.getElementById('onbErr').innerHTML = '<div class="alert alert-error">Saisis ton poids objectif.</div>'; return; }
      this._data3 = { taille, poids, poids_objectif };
      this.step = 4;
      this.renderStep();
    }
  },

  async finish() {
    const type_metier  = document.getElementById('onbMetier').value;
    const pas_par_jour = parseInt(document.getElementById('onbPas').value) || 5000;

    const updates = {
      ...this._data2,
      ...this._data3,
      poids_depart: this.profile.poids_depart || this._data3.poids,
      type_metier,
      pas_par_jour,
      onboarding_done: true
    };

    const btn = document.querySelector('.onb-btn');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }

    try {
      await db.updateProfile(this.profile.id, updates);
      await db.setActivites(this.profile.id, this._activites);
      Object.assign(Router.userProfile, updates);
      await db.logPoids(this.profile.id, todayStr(), updates.poids).catch(() => {});
      window.location.hash = '#dashboard';
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = 'C\'est parti 🔥'; }
      document.getElementById('onbErr').innerHTML = '<div class="alert alert-error">Erreur : ' + e.message + '</div>';
    }
  }
};
