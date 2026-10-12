// APEX APP — Coach : Fiche Client (infos + TDEE)

const CoachClientEditPage = {
  client: null,
  activites: [],
  coachs: [],
  selectedTag: null,
  fiche: null,           // profil coaching (table fiche_coach, réservée aux coachs)
  semainesStudio: [],    // semaines cochées des séances au studio
  _topoTimer: null,

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="ceTitle">Fiche client</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#coach-clients'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
      </div>
      <div id="ceContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    // Reset état pour éviter les fuites entre clients
    this.client      = null;
    this.activites   = [];
    this.coachs      = [];
    this.selectedTag = null;
    this.fiche       = null;
    this.semainesStudio = [];

    const params = Router.getParams();
    if (!params.clientId) { window.location.hash = '#coach-clients'; return; }

    try {
      this.client = await db.getProfile(params.clientId);
      this.activites = await db.getActivites(params.clientId);
      this.coachs = await db.getCoachs().catch(() => []);
      [this.fiche, this.semainesStudio] = await Promise.all([
        db.getFicheCoach(params.clientId).catch(() => null),
        db.getSemainesStudioClient(params.clientId).catch(() => []),
      ]);
      this.selectedTag = this.client.coach_tag || null;
      document.getElementById('ceTitle').textContent = 'Infos — ' + (this.client.prenom || 'Client');
      this.renderForm();
    } catch (e) {
      document.getElementById('ceContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
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
    const sports = Object.keys(TDEE.METS);

    let html = `
      ${coachClientNav(c.id, 'coach-client-edit')}

      <div class="card">
        <div class="card-title">Informations</div>
        <div class="field">
          <label class="field-label">Coach référent</label>
          <select class="input" id="ceReferent">
            <option value="">— Aucun —</option>
            ${this.coachs.map(co => `<option value="${co.id}" ${c.coach_referent_id === co.id ? 'selected' : ''}>${escHtml(this._coachLabel(co))}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label class="field-label">Étiquette</label>
          <div style="display:flex;gap:8px;">
            <button type="button" id="tagBtnBen" class="tag-pill-btn ${this.selectedTag === 'ben' ? 'active-ben' : ''}" onclick="CoachClientEditPage.setTag('ben')">Ben</button>
            <button type="button" id="tagBtnChris" class="tag-pill-btn ${this.selectedTag === 'chris' ? 'active-chris' : ''}" onclick="CoachClientEditPage.setTag('chris')">Chris</button>
            <button type="button" id="tagBtnLola" class="tag-pill-btn ${this.selectedTag === 'lola' ? 'active-lola' : ''}" onclick="CoachClientEditPage.setTag('lola')">Lola</button>
          </div>
        </div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Type de client</label>
            <select class="input" id="ceTypeClient">
              <option value="suivi" ${c.type_client === 'suivi' ? 'selected' : ''}>Studio + suivi</option>
              <option value="distance" ${c.type_client === 'distance' ? 'selected' : ''}>Suivi à distance</option>
              <option value="studio" ${c.type_client === 'studio' ? 'selected' : ''}>Studio sans suivi</option>
            </select>
          </div>
          <div class="field"><label class="field-label">Téléphone</label><input class="input" type="tel" id="ceTelephone" value="${escHtml(c.telephone || '')}"></div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:12px;">
          <input type="checkbox" id="ceFactMixte" ${c.facturation_mixte ? 'checked' : ''}> Abonnement + séances à la consommation
        </label>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Sexe</label>
            <select class="input" id="ceSexe"><option value="homme" ${c.sexe === 'homme' ? 'selected' : ''}>Homme</option><option value="femme" ${c.sexe === 'femme' ? 'selected' : ''}>Femme</option></select>
          </div>
          <div class="field"><label class="field-label">Âge</label><input class="input" type="number" id="ceAge" value="${c.age || ''}"></div>
        </div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Poids actuel (kg)</label><input class="input" type="number" id="cePoids" value="${c.poids || ''}" step="0.1"></div>
          <div class="field"><label class="field-label">Taille (cm)</label><input class="input" type="number" id="ceTaille" value="${c.taille || ''}"></div>
        </div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Poids de départ (kg)</label><input class="input" type="number" id="cePoidsDepart" value="${c.poids_depart || ''}" step="0.1"></div>
          <div class="field"><label class="field-label">Poids objectif (kg)</label><input class="input" type="number" id="cePoidsObjectif" value="${c.poids_objectif || ''}" step="0.1"></div>
        </div>
      </div>

      <div class="card" id="ceProfil">${this._profilCoachHtml()}</div>
      ${this._studioHtml()}

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
        <div class="card-title">Objectif</div>
        <div class="field"><label class="field-label">Objectif</label>
          <select class="input" id="ceObjectif">${objectifs.map(o => `<option value="${o.v}" ${c.objectif === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}</select>
        </div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field">
            <label class="field-label">Semaine courante</label>
            <input class="input" type="number" id="ceSemaine" value="${clientCurrentWeek(c)}" min="1">
            <div style="font-size:11px;color:var(--gray-muted);margin-top:4px;">↻ S'incrémente automatiquement chaque lundi</div>
          </div>
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
      <div id="ceSaveMsg" style="margin-top:0.75rem;"></div>

      <div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--border);">
        ${c.actif === false ? `
          <div class="alert" style="background:var(--bg);margin-bottom:10px;font-size:13px;">Client inactif : il n'apparaît plus dans les listes ni sur le tableau de bord, et ne reçoit plus de rappels. Ses données sont conservées.</div>
          <button class="btn btn-secondary" style="width:100%;margin-bottom:10px;" onclick="CoachClientEditPage.changerActif(true)">↩︎ Réactiver ce client</button>` : `
          <button class="btn btn-secondary" style="width:100%;margin-bottom:10px;" onclick="CoachClientEditPage.changerActif(false)">💤 Client inactif (ne continue pas)</button>`}
        <button class="btn" style="background:var(--error-bg);color:var(--error);border:1.5px solid #FFCDD2;width:100%;" onclick="CoachClientEditPage.confirmDelete()">🗑️ Supprimer ce client</button>
      </div>`;

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

  // ── Profil coaching ────────────────────────────────────────────────────────

  _peutModifierProfil() {
    const me = Router.userProfile;
    return !!(me?.is_gerant || this.client?.coach_referent_id === me?.id);
  },

  _profilCoachHtml() {
    const f = this.fiche || {};
    const modif = this._peutModifierProfil();
    const criteres = [
      ['aime_discuter', 'Aime discuter'],
      ['technique', 'Technique'],
      ['style_pro', 'Bon copain (1) → Pro (3)'],
      ['energie', 'Douceur (1) → Énergique (3)'],
    ];
    return `
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;">
        <span>Profil coaching</span>
        <span id="ceProfilEtat" style="font-size:11px;font-weight:500;color:var(--gray-light);">visible des coachs uniquement</span>
      </div>
      ${criteres.map(([cle, label]) => `
        <div class="pc-ligne">
          <div class="pc-label">${label}</div>
          <div class="pc-pastilles">${[1, 2, 3].map(n => `
            <button class="pastille ${(f[cle] || 0) >= n ? 'on' : ''}" ${modif ? `onclick="CoachClientEditPage.noter('${cle}', ${n})"` : 'disabled'}
              title="${n}/3"></button>`).join('')}
            <span class="pc-note">${f[cle] || 0}/3</span>
          </div>
        </div>`).join('')}
      <div class="pc-ligne">
        <div class="pc-label">Tutoiement / vouvoiement</div>
        <div class="cp-lieu">
          <button class="${!f.vouvoiement ? 'on' : ''}" ${modif ? `onclick="CoachClientEditPage.majProfil({ vouvoiement: false })"` : 'disabled'}>Tutoiement</button>
          <button class="${f.vouvoiement ? 'on' : ''}" ${modif ? `onclick="CoachClientEditPage.majProfil({ vouvoiement: true })"` : 'disabled'}>Vouvoiement</button>
        </div>
      </div>
      <div class="field" style="margin-top:10px;margin-bottom:0;">
        <label class="field-label">Topo client</label>
        <textarea class="input" id="ceTopo" rows="4" style="height:auto;" placeholder="Ce qu'il faut savoir sur ce client…"
          ${modif ? 'oninput="CoachClientEditPage.saisirTopo()"' : 'disabled'}>${escHtml(f.topo || '')}</textarea>
      </div>
      ${modif ? '' : '<div style="font-size:11px;color:var(--gray-light);margin-top:6px;">Seuls le coach référent et les gérants peuvent modifier ce profil.</div>'}`;
  },

  noter(cle, n) {
    const actuel = this.fiche?.[cle] || 0;
    this.majProfil({ [cle]: actuel === n ? 0 : n });
  },

  saisirTopo() {
    clearTimeout(this._topoTimer);
    const etat = document.getElementById('ceProfilEtat');
    if (etat) etat.textContent = 'Enregistrement…';
    this._topoTimer = setTimeout(() => this.majProfil({ topo: document.getElementById('ceTopo').value.trim() || null }, false), 700);
  },

  async majProfil(champs, redessiner = true) {
    const avant = { ...(this.fiche || {}) };
    this.fiche = { ...avant, ...champs };
    if (redessiner) document.getElementById('ceProfil').innerHTML = this._profilCoachHtml();
    try {
      await db.saveFicheCoach(this.client.id, {
        aime_discuter: this.fiche.aime_discuter || 0,
        technique:     this.fiche.technique || 0,
        style_pro:     this.fiche.style_pro || 0,
        energie:       this.fiche.energie || 0,
        vouvoiement:   !!this.fiche.vouvoiement,
        topo:          this.fiche.topo ?? null,
      });
      const etat = document.getElementById('ceProfilEtat');
      if (etat) etat.textContent = '✓ Enregistré';
    } catch (e) {
      this.fiche = avant;
      if (redessiner) document.getElementById('ceProfil').innerHTML = this._profilCoachHtml();
      toast('Erreur : ' + e.message, 'error');
    }
  },

  // ── Séances au studio d'un coup d'œil (se remplit avec les cases « faite ») ──

  _studioHtml() {
    const c = this.client;
    const lignes = this.semainesStudio;
    if (c.type_client === 'distance' && !lignes.length) return '';

    const lundi = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); const j = x.getDay(); x.setDate(x.getDate() + (j === 0 ? -6 : 1 - j)); return x; };
    const dates = lignes.map(l => new Date(l.faite_le + 'T00:00:00'));
    const base = lundi(c.date_debut ? new Date(c.date_debut + 'T00:00:00') : (dates.length ? new Date(Math.min(...dates)) : new Date()));
    const semaineDe = d => Math.max(1, Math.floor((lundi(d) - base) / (7 * 864e5)) + 1);

    const parSeance = new Map();   // n° de séance → Map(semaine → date)
    for (const l of lignes) {
      const n = (l.client_prog_seances?.ordre ?? 0) + 1;
      if (!parSeance.has(n)) parSeance.set(n, new Map());
      const d = new Date(l.faite_le + 'T00:00:00');
      parSeance.get(n).set(semaineDe(d), d);
    }
    const numeros = [...new Set([1, 2, 3, ...parSeance.keys()])].sort((a, b) => a - b);
    const maxSem = Math.max(50, ...[...parSeance.values()].flatMap(m => [...m.keys()]));
    const colonnes = Array.from({ length: maxSem }, (_, i) => i + 1);
    const total = lignes.length;

    return `
      <div class="card">
        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;">
          <span>Séances au studio</span>
          <span style="font-size:11px;font-weight:500;color:var(--gray-light);">${total} faite${total > 1 ? 's' : ''} · semaine 1 = ${base.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <div style="overflow-x:auto;">
          <table class="st-table">
            <tr><th></th>${colonnes.map(k => `<th>${k}</th>`).join('')}</tr>
            ${numeros.map(n => `
              <tr><th class="st-seance">Séance ${n}</th>${colonnes.map(k => {
                const d = parSeance.get(n)?.get(k);
                return `<td><span class="st-case ${d ? 'on' : ''}" ${d ? `title="${d.toLocaleDateString('fr-FR')}"` : ''}></span></td>`;
              }).join('')}</tr>`).join('')}
          </table>
        </div>
        <div style="font-size:11px;color:var(--gray-light);margin-top:6px;">Se coche tout seul quand un coach coche « faite » dans la grille d'une séance au studio.</div>
      </div>`;
  },

  async changerActif(actif) {
    const prenom = this.client.prenom || 'ce client';
    if (!actif && !confirm(`Passer ${prenom} en client inactif ?\n\nIl disparaît des listes, du tableau de bord et de l'agenda, ses bilans automatiques sont arrêtés et il ne reçoit plus de rappels. Toutes ses données sont conservées, et tu pourras le réactiver.`)) return;
    try {
      await db.setClientActif(this.client.id, actif);
      this.client.actif = actif;
      _ficheClients.delete(this.client.id);
      this.renderForm();
      toast(actif ? `${prenom} est de nouveau actif. Pense à relancer ses bilans si besoin.` : `${prenom} est inactif`, 'success');
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  },

  _coachLabel(co) {
    const nom = `${co.prenom || ''} ${co.nom || ''}`.trim() || co.email;
    return co.is_gerant ? `${nom} (gérant)` : nom;
  },

  setTag(tag) {
    this.selectedTag = (this.selectedTag === tag) ? null : tag;
    document.getElementById('tagBtnBen').className = 'tag-pill-btn' + (this.selectedTag === 'ben' ? ' active-ben' : '');
    document.getElementById('tagBtnChris').className = 'tag-pill-btn' + (this.selectedTag === 'chris' ? ' active-chris' : '');
    document.getElementById('tagBtnLola').className = 'tag-pill-btn' + (this.selectedTag === 'lola' ? ' active-lola' : '');
  },

  async confirmDelete() {
    const prenom = this.client.prenom || 'ce client';
    if (!confirm(`Supprimer ${prenom} ? Cette action est irréversible.`)) return;
    try {
      await db.deleteClient(this.client.id);
      window.location.hash = '#coach-clients';
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
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
      toast('Remplis au minimum l\'âge, le poids et la taille.', 'error'); return;
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
    // Champ "Semaine courante" vide → conserver la valeur existante (ne pas
    // réinitialiser à 1 ni recalculer date_debut). #44
    const semRaw = document.getElementById('ceSemaine').value.trim();
    const semaine = semRaw !== '' ? (parseInt(semRaw) || this.client.semaine_courante || 1)
                                  : (this.client.semaine_courante || 1);
    const updates = {
      sexe: document.getElementById('ceSexe').value,
      age: +document.getElementById('ceAge').value || null,
      poids: +document.getElementById('cePoids').value || null,
      taille: +document.getElementById('ceTaille').value || null,
      poids_depart: +document.getElementById('cePoidsDepart').value || null,
      poids_objectif: +document.getElementById('cePoidsObjectif').value || null,
      type_metier: document.getElementById('ceMetier').value,
      pas_par_jour: +document.getElementById('cePas').value || 5000,
      objectif: document.getElementById('ceObjectif').value,
      semaine_courante: semaine,
      date_debut: (() => {
        // Rétro-calculer date_debut depuis le lundi de la semaine courante
        const today = new Date();
        const dow = today.getDay();
        const mondayOffset = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);
        const debut = new Date(monday.getTime() - (semaine - 1) * 7 * 24 * 3600 * 1000);
        return formatDate(debut);
      })(),
      masse_grasse_pct: +document.getElementById('ceFat').value || null,
      coach_tag: this.selectedTag,
      type_client: document.getElementById('ceTypeClient').value,
      telephone: document.getElementById('ceTelephone').value.trim() || null,
      facturation_mixte: document.getElementById('ceFactMixte').checked
    };
    // Liste des coachs non chargée → ne pas toucher au référent
    if (this.coachs.length) {
      updates.coach_referent_id = document.getElementById('ceReferent').value || null;
    }

    // Calcul TDEE si possible
    let tdeeResult = null;
    if (updates.age && updates.poids && updates.taille) {
      tdeeResult = TDEE.calculate(updates, this.activites);
      updates.bmr  = tdeeResult.bmr;
      updates.neat = tdeeResult.neat;
      updates.eat  = tdeeResult.eat;
      updates.tdee = tdeeResult.tdee;
    }

    try {
      await db.updateProfile(id, updates);
      _ficheClients.delete(id);   // les onglets relisent le référent et le type
      await db.setActivites(id, this.activites);

      // Mettre à jour les macros du plan actif si TDEE calculé
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

      document.getElementById('ceSaveMsg').innerHTML = `<div class="alert alert-success">✅ Client mis à jour${planMsg}</div>`;
      setTimeout(() => { document.getElementById('ceSaveMsg').innerHTML = ''; }, 4000);
    } catch (e) {
      document.getElementById('ceSaveMsg').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  }
};
