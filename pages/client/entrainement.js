// APEX APP — Client : Module Entraînement

const EntrainementPage = {
  programme: null,

  _jours: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE — APEX</div>
          <div class="app-title">Entraînement</div>
        </div>
      </div>
      <div id="trainContent"><div class="spinner" style="margin-top:3rem;"></div></div>
      <nav class="nav-bottom"><div class="nav-inner">
        <a class="nav-item" href="#dashboard"><span class="nav-icon">🏠</span><span class="nav-label">Dashboard</span></a>
        <a class="nav-item" href="#logbook"><span class="nav-icon">🥗</span><span class="nav-label">Nutrition</span></a>
        <a class="nav-item active" href="#entrainement"><span class="nav-icon">💪</span><span class="nav-label">Entraînement</span></a>
        <a class="nav-item" href="#mesure"><span class="nav-icon">📏</span><span class="nav-label">Mesures</span></a>
      </div></nav>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile) return;
    if (profile.role === 'coach') { window.location.hash = '#coach-clients'; return; }

    try {
      this.programme = await db.getClientProgrammeActif(profile.id);
      this._render();
    } catch (e) {
      document.getElementById('trainContent').innerHTML =
        '<div class="alert alert-error">Erreur de chargement.</div>';
    }
  },

  _render() {
    const el = document.getElementById('trainContent');
    if (!el) return;

    if (!this.programme) {
      el.innerHTML = `
        <div class="empty-state" style="margin-top:3rem;">
          <div class="empty-icon">💪</div>
          <div class="empty-text">Aucun programme actif.<br>Contacte ton coach pour qu'il t'en assigne un.</div>
        </div>`;
      return;
    }

    const p = this.programme;
    const dateDebut = p.date_debut
      ? new Date(p.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

    el.innerHTML = `
      <div style="margin-bottom:1rem;">
        <div style="font-size:18px;font-weight:700;color:var(--black);">📋 ${p.nom}</div>
        ${dateDebut ? `<div style="font-size:13px;color:var(--gray-muted);margin-top:3px;">Démarré le ${dateDebut}</div>` : ''}
      </div>

      ${(p.seances || []).length === 0
        ? `<div class="empty-state"><div class="empty-icon">📭</div>
           <div class="empty-text">Aucune séance dans ce programme.</div></div>`
        : (p.seances || []).map(s => this._seanceCard(s)).join('')
      }`;
  },

  _seanceCard(seance) {
    const exos = seance.exercices || [];
    const jourLabel = seance.jour > 0 ? `<span style="font-size:11px;color:var(--gray-muted);margin-left:6px;">· ${this._jours[(seance.jour - 1) % 7]}</span>` : '';

    return `
      <div class="card" style="margin-bottom:0.75rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-weight:700;font-size:15px;">
            ${seance.nom}${jourLabel}
          </div>
          <button class="btn btn-primary btn-small" style="font-size:12px;"
            onclick="EntrainementPage._startSeance('${seance.id}')">
            ▶ Démarrer
          </button>
        </div>

        ${seance.notes_coach ? `
          <div style="font-size:12px;color:var(--gold);background:var(--gold-bg,#fffbeb);
               border-left:3px solid var(--gold);padding:6px 10px;border-radius:4px;margin-bottom:10px;">
            📌 ${seance.notes_coach}
          </div>` : ''}

        <div style="display:flex;flex-direction:column;gap:6px;">
          ${exos.map(e => this._exoRow(e)).join('')}
        </div>

        ${exos.length === 0
          ? '<div style="font-size:13px;color:var(--gray-muted);">Aucun exercice.</div>'
          : ''}
      </div>`;
  },

  _exoRow(e) {
    const nom     = e.exercices_bdd?.nom || '—';
    const series  = e.series || 3;
    const reps    = e.reps_cible || '10';
    const charge  = e.charge_cible ? ` · ${e.charge_cible}` : '';
    const repos   = e.repos_secondes ? ` · ${e.repos_secondes}s` : '';
    const effortIcon = { reps: '', temps: '⏱', distance: '📏', amrap: '🔁' }[e.exercices_bdd?.type_effort || 'reps'] || '';

    return `
      <div style="display:flex;align-items:center;gap:10px;padding:6px 0;
           border-bottom:1px solid var(--border);">
        <div style="flex:1;font-size:13px;font-weight:500;color:var(--black);">${nom}</div>
        <div style="font-size:12px;color:var(--gray-muted);white-space:nowrap;">
          ${effortIcon} ${series}×${reps}${charge}${repos}
        </div>
      </div>`;
  },

  _startSeance(seanceId) {
    // Phase 3 — sera implémentée prochainement
    Router.navigate('seance-active', { seanceId, programmeId: this.programme?.id });
  }
};
