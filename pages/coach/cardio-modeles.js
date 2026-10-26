// APEX APP — Coach : Bibliothèque › Plans cardio (modèles communs à l'équipe)

const CoachCardioModelesPage = {
  modeles: [],

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title">Bibliothèque</div>
        </div>
        <button class="btn btn-primary btn-small" onclick="CoachCardioModelesPage.nouveau()">+ Nouveau plan cardio</button>
      </div>
      ${biblioNav('coach-cardio-modeles')}
      <div id="cmoContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    try {
      this.modeles = await db.getCardioModeles();
      this._render();
    } catch (e) {
      document.getElementById('cmoContent').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  _render() {
    const el = document.getElementById('cmoContent');
    if (!this.modeles.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">🏃</div>
        <div class="empty-text">Aucun plan cardio. Crée le premier avec « + Nouveau plan cardio ».</div></div>`;
      return;
    }
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;padding-bottom:4rem;">
      ${this.modeles.map(m => {
        const phases = m.cardio_modele_phases || [];
        const seances = phases.reduce((t, p) => t + (p.cardio_modele_seances || []).length, 0);
        return `
        <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0;padding:14px 18px;">
          <div style="flex:1;min-width:0;cursor:pointer;" onclick="CoachCardioModelesPage.ouvrir('${m.id}')">
            <div style="font-weight:700;font-size:15px;margin-bottom:3px;">🏃 ${escHtml(m.nom)}</div>
            <div style="font-size:12px;color:var(--gray-light);">
              ${phases.length} phase${phases.length > 1 ? 's' : ''} · ${seances} séance${seances > 1 ? 's' : ''}${m.description ? ' · ' + escHtml(m.description) : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button class="btn btn-ghost btn-small" onclick="CoachCardioModelesPage.ouvrir('${m.id}')">✎ Modifier</button>
            <button class="btn btn-ghost btn-small" onclick="CoachCardioModelesPage.dupliquer('${m.id}', this)">⧉ Dupliquer</button>
            <button class="btn btn-ghost btn-small" onclick="CoachCardioModelesPage.supprimer('${m.id}')">× Supprimer</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  },

  ouvrir(id) { Router.navigate('coach-cardio-modele', { modeleId: id }); },

  async nouveau() {
    const nom = prompt('Nom du plan cardio (ex. HYROX prépa) :');
    if (!nom || !nom.trim()) return;
    try {
      const m = await db.creerCardioModele(nom.trim());
      this.ouvrir(m.id);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  async dupliquer(id, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Copie…'; }
    try {
      const copie = await db.dupliquerCardioModele(id);
      toast('Plan cardio dupliqué', 'success');
      this.ouvrir(copie);
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = '⧉ Dupliquer'; }
    }
  },

  async supprimer(id) {
    const m = this.modeles.find(x => x.id === id);
    if (!confirm(`Supprimer le plan cardio « ${m?.nom || ''} » de la bibliothèque ?\n\nLes plans déjà attribués aux clients ne changent pas.`)) return;
    try {
      await db.majCardioRacine('modele', id, { actif: false });
      this.modeles = this.modeles.filter(x => x.id !== id);
      this._render();
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },
};
