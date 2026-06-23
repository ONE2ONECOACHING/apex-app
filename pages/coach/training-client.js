// APEX APP — Coach : Suivi entraînement d'un client

const CoachTrainingClientPage = {
  client:    null,
  _logs:     [],
  _cardio:   [],
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

    // Reset état pour éviter les fuites entre clients
    this.client    = null;
    this._logs     = [];
    this._cardio   = [];
    this._expanded = null;

    try {
      this.client = await db.getProfile(params.clientId);
      document.getElementById('ctcTitle').textContent =
        'Entraînement — ' + (this.client.prenom || 'Client');

      [this._logs, this._cardio] = await Promise.all([
        db.getCoachClientSeancesLog(params.clientId, 50),
        db.getCardioValidationsForCoach(params.clientId).catch(() => []),
      ]);
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
      ${this._renderCardio()}
      ${this._renderLogs()}`;
  },

  _renderCardio() {
    if (!this._cardio.length) return '';
    const emojis = { dur: '😓', bien: '😊', feu: '🤩' };
    return `
      <div class="card" style="margin-bottom:1rem;border-left:3px solid #EF4444;">
        <div class="card-title">🏃 Séances cardio validées</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${this._cardio.map(v => {
            const date = v.completed_at
              ? new Date(v.completed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
              : '';
            return `<div style="background:var(--card-bg);border-radius:10px;padding:9px 12px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:11px;font-weight:700;color:#EF4444;background:#fef2f2;
                      border:1px solid #fecaca;border-radius:6px;padding:1px 7px;">Sem. ${v.semaine}</span>
                <span style="font-size:18px;">${emojis[v.note_ressenti] || ''}</span>
                <span style="font-size:11px;color:var(--gray-muted);margin-left:auto;">${date}</span>
              </div>
              ${v.note_client ? `<div style="font-size:13px;color:var(--black);margin-top:5px;line-height:1.5;">💬 ${v.note_client}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
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
    const isReps = effort === 'reps';
    return `
      <div style="background:var(--card-bg);border-radius:10px;padding:10px 12px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <span style="font-size:13px;font-weight:700;color:var(--black);">${nom}</span>
          ${muscle ? `<span style="font-size:10px;padding:1px 7px;border-radius:10px;
            background:var(--gold-light);color:var(--gold);font-weight:600;">${muscle}</span>` : ''}
        </div>
        ${isReps && sets.length > 0 ? `
        <div style="display:grid;grid-template-columns:28px 1fr 1fr;gap:3px 8px;font-size:12px;">
          <div style="color:var(--gray-muted);font-weight:600;padding-bottom:4px;border-bottom:1px solid var(--border);">#</div>
          <div style="color:var(--gray-muted);font-weight:600;padding-bottom:4px;border-bottom:1px solid var(--border);">Reps</div>
          <div style="color:var(--gray-muted);font-weight:600;padding-bottom:4px;border-bottom:1px solid var(--border);">Charge</div>
          ${sets.map((set, i) => `
            <div style="color:var(--gray-muted);padding:3px 0;">S${i + 1}</div>
            <div style="color:var(--black);font-weight:600;padding:3px 0;">${set.reps || '—'}</div>
            <div style="color:${set.charge ? 'var(--gold)' : 'var(--gray-muted)'};font-weight:${set.charge ? '700' : '400'};padding:3px 0;">
              ${set.charge ? set.charge + ' kg' : '—'}
            </div>
          `).join('')}
        </div>` : `
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${sets.map((set, i) => `
            <span style="font-size:12px;padding:4px 10px;border-radius:8px;
              background:var(--white);color:var(--black);font-weight:500;border:1px solid var(--border);">
              S${i + 1} : ${set.reps || '—'}${set.charge ? ' · ' + set.charge + ' kg' : ''}
            </span>`).join('')}
        </div>`}
        ${s.note_client ? `
        <div style="margin-top:8px;font-size:12px;padding:6px 10px;border-radius:8px;
            background:var(--gold-light);border:1px solid var(--gold-border);
            color:var(--black);line-height:1.5;">
          💬 <span style="color:var(--gold);font-weight:600;">Note client :</span> ${s.note_client}
        </div>` : ''}
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
