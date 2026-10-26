// APEX APP — Coach : Gestion du programme d'un client

const CoachClientProgrammePage = {
  client:      null,
  programmes:  [],
  archives:    [],     // programmes archivés (actif = false)
  templates:   [],
  _assigning:  false,
  _tplAssign:  null,   // modèle complet choisi dans la fenêtre d'attribution
  _lieux:      {},     // { id séance du modèle: 'studio' | 'distance' | 'exclue' }

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="cpTitle">Programme</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#coach-clients'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
      <div id="cpContent"><div class="spinner" style="margin-top:3rem;"></div></div>
      <div id="cpModal"></div>`;
  },

  async init() {
    // Jeton de ce chargement : si on change de fiche avant la fin, il est abandonné
    const jeton = this._jeton = {};
    // Reset état pour éviter les fuites entre clients
    this.client     = null;
    this.programmes = [];
    this.archives   = [];
    this.cardio     = [];
    this.templates  = [];
    this._assigning = false;

    const profile = Router.userProfile;
    if (!profile || profile.role !== 'coach') { window.location.hash = '#login'; return; }

    const params = Router.getParams();
    if (!params.clientId) { window.location.hash = '#coach-clients'; return; }

    try {
      const donnees = await Promise.all([
        db.getProfile(params.clientId),
        db.getClientProgrammesActifs(params.clientId),
        db.getProgTemplates(),
        db.getClientProgrammesArchives(params.clientId).catch(() => []),
        db.getCardioPlans(params.clientId).catch(() => []),
      ]);
      if (jeton !== this._jeton) return;
      [this.client, this.programmes, this.templates, this.archives, this.cardio] = donnees;

      const prenom = this.client?.prenom || 'Client';
      document.getElementById('cpTitle').textContent = 'Programmes — ' + prenom;

      // Tabs cohérents avec les autres pages coach
      const clientId = params.clientId;
      const tabsHtml = coachClientNav(clientId, 'coach-client-programme');

      this._render(tabsHtml);
    } catch (e) {
      document.getElementById('cpContent').innerHTML =
        '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  _render(tabsHtml = '') {
    const el = document.getElementById('cpContent');
    if (!el) return;
    const progs = this.programmes || [];

    el.innerHTML = tabsHtml
      + this._raccourciCardio()
      + (progs.length ? progs.map(p => this._programmeCard(p)).join('') : this._emptyCard())
      + `
      <button class="btn btn-primary" style="width:100%;margin-top:1rem;"
        onclick="CoachClientProgrammePage.openAssignModal()">
        + Assigner un programme
      </button>
      ${progs.length ? `
      <button id="cpNotifyBtn" class="btn btn-secondary" style="width:100%;margin-top:8px;"
        onclick="CoachClientProgrammePage.notifyClient()">
        🔔 Notifier le client
      </button>` : ''}
      ${this._cardioHtml()}
      ${this._archivesHtml()}`;
  },

  // ── Plans cardio (HYROX…) ─────────────────────────────────────────────────
  _etatCardio(p) {
    const phases = (p.cardio_phases || []).sort((a, b) => a.ordre - b.ordre);
    for (const ph of phases) {
      const seances = (ph.cardio_seances || []).sort((a, b) => a.ordre - b.ordre);
      const i = seances.findIndex(s => !s.faite);
      if (i >= 0) return `${escHtml(ph.nom)} · séance ${i + 1}/${seances.length} à faire`;
    }
    return phases.length ? 'Toutes les séances sont faites' : 'Aucune séance';
  },

  // En haut de l'onglet : accès direct au plan cardio en cours (renfo ou cardio : le coach choisit)
  _raccourciCardio() {
    const enCours = (this.cardio || []).filter(p => p.actif);
    if (!enCours.length) return '';
    return enCours.map(p => `
      <div class="cp-cardio-raccourci" onclick="CoachClientProgrammePage.ouvrirCardio('${p.id}')">
        <span>🏃 <b>${escHtml(p.nom)}</b> · ${this._etatCardio(p)}</span>
        <span class="cp-cardio-ouvrir">Ouvrir le plan cardio ›</span>
      </div>`).join('');
  },

  _cardioHtml() {
    const archives = (this.cardio || []).filter(p => !p.actif);
    return `
      <button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="CoachClientProgrammePage.choisirModeleCardio()">
        🏃 + Attribuer un plan cardio
      </button>
      ${archives.length ? `
      <div class="cp-archives">
        <div class="cp-archives-titre">Plans cardio archivés <span>${archives.length}</span></div>
        ${archives.map(p => `
          <div class="cp-archive" onclick="CoachClientProgrammePage.ouvrirCardio('${p.id}')">
            <div class="cp-archive-nom">🏃 ${escHtml(p.nom)}</div>
            <div class="cp-archive-meta">${new Date(p.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} · ${(p.cardio_phases || []).length} phase(s)</div>
            <span class="cp-archive-fleche">›</span>
          </div>`).join('')}
      </div>` : ''}`;
  },

  ouvrirCardio(planId) {
    Router.navigate('coach-cardio-plan', { clientId: this.client.id, planId });
  },

  async choisirModeleCardio() {
    let modeles;
    try { modeles = await db.getCardioModeles(); }
    catch (e) { toast('Erreur : ' + e.message, 'error'); return; }
    document.getElementById('cpModal').innerHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">Attribuer un plan cardio
            <button class="modal-close" onclick="document.getElementById('cpModal').innerHTML=''">×</button>
          </div>
          ${modeles.length ? `
          <div class="field"><label class="field-label">Modèle</label>
            <select class="input" id="cpCardioModele">
              ${modeles.map(m => `<option value="${m.id}">${escHtml(m.nom)} (${(m.cardio_modele_phases || []).length} phase(s))</option>`).join('')}
            </select>
          </div>
          <div style="font-size:12px;color:var(--gray-light);margin:-4px 0 12px;">Toutes les phases et séances du modèle sont copiées chez le client : tu pourras ensuite les adapter sans toucher au modèle.</div>
          <div id="cpCardioErreur"></div>
          <button class="btn btn-primary" style="width:100%;" id="cpCardioBtn" onclick="CoachClientProgrammePage.attribuerCardio()">Attribuer</button>`
          : `<div style="font-size:14px;margin-bottom:12px;">Aucun plan cardio dans la bibliothèque.</div>
             <button class="btn btn-primary" style="width:100%;" onclick="window.location.hash='#coach-cardio-modeles'">Créer un plan cardio</button>`}
        </div>
      </div>`;
  },

  async attribuerCardio() {
    const btn = document.getElementById('cpCardioBtn');
    btn.disabled = true; btn.textContent = 'Attribution…';
    try {
      const planId = await db.attribuerPlanCardio(document.getElementById('cpCardioModele').value, this.client.id);
      document.getElementById('cpModal').innerHTML = '';
      toast('Plan cardio attribué', 'success');
      this.ouvrirCardio(planId);
    } catch (e) {
      document.getElementById('cpCardioErreur').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
      btn.disabled = false; btn.textContent = 'Attribuer';
    }
  },

  _archivesHtml() {
    const arch = this.archives || [];
    if (!arch.length) return '';
    const date = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `
      <div class="cp-archives">
        <div class="cp-archives-titre">Programmes archivés <span>${arch.length}</span></div>
        ${arch.map(a => `
          <div class="cp-archive" onclick="Router.navigate('coach-programme-archive',{clientId:'${this.client.id}',progId:'${a.id}'})">
            <div class="cp-archive-nom">${escHtml(a.nom || 'Programme')}</div>
            <div class="cp-archive-meta">${date(a.date_debut || a.created_at)} · ${a.nb_semaines || 4} sem. · ${(a.client_prog_seances || []).length} séance${(a.client_prog_seances || []).length > 1 ? 's' : ''}</div>
            <span class="cp-archive-fleche">›</span>
          </div>`).join('')}
      </div>`;
  },

  _programmeCard(p) {
    const dateDebut = p.date_debut
      ? new Date(p.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Non définie';

    const seancesHtml = (p.seances || []).map(s => {
      if (s.cardio) {
        return `
        <div style="padding:10px 0;border-bottom:1px solid var(--border);">
          <div style="font-weight:600;font-size:13px;color:#EF4444;">🏃 ${escHtml(s.nom)}
            <span style="font-size:11px;font-weight:400;color:var(--gray-muted);">· cardio (progression par semaine)</span>
          </div>
        </div>`;
      }
      const exos = s.exercices || [];
      const studio = s.lieu === 'studio';
      return `
        <div style="padding:10px 0;border-bottom:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
            <div style="font-weight:600;font-size:13px;flex:1;min-width:120px;">📌 ${escHtml(s.nom)}</div>
            <div class="cp-lieu">
              <button class="${studio ? 'on' : ''}" onclick="CoachClientProgrammePage.changerLieu('${s.id}','studio')">Studio</button>
              <button class="${!studio ? 'on' : ''}" onclick="CoachClientProgrammePage.changerLieu('${s.id}','distance')">Distance</button>
            </div>
            ${studio ? `<button class="btn btn-secondary btn-small" onclick="Router.navigate('coach-seance-studio',{seanceId:'${s.id}',clientId:'${this.client.id}'})">📋 Grille</button>` : ''}
          </div>
          ${exos.slice(0, 4).map(e => {
            const te  = e.type_effort || 'reps';
            // Reps réelles : dérivées de series_data (reps_cible peut être obsolète)
            const sd  = Array.isArray(e.series_data) ? e.series_data.map(x => x.reps).filter(Boolean) : [];
            // Ne pas dédupliquer : [10,10,8] doit rester '10/10/8'. #33
            const reps = sd.length ? (new Set(sd).size <= 1 ? sd[0] : sd.join('/')) : (e.reps_cible || '10');
            const qty = te === 'amrap'    ? `AMRAP ${e.reps_cible}`
                      : te === 'temps'    ? (e.series > 1 ? `${e.series}×${e.reps_cible}` : e.reps_cible)
                      : te === 'distance' ? (e.series > 1 ? `${e.series}×${e.reps_cible}` : e.reps_cible)
                      : `${e.series}×${reps}`;
            return `<div style="font-size:12px;color:var(--gray-muted);padding:1px 0;">
              · ${escHtml(e.exercices_bdd?.nom || '—')} — ${qty}
            </div>`;
          }).join('')}
          ${exos.length > 4
            ? `<div style="font-size:11px;color:var(--gray-muted);margin-top:2px;">+${exos.length - 4} autres…</div>`
            : ''}
        </div>`;
    }).join('');

    return `
      <div class="card" style="margin-bottom:0.75rem;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:8px;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:16px;">${escHtml(p.nom)}</div>
            <div style="font-size:12px;color:var(--gray-muted);margin-top:3px;">
              Démarré le ${dateDebut} · ${(p.seances || []).length} séance${(p.seances || []).length > 1 ? 's' : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="btn btn-secondary btn-small" title="Repartir de zéro : seules les séances faites à partir d'aujourd'hui comptent"
              onclick="CoachClientProgrammePage.repartirDeZero('${p.id}')">↻</button>
            <button class="btn btn-secondary btn-small" title="Modifier"
              onclick="CoachClientProgrammePage.openEditor('${p.id}')">✏️</button>
            <button class="btn btn-secondary btn-small" title="Archiver : le client ne le voit plus, ses charges restent consultables"
              onclick="CoachClientProgrammePage.removeProgramme('${p.id}')">Archiver</button>
          </div>
        </div>
        ${seancesHtml || '<div style="font-size:13px;color:var(--gray-muted);">Aucune séance.</div>'}
      </div>`;
  },

  _emptyCard() {
    return `
      <div class="card" style="text-align:center;padding:2rem 1rem;">
        <div style="font-size:2rem;margin-bottom:8px;">💪</div>
        <div style="font-size:14px;color:var(--gray-muted);">
          Aucun programme actif pour ce client.
        </div>
      </div>`;
  },

  openEditor(progId) {
    if (!progId) return;
    Router.navigate('coach-prog-template-edit', {
      clientProgrammeId: progId,
      clientId:          this.client.id,
      clientPrenom:      this.client.prenom || '',
    });
  },

  // Le programme repart à zéro aujourd'hui : seules les séances faites à partir
  // de ce jour comptent dans l'avancement du cycle (tableau de bord)
  async repartirDeZero(progId) {
    const p = this.programmes.find(x => x.id === progId);
    if (!p || !confirm(`Faire repartir « ${p.nom} » de zéro à partir d'aujourd'hui ?\n\nL'avancement du cycle repart à « sem. 0/${p.nb_semaines || 4} ». Les séances déjà faites restent dans l'historique.`)) return;
    try {
      const aujourdhui = formatDate(new Date());
      await db.redemarrerProgramme(progId, aujourdhui);
      p.date_debut = aujourdhui;
      this._render(coachClientNav(this.client.id, 'coach-client-programme'));
      toast('Programme reparti de zéro', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  // Archiver : le programme n'est plus en cours (le client ne le voit plus),
  // il reste consultable avec les charges utilisées dans « Programmes archivés »
  async removeProgramme(progId) {
    const p = this.programmes.find(x => x.id === progId);
    if (!p || !confirm(`Archiver « ${p.nom} » ?\n\nLe client ne le verra plus. Tu le retrouves avec les charges utilisées dans « Programmes archivés ».`)) return;
    try {
      await db.deactivateClientProgramme(progId);
      this.programmes = this.programmes.filter(x => x.id !== progId);
      this.archives = [{ ...p, client_prog_seances: p.seances || [] }, ...this.archives];
      const tabsHtml = coachClientNav(this.client.id, 'coach-client-programme');
      this._render(tabsHtml);
      toast('Programme archivé', 'info');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  async changerLieu(seanceId, lieu) {
    try {
      await db.setSeanceLieu(seanceId, lieu);
      for (const p of this.programmes) for (const se of (p.seances || [])) if (se.id === seanceId) se.lieu = lieu;
      this._render(coachClientNav(this.client.id, 'coach-client-programme'));
      toast(lieu === 'studio' ? 'Séance au studio' : 'Séance à distance', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  // Choix studio / distance pour chaque séance du modèle choisi
  async choisirModele() {
    const tplId = document.getElementById('cpTplSelect')?.value;
    const box = document.getElementById('cpLieux');
    if (!box || !tplId) return;
    box.innerHTML = '<div class="spinner" style="margin:0.5rem auto;"></div>';
    try {
      this._tplAssign = await db.getProgTemplateWithSeances(tplId);
      this._lieux = {};
      this._renderLieux();
    } catch (e) {
      box.innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  // Séances du modèle (hors cardio) : gardées ou non, et studio / distance
  _renderLieux() {
    const box = document.getElementById('cpLieux');
    const seances = (this._tplAssign?.seances || []).filter(se => !se.cardio);
    if (!box) return;
    if (!seances.length) { box.innerHTML = ''; return; }
    const gardees = seances.filter(se => this._lieux[se.id] !== 'exclue').length;
    box.innerHTML = `
      <label class="field-label">Séances du client (${gardees} par semaine) et lieu</label>
      ${seances.map(se => {
        const lieu = this._lieux[se.id] || 'distance';
        const exclue = lieu === 'exclue';
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;${exclue ? 'opacity:.45;' : ''}">
            <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;">
              <input type="checkbox" ${exclue ? '' : 'checked'} onchange="CoachClientProgrammePage.garderSeance('${se.id}', this.checked)">
              ${escHtml(se.nom)}
            </label>
            ${exclue ? '<span style="font-size:12px;color:var(--gray-light);">non attribuée</span>' : `
            <div class="cp-lieu">
              <button class="${lieu === 'studio' ? 'on' : ''}" onclick="CoachClientProgrammePage.choisirLieu('${se.id}','studio')">Studio</button>
              <button class="${lieu === 'distance' ? 'on' : ''}" onclick="CoachClientProgrammePage.choisirLieu('${se.id}','distance')">Distance</button>
            </div>`}
          </div>`;
      }).join('')}`;
  },

  garderSeance(seanceId, garder) {
    if (garder) delete this._lieux[seanceId];
    else this._lieux[seanceId] = 'exclue';
    this._renderLieux();
  },

  choisirLieu(seanceId, lieu) {
    this._lieux[seanceId] = lieu;
    this._renderLieux();
  },

  openAssignModal() {
    if (!this.templates.length) {
      document.getElementById('cpModal').innerHTML = `
        <div class="modal-overlay">
          <div class="modal">
            <div class="modal-title">Assigner un programme
              <button class="modal-close" onclick="document.getElementById('cpModal').innerHTML=''">×</button>
            </div>
            <div class="empty-state" style="margin:0;">
              <div class="empty-icon">📋</div>
              <div class="empty-text">Aucun template créé.<br>
                <a href="#coach-prog-templates" style="color:var(--gold);">Créer un programme →</a>
              </div>
            </div>
          </div>
        </div>`;
      return;
    }

    document.getElementById('cpModal').innerHTML = `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">Assigner un programme
            <button class="modal-close" onclick="document.getElementById('cpModal').innerHTML=''">×</button>
          </div>

          <div class="field" style="margin-bottom:14px;">
            <label class="field-label">Template</label>
            <select class="input" id="cpTplSelect" onchange="CoachClientProgrammePage.choisirModele()">
              ${this.templates.map(t =>
                `<option value="${t.id}">${escHtml(t.nom)} (${t.nb_semaines} sem.)</option>`
              ).join('')}
            </select>
          </div>

          <div class="field" style="margin-bottom:20px;">
            <label class="field-label">Date de début</label>
            <input type="date" class="input" id="cpDateDebut" value="${formatDate(new Date())}">
          </div>

          <div class="field" id="cpLieux" style="margin-bottom:20px;"></div>

          <div id="cpAssignErr"></div>
          <button class="btn btn-primary" style="width:100%;"
            onclick="CoachClientProgrammePage.confirmAssign()">
            ✓ Assigner ce programme
          </button>
        </div>
      </div>`;
    this.choisirModele();
  },

  async confirmAssign() {
    if (this._assigning) return;
    const tplId     = document.getElementById('cpTplSelect')?.value;
    const dateDebut = document.getElementById('cpDateDebut')?.value || null;
    const template  = this.templates.find(t => t.id === tplId);
    if (!template) return;
    const seancesTpl = (this._tplAssign?.id === tplId ? this._tplAssign.seances : null) || [];
    if (seancesTpl.length && seancesTpl.every(se => this._lieux[se.id] === 'exclue' || se.cardio)
        && !seancesTpl.some(se => se.cardio)) {
      document.getElementById('cpAssignErr').innerHTML = '<div class="alert alert-error">Garde au moins une séance.</div>';
      return;
    }

    this._assigning = true;
    const btn = document.querySelector('#cpModal .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Assignation…'; }

    try {
      // Modèle complet (déjà chargé pour le choix studio / distance)
      const tplFull = this._tplAssign?.id === tplId ? this._tplAssign : await db.getProgTemplateWithSeances(tplId);
      await db.assignProgrammeFromTemplate(
        tplFull,
        this.client.id,
        Router.userProfile.id,
        dateDebut,
        false,          // ajoute sans remplacer les autres programmes
        this._lieux
      );

      // Recharger la liste des programmes actifs
      this.programmes = await db.getClientProgrammesActifs(this.client.id);
      document.getElementById('cpModal').innerHTML = '';
      this._assigning = false;

      // Bug 21 — régénérer les tabs via coachClientNav() au lieu d'extraire du DOM
      const tabsHtml = coachClientNav(this.client.id, 'coach-client-programme');
      this._render(tabsHtml);

      toast('✓ Programme assigné !', 'success');

    } catch (e) {
      this._assigning = false;
      if (btn) { btn.disabled = false; btn.textContent = '✓ Assigner ce programme'; }
      document.getElementById('cpAssignErr').innerHTML =
        '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  },

  async notifyClient() {
    if (!this.programmes.length || !this.client) return;
    const btn = document.getElementById('cpNotifyBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Envoi…'; }
    try {
      await db.sendPush(
        this.client.id,
        '💪 Programme mis à jour',
        `${Router.userProfile?.prenom || 'Ton coach'} a mis à jour ton entraînement`,
        '#entrainement'
      );
      if (btn) { btn.textContent = '✓ Notification envoyée !'; }
      setTimeout(() => {
        if (btn) { btn.disabled = false; btn.textContent = '🔔 Notifier le client'; }
      }, 3000);
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = '🔔 Notifier le client'; }
      toast('Erreur envoi notification : ' + e.message, 'error');
    }
  },
};
