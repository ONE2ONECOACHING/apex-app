// APEX APP — Client : séance d'entraînement (aperçu, puis séance bloc par bloc)
// Aperçu : toute la séance d'un coup d'œil (A, B1/B2 pour les supersets).
// Séance : un bloc par page, on glisse de côté pour passer d'un bloc à l'autre
// sans rien valider. Chaque série se coche ; le repos se lance tout seul (en
// superset, après le dernier exercice du tour) ou par le bouton « Récup », avec
// le temps noté par le coach : le client ne règle aucun minuteur. Bloc AMRAP :
// bouton « Démarrer » en bas, 10 s de préparation puis annonces sonores
// (3, 2, 1, Go ; mi-temps ; dernière minute ; 3, 2, 1, Stop) ; la récup ne part
// jamais seule, le client appuie sur « Récup ». Exercice en durée : « Start ».
// La séance commencée est gardée dans le téléphone et dans la base
// (seances_en_cours) : le client la reprend même après avoir fermé l'app.

const SeanceActivePage = {
  _seance:    null,
  _progId:    null,
  _exos:      [],
  _blocs:     [],        // [{ lettre, exos: [index dans _exos] }]
  _s:         [],        // séries saisies par exercice : [{ reps, kg, fait, e2, e2fait }]
  _notes:     [],        // note pour le coach, par exercice
  _lastSets:  {},        // dernière séance connue, par exercice_bdd
  _lastNotes: {},
  _vue:       'apercu',  // 'apercu' | 'seance' | 'fin'
  _bloc:      0,
  _commencee: false,
  _secondes:  0,         // durée de la séance (temps passé sur l'écran de séance)
  _dernierTic: 0,
  _ressenti:  null,      // 'dur' | 'bien' | 'feu' (obligatoire pour enregistrer)
  _mt:        null,      // minuteur en cours
  _amrapNb: {},           // bloc → nombre d'AMRAP faits (un par série)
  _amrapAttente: new Set(), // blocs dont un AMRAP vient de finir : « Récup » avant le suivant
  _pave:      null,
  _tic:       null,
  _envoi:     null,
  _wake:      null,
  _audio:     null,

  render() {
    return `<div id="saWrap" class="sa"><div style="display:flex;align-items:center;justify-content:center;flex:1;"><div class="spinner"></div></div></div>`;
  },

  async init() {
    this._arreter();
    const profile = Router.userProfile;
    if (!profile || profile.role === 'coach') { window.location.hash = '#entrainement'; return; }
    const params = Router.getParams();
    if (!params.seanceId) { window.location.hash = '#entrainement'; return; }
    const jeton = this._jeton = {};

    try {
      const seance = await db.getClientSeance(params.seanceId);
      const exos = seance.exercices || [];
      const [last, distant] = await Promise.all([
        db.getLastSetsPerExo(profile.id, exos.map(e => e.exercice_id).filter(Boolean)).catch(() => ({ sets: {}, notes: {} })),
        db.getSeanceEnCours(profile.id, seance.id).catch(() => null),
      ]);
      if (jeton !== this._jeton) return;

      this._seance    = seance;
      this._progId    = params.programmeId || seance.programme_id || null;
      this._exos      = exos;
      this._lastSets  = last.sets || {};
      this._lastNotes = last.notes || {};
      this._vue       = 'apercu';
      this._amrapNb = {};
      this._amrapAttente = new Set();
      this._bloc      = 0;
      this._secondes  = 0;
      this._ressenti  = null;
      this._mt        = null;
      this._commencee = false;

      // Blocs : les exercices d'un même superset qui se suivent forment un bloc
      this._blocs = [];
      exos.forEach((ex, i) => {
        const prec = exos[i - 1];
        if (ex.superset_groupe && prec?.superset_groupe === ex.superset_groupe) this._blocs[this._blocs.length - 1].exos.push(i);
        else this._blocs.push({ exos: [i] });
      });
      this._blocs.forEach((b, i) => { b.lettre = i < 26 ? String.fromCharCode(65 + i) : String(i + 1); });

      this._s     = exos.map(ex => Array.from({ length: this._nbSeries(ex) }, (_, k) => this._serieVide(ex, k)));
      this._notes = exos.map(() => '');

      // Reprise : la version la plus récente entre le téléphone et la base
      const local = this._lireLocal(profile.id, seance.id);
      const etat = [local, distant?.etat].filter(Boolean).sort((a, b) => (b.maj || 0) - (a.maj || 0))[0];
      if (etat) this._appliquerEtat(etat);

      this._dernierTic = Date.now();
      this._tic = setInterval(() => this._ticTac(), 250);
      this._surVisibilite = () => { if (document.visibilityState === 'hidden') this._envoyer(true); };
      document.addEventListener('visibilitychange', this._surVisibilite);
      this._dessiner();
    } catch (e) {
      document.getElementById('saWrap').innerHTML = `<div class="alert alert-error" style="margin:2rem;">${escHtml(e.message)}</div>`;
    }
  },

  // ── Données d'un exercice ───────────────────────────────────────────────────

  _type(ex) { return ex.type_effort || 'reps'; },

  // Valeurs par série du coach. Hors reps (durée, AMRAP, distance), seulement si elles
  // vont avec le nombre de séries et la 1re valeur (sinon : restes d'un ancien type « reps »).
  _sd(ex) {
    const sd = ex.series_data;
    if (!Array.isArray(sd) || !sd.length) return null;
    if (this._type(ex) === 'reps') return sd;
    return sd.length === (ex.series || 1) && String(sd[0]?.reps ?? '') === String(ex.reps_cible ?? '') ? sd : null;
  },

  _nbSeries(ex) {
    const sd = this._sd(ex);
    return sd ? sd.length : (ex.series || 1);
  },

  _cible(ex, k) {
    const sd = this._sd(ex);
    if (sd?.[k]) return { reps: sd[k].reps || (this._type(ex) === 'reps' ? '10' : ''), charge: sd[k].charge || '' };
    return { reps: ex.reps_cible || (this._type(ex) === 'reps' ? '10' : ''), charge: ex.charge_cible || '' };
  },

  _serieVide(ex, k) {
    const c = this._cible(ex, k);
    return { reps: this._type(ex) === 'amrap' ? '' : String(c.reps ?? ''), kg: '', fait: false, e2: ex.reps_secondaire || '', e2fait: false };
  },

  // Charge proposée : celle de la série d'avant (cette séance), sinon la dernière fois, sinon celle du coach
  _kgConseil(i, k) {
    const ex = this._exos[i];
    const avant = this._s[i].slice(0, k).reverse().find(s => s.kg !== '');
    if (avant) return avant.kg;
    const last = this._lastSets[ex.exercice_id] || [];
    const v = last[k]?.charge || last[0]?.charge || this._cible(ex, k).charge || '';
    return /^\d+([.,]\d+)?$/.test(String(v).trim()) ? String(v).trim().replace('.', ',') : '';
  },

  _videoId(ex) {
    const url = ex.exercices_bdd?.youtube_url || '';
    return (url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/) || [])[1] || null;
  },

  _prescription(ex) {
    const te = this._type(ex), nb = this._nbSeries(ex);
    const reps = Array.from({ length: nb }, (_, k) => this._cible(ex, k).reps || '?');
    const memes = new Set(reps).size === 1;
    if (te === 'amrap') return nb === 1 ? `AMRAP ${reps[0]}` : `${nb} AMRAP de ${memes ? reps[0] : reps.join(' / ')}`;
    if (te !== 'reps') return `${nb} × ${memes ? reps[0] : reps.join(' / ')}`;
    return `${nb} × ${new Set(reps).size === 1 ? reps[0] : reps.join('/')}${ex.reps_secondaire ? ` + ${ex.reps_secondaire}` : ''}`;
  },

  _chargeTxt(ex) {
    const c = this._cible(ex, 0).charge;
    if (!c) return '';
    return /^\d+([.,]\d+)?$/.test(String(c).trim()) ? `${String(c).trim().replace('.', ',')} kg` : String(c);
  },

  _reposTxt(s) {
    if (!s) return 'enchaîner';
    return s >= 60 ? `${Math.floor(s / 60)} min${s % 60 ? ' ' + String(s % 60).padStart(2, '0') : ''}` : `${s} s`;
  },

  _derniereFois(ex) {
    const sets = this._lastSets[ex.exercice_id] || [];
    if (!sets.length) return '';
    const reps = sets.map(s => s.reps);
    const ch = [...new Set(sets.map(s => s.charge).filter(Boolean).map(c => String(c).replace('.', ',')))];
    return (new Set(reps).size === 1 ? `${reps.length} × ${reps[0]}` : reps.join(' / ')) + (ch.length ? ` @ ${ch.join('/')} kg` : '');
  },

  _fmt(s) { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; },

  _lettreExo(b, i) { return b.exos.length > 1 ? b.lettre + (b.exos.indexOf(i) + 1) : b.lettre; },
  _blocDe(i) { return this._blocs.find(b => b.exos.includes(i)); },
  _blocFait(b) { return b.exos.every(i => this._s[i].every(s => s.fait)); },
  _exoFait(i) { return this._s[i].every(s => s.fait); },
  _seriesFaites() { return this._s.reduce((n, l) => n + l.filter(s => s.fait).length, 0); },
  _premierBlocNonFini() { const i = this._blocs.findIndex(b => !this._blocFait(b)); return i < 0 ? 0 : i; },

  _totaux() {
    let reps = 0, kg = 0;
    this._exos.forEach((ex, i) => {
      if (this._type(ex) !== 'reps') return;
      this._s[i].forEach(s => {
        if (!s.fait) return;
        const r = (parseInt(s.reps) || 0) + (s.e2fait ? parseInt(s.e2) || 0 : 0);
        reps += r;
        kg += r * (parseFloat(String(s.kg).replace(',', '.')) || 0);
      });
    });
    return { reps, kg: Math.round(kg) };
  },

  // ── Séance gardée (téléphone + base) ────────────────────────────────────────

  _cleLocale(clientId, seanceId) { return `apex_seance_v2_${clientId}_${seanceId}`; },

  _lireLocal(clientId, seanceId) {
    try {
      const v2 = localStorage.getItem(this._cleLocale(clientId, seanceId));
      if (v2) return JSON.parse(v2);
      // Ancien brouillon (écran d'avant) : séries validées dans sets_data
      const v1 = JSON.parse(localStorage.getItem(`apex_seance_draft_${clientId}_${seanceId}`) || 'null');
      if (!v1?.logs) return null;
      const exos = {};
      v1.logs.forEach(l => {
        const ex = this._exos.find(e => e.id === l.client_prog_exercice_id) || this._exos.find(e => e.exercice_id === l.exercice_id);
        if (!ex) return;
        const series = (l.sets_data || []).map(sd => {
          const [r1, r2] = String(sd.reps ?? '').split('→');
          return { reps: r1, kg: sd.charge ? String(sd.charge).replace('.', ',') : '', fait: true, e2: r2 ?? (ex.reps_secondaire || ''), e2fait: r2 != null };
        });
        exos[ex.id] = { series, note: l.note_client || '' };
      });
      return { v: 2, maj: v1.savedAt || 0, secondes: v1.sessionSeconds || 0, ressenti: v1.noteRessenti || null, exos };
    } catch (_) { return null; }
  },

  _appliquerEtat(etat) {
    let donnees = false;
    this._exos.forEach((ex, i) => {
      const e = etat.exos?.[ex.id];
      if (!e) return;
      const series = (e.series || []).map(s => ({ reps: s.reps ?? '', kg: s.kg ?? '', fait: !!s.fait, e2: s.e2 ?? '', e2fait: !!s.e2fait }));
      // Les séries pas encore saisies gardent la prescription du coach
      for (let k = series.length; k < this._s[i].length; k++) series.push(this._s[i][k]);
      if (series.length) this._s[i] = series;
      this._notes[i] = e.note || '';
      if (series.some(s => s.fait) || this._notes[i]) donnees = true;
    });
    this._secondes = etat.secondes || 0;
    this._ressenti = etat.ressenti || null;
    this._commencee = donnees;
  },

  _etat() {
    const exos = {};
    this._exos.forEach((ex, i) => { exos[ex.id] = { series: this._s[i], note: this._notes[i] }; });
    return { v: 2, maj: Date.now(), secondes: Math.round(this._secondes), ressenti: this._ressenti, exos };
  },

  // Écrit tout de suite dans le téléphone, et dans la base un peu après (ou tout de suite si `maintenant`)
  _garder() {
    this._commencee = true;
    const p = Router.userProfile;
    try { localStorage.setItem(this._cleLocale(p.id, this._seance.id), JSON.stringify(this._etat())); } catch (_) {}
    clearTimeout(this._envoi);
    this._envoi = setTimeout(() => this._envoyer(true), 1500);
  },

  _envoyer(maintenant) {
    if (!maintenant || !this._commencee || !this._seance) return;
    clearTimeout(this._envoi);
    this._envoi = null;
    const p = Router.userProfile;
    if (!p) return;
    const etat = this._etat();
    try { localStorage.setItem(this._cleLocale(p.id, this._seance.id), JSON.stringify(etat)); } catch (_) {}
    db.saveSeanceEnCours(p.id, this._seance.id, etat).catch(() => {});   // hors réseau : le téléphone garde la séance
  },

  async _oublier() {
    const p = Router.userProfile;
    clearTimeout(this._envoi);
    this._envoi = null;
    this._commencee = false;
    try {
      localStorage.removeItem(this._cleLocale(p.id, this._seance.id));
      localStorage.removeItem(`apex_seance_draft_${p.id}_${this._seance.id}`);
    } catch (_) {}
    await db.deleteSeanceEnCours(p.id, this._seance.id).catch(() => {});
  },

  // ── Horloge (durée, minuteur) ───────────────────────────────────────────────

  _ticTac() {
    if (!(location.hash || '').startsWith('#seance-active')) { this._quitterEcran(); return; }
    const now = Date.now();
    const delta = now - this._dernierTic;
    this._dernierTic = now;
    if (this._vue === 'seance' && delta < 10 * 60000) this._secondes += delta / 1000;
    if (!this._mt) return;
    const mt = this._mt, p = mt.phases[mt.i];
    if (mt.annonces && !p.monte) this._annoncer(mt, p);
    if (!p.monte && this._restant() <= 0) {
      if (mt.i < mt.phases.length - 1) {
        mt.i++;
        mt.debutPhase = now;
        mt.seconde = null;
        if (mt.annonces) { this._bip(1320, 700); this._dire('Go'); }
        else this._bip(mt.phases[mt.i].travail ? 990 : 660);
      } else {
        this._bip(mt.annonces ? 1320 : 990, mt.annonces ? 900 : 600);
        if (mt.annonces) this._dire('Stop');
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        toast(mt.type === 'repos' ? 'Repos terminé : à toi !' : 'Terminé : note ton score', 'info');
        this._finAmrap(mt);
        this._mt = null;
        if (document.getElementById('saMtActif')) this._fermerFeuille();
      }
    }
    this._majBas();
    if (document.getElementById('saMtActif')) this._feuilleMinuteurActif();
  },

  _quitterEcran() {
    this._envoyer(true);
    this._arreter();
  },

  _arreter() {
    clearInterval(this._tic);
    this._tic = null;
    if (this._surVisibilite) document.removeEventListener('visibilitychange', this._surVisibilite);
    this._surVisibilite = null;
    this._wake?.release?.().catch(() => {});
    this._wake = null;
    document.getElementById('saVoile')?.remove();
  },

  async _garderEcranAllume() {
    try { if ('wakeLock' in navigator && !this._wake) this._wake = await navigator.wakeLock.request('screen'); } catch (_) {}
  },

  _bip(f = 880, ms = 180) {
    try {
      this._audio = this._audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = this._audio.createOscillator(), g = this._audio.createGain();
      o.frequency.value = f; g.gain.value = 0.3;
      o.connect(g); g.connect(this._audio.destination);
      o.start(); o.stop(this._audio.currentTime + ms / 1000);
    } catch (_) {}
  },

  // Annonces des efforts minutés : 3, 2, 1 avant le départ et avant la fin,
  // mi-temps (1 min et plus), dernière minute (plus de 2 min)
  _annoncer(mt, p) {
    const s = Math.ceil(this._restant());
    if (s === mt.seconde) return;
    mt.seconde = s;
    if (s >= 1 && s <= 3) { this._bip(880, 150); this._dire(String(s)); return; }
    if (!p.travail) return;
    if (p.dur >= 60 && s === Math.round(p.dur / 2)) {
      this._bip(990, 150); setTimeout(() => this._bip(990, 150), 250);
      this._dire('Mi-temps');
    } else if (p.dur > 120 && s === 60) {
      this._bip(990, 400);
      this._dire('Plus qu\'une minute');
    }
  },

  _dire(txt) {
    try {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = 'fr-FR';
      u.rate = 1.1;
      speechSynthesis.speak(u);
    } catch (_) {}
  },

  // ── Écrans ──────────────────────────────────────────────────────────────────

  _dessiner() {
    if (this._vue === 'seance') return this._dessinerSeance();
    if (this._vue === 'fin') return this._dessinerFin();
    this._dessinerApercu();
  },

  _dessinerApercu() {
    const nf = this._seriesFaites();
    const s = this._seance;
    document.getElementById('saWrap').innerHTML = `
      <div class="sa-ap-tete">
        <button class="sa-icone" aria-label="Retour" onclick="SeanceActivePage._retour()">←</button>
        <div style="min-width:0;">
          <div class="sa-ap-nom">${escHtml(s.nom || 'Séance')}</div>
          <div class="sa-ap-meta">${this._exos.length} exercice${this._exos.length > 1 ? 's' : ''}</div>
        </div>
      </div>
      <div class="sa-ap-corps">
        ${this._commencee ? `
          <div class="sa-reprise">⏸ <div><b>Séance commencée</b> · ${nf} série${nf > 1 ? 's' : ''} faite${nf > 1 ? 's' : ''}. Tu reprends là où tu t'es arrêté.
            <button class="sa-lien" onclick="SeanceActivePage._recommencer()">Recommencer à zéro</button></div></div>` : ''}
        ${s.notes_coach ? `<div class="sa-consigne">📌 ${escHtml(s.notes_coach)}</div>` : ''}
        ${this._exos.length ? this._blocs.map(b => `
          <div class="sa-ap-bloc">
            ${b.exos.length > 1 ? '<div class="sa-ap-bloc-titre">Superset</div>' : ''}
            ${b.exos.map((i, n) => {
              const ex = this._exos[i];
              return `${n ? '<div class="sa-lien-ss"></div>' : ''}
                <button class="sa-ap-exo" onclick="SeanceActivePage._ouvrirSeance(${this._blocs.indexOf(b)})">
                  <div class="sa-lettre ${this._exoFait(i) ? 'fait' : ''}">${this._lettreExo(b, i)}</div>
                  <div style="min-width:0;">
                    <div class="sa-ap-exo-nom">${escHtml(ex.exercices_bdd?.nom || 'Exercice')}</div>
                    <div class="sa-ap-exo-pres">${escHtml(this._prescription(ex))}</div>
                    ${this._chargeTxt(ex) ? `<div class="sa-ap-exo-plus">${escHtml(this._chargeTxt(ex))}</div>` : ''}
                  </div>
                </button>`;
            }).join('')}
          </div>`).join('') : '<div class="sa-vide">Aucun exercice dans cette séance.</div>'}
      </div>
      ${this._exos.length ? `<div class="sa-bas-fixe">
        <button class="sa-btn-plein" onclick="SeanceActivePage._ouvrirSeance(${this._commencee ? this._premierBlocNonFini() : 0})">
          ${this._commencee ? '▶ Reprendre la séance' : '▶ Démarrer la séance'}</button>
      </div>` : ''}`;
  },

  _retour() {
    this._envoyer(true);
    window.location.hash = '#entrainement';
  },

  _recommencer() {
    if (!confirm('Recommencer la séance à zéro ?\nLes séries déjà cochées seront effacées.')) return;
    this._oublier();
    this._s = this._exos.map(ex => Array.from({ length: this._nbSeries(ex) }, (_, k) => this._serieVide(ex, k)));
    this._notes = this._exos.map(() => '');
    this._secondes = 0;
    this._ressenti = null;
    this._dessinerApercu();
  },

  _ouvrirSeance(bi) {
    this._vue = 'seance';
    this._bloc = bi;
    this._dernierTic = Date.now();
    this._garderEcranAllume();
    this._dessinerSeance();
    requestAnimationFrame(() => { const p = document.getElementById('saPiste'); if (p) p.scrollLeft = bi * p.clientWidth; });
  },

  _fermerSeance() {
    this._fermerFeuille();
    this._envoyer(true);
    this._vue = 'apercu';
    this._dessinerApercu();
  },

  _dessinerSeance() {
    document.getElementById('saWrap').innerHTML = `
      <div class="sa-haut">
        <div class="sa-haut-ligne">
          <button class="sa-icone" aria-label="Fermer (la séance est gardée)" onclick="SeanceActivePage._fermerSeance()">⌄</button>
          <div class="sa-points" id="saPoints"></div>
          <span class="sa-icone" style="visibility:hidden"></span>
        </div>
        <div class="sa-totaux" id="saTotaux"></div>
      </div>
      <div class="sa-piste" id="saPiste">
        ${this._blocs.map((b, bi) => `<section class="sa-page" data-bloc="${bi}">${this._htmlBloc(b)}</section>`).join('')}
      </div>
      <div class="sa-bas" id="saBas"></div>`;
    this._majHaut();
    this._majBas();
    let fin;
    document.getElementById('saPiste').addEventListener('scroll', () => {
      clearTimeout(fin);
      fin = setTimeout(() => {
        const p = document.getElementById('saPiste');
        if (!p) return;
        const i = Math.round(p.scrollLeft / p.clientWidth);
        if (i !== this._bloc) { this._bloc = i; this._majHaut(); this._majBas(); }
      }, 90);
    });
  },

  _htmlBloc(b) {
    const ss = b.exos.length > 1;
    const amrap = this._amrapDuBloc(b);
    return `<div class="sa-page-bloc">Bloc ${b.lettre}${ss ? ' · superset, enchaîne les exercices' : ''}</div>` +
      (amrap !== undefined ? `<div class="sa-amrap-info">♾ ${escHtml(this._prescription(this._exos[amrap]))} : le plus de reps possible. Appuie sur « Démarrer » en bas.</div>` : '') +
      b.exos.map(i => {
        const ex = this._exos[i], te = this._type(ex), vid = this._videoId(ex);
        const derniere = this._derniereFois(ex), noteAvant = this._lastNotes[ex.exercice_id];
        const chrono = te === 'temps' && ex.reps_cible;
        return `
          <div class="sa-exo">
            <div class="sa-exo-tete"><div class="sa-exo-nom">${escHtml(ex.exercices_bdd?.nom || 'Exercice')}</div>${ss ? `<span class="sa-ss-tag">${this._lettreExo(b, i)}</span>` : ''}</div>
            <div class="sa-infos">
              ${vid ? `<button class="sa-vignette" style="background-image:url('https://img.youtube.com/vi/${vid}/mqdefault.jpg')" aria-label="Voir la vidéo" onclick="SeanceActivePage._ouvrirVideo(${i})"><span>▶</span></button>`
                    : '<div class="sa-vignette vide"><span>Pas de vidéo</span></div>'}
              <div class="sa-fiche">
                <div class="sa-fiche-l">Objectif <b>${escHtml(this._prescription(ex))}</b></div>
                <div class="sa-fiche-l">Charge <b>${escHtml(this._chargeTxt(ex) || '—')}</b></div>
                <div class="sa-fiche-l">Dernière fois <b>${escHtml(derniere || '—')}</b></div>
                <div class="sa-fiche-l">Repos <b>${escHtml(this._reposTxt(ex.repos_secondes ?? 90))}</b></div>
              </div>
            </div>
            ${ex.notes?.trim() ? `<div class="sa-consigne-exo"><b>Consigne du coach :</b> ${escHtml(ex.notes.trim())}</div>` : ''}
            ${ex.reps_secondaire ? `<div class="sa-consigne-exo"><b>2e effort :</b> après chaque série, pause de ${ex.repos_intra_sec || 10} s puis ${escHtml(ex.reps_secondaire)} reps.</div>` : ''}
            ${chrono ? `<button class="sa-btn-chrono" id="saChrono${i}" onclick="SeanceActivePage._startEffort(${i})">▶ Start · ${escHtml(this._dureeSuivante(i))}</button>` : ''}
            <div class="sa-series" id="saSeries${i}">${this._htmlSeries(i)}</div>
            <div class="sa-plus-moins">
              <button class="sa-rond" aria-label="Retirer une série" onclick="SeanceActivePage._changerSeries(${i}, -1)"
                ${this._s[i].length <= 1 || this._s[i][this._s[i].length - 1].fait ? 'disabled' : ''}>−</button>
              <span>Série</span>
              <button class="sa-rond" aria-label="Ajouter une série" onclick="SeanceActivePage._changerSeries(${i}, 1)">+</button>
            </div>
            ${noteAvant ? `<div class="sa-note-avant">Ta note la dernière fois : ${escHtml(noteAvant)}</div>` : ''}
            <input class="sa-note" placeholder="Note pour ton coach…" value="${escHtml(this._notes[i])}"
              oninput="SeanceActivePage._noter(${i}, this.value)">
          </div>`;
      }).join('');
  },

  _htmlSeries(i) {
    const ex = this._exos[i], te = this._type(ex);
    const col = { reps: 'Reps', temps: 'Durée', amrap: 'Score', distance: 'Distance' }[te] || 'Reps';
    return `<div class="sa-series-tete"><span>#</span><span>${col}</span><span>Kg</span><span></span></div>` +
      this._s[i].map((s, k) => {
        const conseil = this._kgConseil(i, k);
        return `
          <div class="sa-serie ${s.fait ? 'faite' : ''}">
            <span class="sa-serie-n">${k + 1}</span>
            <button class="sa-case ${s.reps === '' ? 'vide' : ''}" onclick="SeanceActivePage._ouvrirPave(${i}, ${k}, 'reps')">${escHtml(s.reps === '' ? (te === 'amrap' ? 'score' : '—') : s.reps)}</button>
            <button class="sa-case ${s.kg === '' ? 'vide' : ''}" onclick="SeanceActivePage._ouvrirPave(${i}, ${k}, 'kg')">${escHtml(s.kg === '' ? conseil : s.kg)}</button>
            <button class="sa-coche ${s.fait ? 'on' : ''}" aria-label="Série ${k + 1} faite" onclick="SeanceActivePage._cocher(${i}, ${k})">✓</button>
          </div>
          ${te === 'reps' && ex.reps_secondaire ? `
          <div class="sa-e2">
            <span></span>
            <div class="sa-e2-lib">↳ 2e effort
              <button class="sa-e2-val" onclick="SeanceActivePage._ouvrirPave(${i}, ${k}, 'e2')">${escHtml(s.e2 || '—')}</button> reps</div>
            <button class="sa-coche petite ${s.e2fait ? 'on' : ''}" aria-label="2e effort de la série ${k + 1} fait" onclick="SeanceActivePage._cocherE2(${i}, ${k})">✓</button>
          </div>` : ''}`;
      }).join('');
  },

  _majSeries(i) {
    const el = document.getElementById('saSeries' + i);
    if (el) el.innerHTML = this._htmlSeries(i);
    const chrono = document.getElementById('saChrono' + i);   // durée de la prochaine série
    if (chrono) chrono.textContent = '▶ Start · ' + this._dureeSuivante(i);
    this._majHaut();
  },

  _majBloc(i) {
    const bi = this._blocs.indexOf(this._blocDe(i));
    const sec = document.querySelector(`.sa-page[data-bloc="${bi}"]`);
    if (sec) sec.innerHTML = this._htmlBloc(this._blocs[bi]);
    this._majHaut();
  },

  _majHaut() {
    const pts = document.getElementById('saPoints');
    if (!pts) return;
    pts.innerHTML = this._blocs.map((b, i) =>
      `<button class="sa-point ${i === this._bloc ? 'ici' : ''} ${this._blocFait(b) ? 'fait' : ''}" aria-label="Bloc ${b.lettre}" onclick="SeanceActivePage._allerBloc(${i})"></button>`).join('');
    const t = this._totaux();
    document.getElementById('saTotaux').innerHTML = `<span><b>${t.reps}</b>reps</span><span><b>${t.kg}</b>kg soulevés</span>`;
  },

  _allerBloc(i) {
    const p = document.getElementById('saPiste');
    if (!p) return;
    i = Math.max(0, Math.min(this._blocs.length - 1, i));
    p.scrollTo({ left: i * p.clientWidth, behavior: 'smooth' });
  },

  _majBas() {
    const bas = document.getElementById('saBas');
    if (!bas) return;
    const dernier = this._bloc >= this._blocs.length - 1;
    const repos = this._reposBloc(), b = this._blocs[this._bloc], amrap = b && this._amrapDuBloc(b);
    let centre = repos > 0 ? `<button class="sa-minut" onclick="SeanceActivePage._recup()">💤 Récup · ${this._fmt(repos)}</button>` : '';
    if (amrap !== undefined && !this._amrapAttente.has(this._bloc) && (this._amrapNb[this._bloc] || 0) < this._nbSeries(this._exos[amrap]) && !this._blocFait(b)) {
      centre = `<button class="sa-minut vert" onclick="SeanceActivePage._startEffort(${amrap})">▶ Démarrer · ${escHtml(this._dureeSuivante(amrap))}</button>`;
    }
    if (this._mt) {
      const p = this._mt.phases[this._mt.i], r = this._restant();
      const frac = p.monte ? (r % 60) / 60 : Math.max(0, r / p.dur);
      const C = 2 * Math.PI * 28;
      centre = `<button class="sa-anneau-btn" aria-label="Ouvrir le minuteur" onclick="SeanceActivePage._feuilleMinuteurActif()">
        <div class="sa-anneau"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" style="stroke:var(--border-solid)" stroke-width="6"/>
          <circle cx="32" cy="32" r="28" fill="none" class="${p.travail ? 'travail' : 'repos'}" stroke-width="6" stroke-linecap="round"
            stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - frac)).toFixed(1)}"/></svg>
          <div class="t">${this._fmt(r)}</div></div>
        <div class="sa-anneau-lib">${escHtml(this._mt.lib)}</div></button>`;
    }
    bas.innerHTML = `
      <button class="sa-nav" onclick="SeanceActivePage._allerBloc(${this._bloc - 1})" ${this._bloc === 0 ? 'disabled' : ''}><span class="fl">←</span>Précédent</button>
      <div>${centre}</div>
      ${dernier ? `<button class="sa-nav fin" onclick="SeanceActivePage._terminer()"><span class="fl">✓</span>Terminer</button>`
                : `<button class="sa-nav" onclick="SeanceActivePage._allerBloc(${this._bloc + 1})"><span class="fl">→</span>Suivant</button>`}`;
  },

  // ── Saisie ──────────────────────────────────────────────────────────────────

  _noter(i, v) {
    this._notes[i] = v;
    this._garder();
  },

  _changerSeries(i, d) {
    const l = this._s[i];
    if (d > 0) l.push({ ...this._serieVide(this._exos[i], l.length), kg: l[l.length - 1]?.kg || '' });
    else if (l.length > 1 && !l[l.length - 1].fait) l.pop();
    this._garder();
    this._majBloc(i);
  },

  // Cocher une série : pause du 2e effort s'il y en a un, sinon repos
  _cocher(i, k) {
    const s = this._s[i][k], ex = this._exos[i];
    s.fait = !s.fait;
    if (!s.fait) s.e2fait = false;
    if (s.fait && s.kg === '') s.kg = this._kgConseil(i, k);
    this._garder();
    this._majSeries(i);
    if (!s.fait) return;
    this._bip(0, 1);   // débloque le son sur iPhone (il faut un geste du client)
    if (this._type(ex) === 'reps' && ex.reps_secondaire && !s.e2fait) {
      this._lancerMinuteur({ type: 'repos', lib: 'Pause 2e effort', phases: [{ nom: 'Pause avant le 2e effort', dur: ex.repos_intra_sec || 10 }] });
      return;
    }
    this._reposApres(i);
  },

  _cocherE2(i, k) {
    const s = this._s[i][k];
    s.e2fait = !s.e2fait;
    if (s.e2fait && !s.fait) { s.fait = true; if (s.kg === '') s.kg = this._kgConseil(i, k); }
    this._garder();
    this._majSeries(i);
    if (s.e2fait) this._reposApres(i);
  },

  _reposApres(i) {
    const b = this._blocDe(i), ex = this._exos[i];
    if (b.exos.length > 1 && b.exos[b.exos.length - 1] !== i) {
      const suiv = this._exos[b.exos[b.exos.indexOf(i) + 1]];
      toast('Enchaîne : ' + escHtml(suiv.exercices_bdd?.nom || 'exercice suivant'), 'info', 1800);
      return;
    }
    if (this._blocFait(b)) toast(`Bloc ${b.lettre} terminé 💪`, 'success', 1800);
    if (this._amrapDuBloc(b) !== undefined) { this._majBas(); return; }   // AMRAP : récup lancée par le client
    const repos = ex.repos_secondes ?? 90;
    if (repos > 0) this._lancerMinuteur({ type: 'repos', lib: 'Repos', phases: [{ nom: 'Repos', dur: repos }] });
  },

  // Repos du bloc affiché : celui du dernier exercice (fin du tour en superset)
  _reposBloc() {
    const b = this._blocs[this._bloc];
    const ex = b && this._exos[b.exos[b.exos.length - 1]];
    return ex ? (ex.repos_secondes ?? 90) : 0;
  },

  // Exercice AMRAP du bloc (avec sa durée), s'il y en a un
  _amrapDuBloc(b) { return b.exos.find(i => this._type(this._exos[i]) === 'amrap' && this._exos[i].reps_cible); },

  _recup() {
    this._bip(0, 1);
    this._amrapAttente.delete(this._bloc);   // après la récup, l'AMRAP suivant peut démarrer
    const repos = this._reposBloc();
    if (repos > 0) this._lancerMinuteur({ type: 'repos', lib: 'Repos', phases: [{ nom: 'Repos', dur: repos }] });
  },

  // AMRAP fini ou arrêté : compté, puis « Récup » avant le suivant
  _finAmrap(mt) {
    if (mt.bloc == null) return;
    this._amrapNb[mt.bloc] = (this._amrapNb[mt.bloc] || 0) + 1;
    this._amrapAttente.add(mt.bloc);
  },

  // Durée de la prochaine série : AMRAP = suivant de son bloc, durée = 1re série pas cochée
  _dureeSuivante(i) {
    const ex = this._exos[i];
    let k;
    if (this._type(ex) === 'amrap') k = this._amrapNb[this._blocs.indexOf(this._blocDe(i))] || 0;
    else { k = (this._s[i] || []).findIndex(s => !s.fait); if (k < 0) k = 0; }
    return this._cible(ex, Math.min(k, this._nbSeries(ex) - 1)).reps || ex.reps_cible || '';
  },

  // AMRAP ou exercice en durée : 10 s de préparation puis l'effort, avec annonces
  _startEffort(i) {
    const ex = this._exos[i];
    const dur = this._enSecondes(this._dureeSuivante(i));
    this._dire('Prépare-toi');   // aussi pour débloquer la voix sur iPhone (geste du client)
    const amrap = this._type(ex) === 'amrap';
    this._lancerMinuteur({ type: 'effort', annonces: true, lib: amrap ? 'AMRAP' : 'Effort',
      bloc: amrap ? this._blocs.indexOf(this._blocDe(i)) : null, phases: [
      { nom: 'Prépare-toi', dur: 10 },
      { nom: ex.exercices_bdd?.nom || 'Effort', dur, travail: true },
    ] });
    this._feuilleMinuteurActif();
  },

  _enSecondes(val) {
    const v = String(val || '');
    const mmss = v.match(/^(\d+):(\d{1,2})$/);
    if (mmss) return parseInt(mmss[1]) * 60 + parseInt(mmss[2]);
    const min = v.match(/(\d+)\s*(?:min|m)\b/i);
    if (min) return parseInt(min[1]) * 60;
    const n = parseInt(v);
    return isNaN(n) ? 300 : (/s\b|sec/i.test(v) ? n : n * 60);
  },

  // ── Pavé numérique ──────────────────────────────────────────────────────────

  _ouvrirPave(i, k, champ) {
    const s = this._s[i][k];
    this._pave = { i, k, champ, val: String(champ === 'kg' ? s.kg : champ === 'e2' ? s.e2 : s.reps), neuf: true };
    this._feuillePave();
  },

  _feuillePave() {
    const { i, k, champ } = this._pave;
    const ex = this._exos[i], te = this._type(ex);
    const kg = champ === 'kg';
    const unite = kg ? 'kg' : champ === 'e2' ? 'reps' : { temps: 'durée', distance: 'distance', amrap: 'score' }[te] || 'reps';
    const sep = kg || te === 'distance' ? ',' : te === 'temps' && champ === 'reps' ? ':' : '';
    const conseil = kg ? this._kgConseil(i, k) : '';
    const s = this._s[i][k];
    const touche = n => `<button class="sa-touche" onclick="SeanceActivePage._taper('${n}')">${n}</button>`;
    this._feuille(`
      <div class="sa-f-titre"><div style="min-width:0;"><h2>${escHtml(ex.exercices_bdd?.nom || 'Exercice')}</h2>
        <div class="sa-f-sous">Série ${k + 1}${champ === 'e2' ? ' · 2e effort' : ''}</div></div>
        <button class="sa-icone" aria-label="Fermer" onclick="SeanceActivePage._fermerFeuille()">⌄</button></div>
      <div class="sa-pave-val"><span class="v">${escHtml(this._pave.val || '0')}</span><span class="sa-unite">${unite}</span></div>
      <div class="sa-pave">
        ${touche(1)}${touche(2)}${touche(3)}
        <button class="sa-act bleu" onclick="SeanceActivePage._validerPave(true)">${champ === 'e2' ? (s.e2fait ? 'OK' : 'Valider le<br>2e effort') : (s.fait ? 'OK' : 'Valider<br>la série')}</button>
        ${touche(4)}${touche(5)}${touche(6)}
        <button class="sa-act clair" onclick="SeanceActivePage._validerPave(false)">OK</button>
        ${touche(7)}${touche(8)}${touche(9)}
        ${conseil ? `<button class="sa-act gris" onclick="SeanceActivePage._pave.val='${escJs(conseil)}';SeanceActivePage._pave.neuf=false;SeanceActivePage._feuillePave()">Comme avant<br>${escHtml(conseil)} kg</button>` : '<span></span>'}
        ${sep ? touche(sep) : '<span></span>'}${touche(0)}
        <button class="sa-touche" aria-label="Effacer" onclick="SeanceActivePage._effacer()">⌫</button><span></span>
      </div>`);
  },

  _taper(c) {
    const p = this._pave;
    if (p.neuf) { p.val = ''; p.neuf = false; }
    if (p.val.length < 7) p.val += c;
    this._feuillePave();
  },

  _effacer() {
    const p = this._pave;
    p.val = p.neuf ? '' : p.val.slice(0, -1);
    p.neuf = false;
    this._feuillePave();
  },

  _validerPave(etCocher) {
    const { i, k, champ, val } = this._pave;
    const s = this._s[i][k];
    s[champ] = val;
    this._fermerFeuille();
    this._garder();
    this._majSeries(i);
    if (!etCocher) return;
    if (champ === 'e2') { if (!s.e2fait) this._cocherE2(i, k); }
    else if (!s.fait) this._cocher(i, k);
  },

  // ── Minuteurs ───────────────────────────────────────────────────────────────

  _lancerMinuteur(m) {
    if (m.type === 'repos' && this._mt?.type === 'effort') return;   // ne coupe pas un AMRAP en cours
    this._mt = { ...m, i: 0, debutPhase: Date.now(), pauseA: null };
    this._bip(660);
    this._fermerFeuille();
    this._majBas();
  },

  _restant() {
    const p = this._mt.phases[this._mt.i];
    const ecoule = ((this._mt.pauseA || Date.now()) - this._mt.debutPhase) / 1000;
    return p.monte ? ecoule : p.dur - ecoule;
  },

  _feuilleMinuteurActif() {
    const mt = this._mt;
    if (!mt) return this._fermerFeuille();
    const p = mt.phases[mt.i], r = this._restant();
    const frac = p.monte ? 0 : Math.max(0, 1 - r / p.dur);
    const html = `<div id="saMtActif">
      <div class="sa-f-titre"><h2>${escHtml(mt.lib)}</h2><button class="sa-icone" aria-label="Réduire" onclick="SeanceActivePage._fermerFeuille()">⌄</button></div>
      <div class="sa-phase ${p.travail ? 'travail' : 'repos'}">${escHtml(p.nom)}</div>
      <div class="sa-grand-temps">${this._fmt(r)}</div>
      ${p.monte ? '' : `<div class="sa-barre"><div style="width:${(frac * 100).toFixed(1)}%"></div></div>`}
      <div class="sa-ligne-btn">
        <button class="noir" onclick="SeanceActivePage._stopMinuteur()">${mt.type === 'repos' ? 'Passer' : 'Arrêter'}</button>
      </div></div>`;
    const ex = document.getElementById('saMtActif');
    if (ex) ex.outerHTML = html; else this._feuille(html);
  },

  _stopMinuteur() {
    if (this._mt) this._finAmrap(this._mt);
    this._mt = null;
    this._fermerFeuille();
    this._majBas();
  },

  // ── Vidéo ───────────────────────────────────────────────────────────────────

  _ouvrirVideo(i) {
    const ex = this._exos[i], vid = this._videoId(ex);
    if (!vid) return;
    this._feuille(`
      <div class="sa-f-titre"><h2>${escHtml(ex.exercices_bdd?.nom || 'Exercice')}</h2>
        <button class="sa-icone" aria-label="Fermer" onclick="SeanceActivePage._fermerFeuille()">⌄</button></div>
      <div class="sa-video"><iframe src="https://www.youtube.com/embed/${vid}?rel=0&playsinline=1&autoplay=1" frameborder="0"
        allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
      ${ex.notes?.trim() ? `<div class="sa-consigne-exo"><b>Consigne du coach :</b> ${escHtml(ex.notes.trim())}</div>` : ''}`);
  },

  // ── Feuille (fenêtre qui monte du bas) ──────────────────────────────────────

  _feuille(html) {
    let v = document.getElementById('saVoile');
    if (!v) {
      v = document.createElement('div');
      v.id = 'saVoile';
      v.className = 'sa-voile';
      v.onclick = e => { if (e.target === v) this._fermerFeuille(); };
      document.getElementById('saWrap').appendChild(v);
    }
    // Feuille déjà ouverte : on remplace son contenu sans rejouer l'animation
    const f = v.querySelector('.sa-feuille');
    if (f) f.innerHTML = `<div class="sa-poignee"></div>${html}`;
    else v.innerHTML = `<div class="sa-feuille"><div class="sa-poignee"></div>${html}</div>`;
  },

  _fermerFeuille() {
    document.getElementById('saVoile')?.remove();
    this._pave = null;
  },

  // ── Fin de séance ───────────────────────────────────────────────────────────

  _terminer() {
    this._fermerFeuille();
    this._envoyer(true);
    this._vue = 'fin';
    this._dessinerFin();
    setTimeout(() => { const t = document.getElementById('saTrophee'); if (t && typeof launchConfetti === 'function') launchConfetti(t); }, 200);
  },

  _dessinerFin() {
    const t = this._totaux(), nf = this._seriesFaites(), tot = this._s.reduce((n, l) => n + l.length, 0);
    const ressentis = [['dur', '😓', 'Difficile'], ['bien', '😊', 'Bien'], ['feu', '🤩', 'En feu !']];
    document.getElementById('saWrap').innerHTML = `
      <div class="sa-ap-corps" style="padding-top:28px;">
        <div style="text-align:center;"><div id="saTrophee" style="display:inline-block;position:relative;font-size:56px;">🏆</div>
          <div class="sa-ap-nom" style="margin-top:4px;">Séance terminée !</div>
          <div class="sa-ap-meta">${escHtml(this._seance.nom || '')}</div></div>
        ${nf < tot ? `<div class="sa-reprise">⚠️ <div><b>${tot - nf} série${tot - nf > 1 ? 's' : ''} pas cochée${tot - nf > 1 ? 's' : ''}.</b> Tu peux revenir les faire, ou enregistrer quand même : seules les séries cochées comptent.</div></div>` : ''}
        <div class="sa-stats">
          <div class="sa-stat"><b>${nf}/${tot}</b><span>Séries</span></div>
          <div class="sa-stat"><b>${t.kg}</b><span>kg soulevés</span></div>
          <div class="sa-stat"><b>${this._fmt(this._secondes)}</b><span>Durée</span></div>
        </div>
        <div class="sa-ap-bloc-titre" style="margin-top:22px;">Comment s'est passée ta séance ?</div>
        <div class="sa-ressentis">${ressentis.map(([k, e, l]) => `
          <button class="sa-ressenti ${this._ressenti === k ? 'on' : ''}" onclick="SeanceActivePage._choisirRessenti('${k}')"><span class="e">${e}</span>${l}</button>`).join('')}</div>
        <button class="sa-lien" style="display:block;margin:22px auto 0;" onclick="SeanceActivePage._abandonner()">Abandonner sans enregistrer</button>
      </div>
      <div class="sa-bas-fixe" style="display:flex;gap:10px;">
        <button class="sa-btn-plein gris" style="flex:0 0 34%;" onclick="SeanceActivePage._ouvrirSeance(SeanceActivePage._premierBlocNonFini())">‹ Revenir</button>
        <button class="sa-btn-plein" id="saEnregistrer" ${this._ressenti ? '' : 'disabled'} onclick="SeanceActivePage._enregistrer()">
          ${this._ressenti ? '✓ Enregistrer la séance' : 'Choisis ton ressenti'}</button>
      </div>`;
  },

  _choisirRessenti(k) {
    this._ressenti = k;
    this._garder();
    this._dessinerFin();
  },

  async _abandonner() {
    if (!confirm('Abandonner la séance ?\nTes séries cochées ne seront pas enregistrées.')) return;
    await this._oublier();
    this._arreter();
    window.location.hash = '#entrainement';
  },

  async _enregistrer() {
    if (!this._seriesFaites() && !confirm('Aucune série cochée. Enregistrer quand même la séance ?')) return;
    const btn = document.getElementById('saEnregistrer');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enregistrement…'; }
    try {
      const p = Router.userProfile;
      const d = new Date();
      const log = await db.upsertSeanceLog({
        client_id:      p.id,
        programme_id:   this._progId,
        seance_id:      this._seance.id,
        nom_seance:     this._seance.nom,
        date_seance:    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        duree_secondes: Math.round(this._secondes),
        note_ressenti:  this._ressenti,
      });
      // Même format qu'avant : une série = { reps, charge } ; 2e effort noté « 5→8 »
      await db.saveSeanceSets(log.id, this._exos.map((ex, i) => ({
        exercice_id:             ex.exercice_id,
        client_prog_exercice_id: ex.id,
        type_effort:             this._type(ex),
        note_client:             this._notes[i].trim() || null,
        sets_data: this._s[i].filter(s => s.fait).map(s => ({
          reps:   s.e2fait ? `${s.reps}→${s.e2}` : s.reps,
          charge: String(s.kg).trim().replace(',', '.'),
        })),
      })));
      await this._oublier();
      this._arreter();
      toast('💪 Séance enregistrée !', 'success');
      setTimeout(() => { window.location.hash = '#entrainement'; }, 600);
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = '✓ Enregistrer la séance'; }
      toast('Erreur : ' + escHtml(e.message), 'error');
    }
  },
};
