// APEX APP — Router SPA (hash-based)

const Router = {
  currentPage: null,
  userProfile: null,

  async init() {
    // Detect Supabase password recovery redirect (retour Supabase avec access_token)
    // Ne pas confondre avec le lien d'invitation initial #invite?t=TOKEN&type=recovery
    if (window.location.hash.includes('access_token') && window.location.hash.includes('type=recovery')) {
      // Extraire les tokens AVANT de modifier le hash
      const hashStr = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hashStr);
      const at = hashParams.get('access_token');
      const rt = hashParams.get('refresh_token');
      // Établir la session explicitement (detectSessionInUrl est désactivé)
      if (at && rt) {
        try { await db.restoreSession(at, rt); } catch (_) {}
        // Backup dans sessionStorage au cas où
        sessionStorage.setItem('recovery_access_token', at);
        sessionStorage.setItem('recovery_refresh_token', rt);
      }
      history.replaceState(null, '', window.location.pathname + '#reset-password');
      document.getElementById('app').innerHTML = ResetPasswordPage.render();
      ResetPasswordPage.init();
      return;
    }
    // Detect Supabase invite redirect
    if (window.location.hash.includes('type=invite')) {
      // Établir la session AVANT de changer le hash (sinon les tokens sont perdus)
      await db.getSessionFromUrl();
      history.replaceState(null, '', window.location.pathname + '#set-password');
      document.getElementById('app').innerHTML = SetPasswordPage.render();
      SetPasswordPage.init();
      return;
    }
    window.addEventListener('hashchange', () => this.route());
    await this.route();
  },

  async route() {
    // Extraire la route sans les query params du hash (ex: #invite?t=xxx → 'invite')
    const fullHash = window.location.hash.slice(1) || 'login';
    const hash = fullHash.split('?')[0];

    // Retirer coach-wide seulement si on quitte les pages coach (évite le flash de layout)
    const coachHashes = ['coach-clients','coach-client-edit','coach-plan-edit','coach-journal','coach-journal-view','coach-habits-edit','coach-bilan-templates','coach-bilan-client','coach-mesure-client','coach-exercices','coach-prog-templates','coach-prog-template-edit','coach-client-programme','coach-training-client'];
    if (!coachHashes.includes(hash)) {
      document.body.classList.remove('coach-wide');
    }
    const user = await db.getUser();

    // Non connecté → login (sauf page invite qui est publique)
    if (!user && hash !== 'login' && hash !== 'invite') {
      window.location.hash = '#login';
      return;
    }

    // Page invite accessible sans connexion
    if (hash === 'invite') {
      app.innerHTML = InvitePage.render();
      InvitePage.init();
      return;
    }

    // Connecté → charger profil
    if (user && !this.userProfile) {
      try {
        this.userProfile = await db.getProfile(user.id);
      } catch (e) {
        console.error('Profil non trouvé', e);
      }
    }

    // Connecté sur login → rediriger
    if (user && hash === 'login') {
      if (this.userProfile && this.userProfile.role === 'coach') {
        window.location.hash = '#coach-clients';
      } else if (this.userProfile && !this.userProfile.onboarding_done) {
        window.location.hash = '#onboarding';
      } else {
        window.location.hash = '#dashboard';
      }
      return;
    }

    // Client sans onboarding → forcer changement de mdp d'abord, puis onboarding
    if (user && this.userProfile && this.userProfile.role === 'client'
        && !this.userProfile.onboarding_done && hash !== 'set-password' && hash !== 'onboarding') {
      window.location.hash = '#set-password';
      return;
    }

    // Init push notifications pour les clients (silencieux)
    if (user && this.userProfile && this.userProfile.role === 'client' && this.userProfile.onboarding_done) {
      PushNotifications.init(this.userProfile.id).catch(() => {});
    }

    // Cloisonnement role ↔ route
    const clientRoutes = ['dashboard', 'logbook', 'plan', 'snap', 'historique', 'recettes', 'client-bilan', 'onboarding', 'set-password', 'invite', 'mesure', 'entrainement', 'seance-active', 'tutorial', 'outils', 'menu'];
    const coachRoutes = ['coach-clients', 'coach-client-edit', 'coach-plan-edit', 'coach-journal', 'coach-journal-view', 'coach-habits-edit', 'coach-bilan-templates', 'coach-bilan-client', 'coach-mesure-client', 'coach-exercices', 'coach-prog-templates', 'coach-prog-template-edit', 'coach-client-programme', 'coach-training-client', 'coach-client-suivi'];
    if (this.userProfile) {
      if (this.userProfile.role === 'coach' && clientRoutes.includes(hash)) {
        window.location.hash = '#coach-clients';
        return;
      }
      if (this.userProfile.role === 'client' && coachRoutes.includes(hash)) {
        window.location.hash = '#dashboard';
        return;
      }
    }

    // Charger la page avec transition
    this.currentPage = hash;
    const app = document.getElementById('app');

    const loadPage = () => {
      switch (hash) {
        case 'login': app.innerHTML = LoginPage.render(); LoginPage.init(); break;
        case 'dashboard': app.innerHTML = DashboardPage.render(); DashboardPage.init(); break;
        case 'plan': app.innerHTML = PlanPage.render(); PlanPage.init(); break;
        case 'logbook': app.innerHTML = LogbookPage.render(); LogbookPage.init(); break;
        case 'snap': app.innerHTML = SnapPage.render(); SnapPage.init(); break;
        case 'historique': app.innerHTML = HistoriquePage.render(); HistoriquePage.init(); break;
        case 'recettes': app.innerHTML = RecettesPage.render(); RecettesPage.init(); break;
        case 'client-bilan': app.innerHTML = ClientBilanPage.render(); ClientBilanPage.init(); break;
        case 'onboarding': app.innerHTML = OnboardingPage.render(); OnboardingPage.init(); break;
        case 'set-password': app.innerHTML = SetPasswordPage.render(); SetPasswordPage.init(); break;
        case 'invite': app.innerHTML = InvitePage.render(); InvitePage.init(); break;
        case 'coach-clients': app.innerHTML = CoachClientsPage.render(); CoachClientsPage.init(); break;
        case 'coach-client-edit': app.innerHTML = CoachClientEditPage.render(); CoachClientEditPage.init(); break;
        case 'coach-plan-edit': app.innerHTML = CoachPlanEditPage.render(); CoachPlanEditPage.init(); break;
        case 'coach-journal':
        case 'coach-journal-view': app.innerHTML = CoachJournalPage.render(); CoachJournalPage.init(); break;
        case 'coach-habits-edit': app.innerHTML = CoachHabitsEditPage.render(); CoachHabitsEditPage.init(); break;
        case 'coach-bilan-templates': app.innerHTML = CoachBilanTemplatesPage.render(); CoachBilanTemplatesPage.init(); break;
        case 'coach-bilan-client': app.innerHTML = CoachBilanClientPage.render(); CoachBilanClientPage.init(); break;
        case 'mesure': app.innerHTML = MesurePage.render(); MesurePage.init(); break;
        case 'entrainement': app.innerHTML = EntrainementPage.render(); EntrainementPage.init(); break;
        case 'seance-active': app.innerHTML = SeanceActivePage.render(); SeanceActivePage.init(); break;
        case 'tutorial': app.innerHTML = TutorialPage.render(); TutorialPage.init(); break;
        case 'outils': app.innerHTML = OutilsPage.render(); OutilsPage.init(); break;
        case 'menu': app.innerHTML = MenuPage.render(); MenuPage.init(); break;
        case 'coach-mesure-client': app.innerHTML = CoachMesureClientPage.render(); CoachMesureClientPage.init(); break;
        case 'coach-exercices': app.innerHTML = CoachExercicesPage.render(); CoachExercicesPage.init(); break;
        case 'coach-prog-templates': app.innerHTML = CoachProgTemplatesPage.render(); CoachProgTemplatesPage.init(); break;
        case 'coach-prog-template-edit': app.innerHTML = CoachProgTemplateEditPage.render(); CoachProgTemplateEditPage.init(); break;
        case 'coach-client-programme': app.innerHTML = CoachClientProgrammePage.render(); CoachClientProgrammePage.init(); break;
        case 'coach-training-client': app.innerHTML = CoachTrainingClientPage.render(); CoachTrainingClientPage.init(); break;
        case 'coach-client-suivi':    app.innerHTML = CoachClientSuiviPage.render();   CoachClientSuiviPage.init();   break;
        default: window.location.hash = '#login';
      }
      // Classe d'entrée sur le conteneur
      app.classList.remove('page-enter');
      void app.offsetWidth; // force reflow
      app.classList.add('page-enter');
    };

    // Si du contenu est déjà là, fade-out rapide avant de charger
    if (app.children.length > 0) {
      app.classList.add('page-exit');
      setTimeout(() => {
        app.classList.remove('page-exit');
        loadPage();
      }, 160);
    } else {
      loadPage();
    }

  },

  navigate(page, params) {
    if (params) sessionStorage.setItem('routeParams', JSON.stringify(params));
    window.location.hash = '#' + page;
  },

  getParams() {
    try { return JSON.parse(sessionStorage.getItem('routeParams') || '{}'); } catch { return {}; }
  },

  async logout() {
    // Fermer le modal de confirmation avant de naviguer
    const modal = document.getElementById('logoutModal');
    if (modal) modal.remove();
    await db.signOut();
    this.userProfile = null;
    window.location.hash = '#login';
  },

  confirmLogout() {
    if (document.getElementById('logoutModal')) return;
    const modal = document.createElement('div');
    modal.id = 'logoutModal';
    modal.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1.5rem;">
        <div style="background:var(--white);border-radius:var(--radius);padding:1.75rem 1.5rem;width:100%;max-width:320px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.2);">
          <div style="font-size:2rem;margin-bottom:0.75rem;">⏻</div>
          <div style="font-weight:700;font-size:16px;margin-bottom:0.5rem;">Se déconnecter ?</div>
          <div style="font-size:13px;color:var(--gray-light);margin-bottom:1.5rem;line-height:1.5;">Tu devras te reconnecter pour accéder à ton espace.</div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('logoutModal').remove()">Annuler</button>
            <button class="btn" style="flex:1;background:#E05252;color:white;border-color:#E05252;" onclick="Router.logout()">Déconnexion</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
};

