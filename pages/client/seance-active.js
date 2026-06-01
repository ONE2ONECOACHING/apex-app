// APEX APP — Client : Séance active (entraînement en cours)

const SeanceActivePage = {
  _seance:          null,
  _progId:          null,
  _exoIdx:          0,
  _serieIdx:        0,
  _phase:           'exercice',   // 'exercice' | 'repos' | 'done'
  _logs:            [],           // [{exercice_id, client_prog_exercice_id, type_effort, sets_data:[]}]
  _restTimer:       null,
  _restTotal:       0,
  _restRemaining:   0,
  _sessionTimer:    null,
  _sessionSeconds:  0,
  _lastSets:        {}, // { exercice_id: sets_data[] } — dernière séance connue
  _noteRessenti:    null, // 'dur' | 'bien' | 'feu' — note obligatoire avant save
  _effortIdx:       0,   // 0 = effort principal, 1 = 2e effort (Rest-Pause / Drop Set…)
  _pendingE1:       null, // {reps, charge} de l'effort 1 en attente de combinaison
  _intraRest:       false, // true pendant le repos intra-série (entre effort 1 et 2)
  _amrapPhase:      'idle', // 'idle' | 'countdown' | 'work' | 'done'
  _amrapRemaining:  0,
  _amrapTotal:      0,
  _amrapTimer:      null,
  _audioCtx:        null,

  render() {
    return `<div id="saWrap" style="min-height:100vh;background:var(--bg);
      display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom);">
      <div style="display:flex;align-items:center;justify-content:center;flex:1;">
        <div class="spinner"></div>
      </div>
    </div>`;
  },

  async init() {
    clearInterval(this._sessionTimer);
    clearInterval(this._restTimer);
    this._removeBanner();

    const profile = Router.userProfile;
    if (!profile || profile.role === 'coach') { window.location.hash = '#entrainement'; return; }

    const params = Router.getParams();
    if (!params.seanceId) { window.location.hash = '#entrainement'; return; }

    try {
      this._seance         = await db.getClientSeance(params.seanceId);
      this._progId         = params.programmeId || null;
      this._exoIdx         = 0;
      this._serieIdx       = 0;
      this._phase          = 'exercice';
      this._sessionSeconds = 0;
      this._noteRessenti   = null;
      this._effortIdx      = 0;
      this._pendingE1      = null;
      this._intraRest      = false;
      this._amrapPhase     = 'idle';
      this._amrapRemaining = 0;
      this._amrapTotal     = 0;
      clearInterval(this._amrapTimer);
      this._amrapTimer     = null;
      if (this._audioCtx) { this._audioCtx.close().catch(() => {}); this._audioCtx = null; }
      this._logs = (this._seance.exercices || []).map(ex => ({
        exercice_id:             ex.exercice_id,
        client_prog_exercice_id: ex.id,
        type_effort:             ex.type_effort || 'reps',
        sets_data:               [],
        note_client:             null,
      }));

      // Charger les dernières valeurs par exercice (silencieux si erreur)
      const exoIds = (this._seance.exercices || []).map(e => e.exercice_id).filter(Boolean);
      this._lastSets = await db.getLastSetsPerExo(profile.id, exoIds).catch(() => ({}));

      this._startSessionTimer();
      this._draw();
    } catch (e) {
      document.getElementById('saWrap').innerHTML =
        `<div class="alert alert-error" style="margin:2rem;">${e.message}</div>`;
    }
  },

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _startSessionTimer() {
    this._sessionTimer = setInterval(() => {
      this._sessionSeconds++;
      const el = document.getElementById('saTimer');
      if (el) el.textContent = this._fmt(this._sessionSeconds);
    }, 1000);
  },

  _fmt(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  },

  _exo()    { return this._seance?.exercices?.[this._exoIdx] || null; },

  _nbSeries(ex) {
    if (!ex) return 1;
    if ((ex.type_effort || 'reps') === 'reps' && ex.series_data?.length) return ex.series_data.length;
    return ex.series || 1;
  },

  _target(ex, k) {
    if ((ex.type_effort || 'reps') === 'reps' && ex.series_data?.[k]) {
      return { reps: ex.series_data[k].reps || '10', charge: ex.series_data[k].charge || '' };
    }
    return { reps: ex.reps_cible || '10', charge: ex.charge_cible || '' };
  },

  // ── Rendu principal ──────────────────────────────────────────────────────────

  _draw() {
    const wrap = document.getElementById('saWrap');
    if (!wrap) return;
    if (this._phase === 'done') { this._drawDone(wrap); return; }
    // Both 'exercice' and 'repos' phases show the exercise view.
    // The rest timer is an independent floating banner.
    this._drawExo(wrap);
  },

  _header() {
    const ex   = this._exo();
    const nbEx  = this._seance?.exercices?.length || 1;
    const nbSer = this._nbSeries(ex);
    const done  = this._exoIdx * nbSer + this._serieIdx;
    const total = nbEx * nbSer;
    const pct   = total > 0 ? (done / total * 100).toFixed(1) : 0;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;
                  background:var(--card-bg);border-bottom:1px solid var(--border);">
        <button onclick="SeanceActivePage._quit()"
          style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--gray);padding:4px 8px;">←</button>
        <div style="font-size:12px;font-weight:600;color:var(--gray-muted);text-align:center;">${this._seance?.nom || ''}</div>
        <div id="saTimer" style="font-size:14px;font-weight:700;color:var(--gold);min-width:44px;text-align:right;">
          ${this._fmt(this._sessionSeconds)}
        </div>
      </div>
      <div style="height:3px;background:var(--border-solid);">
        <div style="height:100%;background:var(--gold);width:${pct}%;transition:width .4s;"></div>
      </div>`;
  },

  // Returns HTML for the all-series grid (reps mode only)
  _renderSeriesGrid(ex, nbSer, prevSets) {
    const lastExoSets = this._lastSets[ex.exercice_id] || [];

    // Ligne "Dernière séance" si données disponibles
    const lastHint = lastExoSets.length > 0 ? (() => {
      const parts = lastExoSets.map((s, i) => {
        const ch = s.charge ? ` · ${s.charge}kg` : '';
        return `S${i + 1}: ${s.reps}${ch}`;
      }).join(' &nbsp;');
      return `<div style="font-size:11px;color:var(--gray-muted);background:var(--card-bg);
                border-radius:8px;padding:6px 10px;margin-bottom:4px;">
        📅 Dernière séance : ${parts}
      </div>`;
    })() : '';

    const rows = Array.from({ length: nbSer }, (_, k) => {
      const tgt       = this._target(ex, k);
      const logged    = prevSets[k];
      const isDone    = k < this._serieIdx;
      const isCurrent = k === this._serieIdx;

      // Charge pré-remplie : dernière séance série k, sinon série 0, sinon cible coach
      const lastCharge = lastExoSets[k]?.charge ?? lastExoSets[0]?.charge ?? tgt.charge ?? '';

      if (isDone) {
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
                            background:var(--card-bg);border-radius:10px;">
          <div style="font-size:13px;color:#10b981;font-weight:700;width:22px;text-align:center;">✓</div>
          <div style="font-size:12px;font-weight:700;color:var(--gray);min-width:24px;">S${k + 1}</div>
          <div style="font-size:14px;color:var(--gray);">
            ${logged?.reps || tgt.reps} reps${logged?.charge ? ' · ' + logged.charge + ' kg' : ''}
          </div>
        </div>`;
      }

      if (isCurrent) {
        const isE2       = !!ex.reps_secondaire && this._effortIdx === 1;
        const repsVal    = isE2 ? (ex.reps_secondaire || 'max') : tgt.reps;
        const chargeVal  = isE2 ? (this._pendingE1?.charge ?? lastCharge) : lastCharge;
        const serieLabel = ex.reps_secondaire
          ? `Série ${k + 1} · Effort ${this._effortIdx + 1} / 2`
          : `Série ${k + 1}`;
        return `<div style="padding:10px 12px;background:var(--gold-bg,#fffbeb);border-radius:10px;
                            border:2px solid var(--gold);">
          <div style="font-size:11px;font-weight:800;color:var(--gold);margin-bottom:8px;">${serieLabel}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <div style="font-size:9px;color:var(--gray-muted);text-transform:uppercase;
                          letter-spacing:.5px;margin-bottom:4px;">${isE2 ? 'Reps (2e effort)' : 'Reps'}</div>
              <input id="saReps" type="number" inputmode="numeric" min="0" value="${repsVal}"
                style="width:100%;height:54px;text-align:center;font-size:26px;font-weight:800;
                       border:2px solid var(--border-solid);border-radius:10px;
                       background:var(--white);color:var(--black);font-family:var(--font);box-sizing:border-box;">
            </div>
            <div>
              <div style="font-size:9px;color:var(--gray-muted);text-transform:uppercase;
                          letter-spacing:.5px;margin-bottom:4px;">Charge (kg)</div>
              <input id="saCharge" type="number" inputmode="decimal" min="0" step="0.5"
                value="${chargeVal}" placeholder="0"
                style="width:100%;height:54px;text-align:center;font-size:26px;font-weight:800;
                       border:2px solid var(--border-solid);border-radius:10px;
                       background:var(--white);color:var(--black);font-family:var(--font);box-sizing:border-box;">
            </div>
          </div>
        </div>`;
      }

      // Upcoming — affiche la charge dernière séance en grisé
      const upcomingCharge = lastExoSets[k]?.charge ?? lastExoSets[0]?.charge ?? tgt.charge ?? '';
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
                          background:var(--card-bg);border-radius:10px;opacity:0.38;">
        <div style="font-size:12px;font-weight:700;color:var(--gray-muted);min-width:24px;">S${k + 1}</div>
        <div style="font-size:14px;color:var(--gray-muted);">
          ${tgt.reps} reps${upcomingCharge ? ' · ' + upcomingCharge + ' kg' : ''}
        </div>
      </div>`;
    }).join('');

    return lastHint + rows;
  },

  _drawExo(wrap) {
    const ex = this._exo();
    if (!ex) { this._phase = 'done'; this._drawDone(wrap); return; }

    const nom      = ex.exercices_bdd?.nom || '?';
    const muscle   = ex.exercices_bdd?.muscle_principal || '';
    const ytUrl    = ex.exercices_bdd?.youtube_url || null;
    const ytId     = ytUrl ? (ytUrl.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1] : null;
    const effort   = ex.type_effort || 'reps';
    const nbSer    = this._nbSeries(ex);
    const nbEx     = this._seance.exercices.length;
    const target   = this._target(ex, this._serieIdx);
    const prevSets = this._logs[this._exoIdx]?.sets_data || [];
    const isLast   = this._serieIdx + 1 >= nbSer && this._exoIdx + 1 >= nbEx;

    // Button state
    const inRest      = this._phase === 'repos';
    const amrapIdle   = effort === 'amrap' && this._amrapPhase === 'idle';
    const amrapActive = effort === 'amrap' && (this._amrapPhase === 'countdown' || this._amrapPhase === 'work');
    const btnText     = inRest      ? '⏳ Récupération…'
                      : amrapActive ? '⏱ AMRAP en cours…'
                      : this._effortIdx === 1 ? '✓ Effort 2 validé'
                      : isLast ? '🏁 Terminer la séance' : '✓ Série validée';

    // Effort label for Objectif card
    const hasE2 = effort === 'reps' && !!ex.reps_secondaire;
    const effortLabel = effort === 'amrap' ? `AMRAP ${target.reps}`
                      : effort === 'temps' ? `⏱ ${target.reps}`
                      : effort === 'distance' ? `📏 ${target.reps}`
                      : hasE2 && this._effortIdx === 1
                        ? `Effort 2 / 2 — ${ex.reps_secondaire} reps`
                      : hasE2
                        ? `Effort 1 / 2 — ${target.reps} reps${target.charge ? ' · ' + target.charge + ' kg' : ''}`
                      : `${target.reps} reps${target.charge ? ' · ' + target.charge + ' kg' : ''}`;


    wrap.innerHTML = `
      ${this._header()}

      <div style="display:flex;align-items:center;gap:10px;padding:12px 16px 0;">
        <button onclick="SeanceActivePage._prevExo()"
          ${this._exoIdx === 0 ? 'disabled' : ''}
          style="width:34px;height:34px;border-radius:50%;border:1px solid var(--border-solid);
                 background:var(--card-bg);font-size:18px;cursor:pointer;flex-shrink:0;
                 color:${this._exoIdx === 0 ? 'var(--gray-muted)' : 'var(--black)'};
                 display:flex;align-items:center;justify-content:center;">‹</button>
        <div style="flex:1;text-align:center;font-size:12px;color:var(--gray-muted);">
          Exercice <b style="color:var(--black);">${this._exoIdx + 1} / ${nbEx}</b>
          &nbsp;·&nbsp;
          Série <b style="color:var(--black);">${this._serieIdx + 1} / ${nbSer}</b>
        </div>
        <button onclick="SeanceActivePage._nextExo()"
          ${this._exoIdx >= nbEx - 1 ? 'disabled' : ''}
          style="width:34px;height:34px;border-radius:50%;border:1px solid var(--border-solid);
                 background:var(--card-bg);font-size:18px;cursor:pointer;flex-shrink:0;
                 color:${this._exoIdx >= nbEx - 1 ? 'var(--gray-muted)' : 'var(--black)'};
                 display:flex;align-items:center;justify-content:center;">›</button>
      </div>

      <div style="padding:10px 16px 0;">

        <div style="font-size:22px;font-weight:800;color:var(--black);line-height:1.2;margin-bottom:6px;">${nom}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${muscle ? `<span style="font-size:11px;padding:2px 10px;border-radius:12px;
            background:var(--gold-bg,#fffbeb);color:var(--gold);font-weight:600;">${muscle}</span>` : ''}
          ${ex.superset_groupe ? (() => {
            const ssColors = ['#F59E0B','#3B82F6','#10B981','#EC4899','#8B5CF6','#F97316'];
            const c = ssColors[(ex.superset_groupe.charCodeAt(0) - 65) % ssColors.length];
            return `<span style="font-size:11px;padding:2px 10px;border-radius:12px;
              background:${c}22;color:${c};font-weight:700;">🔗 Superset</span>`;
          })() : ''}
        </div>
        ${ex.notes?.trim() ? `
          <div style="margin-top:8px;padding:8px 12px;background:var(--gold-bg,#fffbeb);
               border-left:3px solid var(--gold);border-radius:6px;
               font-size:13px;color:var(--gold);font-style:italic;line-height:1.4;">
            💬 ${ex.notes.trim()}
          </div>` : ''}

        ${ytId ? `
        <div style="position:relative;width:100%;padding-bottom:56.25%;border-radius:10px;
                    overflow:hidden;background:#000;margin-top:10px;">
          <iframe src="https://www.youtube.com/embed/${ytId}?rel=0"
            frameborder="0" loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;">
          </iframe>
        </div>` : ''}

        <!-- Objectif + récup -->
        <div style="margin-top:14px;padding:10px 14px;background:var(--card-bg);border-radius:12px;
                    border-left:3px solid var(--gold);display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div>
            <div style="font-size:9px;color:var(--gray-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Objectif</div>
            <div style="font-size:15px;font-weight:700;color:var(--black);">${effortLabel}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:9px;color:var(--gray-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Récup</div>
            <div style="font-size:14px;font-weight:700;color:var(--gray);">💤 ${ex.repos_secondes || 90} s</div>
          </div>
        </div>

        <!-- Saisie reps : grille toutes séries -->
        ${effort === 'reps' ? `
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:14px;">
            ${this._renderSeriesGrid(ex, nbSer, prevSets)}
          </div>
        ` : effort === 'amrap' ? `
        <!-- AMRAP : timer interactif -->
          ${this._renderAmrapSection(ex)}
        ` : `
        <!-- Saisie non-reps : charge + résultat + notes -->
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">
            ${(this._lastSets[ex.exercice_id]||[]).length > 0 ? `
            <div style="font-size:11px;color:var(--gray-muted);background:var(--card-bg);
                border-radius:8px;padding:6px 10px;">
              📅 Dernière séance : ${(this._lastSets[ex.exercice_id]||[]).map((s,i)=>`S${i+1}: ${s.reps}${s.charge?' · '+s.charge+'kg':''}`).join(' &nbsp;')}
            </div>` : ''}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div>
                <div style="font-size:9px;color:var(--gray-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Charge (kg)</div>
                <input id="saCharge" type="number" inputmode="decimal" min="0" step="0.5"
                  value="${this._lastSets[ex.exercice_id]?.[0]?.charge ?? target.charge ?? ''}" placeholder="0"
                  style="width:100%;height:58px;text-align:center;font-size:26px;font-weight:800;
                         border:2px solid var(--border-solid);border-radius:12px;
                         background:var(--white);color:var(--black);font-family:var(--font);box-sizing:border-box;">
              </div>
              <div>
                <div style="font-size:9px;color:var(--gray-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Reps / score</div>
                <input id="saReps" type="number" inputmode="numeric" min="0" placeholder="—"
                  style="width:100%;height:58px;text-align:center;font-size:26px;font-weight:800;
                         border:2px solid var(--border-solid);border-radius:12px;
                         background:var(--white);color:var(--black);font-family:var(--font);box-sizing:border-box;">
              </div>
            </div>
            <div>
              <div style="font-size:9px;color:var(--gray-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Notes pour ton coach (optionnel)</div>
              <input id="saNote" type="text" placeholder="ex : sensations, technique…"
                style="width:100%;height:48px;padding:0 14px;border:2px solid var(--border-solid);
                       border-radius:12px;background:var(--white);color:var(--black);
                       font-family:var(--font);font-size:15px;box-sizing:border-box;">
            </div>
          </div>
        `}

      </div>

      <!-- Note client par exercice -->
      <div style="padding:0 16px 10px;">
        <input id="saClientNote" type="text"
          value="${this._logs[this._exoIdx]?.note_client || ''}"
          placeholder="💬 Note pour ton coach (optionnel)"
          oninput="SeanceActivePage._syncNote()"
          style="width:100%;height:44px;padding:0 14px;
                 border:1.5px solid var(--border-solid);border-radius:12px;
                 background:var(--card-bg);color:var(--black);
                 font-family:var(--font);font-size:14px;box-sizing:border-box;">
      </div>

      <!-- Boutons -->
      <div style="padding:16px;margin-top:auto;">
        ${amrapIdle ? `
        <button onclick="SeanceActivePage._startAmrap()"
          style="width:100%;height:58px;background:var(--gold);color:#fff;
                 border:none;border-radius:16px;font-size:20px;font-weight:700;
                 cursor:pointer;font-family:var(--font);">
          ▶ Démarrer
        </button>
        ` : `
        <button id="saValidateBtn" onclick="SeanceActivePage._validate()"
          ${(inRest || amrapActive) ? 'disabled' : ''}
          style="width:100%;height:58px;
                 background:${(inRest || amrapActive) ? 'var(--border-solid)' : 'var(--gold)'};
                 color:${(inRest || amrapActive) ? 'var(--gray-muted)' : '#fff'};
                 border:none;border-radius:16px;font-size:18px;font-weight:700;
                 cursor:${(inRest || amrapActive) ? 'default' : 'pointer'};font-family:var(--font);">
          ${btnText}
        </button>
        `}
        <button onclick="SeanceActivePage._finishEarly()"
          style="width:100%;height:34px;background:none;border:none;
                 color:var(--gray-muted);font-size:12px;cursor:pointer;
                 margin-top:2px;font-family:var(--font);text-decoration:underline;">
          🏁 Terminer la séance
        </button>
      </div>`;
  },

  _drawDone(wrap) {
    clearInterval(this._sessionTimer);
    clearInterval(this._restTimer);
    this._removeBanner();
    const totalSets = this._logs.reduce((a, l) => a + l.sets_data.length, 0);

    const notes = [
      { key: 'dur',  emoji: '😓', label: 'Difficile' },
      { key: 'bien', emoji: '😊', label: 'Bien'      },
      { key: 'feu',  emoji: '🤩', label: 'En feu !'  },
    ];

    wrap.innerHTML = `
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;
                  justify-content:center;padding:32px 20px;text-align:center;">
        <div id="saTrophyWrap" style="position:relative;display:inline-block;margin-bottom:12px;">
          <div style="font-size:64px;" class="trophy-anim">🏆</div>
        </div>
        <div style="font-size:26px;font-weight:800;color:var(--black);margin-bottom:6px;">Séance terminée !</div>
        <div style="font-size:14px;color:var(--gray-muted);margin-bottom:24px;">${this._seance?.nom || ''}</div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;max-width:340px;margin-bottom:32px;">
          ${[
            { val: this._fmt(this._sessionSeconds), lbl: 'Durée' },
            { val: this._seance?.exercices?.length || 0, lbl: 'Exercices' },
            { val: totalSets, lbl: 'Séries' },
          ].map(c => `
            <div style="background:var(--card-bg);border-radius:14px;padding:16px 8px;">
              <div style="font-size:22px;font-weight:800;color:var(--gold);">${c.val}</div>
              <div style="font-size:11px;color:var(--gray-muted);margin-top:3px;">${c.lbl}</div>
            </div>`).join('')}
        </div>

        <!-- Note de séance obligatoire -->
        <div style="width:100%;max-width:340px;margin-bottom:28px;">
          <div style="font-size:15px;font-weight:700;color:var(--black);margin-bottom:14px;">
            Comment s'est passée ta séance ?
          </div>
          <div style="display:flex;gap:10px;justify-content:center;">
            ${notes.map(n => `
              <button id="saNote_${n.key}" onclick="SeanceActivePage._selectNote('${n.key}')"
                style="flex:1;padding:14px 8px;border-radius:14px;border:2px solid var(--border-solid);
                       background:var(--card-bg);cursor:pointer;transition:all .15s;
                       font-family:var(--font);">
                <div style="font-size:32px;margin-bottom:4px;">${n.emoji}</div>
                <div style="font-size:11px;font-weight:600;color:var(--gray);">${n.label}</div>
              </button>`).join('')}
          </div>
        </div>

        <button id="saSaveBtn" onclick="SeanceActivePage._save()" disabled
          style="width:100%;max-width:340px;height:58px;
                 background:var(--border-solid);color:var(--gray-muted);
                 border:none;border-radius:16px;font-size:17px;font-weight:700;
                 cursor:default;font-family:var(--font);margin-bottom:10px;transition:all .2s;">
          ✓ Enregistrer la séance
        </button>
        <button onclick="SeanceActivePage._quit()"
          style="background:none;border:none;color:var(--gray-muted);font-size:13px;
                 cursor:pointer;font-family:var(--font);">
          Abandonner sans enregistrer
        </button>
      </div>`;
    // Confetti après rendu
    setTimeout(() => launchConfetti(document.getElementById('saTrophyWrap')), 200);
  },

  _selectNote(key) {
    this._noteRessenti = key;
    const notes = ['dur', 'bien', 'feu'];
    notes.forEach(k => {
      const btn = document.getElementById('saNote_' + k);
      if (!btn) return;
      if (k === key) {
        btn.style.borderColor = 'var(--gold)';
        btn.style.background  = 'var(--gold-bg,#fffbeb)';
        btn.style.transform   = 'scale(1.06)';
      } else {
        btn.style.borderColor = 'var(--border-solid)';
        btn.style.background  = 'var(--card-bg)';
        btn.style.transform   = 'scale(1)';
      }
    });
    // Activer le bouton save
    const saveBtn = document.getElementById('saSaveBtn');
    if (saveBtn) {
      saveBtn.disabled          = false;
      saveBtn.style.background  = 'var(--gold)';
      saveBtn.style.color       = '#fff';
      saveBtn.style.cursor      = 'pointer';
    }
  },

  // ── Actions ──────────────────────────────────────────────────────────────────

  _validate() {
    this._syncNote();
    const ex = this._exo();
    if (!ex) return;
    const effort = ex.type_effort || 'reps';

    // Reset phase AMRAP après validation du score
    if (effort === 'amrap' && this._amrapPhase === 'done') this._amrapPhase = 'idle';

    // ── Logique 2e effort (Rest-Pause, Drop Set, Iso Régressif…) ────────────
    if (effort === 'reps' && ex.reps_secondaire && this._effortIdx === 0) {
      // Sauvegarder effort 1, démarrer repos intra-série
      this._pendingE1 = {
        reps:   document.getElementById('saReps')?.value   || '0',
        charge: document.getElementById('saCharge')?.value || '',
      };
      this._effortIdx = 1;
      this._intraRest = true;
      this._startRest(ex.repos_intra_sec || 10);
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    let set;
    if (effort === 'reps') {
      const reps   = document.getElementById('saReps')?.value   || '0';
      const charge = document.getElementById('saCharge')?.value || '';
      if (this._effortIdx === 1 && this._pendingE1) {
        // Combiner effort 1 + effort 2
        set = { reps: (this._pendingE1.reps || '0') + '→' + reps, charge: this._pendingE1.charge };
        this._effortIdx = 0;
        this._pendingE1 = null;
      } else {
        set = { reps, charge };
      }
    } else {
      const score = document.getElementById('saReps')?.value || '';
      const note  = document.getElementById('saNote')?.value || '';
      set = {
        reps:   [score, note].filter(Boolean).join(' — ') || ex.reps_cible || '',
        charge: document.getElementById('saCharge')?.value || '',
      };
    }

    this._logs[this._exoIdx].sets_data.push(set);

    const exos    = this._seance.exercices;
    const nbSer   = this._nbSeries(ex);
    const nbEx    = exos.length;
    const lastSer = this._serieIdx + 1 >= nbSer;
    const lastExo = this._exoIdx + 1 >= nbEx;

    // ── Logique superset ────────────────────────────────────────────────────
    const group = ex.superset_groupe;
    if (group) {
      const nextExo     = exos[this._exoIdx + 1];
      const nextInGroup = nextExo?.superset_groupe === group;

      if (nextInGroup) {
        // Enchaîner directement avec le suivant du superset — pas de repos
        this._exoIdx++;
        // _serieIdx inchangé : même round
        this._phase = 'exercice';
        this._draw();
        return;
      }

      // Dernier exercice du groupe pour ce round — trouver le premier du groupe
      let firstIdx = this._exoIdx;
      while (firstIdx > 0 && exos[firstIdx - 1]?.superset_groupe === group) firstIdx--;

      if (lastSer) {
        // Tous les rounds terminés → exercice suivant hors groupe
        if (lastExo) { this._phase = 'done'; this._draw(); return; }
        this._exoIdx   = this._exoIdx + 1;
        this._serieIdx = 0;
      } else {
        // Prochain round → revenir au premier du groupe, série suivante
        this._exoIdx   = firstIdx;
        this._serieIdx++;
      }

      this._startRest(ex.repos_secondes || 90);
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    // Exercice normal
    if (lastSer && lastExo) { this._phase = 'done'; this._draw(); return; }
    if (lastSer) { this._exoIdx++; this._serieIdx = 0; }
    else         { this._serieIdx++; }
    this._startRest(ex.repos_secondes || 90);
  },

  _startRest(secs) {
    this._phase          = 'repos';
    this._restTotal      = secs;
    this._restRemaining  = secs;

    // Show the next exercise/series with the validate button disabled
    this._draw();

    // Inject the floating rest banner and start the countdown
    this._startRestBanner();
  },

  _startRestBanner() {
    this._removeBanner();

    // Extra bottom padding so content isn't hidden behind the banner
    const wrap = document.getElementById('saWrap');
    if (wrap) wrap.style.paddingBottom = '120px';

    const banner = document.createElement('div');
    banner.id = 'saRestBanner';
    banner.style.cssText = [
      'position:fixed;bottom:0;left:0;right:0;z-index:1000;',
      'background:rgba(12,12,12,0.96);',
      'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);',
      'border-top:1px solid rgba(255,255,255,0.07);',
      'padding:12px 16px calc(14px + env(safe-area-inset-bottom));',
    ].join('');

    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:22px;line-height:1;">💤</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;
                      letter-spacing:.8px;margin-bottom:1px;">${this._intraRest
            ? `Repos intra-série · Effort 2 : ${this._exo()?.reps_secondaire || '?'} reps`
            : `Récupération · Prochain : ${(() => {
                const exos = this._seance?.exercices || [];
                const next = exos[this._exoIdx];
                return next?.exercices_bdd?.nom || '—';
              })()}`
          }</div>
          <div id="saRestSecs" style="font-size:30px;font-weight:900;color:#fff;
                                      font-family:var(--font);line-height:1.1;">
            ${this._fmt(this._restRemaining)}
          </div>
        </div>
        <button onclick="SeanceActivePage._skipRest()"
          style="padding:10px 20px;background:rgba(255,255,255,0.1);
                 border:1.5px solid rgba(255,255,255,0.18);border-radius:12px;
                 font-size:14px;font-weight:600;cursor:pointer;color:#fff;
                 font-family:var(--font);white-space:nowrap;flex-shrink:0;">
          ⏭ Passer
        </button>
      </div>
      <div style="margin-top:9px;height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
        <div id="saRestBar" style="height:100%;background:var(--gold);border-radius:2px;
             transition:width 1s linear;width:100%;"></div>
      </div>`;

    document.body.appendChild(banner);

    clearInterval(this._restTimer);
    this._restTimer = setInterval(() => {
      this._restRemaining = Math.max(0, this._restRemaining - 1);
      const d = document.getElementById('saRestSecs');
      const b = document.getElementById('saRestBar');
      if (d) d.textContent = this._fmt(this._restRemaining);
      if (b) b.style.width = (this._restTotal > 0
        ? (this._restRemaining / this._restTotal * 100) : 0).toFixed(1) + '%';

      if (this._restRemaining <= 0) {
        clearInterval(this._restTimer);
        this._phase     = 'exercice';
        this._intraRest = false;
        this._removeBanner();
        this._enableValidateBtn();
        // Bug 28 — ne vibrer que si l'utilisateur est toujours sur cette page
        if (navigator.vibrate && Router.currentPage === 'seance-active') navigator.vibrate([200, 100, 200]);
      }
    }, 1000);
  },

  _removeBanner() {
    document.getElementById('saRestBanner')?.remove();
    const wrap = document.getElementById('saWrap');
    if (wrap) wrap.style.paddingBottom = '';
  },

  _enableValidateBtn() {
    const btn = document.getElementById('saValidateBtn');
    if (!btn) return;
    btn.disabled = false;
    btn.style.background = 'var(--gold)';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
    const ex   = this._exo();
    const isLast = ex
      ? (this._serieIdx + 1 >= this._nbSeries(ex) && this._exoIdx + 1 >= (this._seance?.exercices?.length || 1))
      : true;
    btn.textContent = this._effortIdx === 1 ? '✓ Effort 2 validé'
                    : isLast ? '🏁 Terminer la séance' : '✓ Série validée';
  },

  // ── AMRAP Timer ─────────────────────────────────────────────────────────────

  _parseAmrapSecs(val) {
    if (!val) return 300;
    const colon = String(val).match(/^(\d+):(\d+)$/);
    if (colon) return parseInt(colon[1]) * 60 + parseInt(colon[2]);
    const m = String(val).match(/(\d+)\s*(?:min|m)/i);
    if (m) return parseInt(m[1]) * 60;
    const n = parseInt(val);
    return isNaN(n) ? 300 : n;
  },

  _beep(freq = 880, ms = 180, vol = 0.4) {
    try {
      const ctx = this._audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
      osc.start(); osc.stop(ctx.currentTime + ms / 1000);
    } catch (_) {}
  },

  _speak(text) {
    try {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'fr-FR'; utt.rate = 0.95; utt.volume = 1;
      window.speechSynthesis.speak(utt);
    } catch (_) {}
  },

  _renderAmrapSection(ex) {
    const totalSecs = this._parseAmrapSecs(ex.reps_cible);
    const phase     = this._amrapPhase;

    if (phase === 'idle') {
      const lastSets = this._lastSets[ex.exercice_id] || [];
      return `
        <div style="text-align:center;padding:28px 0 12px;">
          <div style="font-size:64px;font-weight:900;color:var(--black);
                      font-variant-numeric:tabular-nums;letter-spacing:-2px;line-height:1;">
            ${this._fmt(totalSecs)}
          </div>
          <div style="font-size:12px;color:var(--gray-muted);margin-top:6px;">Durée de travail</div>
        </div>
        ${lastSets.length > 0 ? `
        <div style="font-size:11px;color:var(--gray-muted);background:var(--card-bg);
            border-radius:8px;padding:6px 10px;margin-bottom:8px;">
          📅 Dernière séance : ${lastSets.map(s => `${s.reps}${s.charge ? ' · ' + s.charge + 'kg' : ''}`).join(' &nbsp;')}
        </div>` : ''}`;
    }

    if (phase === 'countdown') {
      return `
        <div style="text-align:center;padding:20px 0 12px;">
          <div style="font-size:12px;color:var(--gray-muted);margin-bottom:8px;text-transform:uppercase;
                      letter-spacing:.8px;font-weight:600;">Prépare-toi…</div>
          <div id="saAmrapDisplay" style="font-size:110px;font-weight:900;color:var(--gold);
                      font-variant-numeric:tabular-nums;line-height:1;">
            ${this._amrapRemaining}
          </div>
        </div>`;
    }

    if (phase === 'work') {
      const pct   = this._amrapTotal > 0 ? (this._amrapRemaining / this._amrapTotal * 100).toFixed(1) : 0;
      const color = this._amrapRemaining <= 10 ? '#ef4444'
                  : this._amrapRemaining <= 60 ? 'var(--gold)' : 'var(--black)';
      return `
        <div style="text-align:center;padding:16px 0 12px;">
          <div id="saAmrapDisplay" style="font-size:80px;font-weight:900;color:${color};
                      font-variant-numeric:tabular-nums;letter-spacing:-3px;line-height:1;
                      transition:color .3s;">
            ${this._fmt(this._amrapRemaining)}
          </div>
          <div style="margin:10px 0 4px;height:5px;background:var(--border-solid);border-radius:3px;overflow:hidden;">
            <div id="saAmrapBar" style="height:100%;background:var(--gold);border-radius:3px;
                 width:${pct}%;transition:width 1s linear;"></div>
          </div>
          <div style="font-size:11px;color:var(--gray-muted);">Temps restant</div>
        </div>`;
    }

    // done — afficher les inputs de score
    const lastSets = this._lastSets[ex.exercice_id] || [];
    return `
      <div style="text-align:center;padding:12px 0 4px;">
        <div style="font-size:44px;margin-bottom:4px;">🔥</div>
        <div style="font-size:15px;font-weight:700;color:var(--black);">Temps écoulé !</div>
        <div style="font-size:12px;color:var(--gray-muted);margin-bottom:14px;">Note ton score</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px;">
        ${lastSets.length > 0 ? `
        <div style="font-size:11px;color:var(--gray-muted);background:var(--card-bg);
            border-radius:8px;padding:6px 10px;">
          📅 Dernière séance : ${lastSets.map((s,i)=>`S${i+1}: ${s.reps}${s.charge?' · '+s.charge+'kg':''}`).join(' &nbsp;')}
        </div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div>
            <div style="font-size:9px;color:var(--gray-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Reps total</div>
            <input id="saReps" type="number" inputmode="numeric" min="0" placeholder="—"
              style="width:100%;height:58px;text-align:center;font-size:26px;font-weight:800;
                     border:2px solid var(--border-solid);border-radius:12px;
                     background:var(--white);color:var(--black);font-family:var(--font);box-sizing:border-box;">
          </div>
          <div>
            <div style="font-size:9px;color:var(--gray-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Charge (kg)</div>
            <input id="saCharge" type="number" inputmode="decimal" min="0" step="0.5"
              value="${lastSets[0]?.charge ?? ''}" placeholder="0"
              style="width:100%;height:58px;text-align:center;font-size:26px;font-weight:800;
                     border:2px solid var(--border-solid);border-radius:12px;
                     background:var(--white);color:var(--black);font-family:var(--font);box-sizing:border-box;">
          </div>
        </div>
      </div>`;
  },

  _startAmrap() {
    const ex = this._exo();
    if (!ex || this._amrapPhase !== 'idle') return;
    clearInterval(this._amrapTimer);

    // Débloque l'audio iOS depuis le geste utilisateur (clic bouton)
    try {
      if (!this._audioCtx) {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this._audioCtx.state === 'suspended') this._audioCtx.resume();
    } catch (_) {}

    // Débloque la synthèse vocale iOS (doit être appelé dans un geste utilisateur)
    try {
      const unlock = new SpeechSynthesisUtterance('');
      unlock.volume = 0;
      window.speechSynthesis.speak(unlock);
    } catch (_) {}

    this._amrapTotal     = this._parseAmrapSecs(ex.reps_cible);
    this._amrapRemaining = 10;
    this._amrapPhase     = 'countdown';
    this._draw();
    this._amrapTimer = setInterval(() => this._tickAmrap(), 1000);
  },

  _tickAmrap() {
    if (this._amrapPhase === 'countdown') {
      this._amrapRemaining--;
      const el = document.getElementById('saAmrapDisplay');
      if (this._amrapRemaining > 0) {
        if (el) el.textContent = this._amrapRemaining;
        if (this._amrapRemaining <= 3) this._beep(880, 180);
      } else {
        // GO — transition vers work
        this._beep(1100, 350);
        this._amrapPhase     = 'work';
        this._amrapRemaining = this._amrapTotal;
        this._draw();
      }

    } else if (this._amrapPhase === 'work') {
      this._amrapRemaining--;

      // Mises à jour DOM directes (pas de re-render complet)
      const el  = document.getElementById('saAmrapDisplay');
      const bar = document.getElementById('saAmrapBar');
      if (el) {
        el.textContent   = this._fmt(this._amrapRemaining);
        el.style.color   = this._amrapRemaining <= 10 ? '#ef4444'
                         : this._amrapRemaining <= 60 ? 'var(--gold)' : 'var(--black)';
      }
      if (bar) bar.style.width = (this._amrapTotal > 0
        ? (this._amrapRemaining / this._amrapTotal * 100) : 0).toFixed(1) + '%';

      // Ambiance warning ≤10s — fond rouge pulse
      setAmrapWarning(this._amrapRemaining <= 10 && this._amrapRemaining > 0);

      // Annonces vocales
      if (this._amrapRemaining === 60) this._speak('1 minute');
      if (this._amrapRemaining === 10) this._speak('10 secondes');

      // Bips finaux
      if (this._amrapRemaining <= 3 && this._amrapRemaining > 0) this._beep(880, 180);

      // Fin
      if (this._amrapRemaining <= 0) {
        clearInterval(this._amrapTimer);
        this._amrapTimer = null;
        this._amrapPhase = 'done';
        this._beep(1100, 500);
        setTimeout(() => this._beep(1100, 500), 550);
        setTimeout(() => this._beep(1300, 700), 1100);
        if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 500]);
        this._draw();
      }
    }
  },

  _syncNote() {
    const el = document.getElementById('saClientNote');
    if (el && this._logs[this._exoIdx] !== undefined) {
      this._logs[this._exoIdx].note_client = el.value.trim() || null;
    }
  },

  _skipRest() {
    clearInterval(this._restTimer);
    this._restRemaining = 0;
    this._phase         = 'exercice';
    this._intraRest     = false;
    this._removeBanner();
    this._enableValidateBtn();
  },

  _skipExo() {
    const exos = this._seance.exercices;
    if (this._exoIdx >= exos.length - 1) return; // dernier exo, rien à reporter

    clearInterval(this._restTimer);
    this._removeBanner();

    // Déplacer l'exercice courant et son log à la fin
    const [skippedExo] = exos.splice(this._exoIdx, 1);
    const [skippedLog] = this._logs.splice(this._exoIdx, 1);
    skippedLog.sets_data = []; // reset les séries partielles
    exos.push(skippedExo);
    this._logs.push(skippedLog);

    // _exoIdx reste le même (pointe maintenant sur le suivant)
    this._serieIdx = 0;
    this._phase    = 'exercice';
    this._draw();
  },

  async _save() {
    const btn = document.getElementById('saSaveBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enregistrement…'; }
    try {
      const profile = Router.userProfile;
      const now     = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

      const log = await db.upsertSeanceLog({
        client_id:      profile.id,
        nom_seance:     this._seance.nom,
        date_seance:    dateStr,
        duree_secondes: this._sessionSeconds,
        note_ressenti:  this._noteRessenti,
      });

      await db.saveSeanceSets(log.id, this._logs);
      toast('💪 Séance enregistrée !', 'success');
      setTimeout(() => { window.location.hash = '#entrainement'; }, 600);
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = '✓ Enregistrer la séance'; }
      toast('Erreur : ' + e.message, 'error');
    }
  },

  _goToExo(idx) {
    this._syncNote();
    clearInterval(this._restTimer);
    clearInterval(this._amrapTimer);
    this._amrapTimer = null;
    this._amrapPhase = 'idle';
    if (this._audioCtx) { this._audioCtx.close().catch(() => {}); this._audioCtx = null; }
    this._removeBanner();
    const ex = this._seance.exercices[idx];
    if (!ex) return;
    this._exoIdx   = idx;
    const logged   = this._logs[idx]?.sets_data?.length || 0;
    const maxSer   = this._nbSeries(ex);
    this._serieIdx = Math.max(0, Math.min(logged, maxSer - 1));
    this._phase    = 'exercice';
    this._draw();
  },

  _prevExo() {
    if (this._exoIdx <= 0) return;
    this._goToExo(this._exoIdx - 1);
  },

  _nextExo() {
    if (this._exoIdx >= (this._seance?.exercices?.length || 1) - 1) return;
    this._goToExo(this._exoIdx + 1);
  },

  _finishEarly() {
    this._syncNote();
    if (!confirm('Terminer la séance maintenant ?\nSeules les séries déjà validées seront enregistrées.')) return;
    clearInterval(this._restTimer);
    clearInterval(this._sessionTimer);
    this._removeBanner();
    this._phase = 'done';
    this._draw();
  },

  _quit() {
    if (!confirm('Abandonner la séance ? Ta progression ne sera pas enregistrée.')) return;
    clearInterval(this._sessionTimer);
    clearInterval(this._restTimer);
    this._removeBanner();
    this._seance        = null;
    this._logs          = [];
    this._phase         = 'exercice';
    this._sessionSeconds = 0;
    this._noteRessenti  = null;
    window.location.hash = '#entrainement';
  },
};
