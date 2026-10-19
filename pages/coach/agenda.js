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
  _drag: null,           // glisser-déposer en cours (déplacement ou durée)
  _fantome: null,        // aperçu du créneau pendant le glisser-déposer
  _ignorerClic: false,   // le clic qui suit un glisser-déposer n'ouvre rien
  _anim: 0,              // sens du prochain changement de période (-1, 0, 1) pour l'animation
  _mobile: false,        // écran de téléphone : mise en page inspirée de Google Agenda
  _coachsOuverts: false, // téléphone : liste des coachs à afficher dépliée
  _ecouteEcran: false,

  _estMobile() { return window.matchMedia('(max-width: 700px)').matches; },

  _px() { return this._mobile ? 16 : AGENDA_PX_PAS; },

  render() {
    document.body.classList.add('coach-wide');
    this._mobile = this._estMobile();
    if (this._mobile) {
      return `
      <div id="agToolbar"></div>
      <div id="agContent"><div class="spinner" style="margin-top:2rem;"></div></div>
      <button class="ag-fab" aria-label="Nouveau rendez-vous" onclick="CoachAgendaPage.nouveau()">+</button>
      <div id="agModal"></div>`;
    }
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title">Agenda</div>
        </div>
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
      // Le compte partagé n'est plus utilisé : il n'apparaît pas dans l'agenda
      this.coachs = this.coachs.filter(c => c.id !== COMPTE_PARTAGE_ID);
      this._chargerVisibles();
      this._renderToolbar();
      await this._charger();
      this._allerHeureActuelle();
      if (!this._ecouteEcran) {
        // Passage ordinateur ↔ téléphone (rotation, fenêtre redimensionnée)
        this._ecouteEcran = true;
        window.matchMedia('(max-width: 700px)').addEventListener('change', () => {
          if (Router.currentPage !== 'coach-agenda') return;
          document.getElementById('app').innerHTML = this.render();
          this.init();
        });
      }
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

  _titreCreneau(c) {
    if (c.type === 'indispo') return 'Indisponible';
    if (c.type === 'prospect') return '🎯 ' + (c.prospect_nom || 'Prospect');
    return this._nomClient(c.client_id);
  },

  _nomClient(id) {
    const cl = this.clients.find(c => c.id === id);
    return cl ? `${cl.prenom || ''} ${cl.nom || ''}`.trim() : 'Client';
  },

  // ── Navigation ───────────────────────────────────────────────────────────

  setVue(vue) { this.vue = vue; this._renderToolbar(); this._charger(); },

  aujourdhui() {
    const cible = this._debutJour(new Date());
    this._anim = Math.sign(cible - this.date);
    this.date = cible;
    this._renderToolbar();
    this._charger();
  },

  decaler(sens) {
    this._anim = sens;
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

    if (this._mobile) {
      const mois = this.date.toLocaleDateString('fr-FR', this.date.getFullYear() === new Date().getFullYear()
        ? { month: 'long' } : { month: 'long', year: 'numeric' });
      const nbVisibles = this.coachs.filter(c => this.visibles.has(c.id)).length;
      document.getElementById('agToolbar').innerHTML = `
        <div class="ag-tb-m">
          <button class="ag-tb-btn" aria-label="Précédent" onclick="CoachAgendaPage.decaler(-1)">‹</button>
          <div class="ag-tb-mois ${this._anim ? 'ag-flash' : ''}">${escHtml(mois)}</div>
          <button class="ag-tb-btn" aria-label="Suivant" onclick="CoachAgendaPage.decaler(1)">›</button>
          <button class="ag-tb-auj" aria-label="Aujourd'hui" onclick="CoachAgendaPage.aujourdhui()">${new Date().getDate()}</button>
          <div class="ag-switch">
            <button class="${this.vue === 'jour' ? 'on' : ''}" onclick="CoachAgendaPage.setVue('jour')">J</button>
            <button class="${this.vue === 'semaine' ? 'on' : ''}" onclick="CoachAgendaPage.setVue('semaine')">S</button>
          </div>
          <button class="ag-tb-btn ${this._coachsOuverts ? 'on' : ''}" aria-label="Coachs affichés"
            onclick="CoachAgendaPage._coachsOuverts=!CoachAgendaPage._coachsOuverts;CoachAgendaPage._renderToolbar()">👥<span class="ag-tb-nb">${nbVisibles}</span></button>
        </div>
        ${this._coachsOuverts ? `<div class="ag-chips">${chips}</div>` : ''}`;
      this._caleEnTetes();
      return;
    }

    document.getElementById('agToolbar').innerHTML = `
      <div class="ag-toolbar">
        <div class="ag-nav">
          <button class="date-nav-btn" onclick="CoachAgendaPage.decaler(-1)">‹</button>
          <button class="btn btn-secondary btn-small" onclick="CoachAgendaPage.aujourdhui()">Aujourd'hui</button>
          <button class="date-nav-btn" onclick="CoachAgendaPage.decaler(1)">›</button>
          <div class="ag-label ${this._anim ? 'ag-flash' : ''}">${escHtml(label)}</div>
        </div>
        <div class="ag-nav">
          <div class="ag-switch">
            <button class="${this.vue === 'jour' ? 'on' : ''}" onclick="CoachAgendaPage.setVue('jour')">Jour</button>
            <button class="${this.vue === 'semaine' ? 'on' : ''}" onclick="CoachAgendaPage.setVue('semaine')">Semaine</button>
          </div>
          <button class="btn btn-secondary btn-small" title="Ouvrir en onglets les fiches de mes clients encore à venir aujourd'hui"
            onclick="CoachAgendaPage.fichesDuJour()">📂 Fiches du jour</button>
          <button class="btn btn-primary btn-small" onclick="CoachAgendaPage.nouveau()">+ Rendez-vous</button>
        </div>
      </div>
      <div class="ag-chips">${chips}</div>`;
  },

  // Ouvre en onglets les fiches des clients de mes coachings du jour pas encore terminés
  async fichesDuJour() {
    try {
      const maintenant = Date.now();
      const creneaux = (await db.getCoachingsDuJour(Router.userProfile.id))
        .filter(c => c.type === 'coaching' && c.client_id && new Date(c.fin).getTime() > maintenant);
      const vus = new Set();
      const clients = creneaux.filter(c => !vus.has(c.client_id) && vus.add(c.client_id))
        .map(c => ({ id: c.client_id, nom: `${c.client?.prenom || ''} ${c.client?.nom || ''}`.trim() }));
      if (!clients.length) { toast('Aucun coaching à venir aujourd\'hui', 'info'); return; }
      FicheOnglets.ouvrirPlusieurs(clients);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
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
    if (this.vue === 'semaine' || this._mobile) {
      return this._jours().map(j => ({
        date: j,
        titre: `${AGENDA_JOURS[(j.getDay() + 6) % 7]} ${j.getDate()}`,
        lettre: AGENDA_JOURS[(j.getDay() + 6) % 7].charAt(0),
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
    const hauteur = nbPas * this._px();
    const pxMin   = this._px() / AGENDA_PAS_MIN;
    const today   = this._ymd(new Date());

    let heures = '';
    for (let h = AGENDA_HEURE_DEBUT; h < AGENDA_HEURE_FIN; h++) {
      heures += `<div class="ag-heure" style="top:${(h - AGENDA_HEURE_DEBUT) * 60 * pxMin}px">${h}h</div>`;
    }

    // Ligne « journée entière » : même hauteur dans toutes les colonnes,
    // pour que les heures restent alignées d'un jour à l'autre
    const maxJournee = Math.max(0, ...cols.map(col => this._creneauxColonne(col).filter(c => c.journee_entiere).length));
    const hJournee = maxJournee ? maxJournee * (this._mobile ? 18 : 22) + 4 : (this._mobile ? 6 : 22);

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
        const h   = Math.max((f - d) / 60000 * pxMin, this._px());
        const p   = places.get(c.id);
        const largeur = 100 / p.total;
        const indispo = c.type === 'indispo';
        const titre = this._titreCreneau(c);
        const heure = `${this._hm(new Date(c.debut))}–${this._hm(new Date(c.fin))}`;
        return `<div class="ag-bloc ${indispo ? 'indispo' : ''} ${c.type === 'prospect' ? 'prospect' : ''}" style="top:${top}px;height:${h - 2}px;left:${p.couloir * largeur}%;width:calc(${largeur}% - 3px);--c:${this._couleur(c.coach_id)}"
                  onclick="event.stopPropagation()" oncontextmenu="event.preventDefault()" onpointerdown="CoachAgendaPage.debutDrag(event, '${c.id}')" title="${escHtml(titre + ' · ' + heure)}">
          <div class="ag-poignee haut"></div><div class="ag-poignee bas"></div>
          <div class="ag-bloc-titre">${escHtml(titre)}${c.serie_id ? ' ↻' : ''}${c.en_plus ? ' · en plus' : ''}</div>
          <div class="ag-bloc-sub">${heure}${this.vue === 'semaine' || this._mobile ? ' · ' + escHtml(this._nomCoach(c.coach_id)) : ''}</div>
        </div>`;
      }).join('');

      const bandeau = journee.map(c => `
        <div class="ag-journee" style="--c:${this._couleur(c.coach_id)}" onclick="event.stopPropagation();CoachAgendaPage.ouvrir('${c.id}')">
          Indisponible${this.vue === 'semaine' ? ' · ' + escHtml(this._nomCoach(c.coach_id)) : ''}
        </div>`).join('');

      return `
        <div class="ag-col">
          <div class="ag-col-titre ${(this.vue === 'semaine' || this._mobile) && this._ymd(col.date) === today ? 'today' : ''}">${this._mobile && col.lettre
            ? `<span class="ag-jl">${col.lettre}</span><span class="ag-jn">${col.date.getDate()}</span>`
            : escHtml(col.titre)}</div>
          <div class="ag-col-journee" style="cursor:pointer;height:${hJournee}px;" title="Indisponibilité sur la journée" onclick="CoachAgendaPage.nouvelleJournee(${i})">${bandeau}</div>
          <div class="ag-col-corps" data-col="${i}" style="height:${hauteur}px" onclick="CoachAgendaPage.clicGrille(event, ${i})">${blocs}</div>
        </div>`;
    }).join('');

    el.innerHTML = `
      <div class="ag-grille ${this._mobile ? 'ag-m' : ''} ${this._mobile && this.vue === 'jour' ? 'ag-m-jour' : ''}">
        <div class="ag-heures">
          <div class="ag-col-titre">&nbsp;</div>
          <div class="ag-col-journee" style="height:${hJournee}px;"></div>
          <div style="position:relative;height:${hauteur}px">${heures}</div>
        </div>
        <div class="ag-cols ${this._anim > 0 ? 'ag-slide-suiv' : this._anim < 0 ? 'ag-slide-prec' : ''}" style="--pas:${this._px()}px;--heure:${60 * pxMin}px">${colonnesHtml}</div>
      </div>`;
    this._anim = 0;
    if (this._drag?.sensBord) this._marquerBord(this._drag.sensBord);
    if (this._mobile) { this._activerBalayage(); this._caleEnTetes(); }
  },

  // Téléphone : la barre du mois reste sous le menu, l'en-tête des jours sous la barre
  _caleEnTetes() {
    const menu = document.getElementById('coachMenu');
    const hMenu = menu && getComputedStyle(menu).position === 'sticky' ? menu.offsetHeight : 0;
    const barre = document.getElementById('agToolbar');
    if (!barre) return;
    barre.style.top = hMenu + 'px';
    document.documentElement.style.setProperty('--ag-entete', (hMenu + barre.offsetHeight) + 'px');
  },

  // Téléphone : glisser le doigt vers la gauche / la droite = période suivante / précédente
  _activerBalayage() {
    const zone = document.querySelector('.ag-cols');
    if (!zone) return;
    let x0 = null, y0 = null;
    zone.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    zone.addEventListener('touchend', e => {
      if (x0 === null || this._drag) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dy) < 40) this.decaler(dx < 0 ? 1 : -1);
    }, { passive: true });
  },

  // À l'ouverture, faire défiler jusqu'à l'heure actuelle (une heure avant)
  _allerHeureActuelle() {
    const corps = document.querySelector('.ag-col-corps');
    if (!corps) return;
    const h = Math.min(Math.max(new Date().getHours() - 1, AGENDA_HEURE_DEBUT), AGENDA_HEURE_FIN - 1);
    const y = corps.getBoundingClientRect().top + window.scrollY + (h - AGENDA_HEURE_DEBUT) * 60 * this._px() / AGENDA_PAS_MIN;
    window.scrollTo({ top: Math.max(0, y - 120), behavior: 'auto' });
  },

  // Bande « période suivante / précédente » pendant un glisser-déposer
  _marquerBord(sens) {
    const grille = document.querySelector('.ag-grille');
    if (!grille) return;
    grille.classList.remove('ag-bord-prec', 'ag-bord-suiv');
    if (!sens) return;
    const unite = this.vue === 'jour' ? ['Jour précédent', 'Jour suivant'] : ['Semaine précédente', 'Semaine suivante'];
    grille.dataset.bord = sens > 0 ? `${unite[1]} ›` : `‹ ${unite[0]}`;
    grille.classList.add(sens > 0 ? 'ag-bord-suiv' : 'ag-bord-prec');
  },

  // Clic sur une case vide : nouveau rendez-vous à cette heure
  clicGrille(event, iCol) {
    if (this._ignorerClic) { this._ignorerClic = false; return; }
    const col = this._colonnes()[iCol];
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    // Heure pile ou demi-heure selon la moitié de l'heure cliquée (plus simple à viser)
    const minutesClic = y / this._px() * AGENDA_PAS_MIN;
    const minutes = AGENDA_HEURE_DEBUT * 60 + Math.floor(minutesClic / 30) * 30;
    this.nouveau(this._ymd(col.date), minutes, col.coachId);
  },

  // Clic sur le bandeau du haut : indisponibilité sur la journée entière
  nouvelleJournee(iCol) {
    const col = this._colonnes()[iCol];
    this.nouveau(this._ymd(col.date), null, col.coachId);
    Object.assign(this._edit, { type: 'indispo', journee_entiere: true });
    this._renderModal();
  },

  // ── Glisser-déposer : déplacer un créneau ou changer sa durée ────────────
  // Corps du créneau → déplacement (autre heure, autre jour, autre coach en
  // vue jour ; bord gauche ou droit de l'agenda → période précédente/suivante).
  // Bordure haute ou basse → durée. Sans mouvement, c'est un simple clic.

  _minutesY(y) { return AGENDA_HEURE_DEBUT * 60 + y * AGENDA_PAS_MIN / this._px(); },

  _arrondi(m) { return Math.round(m / AGENDA_PAS_MIN) * AGENDA_PAS_MIN; },

  _hmMin(m) { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; },

  debutDrag(event, id) {
    if (event.button !== 0) return;
    const c = this.creneaux.find(x => x.id === id);
    if (!c) return;
    event.preventDefault();
    event.stopPropagation();

    const bloc  = event.currentTarget;
    const corps = bloc.parentElement;
    const mode  = event.target.classList.contains('haut') ? 'haut'
                : event.target.classList.contains('bas')  ? 'bas' : 'deplacer';
    const d = new Date(c.debut), f = new Date(c.fin);
    const debutMin = d.getHours() * 60 + d.getMinutes();
    const duree = Math.round((f - d) / 60000);
    const pointeur = this._minutesY(event.clientY - corps.getBoundingClientRect().top);

    this._drag = {
      c, mode, bloc, x0: event.clientX, y0: event.clientY, actif: false,
      tactile: event.pointerType === 'touch', attente: null,
      debutMin, finMin: debutMin + duree, duree, decalage: pointeur - debutMin,
      corps0: corps, cible: null, sensBord: 0, timer: null,
    };
    this._onDragMove = e => this._dragMove(e);
    this._onDragFin  = e => this._dragFin(e);
    document.addEventListener('pointermove', this._onDragMove);
    document.addEventListener('pointerup', this._onDragFin);
    document.addEventListener('pointercancel', this._onDragFin);

    // Au doigt : le déplacement ne démarre qu'après un appui long
    if (this._drag.tactile) {
      const g = this._drag;
      g.attente = setTimeout(() => {
        if (this._drag !== g) return;
        g.attente = null;
        g.actif = true;
        g.bloc.classList.add('ag-drag-source');
        document.body.classList.add('ag-dragging');
        window.getSelection?.().removeAllRanges();
        this._bloquerDefilement = e => e.preventDefault();
        document.addEventListener('touchmove', this._bloquerDefilement, { passive: false });
        if (navigator.vibrate) navigator.vibrate(30);
      }, 350);
    }
  },

  _dragMove(e) {
    const g = this._drag;
    if (!g) return;
    if (g.tactile && g.attente) {
      // Le doigt bouge avant l'appui long : c'est un défilement, pas un déplacement
      if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > 8) this._annulerDrag();
      return;
    }
    if (!g.actif) {
      if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 4) return;
      g.actif = true;
      g.bloc.classList.add('ag-drag-source');
      document.body.classList.add('ag-dragging');
    }

    let corps;
    if (g.mode === 'deplacer') {
      corps = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList?.contains('ag-col-corps'));
      this._bordPeriode(e);
      if (!corps && g.cible && document.body.contains(g.cible.corps)) corps = g.cible.corps;
    } else {
      corps = document.body.contains(g.corps0) ? g.corps0 : null;
    }
    if (!corps) return;

    const m   = this._minutesY(e.clientY - corps.getBoundingClientRect().top);
    const min = AGENDA_HEURE_DEBUT * 60, max = AGENDA_HEURE_FIN * 60;
    let debut, fin;
    if (g.mode === 'deplacer') {
      debut = Math.min(Math.max(this._arrondi(m - g.decalage), min), max - g.duree);
      fin = debut + g.duree;
    } else if (g.mode === 'haut') {
      debut = Math.max(Math.min(this._arrondi(m), g.finMin - AGENDA_PAS_MIN), min);
      fin = g.finMin;
    } else {
      debut = g.debutMin;
      fin = Math.min(Math.max(this._arrondi(m), g.debutMin + AGENDA_PAS_MIN), max);
    }
    g.cible = { corps, colIndex: +corps.dataset.col, debut, fin };
    this._dessinerFantome(corps, debut, fin);
  },

  _dessinerFantome(corps, debut, fin) {
    const g = this._drag;
    if (!this._fantome) {
      this._fantome = document.createElement('div');
      this._fantome.className = 'ag-bloc ag-fantome' + (g.c.type === 'indispo' ? ' indispo' : '');
    }
    const f = this._fantome;
    const pxMin = this._px() / AGENDA_PAS_MIN;
    const col = this._colonnes()[+corps.dataset.col];
    const coachId = col?.coachId || g.c.coach_id;
    f.style.cssText = `top:${(debut - AGENDA_HEURE_DEBUT * 60) * pxMin}px;height:${(fin - debut) * pxMin - 2}px;left:0;width:calc(100% - 3px);--c:${this._couleur(coachId)}`;
    const titre = this._titreCreneau(g.c);
    f.innerHTML = `<div class="ag-bloc-titre">${escHtml(titre)}</div><div class="ag-bloc-sub">${this._hmMin(debut)}–${this._hmMin(fin)}</div>`;
    if (f.parentElement !== corps) corps.appendChild(f);
  },

  // Pointeur contre le bord gauche/droit de l'agenda : période précédente/suivante
  _bordPeriode(e) {
    const g = this._drag;
    const zone = document.querySelector('.ag-cols')?.getBoundingClientRect();
    if (!zone) return;
    const sens = e.clientX < zone.left + 12 ? -1 : e.clientX > zone.right - 12 ? 1 : 0;
    // Le texte de la bande suit la hauteur du pointeur
    const grille = document.querySelector('.ag-grille');
    if (grille) grille.style.setProperty('--ybord', `${e.clientY - grille.getBoundingClientRect().top}px`);
    if (sens === g.sensBord) return;
    g.sensBord = sens;
    this._marquerBord(sens);
    clearTimeout(g.timer);
    if (sens) g.timer = setTimeout(() => this._changerPeriodeDrag(sens), 700);
  },

  async _changerPeriodeDrag(sens) {
    const g = this._drag;
    if (!g || g.sensBord !== sens) return;
    this._anim = sens;
    this.date = this._ajouterJours(this.date, sens * (this.vue === 'jour' ? 1 : 7));
    this._fantome = null;
    g.cible = null;
    this._renderToolbar();
    await this._charger();
    if (this._drag === g && g.sensBord === sens) {
      g.timer = setTimeout(() => this._changerPeriodeDrag(sens), 900);
    }
  },

  _annulerDrag() {
    const g = this._drag;
    document.removeEventListener('pointermove', this._onDragMove);
    document.removeEventListener('pointerup', this._onDragFin);
    document.removeEventListener('pointercancel', this._onDragFin);
    if (this._bloquerDefilement) document.removeEventListener('touchmove', this._bloquerDefilement);
    this._bloquerDefilement = null;
    if (g) { clearTimeout(g.timer); clearTimeout(g.attente); }
    this._drag = null;
  },

  async _dragFin(evenement) {
    const g = this._drag;
    document.removeEventListener('pointermove', this._onDragMove);
    document.removeEventListener('pointerup', this._onDragFin);
    document.removeEventListener('pointercancel', this._onDragFin);
    if (this._bloquerDefilement) document.removeEventListener('touchmove', this._bloquerDefilement);
    this._bloquerDefilement = null;
    if (!g) return;
    clearTimeout(g.attente);
    if (evenement?.type === 'pointercancel' && !g.actif) { this._drag = null; return; }
    clearTimeout(g.timer);
    this._drag = null;
    document.body.classList.remove('ag-dragging');
    this._marquerBord(0);

    if (!g.actif) { this.ouvrir(g.c.id); return; }

    this._ignorerClic = true;
    setTimeout(() => { this._ignorerClic = false; }, 0);
    this._fantome?.remove();
    this._fantome = null;

    const cible = g.cible;
    const col = cible ? this._colonnes()[cible.colIndex] : null;
    if (!col) { this._renderGrille(); return; }

    const ymd = this._ymd(col.date);
    const patch = {
      debut: this._dateLocale(ymd, cible.debut).toISOString(),
      fin:   this._dateLocale(ymd, cible.fin).toISOString(),
    };
    if (col.coachId && col.coachId !== g.c.coach_id) patch.coach_id = col.coachId;
    const inchange = new Date(patch.debut).getTime() === new Date(g.c.debut).getTime()
                  && new Date(patch.fin).getTime() === new Date(g.c.fin).getTime() && !patch.coach_id;
    if (inchange) { this._renderGrille(); return; }

    try {
      await db.updateCreneau(g.c.id, patch);
      await this._charger();
      toast(g.mode === 'deplacer' ? 'Rendez-vous déplacé' : 'Durée modifiée', 'success');
    } catch (err) {
      toast(err.message, 'error');
      this._renderGrille();
    }
  },

  // ── Fenêtre rendez-vous ──────────────────────────────────────────────────

  nouveau(ymd, minutes, coachId) {
    const me = Router.userProfile.id;
    const maintenant = new Date();
    let m = minutes;
    if (m == null) {
      m = Math.ceil((maintenant.getHours() * 60 + maintenant.getMinutes()) / 30) * 30;
      m = Math.min(Math.max(m, AGENDA_HEURE_DEBUT * 60), AGENDA_HEURE_FIN * 60 - 60);
    }
    const jour = ymd || this._ymd(this.vue === 'jour' ? this.date : maintenant);
    const finSerie = new Date(this._dateLocale(jour, 0));
    finSerie.setMonth(finSerie.getMonth() + 3);
    this._edit = {
      id: null, type: 'coaching', client_id: null,
      coach_id: coachId || (this.coachs.some(c => c.id === me) ? me : this.coachs[0]?.id),
      jour, minutes: m, duree: 60, journee_entiere: false, en_plus: false, notes: '',
      prospect_nom: '', prospect_tel: '',
      serie_id: null, recurrence: false, intervalle: 1, fin_serie: this._ymd(finSerie),
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
      prospect_nom: c.prospect_nom || '', prospect_tel: c.prospect_tel || '',
      recurrence: false, intervalle: 1,
      fin_serie: (() => { const x = new Date(d); x.setMonth(x.getMonth() + 3); return this._ymd(x); })(),
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
    if (v('agProspectNom')) {
      e.prospect_nom = v('agProspectNom').value;
      e.prospect_tel = v('agProspectTel').value;
    }
    if (v('agRecurrence')) {
      e.recurrence = v('agRecurrence').checked;
      e.fin_serie = v('agFinSerie').value;
      e.intervalle = parseInt(v('agIntervalle').value) || 1;
    }
  },

  changerChamp() { this._lireForm(); this._renderModal(); },

  _renderModal() {
    const e = this._edit;
    if (!e) return;
    const client = this.clients.find(c => c.id === e.client_id);
    const indispo = e.type === 'indispo';
    const prospect = e.type === 'prospect';

    document.getElementById('agModal').innerHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">${e.id ? 'Rendez-vous' : 'Nouveau rendez-vous'}
            <button class="modal-close" onclick="CoachAgendaPage.fermer()">×</button>
          </div>

          <div class="field">
            <label class="field-label">Type</label>
            <select class="input" id="agType" onchange="CoachAgendaPage.changerChamp()">
              <option value="coaching" ${e.type === 'coaching' ? 'selected' : ''}>Coaching</option>
              <option value="prospect" ${prospect ? 'selected' : ''}>Rendez-vous prospect</option>
              <option value="indispo" ${indispo ? 'selected' : ''}>Indisponibilité</option>
            </select>
          </div>

          ${prospect ? `
          <div class="field-row" style="display:grid;grid-template-columns:1.4fr 1fr;gap:10px;">
            <div class="field"><label class="field-label">Nom du prospect</label>
              <input class="input" id="agProspectNom" value="${escHtml(e.prospect_nom)}" placeholder="Prénom Nom"></div>
            <div class="field"><label class="field-label">Téléphone</label>
              <input class="input" type="tel" id="agProspectTel" value="${escHtml(e.prospect_tel)}" placeholder="06…"></div>
          </div>` : ''}

          ${indispo || prospect ? '' : `
          <div class="field">
            <label class="field-label">Client</label>
            ${client ? `
              <div style="display:flex;gap:8px;align-items:center;">
                <div class="input" style="flex:1;display:flex;align-items:center;">${escHtml(this._nomClient(client.id))}${client.type_client === 'studio' ? ' <span style="font-size:11px;color:var(--gray-light);margin-left:6px;">studio</span>' : ''}</div>
                <button class="btn btn-secondary btn-small" onclick="CoachAgendaPage.changerClient()">Changer</button>
                <button class="btn btn-secondary btn-small" onclick="CoachAgendaPage.ouvrirFiche('${client.id}')">Fiche</button>
                ${e.id ? `<button class="btn btn-primary btn-small" onclick="CoachAgendaPage.ouvrirSeance('${client.id}')">📋 Séance</button>` : ''}
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

          ${e.type === 'coaching' && client?.facturation_mixte ? `
          <div class="field">
            <label class="field-label">Facturation</label>
            <select class="input" id="agEnPlus">
              <option value="inclus" ${!e.en_plus ? 'selected' : ''}>Inclus dans l'abonnement</option>
              <option value="plus" ${e.en_plus ? 'selected' : ''}>En plus (à la consommation)</option>
            </select>
          </div>` : ''}

          ${!e.serie_id ? `
          <label class="ag-check"><input type="checkbox" id="agRecurrence" ${e.recurrence ? 'checked' : ''} onchange="CoachAgendaPage.changerChamp()"> Répéter</label>
          <div class="field-row" style="display:${e.recurrence ? 'grid' : 'none'};grid-template-columns:1.2fr 1fr;gap:10px;">
            <div class="field"><label class="field-label">Toutes les</label>
              <select class="input" id="agIntervalle">
                ${[1, 2, 3, 4].map(n => `<option value="${n}" ${e.intervalle === n ? 'selected' : ''}>${n === 1 ? 'semaines' : n === 2 ? '2 semaines (une sur deux)' : `${n} semaines`}</option>`).join('')}
              </select></div>
            <div class="field"><label class="field-label">Jusqu'au</label>
              <input class="input" type="date" id="agFinSerie" value="${e.fin_serie || ''}"></div>
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
    const res = this.clients
      .filter(c => c.type_client !== 'distance')
      .filter(c => `${c.prenom || ''} ${c.nom || ''}`.toLowerCase().includes(s))
      .slice(0, 8);
    box.innerHTML = res.length
      ? res.map(c => `<div class="ag-result" onclick="CoachAgendaPage.choisirClient('${c.id}')">${escHtml(this._nomClient(c.id))}${c.type_client === 'studio' ? ' <span style="font-size:11px;color:var(--gray-light);">studio</span>' : ''}</div>`).join('')
      : '<div class="ag-result" style="color:var(--gray-light);cursor:default;">Aucun client trouvé</div>';
  },

  choisirClient(id) { this._lireForm(); this._edit.client_id = id; this._edit.en_plus = false; this._renderModal(); },

  changerClient() { this._lireForm(); this._edit.client_id = null; this._renderModal(); },

  ouvrirFiche(id) { this.fermer(); Router.navigate('coach-client-edit', { clientId: id }); },

  ouvrirSeance(id) { this.fermer(); CoachSeanceStudioPage.ouvrirPourClient(id); },

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
      prospect_nom: e.type === 'prospect' ? (e.prospect_nom || '').trim() : null,
      prospect_tel: e.type === 'prospect' ? ((e.prospect_tel || '').trim() || null) : null,
      debut: debut.toISOString(),
      fin: fin.toISOString(),
      journee_entiere: e.journee_entiere,
      en_plus: e.type === 'coaching' && e.en_plus,
      notes: e.notes.trim() || null,
      serie_id: serieId,
    };
  },

  // Jours d'une récurrence (toutes les « intervalle » semaines), du jour donné
  // jusqu'à la date de fin incluse
  _joursSerie(ymdDebut, ymdFin, intervalle = 1) {
    const jours = [];
    let d = this._dateLocale(ymdDebut, 0);
    const fin = this._dateLocale(ymdFin, 0);
    while (d <= fin && jours.length < 200) {
      jours.push(this._ymd(d));
      d = this._ajouterJours(d, 7 * intervalle);
    }
    return jours;
  },

  async enregistrer() {
    this._lireForm();
    const e = this._edit;
    const errEl = document.getElementById('agError');
    errEl.innerHTML = '';
    if (e.type === 'coaching' && !e.client_id) { errEl.innerHTML = '<div class="alert alert-error">Choisis un client.</div>'; return; }
    if (e.type === 'prospect' && !(e.prospect_nom || '').trim()) { errEl.innerHTML = '<div class="alert alert-error">Indique le nom du prospect.</div>'; return; }
    if (!e.jour) { errEl.innerHTML = '<div class="alert alert-error">Choisis une date.</div>'; return; }
    if (e.recurrence && (!e.fin_serie || e.fin_serie < e.jour)) {
      errEl.innerHTML = '<div class="alert alert-error">La date de fin de la récurrence doit être après la date du rendez-vous.</div>';
      return;
    }

    const btn = document.getElementById('agSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Enregistrement…';
    try {
      if (e.id && e.recurrence && !e.serie_id) {
        // Rendez-vous existant qui devient la première séance d'une série
        const serieId = crypto.randomUUID();
        await db.updateCreneau(e.id, this._ligne(e, e.jour, serieId));
        const suivants = this._joursSerie(e.jour, e.fin_serie, e.intervalle).slice(1);
        if (suivants.length) await db.insertCreneaux(suivants.map(j => this._ligne(e, j, serieId)));
      } else if (e.id) {
        const { serie_id, ...patch } = this._ligne(e, e.jour, e.serie_id);
        await db.updateCreneau(e.id, patch);
      } else if (e.recurrence) {
        const serieId = crypto.randomUUID();
        await db.insertCreneaux(this._joursSerie(e.jour, e.fin_serie, e.intervalle).map(j => this._ligne(e, j, serieId)));
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
    const derniers = await db.getDerniersCreneauxSerie(e.serie_id, 2).catch(() => []);
    const dernier = derniers[0];
    if (!dernier) return;
    // Rythme de la série (1 semaine, une sur deux…) d'après l'écart entre les deux dernières séances
    const intervalle = derniers[1]
      ? Math.max(1, Math.round((new Date(dernier.debut) - new Date(derniers[1].debut)) / (7 * 864e5)))
      : 1;
    const dDernier = new Date(dernier.debut);
    const proposition = new Date(dDernier);
    proposition.setMonth(proposition.getMonth() + 3);
    const fin = prompt(`Dernière séance de la série : ${dDernier.toLocaleDateString('fr-FR')}.\nProlonger jusqu'au (AAAA-MM-JJ) :`, this._ymd(proposition));
    if (!fin || !/^\d{4}-\d{2}-\d{2}$/.test(fin)) return;

    const jours = this._joursSerie(this._ymd(this._ajouterJours(dDernier, 7 * intervalle)), fin, intervalle);
    if (!jours.length) { toast('Aucune nouvelle séance à ajouter', 'info'); return; }
    const d = new Date(dernier.debut), f = new Date(dernier.fin);
    const modele = {
      type: dernier.type, coach_id: dernier.coach_id, client_id: dernier.client_id,
      minutes: d.getHours() * 60 + d.getMinutes(), duree: Math.round((f - d) / 60000),
      journee_entiere: dernier.journee_entiere, en_plus: dernier.en_plus, notes: dernier.notes || '',
      prospect_nom: dernier.prospect_nom || '', prospect_tel: dernier.prospect_tel || '',
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
    const label = c.type === 'indispo' ? 'cette indisponibilité' : `le rendez-vous de ${escHtml(c.type === 'prospect' ? c.prospect_nom : this._nomClient(c.client_id))}`;
    document.getElementById('agModal').innerHTML = `
      <div class="modal-overlay">
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
