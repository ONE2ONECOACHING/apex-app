// APEX APP — Coach : journal de suivi d'un client
// Une ligne par lundi sur la durée du suivi : nutrition et entraînement
// (action prévue / modification appliquée), retour du client (bilan + texte
// libre), case « Fait ». Référent : écriture ; gérants : lecture.

// Les semaines d'avant le lancement du journal ne sont jamais « en retard »
const JOURNAL_DEPART = '2026-10-12';

// Calcul des semaines et des statuts (partagé avec le tableau de bord et la liste)
const JournalSuivi = {
  lundi(d) {
    const x = new Date(d); x.setHours(0, 0, 0, 0);
    const j = x.getDay(); x.setDate(x.getDate() + (j === 0 ? -6 : 1 - j));
    return x;
  },

  ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },

  // Semaines du suivi : [{ k, lundi: 'AAAA-MM-JJ' }]
  semaines(dateDebut, nb) {
    if (!dateDebut) return [];
    const debut = this.lundi(new Date(dateDebut + 'T00:00:00'));
    return Array.from({ length: nb }, (_, i) => {
      const d = new Date(debut); d.setDate(d.getDate() + 7 * i);
      return { k: i + 1, lundi: this.ymd(d) };
    });
  },

  // fait | en_cours | en_retard | planifie | a_venir | avant
  statut(ligne, lundi) {
    const actuel = this.ymd(this.lundi(new Date()));
    if (ligne?.fait) return 'fait';
    if (lundi === actuel) return 'en_cours';
    if (lundi < actuel) return lundi < JOURNAL_DEPART ? 'avant' : 'en_retard';
    return (ligne?.nutrition_prevue || ligne?.entrainement_prevu) ? 'planifie' : 'a_venir';
  },

  // Retard de suivi : les deux dernières semaines passées n'ont pas été faites
  enRetard(dateDebut, nb, lignes) {
    const parSemaine = new Map((lignes || []).map(l => [l.semaine, l]));
    const passees = this.semaines(dateDebut, nb)
      .filter(s => ['en_retard', 'fait'].includes(this.statut(parSemaine.get(s.lundi), s.lundi)));
    const deux = passees.slice(-2);
    return deux.length === 2 && deux.every(s => !parSemaine.get(s.lundi)?.fait);
  },

  LIBELLES: {
    fait: 'Fait', en_cours: 'En cours', en_retard: 'En retard',
    planifie: 'Planifié', a_venir: 'À venir', avant: 'Avant le journal',
  },
};

