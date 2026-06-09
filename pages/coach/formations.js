// APEX APP — Coach : Gestion des formations en ligne

const CoachFormationsPage = {
  formations: [],
  clients: [],
  assignations: [], // [{ client_id, formation_id }]
  _modal: null,

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title">Formations</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#coach-clients'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
      <div id="fContent"><div class="spinner" style="margin-top:2rem;"></div></div>
      <div id="fModal"></div>`;
  },

  async init() {
    this.formations  = [];
    this.clients     = [];
    this.assignations = [];

    const profile = Router.userProfile;
    if (!profile || profile.role !== 'coach') { window.location.hash = '#coach-clients'; return; }

    try {
      [this.formations, this.clients, this.assignations] = await Promise.all([
        db.getFormations(profile.id),
        db.getAllClients(),
        db.getFormationAssignations(profile.id).catch(() => []),
      ]);
      this._renderList();
    } catch (e) {
      document.getElementById('fContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  _renderList() {
    const el = document.getElementById('fContent');
    let html = `<button class="btn btn-primary" style="margin-bottom:1rem;" onclick="CoachFormationsPage._openFormationModal()">+ Créer une formation</button>`;

    if (this.formations.length === 0) {
      html += `<div class="empty-state"><div class="empty-icon">📚</div>
        <div class="empty-text">Aucune formation créée.<br>Crée ta première formation ci-dessus.</div></div>`;
    } else {
      this.formations.forEach(f => {
        const nbModules = (f.formation_modules || []).length;
        const nbLecons  = (f.formation_modules || []).reduce((s, m) => s + (m.formation_lecons || []).length, 0);
        const assigned  = this.assignations.filter(a => a.formation_id === f.id).length;

        html += `
          <div class="card" style="margin-bottom:1rem;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
              <div>
                <div style="font-size:16px;font-weight:700;">
                  📚 ${f.titre}
                </div>
                ${f.description ? `<div style="font-size:13px;color:var(--gray-muted);margin-top:3px;">${f.description}</div>` : ''}
                <div style="font-size:12px;color:var(--gray-muted);margin-top:5px;">
                  ${nbModules} module${nbModules !== 1 ? 's' : ''} · ${nbLecons} leçon${nbLecons !== 1 ? 's' : ''} · ${assigned} client${assigned !== 1 ? 's' : ''} assigné${assigned !== 1 ? 's' : ''}
                </div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;">
                <button class="btn btn-secondary btn-small" onclick="CoachFormationsPage._openAssignModal('${f.id}')">👥 Assigner</button>
                <button class="btn btn-secondary btn-small" onclick="CoachFormationsPage._openEditorModal('${f.id}')">✏️ Éditer</button>
                <button class="btn btn-ghost btn-small" style="color:var(--error);" onclick="CoachFormationsPage._deleteFormation('${f.id}')">×</button>
              </div>
            </div>

            <!-- Modules aperçu -->
            ${(f.formation_modules || []).map(m => `
              <div style="background:var(--card-bg);border-radius:10px;padding:10px 12px;margin-bottom:6px;">
                <div style="font-size:13px;font-weight:600;color:var(--black);margin-bottom:4px;">
                  📂 ${m.titre}
                  <span style="font-size:11px;font-weight:400;color:var(--gray-muted);margin-left:6px;">${(m.formation_lecons||[]).length} leçon${(m.formation_lecons||[]).length !== 1 ? 's' : ''}</span>
                </div>
                ${(m.formation_lecons || []).map(l => `
                  <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-top:1px solid var(--border);">
                    <span style="font-size:14px;">${l.youtube_url ? '▶' : '📄'}</span>
                    <span style="font-size:13px;color:var(--gray);">${l.titre}</span>
                    ${l.duree_min ? `<span style="font-size:11px;color:var(--gray-muted);margin-left:auto;">${l.duree_min} min</span>` : ''}
                  </div>`).join('')}
              </div>`).join('')}
          </div>`;
      });
    }

    el.innerHTML = html;
  },

  // ── Modal création/édition formation ────────────────────────────────────
  _openFormationModal(formationId) {
    const f = formationId ? this.formations.find(x => x.id === formationId) : null;
    document.getElementById('fModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('fModal').innerHTML=''">
        <div class="modal">
          <div class="modal-title">${f ? 'Modifier' : 'Nouvelle'} formation
            <button class="modal-close" onclick="document.getElementById('fModal').innerHTML=''">×</button>
          </div>
          <div class="field">
            <label class="field-label">Titre</label>
            <input class="input" id="fTitre" value="${f?.titre || ''}" placeholder="ex: Formation HOMMES">
          </div>
          <div class="field">
            <label class="field-label">Description (optionnel)</label>
            <textarea class="input" id="fDesc" rows="2" style="resize:none;">${f?.description || ''}</textarea>
          </div>
          <div id="fModalMsg"></div>
          <button class="btn btn-primary" onclick="CoachFormationsPage._saveFormation('${f?.id || ''}')">
            💾 ${f ? 'Enregistrer' : 'Créer la formation'}
          </button>
        </div>
      </div>`;
  },

  async _saveFormation(id) {
    const titre = document.getElementById('fTitre').value.trim();
    if (!titre) { document.getElementById('fModalMsg').innerHTML = '<div class="alert alert-error">Titre requis.</div>'; return; }
    const payload = {
      titre, description: document.getElementById('fDesc').value.trim(),
      coach_id: Router.userProfile.id,
      ...(id ? { id } : {})
    };
    try {
      const saved = await db.upsertFormation(payload);
      if (id) {
        const idx = this.formations.findIndex(f => f.id === saved.id);
        if (idx >= 0) this.formations[idx] = { ...this.formations[idx], ...saved };
      } else {
        this.formations.push({ ...saved, formation_modules: [] });
      }
      document.getElementById('fModal').innerHTML = '';
      this._renderList();
      toast('✓ Formation enregistrée', 'success');
    } catch (e) { document.getElementById('fModalMsg').innerHTML = '<div class="alert alert-error">' + e.message + '</div>'; }
  },

  async _deleteFormation(id) {
    if (!confirm('Supprimer cette formation ? Toutes les leçons seront supprimées.')) return;
    try {
      await db.deleteFormation(id);
      this.formations = this.formations.filter(f => f.id !== id);
      this._renderList();
      toast('Formation supprimée', 'info');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  // ── Modal éditeur de contenu ─────────────────────────────────────────────
  _openEditorModal(formationId) {
    const f = this.formations.find(x => x.id === formationId);
    if (!f) return;
    this._renderEditorModal(f);
  },

  _renderEditorModal(f) {
    const modules = f.formation_modules || [];
    document.getElementById('fModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('fModal').innerHTML=''">
        <div class="modal" style="max-height:88vh;padding-bottom:calc(1.5rem + env(safe-area-inset-bottom,12px));">
          <div class="modal-title">✏️ ${f.titre}
            <button class="modal-close" onclick="document.getElementById('fModal').innerHTML=''">×</button>
          </div>

          ${modules.map((m, mi) => `
            <div class="card card-accent" style="margin-bottom:10px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div style="font-size:14px;font-weight:700;">📂 ${m.titre}</div>
                <div style="display:flex;gap:5px;">
                  <button class="btn btn-ghost btn-small" onclick="CoachFormationsPage._addLecon('${f.id}','${m.id}')">+ Leçon</button>
                  <button class="btn btn-ghost btn-small" style="color:var(--error);" onclick="CoachFormationsPage._deleteModule('${f.id}','${m.id}')">×</button>
                </div>
              </div>
              ${(m.formation_lecons || []).map((l, li) => `
                <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--border);">
                  <span>${l.type==='quizz'?'🧠':l.youtube_url?'▶':'📄'}</span>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:500;">${l.titre}
                      <span style="font-size:10px;font-weight:600;padding:1px 6px;border-radius:6px;margin-left:4px;
                        background:${l.type==='quizz'?'#8B5CF622':'#3B82F622'};
                        color:${l.type==='quizz'?'#8B5CF6':'#3B82F6'};">${l.type==='quizz'?'Quizz':'Leçon'}</span>
                    </div>
                    ${l.type==='quizz'
                      ? `<div style="font-size:11px;color:var(--gray-muted);">${(l.questions||[]).length} question${(l.questions||[]).length!==1?'s':''}</div>`
                      : l.youtube_url ? `<div style="font-size:11px;color:var(--gray-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.youtube_url}</div>` : ''}
                  </div>
                  <button class="btn btn-ghost btn-small" onclick="CoachFormationsPage._editLecon('${f.id}','${m.id}','${l.id}')">✏️</button>
                  <button class="btn btn-ghost btn-small" style="color:var(--error);" onclick="CoachFormationsPage._deleteLecon('${f.id}','${m.id}','${l.id}')">×</button>
                </div>`).join('')}
            </div>`).join('')}

          <button class="btn btn-secondary" style="height:44px;margin-bottom:0.5rem;"
            onclick="CoachFormationsPage._addModule('${f.id}')">+ Ajouter un module</button>
          <button class="btn btn-ghost btn-small" style="width:100%;"
            onclick="CoachFormationsPage._openFormationModal('${f.id}')">✏️ Modifier les infos</button>
        </div>
      </div>`;
  },

  _addModule(formationId) {
    const f = this.formations.find(x => x.id === formationId);
    // Overlay par-dessus le modal éditeur
    const overlay = document.createElement('div');
    overlay.id = 'fModuleOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:var(--white);border-radius:20px 20px 0 0;width:100%;max-width:680px;padding:1.5rem;
                  padding-bottom:calc(1.5rem + env(safe-area-inset-bottom));box-shadow:0 -4px 32px rgba(0,0,0,.12);">
        <div style="font-size:17px;font-weight:700;margin-bottom:1.25rem;">Nouveau module</div>
        <div class="field">
          <label class="field-label">Nom du module</label>
          <input class="input" id="fModuleTitre" placeholder="ex: Module 1 — Nutrition de base" autofocus>
        </div>
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button class="btn btn-secondary" style="flex:1;height:44px;"
            onclick="document.getElementById('fModuleOverlay').remove()">Annuler</button>
          <button class="btn btn-primary" style="flex:1;height:44px;"
            onclick="CoachFormationsPage._confirmAddModule('${formationId}')">✓ Créer</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('fModuleTitre')?.focus(), 50);
  },

  async _confirmAddModule(formationId) {
    const titre = document.getElementById('fModuleTitre')?.value.trim();
    if (!titre) return;
    document.getElementById('fModuleOverlay')?.remove();
    const f = this.formations.find(x => x.id === formationId);
    const ordre = (f.formation_modules || []).length;
    try {
      const saved = await db.upsertFormationModule({ formation_id: formationId, titre, ordre });
      f.formation_modules = [...(f.formation_modules || []), { ...saved, formation_lecons: [] }];
      this._renderEditorModal(f);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  async _deleteModule(formationId, moduleId) {
    if (!confirm('Supprimer ce module et toutes ses leçons ?')) return;
    const f = this.formations.find(x => x.id === formationId);
    try {
      await db.deleteFormationModule(moduleId);
      f.formation_modules = f.formation_modules.filter(m => m.id !== moduleId);
      this._renderEditorModal(f);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  _openLeconForm(formationId, moduleId, lecon) {
    const f    = this.formations.find(x => x.id === formationId);
    const m    = f?.formation_modules?.find(x => x.id === moduleId);
    if (!m) return;
    const type = lecon?.type || 'lecon';
    // questions pour le quizz
    this._quizzQuestions = lecon?.type === 'quizz' ? JSON.parse(JSON.stringify(lecon.questions || [])) : [];
    this._leconFormCtx   = { formationId, moduleId, leconId: lecon?.id || '' };

    document.getElementById('fModal').innerHTML = `
      <div class="modal-overlay" onclick="">
        <div class="modal" style="max-height:90vh;overflow-y:auto;padding-bottom:calc(1.5rem + env(safe-area-inset-bottom));">
          <div class="modal-title">${lecon ? 'Modifier' : 'Nouveau contenu'}
            <button class="modal-close" onclick="CoachFormationsPage._renderEditorModal(CoachFormationsPage.formations.find(x=>x.id==='${formationId}'))">←</button>
          </div>

          <!-- Type selector -->
          <div class="field">
            <label class="field-label">Type</label>
            <div style="display:flex;gap:8px;">
              <button id="lTypeLecon" onclick="CoachFormationsPage._switchLeconType('lecon')"
                class="btn ${type==='lecon'?'btn-primary':'btn-secondary'}" style="flex:1;height:44px;">
                🎬 Leçon
              </button>
              <button id="lTypeQuizz" onclick="CoachFormationsPage._switchLeconType('quizz')"
                class="btn ${type==='quizz'?'btn-primary':'btn-secondary'}" style="flex:1;height:44px;">
                🧠 Quizz
              </button>
            </div>
          </div>

          <div class="field">
            <label class="field-label">Titre</label>
            <input class="input" id="lTitre" value="${lecon?.titre || ''}" placeholder="ex: Introduction à la nutrition">
          </div>

          <!-- Champs Leçon -->
          <div id="lLeconFields" style="display:${type==='lecon'?'block':'none'}">
            <div class="field">
              <label class="field-label">URL YouTube</label>
              <input class="input" id="lYoutube" value="${lecon?.youtube_url || ''}" placeholder="https://youtu.be/...">
            </div>
            <div class="field">
              <label class="field-label">Description / Texte (optionnel)</label>
              <textarea class="input" id="lDesc" rows="14" style="resize:vertical;min-height:220px;">${lecon?.description || ''}</textarea>
            </div>
            <div class="field">
              <label class="field-label">Durée (min)</label>
              <input class="input" id="lDuree" type="number" value="${lecon?.duree_min || ''}" placeholder="ex: 15">
            </div>
          </div>

          <!-- Constructeur Quizz -->
          <div id="lQuizzFields" style="display:${type==='quizz'?'block':'none'}">
            <div id="lQuizzList"></div>
            <button class="btn btn-secondary" style="height:44px;margin-top:8px;"
              onclick="CoachFormationsPage._addQuestion()">+ Ajouter une question</button>
          </div>

          <div id="lMsg" style="margin-top:8px;"></div>
          <button class="btn btn-primary" style="margin-top:12px;"
            onclick="CoachFormationsPage._saveLecon('${formationId}','${moduleId}','${lecon?.id||''}')">
            💾 ${lecon ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>`;

    if (type === 'quizz') this._renderQuizzList();
  },

  _currentLeconType() {
    const btn = document.getElementById('lTypeLecon');
    return btn && btn.classList.contains('btn-primary') ? 'lecon' : 'quizz';
  },

  _switchLeconType(type) {
    document.getElementById('lLeconFields').style.display = type === 'lecon' ? 'block' : 'none';
    document.getElementById('lQuizzFields').style.display = type === 'quizz' ? 'block' : 'none';
    document.getElementById('lTypeLecon').className = 'btn ' + (type === 'lecon' ? 'btn-primary' : 'btn-secondary');
    document.getElementById('lTypeQuizz').className = 'btn ' + (type === 'quizz' ? 'btn-primary' : 'btn-secondary');
    document.getElementById('lTypeLecon').style.flex = '1';
    document.getElementById('lTypeLecon').style.height = '44px';
    document.getElementById('lTypeQuizz').style.flex = '1';
    document.getElementById('lTypeQuizz').style.height = '44px';
    if (type === 'quizz') this._renderQuizzList();
  },

  _renderQuizzList() {
    const el = document.getElementById('lQuizzList');
    if (!el) return;
    const qs = this._quizzQuestions;
    if (qs.length === 0) {
      el.innerHTML = `<div style="font-size:13px;color:var(--gray-muted);padding:8px 0;">Aucune question. Clique sur + pour en ajouter.</div>`;
      return;
    }
    el.innerHTML = qs.map((q, qi) => `
      <div class="card card-accent" style="margin-bottom:8px;padding:10px 12px;">
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
          <div style="font-size:13px;font-weight:700;color:var(--gold);min-width:20px;">Q${qi+1}</div>
          <input class="input" style="height:38px;font-size:13px;" value="${q.question.replace(/"/g,'&quot;')}"
            oninput="CoachFormationsPage._quizzQuestions[${qi}].question=this.value"
            placeholder="Ta question…">
          <button class="btn btn-ghost btn-small" style="color:var(--error);flex-shrink:0;"
            onclick="CoachFormationsPage._removeQuestion(${qi})">×</button>
        </div>
        ${q.options.map((o, oi) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
            <input type="radio" name="correct_${qi}" ${o.correct?'checked':''}
              onchange="CoachFormationsPage._setCorrect(${qi},${oi})"
              style="width:16px;height:16px;accent-color:var(--gold);flex-shrink:0;">
            <input class="input" style="height:34px;font-size:13px;flex:1;" value="${o.text.replace(/"/g,'&quot;')}"
              oninput="CoachFormationsPage._quizzQuestions[${qi}].options[${oi}].text=this.value"
              placeholder="Option ${oi+1}…">
            ${q.options.length > 2 ? `<button class="btn btn-ghost btn-small" style="color:var(--error);flex-shrink:0;"
              onclick="CoachFormationsPage._removeOption(${qi},${oi})">×</button>` : ''}
          </div>`).join('')}
        ${q.options.length < 4 ? `
          <button class="btn btn-ghost btn-small" style="font-size:12px;margin-top:4px;"
            onclick="CoachFormationsPage._addOption(${qi})">+ Option</button>` : ''}
        <div style="margin-top:8px;">
          <input class="input" style="height:32px;font-size:12px;" value="${(q.explication||'').replace(/"/g,'&quot;')}"
            oninput="CoachFormationsPage._quizzQuestions[${qi}].explication=this.value"
            placeholder="Explication de la bonne réponse (optionnel)">
        </div>
      </div>`).join('');
  },

  _addQuestion() {
    this._quizzQuestions.push({
      id: 'q_' + Date.now(),
      question: '',
      options: [{ text: '', correct: true }, { text: '', correct: false }],
      explication: ''
    });
    this._renderQuizzList();
    document.getElementById('lQuizzList')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  },

  _removeQuestion(qi) {
    this._quizzQuestions.splice(qi, 1);
    this._renderQuizzList();
  },

  _addOption(qi) {
    this._quizzQuestions[qi].options.push({ text: '', correct: false });
    this._renderQuizzList();
  },

  _removeOption(qi, oi) {
    this._quizzQuestions[qi].options.splice(oi, 1);
    this._renderQuizzList();
  },

  _setCorrect(qi, oi) {
    this._quizzQuestions[qi].options.forEach((o, i) => { o.correct = i === oi; });
  },

  _addLecon(formationId, moduleId) { this._openLeconForm(formationId, moduleId, null); },
  _editLecon(formationId, moduleId, leconId) {
    const f = this.formations.find(x => x.id === formationId);
    const m = f?.formation_modules?.find(x => x.id === moduleId);
    const l = m?.formation_lecons?.find(x => x.id === leconId);
    if (l) this._openLeconForm(formationId, moduleId, l);
  },

  async _saveLecon(formationId, moduleId, leconId) {
    const titre = document.getElementById('lTitre')?.value.trim();
    if (!titre) { document.getElementById('lMsg').innerHTML = '<div class="alert alert-error">Titre requis.</div>'; return; }
    const type = this._currentLeconType();
    const f    = this.formations.find(x => x.id === formationId);
    const m    = f?.formation_modules?.find(x => x.id === moduleId);
    const ordre = leconId ? (m?.formation_lecons?.find(l => l.id === leconId)?.ordre ?? 0) : (m?.formation_lecons || []).length;

    // Validation quizz
    if (type === 'quizz') {
      const qs = this._quizzQuestions;
      if (qs.length === 0) { document.getElementById('lMsg').innerHTML = '<div class="alert alert-error">Ajoute au moins une question.</div>'; return; }
      for (const q of qs) {
        if (!q.question.trim()) { document.getElementById('lMsg').innerHTML = '<div class="alert alert-error">Une question est vide.</div>'; return; }
        if (!q.options.some(o => o.correct)) { document.getElementById('lMsg').innerHTML = '<div class="alert alert-error">Chaque question doit avoir une bonne réponse sélectionnée.</div>'; return; }
      }
    }

    const payload = {
      module_id:   moduleId,
      titre,
      type,
      youtube_url: type === 'lecon' ? (document.getElementById('lYoutube')?.value.trim() || null) : null,
      description: type === 'lecon' ? (document.getElementById('lDesc')?.value.trim() || null) : null,
      duree_min:   type === 'lecon' ? (parseInt(document.getElementById('lDuree')?.value) || null) : null,
      questions:   type === 'quizz' ? this._quizzQuestions : [],
      ordre,
      ...(leconId ? { id: leconId } : {})
    };
    try {
      const saved = await db.upsertFormationLecon(payload);
      if (leconId) {
        const idx = m.formation_lecons.findIndex(l => l.id === saved.id);
        if (idx >= 0) m.formation_lecons[idx] = saved;
      } else {
        m.formation_lecons = [...(m.formation_lecons || []), saved];
      }
      this._renderEditorModal(f);
      toast('✓ ' + (type === 'quizz' ? 'Quizz' : 'Leçon') + ' enregistré(e)', 'success');
    } catch (e) { document.getElementById('lMsg').innerHTML = '<div class="alert alert-error">' + e.message + '</div>'; }
  },

  async _deleteLecon(formationId, moduleId, leconId) {
    const f = this.formations.find(x => x.id === formationId);
    const m = f?.formation_modules?.find(x => x.id === moduleId);
    try {
      await db.deleteFormationLecon(leconId);
      m.formation_lecons = m.formation_lecons.filter(l => l.id !== leconId);
      this._renderEditorModal(f);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  // ── Modal assignation ────────────────────────────────────────────────────
  _openAssignModal(formationId) {
    const f        = this.formations.find(x => x.id === formationId);
    const assigned = this.assignations.filter(a => a.formation_id === formationId).map(a => a.client_id);

    document.getElementById('fModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('fModal').innerHTML=''">
        <div class="modal" style="max-height:88vh;">
          <div class="modal-title">👥 Assigner — ${f.titre}
            <button class="modal-close" onclick="document.getElementById('fModal').innerHTML=''">×</button>
          </div>
          <div style="font-size:12px;color:var(--gray-muted);margin-bottom:12px;">
            Coche les clients qui doivent avoir accès à cette formation.
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow-y:auto;">
            ${this.clients.map(c => {
              const isAssigned = assigned.includes(c.id);
              const initials = ((c.prenom||'C')[0]+(c.nom?c.nom[0]:'')).toUpperCase();
              return `
                <label style="display:flex;align-items:center;gap:12px;padding:10px 12px;
                               background:${isAssigned ? 'var(--gold-light)' : 'var(--card-bg)'};
                               border:1.5px solid ${isAssigned ? 'var(--gold-border)' : 'var(--border-solid)'};
                               border-radius:12px;cursor:pointer;">
                  <input type="checkbox" ${isAssigned ? 'checked' : ''}
                    onchange="CoachFormationsPage._toggleAssign(this,'${c.id}','${formationId}')"
                    style="width:18px;height:18px;accent-color:var(--gold);flex-shrink:0;">
                  <div class="client-avatar" style="width:32px;height:32px;font-size:11px;flex-shrink:0;">${initials}</div>
                  <div style="flex:1;">
                    <div style="font-size:14px;font-weight:600;">${c.prenom} ${c.nom || ''}</div>
                    ${c.coach_tag ? `<div style="font-size:11px;color:var(--gray-muted);">${c.coach_tag}</div>` : ''}
                  </div>
                </label>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  },

  async _toggleAssign(checkbox, clientId, formationId) {
    try {
      if (checkbox.checked) {
        await db.assignFormation(clientId, formationId, Router.userProfile.id);
        if (!this.assignations.find(a => a.client_id === clientId && a.formation_id === formationId)) {
          this.assignations.push({ client_id: clientId, formation_id: formationId });
        }
        toast('Formation assignée', 'success');
      } else {
        await db.unassignFormation(clientId, formationId);
        this.assignations = this.assignations.filter(a => !(a.client_id === clientId && a.formation_id === formationId));
        toast('Formation retirée', 'info');
      }
    } catch (e) {
      checkbox.checked = !checkbox.checked;
      toast('Erreur : ' + e.message, 'error');
    }
  }
};
