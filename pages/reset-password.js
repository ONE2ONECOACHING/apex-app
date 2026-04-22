// APEX APP — Reset Password

const ResetPasswordPage = {
  render() {
    return `
      <div style="display:flex;flex-direction:column;justify-content:center;min-height:90vh;">
        <div style="text-align:center;margin-bottom:2rem;">
          <div class="app-logo" style="font-size:13px;margin-bottom:0.5rem;">ONE2ONE — APEX</div>
          <div style="font-size:24px;font-weight:700;color:var(--black);margin-bottom:0.25rem;">Nouveau mot de passe</div>
          <div style="font-size:14px;color:var(--gray-light);">Choisis ton nouveau mot de passe</div>
        </div>
        <div id="resetAlert"></div>
        <div class="field">
          <label class="field-label">Nouveau mot de passe</label>
          <input type="password" class="input" id="resetPwd1" placeholder="••••••••" autocomplete="new-password">
        </div>
        <div class="field">
          <label class="field-label">Confirmer</label>
          <input type="password" class="input" id="resetPwd2" placeholder="••••••••" autocomplete="new-password">
        </div>
        <button class="btn btn-primary" id="resetBtn" onclick="ResetPasswordPage.submit()">Enregistrer</button>
      </div>`;
  },

  init() {},

  async submit() {
    const pwd1 = document.getElementById('resetPwd1').value;
    const pwd2 = document.getElementById('resetPwd2').value;
    const alertEl = document.getElementById('resetAlert');
    const btn = document.getElementById('resetBtn');

    if (!pwd1 || pwd1.length < 6) {
      alertEl.innerHTML = '<div class="alert alert-error">Minimum 6 caractères.</div>';
      return;
    }
    if (pwd1 !== pwd2) {
      alertEl.innerHTML = '<div class="alert alert-error">Les mots de passe ne correspondent pas.</div>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Enregistrement…';

    try {
      await db.updatePassword(pwd1);
      alertEl.innerHTML = '<div class="alert alert-success">✅ Mot de passe mis à jour ! Reconnecte-toi.</div>';
      await db.signOut();
      setTimeout(() => { Router.userProfile = null; window.location.hash = '#login'; }, 2000);
    } catch (e) {
      alertEl.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
      btn.disabled = false;
      btn.textContent = 'Enregistrer';
    }
  }
};
