// APEX APP — Coach : onglet « Messages » de la fiche client
// Client suivi : conversation de suivi (référent ; gérants en lecture).
// Client studio : conversation Équipe ONE2ONE (tous les coachs).

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
      <div class="msg-fiche" id="cmChat"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    const params = Router.getParams();
    if (!params.clientId) { window.location.hash = '#coach-clients'; return; }
    try {
      const client = await db.getProfile(params.clientId);
      const moi = Router.userProfile;
      const canal = client.type_client === 'studio' ? 'equipe' : 'suivi';
      const referent = client.coach_referent_id === moi.id;
      document.getElementById('cmTitre').textContent = 'Messages — ' + (client.prenom || 'Client');
      document.getElementById('cmNav').innerHTML = coachClientNav(client.id, 'coach-client-messages');
      if (canal === 'suivi' && !referent && !moi.is_gerant) {
        document.getElementById('cmChat').innerHTML = '<div class="card">Seuls le coach référent et les gérants ont accès à cette conversation.</div>';
        return;
      }
      Chat.ouvrir(document.getElementById('cmChat'), {
        clientId: client.id, canal, peutEcrire: canal === 'equipe' || referent, clientNom: client.prenom,
      });
    } catch (e) {
      document.getElementById('cmChat').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },
};
