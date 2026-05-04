// APEX APP — Page Login

const LoginPage = {
  render() {
    return `
      <div style="display:flex;flex-direction:column;justify-content:center;min-height:90vh;">
        <div style="text-align:center;margin-bottom:2rem;">
          <div style="margin-bottom:1.25rem;">
            <img src="img/logo.svg" alt="ONE2ONE" style="width:80px;height:80px;display:block;margin:0 auto;
              filter:drop-shadow(0 6px 18px rgba(0,74,173,0.35));border-radius:22px;">
          </div>
          <div class="app-logo" style="font-size:13px;margin-bottom:0.5rem;letter-spacing:0.2em;">ONE2ONE</div>
          <div style="font-size:24px;font-weight:700;color:var(--black);margin-bottom:0.25rem;">Bienvenue</div>
          <div style="font-size:14px;color:var(--gray-light);">Connecte-toi pour accéder à ton espace</div>
        </div>
        <div id="loginAlert"></div>
        <div class="field">
          <label class="field-label">Email</label>
          <input type="email" class="input" id="loginEmail" placeholder="ton@email.com" autocomplete="email">
        </div>
        <div class="field">
          <label class="field-label">Mot de passe</label>
          <input type="password" class="input" id="loginPassword" placeholder="••••••••" autocomplete="current-password">
        </div>
        <button class="btn btn-primary" id="loginBtn" onclick="LoginPage.submit()">Se connecter</button>
        <div style="text-align:center;margin-top:1rem;">
          <button class="btn btn-ghost btn-small" onclick="LoginPage.toggleReset()" style="font-size:13px;color:var(--gray);">Mot de passe oublié ?</button>
        </div>
        <div id="resetForm" style="display:none;margin-top:1rem;padding:1rem;background:var(--bg);border-radius:var(--radius);border:1px solid var(--border);">
          <div style="font-size:13px;font-weight:600;margin-bottom:0.75rem;">Réinitialiser le mot de passe</div>
          <div id="resetAlert"></div>
          <div class="field">
            <label class="field-label">Ton email</label>
            <input type="email" class="input" id="resetEmail" placeholder="ton@email.com">
          </div>
          <button class="btn btn-secondary" onclick="LoginPage.sendReset()">Envoyer le lien</button>
        </div>
      </div>`;
  },

  init() {
    document.getElementById('loginPassword').addEventListener('keydown', e => {
      if (e.key === 'Enter') LoginPage.submit();
    });
  },

  toggleReset() {
    const f = document.getElementById('resetForm');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
  },

  async sendReset() {
    const email = document.getElementById('resetEmail').value.trim();
    const alertEl = document.getElementById('resetAlert');
    if (!email) { alertEl.innerHTML = '<div class="alert alert-error">Entre ton email.</div>'; return; }
    try {
      await db.resetPassword(email);
      alertEl.innerHTML = '<div class="alert alert-success">✅ Lien envoyé ! Vérifie ta boîte mail.</div>';
    } catch (e) {
      alertEl.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  },

  async submit() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    const alert = document.getElementById('loginAlert');

    if (!email || !password) {
      alert.innerHTML = '<div class="alert alert-error">Merci de remplir tous les champs.</div>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Connexion…';

    try {
      await db.signIn(email, password);
      Router.userProfile = null;
      window.location.hash = '#dashboard';
    } catch (e) {
      alert.innerHTML = `<div class="alert alert-error">Email ou mot de passe incorrect.</div>`;
      btn.disabled = false;
      btn.textContent = 'Se connecter';
    }
  }
};
