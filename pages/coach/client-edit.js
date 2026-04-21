// APEX APP — Coach : Fiche Client (infos + TDEE)

const CoachClientEditPage = {
  client: null,
  activites: [],

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX · COACH</div>
          <div class="app-title" id="ceTitle">Fiche client</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#coach-clients'">←</button>
      </div>
      <div id="ceContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    const params = Router.getParams();
    if (!params.clientId) { window.location.hash = '#coach-clients'; return; }

    try {
      this.client = await db.getProfile(params.clientId);
      this.activites = await db.getActivites(params.clientId);
      document.getElementById('ceTitle').textContent = this.client.prenom || 'Client';
      this.renderForm();
    } catch (e) {
      document.getElementById('ceContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  renderForm() {
    const c = this.client;
    const phases = ['relance', 'transformation', 'stabilisation'];
    const metiers = [
      { v: 'sedentaire', l: 'Sédentaire' }, { v: 'leger', l: 'Légèrement actif' },
      { v: 'actif', l: 'Actif' }, { v: 'tres_actif', l: 'Très physique' }
    ];
    const objectifs = [
      { v: 'perte', l: 'Perte de poids' }, { v: 'maintien', l: 'Maintien' }, { v: 'masse', l: 'Prise de masse' }
    ];
    const sports = Object.keys(TDEE.METS);

    let html = `
      <div style="display:flex;gap:8px;margin-bottom:1rem;flex-wrap:wrap;">
        <button class="btn btn-primary btn-small" onclick="Router.navigate('coach-plan-edit',{clientId:'${c.id}'})">📋 Plan alimentaire</button>
        <button class="btn btn-secondary btn-small" onclick="Router.navigate('coach-journal',{clientId:'${c.id}'})">📊 Journal</button>
      </div>

      <div class="card">
        <div class="card-title">Informations</div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Sexe</label>
            <select class="input" id="ceSexe"><option value="homme" ${c.sexe === 'homme' ? 'selected' : ''}>Homme</option><option value="femme" ${c.sexe === 'femme' ? 'selected' : ''}>Femme</option></select>
          </div>
          <div class="field"><label class="field-label">Âge</label><input class="input" type="number" id="ceAge" value="${c.age || ''}"></div>
        </div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Poids (kg)</label><input class="input" type="number" id="cePoids" value="${c.poids || ''}" step="0.1"></div>
          <div class="field"><label class="field-label">Taille (cm)</label><input class="input" type="number" id="ceTaille" value="${c.taille || ''}"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Activité</div>
        <div class="field"><label class="field-label">Type de métier</label>
          <select class="input" id="ceMetier">${metiers.map(m => `<option value="${m.v}" ${c.type_metier === m.v ? 'selected' : ''}>${m.l}</option>`).join('')}</select>
        </div>
        <div class="field"><label class="field-label">Pas par jour</label><input class="input" type="number" id="cePas" value="${c.pas_par_jour || 5000}"></div>

        <div class="field"><label class="field-label">Séances sportives</label>
          <div id="ceActivites"></div>
          <button class="add-meal-btn" style="margin-top:6px;" onclick="CoachClientEditPage.addActivite()">+ Ajouter une activité</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Objectif & Phase</div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Objectif</label>
            <select class="input" id="ceObjectif">${objectifs.map(o => `<option value="${o.v}" ${c.objectif === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}</select>
          </div>
          <div class="field"><label class="field-label">Phase</label>
            <select class="input" id="cePhase">${phases.map(p => `<option value="${p}" ${c.phase === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`).join('')}</select>
          </div>
        </div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Semaine courante</label><input class="input" type="number" id="ceSemaine" value="${c.semaine_courante || 1}" min="1" max="16"></div>
          <div class="field"><label class="field-label">Masse grasse %</label><input class="input" type="number" id="ceFat" value="${c.masse_grasse_pct || ''}" step="0.1"></div>
        </div>
      </div>

      <div class="card card-accent" id="ceTDEEResult">
        <div class="card-title">TDEE calculé</div>
        <div style="font-size:13px;color:var(--gray);">Remplis les infos ci-dessus et clique "Calculer" pour voir le TDEE.</div>
      </div>

      <div class="btn-row">
        <button class="btn btn-secondary" onclick="CoachClientEditPage.calcTDEE()">🔢 Calculer TDEE</button>
        <button class="btn btn-primary" onclick="CoachClientEditPage.save()">💾 Enregistrer</button>
      </div>
      <div id="ceSaveMsg" style="margin-top:0.75rem;"></div>`;

    document.getElementById('ceContent').innerHTML = html;
    this.renderActivites();
  },

  renderActivites() {
    const container = document.getElementById('ceActivites');
    const sports = Object.keys(TDEE.METS);
    container.innerHTML = this.activites.map((a, i) => `
      <div style="display:grid;grid-template-columns:1fr 90px 36px;gap:8px;margin-bottom:6px;align-items:center;">
        <select class="input" onchange="CoachClientEditPage.activites[${i}].sport=this.value;CoachClientEditPage.activites[${i}].met=TDEE.METS[this.value]||5">
          ${sports.map(s => `<option value="${s}" ${a.sport === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <select class="input" onchange="CoachClientEditPage.activites[${i}].duree_minutes=parseInt(this.value)">
          ${[15, 20, 30, 45, 60, 75, 90, 120].map(d => `<option value="${d}" ${a.duree_minutes === d ? 'selected' : ''}>${d} min</option>`).join('')}
        </select>
        <button style="width:36px;height:36px;border:1px solid var(--border);border-radius:8px;background:var(--white);cursor:pointer;font-size:18px;" onclick="CoachClientEditPage.activites.splice(${i},1);CoachClientEditPage.renderActivites()">×</button>
      </div>`).join('');
  },

  addActivite() {
    this.activites.push({ sport: 'Musculation', duree_minutes: 45, met: 3.5 });
    this.renderActivites();
  },

  calcTDEE() {
    const profile = {
      sexe: document.getElementById('ceSexe').value,
      age: +document.getElementById('ceAge').value,
      poids: +document.getElementById('cePoids').value,
      taille: +document.getElementById('ceTaille').value,
      type_metier: document.getElementById('ceMetier').value,
      pas_par_jour: +document.getElementById('cePas').value,
      objectif: document.getElementById('ceObjectif').value
    };

    if (!profile.age || !profile.poids || !profile.taille) {
      alert('Remplis au minimum l\'âge, le poids et la taille.'); return;
    }

    const result = TDEE.calculate(profile, this.activites);

    document.getElementById('ceTDEEResult').innerHTML = `
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
    const updates = {
      sexe: document.getElementById('ceSexe').value,
      age: +document.getElementById('ceAge').value || null,
      poids: +document.getElementById('cePoids').value || null,
      taille: +document.getElementById('ceTaille').value || null,
      type_metier: document.getElementById('ceMetier').value,
      pas_par_jour: +document.getElementById('cePas').value || 5000,
      objectif: document.getElementById('ceObjectif').value,
      phase: document.getElementById('cePhase').value,
      semaine_courante: +document.getElementById('ceSemaine').value || 1,
      masse_grasse_pct: +document.getElementById('ceFat').value || null
    };

    // Calcul TDEE si possible
    if (updates.age && updates.poids && updates.taille) {
      const result = TDEE.calculate(updates, this.activites);
      updates.bmr = result.bmr;
      updates.neat = result.neat;
      updates.eat = result.eat;
      updates.tdee = result.tdee;
    }

    try {
      await db.updateProfile(id, updates);
      await db.setActivites(id, this.activites);
      document.getElementById('ceSaveMsg').innerHTML = '<div class="alert alert-success">✅ Client mis à jour</div>';
      setTimeout(() => { document.getElementById('ceSaveMsg').innerHTML = ''; }, 3000);
    } catch (e) {
      document.getElementById('ceSaveMsg').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  }
};
