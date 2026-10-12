// APEX APP — Coach : grille d'une séance au studio
// Une ligne par exercice, une colonne par semaine de la phase (charge, reps,
// remarque en saisie libre) ; case « faite » par semaine. Enregistrement auto.

const CoachSeanceStudioPage = {
  data: null,          // { seance, exercices, semaines, saisies }
  client: null,
  _timers: {},         // enregistrements différés par case

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="ssTitle">Séance au studio</div>
        </div>
        <button class="header-btn" id="ssBack">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
      <div id="ssContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    this.data = null;
    this.client = null;
    this._timers = {};

    const profile = Router.userProfile;
    if (!profile || profile.role !== 'coach') { window.location.hash = '#coach-clients'; return; }
    const params = Router.getParams();
    if (!params.seanceId) { window.location.hash = '#coach-clients'; return; }

    try {
      this.data = await db.getGrilleStudio(params.seanceId);
      const clientId = this.data.seance.client_programmes?.client_id || params.clientId;
      this.client = await db.getProfile(clientId);
      document.getElementById('ssTitle').textContent = `${this.data.seance.nom} — ${this.client.prenom || 'Client'}`;
      document.getElementById('ssBack').onclick = () =>
        Router.navigate('coach-client-programme', { clientId });
      this._render();
    } catch (e) {
      document.getElementById('ssContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  // Nombre de semaines affichées : celles de la phase, ou plus si déjà remplies
  _nbSemaines() {
    const d = this.data;
    const max = Math.max(
      d.seance.client_programmes?.nb_semaines || 4,
      ...d.semaines.map(s => s.semaine),
      ...d.saisies.map(s => s.semaine)
    );
    return Math.min(max, 52);
  },

  // Semaine en cours = première semaine non cochée
  _semaineEnCours() {
    const faites = new Set(this.data.semaines.map(s => s.semaine));
    let k = 1;
    while (faites.has(k)) k++;
    return k;
  },

  _methode(e) {
    const te = e.type_effort || 'reps';
    const sd = Array.isArray(e.series_data) ? e.series_data.map(x => x.reps).filter(Boolean) : [];
    const reps = sd.length ? (new Set(sd).size <= 1 ? sd[0] : sd.join('/')) : (e.reps_cible || '');
    const parts = [];
    if (te === 'amrap') parts.push(`Max de reps en ${e.reps_cible || '?'}`);
    else if (te === 'temps' || te === 'distance') parts.push(e.series > 1 ? `${e.series} × ${e.reps_cible}` : (e.reps_cible || ''));
    else parts.push(`${e.series || 1} × ${reps}`);
    if (e.charge_cible) parts.push(e.charge_cible);
    if (e.repos_secondes) {
      const r = e.repos_secondes;
      parts.push(`repos ${r >= 60 ? `${Math.floor(r / 60)} min${r % 60 ? ` ${r % 60}` : ''}` : `${r} s`}`);
    }
    return parts.filter(Boolean).join(' · ');
  },

  _render() {
    const d = this.data;
    const nb = this._nbSemaines();
    const enCours = this._semaineEnCours();
    const semaines = Array.from({ length: nb }, (_, i) => i + 1);
    const cocheParSemaine = new Map(d.semaines.map(s => [s.semaine, s]));
    const saisie = (exId, k) => d.saisies.find(x => x.exercice_id === exId && x.semaine === k) || {};
    const prog = d.seance.client_programmes || {};

    const enTetes = semaines.map(k => {
      const c = cocheParSemaine.get(k);
      const date = c ? new Date(c.faite_le + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
      return `
        <th class="ss-sem ${k === enCours ? 'en-cours' : ''} ${c ? 'faite' : ''}">
          <div>Semaine ${k}</div>
          <label class="ss-faite">
            <input type="checkbox" ${c ? 'checked' : ''} onchange="CoachSeanceStudioPage.cocher(${k}, this.checked)">
            ${c ? `faite le ${date}` : 'faite'}
          </label>
        </th>`;
    }).join('');

    const lignes = d.exercices.map(e => {
      const nom = e.exercices_bdd?.nom || 'Exercice';
      const video = e.exercices_bdd?.youtube_url;
      const cases = semaines.map(k => {
        const v = saisie(e.id, k);
        const cle = `${e.id}_${k}`;
        return `
          <td class="ss-case ${k === enCours ? 'en-cours' : ''}">
            <div class="ss-duo">
              <textarea rows="2" placeholder="Charge" data-cle="${cle}" data-champ="charge"
                oninput="CoachSeanceStudioPage.saisir('${e.id}', ${k})">${escHtml(v.charge || '')}</textarea>
              <textarea rows="2" placeholder="Reps" data-cle="${cle}" data-champ="reps"
                oninput="CoachSeanceStudioPage.saisir('${e.id}', ${k})">${escHtml(v.reps || '')}</textarea>
            </div>
            <input class="ss-remarque" placeholder="Remarque" data-cle="${cle}" data-champ="remarque" value="${escHtml(v.remarque || '')}"
              oninput="CoachSeanceStudioPage.saisir('${e.id}', ${k})">
          </td>`;
      }).join('');
      return `
        <tr>
          <th class="ss-exo">
            <div class="ss-exo-nom">${escHtml(nom)}${e.superset_groupe ? ` <span class="ss-ss">${escHtml(e.superset_groupe)}</span>` : ''}</div>
            <div class="ss-exo-meth">${escHtml(this._methode(e))}</div>
            ${e.notes ? `<div class="ss-exo-notes">${escHtml(e.notes)}</div>` : ''}
            ${video ? `<a class="ss-exo-video" href="${escHtml(video)}" target="_blank" rel="noopener">🎥 Vidéo</a>` : ''}
          </th>
          ${cases}
        </tr>`;
    }).join('');

    document.getElementById('ssContent').innerHTML = `
      ${coachClientNav(this.client.id, 'coach-client-programme')}
      <div class="ss-entete">
        <div>
          <div style="font-weight:700;font-size:15px;">${escHtml(prog.nom || '')} · ${escHtml(d.seance.nom)}</div>
          <div style="font-size:12px;color:var(--gray-light);margin-top:2px;">
            ${nb} semaine${nb > 1 ? 's' : ''} · semaine en cours : ${enCours > nb ? 'phase terminée' : enCours}
            ${d.seance.notes_coach ? ` · ${escHtml(d.seance.notes_coach)}` : ''}
          </div>
        </div>
        <div id="ssEtat" class="ss-etat"></div>
      </div>
      ${d.exercices.length ? `
      <div class="ss-scroll" id="ssScroll">
        <table class="ss-table">
          <thead><tr><th class="ss-exo ss-coin">Exercices</th>${enTetes}</tr></thead>
          <tbody>${lignes}</tbody>
        </table>
      </div>` : '<div class="empty-state"><div class="empty-text">Aucun exercice dans cette séance.</div></div>'}`;

    // Amener la semaine en cours à l'écran
    const cible = document.querySelector('.ss-sem.en-cours');
    const scroll = document.getElementById('ssScroll');
    if (cible && scroll) scroll.scrollLeft = Math.max(0, cible.offsetLeft - 270);
  },

  _etat(texte, erreur = false) {
    const el = document.getElementById('ssEtat');
    if (!el) return;
    el.textContent = texte;
    el.classList.toggle('erreur', erreur);
  },

  // Saisie dans une case : enregistrement automatique après une courte pause
  saisir(exerciceId, semaine) {
    const cle = `${exerciceId}_${semaine}`;
    this._etat('Enregistrement…');
    clearTimeout(this._timers[cle]);
    this._timers[cle] = setTimeout(() => this._enregistrer(exerciceId, semaine), 600);
  },

  async _enregistrer(exerciceId, semaine) {
    const cle = `${exerciceId}_${semaine}`;
    const champs = {};
    document.querySelectorAll(`[data-cle="${cle}"]`).forEach(el => {
      champs[el.dataset.champ] = el.value.trim() || null;
    });
    try {
      await db.saveSaisieStudio(exerciceId, semaine, champs);
      const d = this.data;
      const i = d.saisies.findIndex(x => x.exercice_id === exerciceId && x.semaine === semaine);
      if (i >= 0) Object.assign(d.saisies[i], champs);
      else d.saisies.push({ exercice_id: exerciceId, semaine, ...champs });
      this._etat('✓ Enregistré');
    } catch (e) {
      this._etat('Erreur : ' + e.message, true);
    }
  },

  async cocher(semaine, faite) {
    try {
      const ligne = await db.setSemaineStudio(this.data.seance.id, semaine, faite);
      this.data.semaines = this.data.semaines.filter(s => s.semaine !== semaine);
      if (ligne) this.data.semaines.push(ligne);
      // Les saisies en attente sont envoyées avant de redessiner
      for (const [cle, t] of Object.entries(this._timers)) {
        clearTimeout(t);
        const [exId, k] = cle.split('_');
        await this._enregistrer(exId, +k);
      }
      this._timers = {};
      this._render();
      this._etat(faite ? `✓ Semaine ${semaine} faite` : `Semaine ${semaine} décochée`);
    } catch (e) {
      this._etat('Erreur : ' + e.message, true);
    }
  },

  // Depuis l'agenda ou le tableau de bord : ouvre la séance au studio du client
  // (directement s'il n'y en a qu'une, sinon la liste de ses programmes)
  async ouvrirPourClient(clientId) {
    try {
      const progs = await db.getClientProgrammesActifs(clientId);
      const studio = progs.flatMap(p => (p.seances || []).filter(s => s.lieu === 'studio'));
      if (studio.length === 1) Router.navigate('coach-seance-studio', { seanceId: studio[0].id, clientId });
      else Router.navigate('coach-client-programme', { clientId });
    } catch (_) {
      Router.navigate('coach-client-programme', { clientId });
    }
  }
};
