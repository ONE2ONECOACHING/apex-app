// APEX APP — Client : Outils

const OutilsPage = {
  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE</div>
          <div class="app-title">Outils</div>
        </div>
      </div>
      <div id="outilsContent"></div>
      ${clientNav('outils')}`;
  },

  init() {
    const profile = Router.userProfile;
    if (!profile || profile.role === 'coach') { window.location.hash = '#dashboard'; return; }

    document.getElementById('outilsContent').innerHTML = `
      <div style="padding:1rem 1rem 6rem;">

        <div class="dash-section-title">Aide</div>

        <div class="card card-tap" onclick="window.location.hash='#tutorial'" style="cursor:pointer;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="font-size:32px;line-height:1;">🎓</div>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:15px;margin-bottom:2px;">Tutoriel de l'app</div>
              <div style="font-size:13px;color:var(--gray-light);">Revoir la présentation de tous les outils</div>
            </div>
            <div style="color:var(--gray-muted);font-size:18px;">›</div>
          </div>
        </div>

        <div class="card card-tap" onclick="window.location.hash='#menu'" style="cursor:pointer;margin-top:0;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="font-size:32px;line-height:1;">🍽️</div>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:15px;margin-bottom:2px;">Carte restaurant</div>
              <div style="font-size:13px;color:var(--gray-light);">Photo de la carte → l'IA te recommande les meilleurs plats</div>
            </div>
            <div style="color:var(--gray-muted);font-size:18px;">›</div>
          </div>
        </div>

        <div class="dash-section-title" style="margin-top:1.75rem;">Bientôt disponible</div>

        <div class="card" style="opacity:0.5;pointer-events:none;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="font-size:32px;line-height:1;">🤖</div>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:15px;margin-bottom:2px;">Coach IA</div>
              <div style="font-size:13px;color:var(--gray-light);">Répond à tes questions nutrition & entraînement</div>
            </div>
            <div style="background:var(--gold-light);color:var(--gold);font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;white-space:nowrap;">Bientôt</div>
          </div>
        </div>

        <div class="card" style="opacity:0.5;pointer-events:none;margin-top:0;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="font-size:32px;line-height:1;">📊</div>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:15px;margin-bottom:2px;">Analyse de progression</div>
              <div style="font-size:13px;color:var(--gray-light);">Visualise tes tendances et prédictions</div>
            </div>
            <div style="background:var(--gold-light);color:var(--gold);font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;white-space:nowrap;">Bientôt</div>
          </div>
        </div>

      </div>`;
  }
};
