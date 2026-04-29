// APEX APP — Coach : Bilan hebdo d'un client (assignation + historique)

const CoachBilanClientPage = {
  clientId: null,
  client: null,
  templates: [],
  assignation: null,
  instances: [],
  _openInstanceId: null,

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX · COACH</div>
          <div class="app-title" id="bcTitle">Bilan client</div>
        </div>
        <button class="header-btn" onclick="history.back()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
      <div id="bcContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    const params = Router.getParams();
    this.clientId = params.clientId;
    if (!this.clientId) { window.location.hash = '#coach-clients'; return; }

    try {
      [this.client, this.templates, this.assignation, this.instances] = await Promise.all([
        db.getProfile(this.clientId),
        db.getBilanTemplates(Router.userProfile.id),
        db.getBilanAssignation(this.clientId).catch(() => null),
        db.getBilanInstancesForCoach(this.clientId).catch(() => [])
      ]);
      document.getElementById('bcTitle').textContent = (this.client.prenom || 'Client') + ' — Bilan';
      // Marquer les bilans complétés comme lus en base (sync multi-appareils)
      db.markBilansAsRead(this.clientId).catch(() => {});
      this.renderContent();
    } catch (e) {
      document.getElementById('bcContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  renderContent() {
    const asgn = this.assignation;
    const currentTemplateId = asgn?.actif ? asgn.template_id : null;
    const jourEnvoi  = asgn?.jour_envoi  ?? 6;
    const heureEnvoi = asgn?.heure_envoi ?? '08:00';
    const jours = [
      [1,'Lundi'],[2,'Mardi'],[3,'Mercredi'],[4,'Jeudi'],
      [5,'Vendredi'],[6,'Samedi'],[0,'Dimanche']
    ];

    let html = `
      ${coachClientNav(this.clientId, 'coach-bilan-client')}

      <!-- Assignation -->
      <div class="card" style="margin-bottom:1rem;">
        <div class="card-title">Template assigné</div>`;

    if (this.templates.length === 0) {
      html += `<div style="font-size:13px;color:var(--gray-muted);margin-bottom:0.75rem;">
        Aucun template créé. <a href="#coach-bilan-templates" style="color:var(--gold);font-weight:600;">Créer un template →</a>
      </div>`;
    } else {
      html += `
        <div class="field">
          <label class="field-label">Questionnaire</label>
          <select class="input" id="bcTemplateSelect">
            <option value="">— Aucun bilan —</option>
            ${this.templates.map(t => `<option value="${t.id}" ${currentTemplateId === t.id ? 'selected' : ''}>${t.nom} (${(t.questions||[]).length} questions)</option>`).join('')}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:0.5rem;">
          <div class="field" style="margin-bottom:0;">
            <label class="field-label">Jour d'envoi</label>
            <select class="input" id="bcJourEnvoi">
              ${jours.map(([v,l]) => `<option value="${v}" ${jourEnvoi==v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label class="field-label">Heure</label>
            <input type="time" class="input" id="bcHeureEnvoi" value="${heureEnvoi}">
          </div>
        </div>
        <div id="bcAssignMsg"></div>
        <button class="btn btn-primary" style="height:44px;font-size:14px;" onclick="CoachBilanClientPage.saveAssignation()">
          💾 Enregistrer l'assignation
        </button>`;
    }

    html += `</div>

      <!-- Historique -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-muted);margin-bottom:0.75rem;">
        Historique (${this.instances.length} bilans)
      </div>`;

    if (this.instances.length === 0) {
      html += `<div class="empty-state" style="padding:2rem 1rem;">
        <div class="empty-icon">📋</div>
        <div class="empty-text">Aucun bilan envoyé pour ce client.</div>
      </div>`;
    } else {
      html += this.instances.map(inst => {
        const semStr = new Date(inst.semaine + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const isComplete = inst.statut === 'complete';
        const isOpen = this._openInstanceId === inst.id;
        let html = `
          <div class="card" style="margin-bottom:0.65rem;cursor:pointer;" onclick="CoachBilanClientPage.toggleInstance('${inst.id}')">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-weight:600;font-size:14px;">Semaine du ${semStr}</div>
                <div style="font-size:12px;margin-top:2px;">
                  <span style="color:${isComplete ? 'var(--success)' : 'var(--gold)'};font-weight:600;">
                    ${isComplete ? '✅ Complété' : '⏳ En attente'}
                  </span>
                  ${inst.completed_at ? ' · ' + new Date(inst.completed_at).toLocaleDateString('fr-FR') : ''}
                </div>
              </div>
              <span style="color:var(--gray-muted);font-size:20px;">${isOpen ? '▲' : '▼'}</span>
            </div>`;

        if (isOpen && isComplete && inst.reponses?.length > 0) {
          html += `<div style="margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.75rem;">`;
          inst.reponses.forEach(r => {
            html += `<div style="margin-bottom:0.75rem;">
              <div style="font-size:12px;font-weight:700;color:var(--gray-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:3px;">${r.label}</div>
              <div style="font-size:15px;font-weight:600;color:var(--black);">
                ${r.type === 'scale' ? `<span style="font-size:22px;color:var(--gold);">${r.reponse}</span><span style="font-size:13px;color:var(--gray-muted)">/10</span>` : r.reponse || '—'}
              </div>
            </div>`;
          });
          html += `</div>`;
        } else if (isOpen && !isComplete) {
          html += `<div style="margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.5rem;font-size:13px;color:var(--gray-muted);">
            En attente de réponse du client.
          </div>`;
        }

        html += `</div>`;
        return html;
      }).join('');
    }

    document.getElementById('bcContent').innerHTML = html;
  },

  toggleInstance(id) {
    this._openInstanceId = (this._openInstanceId === id) ? null : id;
    this.renderContent();
  },

  async saveAssignation() {
    const templateId  = document.getElementById('bcTemplateSelect').value;
    const jourEnvoi   = parseInt(document.getElementById('bcJourEnvoi')?.value ?? 6, 10);
    const heureEnvoi  = document.getElementById('bcHeureEnvoi')?.value || '08:00';
    const msg = document.getElementById('bcAssignMsg');

    try {
      if (!templateId) {
        // Désassigner
        await db.removeBilanAssignation(this.clientId);
        this.assignation = null;
      } else {
        const saved = await db.upsertBilanAssignation({
          template_id: templateId,
          client_id: this.clientId,
          coach_id: Router.userProfile.id,
          actif: true,
          jour_envoi: jourEnvoi,
          heure_envoi: heureEnvoi
        });
        this.assignation = { ...saved, bilan_templates: this.templates.find(t => t.id === templateId) };
      }
      msg.innerHTML = '<div class="alert alert-success">✅ Assignation enregistrée</div>';
      setTimeout(() => { if (msg) msg.innerHTML = ''; }, 2500);
    } catch (e) {
      msg.innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  }
};
