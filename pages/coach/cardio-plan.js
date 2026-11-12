// APEX APP — Coach : plan cardio (HYROX…), modèle de la bibliothèque ou plan d'un client
// Onglets = phases (« HYROX prépa 1 »…), colonnes = séances numérotées en texte
// libre, comme les Google Sheets du studio. Plan d'un client : case « faite »
// (date, coach), note (temps réalisé…), repère « à modifier ». Tout s'enregistre
// tout seul, comme la grille du studio. Tous les coachs ; le client ne voit rien.
// Mouvements de la phase (12 novembre 2026) : liste de mouvements en couleur
// (phase.mouvements), placés dans le texte des séances ({{m:id}} ou {{m:id*0.5}}) ;
// changer un mouvement dans la liste le change dans toutes les séances de la phase.
// Plan d'un client : score de la séance 1 par mouvement ; un mouvement placé avec un
// coefficient affiche coefficient × score (comme =PRODUIT($A$8;0,5) dans les Sheets).
//   route coach-cardio-modele : { modeleId }        (bibliothèque)
//   route coach-cardio-plan   : { clientId, planId } (fiche › Entraînement)

// Où en est un plan cardio (lu par db.getCardioPlans) : phase en cours = celle de la
// prochaine séance à faire (la première non cochée après la dernière cochée) ;
// tout est fait : la dernière phase. Utilisé par fiche › Infos et le résumé de la fiche.
function avancementCardio(plan) {
  const phases = [...(plan.cardio_phases || [])].sort((a, b) => a.ordre - b.ordre)
    .map(ph => ({ ...ph, seances: [...(ph.cardio_seances || [])].sort((a, b) => a.ordre - b.ordre) }));
  const toutes = phases.flatMap(ph => ph.seances);
  let prochaine = null;
  phases.forEach(ph => ph.seances.forEach((s, i) => { if (s.faite) prochaine = null; else if (!prochaine) prochaine = { phase: ph, n: i + 1 }; }));
  const phase = prochaine ? prochaine.phase : phases[phases.length - 1] || null;
  return {
    phases, phase, prochaine,
    faites: toutes.filter(s => s.faite).length, total: toutes.length,
    faitesPhase: phase ? phase.seances.filter(s => s.faite).length : 0,
  };
}

