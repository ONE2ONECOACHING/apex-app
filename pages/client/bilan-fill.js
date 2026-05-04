// APEX APP — Client : Remplir un bilan hebdo

const ClientBilanPage = {
  instance: null,
  answers: {},

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE</div>
          <div class="app-title">Bilan hebdo</div>
        </div>
        <button class="header-btn" onclick="history.back()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
      <div id="bilanContent"><div class="spinner" style="margin-top:3rem;"></div></div>
      <nav class="nav-bottom"><div class="nav-inner">
        <a class="nav-item" href="#dashboard"><span class="nav-icon">🏠</span><span class="nav-label">Dashboard</span></a>
        <a class="nav-item" href="#logbook"><span class="nav-icon">📖</span><span class="nav-label">Logbook</span></a>
        <a class="nav-item" href="#recettes"><span class="nav-icon">🍽️</span><span class="nav-label">Recettes</span></a>
        <a class="nav-item" href="#plan"><span class="nav-icon">📋</span><span class="nav-label">Plan</span></a>
        <a class="nav-item" href="#historique"><span class="nav-icon">📈</span><span class="nav-label">Historique</span></a>
      </div></nav>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile || profile.role === 'coach') { window.location.hash = '#dashboard'; return; }

    try {
      // Lazy trigger : crée l'instance de la semaine si une assignation existe
      await db.ensureBilanInstance(profile.id).catch(() => {});

      const pending = await db.getPendingBilans(profile.id);
      if (pending.length === 0) {
        document.getElementById('bilanContent').innerHTML = `
          <div class="empty-state" style="padding:3rem 1rem;">
            <div class="empty-icon">✅</div>
            <div class="empty-text">Aucun bilan en attente.<br>Tout est à jour !</div>
          </div>
          <button class="btn btn-secondary" style="margin-top:1rem;" onclick="window.location.hash='#dashboard'">← Dashboard</button>`;
        return;
      }

      this.instance = pending[0];
      this.answers = {};
      // Pré-remplir les scales à 5
      (this.instance.questions_snapshot || []).forEach(q => {
        if (q.type === 'scale') this.answers[q.id] = '5';
      });
      this.renderForm();
    } catch (e) {
      document.getElementById('bilanContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  renderForm() {
    const inst = this.instance;
    const qs = inst.questions_snapshot || [];
    const semStr = new Date(inst.semaine + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    let html = `
      <div class="card card-accent" style="margin-bottom:1.25rem;">
        <div style="font-size:12px;color:var(--gray-muted);text-transform:uppercase;letter-spacing:0.06em;">Bilan hebdomadaire</div>
        <div style="font-size:18px;font-weight:700;color:var(--gold);margin-top:3px;">Semaine du ${semStr}</div>
      </div>`;

    if (qs.length === 0) {
      html += `<div class="alert alert-error">Ce bilan ne contient aucune question.</div>`;
    } else {
      qs.forEach(q => {
        html += `<div class="bilan-question">
          <div class="bilan-q-label">${q.label}</div>`;

        if (q.type === 'scale') {
          html += `
            <div style="display:flex;align-items:center;gap:10px;margin-top:10px;">
              <input type="range" class="bilan-range" id="bq_${q.id}" min="1" max="10" value="5"
                oninput="ClientBilanPage.setAnswer('${q.id}',this.value);document.getElementById('bq_${q.id}_val').textContent=this.value">
              <span id="bq_${q.id}_val" style="font-size:24px;font-weight:700;color:var(--gold);min-width:30px;text-align:center;">5</span>
              <span style="font-size:13px;color:var(--gray-muted);">/10</span>
            </div>`;

        } else if (q.type === 'text') {
          html += `
            <textarea class="input" id="bq_${q.id}" rows="3" placeholder="Ta réponse…"
              style="margin-top:8px;resize:none;"
              oninput="ClientBilanPage.setAnswer('${q.id}',this.value)"></textarea>`;

        } else if (q.type === 'number') {
          html += `
            <input type="number" class="input" id="bq_${q.id}" placeholder="0"
              style="margin-top:8px;max-width:140px;"
              oninput="ClientBilanPage.setAnswer('${q.id}',this.value)">`;

        } else if (q.type === 'choice') {
          const opts = q.options || [];
          html += `<div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">`;
          opts.forEach(opt => {
            html += `
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;padding:8px 10px;background:var(--card-bg);border-radius:var(--radius-sm);border:1.5px solid var(--border);">
                <input type="radio" name="bq_${q.id}" value="${opt}"
                  style="width:18px;height:18px;accent-color:var(--gold);flex-shrink:0;"
                  onchange="ClientBilanPage.setAnswer('${q.id}',this.value)">
                <span>${opt}</span>
              </label>`;
          });
          html += `</div>`;
        }

        html += `</div>`;
      });
    }

    html += `
      <div id="bilanSubmitMsg"></div>
      <button class="btn btn-primary" style="margin-top:0.5rem;height:50px;font-size:15px;" onclick="ClientBilanPage.submit()">
        ✅ Envoyer mon bilan
      </button>`;

    document.getElementById('bilanContent').innerHTML = html;
  },

  setAnswer(questionId, value) {
    this.answers[questionId] = value;
  },

  async submit() {
    const inst = this.instance;
    const qs = inst.questions_snapshot || [];

    // Vérifier que les champs texte/nombre/choix sont remplis
    const missing = qs.filter(q => q.type !== 'scale' && !this.answers[q.id]);
    if (missing.length > 0) {
      document.getElementById('bilanSubmitMsg').innerHTML =
        `<div class="alert alert-error" style="margin-bottom:0.5rem;">Réponds à toutes les questions (${missing.length} manquante${missing.length > 1 ? 's' : ''}).</div>`;
      return;
    }

    const reponses = qs.map(q => ({
      id: q.id,
      label: q.label,
      type: q.type,
      reponse: this.answers[q.id] || ''
    }));

    const btn = document.querySelector('#bilanContent .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Envoi…'; }

    try {
      await db.completeBilan(inst.id, reponses);
      document.getElementById('bilanContent').innerHTML = `
        <div style="text-align:center;padding:3rem 1rem;">
          <div style="font-size:52px;margin-bottom:1rem;">🎉</div>
          <div style="font-size:22px;font-weight:700;color:var(--black);margin-bottom:0.5rem;">Bilan envoyé !</div>
          <div style="font-size:14px;color:var(--gray-muted);margin-bottom:2rem;">Merci pour tes réponses, ton coach va les consulter.</div>
          <button class="btn btn-primary" onclick="window.location.hash='#dashboard'">Retour au dashboard</button>
        </div>`;
    } catch (e) {
      document.getElementById('bilanSubmitMsg').innerHTML =
        `<div class="alert alert-error" style="margin-bottom:0.5rem;">${e.message}</div>`;
      if (btn) { btn.disabled = false; btn.textContent = '✅ Envoyer mon bilan'; }
    }
  }
};
