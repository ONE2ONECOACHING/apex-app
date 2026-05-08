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
          <div style="position:relative;">
            <input type="password" class="input" id="loginPassword" placeholder="••••••••" autocomplete="current-password" style="padding-right:44px;">
            <button type="button" id="loginPwdToggle" onclick="LoginPage.togglePwd()"
              style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--gray-muted);padding:4px;line-height:1;" title="Afficher/masquer">
              <svg id="loginPwdIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
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

  togglePwd() {
    const input = document.getElementById('loginPassword');
    const icon  = document.getElementById('loginPwdIcon');
    if (input.type === 'password') {
      input.type = 'text';
      // Icône "œil barré"
      icon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
    } else {
      input.type = 'password';
      // Icône "œil"
      icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    }
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
      // Vider le champ MDP et le remettre en mode masqué
      const pwdInput = document.getElementById('loginPassword');
      pwdInput.value = '';
      pwdInput.type  = 'password';
      const icon = document.getElementById('loginPwdIcon');
      if (icon) icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
      btn.disabled = false;
      btn.textContent = 'Se connecter';
    }
  }
};
