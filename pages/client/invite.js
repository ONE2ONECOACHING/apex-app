// APEX APP — Page : Activation compte (lien d'invitation)

const InvitePage = {
  render() {
    return `
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;">
        <div style="width:100%;max-width:400px;text-align:center;">
          <div style="font-size:3rem;margin-bottom:1.5rem;">👊</div>
          <div style="font-size:22px;font-weight:800;color:var(--text);margin-bottom:0.75rem;">Bienvenue chez ONE2ONE !</div>
          <div style="font-size:15px;color:var(--gray);margin-bottom:2.5rem;line-height:1.6;">
            Ton coach a créé ton espace personnalisé.<br>Clique pour activer ton compte.
          </div>
          <button class="btn btn-primary" style="width:100%;font-size:16px;padding:16px;" onclick="InvitePage.activate()" id="inviteActivateBtn">
            Activer mon compte →
          </button>
          <div id="inviteError" style="margin-top:1rem;"></div>
        </div>
      </div>`;
  },

  init() {},

  async activate() {
    const btn = document.getElementById('inviteActivateBtn');
    const errEl = document.getElementById('inviteError');
    btn.disabled = true;
    btn.textContent = 'Activation…';
    errEl.innerHTML = '';

    // Lire email + mot de passe temporaire depuis le hash
    const hash = window.location.hash;
    const qIndex = hash.indexOf('?');
    if (qIndex === -1) {
      errEl.innerHTML = '<div class="alert alert-error">Lien invalide.</div>';
      btn.disabled = false; btn.textContent = 'Activer mon compte →';
      return;
    }
    const params = new URLSearchParams(hash.slice(qIndex + 1));
    const email = params.get('email');
    const tmp = params.get('tmp');

    if (!email || !tmp) {
      errEl.innerHTML = '<div class="alert alert-error">Lien invalide ou expiré.</div>';
      btn.disabled = false; btn.textContent = 'Activer mon compte →';
      return;
    }

    try {
      // Connexion directe avec le mot de passe temporaire → session établie immédiatement
      await db.signIn(email, tmp);
      // Afficher directement la page de création de mot de passe sans passer par le router
      Router.userProfile = null;
      history.replaceState(null, '', window.location.pathname + '#set-password');
      document.getElementById('app').innerHTML = SetPasswordPage.render();
      SetPasswordPage.init();
    } catch (e) {
      errEl.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
      btn.disabled = false;
      btn.textContent = 'Activer mon compte →';
    }
  }
};
