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

  showInstallTuto() {
    // Already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
      const modal = document.createElement('div');
      modal.id = 'installTutoModal';
      modal.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;';
      modal.innerHTML = `
        <div style="background:var(--white);border-radius:20px 20px 0 0;width:100%;padding:2rem 1.5rem calc(2rem + env(safe-area-inset-bottom));text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">✅</div>
          <div style="font-size:18px;font-weight:700;margin-bottom:8px;">L'app est déjà installée !</div>
          <div style="font-size:14px;color:var(--gray);margin-bottom:24px;">Tu utilises déjà l'app depuis ton écran d'accueil. C'est parfait 🎉</div>
          <button onclick="document.getElementById('installTutoModal').remove()"
            style="background:var(--gold);color:white;border:none;border-radius:12px;padding:14px 32px;font-size:15px;font-weight:700;cursor:pointer;width:100%;">
            Super !
          </button>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
      return;
    }

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let steps = '';
    let title = '';
    let icon = '📲';

    if (isIOS && isSafari) {
      title = 'Installer sur iPhone / iPad';
      steps = `
        <div style="text-align:left;display:flex;flex-direction:column;gap:16px;margin-bottom:24px;">
          <div style="display:flex;align-items:flex-start;gap:14px;">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--gold);color:white;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">1</div>
            <div>
              <div style="font-weight:700;font-size:14px;margin-bottom:2px;">Appuie sur le bouton Partager</div>
              <div style="font-size:13px;color:var(--gray);">Le bouton
                <span style="display:inline-flex;align-items:center;gap:2px;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 6px;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  Partager
                </span>
                en bas de Safari
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:14px;">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--gold);color:white;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</div>
            <div>
              <div style="font-weight:700;font-size:14px;margin-bottom:2px;">Fais défiler et appuie sur</div>
              <div style="font-size:13px;color:var(--gray);">📌 <strong>"Sur l'écran d'accueil"</strong></div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:14px;">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--gold);color:white;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">3</div>
            <div>
              <div style="font-weight:700;font-size:14px;margin-bottom:2px;">Appuie sur "Ajouter"</div>
              <div style="font-size:13px;color:var(--gray);">L'app apparaît sur ton écran d'accueil comme une vraie application !</div>
            </div>
          </div>
        </div>`;
    } else if (isAndroid || (!isIOS && !isSafari)) {
      title = isAndroid ? 'Installer sur Android' : 'Installer sur ton ordinateur';
      icon = isAndroid ? '📲' : '💻';

      // If the native prompt is available, offer it directly
      const hasNativePrompt = InstallPrompt._deferredPrompt;
      if (hasNativePrompt) {
        steps = `
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:14px;color:var(--gray);margin-bottom:20px;">Ton navigateur propose d'installer l'app directement !</div>
            <button onclick="InstallPrompt.install();document.getElementById('installTutoModal').remove();"
              style="background:var(--gold);color:white;border:none;border-radius:12px;padding:14px 32px;font-size:15px;font-weight:700;cursor:pointer;width:100%;margin-bottom:12px;">
              ${isAndroid ? '📲' : '💻'} Installer maintenant
            </button>
          </div>`;
      } else {
        steps = `
          <div style="text-align:left;display:flex;flex-direction:column;gap:16px;margin-bottom:24px;">
            <div style="display:flex;align-items:flex-start;gap:14px;">
              <div style="width:28px;height:28px;border-radius:50%;background:var(--gold);color:white;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">1</div>
              <div>
                <div style="font-weight:700;font-size:14px;margin-bottom:2px;">Ouvre le menu du navigateur</div>
                <div style="font-size:13px;color:var(--gray);">Appuie sur les <strong>⋮</strong> (trois points) en haut à droite</div>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:14px;">
              <div style="width:28px;height:28px;border-radius:50%;background:var(--gold);color:white;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</div>
              <div>
                <div style="font-weight:700;font-size:14px;margin-bottom:2px;">Appuie sur</div>
                <div style="font-size:13px;color:var(--gray);">📌 <strong>"Ajouter à l'écran d'accueil"</strong>${isAndroid ? '' : ' ou <strong>"Installer l\'application"</strong>'}</div>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:14px;">
              <div style="width:28px;height:28px;border-radius:50%;background:var(--gold);color:white;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">3</div>
              <div>
                <div style="font-weight:700;font-size:14px;margin-bottom:2px;">Confirme en appuyant sur "Ajouter"</div>
                <div style="font-size:13px;color:var(--gray);">L'icône apparaît sur ton ${isAndroid ? 'écran d\'accueil' : 'bureau'} !</div>
              </div>
            </div>
          </div>`;
      }
    } else {
      title = 'Installer l\'app';
      steps = `<div style="font-size:14px;color:var(--gray);margin-bottom:24px;text-align:center;">
        Utilise Safari sur iPhone/iPad, ou Chrome sur Android pour installer l'app sur ton écran d'accueil.
      </div>`;
    }

    const modal = document.createElement('div');
    modal.id = 'installTutoModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;';
    modal.innerHTML = `
      <div style="background:var(--white);border-radius:20px 20px 0 0;width:100%;max-height:90vh;overflow-y:auto;padding:2rem 1.5rem calc(2rem + env(safe-area-inset-bottom));">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:44px;margin-bottom:10px;">${icon}</div>
          <div style="font-size:18px;font-weight:700;">${title}</div>
        </div>
        ${steps}
        <button onclick="document.getElementById('installTutoModal').remove()"
          style="background:var(--bg);color:var(--black);border:1px solid var(--border);border-radius:12px;padding:13px 32px;font-size:14px;font-weight:600;cursor:pointer;width:100%;">
          Fermer
        </button>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  },

  // ── Calculateur TDEE ──────────────────────────────────────────────────────
  showTdeeCalc() {
    const p = Router.userProfile || {};
    const jobOpts = [
      ['sedentaire', 'Sédentaire (bureau)'],
      ['leger',      'Légèrement actif'],
      ['actif',      'Actif (debout/marche)'],
      ['tres_actif', 'Très actif (physique)'],
    ];
    const objOpts = [
      ['perte',    'Perdre du gras'],
      ['maintien', 'Maintien'],
      ['masse',    'Prise de masse'],
    ];
    const modal = document.createElement('div');
    modal.id = 'tdeeModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;';
    modal.innerHTML = `
      <div style="background:var(--white);border-radius:20px 20px 0 0;width:100%;max-width:680px;margin:0 auto;
                  max-height:92vh;overflow-y:auto;padding:1.5rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom));">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.25rem;">
          <div style="font-size:26px;">🔢</div>
          <div style="flex:1;font-size:18px;font-weight:700;">Calculateur TDEE</div>
          <button onclick="document.getElementById('tdeeModal').remove()"
            style="width:32px;height:32px;border:none;background:var(--card-bg);border-radius:50%;font-size:18px;cursor:pointer;color:var(--gray);">×</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div class="field" style="margin:0;">
            <label class="field-label">Sexe</label>
            <select class="input" id="tdSexe">
              <option value="homme" ${p.sexe==='homme'?'selected':''}>Homme</option>
              <option value="femme" ${p.sexe==='femme'?'selected':''}>Femme</option>
            </select>
          </div>
          <div class="field" style="margin:0;">
            <label class="field-label">Âge</label>
            <input class="input" id="tdAge" type="number" value="${p.age||''}" placeholder="ex: 30">
          </div>
          <div class="field" style="margin:0;">
            <label class="field-label">Poids (kg)</label>
            <input class="input" id="tdPoids" type="number" step="0.1" value="${p.poids||''}" placeholder="ex: 75">
          </div>
          <div class="field" style="margin:0;">
            <label class="field-label">Taille (cm)</label>
            <input class="input" id="tdTaille" type="number" value="${p.taille||''}" placeholder="ex: 178">
          </div>
        </div>
        <div class="field">
          <label class="field-label">Niveau d'activité quotidien</label>
          <select class="input" id="tdJob">
            ${jobOpts.map(([v,l])=>`<option value="${v}" ${p.type_metier===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label class="field-label">Pas par jour (estimation)</label>
          <input class="input" id="tdPas" type="number" step="500" value="${p.pas_par_jour||8000}" placeholder="ex: 8000">
        </div>
        <div class="field">
          <label class="field-label">Objectif</label>
          <select class="input" id="tdObj">
            ${objOpts.map(([v,l])=>`<option value="${v}" ${p.objectif===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>

        <button class="btn btn-primary" style="height:48px;margin-top:4px;" onclick="OutilsPage.computeTdee()">Calculer</button>
        <div id="tdResult" style="margin-top:1rem;"></div>
        <div style="font-size:11px;color:var(--gray-muted);margin-top:10px;line-height:1.5;">
          Estimation basée sur la formule Mifflin-St Jeor. C'est un point de départ —
          ajuste selon l'évolution réelle de ton poids sur 2-3 semaines.
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  },

  computeTdee() {
    const v = id => document.getElementById(id)?.value;
    const profile = {
      sexe:        v('tdSexe'),
      age:         parseInt(v('tdAge')) || 0,
      poids:       parseFloat(v('tdPoids')) || 0,
      taille:      parseInt(v('tdTaille')) || 0,
      type_metier: v('tdJob'),
      pas_par_jour:parseInt(v('tdPas')) || 8000,
      objectif:    v('tdObj'),
    };
    if (!profile.age || !profile.poids || !profile.taille) {
      document.getElementById('tdResult').innerHTML =
        '<div class="alert alert-error">Renseigne au moins l\'âge, le poids et la taille.</div>';
      return;
    }
    const r = TDEE.calculate(profile, []);
    const objLabel = profile.objectif === 'perte' ? 'Perte de gras'
                   : profile.objectif === 'masse' ? 'Prise de masse' : 'Maintien';
    document.getElementById('tdResult').innerHTML = `
      <div class="card card-dark" style="margin:0;">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;margin-bottom:12px;">
          <div><div style="font-size:18px;font-weight:800;color:var(--white);">${r.bmr}</div><div style="font-size:10px;color:rgba(255,255,255,0.5);">BMR</div></div>
          <div><div style="font-size:18px;font-weight:800;color:var(--white);">${r.neat}</div><div style="font-size:10px;color:rgba(255,255,255,0.5);">NEAT</div></div>
          <div><div style="font-size:18px;font-weight:800;color:var(--white);">${r.tdee}</div><div style="font-size:10px;color:rgba(255,255,255,0.5);">TDEE</div></div>
        </div>
        <div style="text-align:center;padding:10px 0;border-top:1px solid rgba(255,255,255,0.1);">
          <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:.05em;">Objectif — ${objLabel}</div>
          <div style="font-size:30px;font-weight:800;color:var(--gold);">${r.targetKcal} <span style="font-size:14px;font-weight:400;color:rgba(255,255,255,0.5);">kcal/jour</span></div>
        </div>
        <div style="display:flex;justify-content:center;gap:16px;font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">
          <span>P: <b style="color:#3B82F6;">${r.proteines}g</b></span>
          <span>G: <b style="color:#C4820A;">${r.glucides}g</b></span>
          <span>L: <b style="color:#EF4444;">${r.lipides}g</b></span>
        </div>
      </div>`;
  },

  init() {
    const profile = Router.userProfile;
    if (!profile || profile.role === 'coach') { window.location.hash = '#dashboard'; return; }

    document.getElementById('outilsContent').innerHTML = `
      <div style="padding:1rem 1rem 6rem;">

        <div class="dash-section-title">Aides</div>

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

        <div class="card card-tap" onclick="OutilsPage.showInstallTuto()" style="cursor:pointer;margin-top:0;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="font-size:32px;line-height:1;">📲</div>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:15px;margin-bottom:2px;">Ajouter l'app à l'écran d'accueil</div>
              <div style="font-size:13px;color:var(--gray-light);">Accède à l'app comme une vraie appli mobile</div>
            </div>
            <div style="color:var(--gray-muted);font-size:18px;">›</div>
          </div>
        </div>

        <div class="dash-section-title" style="margin-top:1.75rem;">Outils</div>

        <div class="card card-tap" onclick="OutilsPage.showTdeeCalc()" style="cursor:pointer;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="font-size:32px;line-height:1;">🔢</div>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:15px;margin-bottom:2px;">Calculateur TDEE</div>
              <div style="font-size:13px;color:var(--gray-light);">Estime ta dépense énergétique et tes calories cibles</div>
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
