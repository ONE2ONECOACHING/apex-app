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
      this._logs = (this._seance.exercices || []).map(ex => ({
        exercice_id:             ex.exercice_id,
        client_prog_exercice_id: ex.id,
        type_effort:             ex.type_effort || 'reps',
        sets_data:               [],
      }));

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
    if (this._phase === 'done')  { this._drawDone(wrap);  return; }
    if (this._phase === 'repos') { this._drawRest(wrap);  return; }
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

  _drawExo(wrap) {
    const ex = this._exo();
    if (!ex) { this._phase = 'done'; this._drawDone(wrap); return; }

    const nom      = ex.exercices_bdd?.nom || '?';
    const muscle   = ex.exercices_bdd?.muscle_principal || '';
    const ytUrl    = ex.exercices_bdd?.youtube_url || null;
    const effort   = ex.type_effort || 'reps';
    const nbSer    = this._nbSeries(ex);
    const nbEx     = this._seance.exercices.length;
    const target   = this._target(ex, this._serieIdx);
    const prevSets = this._logs[this._exoIdx]?.sets_data || [];
    const isLast   = this._serieIdx + 1 >= nbSer && this._exoIdx + 1 >= nbEx;

    wrap.innerHTML = `
      ${this._header()}

      <div style="padding:12px 16px 0;font-size:12px;color:var(--gray-muted);">
        Exercice <b style="color:var(--black);">${this._exoIdx + 1} / ${nbEx}</b>
        &nbsp;·&nbsp;
        Série <b style="color:var(--black);">${this._serieIdx + 1} / ${nbSer}</b>
      </div>

      <div style="padding:10px 16px 0;">
        <div style="font-size:22px;font-weight:800;color:var(--black);line-height:1.2;margin-bottom:6px;">${nom}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${muscle ? `<span style="font-size:11px;padding:2px 10px;border-radius:12px;
            background:var(--gold-bg,#fffbeb);color:var(--gold);font-weight:600;">${muscle}</span>` : ''}
          ${ytUrl ? `<a href="${ytUrl}" target="_blank" rel="noopener"
            style="font-size:11px;color:#FF0000;text-decoration:none;font-weight:600;">▶ Vidéo</a>` : ''}
        </div>

        <!-- Objectif de la série -->
        <div style="margin-top:14px;padding:12px 14px;background:var(--card-bg);border-radius:12px;
                    border-left:3px solid var(--gold);">
          <div style="font-size:10px;color:var(--gray-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Objectif</div>
          <div style="font-size:16px;font-weight:700;color:var(--black);">
            ${effort === 'reps'
              ? `${target.reps} reps${target.charge ? ' · ' + target.charge + ' kg' : ''}`
              : effort === 'amrap' ? `AMRAP ${target.reps}`
              : effort === 'temps' ? `⏱ ${target.reps}`
              : `📏 ${target.reps}`}
          </div>
          <div style="font-size:11px;color:var(--gray-muted);margin-top:2px;">💤 ${ex.repos_secondes || 90} s récup</div>
        </div>

        <!-- Séries déjà faites -->
        ${prevSets.length > 0 ? `
          <div style="margin-top:10px;padding:10px 12px;background:var(--card-bg);border-radius:10px;">
            <div style="font-size:10px;color:var(--gray-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;">Déjà validées</div>
            ${prevSets.map((s, i) => `
              <div style="font-size:12px;color:var(--gray);padding:1px 0;">
                ${i + 1}. ${s.reps}${effort === 'reps' ? ' reps' : ''}${s.charge ? ' · ' + s.charge + ' kg' : ''}
              </div>`).join('')}
          </div>` : ''}

        <!-- Saisie -->
        ${effort === 'reps' ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;">
            <div>
              <div style="font-size:10px;color:var(--gray-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Reps réalisées</div>
              <input id="saReps" type="number" inputmode="numeric" min="0" value="${target.reps}"
                style="width:100%;height:64px;text-align:center;font-size:30px;font-weight:800;
                       border:2px solid var(--border-solid);border-radius:14px;
                       background:var(--white);color:var(--black);font-family:var(--font);box-sizing:border-box;">
            </div>
            <div>
              <div style="font-size:10px;color:var(--gray-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Charge (kg)</div>
              <input id="saCharge" type="number" inputmode="decimal" min="0" step="0.5"
                value="${target.charge || ''}" placeholder="0"
                style="width:100%;height:64px;text-align:center;font-size:30px;font-weight:800;
                       border:2px solid var(--border-solid);border-radius:14px;
                       background:var(--white);color:var(--black);font-family:var(--font);box-sizing:border-box;">
            </div>
          </div>` : `
          <div style="margin-top:16px;">
            <div style="font-size:10px;color:var(--gray-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Note (optionnel)</div>
            <input id="saNote" type="text" placeholder="ex: 5 tours, 500m…"
              style="width:100%;height:50px;padding:0 14px;border:2px solid var(--border-solid);
                     border-radius:12px;background:var(--white);color:var(--black);
                     font-family:var(--font);font-size:15px;box-sizing:border-box;">
          </div>`}
      </div>

      <!-- Boutons -->
      <div style="padding:16px;margin-top:auto;">
        <button onclick="SeanceActivePage._validate()"
          style="width:100%;height:58px;background:var(--gold);color:#fff;border:none;
                 border-radius:16px;font-size:18px;font-weight:700;cursor:pointer;font-family:var(--font);">
          ${isLast ? '🏁 Terminer la séance' : '✓ Série validée'}
        </button>
        <button onclick="SeanceActivePage._skipExo()"
          style="width:100%;height:38px;background:none;border:none;color:var(--gray-muted);
                 font-size:13px;cursor:pointer;margin-top:2px;font-family:var(--font);">
          Passer cet exercice →
        </button>
      </div>`;
  },

  _drawRest(wrap) {
    const ex    = this._exo();
    const nom   = ex?.exercices_bdd?.nom || '';
    const nbSer = this._nbSeries(ex);
    const pct   = this._restTotal > 0
      ? (this._restRemaining / this._restTotal * 100).toFixed(1)
      : 0;

    wrap.innerHTML = `
      ${this._header()}
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;
                  justify-content:center;padding:32px 16px;text-align:center;">

        <div style="font-size:12px;font-weight:700;color:var(--gray-muted);letter-spacing:1px;
                    text-transform:uppercase;margin-bottom:20px;">💤 Récupération</div>

        <div id="saRestSecs" style="font-size:86px;font-weight:900;color:var(--black);
                                     font-family:var(--font);line-height:1;">
          ${this._fmt(this._restRemaining)}
        </div>

        <div style="width:240px;height:6px;background:var(--border-solid);border-radius:3px;margin:20px 0 28px;">
          <div id="saRestBar" style="height:100%;background:var(--gold);border-radius:3px;
               transition:width 1s linear;width:${pct}%;"></div>
        </div>

        <div style="font-size:13px;color:var(--gray-muted);margin-bottom:36px;line-height:1.5;">
          Prochain : <b style="color:var(--black);">${nom}</b>
          ${this._serieIdx < nbSer
            ? `<br>Série ${this._serieIdx + 1} / ${nbSer}`
            : ''}
        </div>

        <button onclick="SeanceActivePage._skipRest()"
          style="padding:16px 52px;background:var(--card-bg);border:2px solid var(--border-solid);
                 border-radius:16px;font-size:16px;font-weight:600;cursor:pointer;
                 color:var(--black);font-family:var(--font);">
          ⏭ Passer
        </button>
      </div>`;
  },

  _drawDone(wrap) {
    clearInterval(this._sessionTimer);
    clearInterval(this._restTimer);
    const totalSets = this._logs.reduce((a, l) => a + l.sets_data.length, 0);

    wrap.innerHTML = `
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;
                  justify-content:center;padding:32px 20px;text-align:center;">
        <div style="font-size:64px;margin-bottom:12px;">🏆</div>
        <div style="font-size:26px;font-weight:800;color:var(--black);margin-bottom:6px;">Séance terminée !</div>
        <div style="font-size:14px;color:var(--gray-muted);margin-bottom:32px;">${this._seance?.nom || ''}</div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;max-width:340px;margin-bottom:40px;">
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

        <button id="saSaveBtn" onclick="SeanceActivePage._save()"
          style="width:100%;max-width:340px;height:58px;background:var(--gold);color:#fff;border:none;
                 border-radius:16px;font-size:17px;font-weight:700;cursor:pointer;
                 font-family:var(--font);margin-bottom:10px;">
          ✓ Enregistrer la séance
        </button>
        <button onclick="window.location.hash='#entrainement'"
          style="background:none;border:none;color:var(--gray-muted);font-size:14px;
                 cursor:pointer;font-family:var(--font);">
          Retour sans enregistrer
        </button>
      </div>`;
  },

  // ── Actions ──────────────────────────────────────────────────────────────────

  _validate() {
    const ex = this._exo();
    if (!ex) return;
    const effort = ex.type_effort || 'reps';
    const set = effort === 'reps'
      ? { reps: document.getElementById('saReps')?.value   || '0',
          charge: document.getElementById('saCharge')?.value || '' }
      : { reps: document.getElementById('saNote')?.value   || ex.reps_cible || '',
          charge: '' };

    this._logs[this._exoIdx].sets_data.push(set);

    const nbSer   = this._nbSeries(ex);
    const nbEx    = this._seance.exercices.length;
    const lastSer = this._serieIdx + 1 >= nbSer;
    const lastExo = this._exoIdx + 1 >= nbEx;

    if (lastSer && lastExo) { this._phase = 'done'; this._draw(); return; }

    if (lastSer) { this._exoIdx++; this._serieIdx = 0; }
    else         { this._serieIdx++; }

    this._startRest(ex.repos_secondes || 90);
  },

  _startRest(secs) {
    this._phase = 'repos';
    this._restTotal = secs;
    this._restRemaining = secs;
    this._draw();

    clearInterval(this._restTimer);
    this._restTimer = setInterval(() => {
      this._restRemaining = Math.max(0, this._restRemaining - 1);
      const d = document.getElementById('saRestSecs');
      const b = document.getElementById('saRestBar');
      if (d) d.textContent = this._fmt(this._restRemaining);
      if (b) b.style.width = (this._restTotal > 0
        ? this._restRemaining / this._restTotal * 100 : 0).toFixed(1) + '%';
      if (this._restRemaining <= 0) {
        clearInterval(this._restTimer);
        this._phase = 'exercice';
        this._draw();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    }, 1000);
  },

  _skipRest() {
    clearInterval(this._restTimer);
    this._restRemaining = 0;
    this._phase = 'exercice';
    this._draw();
  },

  _skipExo() {
    if (!confirm('Passer cet exercice ?')) return;
    clearInterval(this._restTimer);
    this._exoIdx++;
    this._serieIdx = 0;
    this._phase = this._exoIdx >= (this._seance?.exercices?.length || 0) ? 'done' : 'exercice';
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
        programme_id:   this._progId || null,
        seance_id:      this._seance.id,
        nom_seance:     this._seance.nom,
        date_seance:    dateStr,
        duree_secondes: this._sessionSeconds,
        statut:         'complete',
      });

      await db.saveSeanceSets(log.id, this._logs);
      window.location.hash = '#entrainement';
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = '✓ Enregistrer la séance'; }
      alert('Erreur : ' + e.message);
    }
  },

  _quit() {
    if (!confirm('Quitter ? La séance en cours ne sera pas enregistrée.')) return;
    clearInterval(this._sessionTimer);
    clearInterval(this._restTimer);
    window.location.hash = '#entrainement';
  },
};
