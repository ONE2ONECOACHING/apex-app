// APEX APP — Coach : Éditeur de template de programme (desktop — colonnes)

const CoachProgTemplateEditPage = {
  templateId:          null,
  templateData:        { nom: '', description: '', nb_semaines: 4 },
  seances:             [],
  _allExos:            [],
  _picking:            null,  // index séance pour ajout
  _swapTarget:         null,  // { si, ei } pour remplacement
  _pickSearch:         '',
  _pickMuscle:         'all',
  _saving:             false,
  // ── Mode client (édition programme assigné, sans modifier le template) ──
  _clientMode:         false,
  _clientProgrammeId:  null,
  _clientId:           null,
  _clientPrenom:       '',

  _jourLabels: ['Non défini', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],

  _muscleColors: {
    pectoraux: '#3B82F6', dos: '#8B5CF6',      epaules: '#EC4899',
    biceps:    '#F59E0B', triceps: '#F97316',   quadriceps: '#10B981',
    ischio:    '#06B6D4', fessiers: '#84CC16',  abdos: '#EF4444',
    mollets:   '#6366F1', full_body: '#C4820A', cardio: '#EF4444',
  },

  _musclePicker: [
    { key: 'all',        label: 'Tous'      },
    { key: 'pectoraux',  label: 'Pecto'     },
    { key: 'dos',        label: 'Dos'       },
    { key: 'epaules',    label: 'Épaules'   },
    { key: 'biceps',     label: 'Biceps'    },
    { key: 'triceps',    label: 'Triceps'   },
    { key: 'quadriceps', label: 'Quadris'   },
    { key: 'ischio',     label: 'Ischio'    },
    { key: 'fessiers',   label: 'Fessiers'  },
    { key: 'abdos',      label: 'Abdos'     },
    { key: 'full_body',  label: 'Full Body' },
    { key: 'cardio',     label: 'Cardio'    },
  ],

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="tplEditTitle">Programme</div>
        </div>
        <button class="header-btn" onclick="CoachProgTemplateEditPage._goBack()">←</button>
      </div>
      <div id="tplEditContent"><div class="spinner" style="margin-top:3rem;"></div></div>
      <div id="tplExoPicker"></div>
      <nav class="nav-bottom"><div class="nav-inner">
        <a class="nav-item" href="#coach-clients"><span class="nav-icon">👥</span><span class="nav-label">Clients</span></a>
        <a class="nav-item active" href="#coach-prog-templates"><span class="nav-icon">📋</span><span class="nav-label">Programmes</span></a>
        <a class="nav-item" href="#coach-exercices"><span class="nav-icon">🏋️</span><span class="nav-label">Exercices</span></a>
      </div></nav>`;
  },

  _goBack() {
    if (this._clientMode) {
      Router.navigate('coach-client-programme', { clientId: this._clientId });
    } else {
      window.location.hash = '#coach-prog-templates';
    }
  },

  _mapExo(ex) {
    const te = ex.type_effort || ex.exercices_bdd?.type_effort || 'reps';
    return {
      id:              ex.id,
      exercice_id:     ex.exercice_id,
      exercice:        ex.exercices_bdd,
      type_effort:     te,
      series:          ex.series ?? 3,
      reps_cible:      ex.reps_cible || '10',
      charge_cible:    ex.charge_cible || '',
      repos_secondes:  ex.repos_secondes ?? 90,
      superset_groupe: ex.superset_groupe || null,
      notes:           ex.notes || '',
      series_data:     ex.series_data || (te === 'reps'
        ? Array.from({length: ex.series ?? 3}, () => ({reps: ex.reps_cible || '10', charge: ex.charge_cible || ''}))
        : null),
    };
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile || profile.role !== 'coach') { window.location.hash = '#login'; return; }

    const params = Router.getParams();
    this.templateId         = params.templateId || null;
    this._clientMode        = !!params.clientProgrammeId;
    this._clientProgrammeId = params.clientProgrammeId || null;
    this._clientId          = params.clientId || null;
    this._clientPrenom      = params.clientPrenom || '';
    this.seances            = [];
    this._allExos           = [];
    this._saving            = false;

    try {
      this._allExos = await db.getExercicesBdd();

      if (this._clientMode) {
        // ── Mode client : charge depuis les tables client_prog_* ──
        const prog = await db.getClientProgrammeActif(this._clientId);
        if (!prog) throw new Error('Aucun programme actif pour ce client.');
        this._clientProgrammeId = prog.id;
        this.templateData = { nom: prog.nom, description: '', nb_semaines: 1 };
        this.seances = (prog.seances || []).map(s => ({
          id:          s.id,
          nom:         s.nom,
          jour:        s.jour ?? 0,
          notes_coach: s.notes_coach || '',
          exercices:   (s.exercices || []).map(ex => this._mapExo(ex)),
        }));
        document.getElementById('tplEditTitle').textContent = prog.nom;

      } else if (this.templateId) {
        // ── Mode template ──
        const tpl = await db.getProgTemplateWithSeances(this.templateId);
        this.templateData = {
          nom:         tpl.nom,
          description: tpl.description || '',
          nb_semaines: tpl.nb_semaines,
        };
        this.seances = (tpl.seances || []).map(s => ({
          id:          s.id,
          nom:         s.nom,
          jour:        s.jour ?? 0,
          notes_coach: s.notes_coach || '',
          exercices:   (s.exercices || []).map(ex => this._mapExo(ex)),
        }));
        document.getElementById('tplEditTitle').textContent = tpl.nom;

      } else {
        this.templateData = { nom: '', description: '', nb_semaines: 4 };
        document.getElementById('tplEditTitle').textContent = 'Nouveau programme';
      }

      this.renderContent();
    } catch (e) {
      document.getElementById('tplEditContent').innerHTML =
        `<div class="alert alert-error">Erreur de chargement : ${e.message}</div>`;
    }
  },

  // ── Sync DOM → state (avant toute action structurelle et avant save) ────────

  _syncFromDOM() {
    // Métadonnées du template
    const nomEl = document.getElementById('tplNom');
    if (nomEl) this.templateData.nom = nomEl.value;
    const descEl = document.getElementById('tplDesc');
    if (descEl) this.templateData.description = descEl.value;
    const semEl = document.getElementById('tplSemaines');
    if (semEl) this.templateData.nb_semaines = parseInt(semEl.value) || 4;

    // Séances et exercices
    this.seances.forEach((s, si) => {
      const sNom  = document.getElementById('snom_' + si);
      if (sNom)  s.nom  = sNom.value;
      const sJour = document.getElementById('sjour_' + si);
      if (sJour) s.jour = parseInt(sJour.value) || 0;
      const sNote = document.getElementById('snote_' + si);
      if (sNote) s.notes_coach = sNote.value;

      s.exercices.forEach((ex, ei) => {
        // 1. Effort type (toujours en premier)
        const effortEl = document.querySelector(`input[name="effort_${si}_${ei}"]:checked`);
        if (effortEl) ex.type_effort = effortEl.value;

        // 2. Données par série (mode reps — inputs indexés)
        const newSeriesData = [];
        let k = 0;
        while (document.getElementById(`exreps_${si}_${ei}_${k}`)) {
          newSeriesData.push({
            reps:   document.getElementById(`exreps_${si}_${ei}_${k}`).value || '10',
            charge: (document.getElementById(`excharge_${si}_${ei}_${k}`) || {}).value || '',
          });
          k++;
        }
        if (newSeriesData.length > 0) {
          ex.series_data = newSeriesData;
          ex.series = newSeriesData.length;
        }

        // 3. Champs non-indexés (modes non-reps)
        const ser  = document.getElementById(`exser_${si}_${ei}`);
        if (ser)  ex.series = parseInt(ser.value) || 3;
        const reps = document.getElementById(`exreps_${si}_${ei}`);
        if (reps) ex.reps_cible = reps.value;
        const rest = document.getElementById(`exrest_${si}_${ei}`);
        if (rest) ex.repos_secondes = parseInt(rest.value) || 90;
        const chg  = document.getElementById(`excharge_${si}_${ei}`);
        if (chg)  ex.charge_cible = chg.value;

        // 4. Pour temps/amrap : combiner min + sec en "M:SS"
        if (ex.type_effort === 'temps' || ex.type_effort === 'amrap') {
          const minEl = document.getElementById(`exmin_${si}_${ei}`);
          const secEl = document.getElementById(`exsec_${si}_${ei}`);
          if (minEl && secEl) {
            const m  = parseInt(minEl.value) || 0;
            const s2 = parseInt(secEl.value) || 0;
            ex.reps_cible = m + ':' + String(s2).padStart(2, '0');
          }
        }
      });
    });
  },

  // ── Render ───────────────────────────────────────────────────────────────────

  renderContent() {
    const el = document.getElementById('tplEditContent');
    const d  = this.templateData;

    el.innerHTML = `
      <!-- Métadonnées -->
      <div class="card" style="margin-bottom:1.25rem;padding:14px 18px;">
        <div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;">
          ${this._clientMode ? `
          <div style="flex:1;min-width:200px;">
            <div style="font-size:12px;color:var(--gray-muted);margin-bottom:2px;">Programme de ${this._clientPrenom}</div>
            <div style="font-size:16px;font-weight:700;">${d.nom}</div>
            <div style="font-size:11px;color:var(--gold);margin-top:3px;">✏️ Modifications pour ce client uniquement — le template n'est pas modifié</div>
          </div>` : `
          <div style="flex:2;min-width:220px;">
            <div class="form-label">Nom du programme</div>
            <input class="input" id="tplNom" value="${d.nom.replace(/"/g,'&quot;')}"
              placeholder="ex : Push Pull Legs — 3j/sem"
              oninput="document.getElementById('tplEditTitle').textContent=this.value||'Nouveau programme'">
          </div>
          <div style="width:130px;">
            <div class="form-label">Durée (semaines)</div>
            <input class="input" type="number" id="tplSemaines"
              value="${d.nb_semaines}" min="1" max="52" style="height:44px;">
          </div>
          <div style="flex:2;min-width:220px;">
            <div class="form-label">Description (optionnel)</div>
            <input class="input" id="tplDesc" value="${d.description.replace(/"/g,'&quot;')}"
              placeholder="ex : Hypertrophie, 3 séances/semaine">
          </div>`}
          <button class="btn btn-primary" id="tplSaveBtn"
            onclick="CoachProgTemplateEditPage.save()"
            style="height:44px;padding:0 24px;flex-shrink:0;white-space:nowrap;">
            ✓ Enregistrer
          </button>
        </div>
      </div>

      <!-- Colonnes séances -->
      <div style="overflow-x:auto;padding-bottom:7rem;">
        <div style="display:flex;gap:14px;align-items:flex-start;min-width:min-content;padding-bottom:2px;">
          ${this.seances.map((s, si) => this._renderSeanceCol(s, si)).join('')}

          <!-- Bouton ajouter séance -->
          <div style="flex-shrink:0;width:240px;">
            <button class="btn btn-ghost"
              style="width:100%;height:68px;border:2px dashed var(--border-solid);
                     font-size:14px;color:var(--gray);border-radius:12px;"
              onclick="CoachProgTemplateEditPage.addSeance()">
              + Ajouter une séance
            </button>
          </div>
        </div>
      </div>`;
  },

  _renderSeanceCol(s, si) {
    return `
      <div style="flex-shrink:0;width:290px;background:var(--card-bg);
                  border-radius:14px;padding:12px;border:1px solid var(--border-solid);">
        <!-- En-tête -->
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
          <input id="snom_${si}" class="input" value="${s.nom.replace(/"/g,'&quot;')}"
            placeholder="Nom de la séance"
            style="flex:1;height:36px;font-weight:700;font-size:14px;padding:0 8px;">
          <select id="sjour_${si}" class="input"
            style="width:90px;height:36px;padding:0 4px;font-size:12px;">
            ${this._jourLabels.map((j, i) =>
              `<option value="${i}"${s.jour===i?' selected':''}>${j.slice(0,3)}</option>`
            ).join('')}
          </select>
          <button class="icon-btn" style="flex-shrink:0;"
            title="Supprimer cette séance"
            onclick="CoachProgTemplateEditPage.removeSeance(${si})">×</button>
        </div>

        <!-- Exercices -->
        <div>
          ${s.exercices.length === 0
            ? `<div style="font-size:12px;color:var(--gray-muted);text-align:center;padding:12px 0;
                           border:1px dashed var(--border-solid);border-radius:8px;">
                 Aucun exercice
               </div>`
            : this._renderExoList(s.exercices, si)
          }
        </div>

        <!-- Notes coach (optionnel) -->
        <input id="snote_${si}" class="input" value="${(s.notes_coach||'').replace(/"/g,'&quot;')}"
          placeholder="Notes coach (optionnel)"
          style="margin-top:8px;height:32px;font-size:12px;color:var(--gray);">

        <!-- Ajouter exercice -->
        <button class="btn btn-ghost btn-small"
          style="width:100%;margin-top:8px;border:1px dashed var(--border-solid);"
          onclick="CoachProgTemplateEditPage.openPicker(${si})">
          + Exercice
        </button>
      </div>`;
  },

  // ── Superset helpers ────────────────────────────────────────────────────────

  _groupColors: ['#F59E0B','#3B82F6','#10B981','#EC4899','#8B5CF6','#F97316','#06B6D4'],

  _computeGroupMap(exos) {
    // Returns { groupLetter → { color, positions:[ei,...] } }
    const groups = {};
    let idx = 0;
    exos.forEach((ex, ei) => {
      if (!ex.superset_groupe) return;
      if (!groups[ex.superset_groupe]) {
        groups[ex.superset_groupe] = {
          color: this._groupColors[idx++ % this._groupColors.length],
          positions: [],
        };
      }
      groups[ex.superset_groupe].positions.push(ei);
    });
    return groups;
  },

  _renderExoList(exos, si) {
    const gmap = this._computeGroupMap(exos);
    // Build reverse map: ei → { letter, color, rank }
    const exoGroup = {};
    Object.entries(gmap).forEach(([letter, g]) => {
      g.positions.forEach((ei, rank) => {
        exoGroup[ei] = { letter, color: g.color, rank, total: g.positions.length };
      });
    });

    let html = '';
    exos.forEach((ex, ei) => {
      const g      = exoGroup[ei];
      const gNext  = exoGroup[ei + 1];
      const linked = g && gNext && g.letter === gNext.letter;

      // Exercice
      html += this._renderExoRow(ex, si, ei, g);

      // Bouton superset entre exercices (sauf après le dernier)
      if (ei < exos.length - 1) {
        const isLinked = linked;
        html += `
          <div style="display:flex;justify-content:center;margin:2px 0;">
            <button onclick="CoachProgTemplateEditPage.toggleSuperset(${si},${ei})"
              title="${isLinked ? 'Dissocier le superset' : 'Créer un superset avec le suivant'}"
              style="display:flex;align-items:center;gap:4px;padding:2px 10px;border-radius:20px;
                     font-size:11px;font-weight:600;cursor:pointer;border:none;
                     background:${isLinked ? (g?.color || 'var(--gold)') + '22' : 'transparent'};
                     color:${isLinked ? (g?.color || 'var(--gold)') : 'var(--gray-muted)'};
                     transition:all .15s;">
              🔗 ${isLinked ? 'Superset' : 'Coupler'}
            </button>
          </div>`;
      }
    });
    return html;
  },

  toggleSuperset(si, ei) {
    this._syncFromDOM();
    const exos = this.seances[si].exercices;
    const curr = exos[ei];
    const next = exos[ei + 1];
    if (!next) return;

    if (curr.superset_groupe && curr.superset_groupe === next.superset_groupe) {
      // Dissocier next du groupe
      const grp = curr.superset_groupe;
      next.superset_groupe = null;
      // Si curr est maintenant seul dans son groupe → le vider aussi
      const remaining = exos.filter((e, i) => i !== ei + 1 && e.superset_groupe === grp);
      if (remaining.length <= 1) remaining.forEach(e => { e.superset_groupe = null; });
    } else {
      // Coupler
      if (curr.superset_groupe) {
        next.superset_groupe = curr.superset_groupe;
      } else if (next.superset_groupe) {
        curr.superset_groupe = next.superset_groupe;
      } else {
        const used = new Set(exos.map(e => e.superset_groupe).filter(Boolean));
        let letter = 'A';
        while (used.has(letter)) letter = String.fromCharCode(letter.charCodeAt(0) + 1);
        curr.superset_groupe = letter;
        next.superset_groupe = letter;
      }
    }
    this.renderContent();
  },

  _parseMinSec(val) {
    if (!val) return [0, 0];
    const colon = String(val).match(/^(\d+):(\d+)$/);
    if (colon) return [parseInt(colon[1]), parseInt(colon[2])];
    const m = String(val).match(/(\d+)\s*min/);
    const s = String(val).match(/(\d+)\s*s\b/);
    return [m ? parseInt(m[1]) : 0, s ? parseInt(s[1]) : 0];
  },

  _renderExoRow(ex, si, ei, g = null) {
    const effort  = ex.type_effort || ex.exercice?.type_effort || 'reps';
    const ytUrl   = ex.exercice?.youtube_url || null;
    const repsPlaceholder = { reps:'reps', temps:'durée', amrap:'amrap', distance:'dist.' };
    const groupBadge = g
      ? `<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:10px;
           background:${g.color}22;color:${g.color};margin-left:6px;">
           ${g.letter}${g.rank + 1}
         </span>` : '';
    const borderLeft = g ? `border-left:3px solid ${g.color};` : '';
    const effortBtns = ['reps','temps','amrap','distance'].map(k => {
      const labels = { reps:'🔁 Reps', temps:'⏱ Temps', amrap:'♾ AMRAP', distance:'📏 Dist.' };
      return `<label style="cursor:pointer;">
        <input type="radio" name="effort_${si}_${ei}" value="${k}"
          ${effort === k ? 'checked' : ''}
          onchange="CoachProgTemplateEditPage._syncFromDOM();CoachProgTemplateEditPage.renderContent();"
          style="display:none;">
        <span style="display:inline-block;padding:2px 7px;border-radius:6px;font-size:10px;font-weight:600;
          border:1px solid var(--border-solid);cursor:pointer;
          background:${effort===k?'var(--gold)':'var(--card-bg)'};
          color:${effort===k?'#fff':'var(--gray)'};
          transition:all .15s;">
          ${labels[k]}
        </span>
      </label>`;
    }).join('');

    return `
      <div style="background:var(--white);border-radius:8px;padding:8px 10px;
                  margin-bottom:2px;border:1px solid var(--border);${borderLeft}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;">
          <div style="flex:1;min-width:0;">
            <!-- Nom + badge superset + lien YT -->
            <div style="font-weight:600;font-size:13px;line-height:1.3;margin-bottom:6px;">
              ${ex.exercice?.nom || '?'}${groupBadge}
              ${ytUrl ? `<a href="${ytUrl}" target="_blank"
                style="font-size:10px;color:#FF0000;text-decoration:none;margin-left:6px;">▶ YT</a>` : ''}
            </div>

            <!-- Modalité -->
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:7px;">
              ${effortBtns}
            </div>

            ${effort === 'reps'
              /* ── MODE REPS : séries individuelles ── */
              ? (() => {
                  const serArr = (ex.series_data && ex.series_data.length > 0)
                    ? ex.series_data
                    : Array.from({length: ex.series || 3}, () => ({reps: ex.reps_cible || '10', charge: ex.charge_cible || ''}));
                  return `<div>
                    ${serArr.map((sv, k) => `
                      <div style="display:flex;gap:4px;align-items:center;margin-bottom:3px;">
                        <span style="font-size:10px;color:var(--gray-muted);min-width:14px;text-align:right;">${k + 1}.</span>
                        <input id="exreps_${si}_${ei}_${k}" type="text"
                          value="${sv.reps}" placeholder="reps"
                          style="width:40px;height:28px;text-align:center;border:1px solid var(--border-solid);
                                 border-radius:6px;background:var(--card-bg);color:var(--black);
                                 font-size:12px;padding:0;font-family:var(--font);">
                        <span style="font-size:11px;color:var(--gray-muted);">reps à</span>
                        <input id="excharge_${si}_${ei}_${k}" type="text"
                          value="${sv.charge || ''}" placeholder="kg"
                          style="width:44px;height:28px;text-align:center;border:1px solid var(--border-solid);
                                 border-radius:6px;background:var(--card-bg);color:var(--black);
                                 font-size:12px;padding:0 2px;font-family:var(--font);">
                        <span style="font-size:11px;color:var(--gray-muted);">kg</span>
                        ${serArr.length > 1
                          ? `<button onclick="CoachProgTemplateEditPage.removeSerie(${si},${ei},${k})"
                              title="Supprimer cette série"
                              style="width:18px;height:18px;border-radius:50%;border:none;
                                     background:var(--card-bg);color:var(--gray-muted);font-size:13px;
                                     line-height:1;cursor:pointer;padding:0;flex-shrink:0;
                                     display:flex;align-items:center;justify-content:center;">×</button>`
                          : '<span style="width:18px;flex-shrink:0;"></span>'}
                      </div>`).join('')}
                    <div style="display:flex;gap:6px;align-items:center;margin-top:5px;flex-wrap:wrap;">
                      <span style="font-size:13px;">💤</span>
                      <input id="exrest_${si}_${ei}" type="number" min="0" max="600"
                        value="${ex.repos_secondes}" title="Repos (s)"
                        style="width:46px;height:26px;text-align:center;border:1px solid var(--border-solid);
                               border-radius:6px;background:var(--card-bg);color:var(--black);
                               font-size:12px;padding:0;font-family:var(--font);">
                      <span style="font-size:11px;color:var(--gray-muted);">s</span>
                      <button onclick="CoachProgTemplateEditPage.addSerie(${si},${ei})"
                        style="padding:1px 8px;border-radius:6px;border:1px dashed var(--border-solid);
                               background:transparent;color:var(--gray);font-size:11px;cursor:pointer;
                               font-family:var(--font);">+ Série</button>
                    </div>
                  </div>`;
                })()
              /* ── MODE TEMPS / AMRAP : min + sec ── */
              : (effort === 'temps' || effort === 'amrap')
              ? (() => { const [mn, sc] = this._parseMinSec(ex.reps_cible); return `
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                      <input id="exmin_${si}_${ei}" type="number" min="0" max="99"
                        value="${mn}"
                        style="width:46px;height:30px;text-align:center;border:1px solid var(--border-solid);
                               border-radius:6px;background:var(--card-bg);color:var(--black);
                               font-size:12px;padding:0;font-family:var(--font);">
                      <span style="font-size:9px;color:var(--gray-muted);">min</span>
                    </div>
                    <span style="font-size:14px;font-weight:700;color:var(--gray-muted);margin-bottom:12px;">:</span>
                    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                      <input id="exsec_${si}_${ei}" type="number" min="0" max="59"
                        value="${sc}"
                        style="width:46px;height:30px;text-align:center;border:1px solid var(--border-solid);
                               border-radius:6px;background:var(--card-bg);color:var(--black);
                               font-size:12px;padding:0;font-family:var(--font);">
                      <span style="font-size:9px;color:var(--gray-muted);">sec</span>
                    </div>
                    <!-- champ hidden pour sync reps_cible -->
                    <input id="exreps_${si}_${ei}" type="hidden" value="${ex.reps_cible}">
                    <input id="exser_${si}_${ei}" type="hidden" value="${ex.series}">
                  </div>
                  <!-- Récup -->
                  <div style="display:flex;gap:5px;align-items:center;margin-top:5px;">
                    <span style="font-size:14px;">💤</span>
                    <input id="exrest_${si}_${ei}" type="number" min="0" max="600"
                      value="${ex.repos_secondes}" title="Repos (s)"
                      style="width:50px;height:26px;text-align:center;border:1px solid var(--border-solid);
                             border-radius:6px;background:var(--card-bg);color:var(--black);
                             font-size:12px;padding:0;font-family:var(--font);">
                    <span style="font-size:11px;color:var(--gray-muted);">s</span>
                  </div>`; })()
              /* ── MODE DISTANCE : valeur seule ── */
              : `<div style="display:flex;gap:5px;align-items:center;">
                  <input id="exreps_${si}_${ei}" type="text"
                    value="${ex.reps_cible}" placeholder="ex: 100m"
                    style="width:80px;height:30px;text-align:center;border:1px solid var(--border-solid);
                           border-radius:6px;background:var(--card-bg);color:var(--black);
                           font-size:12px;padding:0 4px;font-family:var(--font);">
                  <input id="exser_${si}_${ei}" type="hidden" value="${ex.series}">
                </div>
                <div style="display:flex;gap:5px;align-items:center;margin-top:5px;">
                  <span style="font-size:14px;">💤</span>
                  <input id="exrest_${si}_${ei}" type="number" min="0" max="600"
                    value="${ex.repos_secondes}" title="Repos (s)"
                    style="width:50px;height:26px;text-align:center;border:1px solid var(--border-solid);
                           border-radius:6px;background:var(--card-bg);color:var(--black);
                           font-size:12px;padding:0;font-family:var(--font);">
                  <span style="font-size:11px;color:var(--gray-muted);">s</span>
                </div>`
            }

            ${effort !== 'reps' ? `
            <!-- Charge cible (modes non-reps) -->
            <input id="excharge_${si}_${ei}" type="text"
              value="${ex.charge_cible}"
              placeholder="Charge cible (ex : 60 kg, BW+10)"
              style="width:100%;margin-top:5px;height:26px;border:1px solid var(--border-solid);
                     border-radius:6px;background:var(--card-bg);color:var(--black);
                     font-size:11px;padding:0 6px;font-family:var(--font);">` : ''}
          </div>
          <!-- Actions exercice -->
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;margin-top:2px;">
            <button class="icon-btn" title="Remplacer l'exercice"
              onclick="CoachProgTemplateEditPage.openSwapPicker(${si},${ei})">↔</button>
            <button class="icon-btn" title="Supprimer"
              onclick="CoachProgTemplateEditPage.removeExo(${si},${ei})">×</button>
          </div>
        </div>
      </div>`;
  },

  _ytId(url) {
    if (!url) return null;
    const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  },

  // ── Actions structurelles ────────────────────────────────────────────────────

  addSeance() {
    this._syncFromDOM();
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.seances.push({
      id:          null,
      nom:         'Séance ' + (letters[this.seances.length] || (this.seances.length + 1)),
      jour:        0,
      notes_coach: '',
      exercices:   [],
    });
    this.renderContent();
  },

  removeSeance(si) {
    if (!confirm('Supprimer cette séance et tous ses exercices ?')) return;
    this._syncFromDOM();
    this.seances.splice(si, 1);
    this.renderContent();
  },

  removeExo(si, ei) {
    this._syncFromDOM();
    this.seances[si].exercices.splice(ei, 1);
    this.renderContent();
  },

  addSerie(si, ei) {
    this._syncFromDOM();
    const ex = this.seances[si].exercices[ei];
    if (!ex.series_data || ex.series_data.length === 0) {
      ex.series_data = Array.from({length: ex.series || 3},
        () => ({reps: ex.reps_cible || '10', charge: ex.charge_cible || ''}));
    }
    const last = ex.series_data[ex.series_data.length - 1];
    ex.series_data.push({reps: last ? last.reps : '10', charge: ''});
    ex.series = ex.series_data.length;
    this.renderContent();
  },

  removeSerie(si, ei, k) {
    this._syncFromDOM();
    const ex = this.seances[si].exercices[ei];
    if (ex.series_data && ex.series_data.length > 1) {
      ex.series_data.splice(k, 1);
      ex.series = ex.series_data.length;
      this.renderContent();
    }
  },

  // ── Picker d'exercice ────────────────────────────────────────────────────────

  openPicker(seanceIdx) {
    this._syncFromDOM();
    this._picking     = seanceIdx;
    this._swapTarget  = null;
    this._pickSearch  = '';
    this._pickMuscle  = 'all';
    this._renderPicker();
  },

  openSwapPicker(si, ei) {
    this._syncFromDOM();
    this._picking     = null;
    this._swapTarget  = { si, ei };
    this._pickSearch  = '';
    this._pickMuscle  = 'all';
    this._renderPicker();
  },

  _renderPicker() {
    const isSwap = !!this._swapTarget;
    const title  = isSwap
      ? 'Remplacer l\'exercice'
      : `Ajouter un exercice à "${this.seances[this._picking]?.nom || 'la séance'}"`;
    const closeJs = `document.getElementById('tplExoPicker').innerHTML='';CoachProgTemplateEditPage._picking=null;CoachProgTemplateEditPage._swapTarget=null;`;

    document.getElementById('tplExoPicker').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this){${closeJs}}">
        <div class="modal" style="max-width:560px;padding-bottom:1.5rem;">
          <div class="modal-title">
            ${title}
            <button class="modal-close" onclick="${closeJs}">×</button>
          </div>

          <input class="input" id="pickerSearch" placeholder="🔍 Rechercher…"
            style="margin-bottom:10px;"
            oninput="CoachProgTemplateEditPage._pickSearch=this.value;
                     CoachProgTemplateEditPage._renderPickerList()">

          <div id="pickerMuscles" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;"></div>

          <div id="pickerList" style="max-height:380px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;"></div>

          ${this._allExos.length === 0 ? `
            <div style="text-align:center;margin-top:16px;">
              <a href="#coach-exercices" style="font-size:13px;color:var(--gold);">
                → Créer des exercices dans la bibliothèque
              </a>
            </div>` : ''}
        </div>
      </div>`;

    this._renderPickerMuscles();
    this._renderPickerList();
    // Focus sur la recherche après ouverture
    const inp = document.getElementById('pickerSearch');
    if (inp) inp.focus();
  },

  _renderPickerMuscles() {
    const el = document.getElementById('pickerMuscles');
    if (!el) return;
    el.innerHTML = this._musclePicker.map(m => `
      <button class="rec-kcal-btn${this._pickMuscle === m.key ? ' active' : ''}"
        onclick="CoachProgTemplateEditPage._pickMuscle='${m.key}';
                 CoachProgTemplateEditPage._renderPickerMuscles();
                 CoachProgTemplateEditPage._renderPickerList()">
        ${m.label}
      </button>`).join('');
  },

  _renderPickerList() {
    const el = document.getElementById('pickerList');
    if (!el) return;
    let exos = this._allExos;
    if (this._pickMuscle !== 'all') exos = exos.filter(e => e.muscle_principal === this._pickMuscle);
    if (this._pickSearch.trim()) {
      const q = this._pickSearch.toLowerCase();
      exos = exos.filter(e => e.nom.toLowerCase().includes(q));
    }
    const equips = { poids_corps:'Poids du corps', halteres:'Haltères', barre:'Barre',
      machine:'Machine', cables:'Câbles', elastiques:'Élastiques', autres:'Autres' };
    const isSwap = !!this._swapTarget;
    el.innerHTML = exos.length === 0
      ? '<div style="text-align:center;color:var(--gray-muted);padding:24px 0;">Aucun exercice trouvé</div>'
      : exos.map(e => {
          const color = this._muscleColors[e.muscle_principal] || '#666';
          return `<div style="display:flex;align-items:center;justify-content:space-between;
            padding:9px 12px;background:var(--card-bg);border-radius:8px;gap:10px;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:13px;">${e.nom}</div>
              <div style="font-size:11px;margin-top:1px;">
                <span style="color:${color};font-weight:600;">${e.muscle_principal}</span>
                <span style="color:var(--gray-light);"> · ${equips[e.equipement] || e.equipement}</span>
              </div>
            </div>
            <button class="btn btn-primary btn-small"
              onclick="CoachProgTemplateEditPage.addExoToSeance('${e.id}')">
              ${isSwap ? '↔ Remplacer' : '+ Ajouter'}
            </button>
          </div>`;
        }).join('');
  },

  addExoToSeance(exoId) {
    const exo = this._allExos.find(e => e.id === exoId);
    if (!exo) return;

    if (this._swapTarget !== null) {
      // ── Mode remplacement : garder tous les réglages, changer seulement l'exercice ──
      const { si, ei } = this._swapTarget;
      const current = this.seances[si]?.exercices[ei];
      if (current) {
        current.exercice_id = exoId;
        current.exercice    = exo;
        // id reste null pour forcer une ré-insertion si nécessaire
      }
      document.getElementById('tplExoPicker').innerHTML = '';
      this._swapTarget = null;
      this.renderContent();
      return;
    }

    // ── Mode ajout normal ──
    if (this._picking === null || !this.seances[this._picking]) return;
    const effort = 'reps';
    this.seances[this._picking].exercices.push({
      id:              null,
      exercice_id:     exoId,
      exercice:        exo,
      type_effort:     effort,
      series:          3,
      reps_cible:      '10',
      charge_cible:    '',
      repos_secondes:  90,
      superset_groupe: null,
      notes:           '',
      series_data:     [{reps:'10',charge:''},{reps:'10',charge:''},{reps:'10',charge:''}],
    });

    document.getElementById('tplExoPicker').innerHTML = '';
    this._picking = null;
    this.renderContent();
  },

  // ── Sauvegarde ───────────────────────────────────────────────────────────────

  async save() {
    this._syncFromDOM();
    if (this._saving) return;
    this._saving = true;
    const btn = document.getElementById('tplSaveBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enregistrement…'; }

    try {
      if (this._clientMode) {
        // ── Sauvegarde dans les tables client (sans modifier le template) ──
        await db.saveClientProgrammeSeances(this._clientProgrammeId, this.seances);

        // Recharger pour obtenir les vrais IDs
        const prog = await db.getClientProgrammeActif(this._clientId);
        this.seances = (prog.seances || []).map(s => ({
          id:          s.id,
          nom:         s.nom,
          jour:        s.jour ?? 0,
          notes_coach: s.notes_coach || '',
          exercices:   (s.exercices || []).map(ex => this._mapExo(ex)),
        }));

      } else {
        // ── Sauvegarde template ──
        const nom = this.templateData.nom.trim();
        if (!nom) { alert('Le nom du programme est requis.'); this._saving = false; if (btn) { btn.disabled = false; btn.textContent = '✓ Enregistrer'; } return; }

        const profile = Router.userProfile;
        const tplPayload = {
          nom,
          description: this.templateData.description.trim() || null,
          nb_semaines: parseInt(this.templateData.nb_semaines) || 4,
          coach_id:    profile.id,
          actif:       true,
        };
        if (this.templateId) tplPayload.id = this.templateId;

        const saved = await db.upsertProgTemplate(tplPayload);
        this.templateId = saved.id;
        await db.saveTemplateSeances(this.templateId, this.seances);

        const tpl = await db.getProgTemplateWithSeances(this.templateId);
        this.seances = (tpl.seances || []).map(s => ({
          id:          s.id,
          nom:         s.nom,
          jour:        s.jour ?? 0,
          notes_coach: s.notes_coach || '',
          exercices:   (s.exercices || []).map(ex => this._mapExo(ex)),
        }));
        document.getElementById('tplEditTitle').textContent = nom;
      }

      this._saving = false;
      this.renderContent();

      const flash = document.createElement('div');
      flash.className = 'alert alert-success';
      flash.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;min-width:220px;box-shadow:0 4px 20px rgba(0,0,0,0.15);';
      flash.textContent = '✓ Programme enregistré !';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 2500);

    } catch (e) {
      this._saving = false;
      if (btn) { btn.disabled = false; btn.textContent = '✓ Enregistrer'; }
      alert('Erreur lors de la sauvegarde : ' + e.message);
    }
  }
};
