// APEX APP — Coach : plan cardio (HYROX…), modèle de la bibliothèque ou plan d'un client
// Onglets = phases (« HYROX prépa 1 »…), colonnes = séances numérotées en texte
// libre, comme les Google Sheets du studio. Plan d'un client : case « faite »
// (date, coach), note (temps réalisé…), repère « à modifier ». Tout s'enregistre
// tout seul, comme la grille du studio. Tous les coachs ; le client ne voit rien.
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
      : coachClientNav(this.clientId, 'coach-cardio-plan');
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
            <button title="Ajouter un emoji" onclick="CoachCardioPlanPage.emojis(this, '${s.id}')">😀</button>
            <button title="Vers la gauche" onclick="CoachCardioPlanPage.deplacerSeance('${s.id}', -1)" ${i === 0 ? 'disabled' : ''}>‹</button>
            <button title="Vers la droite" onclick="CoachCardioPlanPage.deplacerSeance('${s.id}', 1)" ${i === phase.seances.length - 1 ? 'disabled' : ''}>›</button>
            <button title="Supprimer la séance" onclick="CoachCardioPlanPage.supprimerSeance('${s.id}')">×</button>
          </span>
        </div>
        <input class="cpc-titre" placeholder="Titre (ex. AVEC CYRIL)" value="${escHtml(s.titre || '')}"
          oninput="CoachCardioPlanPage.saisir('${s.id}', 'titre', this.value)" onfocus="CoachCardioPlanPage._champ = this" data-champ="titre" data-seance="${s.id}">
        <textarea class="cpc-contenu" rows="14" placeholder="For Time&#10;1000m Run&#10;3 rounds…"
          oninput="CoachCardioPlanPage.saisir('${s.id}', 'contenu', this.value)" onfocus="CoachCardioPlanPage._champ = this" data-champ="contenu" data-seance="${s.id}">${escHtml(s.contenu || '')}</textarea>
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
    const debut = champ.selectionStart ?? champ.value.length, fin = champ.selectionEnd ?? debut;
    champ.value = champ.value.slice(0, debut) + emoji + champ.value.slice(fin);
    champ.focus();
    champ.setSelectionRange(debut + emoji.length, debut + emoji.length);
    this._champ = champ;
    this.saisir(seanceId, champ.dataset.champ, champ.value);
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
    const d = { x0: e.clientX, actif: false };
    const bouge = ev => {
      const dx = ev.clientX - d.x0;
      if (!d.actif && Math.abs(dx) < 5) return;
      d.actif = true;
      el.classList.add('cpc-glisse');
      el.style.transform = `translateX(${dx}px)`;
    };
    const fin = ev => {
      document.removeEventListener('pointermove', bouge);
      document.removeEventListener('pointerup', fin);
      document.removeEventListener('pointercancel', fin);
      if (!d.actif) return;
      this._glisse = true;
      setTimeout(() => { this._glisse = false; }, 0);
      // Nouvelle place : d'après le milieu des autres onglets
      const autres = [...document.querySelectorAll('.cpc-onglet[data-phase]')].filter(x => x !== el);
      let j = autres.length;
      for (let k = 0; k < autres.length; k++) {
        const r = autres[k].getBoundingClientRect();
        if (ev.clientX < r.left + r.width / 2) { j = k; break; }
      }
      const liste = this.data.phases;
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
