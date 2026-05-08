// APEX APP — Invite à installer l'app sur l'écran d'accueil

const InstallPrompt = {
  _deferredPrompt: null,

  init() {
    // Déjà installée en standalone → rien à faire
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;
    // Déjà dismissé
    if (localStorage.getItem('installDismissed')) return;

    // Android : intercepter l'event natif
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this._deferredPrompt = e;
      setTimeout(() => this.show(), 3000);
    });

    // iOS Safari : pas d'event natif, on détecte manuellement
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setTimeout(() => this.show(), 3000);
    }
  },

  show() {
    if (document.getElementById('installBanner')) return;

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;

    const banner = document.createElement('div');
    banner.id = 'installBanner';
    banner.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;z-index:999;
      background:var(--white);border-top:1px solid var(--border);
      padding:1rem 1rem calc(1rem + env(safe-area-inset-bottom));
      box-shadow:0 -4px 20px rgba(0,0,0,0.1);
      animation:slideUp 0.3s ease;
    `;

    if (isIOS) {
      banner.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="font-size:28px;flex-shrink:0;">📲</div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;margin-bottom:4px;">Installer l'app</div>
            <div style="font-size:13px;color:var(--gray);line-height:1.5;">
              Appuie sur
              <span style="display:inline-flex;align-items:center;gap:2px;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 5px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Partager
              </span>
              puis <strong>"Sur l'écran d'accueil"</strong>
            </div>
          </div>
          <button onclick="InstallPrompt.dismiss()" style="background:none;border:none;font-size:20px;color:var(--gray-muted);cursor:pointer;padding:0;flex-shrink:0;">✕</button>
        </div>`;
    } else {
      // Détecter si l'utilisateur est sur mobile ou desktop
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const subtext = isMobileDevice
        ? 'Accès rapide depuis ton téléphone'
        : 'Installe l\'app sur ton ordinateur pour un accès rapide';
      const icon = isMobileDevice ? '📲' : '💻';

      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="font-size:28px;flex-shrink:0;">${icon}</div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;margin-bottom:2px;">Installer l'app</div>
            <div style="font-size:13px;color:var(--gray);">${subtext}</div>
          </div>
          <button onclick="InstallPrompt.install()" style="background:var(--gold);color:white;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;">Installer</button>
          <button onclick="InstallPrompt.dismiss()" style="background:none;border:none;font-size:20px;color:var(--gray-muted);cursor:pointer;padding:0;">✕</button>
        </div>`;
    }

    document.body.appendChild(banner);

    // Ajoute l'animation CSS si pas déjà présente
    if (!document.getElementById('installBannerStyle')) {
      const style = document.createElement('style');
      style.id = 'installBannerStyle';
      style.textContent = `@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`;
      document.head.appendChild(style);
    }
  },

  async install() {
    if (!this._deferredPrompt) return;
    this._deferredPrompt.prompt();
    const { outcome } = await this._deferredPrompt.userChoice;
    if (outcome === 'accepted') this.dismiss();
    this._deferredPrompt = null;
  },

  dismiss() {
    const banner = document.getElementById('installBanner');
    if (banner) banner.remove();
    localStorage.setItem('installDismissed', '1');
  }
};
