// APEX APP — Coach : onglet « Messages » de la fiche client
// Conversation de suivi (référent ; gérants en lecture) et/ou conversation
// Équipe ONE2ONE (tous les coachs) : un client studio + suivi a les deux.

const CoachClientMessagesPage = {
  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="cmTitre">Messages</div>
        </div>
      </div>
      <div id="cmNav"></div>
      <div id="cmCanaux"></div>
      <div class="msg-fiche" id="cmChat"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    const params = Router.getParams();
    if (!params.clientId) { window.location.hash = '#coach-clients'; return; }
    const jeton = this._jeton = {};
    try {
      const client = await db.getProfile(params.clientId);
      if (jeton !== this._jeton) return;
      const moi = Router.userProfile;
      const referent = client.coach_referent_id === moi.id;
      this.client = client;
      document.getElementById('cmTitre').textContent = 'Messages — ' + (client.prenom || 'Client');
      document.getElementById('cmNav').innerHTML = coachClientNav(client.id, 'coach-client-messages');
      // Conversations de ce client que je peux lire
      this.canaux = (client.type_client === 'studio' ? ['equipe'] : client.type_client === 'suivi' ? ['suivi', 'equipe'] : ['suivi'])
        .filter(c => c === 'equipe' || referent || moi.is_gerant);
      if (!this.canaux.length) {
        document.getElementById('cmChat').innerHTML = '<div class="card">Seuls le coach référent et les gérants ont accès à cette conversation.</div>';
        return;
      }
      this.choisir(this.canaux[0]);
    } catch (e) {
      document.getElementById('cmChat').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  choisir(canal) {
    const c = this.client, moi = Router.userProfile;
    document.getElementById('cmCanaux').innerHTML = this.canaux.length > 1 ? `
      <div class="ag-switch msg-canaux">
        <button class="${canal === 'suivi' ? 'on' : ''}" onclick="CoachClientMessagesPage.choisir('suivi')">Suivi</button>
        <button class="${canal === 'equipe' ? 'on' : ''}" onclick="CoachClientMessagesPage.choisir('equipe')">Équipe ONE2ONE</button>
      </div>` : '';
    Chat.ouvrir(document.getElementById('cmChat'), {
      clientId: c.id, canal, peutEcrire: canal === 'equipe' || c.coach_referent_id === moi.id, clientNom: c.prenom,
    });
  },
};
