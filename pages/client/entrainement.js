// APEX APP — Client : Module Entraînement (Programme + Historique)

const EntrainementPage = {
  programme:    null,
  _tab:         'programme',  // 'programme' | 'historique'
  _logs:        [],
  _logsLoaded:  false,
  _expanded:    null,         // log.id currently expanded

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

    // Reset state on each visit
    this._tab        = 'programme';
    this._logs       = [];
    this._logsLoaded = false;
    this._expanded   = null;

    try {
      this.programme = await db.getClientProgrammeActif(profile.id);
      this._renderContent();
    } catch (e) {
      document.getElementById('trainContent').innerHTML =
        '<div class="alert alert-error">Erreur de chargement.</div>';
    }
  },

  // ── Rendu ────────────────────────────────────────────────────────────────────

  _renderContent() {
    const el = document.getElementById('trainContent');
    if (!el) return;

    el.innerHTML = `
      <!-- Tabs -->
      <div style="display:flex;border-bottom:2px solid var(--border);margin-bottom:16px;">
        <button onclick="EntrainementPage._setTab('programme')"
          style="flex:1;padding:10px 6px;border:none;background:none;font-family:var(--font);
                 font-size:14px;font-weight:600;cursor:pointer;
                 color:${this._tab === 'programme' ? 'var(--gold)' : 'var(--gray-muted)'};
                 border-bottom:2px solid ${this._tab === 'programme' ? 'var(--gold)' : 'transparent'};
                 margin-bottom:-2px;">💪 Programme</button>
        <button onclick="EntrainementPage._setTab('historique')"
          style="flex:1;padding:10px 6px;border:none;background:none;font-family:var(--font);
                 font-size:14px;font-weight:600;cursor:pointer;
                 color:${this._tab === 'historique' ? 'var(--gold)' : 'var(--gray-muted)'};
                 border-bottom:2px solid ${this._tab === 'historique' ? 'var(--gold)' : 'transparent'};
                 margin-bottom:-2px;">📅 Historique</button>
      </div>

      <!-- Contenu de l'onglet actif -->
      <div id="trainTabContent">
        ${this._tab === 'programme' ? this._renderProgramme() : this._renderHistorique()}
      </div>`;
  },

  async _setTab(tab) {
    this._tab = tab;
    if (tab === 'historique' && !this._logsLoaded) {
      // Affiche le spinner pendant le chargement
      this._renderContent();
      const profile = Router.userProfile;
      try {
        this._logs = await db.getSeancesLog(profile.id, 30);
        this._logsLoaded = true;
      } catch (e) {
        this._logs = [];
        this._logsLoaded = true;
      }
    }
    this._renderContent();
  },

  // ── Onglet Programme ─────────────────────────────────────────────────────────

  _renderProgramme() {
    if (!this.programme) {
      return `<div class="empty-state" style="margin-top:2rem;">
        <div class="empty-icon">💪</div>
        <div class="empty-text">Aucun programme actif.<br>Contacte ton coach pour qu'il t'en assigne un.</div>
      </div>`;
    }
    const p = this.programme;
    const dateDebut = p.date_debut
      ? new Date(p.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    return `
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
    const exos     = seance.exercices || [];
    const jourLabel = seance.jour > 0
      ? `<span style="font-size:11px;color:var(--gray-muted);margin-left:6px;">· ${this._jours[(seance.jour - 1) % 7]}</span>`
      : '';
    return `
      <div class="card" style="margin-bottom:0.75rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-weight:700;font-size:15px;">${seance.nom}${jourLabel}</div>
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
    const nom    = e.exercices_bdd?.nom || '—';
    const series = e.series || 3;
    const reps   = e.reps_cible || '10';
    const charge = e.charge_cible ? ` · ${e.charge_cible} kg` : '';
    const te     = e.type_effort || 'reps';
    const label  = te === 'amrap'    ? `AMRAP ${reps}`
                 : te === 'temps'    ? `${series}×${reps}`
                 : te === 'distance' ? `${series}×${reps}`
                 : `${series}×${reps}${charge}`;
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:6px 0;
           border-bottom:1px solid var(--border);">
        <div style="flex:1;font-size:13px;font-weight:500;color:var(--black);">${nom}</div>
        <div style="font-size:12px;color:var(--gray-muted);white-space:nowrap;">${label}</div>
      </div>`;
  },

  _startSeance(seanceId) {
    Router.navigate('seance-active', { seanceId, programmeId: this.programme?.id });
  },

  // ── Onglet Historique ────────────────────────────────────────────────────────

  _renderHistorique() {
    if (!this._logsLoaded) {
      return '<div class="spinner" style="margin-top:3rem;"></div>';
    }
    if (!this._logs.length) {
      return `<div class="empty-state" style="margin-top:2rem;">
        <div class="empty-icon">📭</div>
        <div class="empty-text">Aucune séance enregistrée.<br>Complète ta première séance pour voir ton historique ici !</div>
      </div>`;
    }
    return this._logs.map(log => this._logCard(log)).join('');
  },

  _logCard(log) {
    const sets      = (log.seances_log_sets || []).sort((a, b) => a.ordre - b.ordre);
    const totalSets = sets.reduce((acc, s) => acc + (s.sets_data?.length || 0), 0);
    const isExp     = this._expanded === log.id;
    const duree     = log.duree_secondes ? this._fmtDuree(log.duree_secondes) : null;
    const dateStr   = log.date_seance
      ? new Date(log.date_seance + 'T00:00:00').toLocaleDateString('fr-FR',
          { weekday: 'long', day: 'numeric', month: 'long' })
      : '—';

    return `
      <div class="card" style="margin-bottom:0.75rem;padding:14px;">
        <div onclick="EntrainementPage._toggleExpand('${log.id}')"
          style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;cursor:pointer;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:15px;color:var(--black);">${log.nom_seance}</div>
            <div style="font-size:12px;color:var(--gray-muted);margin-top:3px;text-transform:capitalize;">${dateStr}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:12px;color:var(--gray-muted);">
              ${duree ? `⏱ ${duree}` : ''}${duree && totalSets ? ' · ' : ''}${totalSets ? totalSets + ' séries' : ''}
            </div>
            <div style="font-size:11px;color:var(--gray-muted);margin-top:3px;">${isExp ? '▲ Réduire' : '▼ Détail'}</div>
          </div>
        </div>

        ${isExp && sets.length > 0 ? `
          <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;
                      display:flex;flex-direction:column;gap:10px;">
            ${sets.map(s => this._setDetail(s)).join('')}
          </div>` : ''}

        ${isExp && sets.length === 0 ? `
          <div style="margin-top:10px;font-size:13px;color:var(--gray-muted);">Aucun exercice enregistré.</div>
        ` : ''}
      </div>`;
  },

  _setDetail(s) {
    const nom    = s.exercices_bdd?.nom || '—';
    const sets   = s.sets_data || [];
    const effort = s.type_effort || 'reps';
    return `
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--black);margin-bottom:5px;">${nom}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${sets.map((set, i) => {
            const label = effort === 'reps'
              ? `${set.reps} reps${set.charge ? ' · ' + set.charge + ' kg' : ''}`
              : set.reps || '—';
            return `<span style="font-size:11px;padding:3px 9px;border-radius:8px;
              background:var(--card-bg);color:var(--gray);font-weight:500;">
              S${i + 1}: ${label}
            </span>`;
          }).join('')}
        </div>
      </div>`;
  },

  _toggleExpand(id) {
    this._expanded = this._expanded === id ? null : id;
    // Re-render only the tab content (no full page re-render)
    const el = document.getElementById('trainTabContent');
    if (el) el.innerHTML = this._renderHistorique();
  },

  _fmtDuree(secs) {
    const m = Math.floor(secs / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h${r}` : `${h}h`;
  },
};
