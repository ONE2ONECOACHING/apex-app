// APEX APP — Coach : Agenda (vues jour et semaine, rendez-vous, indisponibilités)

const AGENDA_HEURE_DEBUT = 5;   // 5h
const AGENDA_HEURE_FIN   = 21;  // 21h
const AGENDA_PAS_MIN     = 15;  // pas de la grille, en minutes
const AGENDA_PX_PAS      = 14;  // hauteur d'un pas, en pixels
const AGENDA_COULEURS    = ['#2563EB', '#DB2777', '#059669', '#D97706', '#7C3AED', '#0891B2', '#DC2626', '#4B5563'];
const AGENDA_JOURS       = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const CoachAgendaPage = {
  vue: 'semaine',        // 'semaine' | 'jour'
  date: null,            // jour affiché (vue jour) ou un jour de la semaine affichée
  coachs: [],
  clients: [],
  creneaux: [],
  visibles: new Set(),   // coachs dont l'agenda est affiché
  _edit: null,           // créneau en cours de création / modification

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title">Agenda</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#coach-clients'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
      <div id="agToolbar"></div>
      <div id="agContent"><div class="spinner" style="margin-top:2rem;"></div></div>
      <div id="agModal"></div>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile || profile.role !== 'coach') { window.location.hash = '#coach-clients'; return; }

    this.creneaux = [];
    this._edit    = null;
    if (!this.date) this.date = this._debutJour(new Date());

    try {
      [this.coachs, this.clients] = await Promise.all([db.getCoachs(), db.getClientsAgenda()]);
      this._chargerVisibles();
      this._renderToolbar();
      await this._charger();
    } catch (e) {
      document.getElementById('agContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  // ── Dates ────────────────────────────────────────────────────────────────

  _debutJour(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; },

  _lundi(d) {
    const x = this._debutJour(d);
    const day = x.getDay();
    x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
    return x;
  },

  _ajouterJours(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; },

  _ymd(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  _hm(d) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; },

  // Date locale à partir de « AAAA-MM-JJ » et de minutes depuis minuit
  _dateLocale(ymd, minutes) {
    const [y, m, j] = ymd.split('-').map(Number);
    return new Date(y, m - 1, j, Math.floor(minutes / 60), minutes % 60);
  },

  _jours() {
    if (this.vue === 'jour') return [this.date];
    const lundi = this._lundi(this.date);
    return Array.from({ length: 7 }, (_, i) => this._ajouterJours(lundi, i));
  },

  // ── Coachs affichés (mémorisés dans le navigateur) ───────────────────────

  _chargerVisibles() {
    let ids = null;
    try { ids = JSON.parse(localStorage.getItem('agenda_coachs_visibles') || 'null'); } catch (_) {}
    const existants = new Set(this.coachs.map(c => c.id));
    this.visibles = new Set((ids || this.coachs.map(c => c.id)).filter(id => existants.has(id)));
    if (this.visibles.size === 0) this.visibles = new Set(this.coachs.map(c => c.id));
  },

  _sauverVisibles() {
    try { localStorage.setItem('agenda_coachs_visibles', JSON.stringify([...this.visibles])); } catch (_) {}
  },

  toggleCoach(id) {
    if (this.visibles.has(id)) this.visibles.delete(id); else this.visibles.add(id);
    this._sauverVisibles();
    this._renderToolbar();
    this._renderGrille();
  },

  _couleur(coachId) {
    const i = this.coachs.findIndex(c => c.id === coachId);
    return AGENDA_COULEURS[(i < 0 ? 0 : i) % AGENDA_COULEURS.length];
  },

  _nomCoach(id) {
    const co = this.coachs.find(c => c.id === id);
    return co ? (`${co.prenom || ''} ${co.nom || ''}`.trim() || co.email) : '?';
  },

  _nomClient(id) {
    const cl = this.clients.find(c => c.id === id);
    return cl ? `${cl.prenom || ''} ${cl.nom || ''}`.trim() : 'Client';
  },

  // ── Navigation ───────────────────────────────────────────────────────────

  setVue(vue) { this.vue = vue; this._renderToolbar(); this._charger(); },

  aujourdhui() { this.date = this._debutJour(new Date()); this._renderToolbar(); this._charger(); },

  decaler(sens) {
    this.date = this._ajouterJours(this.date, sens * (this.vue === 'jour' ? 1 : 7));
    this._renderToolbar();
    this._charger();
  },

  _renderToolbar() {
    const jours = this._jours();
    const fmt = { day: 'numeric', month: 'long' };
    const label = this.vue === 'jour'
      ? this.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : `${jours[0].toLocaleDateString('fr-FR', fmt)} – ${jours[6].toLocaleDateString('fr-FR', fmt)} ${jours[6].getFullYear()}`;

    const chips = this.coachs.map(co => {
      const on = this.visibles.has(co.id);
      const coul = this._couleur(co.id);
      return `<button class="ag-chip ${on ? 'on' : ''}" style="--c:${coul}" onclick="CoachAgendaPage.toggleCoach('${co.id}')">
        <span class="ag-chip-dot"></span>${escHtml(this._nomCoach(co.id))}</button>`;
    }).join('');

    document.getElementById('agToolbar').innerHTML = `
      <div class="ag-toolbar">
        <div class="ag-nav">
          <button class="date-nav-btn" onclick="CoachAgendaPage.decaler(-1)">‹</button>
          <button class="btn btn-secondary btn-small" onclick="CoachAgendaPage.aujourdhui()">Aujourd'hui</button>
          <button class="date-nav-btn" onclick="CoachAgendaPage.decaler(1)">›</button>
          <div class="ag-label">${escHtml(label)}</div>
        </div>
        <div class="ag-nav">
          <div class="ag-switch">
            <button class="${this.vue === 'jour' ? 'on' : ''}" onclick="CoachAgendaPage.setVue('jour')">Jour</button>
            <button class="${this.vue === 'semaine' ? 'on' : ''}" onclick="CoachAgendaPage.setVue('semaine')">Semaine</button>
          </div>
          <button class="btn btn-primary btn-small" onclick="CoachAgendaPage.nouveau()">+ Rendez-vous</button>
        </div>
      </div>
      <div class="ag-chips">${chips}</div>`;
  },

  // ── Chargement et grille ─────────────────────────────────────────────────

  async _charger() {
    const jours = this._jours();
    const debut = jours[0];
    const fin   = this._ajouterJours(jours[jours.length - 1], 1);
    try {
      this.creneaux = await db.getCreneaux(debut.toISOString(), fin.toISOString());
      this._renderGrille();
    } catch (e) {
      document.getElementById('agContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  // Colonnes : un jour par colonne (semaine) ou un coach par colonne (jour)
  _colonnes() {
    if (this.vue === 'semaine') {
      return this._jours().map(j => ({
        date: j,
        titre: `${AGENDA_JOURS[(j.getDay() + 6) % 7]} ${j.getDate()}`,
        coachId: null,
      }));
    }
    return this.coachs.filter(c => this.visibles.has(c.id)).map(c => ({
      date: this.date,
      titre: this._nomCoach(c.id),
      coachId: c.id,
    }));
  },

  _creneauxColonne(col) {
    const debut = col.date.getTime();
    const fin   = this._ajouterJours(col.date, 1).getTime();
    return this.creneaux.filter(c => {
      if (!this.visibles.has(c.coach_id)) return false;
      if (col.coachId && c.coach_id !== col.coachId) return false;
      return new Date(c.debut).getTime() < fin && new Date(c.fin).getTime() > debut;
    });
  },

  // Répartit les créneaux qui se chevauchent sur plusieurs « couloirs »
  _couloirs(items) {
    const tries = [...items].sort((a, b) => new Date(a.debut) - new Date(b.debut));
    const groupes = [];
    let groupe = [], finGroupe = 0;
    for (const c of tries) {
      const d = new Date(c.debut).getTime(), f = new Date(c.fin).getTime();
      if (groupe.length && d >= finGroupe) { groupes.push(groupe); groupe = []; finGroupe = 0; }
      groupe.push(c);
      finGroupe = Math.max(finGroupe, f);
    }
    if (groupe.length) groupes.push(groupe);

    const places = new Map();
    for (const g of groupes) {
      const finsCouloirs = [];
      for (const c of g) {
        const d = new Date(c.debut).getTime();
        let k = finsCouloirs.findIndex(f => f <= d);
        if (k < 0) { k = finsCouloirs.length; finsCouloirs.push(0); }
        finsCouloirs[k] = new Date(c.fin).getTime();
        places.set(c.id, { couloir: k, total: 0 });
      }
      for (const c of g) places.get(c.id).total = finsCouloirs.length;
    }
    return places;
  },

  _renderGrille() {
    const el = document.getElementById('agContent');
    const cols = this._colonnes();
    if (cols.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-text">Sélectionne au moins un coach ci-dessus.</div></div>';
      return;
    }

    const nbPas   = (AGENDA_HEURE_FIN - AGENDA_HEURE_DEBUT) * 60 / AGENDA_PAS_MIN;
    const hauteur = nbPas * AGENDA_PX_PAS;
    const pxMin   = AGENDA_PX_PAS / AGENDA_PAS_MIN;
    const today   = this._ymd(new Date());

    let heures = '';
    for (let h = AGENDA_HEURE_DEBUT; h < AGENDA_HEURE_FIN; h++) {
      heures += `<div class="ag-heure" style="top:${(h - AGENDA_HEURE_DEBUT) * 60 * pxMin}px">${h}h</div>`;
    }

    const colonnesHtml = cols.map((col, i) => {
      const items = this._creneauxColonne(col);
      const journee = items.filter(c => c.journee_entiere);
      const horaires = items.filter(c => !c.journee_entiere);
      const places = this._couloirs(horaires);
      const debutGrille = this._dateLocale(this._ymd(col.date), AGENDA_HEURE_DEBUT * 60).getTime();
      const finGrille   = this._dateLocale(this._ymd(col.date), AGENDA_HEURE_FIN * 60).getTime();

      const blocs = horaires.map(c => {
        const d = Math.max(new Date(c.debut).getTime(), debutGrille);
        const f = Math.min(new Date(c.fin).getTime(), finGrille);
        if (f <= d) return '';
        const top = (d - debutGrille) / 60000 * pxMin;
        const h   = Math.max((f - d) / 60000 * pxMin, AGENDA_PX_PAS);
        const p   = places.get(c.id);
        const largeur = 100 / p.total;
        const indispo = c.type === 'indispo';
        const titre = indispo ? 'Indisponible' : this._nomClient(c.client_id);
        const heure = `${this._hm(new Date(c.debut))}–${this._hm(new Date(c.fin))}`;
        return `<div class="ag-bloc ${indispo ? 'indispo' : ''}" style="top:${top}px;height:${h - 2}px;left:${p.couloir * largeur}%;width:calc(${largeur}% - 3px);--c:${this._couleur(c.coach_id)}"
                  onclick="event.stopPropagation();CoachAgendaPage.ouvrir('${c.id}')" title="${escHtml(titre + ' · ' + heure)}">
          <div class="ag-bloc-titre">${escHtml(titre)}${c.serie_id ? ' ↻' : ''}${c.en_plus ? ' · en plus' : ''}</div>
          <div class="ag-bloc-sub">${heure}${this.vue === 'semaine' ? ' · ' + escHtml(this._nomCoach(c.coach_id)) : ''}</div>
        </div>`;
      }).join('');

      const bandeau = journee.map(c => `
        <div class="ag-journee" style="--c:${this._couleur(c.coach_id)}" onclick="CoachAgendaPage.ouvrir('${c.id}')">
          Indisponible${this.vue === 'semaine' ? ' · ' + escHtml(this._nomCoach(c.coach_id)) : ''}
        </div>`).join('');

      return `
        <div class="ag-col">
          <div class="ag-col-titre ${this.vue === 'semaine' && this._ymd(col.date) === today ? 'today' : ''}">${escHtml(col.titre)}</div>
          <div class="ag-col-journee">${bandeau}</div>
          <div class="ag-col-corps" style="height:${hauteur}px" onclick="CoachAgendaPage.clicGrille(event, ${i})">${blocs}</div>
        </div>`;
    }).join('');

    el.innerHTML = `
      <div class="ag-grille">
        <div class="ag-heures">
          <div class="ag-col-titre">&nbsp;</div>
          <div class="ag-col-journee"></div>
          <div style="position:relative;height:${hauteur}px">${heures}</div>
        </div>
        <div class="ag-cols" style="--pas:${AGENDA_PX_PAS}px;--heure:${60 * pxMin}px">${colonnesHtml}</div>
      </div>`;
  },

  // Clic sur une case vide : nouveau rendez-vous à cette heure
  clicGrille(event, iCol) {
    const col = this._colonnes()[iCol];
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const pas = Math.floor(y / AGENDA_PX_PAS);
    const minutes = AGENDA_HEURE_DEBUT * 60 + pas * AGENDA_PAS_MIN;
    this.nouveau(this._ymd(col.date), minutes, col.coachId);
  },

  // ── Fenêtre rendez-vous ──────────────────────────────────────────────────

  nouveau(ymd, minutes, coachId) {
    const me = Router.userProfile.id;
    const maintenant = new Date();
    let m = minutes;
    if (m == null) {
      m = Math.ceil((maintenant.getHours() * 60 + maintenant.getMinutes()) / AGENDA_PAS_MIN) * AGENDA_PAS_MIN;
      m = Math.min(Math.max(m, AGENDA_HEURE_DEBUT * 60), AGENDA_HEURE_FIN * 60 - 60);
    }
    const jour = ymd || this._ymd(this.vue === 'jour' ? this.date : maintenant);
    const finSerie = new Date(this._dateLocale(jour, 0));
    finSerie.setMonth(finSerie.getMonth() + 3);
    this._edit = {
      id: null, type: 'coaching', client_id: null,
      coach_id: coachId || (this.coachs.some(c => c.id === me) ? me : this.coachs[0]?.id),
      jour, minutes: m, duree: 60, journee_entiere: false, en_plus: false, notes: '',
      serie_id: null, recurrence: false, fin_serie: this._ymd(finSerie),
    };
    this._renderModal();
  },

  ouvrir(id) {
    const c = this.creneaux.find(x => x.id === id);
    if (!c) return;
    const d = new Date(c.debut), f = new Date(c.fin);
    this._edit = {
      id: c.id, type: c.type, client_id: c.client_id, coach_id: c.coach_id,
      jour: this._ymd(d), minutes: d.getHours() * 60 + d.getMinutes(),
      duree: Math.round((f - d) / 60000), journee_entiere: c.journee_entiere,
      en_plus: c.en_plus, notes: c.notes || '', serie_id: c.serie_id,
      recurrence: false, fin_serie: null,
    };
    this._renderModal();
  },

  fermer() { this._edit = null; document.getElementById('agModal').innerHTML = ''; },

  _optionsHeures(sel) {
    let html = '';
    for (let m = AGENDA_HEURE_DEBUT * 60; m < AGENDA_HEURE_FIN * 60; m += AGENDA_PAS_MIN) {
      const label = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      html += `<option value="${m}" ${m === sel ? 'selected' : ''}>${label}</option>`;
    }
    return html;
  },

  _optionsDurees(sel) {
    let html = '';
    for (let d = 15; d <= 240; d += 15) {
      const label = d < 60 ? `${d} min` : `${Math.floor(d / 60)} h${d % 60 ? String(d % 60).padStart(2, '0') : ''}`;
      html += `<option value="${d}" ${d === sel ? 'selected' : ''}>${label}</option>`;
    }
    if (sel && (sel % 15 || sel > 240)) html += `<option value="${sel}" selected>${sel} min</option>`;
    return html;
  },

  // Recopie les champs de la fenêtre dans this._edit (avant un nouveau rendu)
  _lireForm() {
    const e = this._edit;
    const v = id => document.getElementById(id);
    if (!e || !v('agType')) return;
    e.type = v('agType').value;
    e.coach_id = v('agCoach').value;
    e.jour = v('agJour').value;
    e.minutes = parseInt(v('agHeure').value);
    e.duree = parseInt(v('agDuree').value);
    e.journee_entiere = e.type === 'indispo' && !!v('agJournee')?.checked;
    e.notes = v('agNotes').value;
    if (v('agEnPlus')) e.en_plus = v('agEnPlus').value === 'plus';
    if (v('agRecurrence')) {
      e.recurrence = v('agRecurrence').checked;
      e.fin_serie = v('agFinSerie').value;
    }
  },

  changerChamp() { this._lireForm(); this._renderModal(); },

  _renderModal() {
    const e = this._edit;
    if (!e) return;
    const client = this.clients.find(c => c.id === e.client_id);
    const indispo = e.type === 'indispo';

    document.getElementById('agModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)CoachAgendaPage.fermer()">
        <div class="modal">
          <div class="modal-title">${e.id ? 'Rendez-vous' : 'Nouveau rendez-vous'}
            <button class="modal-close" onclick="CoachAgendaPage.fermer()">×</button>
          </div>

          <div class="field">
            <label class="field-label">Type</label>
            <select class="input" id="agType" onchange="CoachAgendaPage.changerChamp()">
              <option value="coaching" ${!indispo ? 'selected' : ''}>Coaching</option>
              <option value="indispo" ${indispo ? 'selected' : ''}>Indisponibilité</option>
            </select>
          </div>

          ${indispo ? '' : `
          <div class="field">
            <label class="field-label">Client</label>
            ${client ? `
              <div style="display:flex;gap:8px;align-items:center;">
                <div class="input" style="flex:1;display:flex;align-items:center;">${escHtml(this._nomClient(client.id))}${client.type_client === 'studio' ? ' <span style="font-size:11px;color:var(--gray-light);margin-left:6px;">studio</span>' : ''}</div>
                <button class="btn btn-secondary btn-small" onclick="CoachAgendaPage.changerClient()">Changer</button>
                <button class="btn btn-secondary btn-small" onclick="CoachAgendaPage.ouvrirFiche('${client.id}')">Fiche</button>
              </div>` : `
              <input class="input" id="agClientSearch" placeholder="Chercher un client…" oninput="CoachAgendaPage.chercherClient(this.value)" autocomplete="off">
              <div id="agClientResults" class="ag-results"></div>
              <button class="btn btn-ghost btn-small" style="margin-top:6px;" onclick="CoachAgendaPage.formStudio()">+ Nouveau client studio</button>
              <div id="agStudioForm"></div>`}
          </div>`}

          <div class="field">
            <label class="field-label">Coach</label>
            <select class="input" id="agCoach">
              ${this.coachs.map(co => `<option value="${co.id}" ${co.id === e.coach_id ? 'selected' : ''}>${escHtml(this._nomCoach(co.id))}</option>`).join('')}
            </select>
          </div>

          <div class="field-row" style="display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:10px;">
            <div class="field"><label class="field-label">Date</label><input class="input" type="date" id="agJour" value="${e.jour}"></div>
            <div class="field"><label class="field-label">Heure</label><select class="input" id="agHeure" ${e.journee_entiere ? 'disabled' : ''}>${this._optionsHeures(e.minutes)}</select></div>
            <div class="field"><label class="field-label">Durée</label><select class="input" id="agDuree" ${e.journee_entiere ? 'disabled' : ''}>${this._optionsDurees(e.duree)}</select></div>
          </div>

          ${indispo ? `
          <label class="ag-check"><input type="checkbox" id="agJournee" ${e.journee_entiere ? 'checked' : ''} onchange="CoachAgendaPage.changerChamp()"> Journée entière</label>` : ''}

          ${!indispo && client?.facturation_mixte ? `
          <div class="field">
            <label class="field-label">Facturation</label>
            <select class="input" id="agEnPlus">
              <option value="inclus" ${!e.en_plus ? 'selected' : ''}>Inclus dans l'abonnement</option>
              <option value="plus" ${e.en_plus ? 'selected' : ''}>En plus (à la consommation)</option>
            </select>
          </div>` : ''}

          ${!e.id ? `
          <label class="ag-check"><input type="checkbox" id="agRecurrence" ${e.recurrence ? 'checked' : ''} onchange="CoachAgendaPage.changerChamp()"> Chaque semaine</label>
          <div class="field" style="${e.recurrence ? '' : 'display:none;'}">
            <label class="field-label">Jusqu'au</label>
            <input class="input" type="date" id="agFinSerie" value="${e.fin_serie || ''}">
          </div>` : ''}

          <div class="field">
            <label class="field-label">Notes</label>
            <textarea class="input" id="agNotes" rows="2" style="height:auto;">${escHtml(e.notes)}</textarea>
          </div>

          <div id="agError"></div>
          <button class="btn btn-primary" style="width:100%;margin-bottom:0.5rem;" id="agSaveBtn" onclick="CoachAgendaPage.enregistrer()">Enregistrer</button>
          ${e.id ? `
            ${e.serie_id ? `<button class="btn btn-secondary" style="width:100%;margin-bottom:0.5rem;" onclick="CoachAgendaPage.prolonger()">Prolonger la série</button>` : ''}
            <button class="btn" style="background:var(--error-bg);color:var(--error);border:1.5px solid #FFCDD2;width:100%;" onclick="CoachAgendaPage.demanderSuppression()">Supprimer</button>` : ''}
        </div>
      </div>`;
  },

  chercherClient(q) {
    const box = document.getElementById('agClientResults');
    const s = q.trim().toLowerCase();
    if (!s) { box.innerHTML = ''; return; }
    const res = this.clients.filter(c => `${c.prenom || ''} ${c.nom || ''}`.toLowerCase().includes(s)).slice(0, 8);
    box.innerHTML = res.length
      ? res.map(c => `<div class="ag-result" onclick="CoachAgendaPage.choisirClient('${c.id}')">${escHtml(this._nomClient(c.id))}${c.type_client === 'studio' ? ' <span style="font-size:11px;color:var(--gray-light);">studio</span>' : ''}</div>`).join('')
      : '<div class="ag-result" style="color:var(--gray-light);cursor:default;">Aucun client trouvé</div>';
  },

  choisirClient(id) { this._lireForm(); this._edit.client_id = id; this._edit.en_plus = false; this._renderModal(); },

  changerClient() { this._lireForm(); this._edit.client_id = null; this._renderModal(); },

  ouvrirFiche(id) { this.fermer(); Router.navigate('coach-client-edit', { clientId: id }); },

  formStudio() {
    document.getElementById('agStudioForm').innerHTML = `
      <div class="ag-studio">
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <input class="input" id="agStPrenom" placeholder="Prénom">
          <input class="input" id="agStNom" placeholder="Nom">
        </div>
        <input class="input" id="agStTel" placeholder="Téléphone" style="margin-top:8px;">
        <input class="input" id="agStEmail" type="email" placeholder="Email (facultatif)" style="margin-top:8px;">
        <div id="agStError"></div>
        <button class="btn btn-secondary btn-small" style="margin-top:8px;width:100%;" id="agStBtn" onclick="CoachAgendaPage.creerStudio()">Créer le client studio</button>
      </div>`;
  },

  async creerStudio() {
    const prenom = document.getElementById('agStPrenom').value.trim();
    const nom = document.getElementById('agStNom').value.trim();
    const telephone = document.getElementById('agStTel').value.trim();
    const email = document.getElementById('agStEmail').value.trim();
    const errEl = document.getElementById('agStError');
    const btn = document.getElementById('agStBtn');
    if (!prenom) { errEl.innerHTML = '<div class="alert alert-error">Prénom requis.</div>'; return; }
    btn.disabled = true;
    btn.textContent = 'Création…';
    try {
      this._lireForm();
      const { profileId } = await db.createStudioClient({ prenom, nom, telephone, email });
      this.clients = await db.getClientsAgenda();
      this._edit.client_id = profileId;
      this._renderModal();
    } catch (e) {
      errEl.innerHTML = `<div class="alert alert-error">${escHtml(e.message)}</div>`;
      btn.disabled = false;
      btn.textContent = 'Créer le client studio';
    }
  },

  // ── Enregistrement ───────────────────────────────────────────────────────

  // Début et fin d'un créneau pour un jour donné
  _bornes(ymd, e) {
    if (e.journee_entiere) {
      const d = this._dateLocale(ymd, 0);
      return { debut: d, fin: this._ajouterJours(d, 1) };
    }
    const d = this._dateLocale(ymd, e.minutes);
    return { debut: d, fin: new Date(d.getTime() + e.duree * 60000) };
  },

  _ligne(e, ymd, serieId) {
    const { debut, fin } = this._bornes(ymd, e);
    return {
      type: e.type,
      coach_id: e.coach_id,
      client_id: e.type === 'coaching' ? e.client_id : null,
      debut: debut.toISOString(),
      fin: fin.toISOString(),
      journee_entiere: e.journee_entiere,
      en_plus: e.type === 'coaching' && e.en_plus,
      notes: e.notes.trim() || null,
      serie_id: serieId,
    };
  },

  // Jours d'une récurrence hebdomadaire, du jour donné jusqu'à la date de fin incluse
  _joursSerie(ymdDebut, ymdFin) {
    const jours = [];
    let d = this._dateLocale(ymdDebut, 0);
    const fin = this._dateLocale(ymdFin, 0);
    while (d <= fin && jours.length < 200) {
      jours.push(this._ymd(d));
      d = this._ajouterJours(d, 7);
    }
    return jours;
  },

  async enregistrer() {
    this._lireForm();
    const e = this._edit;
    const errEl = document.getElementById('agError');
    errEl.innerHTML = '';
    if (e.type === 'coaching' && !e.client_id) { errEl.innerHTML = '<div class="alert alert-error">Choisis un client.</div>'; return; }
    if (!e.jour) { errEl.innerHTML = '<div class="alert alert-error">Choisis une date.</div>'; return; }
    if (e.recurrence && (!e.fin_serie || e.fin_serie < e.jour)) {
      errEl.innerHTML = '<div class="alert alert-error">La date de fin de la récurrence doit être après la date du rendez-vous.</div>';
      return;
    }

    const btn = document.getElementById('agSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Enregistrement…';
    try {
      if (e.id) {
        const { serie_id, ...patch } = this._ligne(e, e.jour, e.serie_id);
        await db.updateCreneau(e.id, patch);
      } else if (e.recurrence) {
        const serieId = crypto.randomUUID();
        await db.insertCreneaux(this._joursSerie(e.jour, e.fin_serie).map(j => this._ligne(e, j, serieId)));
      } else {
        await db.insertCreneaux([this._ligne(e, e.jour, null)]);
      }
      this.fermer();
      await this._charger();
      toast('Enregistré', 'success');
    } catch (err) {
      errEl.innerHTML = `<div class="alert alert-error">${escHtml(err.message)}</div>`;
      btn.disabled = false;
      btn.textContent = 'Enregistrer';
    }
  },

  async prolonger() {
    const e = this._edit;
    const dernier = await db.getDernierCreneauSerie(e.serie_id).catch(() => null);
    if (!dernier) return;
    const dDernier = new Date(dernier.debut);
    const proposition = new Date(dDernier);
    proposition.setMonth(proposition.getMonth() + 3);
    const fin = prompt(`Dernière séance de la série : ${dDernier.toLocaleDateString('fr-FR')}.\nProlonger jusqu'au (AAAA-MM-JJ) :`, this._ymd(proposition));
    if (!fin || !/^\d{4}-\d{2}-\d{2}$/.test(fin)) return;

    const jours = this._joursSerie(this._ymd(this._ajouterJours(dDernier, 7)), fin);
    if (!jours.length) { toast('Aucune nouvelle séance à ajouter', 'info'); return; }
    const d = new Date(dernier.debut), f = new Date(dernier.fin);
    const modele = {
      type: dernier.type, coach_id: dernier.coach_id, client_id: dernier.client_id,
      minutes: d.getHours() * 60 + d.getMinutes(), duree: Math.round((f - d) / 60000),
      journee_entiere: dernier.journee_entiere, en_plus: dernier.en_plus, notes: dernier.notes || '',
    };
    try {
      await db.insertCreneaux(jours.map(j => this._ligne(modele, j, dernier.serie_id)));
      this.fermer();
      await this._charger();
      toast(`${jours.length} séance${jours.length > 1 ? 's' : ''} ajoutée${jours.length > 1 ? 's' : ''}`, 'success');
    } catch (err) {
      document.getElementById('agError').innerHTML = `<div class="alert alert-error">${escHtml(err.message)}</div>`;
    }
  },

  // ── Suppression (tracée par la base) ─────────────────────────────────────

  demanderSuppression() {
    const e = this._edit;
    const c = this.creneaux.find(x => x.id === e.id);
    if (!c) return;
    const label = c.type === 'indispo' ? 'cette indisponibilité' : `le rendez-vous de ${escHtml(this._nomClient(c.client_id))}`;
    document.getElementById('agModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)CoachAgendaPage.fermer()">
        <div class="modal">
          <div class="modal-title">Supprimer ${label} ?
            <button class="modal-close" onclick="CoachAgendaPage.fermer()">×</button>
          </div>
          <div style="font-size:14px;margin-bottom:1rem;line-height:1.5;">
            ${new Date(c.debut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${this._hm(new Date(c.debut))}.
            ${c.type === 'coaching' ? 'Un créneau supprimé n\'est pas facturé. La suppression est enregistrée (qui, quand).' : ''}
          </div>
          <div id="agError"></div>
          <button class="btn" style="background:var(--error-bg);color:var(--error);border:1.5px solid #FFCDD2;width:100%;margin-bottom:0.5rem;"
            onclick="CoachAgendaPage.supprimer(false)">${c.serie_id ? 'Ce créneau seulement' : 'Supprimer'}</button>
          ${c.serie_id ? `<button class="btn" style="background:var(--error-bg);color:var(--error);border:1.5px solid #FFCDD2;width:100%;margin-bottom:0.5rem;"
            onclick="CoachAgendaPage.supprimer(true)">Ce créneau et les suivants</button>` : ''}
          <button class="btn btn-secondary" style="width:100%;" onclick="CoachAgendaPage.fermer()">Annuler</button>
        </div>
      </div>`;
  },

  async supprimer(suivants) {
    const c = this.creneaux.find(x => x.id === this._edit?.id);
    if (!c) return;
    try {
      if (suivants) await db.deleteSerieDepuis(c.serie_id, c.debut);
      else await db.deleteCreneau(c.id);
      this.fermer();
      await this._charger();
      toast('Supprimé', 'success');
    } catch (err) {
      document.getElementById('agError').innerHTML = `<div class="alert alert-error">${escHtml(err.message)}</div>`;
    }
  }
};
