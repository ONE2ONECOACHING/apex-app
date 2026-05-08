// APEX APP — Page : Choix du mot de passe (flow invitation)

const SetPasswordPage = {
  render() {
    return `
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;">
        <div style="width:100%;max-width:400px;">

          <div style="text-align:center;margin-bottom:2.5rem;">
            <div style="font-size:2.5rem;margin-bottom:1rem;">👊</div>
            <div style="font-size:22px;font-weight:800;color:var(--text);">Bienvenue !</div>
            <div style="font-size:14px;color:var(--gray);margin-top:0.5rem;">Choisis ton mot de passe pour accéder à ton espace.</div>
          </div>

          <div class="card" style="padding:1.5rem;">
            <div id="spAlert"></div>

            <div class="field">
              <label class="field-label">Mot de passe</label>
              <div style="position:relative;">
                <input type="password" class="input" id="spPass1" placeholder="8 caractères minimum" autocomplete="new-password" style="padding-right:44px;">
                <button type="button" onclick="SetPasswordPage.togglePwd('spPass1','spIcon1')"
                  style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--gray-muted);padding:4px;line-height:1;">
                  <svg id="spIcon1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <div class="field">
              <label class="field-label">Confirmer le mot de passe</label>
              <div style="position:relative;">
                <input type="password" class="input" id="spPass2" placeholder="••••••••" autocomplete="new-password" style="padding-right:44px;">
                <button type="button" onclick="SetPasswordPage.togglePwd('spPass2','spIcon2')"
                  style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--gray-muted);padding:4px;line-height:1;">
                  <svg id="spIcon2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>

            <button class="btn btn-primary" style="width:100%;margin-top:0.5rem;" onclick="SetPasswordPage.submit()" id="spBtn">
              Accéder à mon espace →
            </button>
          </div>

        </div>
      </div>`;
  },

  init() {
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Enter') {
        SetPasswordPage.submit();
        document.removeEventListener('keydown', handler);
      }
    });
  },

  togglePwd(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon  = document.getElementById(iconId);
    if (input.type === 'password') {
      input.type = 'text';
      icon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
    } else {
      input.type = 'password';
      icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    }
  },

  async submit() {
    const pass1 = document.getElementById('spPass1').value;
    const pass2 = document.getElementById('spPass2').value;
    const alertEl = document.getElementById('spAlert');
    const btn = document.getElementById('spBtn');

    alertEl.innerHTML = '';

    if (!pass1 || pass1.length < 8) {
      alertEl.innerHTML = '<div class="alert alert-error">Le mot de passe doit faire au moins 8 caractères.</div>';
      return;
    }
    if (pass1 !== pass2) {
      alertEl.innerHTML = '<div class="alert alert-error">Les mots de passe ne correspondent pas.</div>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Enregistrement…';

    try {
      await db.updatePassword(pass1);
      // Recharger le profil puis aller à l'onboarding
      Router.userProfile = null;
      window.location.hash = '#onboarding';
    } catch (e) {
      alertEl.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
      btn.disabled = false;
      btn.textContent = 'Accéder à mon espace →';
    }
  }
};