// Helpers
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() {
  return formatDate(new Date());
}

function formatDateFR(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function creneauLabel(code) {
  const labels = {
    'petit_dejeuner': 'Petit-déjeuner', 'petit_dejeuner_sale': 'Petit-déjeuner salé',
    'petit_dejeuner_sucre': 'Petit-déjeuner sucré', 'collation_matin': 'Collation matin',
    'dejeuner': 'Déjeuner', 'collation_apres_midi': 'Collation après-midi',
    'diner': 'Dîner', 'collation_soir': 'Collation soir'
  };
  return labels[code] || code;
}

function creneauIcon(code) {
  const icons = {
    'petit_dejeuner': '🌅', 'petit_dejeuner_sale': '🥓', 'petit_dejeuner_sucre': '🥐',
    'collation_matin': '🍎', 'dejeuner': '🍽️',
    'collation_apres_midi': '🥜', 'diner': '🌙', 'collation_soir': '🫖'
  };
  return icons[code] || '🍴';
}

function pctBar(current, target, color) {
  const pct = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0;
  const over = current > target;
  const style = color ? `width:${pct}%;background:${color}` : `width:${pct}%`;
  return `<div class="pct-bar"><div class="pct-fill ${over ? 'over' : ''}" style="${style}"></div></div>`;
}

function noteEmoji(note) {
  if (note >= 8) return '🟢';
  if (note >= 5) return '🟡';
  return '🔴';
}

// ── Navigation partagée — pages client ───────────────────────
function clientNav(activeTab) {
  const items = [
    { key: 'dashboard',    icon: '🏠', label: 'Accueil' },
    { key: 'logbook',      icon: '🥗', label: 'Nutrition' },
    { key: 'entrainement', icon: '💪', label: 'Entraîn.' },
    { key: 'mesure',       icon: '📏', label: 'Mesures' },
    { key: 'outils',       icon: '🛠️', label: 'Outils' },
  ];
  return `<nav class="nav-bottom"><div class="nav-inner">${items.map(i =>
    `<a class="nav-item${i.key === activeTab ? ' active' : ''}" href="#${i.key}"><span class="nav-icon">${i.icon}</span><span class="nav-label">${i.label}</span></a>`
  ).join('')}</div></nav>`;
}

// ── Navigation partagée — pages client coach ─────────────────
function coachClientNav(clientId, activeTab) {
  const tabs = [
    { key: 'coach-client-suivi',      label: '📊 Suivi' },
    { key: 'coach-client-edit',      label: '👤 Infos' },
    { key: 'coach-plan-edit',        label: '📋 Plan' },
    { key: 'coach-habits-edit',      label: '✅ Habitudes' },
    { key: 'coach-journal',          label: '📖 Journal' },
    { key: 'coach-bilan-client',     label: '📝 Bilans' },
    { key: 'coach-mesure-client',    label: '📏 Mesures' },
    { key: 'coach-client-programme', label: '💪 Programmes' },
    { key: 'coach-training-client',  label: '🏋️ Séances' },
  ];
  return `
    <div class="tabs" style="margin-bottom:1.25rem;">${
      tabs.map(t => `<button class="tab${activeTab === t.key ? ' active' : ''}"
        onclick="Router.navigate('${t.key}',{clientId:'${clientId}'})">${t.label}</button>`).join('')
    }</div>`;
}

function clientCurrentWeek(client) {
  if (client.date_debut) {
    const start = new Date(client.date_debut + 'T00:00:00');
    const diff = Math.floor((new Date() - start) / (7 * 24 * 3600 * 1000));
    return Math.max(1, diff + 1);
  }
  return client.semaine_courante || 1;
}

function lastSaturdayStr(date) {
  const d = new Date(date || new Date());
  const back = (d.getDay() + 1) % 7; // sam=0, dim=1, lun=2 …
  d.setDate(d.getDate() - back);
  return formatDate(d);
}
