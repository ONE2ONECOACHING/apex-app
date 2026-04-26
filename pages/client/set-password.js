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
              <input type="password" class="input" id="spPass1" placeholder="8 caractères minimum" autocomplete="new-password">
            </div>
            <div class="field">
              <label class="field-label">Confirmer le mot de passe</label>
              <input type="password" class="input" id="spPass2" placeholder="••••••••" autocomplete="new-password">
            </div>

            <button class="btn btn-primary" style="width:100%;margin-top:0.5rem;" onclick="SetPasswordPage.submit()" id="spBtn">
              Accéder à mon espace →
            </button>
          </div>

        </div>
      </div>`;
  },

  init() {
    // Écouter la touche Entrée
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Enter') {
        SetPasswordPage.submit();
        document.removeEventListener('keydown', handler);
      }
    });
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
