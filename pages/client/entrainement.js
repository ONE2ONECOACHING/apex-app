// APEX APP — Client : Module Entraînement (Programme + Historique)

const EntrainementPage = {
  programmes:   [],           // tous les programmes actifs du client
  _tab:         'programme',  // 'programme' | 'historique'
  _logs:        [],
  _logsLoaded:  false,
  _expanded:    null,         // log.id currently expanded
  _cardioVals:  [],           // validations cardio du client
  _cardioOpen:  null,         // seance.id de la séance cardio ouverte
  _cardioRessenti: null,      // ressenti sélectionné dans la vue validation
  plansCardio:  [],           // plans cardio « à distance » (HYROX…) donnés par le coach
  _pcPhase:     {},           // plan.id → index de la phase affichée
  _pcOuverte:   null,         // séance du plan cardio dépliée

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
    this._cardioOpen = null;
    this._cardioRessenti = null;
    this._pcPhase    = {};
    this._pcOuverte  = null;

    try {
      [this.programmes, this._cardioVals, this.plansCardio] = await Promise.all([
        db.getClientProgrammesActifs(profile.id),
        db.getCardioValidations(profile.id).catch(() => []),
        db.getMesPlansCardio().catch(() => []),
      ]);
      // Séances commencées pas encore enregistrées (« Reprendre »)
      this._enCours = new Set((await db.getSeancesEnCours(profile.id).catch(() => [])).map(x => x.seance_id));
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

  // Toutes les séances de tous les programmes actifs, avec réf au programme parent
  _allSeances() {
    const out = [];
    (this.programmes || []).forEach(p => {
      (p.seances || []).forEach(s => out.push({ ...s, _prog: p }));
    });
    return out;
  },

  _findSeance(id) {
    return this._allSeances().find(s => s.id === id) || null;
  },

  _renderProgramme() {
    const progs = this.programmes || [];
    const plansCardio = this._renderPlansCardio();
    if (!progs.length && plansCardio) return plansCardio;
    if (!progs.length) {
      return `<div class="empty-state" style="margin-top:2rem;">
        <div class="empty-icon">💪</div>
        <div class="empty-text">Aucun programme actif.<br>Contacte ton coach pour qu'il t'en assigne un.</div>
      </div>`;
    }

    // Consignes : une carte par programme qui en a
    const consignesHtml = progs.filter(p => p.consignes).map(p => `
      <div class="card card-tap" onclick="EntrainementPage._openConsignes('${p.id}')"
           style="cursor:pointer;margin-bottom:0.75rem;border-left:3px solid var(--gold);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="font-size:24px;line-height:1;">📋</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:14px;margin-bottom:2px;">Consignes — ${p.nom}</div>
            <div style="font-size:12px;color:var(--gray-light);">Appuie pour lire</div>
          </div>
          <div style="color:var(--gray-muted);font-size:18px;">›</div>
        </div>
      </div>`).join('');

    return consignesHtml + this._renderSeancesGrouped(this._allSeances()) + plansCardio;
  },

  // ── Plan cardio à distance (HYROX…) : phases, séances en texte, le client coche ──
  _renderPlansCardio() {
    const plans = this.plansCardio || [];
    if (!plans.length) return '';
    const jour = d => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `
      <div style="display:flex;align-items:center;gap:8px;margin:14px 0 10px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#EF4444;">🏃 Plan cardio</div>
        <div style="flex:1;height:1px;background:#EF4444;opacity:.25;"></div>
      </div>
      ${plans.map(p => {
        const a = avancementCardio({ cardio_phases: (p.phases || []).map(ph => ({ ...ph, cardio_seances: ph.seances || [] })) });
        if (!a.phases.length) return '';
        const iPhase = this._pcPhase[p.id] ?? Math.max(0, a.phases.indexOf(a.phase));
        const ph = a.phases[Math.min(iPhase, a.phases.length - 1)];
        const prochaineId = a.prochaine ? a.prochaine.phase.seances[a.prochaine.n - 1].id : null;
        const ouverte = this._pcOuverte === null ? prochaineId : this._pcOuverte;
        return `
        <div class="card" style="margin-bottom:0.75rem;border-left:3px solid #EF4444;">
          <div style="font-weight:700;font-size:15px;">${escHtml(p.nom)}</div>
          <div style="font-size:12px;color:var(--gray-light);margin:2px 0 10px;">Séances faites : ${a.faites}/${a.total}</div>
          ${a.phases.length > 1 ? `<div class="pc-phases">${a.phases.map((x, i) => `
            <button class="${x === ph ? 'on' : ''}" onclick="EntrainementPage._pcChoisirPhase('${p.id}', ${i})">${escHtml(x.nom || 'Phase ' + (i + 1))}</button>`).join('')}
          </div>` : ''}
          ${ph.seances.map((s, i) => {
            const ouv = s.id === ouverte;
            return `
            <div class="pc-seance ${s.faite ? 'faite' : ''} ${s.id === prochaineId ? 'prochaine' : ''}" data-id="${s.id}">
              <div class="pc-seance-tete" onclick="EntrainementPage._pcOuvrir('${s.id}')">
                <span class="pc-rond">${s.faite ? '✓' : i + 1}</span>
                <span class="pc-titre">Séance ${i + 1}${s.titre ? ' · ' + escHtml(s.titre) : ''}</span>
                <span class="pc-etat">${s.faite ? (s.faite_le ? 'faite le ' + jour(s.faite_le) : 'faite') : s.id === prochaineId ? 'à faire' : ''}</span>
                <span style="color:var(--gray-muted);">${ouv ? '⌃' : '›'}</span>
              </div>
              ${ouv ? `
              <div class="pc-contenu">${escHtml(s.contenu || 'Pas de détail pour cette séance.')}</div>
              <button class="btn ${s.faite ? 'btn-secondary' : 'btn-primary'} btn-small" style="width:100%;margin-top:10px;"
                onclick="EntrainementPage._pcCocher('${s.id}', ${!s.faite})">${s.faite ? 'Annuler : pas encore faite' : '✓ J\'ai fait cette séance'}</button>` : ''}
            </div>`;
          }).join('')}
        </div>`;
      }).join('')}`;
  },

  _pcChoisirPhase(planId, i) {
    this._pcPhase[planId] = i;
    this._pcOuverte = null;
    this._rerenderProgrammeTab();
  },

  _pcOuvrir(seanceId) {
    const ouverte = this._pcOuverte === null ? document.querySelector('.pc-contenu')?.closest('.pc-seance')?.dataset.id : this._pcOuverte;
    this._pcOuverte = ouverte === seanceId ? '' : seanceId;
    this._rerenderProgrammeTab();
  },

  async _pcCocher(seanceId, faite) {
    try {
      await db.cocherSeanceCardio(seanceId, faite);
      for (const p of this.plansCardio) for (const ph of p.phases || []) for (const s of ph.seances || []) {
        if (s.id === seanceId) { s.faite = faite; s.faite_le = faite ? formatDate(new Date()) : null; }
      }
      // Séance cochée : on passe à la suivante (et à sa phase)
      if (faite) { this._pcOuverte = null; this._pcPhase = {}; }
      this._rerenderProgrammeTab();
      toast(faite ? '🏃 Séance validée !' : 'Séance remise à faire', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  _renderSeancesGrouped(toutes) {
    // Séances au studio : remplies par le coach, consultables ici
    const studio  = toutes.filter(s => s.lieu === 'studio' && !s.cardio);
    const seances = toutes.filter(s => !(s.lieu === 'studio' && !s.cardio));
    const studioHtml = studio.length ? `
      <div style="display:flex;align-items:center;gap:8px;margin:14px 0 10px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#059669;">🏋️ Au studio</div>
        <div style="flex:1;height:1px;background:#059669;opacity:.25;"></div>
      </div>
      ${studio.map(s => `
        <div class="card card-tap" onclick="EntrainementPage._ouvrirStudio('${s.id}')" style="cursor:pointer;margin-bottom:0.75rem;border-left:3px solid #059669;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:15px;">${escHtml(s.nom)}</div>
              <div style="font-size:12px;color:var(--gray-light);margin-top:2px;">${(s.exercices || []).length} exercices · avec ton coach · voir mes charges</div>
            </div>
            <div style="color:var(--gray-muted);font-size:18px;">›</div>
          </div>
        </div>`).join('')}` : '';
    if (seances.length === 0 && studio.length) return studioHtml;
    return this._renderSeancesDistance(seances) + studioHtml;
  },

  // Fiche en lecture seule d'une séance au studio : charges semaine par semaine
  async _ouvrirStudio(seanceId) {
    const modal = document.createElement('div');
    modal.id = 'studioModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
      <div style="background:var(--white);border-radius:20px 20px 0 0;width:100%;max-height:85vh;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom);">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid var(--border);">
          <div style="font-weight:700;font-size:16px;" id="studioTitre">Séance au studio</div>
          <button onclick="document.getElementById('studioModal').remove()" style="border:none;background:none;font-size:24px;cursor:pointer;color:var(--gray);">×</button>
        </div>
        <div id="studioCorps" style="overflow-y:auto;padding:14px 18px 24px;"><div class="spinner" style="margin:2rem auto;"></div></div>
      </div>`;
    document.body.appendChild(modal);

    try {
      const d = await db.getGrilleStudio(seanceId, true);
      document.getElementById('studioTitre').textContent = d.seance.nom;
      const faites = new Map(d.semaines.map(s => [s.semaine, s]));
      const corps = d.exercices.map(e => {
        const lignes = d.saisies
          .filter(x => x.exercice_id === e.id && (x.charge || x.reps))
          .sort((a, b) => a.semaine - b.semaine)
          .map(x => `
            <div style="display:flex;gap:10px;font-size:13px;padding:5px 0;border-top:1px solid var(--border-light);">
              <div style="min-width:74px;font-weight:600;color:var(--gray);">Semaine ${x.semaine}</div>
              <div style="flex:1;white-space:pre-line;">${[x.charge, x.reps].filter(Boolean).map(escHtml).join(' · ')}</div>
            </div>`).join('');
        return `
          <div style="margin-bottom:14px;">
            <div style="font-weight:700;font-size:14px;">${escHtml(e.exercices_bdd?.nom || 'Exercice')}</div>
            <div style="font-size:12px;color:var(--gray-light);margin-bottom:4px;">${escHtml(CoachSeanceStudioPage._methode(e))}</div>
            ${lignes || '<div style="font-size:12px;color:var(--gray-muted);">Pas encore de charges notées.</div>'}
          </div>`;
      }).join('');
      const nbFaites = faites.size;
      document.getElementById('studioCorps').innerHTML = `
        <div style="font-size:12px;color:var(--gray-light);margin-bottom:12px;">${nbFaites} séance${nbFaites > 1 ? 's' : ''} faite${nbFaites > 1 ? 's' : ''} sur ${d.seance.client_programmes?.nb_semaines || '?'} semaines</div>
        ${corps || '<div class="empty-text">Aucun exercice.</div>'}`;
    } catch (err) {
      document.getElementById('studioCorps').innerHTML = '<div class="alert alert-error">Impossible de charger la séance.</div>';
    }
  },

  _renderSeancesDistance(seances) {
    if (seances.length === 0) {
      return `<div class="empty-state"><div class="empty-icon">📭</div>
        <div class="empty-text">Aucune séance dans ce programme.</div></div>`;
    }
    const renfo  = seances.filter(s => !s.cardio);
    const cardio = seances.filter(s => s.cardio);

    // Si un seul type → pas de séparateur (affichage simple)
    if (!renfo.length || !cardio.length) {
      return seances.map(s => this._seanceCard(s)).join('');
    }

    const header = (icon, label, color) => `
      <div style="display:flex;align-items:center;gap:8px;margin:4px 0 10px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${color};">
          ${icon} ${label}
        </div>
        <div style="flex:1;height:1px;background:${color};opacity:.25;"></div>
      </div>`;

    return `
      ${header('💪', 'Renforcement', 'var(--gold)')}
      ${renfo.map(s => this._seanceCard(s)).join('')}
      <div style="height:8px;"></div>
      ${header('🏃', 'Cardio', '#EF4444')}
      ${cardio.map(s => this._seanceCard(s)).join('')}`;
  },

  // Semaine en cours d'un programme = nb de semaines depuis sa date de début
  _programmeWeekFor(seance) {
    const p = seance?._prog;
    if (p && p.date_debut) {
      const start = new Date(p.date_debut + 'T00:00:00');
      const diff  = Math.floor((Date.now() - start) / (7 * 24 * 3600 * 1000));
      const nbSem = 99; // pas de plafond (comportement historique, conservé)
      return Math.min(Math.max(1, diff + 1), nbSem);
    }
    return 1;
  },

  // Nb de semaines validées pour une séance cardio (séquentiel)
  _cardioCompletedCount(seanceId) {
    return this._cardioVals.filter(v => v.seance_id === seanceId).length;
  },

  // Semaine cardio affichée = min(prochaine non validée, semaine temps)
  // → on n'avance pas tant que la semaine en cours n'est pas validée
  _cardioDisplayWeek(seance) {
    const done    = this._cardioCompletedCount(seance.id);
    const time    = this._programmeWeekFor(seance);
    const weeks   = Array.isArray(seance.cardio_weeks) ? seance.cardio_weeks : [];
    const maxWeek = Math.max(1, weeks.length || (seance._prog?.nb_semaines || 1));
    return Math.min(done + 1, time, maxWeek);
  },

  _openCardio(seanceId) {
    this._cardioOpen = seanceId;
    this._cardioRessenti = null;
    this._rerenderProgrammeTab();
  },

  _closeCardio() {
    this._cardioOpen = null;
    this._cardioRessenti = null;
    this._rerenderProgrammeTab();
  },

  _setCardioRessenti(key) {
    this._cardioRessenti = key;
    this._rerenderProgrammeTab();
  },

  async _validateCardio(seanceId, week) {
    if (!this._cardioRessenti) { toast('Choisis comment s\'est passée ta séance', 'error'); return; }
    const noteEl = document.getElementById('cardioNote_' + seanceId);
    const note   = noteEl ? noteEl.value.trim() : '';
    try {
      const saved = await db.validateCardio(Router.userProfile.id, seanceId, week, this._cardioRessenti, note);
      // MAJ locale
      const existing = this._cardioVals.findIndex(v => v.seance_id === seanceId && v.semaine === week);
      if (existing >= 0) this._cardioVals[existing] = saved; else this._cardioVals.unshift(saved);
      this._cardioRessenti = null;
      this._cardioOpen = null;
      this._rerenderProgrammeTab();
      toast('🏃 Séance validée !', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  _rerenderProgrammeTab() {
    const el = document.getElementById('trainTabContent');
    if (el) el.innerHTML = this._renderProgramme();
  },

  _seanceCard(seance) {
    const jourLabel = seance.jour > 0
      ? `<span style="font-size:11px;color:var(--gray-muted);margin-left:6px;">· ${this._jours[(seance.jour - 1) % 7]}</span>`
      : '';

    // ── Séance CARDIO : progression validée par le client ─────────────────────
    if (seance.cardio) {
      const weeks    = Array.isArray(seance.cardio_weeks) ? seance.cardio_weeks : [];
      const week     = this._cardioDisplayWeek(seance);
      const done     = this._cardioCompletedCount(seance.id);
      const validated = week <= done; // la semaine affichée est-elle déjà validée ?
      const texte    = (weeks[week - 1] || '').trim();
      const isOpen   = this._cardioOpen === seance.id;
      const val      = this._cardioVals.find(v => v.seance_id === seance.id && v.semaine === week);

      // Vue compacte (repliée)
      if (!isOpen) {
        return `
          <div class="card" style="margin-bottom:0.75rem;border-left:3px solid #EF4444;cursor:pointer;"
            onclick="EntrainementPage._openCardio('${seance.id}')">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="font-weight:700;font-size:15px;">🏃 ${seance.nom}${jourLabel}</div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:11px;font-weight:700;color:#EF4444;background:#fef2f2;
                      border:1px solid #fecaca;border-radius:8px;padding:2px 8px;">Semaine ${week}</span>
                ${validated
                  ? '<span style="font-size:11px;font-weight:700;color:var(--success);">✓ Validée</span>'
                  : '<span style="color:var(--gray-muted);font-size:18px;">›</span>'}
              </div>
            </div>
          </div>`;
      }

      // Vue ouverte (texte + validation)
      const ressentis = [
        { key: 'dur',  emoji: '😓', label: 'Difficile' },
        { key: 'bien', emoji: '😊', label: 'Bien'      },
        { key: 'feu',  emoji: '🤩', label: 'En feu !'  },
      ];
      const selRessenti = this._cardioRessenti || val?.note_ressenti || null;

      return `
        <div class="card" style="margin-bottom:0.75rem;border-left:3px solid #EF4444;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <button onclick="EntrainementPage._closeCardio()"
              style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--gray);">←</button>
            <div style="flex:1;font-weight:700;font-size:15px;">🏃 ${seance.nom}</div>
            <span style="font-size:11px;font-weight:700;color:#EF4444;background:#fef2f2;
                  border:1px solid #fecaca;border-radius:8px;padding:2px 8px;">Semaine ${week}</span>
          </div>
          ${seance.notes_coach ? `
            <div style="font-size:12px;color:var(--gold);background:var(--gold-bg,#fffbeb);
                 border-left:3px solid var(--gold);padding:6px 10px;border-radius:4px;margin-bottom:10px;">
              📌 ${seance.notes_coach}
            </div>` : ''}
          ${texte
            ? `<div style="font-size:14px;color:var(--black);line-height:1.7;white-space:pre-wrap;
                          background:var(--card-bg);border-radius:10px;padding:12px 14px;margin-bottom:12px;">${texte.replace(/</g,'&lt;')}</div>`
            : `<div style="font-size:13px;color:var(--gray-muted);margin-bottom:12px;">Pas de séance définie pour cette semaine.</div>`}

          ${validated ? `
            <div style="background:var(--success-bg);border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;">
              <div style="font-size:13px;font-weight:700;color:var(--success);margin-bottom:${val?.note_client ? '4px' : '0'};">
                ✓ Séance validée ${val?.note_ressenti ? ({dur:'😓',bien:'😊',feu:'🤩'})[val.note_ressenti] : ''}
              </div>
              ${val?.note_client ? `<div style="font-size:13px;color:var(--black);">💬 ${val.note_client}</div>` : ''}
            </div>
            <div style="font-size:12px;color:var(--gray-muted);text-align:center;margin-top:10px;">
              Prochaine séance débloquée la semaine suivante.
            </div>
          ` : `
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;">Comment s'est passée ta séance ?</div>
            <div style="display:flex;gap:8px;margin-bottom:12px;">
              ${ressentis.map(r => `
                <button onclick="EntrainementPage._setCardioRessenti('${r.key}')"
                  style="flex:1;padding:10px 4px;border-radius:12px;
                         border:2px solid ${selRessenti===r.key ? '#EF4444' : 'var(--border-solid)'};
                         background:${selRessenti===r.key ? '#fef2f2' : 'var(--white)'};
                         cursor:pointer;font-family:var(--font);">
                  <div style="font-size:26px;">${r.emoji}</div>
                  <div style="font-size:10px;font-weight:600;color:var(--gray);margin-top:2px;">${r.label}</div>
                </button>`).join('')}
            </div>
            <input id="cardioNote_${seance.id}" type="text" placeholder="💬 Note pour ton coach (optionnel)"
              value="${(val?.note_client || '').replace(/"/g,'&quot;')}"
              style="width:100%;height:44px;padding:0 14px;border:1.5px solid var(--border-solid);
                     border-radius:12px;background:var(--card-bg);color:var(--black);
                     font-family:var(--font);font-size:14px;box-sizing:border-box;margin-bottom:10px;">
            <button class="btn btn-primary" style="width:100%;height:50px;background:#EF4444;"
              onclick="EntrainementPage._validateCardio('${seance.id}', ${week})">
              ✓ Valider la séance
            </button>
          `}
        </div>`;
    }

    // Carte réduite au nom : le détail est dans l'aperçu de la séance (seance-active.js)
    return `
      <div class="card" style="margin-bottom:0.75rem;cursor:pointer;"
        onclick="EntrainementPage._startSeance('${seance.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <div style="font-weight:700;font-size:15px;">${seance.nom}${jourLabel}</div>
          <button class="btn btn-primary btn-small" style="font-size:12px;flex-shrink:0;">
            ${this._enCours?.has(seance.id) ? '⏸ Reprendre' : '▶ Démarrer'}
          </button>
        </div>
      </div>`;
  },

  _openConsignes(progId) {
    const prog = (this.programmes || []).find(p => p.id === progId) || this.programmes[0];
    const text = prog?.consignes || '';
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
    const seance = this._findSeance(seanceId);
    Router.navigate('seance-active', { seanceId, programmeId: seance?._prog?.id });
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
