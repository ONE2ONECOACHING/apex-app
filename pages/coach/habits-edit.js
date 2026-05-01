// APEX APP — Coach : Habitudes client (cases à cocher uniquement)

const HABITS_LIBRARY = [
  { type: 'pas',       label: '🚶 Marche 10 000 pas/jour',           tips: 'Marche, vélo, cardio léger… 10 000 pas = ~90 min. Tu peux marcher en téléphonant ou entre tes séries.' },
  { type: 'digestion', label: '🍽️ Préparer ses repas à l\'avance',   tips: 'Cuisine tes repas lors de tes jours de repos pour 3-4 jours. Pas d\'imprévu = pas de tentation.' },
  { type: 'eau',       label: '💧 Boire 2 à 3L d\'eau par jour',     tips: '2 bouteilles d\'1L le matin : finis la 1ère avant midi, la 2ème avant le soir. La déshydratation = rétention d\'eau.' },
  { type: 'custom',    label: '🎉 Gérer les repas de fête',           tips: 'Jeûne le matin, protéines au déj, puis profite du repas. Qualité > quantité, eau > alcool.' },
  { type: 'custom',    label: '🎁 Week-end récompense modéré',        tips: 'Un repas plaisir oui, 2 jours de dérives non. L\'écart hebdo reste occasionnel et modéré pour ne pas annuler la semaine.' },
  { type: 'digestion', label: '😌 Manger dans le calme',              tips: 'Pas de stress, pas d\'écran, pas de rush. Le système parasympathique optimise ta digestion et l\'assimilation des nutriments.' },
  { type: 'digestion', label: '👄 Mastiquer 15-20 fois par bouchée',  tips: 'Pose tes couverts entre chaque bouchée. Ça stimule la digestion, améliore la satiété et réduit les ballonnements.' },
  { type: 'digestion', label: '☕ Décaler le café 30 min après le repas', tips: 'Pris trop tôt, le café perturbe l\'absorption du fer et des minéraux. Attends 30 min après avoir mangé.' },
  { type: 'sommeil',   label: '🌙 Horaires de sommeil fixes',          tips: 'Même heure de coucher et de lever tous les jours. À partir de 21h : lumière tamisée, calme, pas d\'écran.' },
  { type: 'sommeil',   label: '🛏️ Chambre sombre et silencieuse',     tips: 'La moindre lumière réduit la mélatonine. Objectif : noir total. Masque de nuit ou volets occultants, bouchons si besoin.' },
  { type: 'sommeil',   label: '📵 Pas d\'écran 1h avant de dormir',   tips: 'La lumière bleue bloque la mélatonine et stimule la dopamine. Remplace par un livre ou une activité calme.' },
  { type: 'sommeil',   label: '☕ Stopper la caféine après 14h',       tips: 'La caféine allonge l\'endormissement et détériore les phases de sommeil profond. Max 3 cafés/jour, dernier avant 14h.' },
  { type: 'stress',    label: '🌿 Tisane relaxante le soir',           tips: 'Verveine, valériane, passiflore, mélisse ou camomille. Remplace les écrans et prépare le corps au sommeil.' },
];

const CoachHabitsEditPage = {
  clientId: null,
  client: null,
  habitudes: [],
  _editIdx: null,

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX · COACH</div>
          <div class="app-title" id="habTitle">Habitudes</div>
        </div>
        <button class="header-btn" onclick="history.back()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
      </div>
      <div id="habNav"></div>
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
      document.getElementById('habTitle').textContent = 'Habitudes — ' + (this.client.prenom || 'Client');
      const habNav = document.getElementById('habNav');
      if (habNav) habNav.innerHTML = coachClientNav(this.clientId, 'coach-habits-edit');
      this.renderList();
    } catch (e) {
      document.getElementById('habContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  renderList() {
    const el = document.getElementById('habContent');
    const typeIcons = { eau: '💧', pas: '👟', sommeil: '😴', digestion: '🥗', stress: '🧘', custom: '⭐' };

    const libChips = HABITS_LIBRARY.map((lib, li) =>
      `<button type="button" class="hab-lib-chip" onclick="CoachHabitsEditPage.openFormFromLib(${li})">${lib.label}</button>`
    ).join('');

    let html = `
      <button class="btn btn-primary" style="margin-bottom:1rem;" onclick="CoachHabitsEditPage.openForm()">+ Ajouter une habitude</button>
      <div style="margin-bottom:1.25rem;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-muted);margin-bottom:8px;">📚 Bibliothèque — cliquer pour ajouter</div>
        <div class="hab-lib-scroll">${libChips}</div>
      </div>`;

    if (this.habitudes.length === 0) {
      html += `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">Aucune habitude configurée.<br>Ajoute des objectifs pour ton client.</div></div>`;
    } else {
      html += `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-muted);margin-bottom:8px;">Habitudes actives</div>`;
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

  openFormFromLib(li) {
    const lib = HABITS_LIBRARY[li];
    if (!lib) return;
    this._openModal(null, lib.type, lib.label, lib.tips);
  },

  openForm(idx) {
    this._editIdx = idx !== undefined ? idx : null;
    const h = idx !== undefined ? this.habitudes[idx] : null;
    this._openModal(h, h ? h.type : 'eau', h ? h.label : '', h ? (h.tips || '') : '');
  },

  _openModal(h, type, label, tips) {
    const types = [
      { v: 'eau', l: '💧 Hydratation' }, { v: 'pas', l: '👟 Marche / Pas' },
      { v: 'sommeil', l: '😴 Sommeil' }, { v: 'digestion', l: '🥗 Digestion' },
      { v: 'stress', l: '🧘 Stress' }, { v: 'custom', l: '⭐ Personnalisé' }
    ];
    const safeLabel = label.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const safeTips  = tips.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    document.getElementById('habModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('habModal').innerHTML=''">
        <div class="modal">
          <div class="modal-title">${h ? 'Modifier l\'habitude' : 'Nouvelle habitude'} <button class="modal-close" onclick="document.getElementById('habModal').innerHTML=''">×</button></div>
          <div class="field">
            <label class="field-label">Catégorie</label>
            <select class="input" id="habType">
              ${types.map(t => `<option value="${t.v}" ${type === t.v ? 'selected' : ''}>${t.l}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label class="field-label">Libellé (visible par le client)</label>
            <input class="input" id="habLabel" value="${safeLabel}">
          </div>
          <div class="field">
            <label class="field-label">Conseil affiché au client (optionnel)</label>
            <textarea class="input" id="habTips" rows="3" style="resize:none;">${safeTips}</textarea>
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
