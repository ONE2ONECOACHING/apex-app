// APEX APP — Coach : Gestion des templates de bilan

const CoachBilanTemplatesPage = {
  templates: [],
  _tpl: null,       // template en cours d'édition (copie)
  _newQType: 'scale',
  _editIdx: null,

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX · COACH</div>
          <div class="app-title">Templates bilan</div>
        </div>
        <button class="header-btn" onclick="history.back()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
      <div id="btContent"><div class="spinner" style="margin-top:2rem;"></div></div>
      <div id="btModal"></div>`;
  },

  async init() {
    const p = Router.userProfile;
    if (!p || p.role !== 'coach') { window.location.hash = '#coach-clients'; return; }
    try {
      this.templates = await db.getBilanTemplates(p.id);
      this.renderList();
    } catch (e) {
      document.getElementById('btContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  renderList() {
    const el = document.getElementById('btContent');
    let html = `<button class="btn btn-primary" style="margin-bottom:1rem;" onclick="CoachBilanTemplatesPage.openEditor()">+ Créer un template</button>`;

    if (this.templates.length === 0) {
      html += `<div class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-text">Aucun template.<br>Crée ton premier questionnaire hebdomadaire.</div>
      </div>`;
    } else {
      html += this.templates.map(t => `
        <div class="card" style="margin-bottom:0.75rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:700;font-size:15px;">📝 ${t.nom}</div>
              <div style="font-size:12px;color:var(--gray-muted);margin-top:3px;">
                ${(t.questions||[]).length} question${(t.questions||[]).length !== 1 ? 's' : ''}
              </div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-small" onclick="CoachBilanTemplatesPage.openEditor('${t.id}')">✏️</button>
              <button class="btn btn-ghost btn-small" style="color:var(--error);" onclick="CoachBilanTemplatesPage.deleteTemplate('${t.id}')">×</button>
            </div>
          </div>
        </div>`).join('');
    }
    el.innerHTML = html;
  },

  openEditor(templateId) {
    const found = templateId ? this.templates.find(t => t.id === templateId) : null;
    this._tpl = found
      ? JSON.parse(JSON.stringify(found))
      : { nom: '', questions: [] };
    this._renderEditorModal();
  },

  _renderEditorModal() {
    const t = this._tpl;
    document.getElementById('btModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this){document.getElementById('btModal').innerHTML=''}">
        <div class="modal" style="max-height:88vh;padding-bottom:calc(1.5rem + env(safe-area-inset-bottom,12px));">
          <div class="modal-title">
            ${t.id ? 'Modifier' : 'Nouveau'} template
            <button class="modal-close" onclick="document.getElementById('btModal').innerHTML=''">×</button>
          </div>

          <div class="field">
            <label class="field-label">Nom du template</label>
            <input class="input" id="btNom" value="${t.nom}" placeholder="ex: Bilan hebdo standard">
          </div>

          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-muted);margin-bottom:6px;">
            Questions <span id="btQCount">(${t.questions.length})</span>
          </div>
          <div id="btQList"></div>

          <button class="btn btn-secondary" style="margin-top:0.5rem;margin-bottom:0.75rem;height:40px;font-size:13px;"
            onclick="CoachBilanTemplatesPage._showAddQ()">+ Ajouter une question</button>

          <div id="btAddQForm"></div>
          <div id="btSaveMsg"></div>
          <button class="btn btn-primary" onclick="CoachBilanTemplatesPage.saveTemplate()">💾 Enregistrer</button>
        </div>
      </div>`;
    this._refreshQList();
  },

  _refreshQList() {
    const el = document.getElementById('btQList');
    if (!el) return;
    const icons = { scale: '⭐', text: '📝', number: '🔢', choice: '✅' };
    const qs = this._tpl.questions;
    el.innerHTML = qs.length === 0
      ? '<div style="font-size:13px;color:var(--gray-muted);padding:6px 0 4px;">Aucune question pour l\'instant.</div>'
      : qs.map((q, i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">
            <span style="font-size:18px;flex-shrink:0;">${icons[q.type] || '📝'}</span>
            <div style="flex:1;font-size:13px;color:var(--black);">${q.label}</div>
            <button class="btn btn-ghost btn-small" style="padding:0 7px;" onclick="CoachBilanTemplatesPage._moveQ(${i},-1)" ${i === 0 ? 'disabled style="opacity:0.3;"' : ''}>↑</button>
            <button class="btn btn-ghost btn-small" style="padding:0 7px;" onclick="CoachBilanTemplatesPage._moveQ(${i},1)" ${i === qs.length-1 ? 'disabled style="opacity:0.3;"' : ''}>↓</button>
            <button class="btn btn-ghost btn-small" style="padding:0 7px;" onclick="CoachBilanTemplatesPage._editQ(${i})">✏️</button>
            <button class="btn btn-ghost btn-small" style="color:var(--error);padding:0 8px;" onclick="CoachBilanTemplatesPage._removeQ(${i})">×</button>
          </div>`).join('');
    const cnt = document.getElementById('btQCount');
    if (cnt) cnt.textContent = `(${qs.length})`;
  },

  _showAddQ() {
    this._newQType = 'scale';
    document.getElementById('btAddQForm').innerHTML = `
      <div class="card card-accent" style="margin-bottom:0.75rem;">
        <div class="field">
          <label class="field-label">Type</label>
          <div class="toggle-row" id="btQTypeRow">
            <button class="toggle-btn active" onclick="CoachBilanTemplatesPage._setQType('scale',this)">⭐ Échelle</button>
            <button class="toggle-btn" onclick="CoachBilanTemplatesPage._setQType('text',this)">📝 Texte</button>
            <button class="toggle-btn" onclick="CoachBilanTemplatesPage._setQType('number',this)">🔢 Nombre</button>
            <button class="toggle-btn" onclick="CoachBilanTemplatesPage._setQType('choice',this)">✅ Choix</button>
          </div>
        </div>
        <div class="field">
          <label class="field-label">Question</label>
          <input class="input" id="btQLabel" placeholder="ex: Comment tu te sens cette semaine ?">
        </div>
        <div id="btQChoicesWrap" style="display:none;">
          <div class="field">
            <label class="field-label">Options (une par ligne)</label>
            <textarea class="input" id="btQChoices" rows="3" placeholder="Oui&#10;Partiellement&#10;Non" style="resize:none;"></textarea>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary" style="height:40px;font-size:13px;" onclick="document.getElementById('btAddQForm').innerHTML=''">Annuler</button>
          <button class="btn btn-primary" style="height:40px;font-size:13px;" onclick="CoachBilanTemplatesPage._confirmAddQ()">✓ Ajouter</button>
        </div>
      </div>`;
  },

  _setQType(type, btn) {
    this._newQType = type;
    document.querySelectorAll('#btQTypeRow .toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('btQChoicesWrap').style.display = type === 'choice' ? 'block' : 'none';
  },

  _confirmAddQ() {
    const label = document.getElementById('btQLabel').value.trim();
    if (!label) { alert('Saisis la question.'); return; }
    const q = { id: 'q_' + Date.now(), type: this._newQType, label };
    if (q.type === 'choice') {
      const raw = document.getElementById('btQChoices').value.trim();
      q.options = raw ? raw.split('\n').map(o => o.trim()).filter(Boolean) : ['Oui', 'Non'];
    }
    this._tpl.questions.push(q);
    document.getElementById('btAddQForm').innerHTML = '';
    this._refreshQList();
  },

  _editQ(idx) {
    this._editIdx = idx;
    const q = this._tpl.questions[idx];
    this._newQType = q.type;
    document.getElementById('btAddQForm').innerHTML = `
      <div class="card card-accent" style="margin-bottom:0.75rem;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gold);margin-bottom:10px;">Modifier la question</div>
        <div class="field">
          <label class="field-label">Type</label>
          <div class="toggle-row" id="btQTypeRow">
            <button class="toggle-btn ${q.type==='scale'?'active':''}"  onclick="CoachBilanTemplatesPage._setQType('scale',this)">⭐ Échelle</button>
            <button class="toggle-btn ${q.type==='text'?'active':''}"   onclick="CoachBilanTemplatesPage._setQType('text',this)">📝 Texte</button>
            <button class="toggle-btn ${q.type==='number'?'active':''}" onclick="CoachBilanTemplatesPage._setQType('number',this)">🔢 Nombre</button>
            <button class="toggle-btn ${q.type==='choice'?'active':''}" onclick="CoachBilanTemplatesPage._setQType('choice',this)">✅ Choix</button>
          </div>
        </div>
        <div class="field">
          <label class="field-label">Question</label>
          <input class="input" id="btQLabel" value="${q.label.replace(/"/g,'&quot;')}" placeholder="ex: Comment tu te sens cette semaine ?">
        </div>
        <div id="btQChoicesWrap" style="display:${q.type==='choice'?'block':'none'};">
          <div class="field">
            <label class="field-label">Options (une par ligne)</label>
            <textarea class="input" id="btQChoices" rows="3" style="resize:none;">${(q.options||[]).join('\n')}</textarea>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary" style="height:40px;font-size:13px;"
            onclick="document.getElementById('btAddQForm').innerHTML='';CoachBilanTemplatesPage._editIdx=null;">Annuler</button>
          <button class="btn btn-primary" style="height:40px;font-size:13px;"
            onclick="CoachBilanTemplatesPage._confirmEditQ()">✓ Mettre à jour</button>
        </div>
      </div>`;
    document.getElementById('btAddQForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  _confirmEditQ() {
    const label = document.getElementById('btQLabel').value.trim();
    if (!label) { alert('Saisis la question.'); return; }
    const orig = this._tpl.questions[this._editIdx];
    const q = { ...orig, type: this._newQType, label };
    if (q.type === 'choice') {
      const raw = document.getElementById('btQChoices').value.trim();
      q.options = raw ? raw.split('\n').map(o => o.trim()).filter(Boolean) : ['Oui', 'Non'];
    } else {
      delete q.options;
    }
    this._tpl.questions[this._editIdx] = q;
    this._editIdx = null;
    document.getElementById('btAddQForm').innerHTML = '';
    this._refreshQList();
  },

  _moveQ(idx, dir) {
    const qs = this._tpl.questions;
    const to = idx + dir;
    if (to < 0 || to >= qs.length) return;
    [qs[idx], qs[to]] = [qs[to], qs[idx]];
    this._refreshQList();
  },

  _removeQ(idx) {
    this._tpl.questions.splice(idx, 1);
    this._refreshQList();
  },

  async saveTemplate() {
    const nom = document.getElementById('btNom').value.trim();
    if (!nom) { document.getElementById('btSaveMsg').innerHTML = '<div class="alert alert-error">Nom obligatoire.</div>'; return; }
    if (this._tpl.questions.length === 0) { document.getElementById('btSaveMsg').innerHTML = '<div class="alert alert-error">Ajoute au moins une question.</div>'; return; }

    const tpl = { ...this._tpl, nom, coach_id: Router.userProfile.id };
    try {
      const saved = await db.upsertBilanTemplate(tpl);
      const idx = this.templates.findIndex(t => t.id === saved.id);
      if (idx >= 0) this.templates[idx] = saved; else this.templates.unshift(saved);
      document.getElementById('btModal').innerHTML = '';
      this.renderList();
    } catch (e) {
      document.getElementById('btSaveMsg').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  async deleteTemplate(id) {
    if (!confirm('Supprimer ce template ? Les bilans existants ne seront pas affectés.')) return;
    try {
      await db.deleteBilanTemplate(id);
      this.templates = this.templates.filter(t => t.id !== id);
      this.renderList();
    } catch (e) { alert('Erreur : ' + e.message); }
  }
};
