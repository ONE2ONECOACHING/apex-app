// APEX APP — Coach : Dashboard

const CoachClientsPage = {
  clients: [],
  activeFilter: 'all',
  _searchQuery: '',
  _mainTab: 'dashboard', // 'dashboard' | 'suivi'
  _plans: [],
  _completedBilans: [],
  _pendingBilans: [],
  _weekEntries: [],
  _mondayStr: null,
  _coachNotes: [],
  _lastPoids: {},
  _bilanAssignations: [],

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title">Dashboard</div>
        </div>
        <button class="header-btn" onclick="Router.confirmLogout()">⏻</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;flex-wrap:wrap;">
        <button class="btn btn-primary btn-small" onclick="CoachClientsPage.showCreateModal()">+ Nouveau client</button>
        <button class="btn btn-secondary btn-small" onclick="window.location.hash='#coach-bilan-templates'">📝 Bilans</button>
        <button class="btn btn-secondary btn-small" onclick="window.location.hash='#coach-prog-templates'">📋 Programmes</button>
        <button class="btn btn-secondary btn-small" onclick="window.location.hash='#coach-exercices'">🏋️ Exercices</button>
        <button class="btn btn-secondary btn-small" onclick="window.location.hash='#coach-formations'">📚 Formations</button>
        <div id="tagFilters" style="display:flex;gap:6px;margin-left:auto;flex-shrink:0;"></div>
      </div>
      <div id="dashContent"><div class="spinner" style="margin-top:2rem;"></div></div>
      <div id="coachModal"></div>`;
  },

  async init() {
    this.activeFilter = 'all';
    this._searchQuery = '';
    this._mainTab     = 'dashboard';
    try {
      this._mondayStr = this._getMondayStr();
      const coachId   = Router.userProfile.id;

      const [clients, plans, completedBilans, pendingBilans, bilanAssignations] = await Promise.all([
        db.getAllClients(),
        db.getAllActivePlans(),
        db.getRecentCompletedBilans(7),
        db.getAllPendingBilans(),
        db.getAllBilanAssignations(coachId).catch(() => []),
      ]);
      this.clients = clients;
      const clientIds = clients.map(c => c.id);

      const [weekEntries, coachNotes, lastPoids] = await Promise.all([
        clientIds.length > 0 ? db.getJournalEntriesForClients(clientIds, this._mondayStr, todayStr()) : Promise.resolve([]),
        db.getCoachNotesForWeek(coachId, this._mondayStr).catch(() => []),
        db.getLastPoidsPerClient(clientIds).catch(() => ({})),
      ]);

      this._plans              = plans;
      this._completedBilans    = completedBilans;
      this._pendingBilans      = pendingBilans;
      this._weekEntries        = weekEntries;
      this._coachNotes         = coachNotes;
      this._lastPoids          = lastPoids;
      this._bilanAssignations  = bilanAssignations;

      this.renderFilters();
      this.renderDashboard();
    } catch (e) {
      document.getElementById('dashContent').innerHTML =
        '<div class="alert alert-error">Erreur : ' + e.message + '</div>';
    }
  },

  _getMondayStr() {
    const d   = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return formatDate(d);
  },

  renderFilters() {
    const el = document.getElementById('tagFilters');
    if (!el) return;
    const f = this.activeFilter;
    el.innerHTML = `
      <button class="tag-filter-btn ${f === 'all'   ? 'active' : ''}" onclick="CoachClientsPage.setFilter('all')">Tous</button>
      <button class="tag-filter-btn tag-filter-ben   ${f === 'ben'   ? 'active' : ''}" onclick="CoachClientsPage.setFilter('ben')">Ben</button>
      <button class="tag-filter-btn tag-filter-chris ${f === 'chris' ? 'active' : ''}" onclick="CoachClientsPage.setFilter('chris')">Chris</button>
      <button class="tag-filter-btn tag-filter-lola  ${f === 'lola'  ? 'active' : ''}" onclick="CoachClientsPage.setFilter('lola')">Lola</button>
    `;
  },

  setFilter(tag) {
    this.activeFilter = tag;
    this.renderFilters();
    this.renderDashboard();
  },

  setSearch(q) {
    this._searchQuery = q.trim().toLowerCase();
    // Mémoriser quel champ avait le focus pour le restaurer après re-render
    const activeId = document.activeElement?.id;
    this.renderDashboard();
    if (activeId === 'clientSearchInput' || activeId === 'suiviSearchInput') {
      const input = document.getElementById(activeId);
      if (input) {
        input.focus();
        const end = input.value.length;
        try { input.setSelectionRange(end, end); } catch (e) {}
      }
    }
  },

  renderDashboard() {
    const el = document.getElementById('dashContent');
    let filtered = this.activeFilter === 'all'
      ? this.clients
      : this.clients.filter(c => c.coach_tag === this.activeFilter);

    if (this._searchQuery) {
      filtered = filtered.filter(c => {
        const full = `${c.prenom || ''} ${c.nom || ''}`.toLowerCase();
        return full.includes(this._searchQuery);
      });
    }

    const planMap = new Map(this._plans.map(p => [p.profile_id, p]));

    // ── Onglets principaux ────────────────────────────────────────────────
    const tabsHtml = `
      <div style="display:flex;border-bottom:2px solid var(--border);margin-bottom:1rem;">
        <button onclick="CoachClientsPage._setMainTab('dashboard')"
          style="flex:1;padding:10px 6px;border:none;background:none;font-family:var(--font);
                 font-size:14px;font-weight:600;cursor:pointer;
                 color:${this._mainTab==='dashboard'?'var(--gold)':'var(--gray-muted)'};
                 border-bottom:2px solid ${this._mainTab==='dashboard'?'var(--gold)':'transparent'};
                 margin-bottom:-2px;">👥 Clients</button>
        <button onclick="CoachClientsPage._setMainTab('suivi')"
          style="flex:1;padding:10px 6px;border:none;background:none;font-family:var(--font);
                 font-size:14px;font-weight:600;cursor:pointer;
                 color:${this._mainTab==='suivi'?'var(--gold)':'var(--gray-muted)'};
                 border-bottom:2px solid ${this._mainTab==='suivi'?'var(--gold)':'transparent'};
                 margin-bottom:-2px;">📊 Suivi</button>
      </div>`;

    if (this._mainTab === 'suivi') {
      el.innerHTML = tabsHtml + this._renderSuivi(filtered);
      return;
    }

    let html = tabsHtml;

    // ── ZONE 1 : À FAIRE ─────────────────────────────────────────────────
    const actions = this._buildActions(filtered, planMap);
    if (actions.length > 0) {
      html += `<div class="dash-section">
        <div class="dash-section-title">🔴 À faire <span class="dash-badge">${actions.length}</span></div>
        ${actions.map(a => `
          <div class="dash-action-card" onclick="${a.onclick}">
            <div class="dash-action-icon">${a.icon}</div>
            <div class="dash-action-body">
              <div class="dash-action-label">${a.label}</div>
              ${a.sub ? `<div class="dash-action-sub">${a.sub}</div>` : ''}
            </div>
            <div class="dash-action-arrow">›</div>
          </div>`).join('')}
      </div>`;
    }

    // ── ZONE 3 : CLIENTS ─────────────────────────────────────────────────
    html += `<div class="dash-section">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:0.6rem;">
        <div class="dash-section-title" style="margin-bottom:0;">👥 Clients <span class="dash-badge dash-badge-gray">${filtered.length}</span></div>
        <input id="clientSearchInput" class="input" type="search"
          placeholder="🔍 Chercher…"
          value="${escHtml(this._searchQuery)}"
          oninput="CoachClientsPage.setSearch(this.value)"
          style="height:32px;font-size:13px;padding:0 10px;flex:1;min-width:0;border-radius:10px;">
      </div>
      ${filtered.length === 0
        ? '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">Aucun client pour ce filtre.</div></div>'
        : filtered.map(c => this._renderClientRow(c, planMap)).join('')}
    </div>`;

    el.innerHTML = html;
  },

  _setMainTab(tab) {
    this._mainTab    = tab;
    this._searchQuery = '';
    this.renderDashboard();
  },

  _renderSuivi(clients) {
    if (clients.length === 0) return `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">Aucun client pour ce filtre.</div></div>`;

    const semaine = this._mondayStr;
    const semStr  = new Date(semaine + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

    // Barre de recherche
    let html = `
      <div style="font-size:11px;color:var(--gray-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">
        Semaine du ${semStr} · ${clients.length} client${clients.length > 1 ? 's' : ''}
      </div>
      <div style="position:relative;margin-bottom:1rem;">
        <input id="suiviSearchInput" class="input" type="search" placeholder="🔍 Chercher…"
          value="${escHtml(this._searchQuery)}"
          oninput="CoachClientsPage.setSearch(this.value)"
          style="height:38px;font-size:14px;">
      </div>`;

    clients.forEach(c => {
      const initials  = ((c.prenom||'C')[0]+(c.nom?c.nom[0]:'')).toUpperCase();
      const tagHtml   = c.coach_tag ? `<span class="coach-tag coach-tag-${c.coach_tag}" style="font-size:10px;">${c.coach_tag==='ben'?'Ben':c.coach_tag==='chris'?'Chris':'Lola'}</span>` : '';

      // ── Statut bilan ───────────────────────────────────────────────
      const asgn       = this._bilanAssignations.find(a => a.client_id === c.id && a.actif);
      const pending    = this._pendingBilans.find(b => b.client_id === c.id);
      const completed  = this._completedBilans.find(b => b.client_id === c.id);
      const coachNote  = this._coachNotes.find(n => n.client_id === c.id);
      const poids      = this._lastPoids[c.id];

      let bilanBadge;
      if (!asgn) {
        bilanBadge = `<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:#f1f5f9;color:#94a3b8;font-weight:600;">Pas de bilan</span>`;
      } else if (completed) {
        const lu = completed.coach_lu !== false;
        if (coachNote?.note?.trim()) {
          bilanBadge = `<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:#dcfce7;color:#16a34a;font-weight:600;">💬 Répondu</span>`;
        } else if (lu) {
          bilanBadge = `<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:#e0f2fe;color:#0284c7;font-weight:600;">👁 Lu</span>`;
        } else {
          bilanBadge = `<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:#fef9c3;color:#b45309;font-weight:600;">✅ Rempli</span>`;
        }
      } else if (pending) {
        bilanBadge = `<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:#fef3c7;color:#d97706;font-weight:600;">⏳ En attente</span>`;
      } else {
        bilanBadge = `<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:#f1f5f9;color:#94a3b8;font-weight:600;">— Aucun</span>`;
      }

      // ── Scores scales du dernier bilan ────────────────────────────
      const scalesHtml = completed?.reponses
        ? completed.reponses.filter(r => r.type === 'scale').slice(0, 5).map(r => {
            const val   = parseFloat(r.reponse) || 0;
            const color = val >= 7 ? '#10B981' : val >= 5 ? '#C4820A' : '#EF4444';
            const short = r.label.replace(/\?.*/, '').replace(/cette semaine/i,'').trim().split(' ').slice(0,3).join(' ');
            return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;">
              <div style="flex:1;font-size:11px;color:var(--gray);">${short}</div>
              <div style="font-size:11px;font-weight:700;color:${color};min-width:28px;text-align:right;">${val}/10</div>
              <div style="width:80px;height:4px;background:var(--border-solid);border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:${val*10}%;background:${color};border-radius:2px;"></div>
              </div>
            </div>`;
          }).join('') : '';

      html += `
        <div class="card" style="margin-bottom:0.65rem;padding:12px 14px;"
          onclick="Router.navigate('coach-client-suivi',{clientId:'${c.id}'})">
          <div style="display:flex;align-items:center;gap:10px;cursor:pointer;">
            <div class="client-avatar" style="width:38px;height:38px;font-size:13px;flex-shrink:0;">${initials}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:14px;font-weight:700;color:var(--black);display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                ${c.prenom} ${c.nom || ''} ${tagHtml}
              </div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap;">
                ${bilanBadge}
                ${coachNote?.note?.trim() ? `<span style="font-size:11px;color:var(--gold);font-weight:600;">✍️ Note</span>` : ''}
                ${poids ? `<span style="font-size:11px;color:var(--gray-muted);">⚖️ ${poids.poids} kg</span>` : ''}
              </div>
            </div>
            <div style="color:var(--gray-muted);font-size:18px;">›</div>
          </div>
          ${scalesHtml ? `<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:6px;">${scalesHtml}</div>` : ''}
        </div>`;
    });

    return html;
  },

  _buildActions(clients, planMap) {
    const actions = [];

    // 1. Bilans répondus (complétés dans les 7 derniers jours, non lus)
    for (const bilan of this._completedBilans) {
      const client = clients.find(c => c.id === bilan.client_id);
      if (!client) continue;
      actions.push({
        icon: '📋',
        label: `Bilan répondu — ${client.prenom} ${client.nom || ''}`,
        sub: this._timeAgo(bilan.completed_at),
        onclick: `Router.navigate('coach-bilan-client', { clientId: '${client.id}' })`
      });
    }

    // 2. Clients sans plan actif
    for (const client of clients) {
      if (!planMap.has(client.id)) {
        actions.push({
          icon: '📝',
          label: `Sans plan — ${client.prenom} ${client.nom || ''}`,
          sub: 'Créer un plan nutritionnel',
          onclick: `Router.navigate('coach-plan-edit', { clientId: '${client.id}' })`
        });
      }
    }


    return actions;
  },

  _renderWeekRow(client, planMap) {
    const plan    = planMap.get(client.id);
    const entries = this._weekEntries.filter(e => e.profile_id === client.id);

    // Jours distincts loggués
    const datesLogged = new Set(entries.map(e => e.date_entree));
    const daysLogged  = datesLogged.size;

    // Jours écoulés depuis lundi (min 1, max 7)
    const monday       = new Date(this._mondayStr + 'T00:00:00');
    const today        = new Date();
    const daysSinceMon = Math.floor((today - monday) / 86400000) + 1;
    const totalDays    = Math.min(daysSinceMon, 7);

    // Calories moyennes / jour loggué
    const calsByDate = {};
    entries.forEach(e => {
      calsByDate[e.date_entree] = (calsByDate[e.date_entree] || 0) + (e.calories || 0);
    });
    const totalCals = Object.values(calsByDate).reduce((s, c) => s + c, 0);
    const avgCals   = daysLogged > 0 ? Math.round(totalCals / daysLogged) : 0;
    const target    = plan ? plan.calories_cible : 0;

    // Couleur selon adhérence
    const pct   = totalDays > 0 ? daysLogged / totalDays : 0;
    const color = pct >= 0.71 ? 'var(--success)' : pct >= 0.43 ? '#F59E0B' : 'var(--error)';
    const initials = ((client.prenom || 'C')[0] + (client.nom ? client.nom[0] : '')).toUpperCase();

    // Sous-texte calories
    let calLine = '';
    if (daysLogged > 0 && target > 0) {
      const diff = avgCals - target;
      const sign = diff >= 0 ? '+' : '';
      calLine = `${avgCals} kcal moy. <span style="color:${diff > 100 ? 'var(--error)' : diff < -100 ? '#3B82F6' : 'var(--success)'}">(${sign}${diff})</span> / ${target} cible`;
    } else if (daysLogged > 0) {
      calLine = `${avgCals} kcal moy.`;
    } else if (plan) {
      calLine = `Aucun log cette semaine`;
    } else {
      calLine = `Pas de plan actif`;
    }

    return `<div class="dash-week-row" onclick="Router.navigate('coach-journal-view', { clientId: '${client.id}' })">
      <div class="client-avatar" style="width:36px;height:36px;font-size:13px;flex-shrink:0;">${initials}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <div style="font-size:13px;font-weight:700;">${client.prenom} ${client.nom || ''}</div>
          <div style="font-size:12px;color:${color};font-weight:700;">${daysLogged}/${totalDays}j</div>
        </div>
        <div style="height:5px;background:var(--border-solid);border-radius:3px;overflow:hidden;margin-bottom:4px;">
          <div style="height:100%;width:${Math.round(pct * 100)}%;background:${color};border-radius:3px;transition:width 0.6s;"></div>
        </div>
        <div style="font-size:11px;color:var(--gray-muted);">${calLine}</div>
      </div>
    </div>`;
  },

  _renderClientRow(client, planMap) {
    const hasPlan       = planMap.has(client.id);
    const pendingBilan  = this._pendingBilans.find(b  => b.client_id === client.id);
    const completedBilan = this._completedBilans.find(b => b.client_id === client.id);

    const initials = ((client.prenom || 'C')[0] + (client.nom ? client.nom[0] : '')).toUpperCase();
    const tagHtml = client.coach_tag
      ? `<span class="coach-tag coach-tag-${client.coach_tag}">${client.coach_tag === 'ben' ? 'Ben' : client.coach_tag === 'chris' ? 'Chris' : 'Lola'}</span>`
      : '';

    let badges = '';
    if (completedBilan) badges += `<span class="dash-status-badge dash-status-bilan">📋 Bilan</span>`;
    if (pendingBilan)   badges += `<span class="dash-status-badge dash-status-pending">⏳ Attente</span>`;
    if (!hasPlan)       badges += `<span class="dash-status-badge dash-status-noplan">Sans plan</span>`;

    return `<div class="client-row" onclick="CoachClientsPage.openClient('${client.id}')">
      <div class="client-avatar">${initials}</div>
      <div class="client-info">
        <div class="client-name" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          ${escHtml(client.prenom)} ${escHtml(client.nom || '')} ${tagHtml}${badges}
        </div>
        <div class="client-meta">Semaine ${clientCurrentWeek(client)}</div>
      </div>
      <div style="display:flex;gap:5px;align-items:center;">
        <button class="icon-btn" title="Journal"
          onclick="event.stopPropagation();Router.navigate('coach-journal-view',{clientId:'${client.id}'})">📖</button>
        <button class="icon-btn" title="Plan"
          onclick="event.stopPropagation();Router.navigate('coach-plan-edit',{clientId:'${client.id}'})">📋</button>
        <button class="icon-btn" title="Mesures"
          onclick="event.stopPropagation();Router.navigate('coach-mesure-client',{clientId:'${client.id}',clientName:'${escJs(client.prenom)}'})">📏</button>
        <div class="client-arrow">›</div>
      </div>
    </div>`;
  },

  _timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60)  return `Il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h / 24)}j`;
  },

  openClient(id) {
    Router.navigate('coach-client-edit', { clientId: id });
  },

  // ── Création client ──────────────────────────────────────────────────────

  showCreateModal() {
    document.getElementById('coachModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('coachModal').innerHTML=''">
        <div class="modal">
          <div class="modal-title">Nouveau client
            <button class="modal-close" onclick="document.getElementById('coachModal').innerHTML=''">×</button>
          </div>
          <div id="createForm">
            <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="field"><label class="field-label">Nom</label><input class="input" id="newNom" placeholder="Dupont"></div>
              <div class="field"><label class="field-label">Prénom</label><input class="input" id="newPrenom" placeholder="Marc"></div>
            </div>
            <div class="field"><label class="field-label">Email</label><input class="input" id="newEmail" type="email" placeholder="marc@email.com"></div>
            <div id="createError"></div>
            <button class="btn btn-primary" style="width:100%" onclick="CoachClientsPage.createClient()" id="createBtn">Créer le compte</button>
          </div>
          <div id="inviteResult" style="display:none;"></div>
        </div>
      </div>`;
  },

  async createClient() {
    const nom    = document.getElementById('newNom').value.trim();
    const prenom = document.getElementById('newPrenom').value.trim();
    const email  = document.getElementById('newEmail').value.trim();
    const btn    = document.getElementById('createBtn');

    if (!prenom || !email) {
      document.getElementById('createError').innerHTML = '<div class="alert alert-error">Prénom et email requis.</div>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Création en cours…';

    try {
      await db.createClientAccount(email, prenom, nom);
      const appUrl  = APP_CONFIG.APP_URL;
      const message = `Bonjour ${prenom} 👊\n\nTon espace ONE2ONE est prêt !\n\n🔗 ${appUrl}\n📧 ${email}\n🔑 Apex2026!\n\nConnecte-toi et choisis ton nouveau mot de passe.`;
      document.getElementById('createForm').style.display = 'none';
      document.getElementById('inviteResult').style.display = 'block';
      document.getElementById('inviteResult').innerHTML = `
        <div style="text-align:center;margin-bottom:1.25rem;">
          <div style="font-size:1.5rem;margin-bottom:0.5rem;">✅</div>
          <div style="font-weight:700;margin-bottom:0.25rem;">Compte créé pour ${prenom} ${nom || ''}</div>
          <div style="font-size:13px;color:var(--gray);">Envoie ces identifiants au client via WhatsApp.</div>
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:1rem;font-size:13px;margin-bottom:1rem;line-height:1.8;">
          <div>🔗 <b>Lien :</b> ${appUrl}</div>
          <div>📧 <b>Email :</b> ${email}</div>
          <div>🔑 <b>Mot de passe :</b> Apex2026!</div>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-bottom:0.5rem;" onclick="CoachClientsPage.copyCredentials('${encodeURIComponent(message)}')">📋 Copier le message WhatsApp</button>
        <button class="btn btn-secondary" style="width:100%;" onclick="document.getElementById('coachModal').innerHTML='';CoachClientsPage.init()">Fermer</button>
      `;
    } catch (e) {
      document.getElementById('createError').innerHTML = `<div class="alert alert-error">${e.message}</div>`;
      btn.disabled = false;
      btn.textContent = 'Créer le compte';
    }
  },

  copyCredentials(encodedMsg) {
    const msg = decodeURIComponent(encodedMsg);
    navigator.clipboard.writeText(msg).then(() => {
      const btn = document.querySelector('#inviteResult .btn-primary');
      if (btn) {
        btn.textContent = '✅ Copié !';
        setTimeout(() => { btn.textContent = '📋 Copier le message WhatsApp'; }, 2000);
      }
    }).catch(() => { prompt('Copie ce message :', msg); });
  }
};
