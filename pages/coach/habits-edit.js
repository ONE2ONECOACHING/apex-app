// APEX APP — Coach : Habitudes client (cases à cocher uniquement)

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
        <button class="header-btn" onclick="history.back()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
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
    const typeIcons = { eau: '💧', pas: '👟', sommeil: '😴', digestion: '🥗', stress: '🧘', custom: '⭐' };

    let html = `<button class="btn btn-primary" style="margin-bottom:1rem;" onclick="CoachHabitsEditPage.openForm()">+ Ajouter une habitude</button>`;

    if (this.habitudes.length === 0) {
      html += `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">Aucune habitude configurée.<br>Ajoute des objectifs pour ton client.</div></div>`;
    } else {
      html += this.habitudes.map((h, i) => `
        <div class="card" style="margin-bottom:0.75rem;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;">${typeIcons[h.type] || '✅'} ${h.label}</div>
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
      { v: 'eau', l: '💧 Hydratation' }, { v: 'pas', l: '👟 Marche / Pas' },
      { v: 'sommeil', l: '😴 Sommeil' }, { v: 'digestion', l: '🥗 Digestion' },
      { v: 'stress', l: '🧘 Stress' }, { v: 'custom', l: '⭐ Personnalisé' }
    ];
    const defaultLabels = { eau: 'Boire 2L d\'eau', pas: '8000 pas aujourd\'hui', sommeil: 'Routine sommeil respectée', digestion: 'Repas pris sans stress', stress: 'Moment de relaxation', custom: 'Mon objectif du jour' };
    const currentType = h ? h.type : 'eau';

    document.getElementById('habModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('habModal').innerHTML=''">
        <div class="modal">
          <div class="modal-title">${h ? 'Modifier' : 'Nouvelle habitude'} <button class="modal-close" onclick="document.getElementById('habModal').innerHTML=''">×</button></div>
          <div class="field">
            <label class="field-label">Catégorie</label>
            <select class="input" id="habType" onchange="document.getElementById('habLabel').value=({'eau':'Boire 2L d\\'eau','pas':'8000 pas aujourd\\'hui','sommeil':'Routine sommeil respectée','digestion':'Repas pris sans stress','stress':'Moment de relaxation','custom':'Mon objectif du jour'})[this.value]||''">
              ${types.map(t => `<option value="${t.v}" ${currentType === t.v ? 'selected' : ''}>${t.l}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label class="field-label">Libellé (visible par le client)</label>
            <input class="input" id="habLabel" value="${h ? h.label : defaultLabels[currentType]}">
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

  async saveHabitude() {
    const habitude = {
      profile_id: this.clientId,
      type: document.getElementById('habType').value,
      label: document.getElementById('habLabel').value.trim(),
      mode: 'check',
      valeur_cible: null,
      unite: null,
      tips: document.getElementById('habTips').value.trim() || null,
      actif: true,
      position: this._editIdx !== null ? this.habitudes[this._editIdx].position : this.habitudes.length
    };
    if (this._editIdx !== null) habitude.id = this.habitudes[this._editIdx].id;

    if (!habitude.label) {
      document.getElementById('habSaveMsg').innerHTML = '<div class="alert alert-error">Libellé obligatoire.</div>';
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
