// APEX APP — Client : messagerie
// Client suivi : conversation avec son coach référent.
// Client studio : conversation avec l'Équipe ONE2ONE.

const ClientMessagesPage = {
  render() {
    const studio = Router.userProfile?.type_client === 'studio';
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE</div>
          <div class="app-title">${studio ? 'Équipe ONE2ONE' : 'Mon coach'}</div>
        </div>
        ${studio ? '' : `<button class="header-btn" onclick="window.location.hash='#dashboard'" aria-label="Retour">‹</button>`}
      </div>
      <div class="msg-client" id="cliChat"><div class="spinner" style="margin-top:2rem;"></div></div>
      ${studio ? clientNav('messages') : ''}`;
  },

  init() {
    const moi = Router.userProfile;
    if (!moi || moi.role !== 'client') { window.location.hash = '#login'; return; }
    Chat.ouvrir(document.getElementById('cliChat'), {
      clientId: moi.id,
      canal: moi.type_client === 'studio' ? 'equipe' : 'suivi',
      peutEcrire: true,
      clientNom: moi.prenom,
    });
  },
};