const CoachJournalSuiviPage = {
  client: null,
  lignes: [],
  entete: null,
  bilans: [],
  _ouverts: new Set(),   // semaines dont le bilan est déplié
  _timers: {},

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="jsTitre">Journal de suivi</div>
        </div>
      </div>
      <div id="jsContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    this.client = null; this.lignes = []; this.entete = null; this.bilans = [];
    this._ouverts = new Set(); this._timers = {};
    const params = Router.getParams();
    if (!params.clientId) { window.location.hash = '#coach-clients'; return; }
    try {
      const [client, journal, bilans] = await Promise.all([
        db.getProfile(params.clientId),
        db.getJournalSuivi(params.clientId),
        db.getBilansDuClient(params.clientId).catch(() => []),
      ]);
      this.client = client;
      this.lignes = journal.lignes;
      this.entete = journal.entete;
      this.bilans = bilans;
      document.getElementById('jsTitre').textContent = 'Journal de suivi — ' + (client.prenom || 'Client');
      this._render();
      document.querySelector('.js-ligne.en_cours')?.scrollIntoView({ block: 'center' });
    } catch (e) {
      document.getElementById('jsContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  _peutEcrire() { return this.client?.coach_referent_id === Router.userProfile?.id; },

  _nb() { return this.entete?.nb_semaines || 26; },

  _ligne(lundi) { return this.lignes.find(l => l.semaine === lundi); },

  _render() {
    const c = this.client;
    const ecrire = this._peutEcrire();
    const nb = this._nb();
    const semaines = JournalSuivi.semaines(c.date_debut, nb);
    const actuel = JournalSuivi.ymd(JournalSuivi.lundi(new Date()));
    const fmt = ymd => new Date(ymd + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

    if (!c.date_debut) {
      document.getElementById('jsContent').innerHTML = `
        ${coachClientNav(c.id, 'coach-journal-suivi')}
        <div class="card"><div style="font-size:14px;">Ce client n'a pas de date de début de suivi.
          Renseigne la « semaine courante » dans <a href="#" onclick="Router.navigate('coach-calcul-nutrition',{clientId:'${c.id}'});return false;">Plan alimentaire › Calcul</a>.</div></div>`;
      return;
    }

    // En-tête : avancement, leviers, prochaine action
    const enCours = semaines.find(s => s.lundi === actuel);
    const kActuel = enCours ? enCours.k : (actuel < semaines[0].lundi ? 0 : nb);
    const prochaine = semaines
      .filter(s => s.lundi >= actuel)
      .map(s => ({ s, l: this._ligne(s.lundi) }))
      .find(({ l }) => l && !l.fait && (l.nutrition_prevue || l.entrainement_prevu));
    const retard = JournalSuivi.enRetard(c.date_debut, nb, this.lignes);
    const dis = ecrire ? '' : 'disabled';

    const entete = `
      <div class="card js-entete">
        <div class="js-avancement">
          <div>
            <div class="js-titre-av">Semaine ${Math.min(kActuel, nb)} / ${nb}</div>
            <div class="js-barre"><span style="width:${Math.min(100, Math.round(kActuel / nb * 100))}%"></span></div>
          </div>
          ${ecrire ? `<div class="js-duree">
            <button onclick="CoachJournalSuiviPage.changerDuree(-1)" title="Une semaine de moins">−</button>
            <span>${nb} sem.</span>
            <button onclick="CoachJournalSuiviPage.changerDuree(1)" title="Une semaine de plus">+</button>
          </div>` : ''}
        </div>
        ${retard ? '<div class="js-alerte">⚠️ Retard de suivi : les deux dernières semaines n\'ont pas été faites.</div>' : ''}
        <div class="js-entete-grille">
          <div class="field" style="margin:0;">
            <label class="field-label">Leviers prioritaires</label>
            <textarea class="input" rows="2" style="height:auto;" id="jsLeviers" ${dis}
              placeholder="Hydratation, sommeil, 3 séances par semaine…"
              oninput="CoachJournalSuiviPage.saisirLeviers()">${escHtml(this.entete?.leviers || '')}</textarea>
          </div>
          <div>
            <div class="field-label">Prochaine action</div>
            <div class="js-prochaine">${prochaine
              ? `<b>S${prochaine.s.k} · ${fmt(prochaine.s.lundi)}</b><br>${escHtml([prochaine.l.nutrition_prevue, prochaine.l.entrainement_prevu].filter(Boolean).join(' · '))}`
              : '<span style="color:var(--gray-light);">Aucune action prévue</span>'}</div>
          </div>
        </div>
        <div id="jsEtat" class="ss-etat" style="margin-top:6px;">${ecrire ? '' : 'Lecture seule : seul le coach référent peut remplir ce journal.'}</div>
      </div>`;

    const lignes = semaines.map(s => {
      const l = this._ligne(s.lundi) || {};
      const st = JournalSuivi.statut(l, s.lundi);
      const bilan = this.bilans.find(b => b.semaine === s.lundi);
      const ouvert = this._ouverts.has(s.lundi);
      const champ = (nom, ph) => `<textarea rows="2" ${dis} placeholder="${ph}" data-semaine="${s.lundi}" data-champ="${nom}"
          oninput="CoachJournalSuiviPage.saisir('${s.lundi}')">${escHtml(l[nom] || '')}</textarea>`;
      return `
        <tr class="js-ligne ${st}">
          <td class="js-sem"><b>S${s.k}</b><br><span>${fmt(s.lundi)}</span></td>
          <td><span class="js-statut ${st}">${JournalSuivi.LIBELLES[st]}</span></td>
          <td>${champ('nutrition_prevue', 'Action prévue')}${champ('nutrition_appliquee', 'Modification appliquée')}</td>
          <td>${champ('entrainement_prevu', 'Action prévue')}${champ('entrainement_applique', 'Modification appliquée')}</td>
          <td>
            ${bilan ? `<button class="js-bilan ${bilan.statut === 'complete' ? 'ok' : ''}" onclick="CoachJournalSuiviPage.basculerBilan('${s.lundi}')">
                ${bilan.statut === 'complete' ? '📋 Bilan' : '⏳ Bilan non rempli'} ${bilan.statut === 'complete' ? (ouvert ? '▴' : '▾') : ''}</button>` : ''}
            ${champ('retour', 'Retour du client')}
          </td>
          <td class="js-fait"><input type="checkbox" ${l.fait ? 'checked' : ''} ${dis}
            onchange="CoachJournalSuiviPage.cocher('${s.lundi}', this.checked)"></td>
        </tr>
        ${ouvert && bilan?.statut === 'complete' ? `<tr class="js-bilan-detail"><td></td><td colspan="5">${this._bilanHtml(bilan)}</td></tr>` : ''}`;
    }).join('');

    document.getElementById('jsContent').innerHTML = `
      ${coachClientNav(c.id, 'coach-journal-suivi')}
      ${entete}
      <div class="js-scroll">
        <table class="js-table">
          <thead><tr><th>Semaine</th><th>Statut</th><th>Nutrition</th><th>Entraînement</th><th>Retour du client</th><th>Fait</th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>
      </div>`;
  },

  _bilanHtml(b) {
    const reps = (b.reponses || []).filter(r => r.reponse !== '' && r.reponse != null);
    if (!reps.length) return '<div class="ac-vide">Bilan sans réponse.</div>';
    return `<div class="js-reponses">${reps.map(r => `
      <div><span>${escHtml(r.label)}</span><b>${escHtml(String(r.reponse))}${r.type === 'scale' ? ' / 10' : ''}</b></div>`).join('')}</div>`;
  },

  // Enregistre tout de suite les saisies en attente (avant de redessiner l'écran)
  async _viderAttente() {
    for (const [cle, t] of Object.entries(this._timers)) {
      clearTimeout(t);
      if (cle !== '_leviers') await this._enregistrer(cle);
    }
    this._timers = {};
  },

  async basculerBilan(lundi) {
    await this._viderAttente();
    if (this._ouverts.has(lundi)) this._ouverts.delete(lundi); else this._ouverts.add(lundi);
    this._render();
  },

  _etat(texte, erreur = false) {
    const el = document.getElementById('jsEtat');
    if (el) { el.textContent = texte; el.classList.toggle('erreur', erreur); }
  },

  saisir(lundi) {
    this._etat('Enregistrement…');
    clearTimeout(this._timers[lundi]);
    this._timers[lundi] = setTimeout(() => this._enregistrer(lundi), 700);
  },

  async _enregistrer(lundi, extra = {}) {
    delete this._timers[lundi];
    const champs = {};
    document.querySelectorAll(`[data-semaine="${lundi}"]`).forEach(el => { champs[el.dataset.champ] = el.value.trim() || null; });
    try {
      const ligne = await db.saveJournalLigne(this.client.id, lundi, { ...champs, ...extra });
      this.lignes = this.lignes.filter(l => l.semaine !== lundi).concat(ligne);
      this._etat('✓ Enregistré');
      return ligne;
    } catch (e) {
      this._etat('Erreur : ' + e.message, true);
      return null;
    }
  },

  async cocher(lundi, fait) {
    clearTimeout(this._timers[lundi]);
    delete this._timers[lundi];
    await this._viderAttente();
    const ok = await this._enregistrer(lundi, { fait, fait_le: fait ? new Date().toISOString() : null });
    if (ok) { this._render(); this._etat(fait ? '✓ Semaine faite' : 'Semaine décochée'); }
  },

  saisirLeviers() {
    this._etat('Enregistrement…');
    clearTimeout(this._timers._leviers);
    this._timers._leviers = setTimeout(async () => {
      try {
        const leviers = document.getElementById('jsLeviers').value.trim() || null;
        await db.saveJournalEntete(this.client.id, { nb_semaines: this._nb(), leviers });
        this.entete = { ...(this.entete || {}), leviers, nb_semaines: this._nb() };
        this._etat('✓ Enregistré');
      } catch (e) { this._etat('Erreur : ' + e.message, true); }
    }, 700);
  },

  async changerDuree(delta) {
    await this._viderAttente();
    const nb = Math.min(104, Math.max(1, this._nb() + delta));
    try {
      await db.saveJournalEntete(this.client.id, { nb_semaines: nb, leviers: this.entete?.leviers ?? null });
      this.entete = { ...(this.entete || {}), nb_semaines: nb };
      this._render();
      this._etat(`Durée du suivi : ${nb} semaines`);
    } catch (e) { this._etat('Erreur : ' + e.message, true); }
  },
};
