// APEX APP — Coach : calcul des besoins (TDEE) d'un client
// Onglet « Plan alimentaire › Calcul » : données physiques, activité, objectif,
// calcul du TDEE et mise à jour des objectifs du plan actif.

const CoachCalculNutritionPage = {
  client: null,
  activites: [],

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="cnTitle">Calcul des besoins</div>
        </div>
      </div>
      <div id="cnContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    this.client = null;
    this.activites = [];
    const params = Router.getParams();
    if (!params.clientId) { window.location.hash = '#coach-clients'; return; }
    try {
      [this.client, this.activites] = await Promise.all([
        db.getProfile(params.clientId),
        db.getActivites(params.clientId),
      ]);
      document.getElementById('cnTitle').textContent = 'Calcul des besoins — ' + (this.client.prenom || 'Client');
      this.renderForm();
    } catch (e) {
      document.getElementById('cnContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  renderForm() {
    const c = this.client;
    const metiers = [
      { v: 'sedentaire', l: 'Sédentaire' }, { v: 'leger', l: 'Légèrement actif' },
      { v: 'actif', l: 'Actif' }, { v: 'tres_actif', l: 'Très physique' }
    ];
    const objectifs = [
      { v: 'perte', l: 'Perte de poids' }, { v: 'maintien', l: 'Maintien' }, { v: 'masse', l: 'Prise de masse' }
    ];

    document.getElementById('cnContent').innerHTML = `
      ${coachClientNav(c.id, 'coach-calcul-nutrition')}

      <div class="card">
        <div class="card-title">Données physiques</div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Sexe</label>
            <select class="input" id="cnSexe"><option value="homme" ${c.sexe === 'homme' ? 'selected' : ''}>Homme</option><option value="femme" ${c.sexe === 'femme' ? 'selected' : ''}>Femme</option></select>
          </div>
          <div class="field"><label class="field-label">Âge</label><input class="input" type="number" id="cnAge" value="${c.age || ''}"></div>
        </div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Poids actuel (kg)</label><input class="input" type="number" id="cnPoids" value="${c.poids || ''}" step="0.1"></div>
          <div class="field"><label class="field-label">Taille (cm)</label><input class="input" type="number" id="cnTaille" value="${c.taille || ''}"></div>
        </div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Poids de départ (kg)</label><input class="input" type="number" id="cnPoidsDepart" value="${c.poids_depart || ''}" step="0.1"></div>
          <div class="field"><label class="field-label">Poids objectif (kg)</label><input class="input" type="number" id="cnPoidsObjectif" value="${c.poids_objectif || ''}" step="0.1"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Activité</div>
        <div class="field"><label class="field-label">Type de métier</label>
          <select class="input" id="cnMetier">${metiers.map(m => `<option value="${m.v}" ${c.type_metier === m.v ? 'selected' : ''}>${m.l}</option>`).join('')}</select>
        </div>
        <div class="field"><label class="field-label">Pas par jour</label><input class="input" type="number" id="cnPas" value="${c.pas_par_jour || 5000}"></div>
        <div class="field"><label class="field-label">Séances sportives</label>
          <div id="cnActivites"></div>
          <button class="add-meal-btn" style="margin-top:6px;" onclick="CoachCalculNutritionPage.addActivite()">+ Ajouter une activité</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Objectif</div>
        <div class="field"><label class="field-label">Objectif</label>
          <select class="input" id="cnObjectif">${objectifs.map(o => `<option value="${o.v}" ${c.objectif === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}</select>
        </div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field">
            <label class="field-label">Semaine courante</label>
            <input class="input" type="number" id="cnSemaine" value="${clientCurrentWeek(c)}" min="1">
            <div style="font-size:11px;color:var(--gray-muted);margin-top:4px;">↻ S'incrémente automatiquement chaque lundi</div>
          </div>
          <div class="field"><label class="field-label">Masse grasse %</label><input class="input" type="number" id="cnFat" value="${c.masse_grasse_pct || ''}" step="0.1"></div>
        </div>
      </div>

      <div class="card card-accent" id="cnTDEEResult">
        <div class="card-title">TDEE calculé</div>
        <div style="font-size:13px;color:var(--gray);">Remplis les infos ci-dessus et clique « Calculer » pour voir le TDEE.</div>
      </div>

      <div class="btn-row">
        <button class="btn btn-secondary" onclick="CoachCalculNutritionPage.calcTDEE()">🔢 Calculer TDEE</button>
        <button class="btn btn-primary" onclick="CoachCalculNutritionPage.save()">💾 Enregistrer</button>
      </div>
      <div id="cnSaveMsg" style="margin-top:0.75rem;"></div>`;

    this.renderActivites();
  },

  renderActivites() {
    const container = document.getElementById('cnActivites');
    const sports = Object.keys(TDEE.METS);
    container.innerHTML = this.activites.map((a, i) => `
      <div style="display:grid;grid-template-columns:1fr 90px 36px;gap:8px;margin-bottom:6px;align-items:center;">
        <select class="input" onchange="CoachCalculNutritionPage.activites[${i}].sport=this.value;CoachCalculNutritionPage.activites[${i}].met=TDEE.METS[this.value]||5">
          ${sports.map(s => `<option value="${s}" ${a.sport === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <select class="input" onchange="CoachCalculNutritionPage.activites[${i}].duree_minutes=parseInt(this.value)">
          ${[15, 20, 30, 45, 60, 75, 90, 120].map(d => `<option value="${d}" ${a.duree_minutes === d ? 'selected' : ''}>${d} min</option>`).join('')}
        </select>
        <button style="width:36px;height:36px;border:1px solid var(--border);border-radius:8px;background:var(--white);cursor:pointer;font-size:18px;" onclick="CoachCalculNutritionPage.activites.splice(${i},1);CoachCalculNutritionPage.renderActivites()">×</button>
      </div>`).join('');
  },

  addActivite() {
    this.activites.push({ sport: 'Musculation', duree_minutes: 45, met: 3.5 });
    this.renderActivites();
  },

  _profilSaisi() {
    const v = id => document.getElementById(id).value;
    return {
      sexe: v('cnSexe'),
      age: +v('cnAge') || null,
      poids: +v('cnPoids') || null,
      taille: +v('cnTaille') || null,
      type_metier: v('cnMetier'),
      pas_par_jour: +v('cnPas') || 5000,
      objectif: v('cnObjectif'),
    };
  },

  calcTDEE() {
    const profile = this._profilSaisi();
    if (!profile.age || !profile.poids || !profile.taille) {
      toast('Remplis au minimum l\'âge, le poids et la taille.', 'error'); return;
    }
    const result = TDEE.calculate(profile, this.activites);
    document.getElementById('cnTDEEResult').innerHTML = `
      <div class="card-title">TDEE calculé</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
        <div style="text-align:center;"><div style="font-size:16px;font-weight:700;">${result.bmr}</div><div style="font-size:11px;color:var(--gray-light);">BMR</div></div>
        <div style="text-align:center;"><div style="font-size:16px;font-weight:700;">${result.neat}</div><div style="font-size:11px;color:var(--gray-light);">NEAT</div></div>
        <div style="text-align:center;"><div style="font-size:16px;font-weight:700;">${result.eat}</div><div style="font-size:11px;color:var(--gray-light);">EAT</div></div>
      </div>
      <div style="text-align:center;padding:10px;background:var(--white);border-radius:8px;margin-bottom:10px;">
        <div style="font-size:12px;color:var(--gray-light);">TDEE</div>
        <div style="font-size:24px;font-weight:700;">${result.tdee} kcal</div>
      </div>
      <div style="text-align:center;padding:10px;background:var(--gold-light);border-radius:8px;">
        <div style="font-size:12px;color:var(--gold);">Objectif (${profile.objectif})</div>
        <div style="font-size:24px;font-weight:700;color:var(--gold);">${result.targetKcal} kcal</div>
        <div style="font-size:12px;color:var(--gray);margin-top:4px;">P: ${result.proteines}g · G: ${result.glucides}g · L: ${result.lipides}g</div>
      </div>`;
  },

  async save() {
    const id = this.client.id;
    // Champ « Semaine courante » vide → conserver la valeur existante (#44)
    const semRaw = document.getElementById('cnSemaine').value.trim();
    const semaine = semRaw !== '' ? (parseInt(semRaw) || this.client.semaine_courante || 1)
                                  : (this.client.semaine_courante || 1);
    const updates = {
      ...this._profilSaisi(),
      poids_depart: +document.getElementById('cnPoidsDepart').value || null,
      poids_objectif: +document.getElementById('cnPoidsObjectif').value || null,
      semaine_courante: semaine,
      date_debut: (() => {
        // Rétro-calculer date_debut depuis le lundi de la semaine courante
        const today = new Date();
        const dow = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));
        monday.setHours(0, 0, 0, 0);
        return formatDate(new Date(monday.getTime() - (semaine - 1) * 7 * 24 * 3600 * 1000));
      })(),
      masse_grasse_pct: +document.getElementById('cnFat').value || null,
    };

    let tdeeResult = null;
    if (updates.age && updates.poids && updates.taille) {
      tdeeResult = TDEE.calculate(updates, this.activites);
      updates.bmr  = tdeeResult.bmr;
      updates.neat = tdeeResult.neat;
      updates.eat  = tdeeResult.eat;
      updates.tdee = tdeeResult.tdee;
    }

    const msg = document.getElementById('cnSaveMsg');
    try {
      await db.updateProfile(id, updates);
      await db.setActivites(id, this.activites);
      let planMsg = '';
      if (tdeeResult) {
        try {
          await db.updateActivePlanMacros(id, {
            calories_cible:  tdeeResult.targetKcal,
            proteines_cible: tdeeResult.proteines,
            glucides_cible:  tdeeResult.glucides,
            lipides_cible:   tdeeResult.lipides
          });
          planMsg = ' · Objectifs du plan mis à jour';
        } catch (_) {}
      }
      msg.innerHTML = `<div class="alert alert-success">✅ Enregistré${planMsg}</div>`;
      setTimeout(() => { msg.innerHTML = ''; }, 4000);
    } catch (e) {
      msg.innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  }
};
