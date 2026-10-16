// APEX APP — Coach : Fiche Client, onglet Infos (le calcul TDEE est dans calcul-nutrition.js)

const CoachClientEditPage = {
  client: null,
  coachs: [],
  fiche: null,           // profil coaching (table fiche_coach, réservée aux coachs)
  semainesStudio: [],    // semaines cochées des séances au studio
  programmes: [],        // programmes en cours (durée et séances du tableau studio)
  _topoTimer: null,

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="ceTitle">Fiche client</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#coach-clients'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
      </div>
      <div id="ceContent"><div class="spinner" style="margin-top:2rem;"></div></div>`;
  },

  async init() {
    // Reset état pour éviter les fuites entre clients
    this.client      = null;
    this.coachs      = [];
    this.fiche       = null;
    this.semainesStudio = [];
    this.programmes  = [];
    this.notifs      = null;

    const params = Router.getParams();
    if (!params.clientId) { window.location.hash = '#coach-clients'; return; }

    try {
      this.client = await db.getProfile(params.clientId);
      // Le compte partagé n'est plus utilisé : il n'est pas proposé comme référent
      this.coachs = (await db.getCoachs().catch(() => [])).filter(co => co.id !== COMPTE_PARTAGE_ID);
      [this.fiche, this.semainesStudio, this.programmes, this.notifs] = await Promise.all([
        db.getFicheCoach(params.clientId).catch(() => null),
        
        db.getSemainesStudioClient(params.clientId).catch(() => []),
        db.getClientProgrammesActifs(params.clientId).catch(() => []),
        db.getNotificationsClient(params.clientId).catch(() => null),
      ]);
      document.getElementById('ceTitle').textContent = 'Infos — ' + (this.client.prenom || 'Client');
      this.renderForm();
    } catch (e) {
      document.getElementById('ceContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  renderForm() {
    const c = this.client;

    let html = `
      ${coachClientNav(c.id, 'coach-client-edit')}

      <div class="card">
        <div class="card-title">Informations</div>
        <div class="field">
          <label class="field-label">Coach référent</label>
          <select class="input" id="ceReferent">
            <option value="">— Aucun —</option>
            ${this.coachs.map(co => `<option value="${co.id}" ${c.coach_referent_id === co.id ? 'selected' : ''}>${escHtml(this._coachLabel(co))}</option>`).join('')}
          </select>
        </div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label class="field-label">Type de client</label>
            <select class="input" id="ceTypeClient">
              <option value="suivi" ${c.type_client === 'suivi' ? 'selected' : ''}>Studio + suivi</option>
              <option value="distance" ${c.type_client === 'distance' ? 'selected' : ''}>Suivi à distance</option>
              <option value="studio" ${c.type_client === 'studio' ? 'selected' : ''}>Studio sans suivi</option>
            </select>
          </div>
          <div class="field"><label class="field-label">Téléphone</label><input class="input" type="tel" id="ceTelephone" value="${escHtml(c.telephone || '')}"></div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:12px;">
          <input type="checkbox" id="ceFactMixte" ${c.facturation_mixte ? 'checked' : ''}> Abonnement + séances à la consommation
        </label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-small" onclick="CoachClientEditPage.save()">💾 Enregistrer</button>
          ${c.type_client === 'studio' ? `<button class="btn btn-secondary btn-small" onclick="CoachClientEditPage.ouvrirAcces()">📲 Ouvrir l'accès à l'app</button>` : ''}
        </div>
        <div id="ceSaveMsg" style="margin-top:0.75rem;"></div>
      </div>

      <div class="card" id="ceProfil">${this._profilCoachHtml()}</div>
      ${this.notifs && c.type_client !== 'studio' ? `<div class="card" id="ceNotifs">${this._notifsHtml()}</div>` : ''}
      ${this._studioHtml()}


      <div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--border);">
        ${c.actif === false ? `
          <div class="alert" style="background:var(--bg);margin-bottom:10px;font-size:13px;">Client inactif : il n'apparaît plus dans les listes ni sur le tableau de bord, et ne reçoit plus de rappels. Ses données sont conservées.</div>
          <button class="btn btn-secondary" style="width:100%;margin-bottom:10px;" onclick="CoachClientEditPage.changerActif(true)">↩︎ Réactiver ce client</button>` : `
          <button class="btn btn-secondary" style="width:100%;margin-bottom:10px;" onclick="CoachClientEditPage.changerActif(false)">💤 Client inactif (ne continue pas)</button>`}
        <button class="btn" style="background:var(--error-bg);color:var(--error);border:1.5px solid #FFCDD2;width:100%;" onclick="CoachClientEditPage.confirmDelete()">🗑️ Supprimer ce client</button>
      </div>`;

    document.getElementById('ceContent').innerHTML = html;
  },

  // ── Profil coaching ────────────────────────────────────────────────────────

  _peutModifierProfil() {
    const me = Router.userProfile;
    return !!(me?.is_gerant || this.client?.coach_referent_id === me?.id);
  },

  _profilCoachHtml() {
    const f = this.fiche || {};
    const modif = this._peutModifierProfil();
    const criteres = [
      ['aime_discuter', 'Aime discuter'],
      ['technique', 'Technique'],
      ['style_pro', 'Bon copain (1) → Pro (3)'],
      ['energie', 'Douceur (1) → Énergique (3)'],
    ];
    return `
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;">
        <span>Profil coaching</span>
        <span id="ceProfilEtat" style="font-size:11px;font-weight:500;color:var(--gray-light);">visible des coachs uniquement</span>
      </div>
      ${criteres.map(([cle, label]) => `
        <div class="pc-ligne">
          <div class="pc-label">${label}</div>
          <div class="pc-pastilles">${[1, 2, 3].map(n => `
            <button class="pastille ${(f[cle] || 0) >= n ? 'on' : ''}" ${modif ? `onclick="CoachClientEditPage.noter('${cle}', ${n})"` : 'disabled'}
              title="${n}/3"></button>`).join('')}
            <span class="pc-note">${f[cle] || 0}/3</span>
          </div>
        </div>`).join('')}
      <div class="pc-ligne">
        <div class="pc-label">Tutoiement / vouvoiement</div>
        <div class="cp-lieu">
          <button class="${!f.vouvoiement ? 'on' : ''}" ${modif ? `onclick="CoachClientEditPage.majProfil({ vouvoiement: false })"` : 'disabled'}>Tutoiement</button>
          <button class="${f.vouvoiement ? 'on' : ''}" ${modif ? `onclick="CoachClientEditPage.majProfil({ vouvoiement: true })"` : 'disabled'}>Vouvoiement</button>
        </div>
      </div>
      <div class="field" style="margin-top:10px;margin-bottom:0;">
        <label class="field-label">Topo client</label>
        <textarea class="input" id="ceTopo" rows="4" style="height:auto;" placeholder="Ce qu'il faut savoir sur ce client…"
          ${modif ? 'oninput="CoachClientEditPage.saisirTopo()"' : 'disabled'}>${escHtml(f.topo || '')}</textarea>
      </div>
      ${modif ? '' : '<div style="font-size:11px;color:var(--gray-light);margin-top:6px;">Seuls le coach référent et les gérants peuvent modifier ce profil.</div>'}`;
  },

  noter(cle, n) {
    const actuel = this.fiche?.[cle] || 0;
    this.majProfil({ [cle]: actuel === n ? 0 : n });
  },

  saisirTopo() {
    clearTimeout(this._topoTimer);
    const etat = document.getElementById('ceProfilEtat');
    if (etat) etat.textContent = 'Enregistrement…';
    this._topoTimer = setTimeout(() => this.majProfil({ topo: document.getElementById('ceTopo').value.trim() || null }, false), 700);
  },

  async majProfil(champs, redessiner = true) {
    const avant = { ...(this.fiche || {}) };
    this.fiche = { ...avant, ...champs };
    if (redessiner) document.getElementById('ceProfil').innerHTML = this._profilCoachHtml();
    try {
      await db.saveFicheCoach(this.client.id, {
        aime_discuter: this.fiche.aime_discuter || 0,
        technique:     this.fiche.technique || 0,
        style_pro:     this.fiche.style_pro || 0,
        energie:       this.fiche.energie || 0,
        vouvoiement:   !!this.fiche.vouvoiement,
        topo:          this.fiche.topo ?? null,
      });
      const etat = document.getElementById('ceProfilEtat');
      if (etat) etat.textContent = '✓ Enregistré';
    } catch (e) {
      this.fiche = avant;
      if (redessiner) document.getElementById('ceProfil').innerHTML = this._profilCoachHtml();
      toast('Erreur : ' + e.message, 'error');
    }
  },

  // ── Notifications envoyées au client (les messages restent toujours actifs) ──
  _notifsHtml() {
    const n = this.notifs;
    const modif = this._peutModifierProfil();
    const lignes = [['bilan', 'Bilan de la semaine', 'Quand son bilan est disponible'],
         ['rappel_bilan', 'Rappel du bilan', 'Dimanche 21 h, si le bilan n\'est pas rempli'],
         ['journal', 'Rappel du journal', 'Chaque jour à 20 h, moins de 3 repas notés'],
         ['habitudes', 'Rappel des habitudes', 'Chaque jour à 21 h, habitudes non cochées'],
         ['plan', 'Nouveau plan alimentaire', 'Quand un plan est enregistré']];
    return `
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;">
        <span>Notifications</span>
        <span id="ceNotifsEtat" style="font-size:11px;font-weight:500;color:var(--gray-light);"></span>
      </div>
      ${lignes.map(([cle, label, aide]) => `
        <label class="nc-ligne">
          <span><span class="nc-label">${label}</span><span class="nc-aide">${aide}</span></span>
          <input type="checkbox" class="nc-interrupteur" ${n[cle] !== false ? 'checked' : ''} ${modif ? '' : 'disabled'}
            onchange="CoachClientEditPage.majNotif('${cle}', this.checked)">
        </label>`).join('')}
      <div class="nc-aide" style="margin-top:8px;">Les notifications de messages restent toujours actives.${modif ? '' : ' Seuls le coach référent et les gérants peuvent modifier ces réglages.'}</div>`;
  },

  async majNotif(cle, actif) {
    const avant = this.notifs[cle];
    this.notifs[cle] = actif;
    const etat = document.getElementById('ceNotifsEtat');
    try {
      await db.saveNotificationsClient(this.client.id, { [cle]: actif });
      if (etat) etat.textContent = '✓ Enregistré';
    } catch (e) {
      this.notifs[cle] = avant;
      document.getElementById('ceNotifs').innerHTML = this._notifsHtml();
      toast('Erreur : ' + e.message, 'error');
    }
  },

  // ── Séances au studio d'un coup d'œil (se remplit avec les cases « faite ») ──
  // Colonnes = semaines du programme en cours (le plus long s'il y en a plusieurs),
  // lignes = séances attribuées au client dans ses programmes en cours.
  _studioHtml() {
    const c = this.client;
    const progs = (this.programmes || []).filter(p => (p.seances || []).some(s => !s.cardio));
    if (c.type_client === 'distance' && !progs.some(p => p.seances.some(s => s.lieu === 'studio'))) return '';

    const carte = contenu => `
      <div class="card">
        <div class="card-title">Séances au studio</div>
        ${contenu}
      </div>`;
    if (!progs.length) {
      return carte('<div style="font-size:13px;color:var(--gray-light);">Aucun programme en cours.</div>');
    }

    const ref = progs.reduce((a, b) => ((b.nb_semaines || 4) > (a.nb_semaines || 4) ? b : a));
    const nbSem = ref.nb_semaines || 4;
    const idsSeances = new Map();   // id de séance → n° de séance
    for (const p of progs) for (const s of p.seances) if (!s.cardio) idsSeances.set(s.id, (s.ordre ?? 0) + 1);
    const numeros = [...new Set(idsSeances.values())].sort((a, b) => a - b);

    const cochees = new Map();      // n° de séance → Map(semaine → date)
    for (const l of this.semainesStudio) {
      const n = idsSeances.get(l.seance_id);
      if (!n) continue;
      if (!cochees.has(n)) cochees.set(n, new Map());
      cochees.get(n).set(l.semaine, new Date(l.faite_le + 'T00:00:00'));
    }
    const total = [...cochees.values()].reduce((t, m) => t + m.size, 0);
    const colonnes = Array.from({ length: nbSem }, (_, i) => i + 1);
    const debut = ref.date_debut
      ? ` · depuis le ${new Date(ref.date_debut + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}` : '';

    return `
      <div class="card">
        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <span>Séances au studio</span>
          <span style="font-size:11px;font-weight:500;color:var(--gray-light);">${total} faite${total > 1 ? 's' : ''} · ${escHtml(ref.nom)} · ${nbSem} semaines${debut}</span>
        </div>
        <div style="overflow-x:auto;">
          <table class="st-table">
            <tr><th></th>${colonnes.map(k => `<th>${k}</th>`).join('')}</tr>
            ${numeros.map(n => `
              <tr><th class="st-seance">Séance ${n}</th>${colonnes.map(k => {
                const d = cochees.get(n)?.get(k);
                return `<td><span class="st-case ${d ? 'on' : ''}" ${d ? `title="faite le ${d.toLocaleDateString('fr-FR')}"` : ''}></span></td>`;
              }).join('')}</tr>`).join('')}
          </table>
        </div>
        <div style="font-size:11px;color:var(--gray-light);margin-top:6px;">Se coche tout seul quand un coach coche « faite » dans la grille d'une séance au studio.</div>
      </div>`;
  },

  // Client studio : accès à l'app réduite (séances au studio, charges, messages)
  ouvrirAcces() {
    const c = this.client;
    const emailInterne = /@clients\.one2onecoaching\.fr$/.test(c.email || '');
    const fenetre = document.createElement('div');
    fenetre.id = 'ceAccesModal';
    fenetre.innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)this.parentElement.remove()">
        <div class="modal">
          <div class="modal-title">Accès à l'app — ${escHtml(c.prenom || '')}
            <button class="modal-close" onclick="document.getElementById('ceAccesModal').remove()">×</button>
          </div>
          <div style="font-size:13px;color:var(--gray);margin-bottom:12px;line-height:1.5;">
            Le client pourra se connecter et verra ses séances au studio, ses charges et la messagerie « Équipe ONE2ONE ».
            Un nouveau mot de passe est créé à chaque fois : l'ancien ne fonctionnera plus.
          </div>
          <div class="field"><label class="field-label">Email du client</label>
            <input class="input" type="email" id="ceAccesEmail" value="${emailInterne ? '' : escHtml(c.email || '')}" placeholder="client@email.com"></div>
          <div id="ceAccesErr"></div>
          <button class="btn btn-primary" style="width:100%;" id="ceAccesBtn" onclick="CoachClientEditPage._confirmerAcces()">Ouvrir l'accès</button>
        </div>
      </div>`;
    document.body.appendChild(fenetre);
  },

  async _confirmerAcces() {
    const email = document.getElementById('ceAccesEmail').value.trim();
    const btn = document.getElementById('ceAccesBtn');
    if (!email) { document.getElementById('ceAccesErr').innerHTML = '<div class="alert alert-error">Indique l\'email du client.</div>'; return; }
    btn.disabled = true; btn.textContent = 'Ouverture…';
    try {
      const { email: emailFinal, password } = await db.ouvrirAccesClientStudio(this.client.id, email);
      this.client.email = emailFinal;
      const message = `Bonjour ${this.client.prenom || ''} 👊\n\nTon espace ONE2ONE est prêt : tu y retrouves tes séances au studio, tes charges et tu peux écrire à l'équipe.\n\n🔗 ${APP_CONFIG.APP_URL}\n📧 ${emailFinal}\n🔑 ${password}`;
      document.querySelector('#ceAccesModal .modal').innerHTML = `
        <div class="modal-title">Accès ouvert
          <button class="modal-close" onclick="document.getElementById('ceAccesModal').remove()">×</button>
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:1rem;font-size:13px;margin-bottom:1rem;line-height:1.8;">
          <div>🔗 <b>Lien :</b> ${escHtml(APP_CONFIG.APP_URL)}</div>
          <div>📧 <b>Email :</b> ${escHtml(emailFinal)}</div>
          <div>🔑 <b>Mot de passe :</b> ${escHtml(password)}</div>
        </div>
        <div style="font-size:13px;color:var(--gray);margin-bottom:1rem;">Ce mot de passe ne sera plus affiché : copie-le maintenant.</div>
        <button class="btn btn-primary" style="width:100%;" id="ceAccesCopier">📋 Copier le message WhatsApp</button>`;
      document.getElementById('ceAccesCopier').onclick = () => navigator.clipboard.writeText(message)
        .then(() => { document.getElementById('ceAccesCopier').textContent = '✅ Copié !'; })
        .catch(() => prompt('Copie ce message :', message));
    } catch (e) {
      document.getElementById('ceAccesErr').innerHTML = `<div class="alert alert-error">${escHtml(e.message)}</div>`;
      btn.disabled = false; btn.textContent = 'Ouvrir l\'accès';
    }
  },

  async changerActif(actif) {
    const prenom = this.client.prenom || 'ce client';
    if (!actif && !confirm(`Passer ${prenom} en client inactif ?\n\nIl disparaît des listes, du tableau de bord et de l'agenda, ses bilans automatiques sont arrêtés et il ne reçoit plus de rappels. Toutes ses données sont conservées, et tu pourras le réactiver.`)) return;
    try {
      await db.setClientActif(this.client.id, actif);
      this.client.actif = actif;
      _ficheClients.delete(this.client.id);
      this.renderForm();
      toast(actif ? `${prenom} est de nouveau actif. Pense à relancer ses bilans si besoin.` : `${prenom} est inactif`, 'success');
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  },

  _coachLabel(co) {
    const nom = `${co.prenom || ''} ${co.nom || ''}`.trim() || co.email;
    return co.is_gerant ? `${nom} (gérant)` : nom;
  },

  async confirmDelete() {
    const prenom = this.client.prenom || 'ce client';
    if (!confirm(`Supprimer ${prenom} ? Cette action est irréversible.`)) return;
    try {
      await db.deleteClient(this.client.id);
      window.location.hash = '#coach-clients';
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    }
  },

  async save() {
    const id = this.client.id;
    const updates = {
      type_client: document.getElementById('ceTypeClient').value,
      telephone: document.getElementById('ceTelephone').value.trim() || null,
      facturation_mixte: document.getElementById('ceFactMixte').checked
    };
    // Liste des coachs non chargée → ne pas toucher au référent
    if (this.coachs.length) {
      updates.coach_referent_id = document.getElementById('ceReferent').value || null;
    }
    try {
      await db.updateProfile(id, updates);
      Object.assign(this.client, updates);
      _ficheClients.delete(id);   // les onglets relisent le référent et le type
      document.getElementById('ceSaveMsg').innerHTML = '<div class="alert alert-success">✅ Infos enregistrées</div>';
      setTimeout(() => { document.getElementById('ceSaveMsg').innerHTML = ''; }, 4000);
    } catch (e) {
      document.getElementById('ceSaveMsg').innerHTML = '<div class="alert alert-error">' + escHtml(e.message) + '</div>';
    }
  }
};
