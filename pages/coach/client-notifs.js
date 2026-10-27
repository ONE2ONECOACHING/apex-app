// APEX APP — Coach : Fiche client, onglet Notifications
// Notifications envoyées au client (table notifications_client, sans ligne = tout actif).
// Modifiables par le référent et les gérants ; les messages restent toujours notifiés.
// Pas pour les clients « studio sans suivi » (onglet masqué).

const CoachClientNotifsPage = {
  client: null,
  notifs: null,

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="cnTitre">Notifications</div>
        </div>
      </div>
      <div id="cnNav"></div>
      <div id="cnContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    const params = Router.getParams();
    if (!params.clientId) { window.location.hash = '#coach-clients'; return; }
    // Jeton de ce chargement : si on change de fiche avant la fin, il est abandonné
    const jeton = this._jeton = {};
    this.client = null;
    this.notifs = null;
    document.getElementById('cnNav').innerHTML = coachClientNav(params.clientId, 'coach-client-notifs');
    try {
      const [client, notifs] = await Promise.all([
        db.getProfile(params.clientId),
        db.getNotificationsClient(params.clientId),
      ]);
      if (jeton !== this._jeton) return;
      this.client = client;
      this.notifs = notifs;
      document.getElementById('cnTitre').textContent = 'Notifications — ' + (client.prenom || 'Client');
      this._render();
    } catch (e) {
      if (jeton !== this._jeton) return;
      document.getElementById('cnContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  _peutModifier() {
    const me = Router.userProfile;
    return !!(me?.is_gerant || this.client?.coach_referent_id === me?.id);
  },

  _render() {
    const el = document.getElementById('cnContent');
    if (this.client.type_client === 'studio') {
      el.innerHTML = '<div class="card" style="font-size:13px;color:var(--gray-light);">Client du studio sans suivi : il ne reçoit pas de rappels. Les messages restent notifiés.</div>';
      return;
    }
    const n = this.notifs;
    const modif = this._peutModifier();
    const lignes = [['bilan', 'Bilan de la semaine', 'Quand son bilan est disponible'],
         ['rappel_bilan', 'Rappel du bilan', 'Dimanche 21 h, si le bilan n\'est pas rempli'],
         ['journal', 'Rappel du journal', 'Chaque jour à 20 h, moins de 3 repas notés'],
         ['habitudes', 'Rappel des habitudes', 'Chaque jour à 21 h, habitudes non cochées'],
         ['plan', 'Nouveau plan alimentaire', 'Quand un plan est enregistré']];
    el.innerHTML = `
      <div class="card">
        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;">
          <span>Notifications envoyées au client</span>
          <span id="cnEtat" style="font-size:11px;font-weight:500;color:var(--gray-light);"></span>
        </div>
        ${lignes.map(([cle, label, aide]) => `
          <label class="nc-ligne">
            <span><span class="nc-label">${label}</span><span class="nc-aide">${aide}</span></span>
            <input type="checkbox" class="nc-interrupteur" ${n[cle] !== false ? 'checked' : ''} ${modif ? '' : 'disabled'}
              onchange="CoachClientNotifsPage.maj('${cle}', this.checked)">
          </label>`).join('')}
        <div class="nc-aide" style="margin-top:8px;">Les notifications de messages restent toujours actives.${modif ? '' : ' Seuls le coach référent et les gérants peuvent modifier ces réglages.'}</div>
      </div>`;
  },

  async maj(cle, actif) {
    const avant = this.notifs[cle];
    this.notifs[cle] = actif;
    const etat = document.getElementById('cnEtat');
    try {
      await db.saveNotificationsClient(this.client.id, { [cle]: actif });
      if (etat) etat.textContent = '✓ Enregistré';
    } catch (e) {
      this.notifs[cle] = avant;
      this._render();
      toast('Erreur : ' + e.message, 'error');
    }
  },
};
