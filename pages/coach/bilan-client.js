// APEX APP — Coach : Bilan hebdo d'un client (assignation + historique enrichi)

const CoachBilanClientPage = {
  clientId: null,
  client: null,
  templates: [],
  assignation: null,
  instances: [],
  _openInstanceId: null,

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="bcTitle">Bilan client</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#coach-clients'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
      <div id="bcContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    this.clientId        = null; this.client      = null;
    this.templates       = [];   this.assignation = null;
    this.instances       = [];   this._openInstanceId = null;

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
      document.getElementById('bcTitle').textContent = 'Bilans — ' + (this.client.prenom || 'Client');
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
    const jours = [[1,'Lundi'],[2,'Mardi'],[3,'Mercredi'],[4,'Jeudi'],[5,'Vendredi'],[6,'Samedi'],[0,'Dimanche']];

    let html = `${coachClientNav(this.clientId, 'coach-bilan-client')}
      <div class="card" style="margin-bottom:1rem;">
        <div class="card-title">Template assigné</div>`;

    if (this.templates.length === 0) {
      html += `<div style="font-size:13px;color:var(--gray-muted);">
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
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-muted);margin-bottom:0.75rem;">
        Historique (${this.instances.length} bilans)
      </div>`;

    if (this.instances.length === 0) {
      html += `<div class="empty-state" style="padding:2rem 1rem;">
        <div class="empty-icon">📋</div>
        <div class="empty-text">Aucun bilan envoyé pour ce client.</div>
      </div>`;
    } else {
      const completed = this.instances.filter(i => i.statut === 'complete');
      html += this.instances.map((inst, idx) => {
        const semStr    = new Date(inst.semaine + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const isComplete = inst.statut === 'complete';
        const isOpen     = this._openInstanceId === inst.id;
        const prevCompleted = completed.find((c, ci) => c.id !== inst.id && new Date(c.semaine) < new Date(inst.semaine));

        let card = `
          <div class="card" style="margin-bottom:0.65rem;">
            <div style="cursor:pointer;" onclick="CoachBilanClientPage.toggleInstance('${inst.id}')">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:600;font-size:14px;">Semaine du ${semStr}</div>
                  <div style="font-size:12px;margin-top:2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="color:${isComplete ? 'var(--success)' : 'var(--gold)'};font-weight:600;">
                      ${isComplete ? '✅ Complété' : '⏳ En attente'}
                    </span>
                    ${inst.completed_at ? `<span style="color:var(--gray-muted);">${new Date(inst.completed_at).toLocaleDateString('fr-FR')}</span>` : ''}
                  </div>
                </div>
                ${isComplete ? this._bilanScorePreview(inst, prevCompleted) : ''}
                <span style="color:var(--gray-muted);font-size:20px;margin-left:8px;">${isOpen ? '▲' : '▼'}</span>
              </div>
            </div>`;

        if (isOpen && isComplete && inst.reponses?.length > 0) {
          card += `<div style="margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.75rem;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">`;

          inst.reponses.forEach(r => {
            const prevR = prevCompleted?.reponses?.find(pr => pr.id === r.id);
            if (r.type === 'scale') {
              const val  = parseFloat(r.reponse) || 0;
              const prev = prevR ? parseFloat(prevR.reponse) || 0 : null;
              const diff = prev !== null ? val - prev : null;
              const barColor = val >= 7 ? '#10B981' : val >= 5 ? '#C4820A' : '#EF4444';
              const trendHtml = diff !== null
                ? `<span style="font-size:10px;font-weight:700;color:${diff > 0 ? '#10B981' : diff < 0 ? '#EF4444' : 'var(--gray-muted)'};">${diff > 0 ? '↑+' + diff : diff < 0 ? '↓' + diff : '='}</span>`
                : '';
              card += `<div style="background:var(--card-bg);border-radius:10px;padding:10px;">
                <div style="font-size:11px;color:var(--gray-muted);margin-bottom:4px;">${r.label}</div>
                <div style="display:flex;align-items:baseline;gap:5px;margin-bottom:5px;">
                  <span style="font-size:26px;font-weight:800;color:${barColor};">${val}</span>
                  <span style="font-size:12px;color:var(--gray-muted);">/10</span>
                  ${trendHtml}
                </div>
                <div style="height:5px;background:var(--border-solid);border-radius:3px;overflow:hidden;">
                  <div style="height:100%;width:${val * 10}%;background:${barColor};border-radius:3px;"></div>
                </div>
              </div>`;
            } else if (r.type === 'number') {
              const val  = r.reponse || '—';
              const prev = prevR?.reponse;
              const diff = prev && val !== '—' ? (parseFloat(val) - parseFloat(prev)).toFixed(1) : null;
              card += `<div style="background:var(--card-bg);border-radius:10px;padding:10px;">
                <div style="font-size:11px;color:var(--gray-muted);margin-bottom:4px;">${r.label}</div>
                <div style="font-size:22px;font-weight:700;color:var(--black);">${val}
                  ${r.reponse && r.label.toLowerCase().includes('poids') ? '<span style="font-size:12px;color:var(--gray-muted);">kg</span>' : ''}
                  ${diff !== null ? `<span style="font-size:11px;font-weight:700;color:${parseFloat(diff) < 0 ? '#10B981' : parseFloat(diff) > 0 ? '#EF4444' : 'var(--gray-muted)'};">${parseFloat(diff) > 0 ? '+' : ''}${diff}</span>` : ''}
                </div>
              </div>`;
            } else {
              card += `<div style="background:var(--card-bg);border-radius:10px;padding:10px;grid-column:span 2;">
                <div style="font-size:11px;color:var(--gray-muted);margin-bottom:4px;">${r.label}</div>
                <div style="font-size:14px;color:var(--black);line-height:1.5;">${r.reponse || '—'}</div>
              </div>`;
            }
          });

          card += `</div></div>`;
        } else if (isOpen && !isComplete) {
          card += `<div style="margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.5rem;font-size:13px;color:var(--gray-muted);">
            En attente de réponse du client.
          </div>`;
        }

        card += `</div>`;
        return card;
      }).join('');
    }

    document.getElementById('bcContent').innerHTML = html;
  },

  _bilanScorePreview(inst, prev) {
    const scales = (inst.reponses || []).filter(r => r.type === 'scale').slice(0, 3);
    if (!scales.length) return '';
    return `<div style="display:flex;gap:3px;align-items:center;">
      ${scales.map(r => {
        const val = parseFloat(r.reponse) || 0;
        const prevR = prev?.reponses?.find(pr => pr.id === r.id);
        const diff  = prevR ? val - (parseFloat(prevR.reponse) || 0) : null;
        const color = val >= 7 ? '#10B981' : val >= 5 ? '#C4820A' : '#EF4444';
        return `<div style="background:${color}22;border:1px solid ${color}44;border-radius:6px;padding:2px 7px;text-align:center;">
          <div style="font-size:12px;font-weight:700;color:${color};">${val}</div>
          ${diff !== null && diff !== 0 ? `<div style="font-size:8px;color:${diff > 0 ? '#10B981' : '#EF4444'};">${diff > 0 ? '↑' : '↓'}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  },

  toggleInstance(id) {
    this._openInstanceId = (this._openInstanceId === id) ? null : id;
    this.renderContent();
  },

  async saveAssignation() {
    const templateId = document.getElementById('bcTemplateSelect').value;
    const jourEnvoi  = parseInt(document.getElementById('bcJourEnvoi')?.value ?? 6, 10);
    const heureEnvoi = document.getElementById('bcHeureEnvoi')?.value || '08:00';
    const msg = document.getElementById('bcAssignMsg');
    try {
      if (!templateId) {
        await db.removeBilanAssignation(this.clientId);
        this.assignation = null;
      } else {
        const saved = await db.upsertBilanAssignation({
          template_id: templateId, client_id: this.clientId,
          coach_id: Router.userProfile.id, actif: true,
          jour_envoi: jourEnvoi, heure_envoi: heureEnvoi
        });
        this.assignation = { ...saved, bilan_templates: this.templates.find(t => t.id === templateId) };
      }
      toast('✅ Assignation enregistrée', 'success');
      msg.innerHTML = '';
    } catch (e) {
      msg.innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  }
};
