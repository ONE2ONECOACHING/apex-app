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
          <div class="app-logo">ONE2ONE</div>
          <div class="app-title">Entraînement</div>
        </div>
      </div>
      <div id="trainContent"><div class="spinner" style="margin-top:3rem;"></div></div>
      ${clientNav('entrainement')}`;
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
      ${p.consignes ? `
        <div class="card card-tap" onclick="EntrainementPage._openConsignes()"
             style="cursor:pointer;margin-bottom:1rem;border-left:3px solid var(--gold);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:26px;line-height:1;">📋</div>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:14px;margin-bottom:2px;">Consignes du programme</div>
              <div style="font-size:12px;color:var(--gray-light);">Méthode d'entraînement · Appuie pour lire</div>
            </div>
            <div style="color:var(--gray-muted);font-size:18px;">›</div>
          </div>
        </div>` : ''}
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

    // ── Séance CARDIO : afficher le texte de la semaine courante ──────────────
    if (seance.cardio) {
      const weeks   = Array.isArray(seance.cardio_weeks) ? seance.cardio_weeks : [];
      const semaine = Math.max(1, clientCurrentWeek(Router.userProfile));
      const idx     = Math.min(semaine - 1, weeks.length - 1);
      const texte   = (idx >= 0 ? weeks[idx] : '') || '';
      return `
        <div class="card" style="margin-bottom:0.75rem;border-left:3px solid #EF4444;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div style="font-weight:700;font-size:15px;">🏃 ${seance.nom}${jourLabel}</div>
            <span style="font-size:11px;font-weight:700;color:#EF4444;background:#fef2f2;
                  border:1px solid #fecaca;border-radius:8px;padding:2px 8px;">Semaine ${semaine}</span>
          </div>
          ${seance.notes_coach ? `
            <div style="font-size:12px;color:var(--gold);background:var(--gold-bg,#fffbeb);
                 border-left:3px solid var(--gold);padding:6px 10px;border-radius:4px;margin-bottom:10px;">
              📌 ${seance.notes_coach}
            </div>` : ''}
          ${texte.trim()
            ? `<div style="font-size:14px;color:var(--black);line-height:1.7;white-space:pre-wrap;
                          background:var(--card-bg);border-radius:10px;padding:12px 14px;">${texte.replace(/</g,'&lt;')}</div>`
            : `<div style="font-size:13px;color:var(--gray-muted);">Pas de séance définie pour cette semaine.</div>`}
        </div>`;
    }

    return `
      <div class="card" style="margin-bottom:0.75rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-weight:700;font-size:15px;">${seance.nom}${jourLabel}</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="btn btn-ghost btn-small" style="font-size:12px;"
              onclick="EntrainementPage._openApercu('${seance.id}')">
              👁 Aperçu
            </button>
            <button class="btn btn-primary btn-small" style="font-size:12px;"
              onclick="EntrainementPage._startSeance('${seance.id}')">
              ▶ Démarrer
            </button>
          </div>
        </div>
        ${seance.notes_coach ? `
          <div style="font-size:12px;color:var(--gold);background:var(--gold-bg,#fffbeb);
               border-left:3px solid var(--gold);padding:6px 10px;border-radius:4px;margin-bottom:10px;">
            📌 ${seance.notes_coach}
          </div>` : ''}
        <div style="display:flex;flex-direction:column;gap:0;">
          ${exos.map((e, i) => this._exoRow(e, exos, i)).join('')}
        </div>
        ${exos.length === 0
          ? '<div style="font-size:13px;color:var(--gray-muted);">Aucun exercice.</div>'
          : ''}
      </div>`;
  },

  _ssColor(group) {
    const colors = ['#F59E0B','#3B82F6','#10B981','#EC4899','#8B5CF6','#F97316'];
    return group ? colors[(group.charCodeAt(0) - 65) % colors.length] : null;
  },

  _exoRow(e, exos, i) {
    const nom    = e.exercices_bdd?.nom || '—';
    const series = e.series || 3;
    const reps   = e.reps_cible || '10';
    const charge = e.charge_cible ? ` · ${e.charge_cible} kg` : '';
    const te     = e.type_effort || 'reps';
    const label  = te === 'amrap'    ? `AMRAP ${reps}`
                 : te === 'temps'    ? `${series}×${reps}`
                 : te === 'distance' ? `${series}×${reps}`
                 : `${series}×${reps}${charge}`;

    const ssGroup  = e.superset_groupe;
    const ssColor  = this._ssColor(ssGroup);
    const nextInSS = ssGroup && exos && i < exos.length - 1 && exos[i + 1]?.superset_groupe === ssGroup;
    const ssBadge  = ssGroup
      ? `<span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:6px;
           background:${ssColor}22;color:${ssColor};margin-left:5px;vertical-align:middle;">SS</span>`
      : '';
    const rowStyle = ssGroup
      ? `border-left:3px solid ${ssColor};padding-left:8px;`
      : '';

    const notes = e.notes?.trim();
    return `
      <div style="padding:7px 0;border-bottom:${nextInSS ? 'none' : '1px solid var(--border)'};${rowStyle}">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="flex:1;font-size:13px;font-weight:500;color:var(--black);">${nom}${ssBadge}</div>
          <div style="font-size:12px;color:var(--gray-muted);white-space:nowrap;">${label}</div>
        </div>
        ${notes ? `
          <div style="font-size:12px;color:var(--gold);margin-top:3px;font-style:italic;">
            💬 ${notes}
          </div>` : ''}
      </div>
      ${nextInSS ? `
        <div style="text-align:center;font-size:10px;font-weight:700;color:${ssColor};
             padding:2px 0;letter-spacing:.05em;">
          🔗 superset
        </div>` : ''}`;
  },

  _openConsignes() {
    const text = this.programme?.consignes || '';
    if (!text) return;
    const modal = document.createElement('div');
    modal.id = 'consignesModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;';
    modal.innerHTML = `
      <div style="background:var(--white);border-radius:20px 20px 0 0;width:100%;
                  max-height:80vh;display:flex;flex-direction:column;
                  padding-bottom:env(safe-area-inset-bottom);">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;
                    border-bottom:1px solid var(--border);flex-shrink:0;">
          <div style="font-size:22px;">📋</div>
          <div style="flex:1;font-size:16px;font-weight:700;">Consignes du programme</div>
          <button onclick="EntrainementPage._closeConsignes()"
            style="background:none;border:none;font-size:22px;color:var(--gray-muted);
                   cursor:pointer;padding:4px;">×</button>
        </div>
        <!-- Corps scrollable -->
        <div style="flex:1;overflow-y:auto;padding:20px;
                    font-size:14px;color:var(--black);line-height:1.7;white-space:pre-wrap;">
${text.replace(/</g,'&lt;')}</div>
        <!-- Footer -->
        <div style="padding:16px 20px;flex-shrink:0;">
          <button onclick="EntrainementPage._closeConsignes()"
            style="width:100%;height:48px;background:var(--gold);color:#fff;border:none;
                   border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;
                   font-family:var(--font);">
            Compris 👍
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) this._closeConsignes(); });
  },

  _closeConsignes() {
    document.getElementById('consignesModal')?.remove();
  },

  _startSeance(seanceId) {
    this._closeApercu();
    Router.navigate('seance-active', { seanceId, programmeId: this.programme?.id });
  },

  _openApercu(seanceId) {
    const seance = (this.programme?.seances || []).find(s => s.id === seanceId);
    if (!seance) return;
    const exos = seance.exercices || [];

    const modal = document.createElement('div');
    modal.id = 'apercuModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;flex-direction:column;overflow:hidden;';

    modal.innerHTML = `
      <!-- Header fixe -->
      <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;
                  background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0;">
        <button onclick="EntrainementPage._closeApercu()"
          style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--gray);padding:4px 8px;">←</button>
        <div style="flex:1;">
          <div style="font-size:11px;color:var(--gray-muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Aperçu</div>
          <div style="font-size:16px;font-weight:700;color:var(--black);">${seance.nom}</div>
        </div>
        <div style="font-size:12px;color:var(--gray-muted);">${exos.length} exercice${exos.length > 1 ? 's' : ''}</div>
      </div>

      <!-- Corps scrollable -->
      <div style="flex:1;overflow-y:auto;padding:16px 16px 8px;">
        ${exos.length === 0
          ? '<div style="text-align:center;color:var(--gray-muted);padding:40px 0;">Aucun exercice dans cette séance.</div>'
          : exos.map((e, i) => this._apercuExoCard(e, i, exos)).join('')
        }
      </div>

      <!-- Footer fixe -->
      <div style="padding:16px;background:var(--white);border-top:1px solid var(--border);flex-shrink:0;
                  padding-bottom:calc(16px + env(safe-area-inset-bottom));">
        <button onclick="EntrainementPage._startSeance('${seanceId}')"
          style="width:100%;height:54px;background:var(--gold);color:#fff;border:none;
                 border-radius:16px;font-size:17px;font-weight:700;cursor:pointer;font-family:var(--font);">
          ▶ Démarrer la séance
        </button>
      </div>`;

    document.body.appendChild(modal);
  },

  _closeApercu() {
    document.getElementById('apercuModal')?.remove();
  },

  _apercuExoCard(e, i, exos) {
    const nom    = e.exercices_bdd?.nom || '—';
    const muscle = e.exercices_bdd?.muscle_principal || '';
    const ytUrl  = e.exercices_bdd?.youtube_url || null;
    const ytId   = ytUrl ? (ytUrl.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1] : null;
    const te     = e.type_effort || 'reps';
    const series = e.series || 3;
    const reps   = e.reps_cible || '10';
    const label  = te === 'amrap'    ? `AMRAP ${reps}`
                 : te === 'temps'    ? `${series} × ${reps}`
                 : te === 'distance' ? `${series} × ${reps}`
                 : `${series} × ${reps} reps`;

    const ssGroup  = e.superset_groupe;
    const ssColor  = this._ssColor(ssGroup);
    const nextInSS = ssGroup && exos && i < exos.length - 1 && exos[i + 1]?.superset_groupe === ssGroup;
    const borderLeft = ssGroup ? `border-left:3px solid ${ssColor};` : '';
    const ssBadge  = ssGroup
      ? `<span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:10px;
           background:${ssColor}22;color:${ssColor};">🔗 Superset</span>`
      : '';

    return `
      <div style="background:var(--white);border-radius:14px;padding:14px;
                  margin-bottom:${nextInSS ? '2px' : '12px'};
                  border:1px solid var(--border);${borderLeft}">
        <div style="display:flex;align-items:flex-start;gap:10px;${ytId ? 'margin-bottom:10px;' : ''}">
          <div style="font-size:13px;font-weight:800;color:var(--gray-muted);
                      min-width:24px;margin-top:2px;">${i + 1}.</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:15px;font-weight:700;color:var(--black);margin-bottom:5px;">${nom}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${muscle ? `<span style="font-size:11px;padding:2px 9px;border-radius:10px;
                background:var(--gold-bg,#fffbeb);color:var(--gold);font-weight:600;">${muscle}</span>` : ''}
              <span style="font-size:11px;padding:2px 9px;border-radius:10px;
                background:var(--card-bg);color:var(--gray);font-weight:600;">${label}</span>
              ${ssBadge}
            </div>
            ${e.notes ? `<div style="font-size:12px;color:var(--gray);margin-top:6px;font-style:italic;">
              💬 ${e.notes}</div>` : ''}
          </div>
        </div>
        ${ytId ? `
        <div style="position:relative;width:100%;padding-bottom:56.25%;border-radius:10px;
                    overflow:hidden;background:#000;">
          <iframe src="https://www.youtube.com/embed/${ytId}?rel=0"
            frameborder="0" loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;">
          </iframe>
        </div>` : ''}
      </div>
      ${nextInSS ? `
        <div style="text-align:center;font-size:11px;font-weight:700;color:${ssColor};
             margin-bottom:2px;letter-spacing:.05em;">🔗 superset</div>` : ''}`;
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
    const isReps = effort === 'reps';
    return `
      <div style="background:var(--card-bg);border-radius:10px;padding:10px 12px;">
        <div style="font-size:13px;font-weight:700;color:var(--black);margin-bottom:8px;">${nom}</div>
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
        <div style="margin-top:8px;font-size:12px;padding:5px 8px;border-radius:8px;
            background:var(--gold-light);color:var(--black);border:1px solid var(--gold-border);line-height:1.5;">
          💬 ${s.note_client}
        </div>` : ''}
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