const CoachCardioPlanPage = {
  cote: 'plan',        // 'modele' | 'plan'
  data: null,          // { id, nom, actif?, phases: [{ id, nom, ordre, seances: [...] }] }
  clientId: null,
  _phase: 0,           // index de l'onglet ouvert
  _timers: {},
  _attente: {},

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="cpcTitre">Plan cardio</div>
        </div>
        <span id="cpcEtat" class="cpc-etat"></span>
      </div>
      <div id="cpcNav"></div>
      <div id="cpcContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    this._envoyerAttente();
    const params = Router.getParams();
    this.cote = Router.currentPage === 'coach-cardio-modele' || params.modeleId ? 'modele' : 'plan';
    this.clientId = params.clientId || null;
    const id = this.cote === 'modele' ? params.modeleId : params.planId;
    const jeton = this._jeton = {};
    this.data = null;
    if (!id) { window.location.hash = this.cote === 'modele' ? '#coach-cardio-modeles' : '#coach-clients'; return; }
    document.getElementById('cpcNav').innerHTML = this.cote === 'modele'
      ? biblioNav('coach-cardio-modeles')
      : coachClientNav(this.clientId, 'coach-cardio-plan') + '<div id="cpcPlans"></div>';
    if (this.cote === 'plan') barrePlansClient(this.clientId, id).then(html => {
      if (jeton === this._jeton && document.getElementById('cpcPlans')) document.getElementById('cpcPlans').innerHTML = html;
    });
    try {
      const data = await db.getCardio(this.cote, id);
      if (jeton !== this._jeton) return;
      this.data = data;
      // Plan d'un client : ouvrir la phase de la prochaine séance à faire
      const memo = sessionStorage.getItem('cpcPhase_' + id);
      if (memo !== null && data.phases[+memo]) this._phase = +memo;
      else if (this.cote === 'plan') {
        const i = data.phases.findIndex(ph => ph.seances.some(s => !s.faite));
        this._phase = i >= 0 ? i : Math.max(0, data.phases.length - 1);
      } else this._phase = 0;
      this._render();
    } catch (e) {
      if (jeton !== this._jeton) return;
      document.getElementById('cpcContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  _etat(texte, erreur = false) {
    const el = document.getElementById('cpcEtat');
    if (!el) return;
    el.textContent = texte;
    el.classList.toggle('erreur', erreur);
  },

  // ── Affichage ─────────────────────────────────────────────────────────────
  _render() {
    this._envoyerAttente();
    EmojiPicker.fermer();
    this.fermerMenu();
    const d = this.data;
    const plan = this.cote === 'plan';
    document.getElementById('cpcTitre').textContent = (plan ? 'Plan cardio — ' : 'Modèle cardio — ') + (d.nom || '');
    const phase = d.phases[this._phase];
    // Prochaine séance à faire (toutes phases confondues), surlignée
    let prochaine = null;
    if (plan) for (const ph of d.phases) { prochaine = ph.seances.find(s => !s.faite); if (prochaine) break; }

    const onglets = d.phases.map((ph, i) => {
      const faites = ph.seances.filter(s => s.faite).length;
      return `<button class="cpc-onglet ${i === this._phase ? 'on' : ''}" data-phase="${i}" title="Glisser pour changer l'ordre"
        onclick="CoachCardioPlanPage.ouvrirPhase(${i})" onpointerdown="CoachCardioPlanPage._ddPhase(event, ${i})">
        ${escHtml(ph.nom || 'Phase')}${plan && ph.seances.length ? `<span class="cpc-compte">${faites}/${ph.seances.length}</span>` : ''}</button>`;
    }).join('');

    const colonnes = phase ? phase.seances.map((s, i) => `
      <div class="cpc-seance ${s.a_modifier ? 'a-modifier' : ''} ${s.faite ? 'faite' : ''} ${prochaine && prochaine.id === s.id ? 'prochaine' : ''}">
        <div class="cpc-seance-tete">
          <span class="cpc-num">${i + 1}</span>
          ${plan ? `<label class="cpc-faite" title="Séance faite">
            <input type="checkbox" ${s.faite ? 'checked' : ''} onchange="CoachCardioPlanPage.cocher('${s.id}', this.checked)">
            <span>${s.faite ? `Faite${s.faite_le ? ' le ' + new Date(s.faite_le + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}` : 'À faire'}</span>
          </label>` : ''}
          <span class="cpc-outils">
            <button title="Placer un mouvement de la phase (ou taper @)" onclick="CoachCardioPlanPage.menuMouvements(this, '${s.id}')">🎨</button>
            <button title="Ajouter un emoji" onclick="CoachCardioPlanPage.emojis(this, '${s.id}')">😀</button>
            <button title="Vers la gauche" onclick="CoachCardioPlanPage.deplacerSeance('${s.id}', -1)" ${i === 0 ? 'disabled' : ''}>‹</button>
            <button title="Vers la droite" onclick="CoachCardioPlanPage.deplacerSeance('${s.id}', 1)" ${i === phase.seances.length - 1 ? 'disabled' : ''}>›</button>
            <button title="Supprimer la séance" onclick="CoachCardioPlanPage.supprimerSeance('${s.id}')">×</button>
          </span>
        </div>
        <input class="cpc-titre" placeholder="Titre (ex. AVEC CYRIL)" value="${escHtml(s.titre || '')}"
          oninput="CoachCardioPlanPage.saisir('${s.id}', 'titre', this.value)" onfocus="CoachCardioPlanPage._champ = this" data-champ="titre" data-seance="${s.id}">
        <div class="cpc-contenu cpc-editeur" contenteditable="true" data-placeholder="For Time&#10;1000m Run&#10;3 rounds…"
          oninput="CoachCardioPlanPage.saisirContenu(this)" onfocus="CoachCardioPlanPage._champ = this"
          onkeydown="CoachCardioPlanPage._touche(event, this)" onpaste="CoachCardioPlanPage._coller(event)"
          onclick="CoachCardioPlanPage._clicEditeur(event, this)"
          ondragover="CoachCardioPlanPage._survolGlisser(event)" ondrop="CoachCardioPlanPage._deposer(event, this)"
          data-champ="contenu" data-seance="${s.id}">${cardioContenuHtml(s.contenu, phase.mouvements, true)}</div>
        ${plan ? `<textarea class="cpc-note" rows="2" placeholder="Note (temps réalisé, remarques…)"
          oninput="CoachCardioPlanPage.saisir('${s.id}', 'note', this.value)" onfocus="CoachCardioPlanPage._champ = this" data-champ="note" data-seance="${s.id}">${escHtml(s.note || '')}</textarea>` : ''}
        <label class="cpc-modifier"><input type="checkbox" ${s.a_modifier ? 'checked' : ''}
          onchange="CoachCardioPlanPage.marquer('${s.id}', this.checked)"> À modifier</label>
      </div>`).join('') : '';

    document.getElementById('cpcContent').innerHTML = `
      <div class="cpc-barre">
        <input class="input cpc-nom" value="${escHtml(d.nom || '')}" placeholder="Nom du plan"
          oninput="CoachCardioPlanPage.saisirNom(this.value)">
        ${plan ? `
          ${d.actif === false ? '<span class="cpc-archive">Archivé</span>' : ''}
          <div class="cp-lieu" title="Studio : coachs seulement. Distance : le client voit le plan et coche ses séances.">
            <button class="${d.lieu !== 'distance' ? 'on' : ''}" onclick="CoachCardioPlanPage.changerLieu('studio')">Studio</button>
            <button class="${d.lieu === 'distance' ? 'on' : ''}" onclick="CoachCardioPlanPage.changerLieu('distance')">Distance</button>
          </div>
          <button class="btn btn-secondary btn-small" onclick="Router.navigate('coach-client-programme',{clientId:'${this.clientId}'})">‹ Entraînement</button>
          <button class="btn btn-secondary btn-small" onclick="CoachCardioPlanPage.archiver(${d.actif === false})">${d.actif === false ? 'Réactiver' : 'Archiver'}</button>`
          : `<button class="btn btn-secondary btn-small" onclick="window.location.hash='#coach-cardio-modeles'">‹ Plans cardio</button>`}
      </div>
      <div class="cpc-onglets">${onglets}
        <button class="cpc-onglet ajout" onclick="CoachCardioPlanPage.ajouterPhase()">+ Phase</button>
      </div>
      ${phase ? `
      <div class="cpc-phase-barre">
        <input class="input cpc-phase-nom" value="${escHtml(phase.nom || '')}" placeholder="Nom de la phase"
          oninput="CoachCardioPlanPage.saisirPhase('${phase.id}', this.value)">
        <button class="btn btn-ghost btn-small" style="color:var(--error);" onclick="CoachCardioPlanPage.supprimerPhase()">Supprimer la phase</button>
      </div>
      <div class="cpm-barre" id="cpmBarre">${this._barreMouvements(phase)}</div>
      <div class="cpc-colonnes">
        ${colonnes}
        <button class="cpc-ajout-seance" onclick="CoachCardioPlanPage.ajouterSeance()">+ Séance</button>
      </div>` : '<div class="card">Aucune phase. Ajoute la première avec « + Phase ».</div>'}`;
    // La prochaine séance à faire est visible sans défiler
    document.querySelector('.cpc-seance.prochaine')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  },

  ouvrirPhase(i) {
    if (this._glisse) return;   // fin d'un glisser-déposer, pas un clic
    this._phase = i;
    try { sessionStorage.setItem('cpcPhase_' + this.data.id, i); } catch (_) {}
    this._render();
  },

  _seance(id) {
    for (const ph of this.data.phases) { const s = ph.seances.find(x => x.id === id); if (s) return s; }
    return null;
  },

  // ── Saisies : enregistrées 0,6 s après la dernière frappe ────────────────
  _programmer(cle, envoi) {
    this._etat('Enregistrement…');
    this._attente[cle] = envoi;
    clearTimeout(this._timers[cle]);
    this._timers[cle] = setTimeout(() => this._envoyer(cle), 600);
  },

  async _envoyer(cle) {
    clearTimeout(this._timers[cle]);
    delete this._timers[cle];
    const envoi = this._attente[cle];
    delete this._attente[cle];
    if (!envoi) return;
    try { await envoi(); this._etat('✓ Enregistré'); }
    catch (e) { this._etat('Erreur : ' + e.message, true); }
  },

  // Avant de redessiner ou de quitter : tout ce qui attend part tout de suite
  _envoyerAttente() {
    for (const cle of Object.keys(this._timers || {})) this._envoyer(cle);
  },

  saisir(id, champ, valeur) {
    const s = this._seance(id);
    if (s) s[champ] = valeur;
    const cote = this.cote;
    this._programmer(`${id}_${champ}`, () => db.majCardioSeance(cote, id, { [champ]: valeur.trim() ? valeur : null }));
  },

  saisirNom(valeur) {
    this.data.nom = valeur;
    const cote = this.cote, id = this.data.id;
    if (valeur.trim()) this._programmer('nom', () => db.majCardioRacine(cote, id, { nom: valeur.trim() }));
  },

  saisirPhase(id, valeur) {
    const ph = this.data.phases.find(p => p.id === id);
    if (ph) ph.nom = valeur;
    const btn = document.querySelectorAll('.cpc-onglet')[this._phase];
    if (btn) btn.firstChild.textContent = valeur || 'Phase';
    const cote = this.cote;
    this._programmer(`phase_${id}`, () => db.majCardioPhase(cote, id, { nom: valeur.trim() || 'Phase' }));
  },

  // ── Emojis : insérés à l'endroit du curseur, dans le dernier champ utilisé de la séance ──
  _champ: null,

  emojis(btn, seanceId) {
    EmojiPicker.ouvrir(btn, e => this._insererEmoji(seanceId, e));
  },

  _insererEmoji(seanceId, emoji) {
    let champ = this._champ;
    if (!champ || !champ.isConnected || champ.dataset.seance !== seanceId) {
      champ = document.querySelector(`[data-seance="${seanceId}"][data-champ="contenu"]`);
    }
    if (!champ) return;
    if (champ.isContentEditable) { this._insererDans(champ, document.createTextNode(emoji)); return; }
    const debut = champ.selectionStart ?? champ.value.length, fin = champ.selectionEnd ?? debut;
    champ.value = champ.value.slice(0, debut) + emoji + champ.value.slice(fin);
    champ.focus();
    champ.setSelectionRange(debut + emoji.length, debut + emoji.length);
    this._champ = champ;
    this.saisir(seanceId, champ.dataset.champ, champ.value);
  },

  // ── Mouvements de la phase ───────────────────────────────────────────────
  _phaseCourante() { return this.data.phases[this._phase]; },

  _barreMouvements(phase) {
    const liste = phase.mouvements || [];
    return `
      <span class="cpm-titre" title="Comme les cases de couleur du Google Sheet : un mouvement changé ici change dans toutes les séances de la phase">Mouvements de la phase</span>
      ${liste.map(m => `
        <span class="cpm-item" style="background:${escHtml(m.couleur)}">
          <span class="cpm-poignee" draggable="true" title="Glisser dans le texte d'une séance"
            ondragstart="CoachCardioPlanPage._debutGlisser(event, '${m.id}')" ondragend="CoachCardioPlanPage._glisseMvt = null">⠿</span>
          <button class="cpm-couleur" title="Changer la couleur" onclick="CoachCardioPlanPage.couleurMouvement('${m.id}')">🎨</button>
          <input value="${escHtml(m.nom || '')}" placeholder="Mouvement" size="${Math.max(6, (m.nom || '').length + 1)}"
            oninput="this.size = Math.max(6, this.value.length + 1); CoachCardioPlanPage.renommerMouvement('${m.id}', this.value)">
          ${this.cote === 'plan' ? `<input class="cpm-score" inputmode="decimal" placeholder="score" value="${m.score != null ? escHtml(cardioNombre(m.score)) : ''}"
            title="Score du client à la séance 1 (test)" oninput="CoachCardioPlanPage.scoreMouvement('${m.id}', this.value)">` : ''}
          <button class="cpm-retirer" title="Retirer ce mouvement" onclick="CoachCardioPlanPage.retirerMouvement('${m.id}')">×</button>
        </span>`).join('')}
      <button class="btn btn-secondary btn-small" onclick="CoachCardioPlanPage.ajouterMouvement()">+ Mouvement</button>
      ${liste.length ? `<span class="cpm-aide">Dans une séance : glisse un mouvement par ⠿ à l'endroit voulu, ou 🎨 / « @ » pour le placer au curseur, avec un coefficient (0,5 = la moitié du score) ; clic sur un mouvement placé pour changer son coefficient.${this.cote === 'plan' ? ' « score » = résultat du client à la séance 1.' : ''}</span>` : ''}`;
  },

  _sauverMouvements(phase) {
    const cote = this.cote, id = phase.id, liste = phase.mouvements;
    this._programmer(`mvt_${id}`, () => db.majCardioPhase(cote, id, {
      mouvements: liste.map(m => ({ id: m.id, nom: (m.nom || '').trim(), couleur: m.couleur, ...(m.score != null ? { score: m.score } : {}) })),
    }));
  },

  ajouterMouvement(nom = '', apresAjout) {
    const phase = this._phaseCourante();
    if (!phase) return null;
    phase.mouvements = phase.mouvements || [];
    const prises = new Set(phase.mouvements.map(m => m.couleur));
    const couleur = CARDIO_COULEURS.find(c => !prises.has(c)) || CARDIO_COULEURS[phase.mouvements.length % CARDIO_COULEURS.length];
    const m = { id: Math.random().toString(36).slice(2, 8), nom, couleur };
    phase.mouvements.push(m);
    this._sauverMouvements(phase);
    document.getElementById('cpmBarre').innerHTML = this._barreMouvements(phase);
    if (!apresAjout) {
      const champs = document.querySelectorAll('#cpmBarre input');
      champs[champs.length - 1]?.focus();
    }
    return m;
  },

  renommerMouvement(id, nom) {
    const phase = this._phaseCourante();
    const m = (phase.mouvements || []).find(x => x.id === id);
    if (!m) return;
    m.nom = nom;
    this._majPastilles(m);
    this._sauverMouvements(phase);
  },

  _majPastilles(m) {
    document.querySelectorAll(`.cpc-editeur .cpm[data-m="${m.id}"]`).forEach(el => { el.innerHTML = cardioPastilleHtml(m, el.dataset.coef, true); });
  },

  scoreMouvement(id, valeur) {
    const phase = this._phaseCourante();
    const m = (phase.mouvements || []).find(x => x.id === id);
    if (!m) return;
    const n = parseFloat(String(valeur).replace(',', '.'));
    m.score = valeur.trim() === '' || isNaN(n) ? null : n;
    this._majPastilles(m);
    this._sauverMouvements(phase);
  },

  couleurMouvement(id) {
    const phase = this._phaseCourante();
    const m = (phase.mouvements || []).find(x => x.id === id);
    if (!m) return;
    m.couleur = CARDIO_COULEURS[(CARDIO_COULEURS.indexOf(m.couleur) + 1) % CARDIO_COULEURS.length];
    document.querySelectorAll(`.cpm[data-m="${id}"]`).forEach(el => { el.style.background = m.couleur; });
    document.getElementById('cpmBarre').innerHTML = this._barreMouvements(phase);
    this._sauverMouvements(phase);
  },

  // Retirer : dans les séances, le mouvement redevient du texte simple (son nom)
  retirerMouvement(id) {
    const phase = this._phaseCourante();
    const m = (phase.mouvements || []).find(x => x.id === id);
    if (!m) return;
    const jeton = new RegExp(`\\{\\{m:${id}(?:\\*([0-9.]+))?\\}\\}`, 'g');
    const utilisees = phase.seances.filter(s => new RegExp(jeton.source).test(s.contenu || ''));
    if (utilisees.length && !confirm(`« ${m.nom || 'Mouvement'} » est placé dans ${utilisees.length} séance${utilisees.length > 1 ? 's' : ''}.\n\nIl y restera écrit en texte simple, sans lien avec la liste. Le retirer ?`)) return;
    phase.mouvements = phase.mouvements.filter(x => x.id !== id);
    for (const s of utilisees) this.saisir(s.id, 'contenu',
      s.contenu.replace(jeton, (_, coef) => (coef ? cardioNombre(coef) + ' × ' : '') + (m.nom || '')));
    this._sauverMouvements(phase);
    this._render();
  },

  // Menu des mouvements à placer dans une séance (bouton 🎨 ou touche @)
  menuMouvements(ancre, seanceId) {
    this.fermerMenu();
    const phase = this._phaseCourante();
    const editeur = document.querySelector(`.cpc-editeur[data-seance="${seanceId}"]`);
    if (!phase || !editeur) return;
    const r = ancre.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'cpm-menu';
    menu.innerHTML = `
      <label class="cpm-menu-coef">Coefficient <input inputmode="decimal" placeholder="ex. 0,5"></label>
      ${(phase.mouvements || []).map(m => `
        <button data-m="${escHtml(m.id)}"><span class="cpm" style="background:${escHtml(m.couleur)}">${escHtml(m.nom || 'Mouvement')}</span></button>`).join('')}
      <div class="cpm-menu-nouveau"><input placeholder="Nouveau mouvement…"><button>+</button></div>`;
    document.body.appendChild(menu);
    menu.style.left = Math.min(r.left, window.innerWidth - menu.offsetWidth - 8) + 'px';
    menu.style.top = Math.min(r.bottom + 4, window.innerHeight - menu.offsetHeight - 8) + 'px';
    const coefChamp = menu.querySelector('.cpm-menu-coef input');
    const placer = m => { const coef = this._lireCoef(coefChamp.value); this.fermerMenu(); this._placerMouvement(editeur, m, coef); };
    menu.querySelectorAll('button[data-m]').forEach(b => b.onclick = () => placer(phase.mouvements.find(x => x.id === b.dataset.m)));
    const champ = menu.querySelector('.cpm-menu-nouveau input');
    const creer = () => { const nom = champ.value.trim(); if (nom) placer(this.ajouterMouvement(nom, true)); };
    menu.querySelector('.cpm-menu-nouveau button').onclick = creer;
    champ.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); creer(); } else if (e.key === 'Escape') this.fermerMenu(); };
    if (!(phase.mouvements || []).length) champ.focus(); else coefChamp.focus();
    coefChamp.onkeydown = e => { if (e.key === 'Escape') this.fermerMenu(); };
    setTimeout(() => document.addEventListener('pointerdown', this._fermerSiDehors = e => {
      if (!menu.contains(e.target)) this.fermerMenu();
    }), 0);
  },

  fermerMenu() {
    document.querySelector('.cpm-menu')?.remove();
    if (this._fermerSiDehors) document.removeEventListener('pointerdown', this._fermerSiDehors);
    this._fermerSiDehors = null;
  },

  // « 0,5 » → '0.5' ; vide ou invalide → null (mouvement sans calcul)
  _lireCoef(valeur) {
    const v = String(valeur || '').trim().replace(',', '.');
    return /^[0-9]+(\.[0-9]+)?$/.test(v) && Number(v) > 0 ? String(Number(v)) : null;
  },

  _placerMouvement(editeur, m, coef = null) {
    if (!m) return;
    const span = document.createElement('span');
    span.className = 'cpm';
    span.contentEditable = 'false';
    span.dataset.m = m.id;
    if (coef) span.dataset.coef = coef;
    span.style.background = m.couleur;
    span.innerHTML = cardioPastilleHtml(m, coef, true);
    // Caractère invisible après la pastille : le curseur peut s'y poser (voir cardioContenuHtml)
    const apres = document.createTextNode('\u200B');
    const groupe = document.createDocumentFragment();
    groupe.append(span, apres);
    this._insererDans(editeur, groupe, apres);
    return span;
  },

  // ── Glisser un mouvement de la barre dans le texte d'une séance ──────────
  _glisseMvt: null,

  _debutGlisser(e, id) {
    this._glisseMvt = id;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', '');
  },

  _survolGlisser(e) {
    if (!this._glisseMvt) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  },

  // Déposé : le mouvement se place à l'endroit du lâcher, puis on demande son coefficient
  _deposer(e, editeur) {
    const id = this._glisseMvt;
    if (!id) return;
    e.preventDefault();
    this._glisseMvt = null;
    const m = (this._phaseCourante().mouvements || []).find(x => x.id === id);
    if (!m) return;
    let plage = null;
    if (document.caretRangeFromPoint) plage = document.caretRangeFromPoint(e.clientX, e.clientY);
    else if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(e.clientX, e.clientY);
      if (p) { plage = document.createRange(); plage.setStart(p.offsetNode, p.offset); plage.collapse(true); }
    }
    // Lâché sur une pastille : juste après elle
    const surPastille = e.target.closest?.('.cpm');
    if (surPastille && editeur.contains(surPastille)) { plage = document.createRange(); plage.setStartAfter(surPastille); plage.collapse(true); }
    // Lâché sous la dernière ligne : le mouvement va sur une nouvelle ligne, pas au bout de la précédente
    if (editeur.textContent.trim() || editeur.querySelector('.cpm')) {
      const tout = document.createRange();
      tout.selectNodeContents(editeur);
      if (e.clientY > tout.getBoundingClientRect().bottom + 2) {
        const dernier = editeur.lastChild;
        const finDeLigne = dernier && (dernier.nodeName === 'BR' || (dernier.nodeType === 3 && dernier.nodeValue.endsWith('\n')));
        if (!finDeLigne) editeur.appendChild(document.createTextNode('\n'));
        plage = document.createRange();
        plage.selectNodeContents(editeur);
        plage.collapse(false);
      }
    }
    this._plage = plage && editeur.contains(plage.startContainer) ? plage : null;
    const span = this._placerMouvement(editeur, m, null);
    if (span) this._editerCoef(span, editeur);
  },

  // Clic sur un mouvement placé : changer son coefficient
  _clicEditeur(e, editeur) {
    const pastille = e.target.closest('.cpm');
    if (pastille) this._editerCoef(pastille, editeur);
  },

  _editerCoef(pastille, editeur) {
    const m = (this._phaseCourante().mouvements || []).find(x => x.id === pastille.dataset.m);
    if (!m) return;
    this.fermerMenu();
    const r = pastille.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'cpm-menu';
    menu.innerHTML = `
      <div style="font-size:12px;font-weight:700;">${escHtml(m.nom || 'Mouvement')}</div>
      <label class="cpm-menu-coef">Coefficient <input inputmode="decimal" placeholder="aucun" value="${pastille.dataset.coef ? cardioNombre(pastille.dataset.coef) : ''}"></label>
      <div class="cpm-menu-nouveau"><button class="cpm-ok" style="flex:1;width:auto;">OK</button></div>`;
    document.body.appendChild(menu);
    menu.style.left = Math.min(r.left, window.innerWidth - menu.offsetWidth - 8) + 'px';
    menu.style.top = Math.min(r.bottom + 4, window.innerHeight - menu.offsetHeight - 8) + 'px';
    const champ = menu.querySelector('input');
    const valider = () => {
      const coef = this._lireCoef(champ.value);
      if (coef) pastille.dataset.coef = coef; else delete pastille.dataset.coef;
      pastille.innerHTML = cardioPastilleHtml(m, coef, true);
      this.fermerMenu();
      this.saisirContenu(editeur);
    };
    menu.querySelector('.cpm-ok').onclick = valider;
    champ.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); valider(); } else if (ev.key === 'Escape') this.fermerMenu(); };
    champ.focus();
    champ.select();
    setTimeout(() => document.addEventListener('pointerdown', this._fermerSiDehors = ev => {
      if (!menu.contains(ev.target)) this.fermerMenu();
    }), 0);
  },

  // ── Champ de séance éditable (texte + pastilles de mouvements) ───────────
  _plage: null,   // dernière position du curseur dans un champ de séance

  _memoriserPlage() {
    const sel = window.getSelection();
    if (sel.rangeCount && sel.anchorNode && sel.anchorNode.parentElement?.closest('.cpc-editeur')) this._plage = sel.getRangeAt(0).cloneRange();
  },

  _insererDans(editeur, noeud, dernier = noeud) {
    let plage = this._plage;
    if (!plage || !editeur.contains(plage.startContainer)) {
      plage = document.createRange();
      plage.selectNodeContents(editeur);
      plage.collapse(false);
    }
    plage.deleteContents();
    plage.insertNode(noeud);
    // Curseur juste après ce qui vient d'être placé
    plage.setStartAfter(dernier);
    plage.collapse(true);
    editeur.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(plage);
    this._plage = plage.cloneRange();
    this._champ = editeur;
    this.saisirContenu(editeur);
  },

  // Contenu du champ → texte enregistré (mouvements en {{m:id}}, retours à la ligne en \n)
  _serialiser(el) {
    let texte = '';
    const lire = noeud => {
      for (const n of noeud.childNodes) {
        if (n.nodeType === 3) texte += n.nodeValue.replace(/\u00A0/g, ' ').replace(/\u200B/g, '');
        else if (n.nodeName === 'BR') texte += '\n';
        else if (n.classList?.contains('cpm')) texte += `{{m:${n.dataset.m}${n.dataset.coef ? '*' + n.dataset.coef : ''}}}`;
        else if (n.nodeName === 'DIV' || n.nodeName === 'P') {
          if (texte && !texte.endsWith('\n')) texte += '\n';
          lire(n);
        } else lire(n);
      }
    };
    lire(el);
    return texte.replace(/\n$/, '');
  },

  saisirContenu(el) {
    this.saisir(el.dataset.seance, 'contenu', this._serialiser(el));
  },

  _touche(e, el) {
    // Retour arrière juste après une pastille : le caractère invisible part avec elle (un seul appui)
    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      const n = sel.anchorNode, o = sel.anchorOffset;
      if (sel.isCollapsed && n?.nodeType === 3 && o > 0 && n.nodeValue[o - 1] === '\u200B') {
        n.deleteData(o - 1, 1);
        const r = document.createRange();
        r.setStart(n, o - 1);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    }
    if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); }
    else if (e.key === '@') {
      e.preventDefault();
      this._memoriserPlage();
      const sel = window.getSelection();
      const r = sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : el.getBoundingClientRect();
      this.menuMouvements({ getBoundingClientRect: () => (r.width || r.height ? r : el.getBoundingClientRect()) }, el.dataset.seance);
    }
  },

  // Coller : texte simple seulement (pas de mise en forme venue d'ailleurs)
  _coller(e) {
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
  },

  // ── Actions immédiates ────────────────────────────────────────────────────
  async _faire(action, message) {
    try { await action(); this._render(); if (message) this._etat(message); }
    catch (e) { this._etat('Erreur : ' + e.message, true); toast('Erreur : ' + e.message, 'error'); }
  },

  cocher(id, faite) {
    const s = this._seance(id);
    const champs = faite
      ? { faite: true, faite_le: formatDate(new Date()), faite_par: Router.userProfile.id }
      : { faite: false, faite_le: null, faite_par: null };
    this._faire(async () => { await db.majCardioSeance('plan', id, champs); Object.assign(s, champs); },
      faite ? '✓ Séance faite' : 'Séance décochée');
  },

  marquer(id, aModifier) {
    const s = this._seance(id);
    this._faire(async () => { await db.majCardioSeance(this.cote, id, { a_modifier: aModifier }); s.a_modifier = aModifier; });
  },

  ajouterSeance() {
    const ph = this.data.phases[this._phase];
    this._faire(async () => {
      const s = await db.ajouterCardioSeance(this.cote, ph.id, ph.seances.length);
      ph.seances.push({ ...s, faite: false, a_modifier: false });
    });
  },

  supprimerSeance(id) {
    const ph = this.data.phases[this._phase];
    const i = ph.seances.findIndex(s => s.id === id);
    const s = ph.seances[i];
    if ((s.contenu || s.note) && !confirm(`Supprimer la séance ${i + 1} ?`)) return;
    this._faire(async () => {
      await db.supprimerCardioSeance(this.cote, id);
      ph.seances.splice(i, 1);
      await this._renumeroter(ph.seances, 'seance');
    });
  },

  deplacerSeance(id, sens) {
    const liste = this.data.phases[this._phase].seances;
    const i = liste.findIndex(s => s.id === id), j = i + sens;
    if (i < 0 || j < 0 || j >= liste.length) return;
    [liste[i], liste[j]] = [liste[j], liste[i]];
    this._faire(() => this._renumeroter(liste, 'seance'));
  },

  // Réécrit l'ordre (0, 1, 2…) de toute la liste
  async _renumeroter(liste, quoi) {
    await Promise.all(liste.map((x, k) => x.ordre === k ? null
      : (quoi === 'seance' ? db.majCardioSeance(this.cote, x.id, { ordre: k }) : db.majCardioPhase(this.cote, x.id, { ordre: k }))));
    liste.forEach((x, k) => { x.ordre = k; });
  },

  ajouterPhase() {
    const n = this.data.phases.length;
    this._faire(async () => {
      const ph = await db.ajouterCardioPhase(this.cote, this.data.id, `Phase ${n + 1}`, n);
      const s = await db.ajouterCardioSeance(this.cote, ph.id, 0);
      this.data.phases.push({ ...ph, seances: [{ ...s, faite: false, a_modifier: false }] });
      this._phase = n;
    });
  },

  supprimerPhase() {
    const ph = this.data.phases[this._phase];
    if (!confirm(`Supprimer la phase « ${ph.nom} » et ses ${ph.seances.length} séance(s) ?`)) return;
    this._faire(async () => {
      await db.supprimerCardioPhase(this.cote, ph.id);
      this.data.phases.splice(this._phase, 1);
      await this._renumeroter(this.data.phases, 'phase');
      this._phase = Math.max(0, this._phase - 1);
    });
  },

  // Glisser un onglet de phase pour changer l'ordre (au-delà de 5 px : sinon c'est un clic),
  // comme les onglets des fiches clients
  _ddPhase(e, i) {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    const onglets = [...document.querySelectorAll('.cpc-onglet[data-phase]')];
    const rects = onglets.map(o => o.getBoundingClientRect());
    // Place libérée par l'onglet tenu : sa largeur + l'écart entre deux onglets
    const ecart = rects.length > 1 ? Math.max(0, rects[1].left - rects[0].right) : 0;
    const largeur = rects[i].width + ecart;
    const d = { x0: e.clientX, actif: false, j: i };
    const bouge = ev => {
      const dx = ev.clientX - d.x0;
      if (!d.actif && Math.abs(dx) < 5) return;
      d.actif = true;
      el.classList.add('cpc-glisse');
      el.style.transform = `translateX(${dx}px)`;
      // Nouvelle place = nombre d'autres onglets dont le milieu est avant le milieu de l'onglet tenu
      const milieu = rects[i].left + rects[i].width / 2 + dx;
      d.j = rects.filter((r, k) => k !== i && r.left + r.width / 2 < milieu).length;
      // Les autres onglets se poussent en direct pour montrer la place
      onglets.forEach((o, k) => {
        if (k === i) return;
        const decal = i < d.j && k > i && k <= d.j ? -largeur : d.j < i && k >= d.j && k < i ? largeur : 0;
        o.style.transform = decal ? `translateX(${decal}px)` : '';
      });
    };
    const fin = ev => {
      document.removeEventListener('pointermove', bouge);
      document.removeEventListener('pointerup', fin);
      document.removeEventListener('pointercancel', fin);
      if (!d.actif) return;
      this._glisse = true;
      setTimeout(() => { this._glisse = false; }, 0);
      const liste = this.data.phases, j = d.j;
      if (ev.type === 'pointercancel' || j === i) { this._render(); return; }
      const ouverte = liste[this._phase];
      const [ph] = liste.splice(i, 1);
      liste.splice(j, 0, ph);
      this._phase = liste.indexOf(ouverte);
      try { sessionStorage.setItem('cpcPhase_' + this.data.id, this._phase); } catch (_) {}
      this._render();
      this._faire(() => this._renumeroter(liste, 'phase'), '✓ Ordre des phases enregistré');
    };
    document.addEventListener('pointermove', bouge);
    document.addEventListener('pointerup', fin);
    document.addEventListener('pointercancel', fin);
  },

  changerLieu(lieu) {
    if (this.data.lieu === lieu) return;
    this._faire(async () => { await db.majCardioRacine('plan', this.data.id, { lieu }); this.data.lieu = lieu; },
      lieu === 'distance' ? '✓ À distance : le client voit le plan' : '✓ Au studio : coachs seulement');
  },

  archiver(reactiver) {
    if (!reactiver && !confirm(`Archiver « ${this.data.nom} » ?\n\nIl ne sera plus en cours ; tu le retrouves dans les plans cardio archivés de la fiche.`)) return;
    this._faire(async () => {
      await db.majCardioRacine('plan', this.data.id, { actif: reactiver });
      this.data.actif = reactiver;
    }, reactiver ? 'Plan réactivé' : 'Plan archivé');
  },
};

// Position du curseur dans un champ de séance, gardée pour y placer un mouvement ou un emoji
document.addEventListener('selectionchange', () => CoachCardioPlanPage._memoriserPlage());
