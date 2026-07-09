// APEX APP — Dashboard Client (progression poids + habitudes)

const DashboardPage = {
  profile: null,
  habitudes: [],
  habitudesJournal: [],
  pendingBilans: [],
  _cache: null,   // { ts, profileId, habitudes, habitudesJournal, pendingBilans }

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE</div>
          <div class="app-title" id="dashGreeting">Dashboard</div>
        </div>
        <button class="header-btn" onclick="Router.confirmLogout()" title="Déconnexion">⏻</button>
      </div>
      <div id="dashContent">${DashboardPage._skeletonHTML()}</div>
      ${clientNav('dashboard')}`;
  },

  _skeletonHTML() {
    return `
      <div class="skeleton-card skeleton-card-dark">
        <div class="skel" style="width:40%;height:12px;margin-bottom:14px;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
          <div class="skel" style="height:50px;border-radius:10px;"></div>
          <div class="skel" style="height:50px;border-radius:10px;"></div>
          <div class="skel" style="height:50px;border-radius:10px;"></div>
        </div>
        <div class="skel" style="width:100%;height:5px;border-radius:99px;"></div>
      </div>
      <div class="skeleton-card">
        <div class="skel" style="width:35%;height:12px;margin-bottom:14px;"></div>
        <div class="skel" style="height:38px;margin-bottom:8px;"></div>
        <div class="skel" style="height:38px;margin-bottom:8px;"></div>
        <div class="skel" style="height:38px;"></div>
      </div>`;
  },

  async init() {
    const profile = Router.userProfile;
    if (!profile) return;
    if (profile.role === 'coach') { window.location.hash = '#coach-clients'; return; }

    this.profile = profile;
    document.getElementById('dashGreeting').textContent = 'Salut ' + (profile.prenom || '') + ' 👊';

    const now = Date.now();
    const cacheValid = this._cache
      && this._cache.profileId === profile.id
      && (now - this._cache.ts < 60000);   // TTL 60 secondes

    if (cacheValid) {
      // Cache frais — afficher immédiatement
      this.habitudes        = this._cache.habitudes;
      this.habitudesJournal = this._cache.habitudesJournal;
      this.pendingBilans    = this._cache.pendingBilans;
      this.renderContent();
      // Rafraîchir en arrière-plan pour la prochaine visite
      this._refresh(profile).catch(() => {});
      return;
    }

    // Cache périmé ou absent — fetch avec skeleton déjà affiché par render()
    await this._refresh(profile);
  },

  async _refresh(profile) {
    try {
      await db.ensureBilanInstance(profile.id).catch(() => {});
      const [habitudes, habitudesJournal, pendingBilans] = await Promise.all([
        db.getHabitudes(profile.id).catch(() => []),
        db.getHabitudesJournal(profile.id, todayStr()).catch(() => []),
        db.getPendingBilans(profile.id).catch(() => [])
      ]);
      // Conserver les cases cochées de manière optimiste dont l'enregistrement
      // est encore en vol : sinon un refresh en arrière-plan les décoche. #39
      const pending = this._pendingHabits || {};
      Object.keys(pending).forEach(hid => {
        const row = habitudesJournal.find(j => j.habitude_id === hid);
        if (row) row.checked = pending[hid];
        else habitudesJournal.push({ habitude_id: hid, checked: pending[hid] });
      });
      this.habitudes        = habitudes;
      this.habitudesJournal = habitudesJournal;
      this.pendingBilans    = pendingBilans;
      this._cache = { ts: Date.now(), profileId: profile.id, habitudes, habitudesJournal, pendingBilans };
      this.renderContent();
    } catch (e) {
      const el = document.getElementById('dashContent');
      if (el) el.innerHTML = '<div class="alert alert-error">Erreur de chargement.</div>';
    }
  },

  renderContent() {
    const p = this.profile;
    const poidsActuel  = p.poids          ? parseFloat(p.poids)          : null;
    // parseFloat requis : NUMERIC arrive en chaîne → sinon comparaisons lexicographiques
    // faussées (ex '90' < '100' faux) et direction d'objectif inversée. #18
    const poidsDepart  = p.poids_depart   != null && p.poids_depart   !== '' ? parseFloat(p.poids_depart)   : null;
    const poidsObjectif = p.poids_objectif != null && p.poids_objectif !== '' ? parseFloat(p.poids_objectif) : null;

    let html = '';

    // Badge bilan en attente
    if (this.pendingBilans.length > 0) {
      const n = this.pendingBilans.length;
      html += `<div class="bilan-badge-card" onclick="window.location.hash='#client-bilan'">
        <div class="bilan-badge-icon">📝</div>
        <div>
          <div class="bilan-badge-title">${n} bilan${n > 1 ? 's' : ''} en attente</div>
          <div class="bilan-badge-sub">Remplis ton questionnaire hebdomadaire</div>
        </div>
        <div class="bilan-badge-arrow">›</div>
      </div>`;
    }

    // Carte poids
    html += `<div class="card card-dark">
      <div class="card-title">Mon poids</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;margin-bottom:12px;">
        <div>
          <div style="font-size:11px;color:var(--gray-muted);margin-bottom:2px;">Départ</div>
          <div style="font-size:18px;font-weight:700;">${poidsDepart ? poidsDepart + ' kg' : '—'}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--gold);margin-bottom:2px;">Actuel</div>
          <div style="font-size:24px;font-weight:700;color:var(--gold);">${poidsActuel ? poidsActuel + ' kg' : '—'}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--gray-muted);margin-bottom:2px;">Objectif</div>
          <div style="font-size:18px;font-weight:700;">${poidsObjectif ? poidsObjectif + ' kg' : '—'}</div>
        </div>
      </div>
      ${this.renderProgress(poidsDepart, poidsActuel, poidsObjectif)}
    </div>`;

    // Habitudes du jour
    if (this.habitudes.length > 0) {
      html += `<div class="card" style="margin-top:1rem;">
        <div class="card-title">Mes habitudes</div>`;
      this.habitudes.forEach(h => {
        const journal = this.habitudesJournal.find(j => j.habitude_id === h.id);
        const checked = journal ? journal.checked : false;
        html += `<div style="margin-bottom:0.75rem;">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
            <input type="checkbox" data-habitude-id="${h.id}"
              style="width:20px;height:20px;accent-color:var(--gold);cursor:pointer;" ${checked ? 'checked' : ''}
              onchange="DashboardPage.saveHabitude('${h.id}', this.checked)">
            <div>
              <div style="font-weight:500;font-size:14px;">${escHtml(h.label)}</div>
              ${h.tips ? `<div style="font-size:12px;color:var(--gray-muted);font-style:italic;">💡 ${escHtml(h.tips)}</div>` : ''}
            </div>
          </label>
        </div>`;
      });
      html += `</div>`;
    }

    document.getElementById('dashContent').innerHTML = html;
  },

  renderProgress(depart, actuel, objectif) {
    if (!depart || !actuel || !objectif || depart === objectif) return '';
    const loseGoal   = objectif < depart;
    const totalDelta = Math.abs(objectif - depart);
    let pct, label;

    if (loseGoal) {
      const done = depart - actuel;
      pct = Math.max(0, Math.min(100, Math.round(done / totalDelta * 100)));
      if (done < 0) {
        label = `+${Math.abs(done).toFixed(1)} kg pris · ${(actuel - objectif).toFixed(1)} kg à perdre`;
      } else {
        label = `−${done.toFixed(1)} kg perdus · ${Math.max(0, actuel - objectif).toFixed(1)} kg restants`;
      }
    } else {
      const done = actuel - depart;
      pct = Math.max(0, Math.min(100, Math.round(done / totalDelta * 100)));
      if (done < 0) {
        label = `−${Math.abs(done).toFixed(1)} kg perdus · ${(objectif - actuel).toFixed(1)} kg à prendre`;
      } else {
        label = `+${done.toFixed(1)} kg gagnés · ${Math.max(0, objectif - actuel).toFixed(1)} kg restants`;
      }
    }

    return `<div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray-muted);margin-bottom:4px;">
        <span>Progression</span><span>${pct}%</span>
      </div>
      <div class="pct-bar"><div class="pct-fill" style="width:${pct}%;background:var(--gold);"></div></div>
      <div style="font-size:12px;color:var(--gray-muted);margin-top:4px;text-align:center;">${label}</div>
    </div>`;
  },

  async saveHabitude(habitudeId, checked) {
    // Mise à jour optimiste — l'état interne reflète le clic immédiatement
    const prev = this.habitudesJournal.find(j => j.habitude_id === habitudeId);
    const prevChecked = prev ? prev.checked : false;
    if (prev) prev.checked = checked;
    else this.habitudesJournal.push({ habitude_id: habitudeId, checked });
    // Marquer comme en vol pour qu'un refresh concurrent ne l'écrase pas
    if (!this._pendingHabits) this._pendingHabits = {};
    this._pendingHabits[habitudeId] = checked;
    // Invalider le cache pour forcer un refresh complet au prochain retour
    if (this._cache) this._cache.ts = 0;

    try {
      const saved = await db.upsertHabitudeJournal({
        profile_id:  this.profile.id,
        habitude_id: habitudeId,
        date_entree: todayStr(),
        checked
      });
      const idx = this.habitudesJournal.findIndex(j => j.habitude_id === habitudeId);
      if (idx >= 0) this.habitudesJournal[idx] = saved;
      else this.habitudesJournal.push(saved);
    } catch (e) {
      // Revert : remettre la case dans son état précédent
      const checkbox = document.querySelector(`[data-habitude-id="${habitudeId}"]`);
      if (checkbox) checkbox.checked = prevChecked;
      const idx = this.habitudesJournal.findIndex(j => j.habitude_id === habitudeId);
      if (idx >= 0) this.habitudesJournal[idx].checked = prevChecked;
      console.error('Erreur habitude :', e);
    } finally {
      if (this._pendingHabits) delete this._pendingHabits[habitudeId];
    }
  }
};
