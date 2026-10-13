// APEX APP — Coach : messagerie (liste des conversations + conversation ouverte)
// Conversations visibles : mes clients suivis (canal « suivi »), tous les clients
// studio (canal « equipe ») ; un gérant voit aussi toutes les conversations de
// suivi, en lecture seule quand il n'est pas le référent.

const CoachMessageriePage = {
  conversations: [],   // { client, canal, resume, peutEcrire }
  coachs: [],
  _actif: null,        // `${clientId}|${canal}`
  _recherche: '',
  _filtreCoach: '',
  _nonLus: false,      // filtre « Non lus »

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title">Messagerie</div>
        </div>
      </div>
      <div class="msg-cadre" id="msgCadre">
        <div class="msg-liste" id="msgListe"><div class="spinner" style="margin:2rem auto;"></div></div>
        <div class="msg-conv" id="msgConv"><div class="chat-vide">Choisis une conversation.</div></div>
      </div>`;
  },

  async init() {
    const moi = Router.userProfile;
    if (!moi || moi.role !== 'coach') { window.location.hash = '#coach-accueil'; return; }
    this._actif = null;
    try {
      const [clients, resume, coachs] = await Promise.all([
        db.getClientsAgenda(),
        db.getConversationsResume().catch(() => []),
        db.getCoachs().catch(() => []),
      ]);
      this.coachs = coachs.filter(c => c.id !== COMPTE_PARTAGE_ID);
      const resumes = new Map(resume.map(r => [`${r.client_id}|${r.canal}`, r]));
      this.conversations = clients.map(c => {
        const canal = c.type_client === 'studio' ? 'equipe' : 'suivi';
        const referent = c.coach_referent_id === moi.id;
        if (canal === 'suivi' && !referent && !moi.is_gerant) return null;
        return { client: c, canal, resume: resumes.get(`${c.id}|${canal}`) || null, peutEcrire: canal === 'equipe' || referent };
      }).filter(Boolean);
      this._renderListe();

      // Conversation demandée par une notification (#coach-messagerie?c=…&k=…)
      const q = new URLSearchParams((window.location.hash.split('?')[1]) || '');
      const params = Router.getParams();
      const cible = q.get('c') || params.clientId;
      if (cible) this.ouvrir(cible, q.get('k') || null);
    } catch (e) {
      document.getElementById('msgListe').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  _nonLu(v) { return v.peutEcrire ? Number(v.resume?.non_lus || 0) : 0; },

  _nom(c) { return `${c.prenom || ''} ${c.nom || ''}`.trim() || 'Client'; },

  _apercu(r) {
    if (!r) return '';
    if (r.dernier_type === 'photo') return '📷 Photo';
    if (r.dernier_type === 'vocal') return '🎤 Message vocal';
    return r.dernier_texte || '';
  },

  _quand(iso) {
    if (!iso) return '';
    const d = new Date(iso), auj = new Date();
    if (d.toDateString() === auj.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  },

  _renderListe() {
    const moi = Router.userProfile;
    const s = this._recherche.toLowerCase();
    const liste = this.conversations
      .filter(v => !s || this._nom(v.client).toLowerCase().includes(s))
      // Seulement les discussions existantes ; une recherche montre aussi les
      // clients sans message, pour en commencer une
      .filter(v => s || v.resume || this._actif === `${v.client.id}|${v.canal}`)
      .filter(v => !this._nonLus || this._nonLu(v) || this._actif === `${v.client.id}|${v.canal}`)
      .filter(v => !this._filtreCoach || v.client.coach_referent_id === this._filtreCoach)
      .sort((a, b) => (b.resume?.dernier_le || '').localeCompare(a.resume?.dernier_le || '') || this._nom(a.client).localeCompare(this._nom(b.client)));

    document.getElementById('msgListe').innerHTML = `
      <div class="msg-filtres">
        <div class="ag-switch msg-switch">
          <button class="${this._nonLus ? '' : 'on'}" onclick="CoachMessageriePage._nonLus=false;CoachMessageriePage._renderListe()">Toutes</button>
          <button class="${this._nonLus ? 'on' : ''}" onclick="CoachMessageriePage._nonLus=true;CoachMessageriePage._renderListe()">Non lues</button>
        </div>
        <input class="input" type="search" placeholder="🔍 Chercher un client…" value="${escHtml(this._recherche)}"
          oninput="CoachMessageriePage._recherche=this.value;CoachMessageriePage._renderListe();this.focus();this.setSelectionRange(this.value.length,this.value.length)">
        ${moi.is_gerant ? `
        <select class="input" onchange="CoachMessageriePage._filtreCoach=this.value;CoachMessageriePage._renderListe()">
          <option value="">Tous les coachs</option>
          ${this.coachs.map(c => `<option value="${c.id}" ${this._filtreCoach === c.id ? 'selected' : ''}>${escHtml(`${c.prenom || ''} ${c.nom || ''}`.trim())}</option>`).join('')}
        </select>` : ''}
      </div>
      ${liste.length ? liste.map(v => {
        const cle = `${v.client.id}|${v.canal}`;
        const nonLus = this._nonLu(v);
        return `
          <div class="msg-item ${this._actif === cle ? 'on' : ''} ${nonLus ? 'non-lu' : ''}" onclick="CoachMessageriePage.ouvrir('${v.client.id}','${v.canal}')">
            <span class="msg-point"></span>
            <div class="msg-item-corps">
              <div class="msg-item-haut">
                <span class="msg-item-nom">${escHtml(this._nom(v.client))}</span>
                <span class="msg-item-quand">${this._quand(v.resume?.dernier_le)}</span>
              </div>
              <div class="msg-item-bas">
                <span class="msg-item-apercu">${v.canal === 'equipe' ? '<span class="msg-canal">Équipe</span> ' : ''}${!v.peutEcrire ? '<span class="msg-canal lecture">lecture</span> ' : ''}${escHtml(this._apercu(v.resume))}</span>
                ${nonLus ? `<span class="msg-badge">${nonLus}</span>` : ''}
              </div>
            </div>
          </div>`;
      }).join('') : `<div class="chat-vide">${this._nonLus ? 'Aucune conversation non lue.' : 'Aucune conversation.'}</div>`}`;
  },

  ouvrir(clientId, canal) {
    const v = this.conversations.find(x => x.client.id === clientId && (!canal || x.canal === canal));
    if (!v) return;
    this._actif = `${v.client.id}|${v.canal}`;
    if (v.resume) v.resume.non_lus = 0;
    this._renderListe();
    document.getElementById('msgCadre').classList.add('conv-ouverte');
    const conv = document.getElementById('msgConv');
    conv.innerHTML = `
      <div class="msg-conv-tete">
        <button class="msg-retour" onclick="CoachMessageriePage.retour()" aria-label="Retour">‹</button>
        <div style="flex:1;min-width:0;">
          <div class="msg-conv-nom">${escHtml(this._nom(v.client))}</div>
          <div class="msg-conv-sous">${v.canal === 'equipe' ? 'Conversation Équipe ONE2ONE' : 'Suivi'}${v.peutEcrire ? '' : ' · lecture seule'}</div>
        </div>
        <button class="btn btn-secondary btn-small" onclick="Router.navigate('coach-client-edit',{clientId:'${v.client.id}'})">Fiche</button>
      </div>
      <div class="msg-conv-chat" id="msgChat"></div>`;
    Chat.ouvrir(document.getElementById('msgChat'), {
      clientId: v.client.id, canal: v.canal, peutEcrire: v.peutEcrire, clientNom: v.client.prenom,
    });
  },

  // Téléphone : revenir à la liste
  retour() {
    Chat.fermer();
    this._actif = null;
    document.getElementById('msgCadre').classList.remove('conv-ouverte');
    this._renderListe();
  },
};
