// APEX APP — Coach : Liste Clients

const CoachClientsPage = {
  clients: [],

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX · COACH</div>
          <div class="app-title">Mes clients</div>
        </div>
        <button class="header-btn" onclick="Router.logout()">⏻</button>
      </div>
      <button class="btn btn-primary btn-small" style="margin-bottom:1rem;" onclick="CoachClientsPage.showCreateModal()">+ Nouveau client</button>
      <div id="coachClientsList"><div class="spinner" style="margin-top:2rem;"></div></div>
      <div id="coachModal"></div>`;
  },

  async init() {
    try {
      this.clients = await db.getAllClients();
      this.renderList();
    } catch (e) {
      document.getElementById('coachClientsList').innerHTML = '<div class="alert alert-error">Erreur : ' + e.message + '</div>';
    }
  },

  renderList() {
    const el = document.getElementById('coachClientsList');
    if (this.clients.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">Aucun client pour le moment.<br>Crée ton premier client ci-dessus.</div></div>';
      return;
    }

    el.innerHTML = this.clients.map(c => {
      const initials = (c.prenom || 'C')[0].toUpperCase();
      const phase = c.phase ? c.phase.charAt(0).toUpperCase() + c.phase.slice(1) : '—';
      const tagHtml = c.coach_tag
        ? `<span class="coach-tag coach-tag-${c.coach_tag}">${c.coach_tag === 'ben' ? 'Ben' : 'Chris'}</span>`
        : '';
      return `<div class="client-row" onclick="CoachClientsPage.openClient('${c.id}')">
        <div class="client-avatar">${initials}</div>
        <div class="client-info">
          <div class="client-name" style="display:flex;align-items:center;gap:7px;">${c.prenom || 'Client'} ${tagHtml}</div>
          <div class="client-meta">${c.email} · S${c.semaine_courante || 1} · ${phase}</div>
        </div>
        <div class="client-arrow">›</div>
      </div>`;
    }).join('');
  },

  openClient(id) {
    Router.navigate('coach-client-edit', { clientId: id });
  },

  showCreateModal() {
    document.getElementById('coachModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('coachModal').innerHTML=''">
        <div class="modal">
          <div class="modal-title">Nouveau client <button class="modal-close" onclick="document.getElementById('coachModal').innerHTML=''">×</button></div>
          <div class="field"><label class="field-label">Prénom</label><input class="input" id="newPrenom" placeholder="Marc"></div>
          <div class="field"><label class="field-label">Email</label><input class="input" id="newEmail" type="email" placeholder="marc@email.com"></div>
          <div class="field"><label class="field-label">Mot de passe temporaire</label><input class="input" id="newPass" type="text" value="Apex2026!"></div>
          <div id="createError"></div>
          <button class="btn btn-primary" onclick="CoachClientsPage.createClient()">Créer le client</button>
        </div>
      </div>`;
  },

  async createClient() {
    const prenom = document.getElementById('newPrenom').value.trim();
    const email = document.getElementById('newEmail').value.trim();
    const password = document.getElementById('newPass').value;

    if (!prenom || !email || !password) {
      document.getElementById('createError').innerHTML = '<div class="alert alert-error">Tous les champs sont requis.</div>';
      return;
    }

    try {
      await db.createUser(email, password, prenom);
      document.getElementById('coachModal').innerHTML = '';
      await this.init();
    } catch (e) {
      document.getElementById('createError').innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  }
};
