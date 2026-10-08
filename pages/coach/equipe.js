// APEX APP — Gérant : Équipe (ajout et suppression de coachs)

const COMPTE_PARTAGE_ID = 'fe2c19c2-e00f-4c4e-9543-3634022e42ff';

const CoachEquipePage = {
  coachs: [],
  clients: [],

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · GÉRANT</div>
          <div class="app-title">Équipe</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#coach-clients'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
      <div id="eqContent"><div class="spinner" style="margin-top:2rem;"></div></div>
      <div id="eqModal"></div>`;
  },

  async init() {
    this.coachs  = [];
    this.clients = [];

    const profile = Router.userProfile;
    if (!profile || profile.role !== 'coach' || !profile.is_gerant) {
      window.location.hash = '#coach-clients';
      return;
    }

    try {
      [this.coachs, this.clients] = await Promise.all([db.getCoachs(), db.getAllClients()]);
      this._renderList();
    } catch (e) {
      document.getElementById('eqContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  _label(co) {
    return `${co.prenom || ''} ${co.nom || ''}`.trim() || co.email;
  },

  _nbClients(coachId) {
    return this.clients.filter(c => c.coach_referent_id === coachId).length;
  },

  _renderList() {
    const me = Router.userProfile.id;

    const rows = this.coachs.map(co => {
      const nb = this._nbClients(co.id);
      const notes = [];
      if (co.id === me) notes.push('toi');
      if (co.id === COMPTE_PARTAGE_ID) notes.push('compte partagé');
      const deletable = co.id !== me && co.id !== COMPTE_PARTAGE_ID;
      return `
        <div class="client-row" style="cursor:default;">
          <div class="client-avatar">${escHtml(((co.prenom || co.email || '?')[0] || '?').toUpperCase())}</div>
          <div class="client-info">
            <div class="client-name" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              ${escHtml(this._label(co))}
              <span class="dash-status-badge">${co.is_gerant ? 'Gérant' : 'Coach'}</span>
              ${notes.length ? `<span style="font-size:11px;color:var(--gray-muted);">(${notes.join(', ')})</span>` : ''}
            </div>
            <div class="client-meta">${escHtml(co.email || '')} · référent de ${nb} client${nb > 1 ? 's' : ''}</div>
          </div>
          ${deletable ? `<button class="btn btn-secondary btn-small" onclick="CoachEquipePage.showRemove('${co.id}')">Supprimer</button>` : ''}
        </div>`;
    }).join('');

    document.getElementById('eqContent').innerHTML = `
      <div class="card">
        <div class="card-title">Coachs et gérants</div>
        ${rows || '<div class="empty-text">Aucun coach.</div>'}
      </div>

      <div class="card">
        <div class="card-title">Ajouter un coach</div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Prénom</label><input class="input" id="eqPrenom" placeholder="Lola"></div>
          <div class="field"><label class="field-label">Nom</label><input class="input" id="eqNom"></div>
        </div>
        <div class="field"><label class="field-label">Email</label><input class="input" id="eqEmail" type="email" placeholder="lola@email.com"></div>
        <label style="display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:1rem;">
          <input type="checkbox" id="eqGerant"> Gérant (lit tous les suivis, gère l'équipe)
        </label>
        <div id="eqAddError"></div>
        <button class="btn btn-primary" style="width:100%;" id="eqAddBtn" onclick="CoachEquipePage.add()">Créer le compte coach</button>
      </div>`;
  },

  async add() {
    const prenom = document.getElementById('eqPrenom').value.trim();
    const nom    = document.getElementById('eqNom').value.trim();
    const email  = document.getElementById('eqEmail').value.trim();
    const gerant = document.getElementById('eqGerant').checked;
    const errEl  = document.getElementById('eqAddError');
    const btn    = document.getElementById('eqAddBtn');

    errEl.innerHTML = '';
    if (!prenom || !email) {
      errEl.innerHTML = '<div class="alert alert-error">Prénom et email requis.</div>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Création en cours…';
    try {
      const { password } = await db.manageTeam({ action: 'add', email, prenom, nom, gerant });
      if (!password) throw new Error('Réponse inattendue du serveur : vérifie que la fonction manage-team est bien déployée.');
      const appUrl  = APP_CONFIG.APP_URL;
      const message = `Bonjour ${prenom} 👊\n\nTon accès coach ONE2ONE est prêt.\n\n🔗 ${appUrl}\n📧 ${email}\n🔑 ${password}\n\nPense à changer ton mot de passe avec « Mot de passe oublié ? » sur la page de connexion.`;
      document.getElementById('eqModal').innerHTML = `
        <div class="modal-overlay">
          <div class="modal">
            <div class="modal-title">Compte créé pour ${escHtml(prenom)}</div>
            <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:1rem;font-size:13px;margin-bottom:1rem;line-height:1.8;">
              <div>🔗 <b>Lien :</b> ${escHtml(appUrl)}</div>
              <div>📧 <b>Email :</b> ${escHtml(email)}</div>
              <div>🔑 <b>Mot de passe :</b> ${escHtml(password)}</div>
            </div>
            <div style="font-size:13px;color:var(--gray);margin-bottom:1rem;">Ce mot de passe ne sera plus affiché : copie-le maintenant.</div>
            <button class="btn btn-primary" style="width:100%;margin-bottom:0.5rem;" id="eqCopyBtn">📋 Copier le message</button>
            <button class="btn btn-secondary" style="width:100%;" onclick="document.getElementById('eqModal').innerHTML='';CoachEquipePage.init()">Fermer</button>
          </div>
        </div>`;
      document.getElementById('eqCopyBtn').onclick = () => {
        navigator.clipboard.writeText(message).then(() => {
          document.getElementById('eqCopyBtn').textContent = '✅ Copié !';
        }).catch(() => { prompt('Copie ce message :', message); });
      };
    } catch (e) {
      errEl.innerHTML = `<div class="alert alert-error">${escHtml(e.message)}</div>`;
      btn.disabled = false;
      btn.textContent = 'Créer le compte coach';
    }
  },

  showRemove(coachId) {
    const co = this.coachs.find(c => c.id === coachId);
    if (!co) return;
    const nb = this._nbClients(coachId);
    const autres = this.coachs.filter(c => c.id !== coachId);
    const me = Router.userProfile.id;

    document.getElementById('eqModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('eqModal').innerHTML=''">
        <div class="modal">
          <div class="modal-title">Supprimer ${escHtml(this._label(co))}
            <button class="modal-close" onclick="document.getElementById('eqModal').innerHTML=''">×</button>
          </div>
          <div style="font-size:14px;margin-bottom:1rem;line-height:1.5;">
            Ses ${nb} client${nb > 1 ? 's' : ''}, ses modèles, ses formations et ses bilans seront transférés au coach choisi ci-dessous.
            Son compte sera ensuite supprimé définitivement.
          </div>
          <div class="field">
            <label class="field-label">Nouveau référent</label>
            <select class="input" id="eqRemplacant">
              ${autres.map(c => `<option value="${c.id}" ${c.id === me ? 'selected' : ''}>${escHtml(this._label(c))}</option>`).join('')}
            </select>
          </div>
          <div id="eqRemoveError"></div>
          <button class="btn" id="eqRemoveBtn" style="background:var(--error-bg);color:var(--error);border:1.5px solid #FFCDD2;width:100%;"
            onclick="CoachEquipePage.remove('${coachId}')">Transférer et supprimer</button>
        </div>
      </div>`;
  },

  async remove(coachId) {
    const remplacantId = document.getElementById('eqRemplacant').value;
    const btn = document.getElementById('eqRemoveBtn');
    btn.disabled = true;
    btn.textContent = 'Suppression en cours…';
    try {
      await db.manageTeam({ action: 'remove', coachId, remplacantId });
      document.getElementById('eqModal').innerHTML = '';
      toast('Coach supprimé', 'success');
      this.init();
    } catch (e) {
      document.getElementById('eqRemoveError').innerHTML = `<div class="alert alert-error">${escHtml(e.message)}</div>`;
      btn.disabled = false;
      btn.textContent = 'Transférer et supprimer';
    }
  }
};
