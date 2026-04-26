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

  activate() {
    const btn = document.getElementById('inviteActivateBtn');
    btn.disabled = true;
    btn.textContent = 'Activation…';

    // Récupérer le token depuis le hash : #invite?t=TOKEN
    const hash = window.location.hash; // ex: #invite?t=abc123
    const qIndex = hash.indexOf('?');
    if (qIndex === -1) {
      document.getElementById('inviteError').innerHTML = '<div class="alert alert-error">Lien invalide.</div>';
      btn.disabled = false;
      btn.textContent = 'Activer mon compte →';
      return;
    }
    const params = new URLSearchParams(hash.slice(qIndex + 1));
    const token = params.get('t');
    const type = params.get('type') || 'recovery';

    if (!token) {
      document.getElementById('inviteError').innerHTML = '<div class="alert alert-error">Token manquant.</div>';
      btn.disabled = false;
      btn.textContent = 'Activer mon compte →';
      return;
    }

    // Naviguer vers Supabase UNIQUEMENT quand l'utilisateur clique
    const verifyUrl = `${APP_CONFIG.SUPABASE_URL}/auth/v1/verify?token=${token}&type=${type}&redirect_to=${encodeURIComponent(APP_CONFIG.APP_URL)}`;
    window.location.href = verifyUrl;
  }
};
