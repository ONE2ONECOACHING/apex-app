// APEX APP — Coach : grille d'une séance au studio
// Une ligne par exercice, une colonne par semaine de la phase (charge, reps,
// remarque en saisie libre) ; case « faite » par semaine. Enregistrement auto.

const CoachSeanceStudioPage = {
  data: null,          // { seance, exercices, semaines, saisies }
  client: null,
  _timers: {},         // enregistrements différés par case
  _biblio: null,       // bibliothèque d'exercices (chargée au premier besoin)
  _choix: null,        // { mode: 'remplacer' | 'ajouter', exerciceId }

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
      <div id="ssContent"><div class="spinner" style="margin-top:2rem;"></div></div>
      <div id="ssModal"></div>`;
  },

  async init() {
    this.data = null;
    this.client = null;
    this._timers = {};
    this._voirMethode = false;
    this._plans = '';

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
      // Autres plans du client (fiche duo…) : onglets pour passer de l'un à l'autre
      const seanceId = params.seanceId;
      barrePlansClient(clientId, seanceId).then(html => {
        if (Router.getParams().seanceId !== seanceId) return;
        this._plans = html;
        const el = document.getElementById('ssPlans');
        if (el) el.innerHTML = html;
      });
    } catch (e) {
      document.getElementById('ssContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  // Consignes du programme (texte de méthode du modèle), dépliées au-dessus de la grille
  basculerMethode() {
    this._voirMethode = !this._voirMethode;
    const btn = document.querySelector('.ss-methode-btn');
    const zone = document.querySelector('.ss-methode');
    if (this._voirMethode && !zone) {
      btn.closest('.ss-entete').insertAdjacentHTML('afterend',
        `<div class="ss-methode">${escHtml(this.data.seance.client_programmes?.consignes || '')}</div>`);
    } else if (!this._voirMethode) zone?.remove();
    btn.classList.toggle('on', this._voirMethode);
    btn.textContent = `📖 Explication de la méthode ${this._voirMethode ? '▴' : '▾'}`;
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

  // Dernière semaine sans rien (ni cochée ni saisie) : on peut la retirer
  _derniereVide(nb) {
    const d = this.data;
    return nb > 1 && !d.semaines.some(s => s.semaine === nb)
      && !d.saisies.some(s => s.semaine === nb && (s.charge || s.reps || s.remarque));
  },

  // Une semaine de plus pour la phase (vaut pour toutes les séances du programme)
  async ajouterSemaine() {
    const nb = this._nbSemaines();
    if (nb >= 52) { this._etat('52 semaines au maximum', true); return; }
    await this._changerNbSemaines(nb + 1);
  },

  async retirerSemaine() {
    const nb = this._nbSemaines();
    if (!this._derniereVide(nb)) return;
    await this._changerNbSemaines(nb - 1);
  },

  async _changerNbSemaines(nb) {
    const prog = this.data.seance.client_programmes;
    try {
      await db.setNbSemainesProgramme(prog.id, nb);
      prog.nb_semaines = nb;
      // Les cases vides de la dernière semaine retirée ne comptent plus
      this.data.saisies = this.data.saisies.filter(s => s.semaine <= nb || s.charge || s.reps || s.remarque);
      this._render();
      this._etat(`✓ Phase de ${nb} semaine${nb > 1 ? 's' : ''}`);
      const sc = document.getElementById('ssScroll');
      if (sc) sc.scrollLeft = sc.scrollWidth;
    } catch (e) {
      this._etat('Erreur : ' + e.message, true);
    }
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
    this._envoyerAttente();
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
    }).join('') + `
        <th class="ss-sem ss-sem-plus">
          <button class="btn btn-secondary btn-small" onclick="CoachSeanceStudioPage.ajouterSemaine()">+ Ajouter une semaine</button>
          ${this._derniereVide(nb) ? `<button class="ss-sem-retirer" onclick="CoachSeanceStudioPage.retirerSemaine()">Retirer la semaine ${nb}</button>` : ''}
        </th>`;

    const lignes = d.exercices.map((e, i) => {
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
            <div class="ss-exo-outils">
              <button title="Monter" ${i === 0 ? 'disabled' : ''} onclick="CoachSeanceStudioPage.deplacer('${e.id}', -1)">↑</button>
              <button title="Descendre" ${i === d.exercices.length - 1 ? 'disabled' : ''} onclick="CoachSeanceStudioPage.deplacer('${e.id}', 1)">↓</button>
              <button title="Modifier la méthode" onclick="CoachSeanceStudioPage.editerMethode('${e.id}')">✏️</button>
              <button title="Supprimer l'exercice" onclick="CoachSeanceStudioPage.supprimerExercice('${e.id}')">✕</button>
            </div>
            <div class="ss-exo-nom ss-cliquable" title="Remplacer l'exercice" onclick="CoachSeanceStudioPage.choisirExercice('remplacer', '${e.id}')">${escHtml(nom)}${e.superset_groupe ? ` <span class="ss-ss">${escHtml(e.superset_groupe)}</span>` : ''}</div>
            <div class="ss-exo-meth ss-cliquable" title="Modifier la méthode" onclick="CoachSeanceStudioPage.editerMethode('${e.id}')">${escHtml(this._methode(e))}</div>
            ${e.notes ? `<div class="ss-exo-notes">${escHtml(e.notes)}</div>` : ''}
            ${video ? `<a class="ss-exo-video" href="${escHtml(video)}" target="_blank" rel="noopener">🎥 Vidéo</a>` : ''}
          </th>
          ${cases}
          <td></td>
        </tr>`;
    }).join('');

    document.getElementById('ssContent').innerHTML = `
      ${coachClientNav(this.client.id, 'coach-client-programme')}
      <div id="ssPlans">${this._plans || ''}</div>
      <div class="ss-entete">
        <div>
          <div style="font-weight:700;font-size:15px;">${escHtml(prog.nom || '')} · ${escHtml(d.seance.nom)}</div>
          <div style="font-size:12px;color:var(--gray-light);margin-top:2px;">
            ${nb} semaine${nb > 1 ? 's' : ''} · semaine en cours : ${enCours > nb ? 'phase terminée' : enCours}
            ${d.seance.notes_coach ? ` · ${escHtml(d.seance.notes_coach)}` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${prog.consignes ? `<button class="btn btn-secondary btn-small ss-methode-btn ${this._voirMethode ? 'on' : ''}"
            onclick="CoachSeanceStudioPage.basculerMethode()">📖 Explication de la méthode ${this._voirMethode ? '▴' : '▾'}</button>` : ''}
          <div id="ssEtat" class="ss-etat"></div>
        </div>
      </div>
      ${prog.consignes && this._voirMethode ? `<div class="ss-methode">${escHtml(prog.consignes)}</div>` : ''}
      ${d.exercices.length ? `
      <div class="ss-scroll" id="ssScroll">
        <table class="ss-table">
          <thead><tr><th class="ss-exo ss-coin">Exercices</th>${enTetes}</tr></thead>
          <tbody>${lignes}
            <tr><th class="ss-exo"><button class="btn btn-secondary btn-small" style="width:100%;" onclick="CoachSeanceStudioPage.choisirExercice('ajouter')">+ Ajouter un exercice</button></th>
              ${semaines.map(() => '<td></td>').join('')}<td></td></tr>
          </tbody>
        </table>
      </div>` : `<div class="empty-state"><div class="empty-text">Aucun exercice dans cette séance.</div>
        <button class="btn btn-primary btn-small" style="margin-top:10px;" onclick="CoachSeanceStudioPage.choisirExercice('ajouter')">+ Ajouter un exercice</button></div>`}`;

    // Amener à l'écran la semaine en cours, précédée de la semaine d'avant
    const enTetesSem = [...document.querySelectorAll('.ss-sem')];
    const iCours = enTetesSem.findIndex(th => th.classList.contains('en-cours'));
    const cible = enTetesSem[Math.max(0, iCours - 1)];
    const scroll = document.getElementById('ssScroll');
    const fixe = document.querySelector('.ss-coin')?.offsetWidth || 0;
    if (iCours > 0 && cible && scroll) scroll.scrollLeft = Math.max(0, cible.offsetLeft - fixe);
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
    // Valeurs relevées à la frappe et gardées en mémoire tout de suite : un nouvel
    // affichage (↑ ↓, ajout d'exercice) ne les efface plus avant l'enregistrement
    const champs = {};
    document.querySelectorAll(`[data-cle="${cle}"]`).forEach(el => { champs[el.dataset.champ] = el.value.trim() || null; });
    this._attente = this._attente || {};
    this._attente[cle] = champs;
    const d = this.data;
    const i = d.saisies.findIndex(x => x.exercice_id === exerciceId && x.semaine === semaine);
    if (i >= 0) Object.assign(d.saisies[i], champs);
    else d.saisies.push({ exercice_id: exerciceId, semaine, ...champs });
    clearTimeout(this._timers[cle]);
    this._timers[cle] = setTimeout(() => this._enregistrer(exerciceId, semaine), 600);
  },

  // Envoie tout de suite les saisies en attente (avant de redessiner la grille)
  _envoyerAttente() {
    for (const [cle, t] of Object.entries(this._timers || {})) {
      clearTimeout(t);
      const i = cle.lastIndexOf('_');
      this._enregistrer(cle.slice(0, i), +cle.slice(i + 1));
    }
    this._timers = {};
  },

  async _enregistrer(exerciceId, semaine) {
    const cle = `${exerciceId}_${semaine}`;
    delete this._timers[cle];
    let champs = this._attente?.[cle];
    if (this._attente) delete this._attente[cle];
    if (!champs) {
      champs = {};
      document.querySelectorAll(`[data-cle="${cle}"]`).forEach(el => { champs[el.dataset.champ] = el.value.trim() || null; });
    }
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
      this._render();
      this._etat(faite ? `✓ Semaine ${semaine} faite` : `Semaine ${semaine} décochée`);
    } catch (e) {
      this._etat('Erreur : ' + e.message, true);
    }
  },

  // ── Modifier la séance depuis la grille ────────────────────────────────────

  _fermerModal() { this._choix = null; document.getElementById('ssModal').innerHTML = ''; },

  // Remplacer un exercice (il garde ses charges) ou en ajouter un
  async choisirExercice(mode, exerciceId = null) {
    this._choix = { mode, exerciceId };
    const actuel = this.data.exercices.find(e => e.id === exerciceId);
    document.getElementById('ssModal').innerHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">${mode === 'remplacer' ? `Remplacer « ${escHtml(actuel?.exercices_bdd?.nom || '')} »` : 'Ajouter un exercice'}
            <button class="modal-close" onclick="CoachSeanceStudioPage._fermerModal()">×</button>
          </div>
          ${mode === 'remplacer' ? '<div style="font-size:13px;color:var(--gray);margin-bottom:10px;">Les charges déjà notées et la méthode sont conservées.</div>' : ''}
          <input class="input" id="ssRecherche" placeholder="Chercher un exercice…" oninput="CoachSeanceStudioPage._filtrerBiblio(this.value)" autocomplete="off">
          <div id="ssResultats" class="ag-results" style="max-height:320px;overflow-y:auto;"><div class="spinner" style="margin:1rem auto;"></div></div>
          <div id="ssModalErr"></div>
        </div>
      </div>`;
    document.getElementById('ssRecherche').focus();
    try {
      if (!this._biblio) this._biblio = await db.getExercicesBdd();
      this._filtrerBiblio('');
    } catch (e) {
      document.getElementById('ssResultats').innerHTML = `<div class="alert alert-error">${escHtml(e.message)}</div>`;
    }
  },

  _filtrerBiblio(q) {
    const box = document.getElementById('ssResultats');
    if (!box || !this._biblio) return;
    const s = q.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const res = this._biblio
      .filter(x => !s || `${x.nom} ${x.muscle_principal || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(s))
      .slice(0, 60);
    box.innerHTML = res.length
      ? res.map(x => `<div class="ag-result" onclick="CoachSeanceStudioPage._appliquerExercice('${x.id}')">${escHtml(x.nom)}
          <span style="font-size:11px;color:var(--gray-light);">${escHtml(x.muscle_principal || '')}</span></div>`).join('')
      : '<div class="ag-result" style="color:var(--gray-light);cursor:default;">Aucun exercice trouvé</div>';
  },

  async _appliquerExercice(exoBddId) {
    const { mode, exerciceId } = this._choix || {};
    try {
      if (mode === 'remplacer') {
        const maj = await db.updateClientExercice(exerciceId, { exercice_id: exoBddId });
        const i = this.data.exercices.findIndex(e => e.id === exerciceId);
        this.data.exercices[i] = maj;
      } else {
        const exo = this._biblio.find(x => x.id === exoBddId);
        const te = exo?.type_effort || 'reps';
        const nouveau = await db.insertClientExercice({
          seance_id: this.data.seance.id,
          exercice_id: exoBddId,
          ordre: Math.max(-1, ...this.data.exercices.map(e => e.ordre ?? 0)) + 1,
          type_effort: te, series: 3, reps_cible: '10', repos_secondes: 90,
          series_data: te === 'reps' ? Array.from({ length: 3 }, () => ({ reps: '10', charge: '' })) : null,
        });
        this.data.exercices.push(nouveau);
      }
      this._fermerModal();
      this._render();
      this._etat(mode === 'remplacer' ? '✓ Exercice remplacé' : '✓ Exercice ajouté');
    } catch (e) {
      document.getElementById('ssModalErr').innerHTML = `<div class="alert alert-error">${escHtml(e.message)}</div>`;
    }
  },

  editerMethode(exerciceId) {
    const e = this.data.exercices.find(x => x.id === exerciceId);
    if (!e) return;
    const te = e.type_effort || 'reps';
    const sd = Array.isArray(e.series_data) ? e.series_data.map(x => x.reps).filter(Boolean) : [];
    const reps = sd.length ? (new Set(sd).size <= 1 ? sd[0] : sd.join('/')) : (e.reps_cible || '');
    const types = [['reps', 'Séries × reps'], ['amrap', 'Max de reps en un temps'], ['temps', 'Durée'], ['distance', 'Distance']];
    document.getElementById('ssModal').innerHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">${escHtml(e.exercices_bdd?.nom || 'Exercice')}
            <button class="modal-close" onclick="CoachSeanceStudioPage._fermerModal()">×</button>
          </div>
          <div class="field"><label class="field-label">Type</label>
            <select class="input" id="ssmType">${types.map(([v, l]) => `<option value="${v}" ${te === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          </div>
          <div class="field-row" style="display:grid;grid-template-columns:1fr 1.4fr;gap:10px;">
            <div class="field"><label class="field-label">Séries</label><input class="input" type="number" min="1" id="ssmSeries" value="${e.series || 1}"></div>
            <div class="field"><label class="field-label">Reps / objectif</label><input class="input" id="ssmReps" value="${escHtml(te === 'reps' ? reps : (e.reps_cible || ''))}" placeholder="10, 8/8/6, 5 min…"></div>
          </div>
          <div class="field-row" style="display:grid;grid-template-columns:1.4fr 1fr;gap:10px;">
            <div class="field"><label class="field-label">Charge cible</label><input class="input" id="ssmCharge" value="${escHtml(e.charge_cible || '')}"></div>
            <div class="field"><label class="field-label">Repos (secondes)</label><input class="input" type="number" min="0" step="15" id="ssmRepos" value="${e.repos_secondes ?? 90}"></div>
          </div>
          <div class="field"><label class="field-label">Notes</label>
            <textarea class="input" id="ssmNotes" rows="2" style="height:auto;" placeholder="Objectif 40-60 reps, tempo…">${escHtml(e.notes || '')}</textarea>
          </div>
          <div id="ssModalErr"></div>
          <button class="btn btn-primary" style="width:100%;" onclick="CoachSeanceStudioPage._enregistrerMethode('${e.id}')">Enregistrer</button>
        </div>
      </div>`;
  },

  async _enregistrerMethode(exerciceId) {
    const v = id => document.getElementById(id).value.trim();
    const te = v('ssmType');
    const series = Math.max(1, parseInt(v('ssmSeries')) || 1);
    const repsTxt = v('ssmReps');
    const charge = v('ssmCharge');
    const patch = {
      type_effort: te, series, charge_cible: charge || null,
      repos_secondes: parseInt(v('ssmRepos')) || 0, notes: v('ssmNotes') || null,
    };
    if (te === 'reps') {
      // « 8/8/6 » = une valeur par série ; « 10 » = la même pour toutes
      const parts = repsTxt.split('/').map(x => x.trim()).filter(Boolean);
      const parSerie = Array.from({ length: series }, (_, i) => parts[i] || parts[parts.length - 1] || '10');
      patch.reps_cible = parSerie[0];
      patch.series_data = parSerie.map(r => ({ reps: r, charge: charge || '' }));
    } else {
      patch.reps_cible = repsTxt || null;
      patch.series_data = null;
    }
    try {
      const maj = await db.updateClientExercice(exerciceId, patch);
      const i = this.data.exercices.findIndex(e => e.id === exerciceId);
      this.data.exercices[i] = maj;
      this._fermerModal();
      this._render();
      this._etat('✓ Méthode modifiée');
    } catch (e) {
      document.getElementById('ssModalErr').innerHTML = `<div class="alert alert-error">${escHtml(e.message)}</div>`;
    }
  },

  async supprimerExercice(exerciceId) {
    const e = this.data.exercices.find(x => x.id === exerciceId);
    if (!e) return;
    const nb = this.data.saisies.filter(x => x.exercice_id === exerciceId && (x.charge || x.reps || x.remarque)).length;
    if (!confirm(`Supprimer « ${e.exercices_bdd?.nom || 'cet exercice'} » de cette séance ?` +
      (nb ? `\n${nb} semaine${nb > 1 ? 's' : ''} de charges notées seront perdues.` : ''))) return;
    try {
      await db.deleteClientExercice(exerciceId);
      this.data.exercices = this.data.exercices.filter(x => x.id !== exerciceId);
      this.data.saisies = this.data.saisies.filter(x => x.exercice_id !== exerciceId);
      this._render();
      this._etat('✓ Exercice supprimé');
    } catch (err) {
      this._etat('Erreur : ' + err.message, true);
    }
  },

  async deplacer(exerciceId, sens) {
    const ex = this.data.exercices;
    const i = ex.findIndex(e => e.id === exerciceId);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= ex.length) return;
    [ex[i], ex[j]] = [ex[j], ex[i]];
    try {
      // Réécrit l'ordre de TOUS les exercices de la séance (0, 1, 2…) : les numéros
      // en base ne suivent pas toujours la liste (modèles numérotés à partir de 1, trous)
      await Promise.all(ex.map((e, k) => e.ordre === k ? null : db.updateClientExercice(e.id, { ordre: k })));
      ex.forEach((e, k) => { e.ordre = k; });
      this._render();
      this._etat('✓ Ordre modifié');
    } catch (err) {
      [ex[i], ex[j]] = [ex[j], ex[i]];
      this._etat('Erreur : ' + err.message, true);
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
