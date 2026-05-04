// APEX APP — Coach : Templates de programme (liste)

const CoachProgTemplatesPage = {
  templates: [],

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title">Programmes d'entraînement</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#coach-clients'">←</button>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div style="font-size:13px;color:var(--gray);">
          Vos templates de programme réutilisables et assignables à vos clients.
        </div>
        <button class="btn btn-primary btn-small"
          onclick="CoachProgTemplatesPage.newTemplate()">+ Nouveau programme</button>
      </div>
      <div id="tplList"><div class="spinner"></div></div>
      <nav class="nav-bottom"><div class="nav-inner">
        <a class="nav-item" href="#coach-clients"><span class="nav-icon">👥</span><span class="nav-label">Clients</span></a>
        <a class="nav-item active" href="#coach-prog-templates"><span class="nav-icon">📋</span><span class="nav-label">Programmes</span></a>
        <a class="nav-item" href="#coach-exercices"><span class="nav-icon">🏋️</span><span class="nav-label">Exercices</span></a>
      </div></nav>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile || profile.role !== 'coach') { window.location.hash = '#login'; return; }
    try {
      this.templates = await db.getProgTemplates(profile.id);
      this.renderList();
    } catch (e) {
      document.getElementById('tplList').innerHTML =
        '<div class="alert alert-error">Erreur de chargement.</div>';
    }
  },

  renderList() {
    const el = document.getElementById('tplList');
    if (!el) return;
    if (!this.templates.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div>
        <div class="empty-text">Aucun programme créé.<br>
        <button class="btn btn-primary btn-small" style="margin-top:1rem;"
          onclick="CoachProgTemplatesPage.newTemplate()">Créer mon premier programme</button></div></div>`;
      return;
    }
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;padding-bottom:6rem;">
      ${this.templates.map(t => `
        <div class="card" style="display:flex;align-items:center;justify-content:space-between;
          gap:12px;margin:0;padding:14px 18px;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:15px;margin-bottom:3px;">${t.nom}</div>
            <div style="font-size:12px;color:var(--gray-light);">
              ${t.nb_semaines} semaine${t.nb_semaines > 1 ? 's' : ''}
              ${t.description ? ` · ${t.description}` : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button class="btn btn-ghost btn-small"
              onclick="CoachProgTemplatesPage.editTemplate('${t.id}')">✎ Modifier</button>
            <button class="btn btn-ghost btn-small"
              onclick="CoachProgTemplatesPage.deleteTemplate('${t.id}','${t.nom.replace(/'/g,"\\'")}')">× Supprimer</button>
          </div>
        </div>`).join('')}
    </div>`;
  },

  newTemplate() {
    Router.navigate('coach-prog-template-edit', { templateId: null });
  },

  editTemplate(id) {
    Router.navigate('coach-prog-template-edit', { templateId: id });
  },

  async deleteTemplate(id, nom) {
    if (!confirm(`Supprimer le programme "${nom}" ?\nTous ses exercices et séances seront supprimés.`)) return;
    try {
      await db.deleteProgTemplate(id);
      this.templates = this.templates.filter(t => t.id !== id);
      this.renderList();
    } catch (e) {
      alert('Erreur : ' + e.message);
    }
  }
};
