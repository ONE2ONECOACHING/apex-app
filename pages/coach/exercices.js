// APEX APP — Coach : Bibliothèque d'exercices (desktop-optimized)

const CoachExercicesPage = {
  exercices: [],
  _filter:      'all',   // filtre muscle
  _filterEquip: 'all',   // filtre équipement
  _search: '',
  _editTarget: null,

  _muscles: [
    { key: 'all',        label: 'Tous',            icon: '🔍' },
    { key: 'pectoraux',  label: 'Pectoraux',       icon: '💪' },
    { key: 'dos',        label: 'Dos',             icon: '🏋️' },
    { key: 'epaules',    label: 'Épaules',         icon: '🏋️' },
    { key: 'biceps',     label: 'Biceps',          icon: '💪' },
    { key: 'triceps',    label: 'Triceps',         icon: '💪' },
    { key: 'quadriceps', label: 'Quadriceps',      icon: '🦵' },
    { key: 'ischio',     label: 'Ischio-jambiers', icon: '🦵' },
    { key: 'fessiers',   label: 'Fessiers',        icon: '🍑' },
    { key: 'abdos',      label: 'Abdominaux',      icon: '🎯' },
    { key: 'mollets',    label: 'Mollets',         icon: '🦵' },
    { key: 'cardio',     label: 'Cardio',          icon: '❤️' },
  ],

  // Filtres rapides équipement (barre de filtre)
  _equipFilters: [
    { key: 'all',         label: 'Tous' },
    { key: 'barre',       label: 'Barres' },
    { key: 'halteres',    label: 'Haltères' },
    { key: 'cables',      label: 'Câbles' },
    { key: 'trx',         label: 'TRX' },
    { key: 'poids_corps', label: 'Poids du corps' },
  ],

  // Options complètes dans le formulaire de création/édition
  _equipements: [
    { key: 'poids_corps', label: 'Poids du corps' },
    { key: 'halteres',    label: 'Haltères'        },
    { key: 'barre',       label: 'Barre'           },
    { key: 'cables',      label: 'Câbles'          },
    { key: 'trx',         label: 'TRX'             },
    { key: 'machine',     label: 'Machine'         },
    { key: 'elastiques',  label: 'Élastiques'      },
    { key: 'autres',      label: 'Autres'          },
  ],

  _efforts: [
    { key: 'reps',     label: 'Répétitions' },
    { key: 'temps',    label: 'Temps'       },
    { key: 'amrap',    label: 'AMRAP'       },
    { key: 'distance', label: 'Distance'    },
  ],

  _muscleColors: {
    pectoraux: '#3B82F6', dos: '#8B5CF6',     epaules: '#EC4899',
    biceps:    '#F59E0B', triceps: '#F97316',  quadriceps: '#10B981',
    ischio:    '#06B6D4', fessiers: '#84CC16', abdos: '#EF4444',
    mollets:   '#6366F1', cardio: '#EF4444',
  },

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title">Bibliothèque d'exercices</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#coach-clients'">←</button>
      </div>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">
        <input type="text" class="input" placeholder="🔍 Rechercher un exercice…"
          id="exoSearch" style="flex:1;min-width:200px;height:42px;"
          oninput="CoachExercicesPage._search=this.value;CoachExercicesPage.renderList()">
        <button class="btn btn-primary btn-small" onclick="CoachExercicesPage.openEdit(null)">+ Nouvel exercice</button>
      </div>

      <div id="exoFilters"></div>

      <div id="exoList"></div>
      <div id="exoModal"></div>
      <nav class="nav-bottom"><div class="nav-inner">
        <a class="nav-item" href="#coach-clients"><span class="nav-icon">👥</span><span class="nav-label">Clients</span></a>
        <a class="nav-item" href="#coach-prog-templates"><span class="nav-icon">📋</span><span class="nav-label">Programmes</span></a>
        <a class="nav-item active" href="#coach-exercices"><span class="nav-icon">🏋️</span><span class="nav-label">Exercices</span></a>
      </div></nav>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile || profile.role !== 'coach') { window.location.hash = '#login'; return; }
    this._filter      = 'all';
    this._filterEquip = 'all';
    this._search      = '';
    try {
      this.exercices = await db.getExercicesBdd();
      this.renderFilters();
      this.renderList();
    } catch (e) {
      document.getElementById('exoList').innerHTML = '<div class="alert alert-error">Erreur de chargement.</div>';
    }
  },

  renderFilters() {
    const el = document.getElementById('exoFilters');
    if (!el) return;
    el.innerHTML = `
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-muted);margin-bottom:6px;">Muscle</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
        ${this._muscles.map(m => `
          <button class="rec-kcal-btn${this._filter === m.key ? ' active' : ''}"
            onclick="CoachExercicesPage._filter='${m.key}';CoachExercicesPage.renderFilters();CoachExercicesPage.renderList();">${m.label}</button>
        `).join('')}
      </div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-muted);margin-bottom:6px;">Équipement</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
        ${this._equipFilters.map(e => `
          <button class="rec-kcal-btn${this._filterEquip === e.key ? ' active' : ''}"
            onclick="CoachExercicesPage._filterEquip='${e.key}';CoachExercicesPage.renderFilters();CoachExercicesPage.renderList();">${e.label}</button>
        `).join('')}
      </div>`;
  },

  renderList() {
    const el = document.getElementById('exoList');
    if (!el) return;
    let list = this.exercices;
    if (this._filter !== 'all')      list = list.filter(e => e.muscle_principal === this._filter);
    if (this._filterEquip !== 'all') list = list.filter(e => e.equipement === this._filterEquip);
    if (this._search.trim()) {
      const q = this._search.toLowerCase();
      list = list.filter(e => e.nom.toLowerCase().includes(q));
    }

    if (!list.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">🏋️</div>
        <div class="empty-text">Aucun exercice trouvé.<br>
        <button class="btn btn-primary btn-small" style="margin-top:1rem;"
          onclick="CoachExercicesPage.openEdit(null)">+ Ajouter le premier exercice</button></div></div>`;
      return;
    }

    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;padding-bottom:6rem;">
      ${list.map(ex => this._exoCard(ex)).join('')}
    </div>`;
  },

  _exoCard(ex) {
    const color       = this._muscleColors[ex.muscle_principal] || '#666';
    const muscleLabel = this._muscles.find(m => m.key === ex.muscle_principal)?.label || ex.muscle_principal;
    const equipLabel  = this._equipements.find(e => e.key === ex.equipement)?.label || ex.equipement;
    const ytId        = ex.youtube_url ? this._ytId(ex.youtube_url) : null;

    return `<div class="card" style="padding:14px;margin:0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div style="font-weight:700;font-size:14px;line-height:1.3;flex:1;">${escHtml(ex.nom)}</div>
        <div style="display:flex;gap:4px;flex-shrink:0;">
          <button class="icon-btn" title="Modifier"
            onclick="CoachExercicesPage.openEditById('${ex.id}')">✎</button>
          <button class="icon-btn" title="Supprimer"
            onclick="CoachExercicesPage.deleteExo('${ex.id}','${escJs(ex.nom)}')">×</button>
        </div>
      </div>
      <div style="margin:8px 0 6px;display:flex;flex-wrap:wrap;gap:4px;">
        <span style="font-size:11px;padding:2px 8px;border-radius:12px;background:${color}22;color:${color};font-weight:600;">${muscleLabel}</span>
        <span style="font-size:11px;padding:2px 8px;border-radius:12px;background:var(--card-bg);color:var(--gray-light);">${equipLabel}</span>
      </div>
      ${ex.description ? `<div style="font-size:12px;color:var(--gray);margin-top:4px;line-height:1.5;">${escHtml(ex.description)}</div>` : ''}
      ${ytId ? `
        <div style="position:relative;width:100%;padding-bottom:56.25%;border-radius:8px;
                    overflow:hidden;background:#000;margin-top:10px;">
          <iframe src="https://www.youtube.com/embed/${ytId}?rel=0"
            frameborder="0" loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;">
          </iframe>
        </div>` : ''}
    </div>`;
  },

  _ytId(url) {
    if (!url) return null;
    const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  },

  openEditById(id) {
    const ex = this.exercices.find(e => e.id === id) || null;
    this.openEdit(ex);
  },

  openEdit(ex) {
    this._editTarget = ex;
    this._renderModal();
  },

  _renderModal() {
    const ex = this._editTarget || {};
    document.getElementById('exoModal').innerHTML = `
      <div class="modal-overlay"
        onclick="if(event.target===this)document.getElementById('exoModal').innerHTML=''">
        <div class="modal" style="max-width:500px;">
          <div class="modal-title">
            ${ex.id ? "Modifier l'exercice" : 'Nouvel exercice'}
            <button class="modal-close" onclick="document.getElementById('exoModal').innerHTML=''">×</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px;">

            <div>
              <div class="form-label">Nom</div>
              <input class="input" id="exoNom" value="${escHtml(ex.nom || '')}"
                placeholder="ex : Développé couché">
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <div class="form-label">Groupe musculaire</div>
                <select class="input" id="exoMuscle">
                  ${this._muscles.filter(m => m.key !== 'all').map(m =>
                    `<option value="${m.key}"${(ex.muscle_principal||'pectoraux')===m.key?' selected':''}>${m.label}</option>`
                  ).join('')}
                </select>
              </div>
              <div>
                <div class="form-label">Équipement</div>
                <select class="input" id="exoEquip">
                  ${this._equipements.map(e =>
                    `<option value="${e.key}"${(ex.equipement||'poids_corps')===e.key?' selected':''}>${e.label}</option>`
                  ).join('')}
                </select>
              </div>
            </div>

            <div>
              <div class="form-label">Lien YouTube (optionnel)</div>
              <input class="input" id="exoYT" value="${escHtml(ex.youtube_url || '')}"
                placeholder="https://youtu.be/…">
            </div>

            <div>
              <div class="form-label">Description (optionnel)</div>
              <textarea class="input" id="exoDesc" rows="2"
                style="resize:vertical;">${escHtml(ex.description || '')}</textarea>
            </div>

            <div id="exoSaveErr"></div>
            <button class="btn btn-primary"
              onclick="CoachExercicesPage.saveExo('${ex.id || ''}')">
              ${ex.id ? '✓ Enregistrer' : "+ Créer l'exercice"}
            </button>
          </div>
        </div>
      </div>`;
  },

  async saveExo(id) {
    const nom = document.getElementById('exoNom').value.trim();
    if (!nom) {
      document.getElementById('exoSaveErr').innerHTML =
        '<div class="alert alert-error">Le nom est requis.</div>';
      return;
    }
    const payload = {
      nom,
      muscle_principal: document.getElementById('exoMuscle').value,
      equipement:       document.getElementById('exoEquip').value,
      youtube_url:      document.getElementById('exoYT').value.trim() || null,
      description:      document.getElementById('exoDesc').value.trim() || null,
    };
    if (id) payload.id = id;

    try {
      const saved = await db.upsertExercice(payload);
      document.getElementById('exoModal').innerHTML = '';
      if (id) {
        const idx = this.exercices.findIndex(e => e.id === id);
        if (idx >= 0) this.exercices[idx] = saved;
        else this.exercices.push(saved);
      } else {
        this.exercices.push(saved);
        this.exercices.sort((a, b) =>
          a.muscle_principal.localeCompare(b.muscle_principal) || a.nom.localeCompare(b.nom));
      }
      this.renderList();
    } catch (e) {
      document.getElementById('exoSaveErr').innerHTML =
        `<div class="alert alert-error">${e.message}</div>`;
    }
  },

  async deleteExo(id, nom) {
    if (!confirm(`Supprimer "${nom}" ?`)) return;
    try {
      await db.deleteExercice(id);
      this.exercices = this.exercices.filter(e => e.id !== id);
      this.renderList();
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  }
};
