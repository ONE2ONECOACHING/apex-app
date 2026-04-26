// APEX APP — Coach : Liste Clients

const CoachClientsPage = {
  clients: [],
  activeFilter: 'all',

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX · COACH</div>
          <div class="app-title">Mes clients</div>
        </div>
        <button class="header-btn" onclick="Router.logout()">⏻</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;flex-wrap:wrap;">
        <button class="btn btn-primary btn-small" onclick="CoachClientsPage.showCreateModal()">+ Nouveau client</button>
        <button class="btn btn-secondary btn-small" onclick="window.location.hash='#coach-bilan-templates'">📝 Templates bilan</button>
        <div id="tagFilters" style="display:flex;gap:6px;margin-left:auto;"></div>
      </div>
      <div id="coachClientsList"><div class="spinner" style="margin-top:2rem;"></div></div>
      <div id="coachModal"></div>`;
  },

  async init() {
    try {
      this.clients = await db.getAllClients();
      this.renderFilters();
      this.renderList();
    } catch (e) {
      document.getElementById('coachClientsList').innerHTML = '<div class="alert alert-error">Erreur : ' + e.message + '</div>';
    }
  },

  renderFilters() {
    const hasBen   = this.clients.some(c => c.coach_tag === 'ben');
    const hasChris = this.clients.some(c => c.coach_tag === 'chris');
    if (!hasBen && !hasChris) { document.getElementById('tagFilters').innerHTML = ''; return; }

    const f = this.activeFilter;
    document.getElementById('tagFilters').innerHTML = `
      <button class="tag-filter-btn ${f === 'all' ? 'active' : ''}" onclick="CoachClientsPage.setFilter('all')">Tous</button>
      ${hasBen   ? `<button class="tag-filter-btn tag-filter-ben   ${f === 'ben'   ? 'active' : ''}" onclick="CoachClientsPage.setFilter('ben')">Ben</button>`   : ''}
      ${hasChris ? `<button class="tag-filter-btn tag-filter-chris ${f === 'chris' ? 'active' : ''}" onclick="CoachClientsPage.setFilter('chris')">Chris</button>` : ''}
    `;
  },

  setFilter(tag) {
    this.activeFilter = tag;
    this.renderFilters();
    this.renderList();
  },

  renderList() {
    const el = document.getElementById('coachClientsList');
    const filtered = this.activeFilter === 'all'
      ? this.clients
      : this.clients.filter(c => c.coach_tag === this.activeFilter);

    if (filtered.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">Aucun client pour ce filtre.</div></div>';
      return;
    }

    el.innerHTML = filtered.map(c => {
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
          <div id="createForm">
            <div class="field"><label class="field-label">Prénom</label><input class="input" id="newPrenom" placeholder="Marc"></div>
            <div class="field"><label class="field-label">Email</label><input class="input" id="newEmail" type="email" placeholder="marc@email.com"></div>
            <div id="createError"></div>
            <button class="btn btn-primary" style="width:100%" onclick="CoachClientsPage.createClient()" id="createBtn">Générer le lien d'invitation</button>
          </div>
          <div id="inviteResult" style="display:none;"></div>
        </div>
      </div>`;
  },

  async createClient() {
    const prenom = document.getElementById('newPrenom').value.trim();
    const email = document.getElementById('newEmail').value.trim();
    const btn = document.getElementById('createBtn');

    if (!prenom || !email) {
      document.getElementById('createError').innerHTML = '<div class="alert alert-error">Prénom et email requis.</div>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Génération en cours…';

    try {
      const { link } = await db.generateInviteLink(email, prenom);

      // Masquer le formulaire, afficher le lien
      document.getElementById('createForm').style.display = 'none';
      document.getElementById('inviteResult').style.display = 'block';
      document.getElementById('inviteResult').innerHTML = `
        <div style="text-align:center;margin-bottom:1rem;">
          <div style="font-size:1.5rem;margin-bottom:0.5rem;">✅</div>
          <div style="font-weight:700;margin-bottom:0.25rem;">Compte créé pour ${prenom}</div>
          <div style="font-size:13px;color:var(--gray);">Envoie ce lien au client. Il est valable 24h.</div>
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px;font-size:11px;word-break:break-all;color:var(--gray);margin-bottom:1rem;">${link}</div>
        <button class="btn btn-primary" style="width:100%;margin-bottom:0.5rem;" onclick="CoachClientsPage.copyInviteLink('${encodeURIComponent(link)}')">📋 Copier le lien</button>
        <button class="btn btn-secondary" style="width:100%;" onclick="document.getElementById('coachModal').innerHTML='';CoachClientsPage.init()">Fermer</button>
      `;

    } catch (e) {
      document.getElementById('createError').innerHTML = `<div class="alert alert-error">${e.message}</div>`;
      btn.disabled = false;
      btn.textContent = 'Générer le lien d\'invitation';
    }
  },

  copyInviteLink(encodedLink) {
    const link = decodeURIComponent(encodedLink);
    navigator.clipboard.writeText(link).then(() => {
      // Feedback visuel
      const btns = document.querySelectorAll('#inviteResult .btn-primary');
      if (btns[0]) { btns[0].textContent = '✅ Lien copié !'; setTimeout(() => { btns[0].textContent = '📋 Copier le lien'; }, 2000); }
    }).catch(() => {
      prompt('Copie ce lien :', link);
    });
  }
};
