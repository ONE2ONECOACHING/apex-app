// APEX APP — Plan Alimentaire Client (lecture + équivalences)

const PlanPage = {
  plan: null,
  repas: [],
  creneaux: ['petit_dejeuner_sale', 'petit_dejeuner_sucre', 'collation_matin', 'dejeuner', 'collation_apres_midi', 'diner', 'collation_soir'],

  // ── État remplacement ─────────────────────────────────────────────────
  _replacements: {},   // { repasId: { nom, quantite, calories, proteines, glucides, lipides } }
  _replaceTarget: null,

  // ── Données équivalences (pour 100g) ─────────────────────────────────
  _feculents: [
    { nom: 'Riz blanc',         kcal: 350, p: 7,   g: 77, l: 0.6 },
    { nom: 'Pâtes',             kcal: 370, p: 13,  g: 72, l: 1.5 },
    { nom: 'Patate douce',      kcal: 86,  p: 1.6, g: 20, l: 0.1 },
    { nom: 'Pomme de terre',    kcal: 77,  p: 2,   g: 17, l: 0.1 },
    { nom: 'Quinoa sec',        kcal: 368, p: 14,  g: 64, l: 6   },
    { nom: 'Flocons d\'avoine', kcal: 389, p: 17,  g: 66, l: 7   },
    { nom: 'Semoule',           kcal: 360, p: 12,  g: 73, l: 1   },
    { nom: 'Lentilles',         kcal: 353, p: 24,  g: 60, l: 1.1 },
    { nom: 'Pain complet',      kcal: 247, p: 9,   g: 41, l: 3.5 },
  ],
  _proteines: [
    { nom: 'Blanc de poulet',     kcal: 110, p: 23, g: 0,   l: 1.5 },
    { nom: 'Bœuf haché (5%)',    kcal: 121, p: 21, g: 0,   l: 4   },
    { nom: 'Saumon',              kcal: 208, p: 20, g: 0,   l: 13  },
    { nom: 'Thon (boîte nature)', kcal: 116, p: 26, g: 0,   l: 1   },
    { nom: 'Cabillaud',           kcal: 82,  p: 18, g: 0,   l: 0.7 },
    { nom: 'Dinde',               kcal: 107, p: 24, g: 0,   l: 1   },
    { nom: 'Œufs',                kcal: 155, p: 13, g: 1.1, l: 11  },
    { nom: 'Crevettes',           kcal: 99,  p: 21, g: 0,   l: 1   },
    { nom: 'Jambon blanc',        kcal: 105, p: 18, g: 0.8, l: 3   },
    { nom: 'Tofu ferme',          kcal: 76,  p: 8,  g: 1.9, l: 4.8 },
  ],
  _legumes: [
    { nom: 'Brocolis',       kcal: 34, p: 2.8, g: 7,   l: 0.4 },
    { nom: 'Courgettes',     kcal: 17, p: 1.2, g: 3.1, l: 0.3 },
    { nom: 'Haricots verts', kcal: 31, p: 1.8, g: 7,   l: 0.1 },
    { nom: 'Épinards',       kcal: 23, p: 2.9, g: 3.6, l: 0.4 },
    { nom: 'Salade verte',   kcal: 15, p: 1.2, g: 2.2, l: 0.3 },
    { nom: 'Tomates',        kcal: 18, p: 0.9, g: 3.9, l: 0.2 },
    { nom: 'Carottes',       kcal: 41, p: 0.9, g: 10,  l: 0.2 },
    { nom: 'Champignons',    kcal: 22, p: 3.1, g: 3.3, l: 0.3 },
    { nom: 'Poivrons',       kcal: 31, p: 1,   g: 6,   l: 0.3 },
    { nom: 'Asperges',       kcal: 20, p: 2.2, g: 3.9, l: 0.1 },
    { nom: 'Chou-fleur',     kcal: 25, p: 1.9, g: 5,   l: 0.3 },
    { nom: 'Concombre',      kcal: 16, p: 0.7, g: 3.6, l: 0.1 },
  ],

  // ── Détection automatique de catégorie ───────────────────────────────
  _detectCategory(r) {
    const totalKcal = r.proteines * 4 + r.glucides * 4 + r.lipides * 9;
    if (!totalKcal || totalKcal < 1) return null;
    const pctG = r.glucides  * 4 / totalKcal;
    const pctP = r.proteines * 4 / totalKcal;
    // Légume : peu de calories absolues + peu de glucides
    if (r.calories < 80 && r.glucides < 15) return 'legumes';
    // Féculent : glucides dominants (> 50% des calories)
    if (pctG > 0.50) return 'feculents';
    // Protéine : protéines dominantes (> 30% des calories)
    if (pctP > 0.30) return 'proteines';
    return null;
  },

  _catMeta(cat) {
    return {
      feculents: { icon: '🍚', label: 'Féculent',  color: '#C4820A', list: this._feculents },
      proteines: { icon: '🥩', label: 'Protéine',  color: '#3B82F6', list: this._proteines },
      legumes:   { icon: '🥦', label: 'Légume',    color: '#16A34A', list: this._legumes   },
    }[cat];
  },

  // ── Render shell ─────────────────────────────────────────────────────
  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE</div>
          <div class="app-title">Mon plan alimentaire</div>
        </div>
        <button class="header-btn" onclick="Router.confirmLogout()">⏻</button>
      </div>
      <div class="tabs" style="margin-bottom:1rem;">
        <button class="tab" onclick="window.location.hash='#logbook'">📖 Logbook</button>
        <button class="tab active" onclick="window.location.hash='#plan'">📋 Plan</button>
        <button class="tab" onclick="window.location.hash='#recettes'">🍽️ Recettes</button>
      </div>
      <div id="planContent"><div class="spinner" style="margin-top:3rem;"></div></div>
      <div id="planReplaceModal"></div>
      ${clientNav('logbook')}`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile) return;
    this._replacements  = {};
    this._replaceTarget = null;
    this.plan           = null;
    this.repas          = [];
    try {
      this.plan  = await db.getActivePlan(profile.id);
      if (this.plan) this.repas = await db.getPlanRepas(this.plan.id);
      this.renderContent();
    } catch (e) {
      document.getElementById('planContent').innerHTML =
        '<div class="alert alert-error">Erreur de chargement.</div>';
    }
  },

  // ── Render contenu ───────────────────────────────────────────────────
  renderContent() {
    const el = document.getElementById('planContent');
    if (!this.plan) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div>
        <div class="empty-text">Ton coach n'a pas encore créé ton plan alimentaire.<br>Il sera visible ici dès qu'il sera prêt.</div></div>`;
      return;
    }

    let html = '';

    // Objectifs
    html += `<div class="card card-dark">
      <div class="card-title">Objectifs${this.plan.phase ? ' — ' + this.plan.phase.charAt(0).toUpperCase() + this.plan.phase.slice(1) : ''}</div>
      <div class="macros-big">
        <span class="macros-big-val">${this.plan.calories_cible.toLocaleString('fr-FR')}</span>
        <span class="macros-big-unit">kcal / jour</span>
      </div>
      <div class="macros-grid" style="margin-top:12px;">
        <div class="macro-item"><div class="macro-val">${this.plan.proteines_cible}g</div><div class="macro-label">Protéines</div></div>
        <div class="macro-item"><div class="macro-val">${this.plan.glucides_cible}g</div><div class="macro-label">Glucides</div></div>
        <div class="macro-item"><div class="macro-val">${this.plan.lipides_cible}g</div><div class="macro-label">Lipides</div></div>
      </div>
    </div>`;

    if (this.plan.notes) {
      html += `<div class="card card-accent">
        <div style="font-size:13px;color:var(--gray);line-height:1.6;">💡 ${this.plan.notes}</div>
      </div>`;
    }

    // Repas par créneau
    this.creneaux.forEach(cr => {
      const items = this.repas.filter(r => r.creneau === cr);
      if (items.length === 0) return;

      const canReplace = (cr === 'dejeuner' || cr === 'diner');

      // Total kcal tenant compte des remplacements
      const crKcal = Math.round(items.reduce((s, r) => {
        const repl = this._replacements[r.id];
        return s + parseFloat(repl ? repl.calories : r.calories);
      }, 0));

      // Séparateur OU petit-déj
      if (cr === 'petit_dejeuner_sucre' && this.repas.some(r => r.creneau === 'petit_dejeuner_sale')) {
        html += `<div style="text-align:center;font-size:12px;font-weight:700;color:var(--gray-muted);letter-spacing:0.1em;margin:4px 0;">— OU —</div>`;
      }

      html += `<div class="creneau-section">
        <div class="creneau-header">
          <div class="creneau-title">${creneauLabel(cr)}</div>
          <div class="creneau-kcal">${crKcal} kcal</div>
        </div>`;

      // Mapper petit_dejeuner_sale/sucre → petit_dejeuner pour le logbook
      const crLogbook = (cr === 'petit_dejeuner_sale' || cr === 'petit_dejeuner_sucre')
        ? 'petit_dejeuner' : cr;

      items.forEach(r => {
        const repl  = this._replacements[r.id];
        const nom   = repl ? repl.nom      : r.aliment_nom;
        const qty   = repl ? repl.quantite : r.quantite;
        const cal   = Math.round(repl ? repl.calories  : r.calories);
        const prot  = Math.round(repl ? repl.proteines : r.proteines);
        const gluc  = Math.round(repl ? repl.glucides  : r.glucides);
        const lip   = Math.round(repl ? repl.lipides   : r.lipides);
        const unite = (repl ? 'g' : r.unite) === 'g' ? 'g' : ' unité(s)';

        // Bouton remplacer selon catégorie détectée
        let replaceBtnHtml = '';
        if (canReplace) {
          const cat  = this._detectCategory(r);
          const meta = cat ? this._catMeta(cat) : null;
          if (meta) {
            replaceBtnHtml = `<button class="replace-btn" title="Remplacer"
              onclick="PlanPage.openReplace('${r.id}',${r.calories},'${r.aliment_nom.replace(/'/g,"\\'")}','${cat}')">
              ↔
            </button>`;
          }
        }

        html += `<div class="entry-row${repl ? ' entry-replaced' : ''}">
          <div class="entry-info">
            <div class="entry-name">
              ${nom}${repl ? ` <span class="replace-badge">${this._catMeta(this._detectCategory(r) || 'feculents')?.icon || '↔'}</span>` : ''}
            </div>
            <div class="entry-macros">${qty}${unite} · P:${prot}g · G:${gluc}g · L:${lip}g</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div class="entry-kcal">${cal}</div>
            ${replaceBtnHtml}
          </div>
        </div>
        ${repl ? `<div style="text-align:right;margin-top:-4px;margin-bottom:6px;">
          <button onclick="PlanPage.revert('${r.id}')"
            style="font-size:11px;color:var(--gray-muted);background:none;border:none;cursor:pointer;padding:2px 4px;">
            ↩ Rétablir "${r.aliment_nom}"
          </button></div>` : ''}`;
      });

      html += `
        <button class="add-meal-btn" id="logBtn-${cr}"
          onclick="PlanPage.addCreneauToJournal('${cr}','${crLogbook}')">
          📖 Ajouter au journal
        </button>
      </div>`;
    });

    el.innerHTML = html;
  },

  // ── Ajouter repas au journal ─────────────────────────────────────────

  async addCreneauToJournal(cr, crLogbook) {
    const profile = Router.userProfile;
    if (!profile) return;
    const items = this.repas.filter(r => r.creneau === cr);
    if (!items.length) return;

    const btn = document.getElementById('logBtn-' + cr);
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Ajout…'; }

    try {
      for (const r of items) {
        const repl = this._replacements[r.id];
        await db.addJournalEntry({
          profile_id:  profile.id,
          date_entree: todayStr(),
          creneau:     crLogbook,
          nom:         repl ? repl.nom      : r.aliment_nom,
          quantite:    repl ? repl.quantite : r.quantite,
          unite:       repl ? 'g'           : (r.unite || 'g'),
          calories:    Math.round(repl ? repl.calories  : r.calories),
          proteines:   Math.round(repl ? repl.proteines : r.proteines),
          glucides:    Math.round(repl ? repl.glucides  : r.glucides),
          lipides:     Math.round(repl ? repl.lipides   : r.lipides),
          source:      'plan'
        });
      }

      if (btn) {
        btn.textContent = '✓ Ajouté au journal !';
        btn.style.cssText += ';color:var(--gold);cursor:default;';
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = '📖 Ajouter au journal';
          btn.style.color = '';
          btn.style.cursor = '';
        }, 3000);
      }
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = '📖 Ajouter au journal'; }
      alert('Erreur : ' + e.message);
    }
  },

  // ── Remplacement ────────────────────────────────────────────────────

  openReplace(repasId, calories, nom, cat) {
    this._replaceTarget = { repasId, calories, nom, cat };
    this._renderReplaceModal();
  },

  _renderReplaceModal() {
    const { repasId, calories, nom, cat } = this._replaceTarget;
    const meta  = this._catMeta(cat);
    const items = meta.list;
    const origKcal = Math.round(calories);

    const rows = items.map(f => {
      let qty = Math.round(calories / f.kcal * 100 / 5) * 5;
      qty = Math.max(20, qty);
      const newKcal = Math.round(f.kcal * qty / 100);
      const newP    = Math.round(f.p    * qty / 100);
      const newG    = Math.round(f.g    * qty / 100);
      const newL    = Math.round(f.l    * qty / 100);
      const delta   = newKcal - origKcal;
      const deltaStr = Math.abs(delta) > 5
        ? `<span style="font-size:10px;color:var(--gray-muted);">(${delta > 0 ? '+' : ''}${delta} kcal)</span>`
        : '';

      return `<div class="replace-row">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:14px;">${f.nom}</div>
          <div style="font-size:12px;color:var(--gray-muted);margin-top:2px;">
            ${qty}g · P:${newP}g G:${newG}g L:${newL}g · ${newKcal} kcal ${deltaStr}
          </div>
        </div>
        <button class="btn btn-primary btn-small" style="flex-shrink:0;"
          onclick="PlanPage.applyReplace('${repasId}','${f.nom.replace(/'/g,"\\'")}',${qty},${newKcal},${newP},${newG},${newL})">
          Choisir
        </button>
      </div>`;
    }).join('');

    document.getElementById('planReplaceModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('planReplaceModal').innerHTML=''">
        <div class="modal" style="padding-bottom:calc(1.5rem + env(safe-area-inset-bottom,12px));">
          <div class="modal-title">
            ${meta.icon} Remplacer "${nom}"
            <button class="modal-close" onclick="document.getElementById('planReplaceModal').innerHTML=''">×</button>
          </div>
          <div style="font-size:12px;color:var(--gray-muted);margin-top:-0.5rem;margin-bottom:1rem;">
            Équivalences ${meta.label.toLowerCase()}s pour ~${origKcal} kcal
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">${rows}</div>
        </div>
      </div>`;
  },

  applyReplace(repasId, nom, qty, kcal, p, g, l) {
    this._replacements[repasId] = {
      nom, quantite: qty, unite: 'g',
      calories: kcal, proteines: p, glucides: g, lipides: l
    };
    document.getElementById('planReplaceModal').innerHTML = '';
    this.renderContent();
  },

  revert(repasId) {
    delete this._replacements[repasId];
    this.renderContent();
  }
};
