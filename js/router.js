// APEX APP — Router SPA (hash-based)

const Router = {
  currentPage: null,
  userProfile: null,

  async init() {
    window.addEventListener('hashchange', () => this.route());
    await this.route();
  },

  async route() {
    const hash = window.location.hash.slice(1) || 'login';
    const user = await db.getUser();

    // Non connecté → login
    if (!user && hash !== 'login') {
      window.location.hash = '#login';
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
      } else {
        window.location.hash = '#dashboard';
      }
      return;
    }

    // Cloisonnement role ↔ route
    const clientRoutes = ['dashboard', 'logbook', 'plan', 'snap', 'historique'];
    const coachRoutes = ['coach-clients', 'coach-client-edit', 'coach-plan-edit', 'coach-journal', 'coach-habits-edit'];
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

    // Charger la page
    this.currentPage = hash;
    const app = document.getElementById('app');

    switch (hash) {
      case 'login': app.innerHTML = LoginPage.render(); LoginPage.init(); break;
      case 'dashboard': app.innerHTML = DashboardPage.render(); DashboardPage.init(); break;
      case 'plan': app.innerHTML = PlanPage.render(); PlanPage.init(); break;
      case 'logbook': app.innerHTML = LogbookPage.render(); LogbookPage.init(); break;
      case 'snap': app.innerHTML = SnapPage.render(); SnapPage.init(); break;
      case 'historique': app.innerHTML = HistoriquePage.render(); HistoriquePage.init(); break;
      case 'coach-clients': app.innerHTML = CoachClientsPage.render(); CoachClientsPage.init(); break;
      case 'coach-client-edit': app.innerHTML = CoachClientEditPage.render(); CoachClientEditPage.init(); break;
      case 'coach-plan-edit': app.innerHTML = CoachPlanEditPage.render(); CoachPlanEditPage.init(); break;
      case 'coach-journal': app.innerHTML = CoachJournalPage.render(); CoachJournalPage.init(); break;
      case 'coach-habits-edit': app.innerHTML = CoachHabitsEditPage.render(); CoachHabitsEditPage.init(); break;
      default: window.location.hash = '#login';
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
    await db.signOut();
    this.userProfile = null;
    window.location.hash = '#login';
  }
};

// Helpers
function formatDate(date) {
  return date.toISOString().split('T')[0];
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

function pctBar(current, target) {
  const pct = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0;
  const over = current > target;
  return `<div class="pct-bar"><div class="pct-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div>`;
}

function noteEmoji(note) {
  if (note >= 8) return '🟢';
  if (note >= 5) return '🟡';
  return '🔴';
}
