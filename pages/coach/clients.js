// APEX APP — Coach : page Clients (un seul tableau, filtres regroupés, tri)

const TYPES_CLIENT = { suivi: 'Studio + suivi', distance: 'Suivi à distance', studio: 'Studio sans suivi' };

const CoachClientsPage = {
  lignes: [],          // une ligne par client, avec tout ce que le tableau affiche
  coachs: [],
  _perimetre: 'mine',  // mine | all | inactifs
  _type: '',
  _filtreRef: '',
  _surveiller: '',     // '' | alerte | retard | sans_plan | sans_programme | bilan_a_lire | cycle_termine
  _recherche: '',
  _tri: { cle: 'nom', sens: 1 },
  _inactifs: null,

  render() {
    document.body.classList.add('coach-wide', 'coach-plein');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title">Clients <span class="cl-total" id="clTotal"></span></div>
        </div>
        <button class="btn btn-primary btn-small" onclick="CoachClientsPage.showCreateModal()">+ Nouveau client</button>
      </div>
      <div id="clFiltres"></div>
      <div id="dashContent"><div class="spinner" style="margin-top:2rem;"></div></div>
      <div id="coachModal"></div>`;
  },

  async init() {
    const moi = Router.userProfile;
    this._inactifs = null;
    this._recherche = '';
    try {
      const depuis = new Date(Date.now() - 56 * 864e5).toISOString().slice(0, 10);
      const [clients, coachs, plans, programmes, bilans, suivis] = await Promise.all([
        db.getTousClientsActifs(),
        db.getCoachs().catch(() => []),
        db.getAllActivePlans().catch(() => []),
        db.getCyclesClients(moi.id, true).catch(() => []),
        db.getBilansRecents(depuis).catch(() => []),
        db.getSuivisPourRetards().catch(() => []),
      ]);
      this.coachs = coachs.filter(c => c.id !== COMPTE_PARTAGE_ID);
      this._donnees = { plans, programmes, bilans, suivis };
      this.lignes = this._construire(clients);
      this._renderFiltres();
      this._renderTableau();
    } catch (e) {
      document.getElementById('dashContent').innerHTML = '<div class="alert alert-error">Erreur : ' + escHtml(e.message) + '</div>';
    }
  },

  // ── Données d'une ligne ────────────────────────────────────────────────────
  _construire(clients, inactifs = false) {
    const { plans, programmes, bilans, suivis } = this._donnees;
    const avecPlan = new Set(plans.map(p => p.profile_id));
    // Retard : seulement pour les clients dont je peux lire le journal (référent,
    // gérants) ; sinon le journal arrive vide et tout paraîtrait en retard
    const moi = Router.userProfile;
    const retards = new Set(suivis.filter(c => (moi.is_gerant || c.coach_referent_id === moi.id) && JournalSuivi.enRetard(
      c.date_debut, [].concat(c.journal_suivi_entete || [])[0]?.nb_semaines || 26, c.journal_suivi)).map(c => c.id));
    return clients.map(c => {
      const suivi = c.type_client !== 'studio';
      // Programme principal : celui dont la fin est la plus proche
      const progs = programmes.filter(p => p.client_id === c.id)
        .map(p => ({ p, a: CoachAccueilPage._avancement(p) }))
        .sort((x, y) => x.a.restantes - y.a.restantes);
      const prog = progs[0] || null;
      const bilan = bilans.find(b => b.client_id === c.id) || null;
      // À lire : n'importe quel bilan rempli et pas lu (le samedi, le dernier envoyé est en attente)
      const aLire = bilans.some(b => b.client_id === c.id && b.statut === 'complete' && b.coach_lu === false);
      const alertes = [];
      if (!inactifs) {
        if (retards.has(c.id)) alertes.push(['retard', 'Retard de suivi']);
        if (suivi && !avecPlan.has(c.id)) alertes.push(['sans_plan', 'Sans plan alimentaire']);
        if (!prog) alertes.push(['sans_programme', 'Sans programme d\'entraînement']);
        if (aLire) alertes.push(['bilan_a_lire', 'Bilan à lire']);
        if (prog?.a.termine) alertes.push(['cycle_termine', 'Cycle terminé']);
      }
      return {
        client: c, suivi, prog, autresProgs: progs.length - 1,
        plan: suivi ? avecPlan.has(c.id) : null,
        bilan, aLire, alertes,
      };
    });
  },

  _nom(c) { return `${c.prenom || ''} ${c.nom || ''}`.trim() || 'Client'; },

  _referent(c) {
    const co = this.coachs.find(x => x.id === c.coach_referent_id);
    return co ? (co.prenom || '') : '—';
  },

  // ── Filtres ────────────────────────────────────────────────────────────────
  _renderFiltres() {
    const p = this._perimetre;
    const seg = (v, l) => `<button class="${p === v ? 'on' : ''}" onclick="CoachClientsPage.perimetre('${v}')">${l}</button>`;
    const sel = (id, val, options) => `<select class="input cl-select" onchange="CoachClientsPage.${id}=this.value;CoachClientsPage._renderTableau()">
      ${options.map(([v, l]) => `<option value="${v}" ${val === v ? 'selected' : ''}>${escHtml(l)}</option>`).join('')}</select>`;
    document.getElementById('clFiltres').innerHTML = `
      <div class="cl-filtres">
        <input class="input cl-recherche" id="clRecherche" type="search" placeholder="🔍 Chercher un client…" value="${escHtml(this._recherche)}"
          oninput="CoachClientsPage._recherche=this.value;CoachClientsPage._renderTableau()">
        <div class="ag-switch">${seg('mine', 'Mes clients')}${seg('all', 'Tous')}${seg('inactifs', 'Inactifs')}</div>
        ${sel('_type', this._type, [['', 'Tous les types'], ...Object.entries(TYPES_CLIENT)])}
        ${sel('_filtreRef', this._filtreRef, [['', 'Tous les référents'], ...this.coachs.map(c => [c.id, `${c.prenom || ''} ${c.nom || ''}`.trim()])])}
        ${sel('_surveiller', this._surveiller, [['', 'À surveiller : tout'], ['alerte', 'Avec une alerte'], ['retard', 'Retard de suivi'],
          ['sans_plan', 'Sans plan alimentaire'], ['sans_programme', 'Sans programme d\'entraînement'], ['bilan_a_lire', 'Bilan à lire'], ['cycle_termine', 'Cycle terminé']])}
      </div>`;
  },

  async perimetre(v) {
    this._perimetre = v;
    if (v === 'inactifs' && !this._inactifs) {
      this._inactifs = this._construire(await db.getClientsInactifs().catch(() => []), true);
    }
    this._renderFiltres();
    this._renderTableau();
  },

  _filtrees() {
    const moi = Router.userProfile.id;
    const s = this._recherche.trim().toLowerCase();
    const base = this._perimetre === 'inactifs' ? (this._inactifs || []) : this.lignes;
    return base.filter(l => {
      const c = l.client;
      if (this._perimetre === 'mine' && c.coach_referent_id !== moi) return false;
      if (this._type && c.type_client !== this._type) return false;
      if (this._filtreRef && c.coach_referent_id !== this._filtreRef) return false;
      if (this._surveiller === 'alerte' && !l.alertes.length) return false;
      if (this._surveiller && this._surveiller !== 'alerte' && !l.alertes.some(a => a[0] === this._surveiller)) return false;
      if (s && !this._nom(c).toLowerCase().includes(s)) return false;
      return true;
    });
  },

  // ── Tri ────────────────────────────────────────────────────────────────────
  trier(cle) {
    this._tri = this._tri.cle === cle ? { cle, sens: -this._tri.sens } : { cle, sens: 1 };
    this._renderTableau();
  },

  _valeurTri(l, cle) {
    switch (cle) {
      case 'referent':  return this._referent(l.client).toLowerCase();
      case 'programme': return l.prog ? l.prog.a.restantes : 999;
      case 'plan':      return l.plan === null ? 2 : l.plan ? 1 : 0;
      case 'bilan':     return l.aLire ? '0' : l.bilan ? '1' + (9e12 - new Date(l.bilan.completed_at || l.bilan.semaine).getTime()) : '9';
      case 'alertes':   return -l.alertes.length;
      default:          return this._nom(l.client).toLowerCase();
    }
  },

  // ── Tableau ────────────────────────────────────────────────────────────────
  _bilanHtml(l) {
    const b = l.bilan;
    if (!b) return '<span class="cl-muted">—</span>';
    const quand = b.completed_at ? this._timeAgo(b.completed_at).replace('Il y a ', 'il y a ') : '';
    const scores = (b.reponses || []).filter(r => r.type === 'scale').slice(0, 5)
      .map(r => `${r.label.replace(/\?.*/, '').trim()} : ${r.reponse}/10`).join('\n');
    const [classe, texte] = b.statut !== 'complete' ? ['attente', 'En attente'] : l.aLire ? ['alire', 'À lire'] : ['lu', 'Lu'];
    return `<span class="cl-pastille ${classe}" ${scores ? `title="${escHtml(scores)}"` : ''}>${texte}</span>${quand ? `<span class="cl-sous">${quand}</span>` : ''}`;
  },

  _renderTableau() {
    const lignes = this._filtrees().sort((a, b) => {
      const va = this._valeurTri(a, this._tri.cle), vb = this._valeurTri(b, this._tri.cle);
      return (va < vb ? -1 : va > vb ? 1 : 0) * this._tri.sens
        || this._nom(a.client).localeCompare(this._nom(b.client));
    });
    document.getElementById('clTotal').textContent = lignes.length;
    const th = (cle, label) => `<th onclick="CoachClientsPage.trier('${cle}')" class="${this._tri.cle === cle ? 'trie' : ''}">${label}${this._tri.cle === cle ? (this._tri.sens > 0 ? ' ↑' : ' ↓') : ''}</th>`;
    document.getElementById('dashContent').innerHTML = lignes.length ? `
      <div class="cl-cadre">
        <table class="cl-table">
          <thead><tr>
            ${th('nom', 'Client')}${th('referent', 'Référent')}${th('programme', 'Entraînement')}${th('plan', 'Nutrition')}${th('bilan', 'Bilan')}${th('alertes', 'Alertes')}
          </tr></thead>
          <tbody>${lignes.map(l => {
            const c = l.client;
            return `
            <tr onclick="CoachClientsPage.openClient('${c.id}')">
              <td data-label="Client"><div class="cl-nom">${escHtml(this._nom(c))}</div><span class="cl-sous">${TYPES_CLIENT[c.type_client] || ''}</span></td>
              <td data-label="Référent">${escHtml(this._referent(c))}</td>
              <td data-label="Entraînement">${l.prog
                ? `<div class="cl-prog">${escHtml(l.prog.p.nom)}${l.autresProgs > 0 ? ` <span class="cl-sous">+${l.autresProgs}</span>` : ''}</div>
                   <span class="cl-sous ${l.prog.a.termine ? 'cl-rouge' : l.prog.a.restantes <= 0 ? 'cl-orange' : ''}">${l.prog.a.termine ? 'terminé' : `sem. ${l.prog.a.faites}/${l.prog.a.nb}`}</span>`
                : '<span class="cl-muted">Aucun</span>'}</td>
              <td data-label="Nutrition">${l.plan === null ? '<span class="cl-muted">—</span>' : l.plan ? '<span class="cl-vert">Actif</span>' : '<span class="cl-rouge">Sans plan</span>'}</td>
              <td data-label="Bilan">${this._bilanHtml(l)}</td>
              <td data-label="Alertes">${l.alertes.map(a => `<span class="cl-alerte ${a[0]}">${a[1]}</span>`).join('') || ''}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>` : '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">Aucun client pour ces filtres.</div></div>';
  },

  _timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60)  return `Il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h / 24)}j`;
  },

  openClient(id) {
    Router.navigate('coach-client-edit', { clientId: id });
  },

  // ── Création client ──────────────────────────────────────────────────────

  showCreateModal() {
    document.getElementById('coachModal').innerHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">Nouveau client
            <button class="modal-close" onclick="document.getElementById('coachModal').innerHTML=''">×</button>
          </div>
          <div id="createForm">
            <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="field"><label class="field-label">Nom</label><input class="input" id="newNom" placeholder="Dupont"></div>
              <div class="field"><label class="field-label">Prénom</label><input class="input" id="newPrenom" placeholder="Marc"></div>
            </div>
            <div class="field"><label class="field-label">Email</label><input class="input" id="newEmail" type="email" placeholder="marc@email.com"></div>
            <div class="field"><label class="field-label">Type de client</label>
              <select class="input" id="newType">
                <option value="suivi">Studio + suivi</option>
                <option value="distance">Suivi à distance</option>
              </select>
            </div>
            <div id="createError"></div>
            <button class="btn btn-primary" style="width:100%" onclick="CoachClientsPage.createClient()" id="createBtn">Créer le compte</button>
          </div>
          <div id="inviteResult" style="display:none;"></div>
        </div>
      </div>`;
  },

  async createClient() {
    const nom    = document.getElementById('newNom').value.trim();
    const prenom = document.getElementById('newPrenom').value.trim();
    const email  = document.getElementById('newEmail').value.trim();
    const typeClient = document.getElementById('newType').value;
    const btn    = document.getElementById('createBtn');

    if (!prenom || !email) {
      document.getElementById('createError').innerHTML = '<div class="alert alert-error">Prénom et email requis.</div>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Création en cours…';

    try {
      const { profileId, password } = await db.createClientAccount(email, prenom, nom, typeClient);
      // Le coach qui crée le client en devient le référent (modifiable sur la fiche)
      await db.updateProfile(profileId, { coach_referent_id: Router.userProfile.id }).catch(() => {});
      const appUrl  = APP_CONFIG.APP_URL;
      const message = `Bonjour ${prenom} 👊\n\nTon espace ONE2ONE est prêt !\n\n🔗 ${appUrl}\n📧 ${email}\n🔑 ${password}\n\nConnecte-toi avec ce mot de passe : l'app te demandera aussitôt d'en choisir un nouveau.`;
      this._message = message;   // gardé ici : une apostrophe casserait un onclick
      document.getElementById('createForm').style.display = 'none';
      document.getElementById('inviteResult').style.display = 'block';
      document.getElementById('inviteResult').innerHTML = `
        <div style="text-align:center;margin-bottom:1.25rem;">
          <div style="font-size:1.5rem;margin-bottom:0.5rem;">✅</div>
          <div style="font-weight:700;margin-bottom:0.25rem;">Compte créé pour ${escHtml(prenom)} ${escHtml(nom || '')}</div>
          <div style="font-size:13px;color:var(--gray);">Envoie ces identifiants au client via WhatsApp.</div>
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:1rem;font-size:13px;margin-bottom:1rem;line-height:1.8;">
          <div>🔗 <b>Lien :</b> ${appUrl}</div>
          <div>📧 <b>Email :</b> ${email}</div>
          <div>🔑 <b>Mot de passe :</b> ${escHtml(password)}</div>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-bottom:0.5rem;" onclick="CoachClientsPage.copyCredentials()">📋 Copier le message WhatsApp</button>
        <button class="btn btn-secondary" style="width:100%;" onclick="document.getElementById('coachModal').innerHTML='';CoachClientsPage.init()">Fermer</button>
      `;
    } catch (e) {
      document.getElementById('createError').innerHTML = `<div class="alert alert-error">${e.message}</div>`;
      btn.disabled = false;
      btn.textContent = 'Créer le compte';
    }
  },

  copyCredentials() {
    const msg = this._message || '';
    navigator.clipboard.writeText(msg).then(() => {
      const btn = document.querySelector('#inviteResult .btn-primary');
      if (btn) {
        btn.textContent = '✅ Copié !';
        setTimeout(() => { btn.textContent = '📋 Copier le message WhatsApp'; }, 2000);
      }
    }).catch(() => { prompt('Copie ce message :', msg); });
  }
};
