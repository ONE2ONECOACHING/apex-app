// APEX APP — Coach : Templates de programme (liste)

const CoachProgTemplatesPage = {
  templates: [],
  activeTag: null,

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

  setTag(tag) {
    this.activeTag = tag;
    this.renderList();
  },

  renderList() {
    const el = document.getElementById('tplList');
    if (!el) return;

    const tagDefs = [
      { v: 'men',   l: 'MEN' },
      { v: 'women', l: 'WOMEN' },
      { v: 'home',  l: 'HOME' },
    ];

    const filtered = this.activeTag
      ? this.templates.filter(t => t.tag === this.activeTag)
      : this.templates;

    const tagColors = { men: '#3B82F6', women: '#EC4899', home: '#10B981' };
    const tagBadge = (tag) => {
      if (!tag) return '';
      const found = tagDefs.find(d => d.v === tag);
      const color = tagColors[tag] || '#666';
      return found ? `<span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;background:${color}22;color:${color};margin-left:6px;">${found.l}</span>` : '';
    };

    let html = `<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
      <button class="tag-pill-btn${this.activeTag === null ? ' active-ben' : ''}"
        onclick="CoachProgTemplatesPage.setTag(null)">TOUS</button>
      ${tagDefs.map(t => `
        <button class="tag-pill-btn${this.activeTag === t.v ? ' active-ben' : ''}"
          onclick="CoachProgTemplatesPage.setTag('${t.v}')">${t.l}</button>`).join('')}
    </div>`;

    if (!filtered.length) {
      html += `<div class="empty-state"><div class="empty-icon">📋</div>
        <div class="empty-text">${this.templates.length ? 'Aucun programme pour ce tag.' : 'Aucun programme créé.<br>'
        + '<button class="btn btn-primary btn-small" style="margin-top:1rem;" onclick="CoachProgTemplatesPage.newTemplate()">Créer mon premier programme</button>'}</div></div>`;
      el.innerHTML = html;
      return;
    }

    html += `<div style="display:flex;flex-direction:column;gap:10px;padding-bottom:6rem;">
      ${filtered.map(t => `
        <div class="card" style="display:flex;align-items:center;justify-content:space-between;
          gap:12px;margin:0;padding:14px 18px;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:15px;margin-bottom:3px;">
              ${escHtml(t.nom)}${tagBadge(t.tag)}
            </div>
            <div style="font-size:12px;color:var(--gray-light);">
              ${t.nb_semaines} semaine${t.nb_semaines > 1 ? 's' : ''}
              ${t.description ? ` · ${escHtml(t.description)}` : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button class="btn btn-ghost btn-small"
              onclick="CoachProgTemplatesPage.editTemplate('${t.id}')">✎ Modifier</button>
            <button class="btn btn-ghost btn-small"
              onclick="CoachProgTemplatesPage.deleteTemplate('${t.id}','${escJs(t.nom)}')">× Supprimer</button>
          </div>
        </div>`).join('')}
    </div>`;
    el.innerHTML = html;
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
      toast('Erreur : ' + e.message, 'error');
    }
  }
};
