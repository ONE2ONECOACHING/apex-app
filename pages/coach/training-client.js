// APEX APP — Coach : Suivi entraînement d'un client

const CoachTrainingClientPage = {
  client:    null,
  _logs:     [],
  _expanded: null,

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="ctcTitle">Suivi entraînement</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#coach-clients'">←</button>
      </div>
      <div id="ctcContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile || profile.role !== 'coach') { window.location.hash = '#coach-clients'; return; }

    const params = Router.getParams();
    if (!params.clientId) { window.location.hash = '#coach-clients'; return; }

    this._expanded = null;

    try {
      this.client = await db.getProfile(params.clientId);
      document.getElementById('ctcTitle').textContent =
        'Entraînement — ' + (this.client.prenom || 'Client');

      this._logs = await db.getCoachClientSeancesLog(params.clientId, 50);
      this._renderContent();
    } catch (e) {
      document.getElementById('ctcContent').innerHTML =
        `<div class="alert alert-error">${e.message}</div>`;
    }
  },

  _renderContent() {
    const el = document.getElementById('ctcContent');
    if (!el) return;

    const c = this.client;
    el.innerHTML = `
      ${coachClientNav(c.id, 'coach-training-client')}

      ${this._renderStats()}
      ${this._renderLogs()}`;
  },

  _renderStats() {
    if (!this._logs.length) return '';
    const totalSessions = this._logs.length;
    const totalSets = this._logs.reduce((acc, log) =>
      acc + (log.seances_log_sets || []).reduce((a, s) => a + (s.sets_data?.length || 0), 0), 0);
    const lastDate = this._logs[0]?.date_seance
      ? new Date(this._logs[0].date_seance + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
      : '—';

    return `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
        ${[
          { val: totalSessions, lbl: 'Séances' },
          { val: totalSets,     lbl: 'Séries total' },
          { val: lastDate,      lbl: 'Dernière séance' },
        ].map(c => `
          <div class="card" style="padding:12px 8px;text-align:center;margin:0;">
            <div style="font-size:18px;font-weight:800;color:var(--gold);">${c.val}</div>
            <div style="font-size:10px;color:var(--gray-muted);margin-top:2px;">${c.lbl}</div>
          </div>`).join('')}
      </div>`;
  },

  _renderLogs() {
    if (!this._logs.length) {
      return `<div class="empty-state" style="margin-top:2rem;">
        <div class="empty-icon">📭</div>
        <div class="empty-text">${this.client.prenom || 'Ce client'} n'a pas encore enregistré de séance.</div>
      </div>`;
    }
    return `<div style="padding-bottom:2rem;">${this._logs.map(log => this._logCard(log)).join('')}</div>`;
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
        <div onclick="CoachTrainingClientPage._toggleExpand('${log.id}')"
          style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;cursor:pointer;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:15px;color:var(--black);">${log.nom_seance}</div>
            <div style="font-size:12px;color:var(--gray-muted);margin-top:3px;text-transform:capitalize;">${dateStr}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:12px;color:var(--gray-muted);">
              ${duree ? `⏱ ${duree}` : ''}${duree && totalSets ? ' · ' : ''}${totalSets ? totalSets + ' séries' : ''}
            </div>
            <div style="font-size:11px;color:var(--gray-muted);margin-top:3px;">${isExp ? '▲' : '▼'}</div>
          </div>
        </div>

        ${isExp && sets.length > 0 ? `
          <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;
                      display:flex;flex-direction:column;gap:12px;">
            ${sets.map(s => this._setDetail(s)).join('')}
          </div>` : ''}

        ${isExp && sets.length === 0 ? `
          <div style="margin-top:10px;font-size:13px;color:var(--gray-muted);">Aucun exercice enregistré.</div>
        ` : ''}
      </div>`;
  },

  _setDetail(s) {
    const nom    = s.exercices_bdd?.nom || '—';
    const muscle = s.exercices_bdd?.muscle_principal || '';
    const sets   = s.sets_data || [];
    const effort = s.type_effort || 'reps';
    return `
      <div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
          <span style="font-size:13px;font-weight:600;color:var(--black);">${nom}</span>
          ${muscle ? `<span style="font-size:10px;padding:1px 7px;border-radius:10px;
            background:var(--gold-bg,#fffbeb);color:var(--gold);font-weight:600;">${muscle}</span>` : ''}
        </div>
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
    this._renderContent();
  },

  _fmtDuree(secs) {
    const m = Math.floor(secs / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h${r}` : `${h}h`;
  },
};
