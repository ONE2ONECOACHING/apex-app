// APEX APP — Client : messagerie
// Client à distance : conversation avec son coach référent.
// Client studio sans suivi : conversation avec l'Équipe ONE2ONE.
// Client studio + suivi : les deux, au choix (onglets ; « Mon coach » par défaut).

const ClientMessagesPage = {
  render() {
    const studio = Router.userProfile?.type_client === 'studio';
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE</div>
          <div class="app-title">${studio ? 'Équipe ONE2ONE' : moiDeuxCanaux() ? 'Messages' : 'Mon coach'}</div>
        </div>
        ${studio ? '' : `<button class="header-btn" onclick="window.location.hash='#dashboard'" aria-label="Retour">‹</button>`}
      </div>
      ${moiDeuxCanaux() ? `<div id="cliCanaux"></div>` : ''}
      <div class="msg-client ${moiDeuxCanaux() ? 'avec-onglets' : ''}" id="cliChat"><div class="spinner" style="margin-top:2rem;"></div></div>
      ${studio ? clientNav('messages') : ''}`;
  },

  init() {
    const moi = Router.userProfile;
    if (!moi || moi.role !== 'client') { window.location.hash = '#login'; return; }
    this._nonLus = {};
    if (moiDeuxCanaux()) {
      this.choisir('suivi');
      db.getConversationsResume().then(r => {
        for (const x of r) if (x.canal !== this._canal) this._nonLus[x.canal] = Number(x.non_lus || 0);
        this._onglets();
      }).catch(() => {});
    } else {
      Chat.ouvrir(document.getElementById('cliChat'), {
        clientId: moi.id,
        canal: moi.type_client === 'studio' ? 'equipe' : 'suivi',
        peutEcrire: true,
        clientNom: moi.prenom,
      });
    }
  },

  choisir(canal) {
    const moi = Router.userProfile;
    this._canal = canal;
    this._nonLus[canal] = 0;
    this._onglets();
    Chat.ouvrir(document.getElementById('cliChat'), {
      clientId: moi.id, canal, peutEcrire: true, clientNom: moi.prenom,
    });
  },

  _onglets() {
    const el = document.getElementById('cliCanaux');
    if (!el) return;
    const bouton = (canal, label) => `<button class="${this._canal === canal ? 'on' : ''}" onclick="ClientMessagesPage.choisir('${canal}')">${label}${this._nonLus[canal] ? ' <span class="msg-point-onglet"></span>' : ''}</button>`;
    el.innerHTML = `<div class="ag-switch msg-canaux">${bouton('suivi', 'Mon coach')}${bouton('equipe', 'Équipe ONE2ONE')}</div>`;
  },
};

// Client studio + suivi : deux conversations (son coach, l'équipe)
function moiDeuxCanaux() { return Router.userProfile?.type_client === 'suivi'; }
