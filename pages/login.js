// APEX APP — Page Login

const LoginPage = {
  render() {
    return `
      <div style="display:flex;flex-direction:column;justify-content:center;min-height:90vh;">
        <div style="text-align:center;margin-bottom:2rem;">
          <div class="app-logo" style="font-size:13px;margin-bottom:0.5rem;">ONE2ONE — APEX</div>
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
      </div>`;
  },

  init() {
    document.getElementById('loginPassword').addEventListener('keydown', e => {
      if (e.key === 'Enter') LoginPage.submit();
    });
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
