// APEX APP — Coach : Habitudes client

const CoachHabitsEditPage = {
  clientId: null,
  client: null,
  habitudes: [],
  _editIdx: null,

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX · COACH</div>
          <div class="app-title" id="habTitle">Habitudes</div>
        </div>
        <button class="btn btn-ghost" style="padding:6px 12px;font-size:13px;" onclick="history.back()">← Retour</button>
      </div>
      <div id="habContent"><div class="spinner" style="margin-top:2rem;"></div></div>
      <div id="habModal"></div>`;
  },

  async init() {
    const params = Router.getParams();
    this.clientId = params.clientId;
    if (!this.clientId) { window.location.hash = '#coach-clients'; return; }
    try {
      this.client = await db.getProfile(this.clientId);
      this.habitudes = await db.getHabitudes(this.clientId);
      document.getElementById('habTitle').textContent = (this.client.prenom || 'Client') + ' — Habitudes';
      this.renderList();
    } catch (e) {
      document.getElementById('habContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  renderList() {
    const el = document.getElementById('habContent');
    const typeLabels = {
      eau: '💧 Hydratation', pas: '👟 Pas', sommeil: '😴 Sommeil',
      digestion: '🥗 Digestion', stress: '🧘 Stress', custom: '⭐ Personnalisé'
    };

    let html = `<button class="btn btn-primary" style="margin-bottom:1rem;" onclick="CoachHabitsEditPage.openForm()">+ Ajouter une habitude</button>`;

    if (this.habitudes.length === 0) {
      html += `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">Aucune habitude configurée.<br>Ajoute des objectifs pour ton client.</div></div>`;
    } else {
      html += this.habitudes.map((h, i) => `
        <div class="card" style="margin-bottom:0.75rem;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;color:var(--gray-muted);margin-bottom:2px;">${typeLabels[h.type] || h.type}</div>
              <div style="font-weight:600;">${h.label}</div>
              ${h.mode === 'progress' ? `<div style="font-size:13px;color:var(--gray);">Objectif : ${h.valeur_cible} ${h.unite}</div>` : '<div style="font-size:13px;color:var(--gray);">Case à cocher</div>'}
              ${h.tips ? `<div style="font-size:12px;color:var(--gray-muted);margin-top:4px;font-style:italic;">${h.tips}</div>` : ''}
            </div>
            <div style="display:flex;gap:6px;margin-left:8px;">
              <button class="btn btn-secondary btn-small" onclick="CoachHabitsEditPage.openForm(${i})">✏️</button>
              <button class="btn btn-ghost btn-small" style="color:#E05252;" onclick="CoachHabitsEditPage.deleteHabitude('${h.id}')">×</button>
            </div>
          </div>
        </div>`).join('');
    }

    el.innerHTML = html;
  },

  openForm(idx) {
    this._editIdx = idx !== undefined ? idx : null;
    const h = idx !== undefined ? this.habitudes[idx] : null;
    const types = [
      { v: 'eau', l: '💧 Hydratation' }, { v: 'pas', l: '👟 Pas' },
      { v: 'sommeil', l: '😴 Sommeil' }, { v: 'digestion', l: '🥗 Digestion' },
      { v: 'stress', l: '🧘 Stress' }, { v: 'custom', l: '⭐ Personnalisé' }
    ];
    const currentType = h ? h.type : 'eau';
    const currentMode = h ? h.mode : 'progress';

    document.getElementById('habModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('habModal').innerHTML=''">
        <div class="modal">
          <div class="modal-title">${h ? 'Modifier' : 'Nouvelle habitude'} <button class="modal-close" onclick="document.getElementById('habModal').innerHTML=''">×</button></div>
          <div class="field">
            <label class="field-label">Type</label>
            <select class="input" id="habType" onchange="CoachHabitsEditPage.onTypeChange()">
              ${types.map(t => `<option value="${t.v}" ${currentType === t.v ? 'selected' : ''}>${t.l}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label class="field-label">Label (visible par le client)</label>
            <input class="input" id="habLabel" value="${h ? h.label : 'Boire de l\'eau'}">
          </div>
          <div class="field">
            <label class="field-label">Mode</label>
            <select class="input" id="habMode" onchange="CoachHabitsEditPage.onModeChange()">
              <option value="progress" ${currentMode === 'progress' ? 'selected' : ''}>Barre de progression (numérique)</option>
              <option value="check" ${currentMode === 'check' ? 'selected' : ''}>Case à cocher</option>
            </select>
          </div>
          <div id="habProgressFields" style="${currentMode === 'progress' ? '' : 'display:none;'}">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="field"><label class="field-label">Objectif</label><input class="input" type="number" id="habTarget" value="${h && h.valeur_cible ? h.valeur_cible : ''}"></div>
              <div class="field"><label class="field-label">Unité</label><input class="input" id="habUnite" value="${h && h.unite ? h.unite : ''}"></div>
            </div>
          </div>
          <div class="field">
            <label class="field-label">Conseil affiché au client (optionnel)</label>
            <textarea class="input" id="habTips" rows="2" style="resize:none;">${h && h.tips ? h.tips : ''}</textarea>
          </div>
          <button class="btn btn-primary" style="width:100%;" onclick="CoachHabitsEditPage.saveHabitude()">💾 Enregistrer</button>
          <div id="habSaveMsg" style="margin-top:0.5rem;"></div>
        </div>
      </div>`;
  },

  onTypeChange() {
    const type = document.getElementById('habType').value;
    const defaults = {
      eau: { label: 'Boire de l\'eau', mode: 'progress', target: 2, unite: 'L' },
      pas: { label: 'Nombre de pas', mode: 'progress', target: 8000, unite: 'pas' },
      sommeil: { label: 'Routine sommeil', mode: 'check' },
      digestion: { label: 'Santé digestive', mode: 'check' },
      stress: { label: 'Gestion du stress', mode: 'check' },
      custom: { label: 'Mon objectif', mode: 'check' }
    };
    const d = defaults[type] || defaults.custom;
    document.getElementById('habLabel').value = d.label;
    document.getElementById('habMode').value = d.mode;
    if (d.target) document.getElementById('habTarget').value = d.target;
    if (d.unite) document.getElementById('habUnite').value = d.unite;
    this.onModeChange();
  },

  onModeChange() {
    const mode = document.getElementById('habMode').value;
    document.getElementById('habProgressFields').style.display = mode === 'progress' ? '' : 'none';
  },

  async saveHabitude() {
    const mode = document.getElementById('habMode').value;
    const habitude = {
      profile_id: this.clientId,
      type: document.getElementById('habType').value,
      label: document.getElementById('habLabel').value.trim(),
      mode,
      valeur_cible: mode === 'progress' ? (parseFloat(document.getElementById('habTarget').value) || null) : null,
      unite: mode === 'progress' ? (document.getElementById('habUnite').value.trim() || null) : null,
      tips: document.getElementById('habTips').value.trim() || null,
      actif: true,
      position: this._editIdx !== null ? this.habitudes[this._editIdx].position : this.habitudes.length
    };
    if (this._editIdx !== null) habitude.id = this.habitudes[this._editIdx].id;

    if (!habitude.label) {
      document.getElementById('habSaveMsg').innerHTML = '<div class="alert alert-error">Label obligatoire.</div>';
      return;
    }

    try {
      const saved = await db.upsertHabitudeConfig(habitude);
      if (this._editIdx !== null) this.habitudes[this._editIdx] = saved;
      else this.habitudes.push(saved);
      document.getElementById('habModal').innerHTML = '';
      this.renderList();
    } catch (e) {
      document.getElementById('habSaveMsg').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  async deleteHabitude(id) {
    if (!confirm('Supprimer cette habitude ?')) return;
    try {
      await db.deleteHabitudeConfig(id);
      this.habitudes = this.habitudes.filter(h => h.id !== id);
      this.renderList();
    } catch (e) { alert('Erreur : ' + e.message); }
  }
};
