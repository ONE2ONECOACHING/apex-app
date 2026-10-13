// APEX APP — Coach : tableau de bord
// 1. Mes coachings du jour (tous mes rendez-vous)
// 2. Bilans à traiter, 3. Bilans en attente (relance), 4. Cycles d'entraînement :
//    uniquement les clients dont je suis le coach référent.

const CoachAccueilPage = {
  coachings: [],
  aTraiter: [],
  enAttente: [],
  cycles: [],
  retards: [],
  _relances: new Set(),   // bilans relancés pendant cette visite

  render() {
    document.body.classList.add('coach-wide');
    const prenom = Router.userProfile?.prenom || '';
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title">Bonjour ${escHtml(prenom)}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input class="input" id="acRecherche" type="search" placeholder="Chercher un client…" autocomplete="off"
            style="height:36px;width:220px;font-size:13px;" oninput="CoachAccueilPage.chercher(this.value)">
          <button class="btn btn-primary btn-small" onclick="window.location.hash='#coach-agenda'">+ Rendez-vous</button>
        </div>
      </div>
      <div id="acResultats" class="ag-results" style="margin:-0.5rem 0 1rem;"></div>
      <div id="acContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    const me = Router.userProfile;
    if (!me || me.role !== 'coach') { window.location.hash = '#login'; return; }
    this._relances = new Set();
    this._clients = null;
    try {
      let suivis;
      [this.coachings, this.aTraiter, this.enAttente, this.cycles, suivis] = await Promise.all([
        db.getCoachingsDuJour(me.id).catch(() => []),
        db.getBilansATraiter(me.id).catch(() => []),
        db.getBilansEnAttente(me.id).catch(() => []),
        db.getCyclesClients(me.id).catch(() => []),
        db.getSuivisPourRetards().catch(() => []),
      ]);
      // Retards de suivi : mes clients dont les deux dernières semaines du journal ne sont pas faites
      this.retards = suivis.filter(c => c.coach_referent_id === me.id && JournalSuivi.enRetard(
        c.date_debut, [].concat(c.journal_suivi_entete || [])[0]?.nb_semaines || 26, c.journal_suivi));
      this._render();
      clearInterval(this._minuteur);
      this._minuteur = setInterval(() => {
        if (Router.currentPage !== 'coach-accueil') { clearInterval(this._minuteur); return; }
        this._render();
      }, 60000);
    } catch (e) {
      document.getElementById('acContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  // ── Recherche rapide d'un client ──────────────────────────────────────────
  async chercher(q) {
    const box = document.getElementById('acResultats');
    const s = q.trim().toLowerCase();
    if (!s) { box.innerHTML = ''; return; }
    if (!this._clients) this._clients = await db.getClientsAgenda().catch(() => []);
    const res = this._clients.filter(c => `${c.prenom || ''} ${c.nom || ''}`.toLowerCase().includes(s)).slice(0, 8);
    box.innerHTML = res.length
      ? res.map(c => `<div class="ag-result" onclick="Router.navigate('coach-client-edit',{clientId:'${c.id}'})">${escHtml(`${c.prenom || ''} ${c.nom || ''}`.trim())}</div>`).join('')
      : '<div class="ag-result" style="color:var(--gray-light);cursor:default;">Aucun client trouvé</div>';
  },

  // ── Rendu ─────────────────────────────────────────────────────────────────
  _nom(c) { return escHtml(`${c?.prenom || ''} ${c?.nom || ''}`.trim() || 'Client'); },

  _hm(iso) { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); },

  _ilYa(iso) {
    const j = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
    return j <= 0 ? "aujourd'hui" : j === 1 ? 'hier' : `il y a ${j} j`;
  },

  // Où en est un programme : semaines réellement faites (et non le temps écoulé).
  // Une semaine est faite quand chaque séance (hors cardio) a été faite une fois de
  // plus : séance au studio = semaine cochée dans la grille ; séance à distance =
  // séance enregistrée par le client (reliée au programme, sinon reconnue par son
  // nom si elle a été faite après l'attribution de la phase).
  _avancement(p) {
    const nb = p.nb_semaines || 4;
    // Renforcement d'abord ; un programme 100 % cardio compte ses semaines cardio validées
    const renfo = (p.client_prog_seances || []).filter(s => !s.cardio);
    const seances = renfo.length ? renfo : (p.client_prog_seances || []);
    const logs = p._logs || [];
    // Une séance reconnue par son nom ne compte que si elle a été faite après
    // l'attribution de la phase : chaque nouvelle phase repart à zéro, même si
    // ses séances portent les mêmes noms que celles de la phase précédente.
    const attribuee = (p.created_at || '').slice(0, 10);
    const depuis = [p.date_debut, attribuee].filter(Boolean).sort().pop() || '';
    // Tout ce qui précède « depuis » (attribution ou « Repartir de zéro ») est ignoré
    const fois = s => {
      if (s.cardio) return (p._cardio || []).filter(v => v.seance_id === s.id && (v.completed_at || '').slice(0, 10) >= depuis).length;
      if (s.lieu === 'studio') return (s.seances_studio_semaines || []).filter(w => (w.faite_le || '') >= depuis).length;
      return logs.filter(l => l.date_seance >= depuis && (l.seance_id === s.id || (!l.seance_id
        && (!l.programme_id || l.programme_id === p.id)
        && (l.nom_seance || '').trim().toLowerCase() === (s.nom || '').trim().toLowerCase()))).length;
    };
    const faites = seances.length ? Math.min(...seances.map(fois)) : 0;
    const semaine = faites + 1;
    return { semaine, faites, nb, restantes: nb - semaine, termine: faites >= nb };
  },

  _bloc(titre, nb, couleur, contenu) {
    return `
      <div class="ac-bloc">
        <div class="ac-bloc-titre">${titre} <span class="ac-compte" style="color:${couleur};">${nb}</span></div>
        ${contenu}
      </div>`;
  },

  _render() {
    const vide = texte => `<div class="ac-vide">${texte}</div>`;

    // Seulement les coachings en cours ou à venir : un créneau terminé disparaît
    const maintenant = Date.now();
    const aVenir = this.coachings.filter(r => new Date(r.fin).getTime() > maintenant);
    const termines = this.coachings.length - aVenir.length;
    const coachings = aVenir.length
      ? aVenir.map(r => `
          <div class="ac-ligne" onclick="${r.type === 'prospect' ? "window.location.hash='#coach-agenda'" : `CoachSeanceStudioPage.ouvrirPourClient('${r.client_id}')`}">
            <span class="ac-heure">${this._hm(r.debut)} – ${this._hm(r.fin)}${new Date(r.debut).getTime() <= maintenant ? ' <span class="ac-en-cours">en cours</span>' : ''}</span>
            <span class="ac-nom">${r.type === 'prospect' ? '🎯 ' + escHtml(r.prospect_nom || 'Prospect') : this._nom(r.client)}</span><span class="ac-fleche">›</span>
          </div>`).join('')
      : vide(termines
          ? `Plus de coaching aujourd'hui (${termines} terminé${termines > 1 ? 's' : ''}) · <a href="#coach-agenda">ouvrir l'agenda</a>`
          : `Aucun coaching aujourd'hui · <a href="#coach-agenda">ouvrir l'agenda</a>`);

    const aTraiter = this.aTraiter.length
      ? this.aTraiter.map(b => `
          <div class="ac-ligne" onclick="Router.navigate('coach-bilan-client',{clientId:'${b.client_id}'})">
            <span class="ac-nom">${this._nom(b.client)}</span>
            <span class="ac-meta">${this._ilYa(b.completed_at)}</span><span class="ac-fleche">›</span>
          </div>`).join('')
      : vide('Aucun bilan à traiter.');

    // Une ligne par client, avec le nombre de bilans en attente
    const parClient = new Map();
    for (const b of this.enAttente) {
      if (!parClient.has(b.client_id)) parClient.set(b.client_id, { client: b.client, nb: 0, semaine: b.semaine });
      const c = parClient.get(b.client_id);
      c.nb++;
      if (b.semaine > c.semaine) c.semaine = b.semaine;
    }
    const enAttente = parClient.size
      ? [...parClient.entries()].map(([clientId, c]) => {
          const relance = this._relances.has(clientId);
          const semaine = new Date(c.semaine + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
          return `
          <div class="ac-ligne">
            <span class="ac-nom" style="cursor:pointer;" onclick="Router.navigate('coach-bilan-client',{clientId:'${clientId}'})">${this._nom(c.client)}</span>
            <span class="ac-meta">${c.nb > 1 ? `${c.nb} bilans en attente` : `semaine du ${semaine}`}</span>
            <button class="ac-cloche ${relance ? 'faite' : ''}" title="${relance ? 'Relance envoyée' : 'Relancer par notification'}"
              ${relance ? 'disabled' : `onclick="CoachAccueilPage.relancer('${clientId}')"`}>${relance ? '✓' : '🔔'}</button>
          </div>`;
        }).join('')
      : vide('Aucun bilan en attente.');

    const cycles = this.cycles
      .map(p => ({ p, a: this._avancement(p) }))
      .sort((x, y) => x.a.restantes - y.a.restantes);
    const cyclesHtml = cycles.length
      ? cycles.map(({ p, a }) => `
          <div class="ac-ligne" onclick="Router.navigate('coach-client-programme',{clientId:'${p.client_id}'})">
            <span class="ac-nom">${this._nom(p.client)}</span>
            <span class="ac-meta">${escHtml(p.nom)}</span>
            <span class="ac-sem ${a.termine ? 'fin' : a.restantes <= 0 ? 'derniere' : ''}">${a.termine ? 'terminé' : `sem. ${a.faites}/${a.nb}`}</span>
            ${a.termine ? `<button class="ac-cloche" title="Ne plus afficher cette phase terminée" onclick="event.stopPropagation();CoachAccueilPage.cycleVu('${p.id}')">✓ Vu</button>` : '<span class="ac-fleche">›</span>'}
          </div>`).join('')
      : vide('Aucun programme en cours.');

    document.getElementById('acContent').innerHTML = `
      <div class="ac-grille">
        ${this._bloc('📅 Mes coachings du jour', aVenir.length, 'var(--gold)', coachings)}
        ${this._bloc('📋 Bilans à traiter', this.aTraiter.length, 'var(--error)', aTraiter)}
        ${this._bloc('⏳ Bilans en attente', parClient.size, '#D97706', enAttente)}
        ${this._bloc('⚠️ Retards de suivi', this.retards.length, 'var(--error)', this.retards.length
          ? this.retards.map(c => `
            <div class="ac-ligne" onclick="Router.navigate('coach-journal-suivi',{clientId:'${c.id}'})">
              <span class="ac-nom">${this._nom(c)}</span>
              <span class="ac-retard">2 semaines sans suivi</span><span class="ac-fleche">›</span>
            </div>`).join('')
          : vide('Aucun retard de suivi.'))}
        ${this._bloc('💪 Cycles d\'entraînement', cycles.length, 'var(--gray)', cyclesHtml)}
      </div>`;
  },

  async cycleVu(programmeId) {
    try {
      await db.marquerCycleVu(programmeId);
      this.cycles = this.cycles.filter(p => p.id !== programmeId);
      this._render();
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  },

  async relancer(clientId) {
    try {
      await db.sendPush(clientId, '📝 Ton bilan t\'attend', 'Prends 2 minutes pour remplir ton bilan de la semaine 💪', '#client-bilan');
      this._relances.add(clientId);
      this._render();
      toast('Relance envoyée', 'success');
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  }
};
