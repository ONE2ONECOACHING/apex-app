// APEX APP — Client : Ma formation en ligne

const FormationPage = {
  formation: null,
  progression: [], // [{ lecon_id, completed_at }]
  _openModuleId: null,
  _openLeconId:  null,

  render() {
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE</div>
          <div class="app-title">Ma formation</div>
        </div>
        <button class="header-btn" onclick="Router.confirmLogout()">⏻</button>
      </div>
      <div id="formationContent"><div class="spinner" style="margin-top:3rem;"></div></div>
      ${clientNav('formation')}`;
  },

  async init() {
    this.formation  = null;
    this.progression = [];
    this._openModuleId = null;
    this._openLeconId  = null;

    const profile = Router.userProfile;
    if (!profile || profile.role === 'coach') { window.location.hash = '#dashboard'; return; }

    try {
      [this.formation, this.progression] = await Promise.all([
        db.getClientFormation(profile.id).catch(() => null),
        db.getFormationProgression(profile.id).catch(() => []),
      ]);
      this._render();
    } catch (e) {
      document.getElementById('formationContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  _quizzAnswers: {}, // { leconId: { qIdx: optionIdx } }
  _quizzSubmitted: {}, // { leconId: true }

  _render() {
    const el = document.getElementById('formationContent');
    if (!this.formation) {
      el.innerHTML = `<div class="empty-state" style="padding:4rem 1rem;">
        <div class="empty-icon">📚</div>
        <div class="empty-text">Aucune formation assignée.<br>Ton coach t'en attribuera une prochainement.</div>
      </div>`;
      return;
    }

    const f            = this.formation;
    const doneIds      = new Set(this.progression.map(p => p.lecon_id));
    const modules      = f.formation_modules || [];

    // Calculer les jours écoulés depuis l'assignation
    const assignedAt   = f.assigned_at ? new Date(f.assigned_at) : new Date();
    const daysSince    = Math.floor((Date.now() - assignedAt.getTime()) / 86400000);

    const totalLecons  = modules.reduce((s, m) => s + (m.formation_lecons || []).length, 0);
    const doneLecons   = modules.reduce((s, m) => s + (m.formation_lecons || []).filter(l => doneIds.has(l.id)).length, 0);
    const pct          = totalLecons > 0 ? Math.round(doneLecons / totalLecons * 100) : 0;

    const genreIcon  = '📚';

    let html = `
      <!-- Header formation -->
      <div class="card card-dark" style="margin-bottom:1rem;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="font-size:36px;">${genreIcon}</div>
          <div>
            <div style="font-size:18px;font-weight:800;color:var(--white);">${f.titre}</div>
            ${f.description ? `<div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:2px;">${f.description}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:8px;">
          <span>${doneLecons} / ${totalLecons} leçons complétées</span>
          <span style="color:var(--gold);font-weight:700;">${pct}%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:var(--gold);border-radius:3px;transition:width .8s cubic-bezier(.4,0,.2,1);"></div>
        </div>
      </div>`;

    // Afficher leçon/quizz ouvert
    if (this._openLeconId) {
      const { m, l } = this._findLecon(this._openLeconId);
      if (l) {
        const done = doneIds.has(l.id);
        const backBtn = `<button onclick="FormationPage._openLeconId=null;FormationPage._render()"
          style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--gray);">←</button>`;

        if (l.type === 'quizz') {
          html += this._renderQuizz(l, m, done);
        } else {
          const ytId = this._ytId(l.youtube_url);
          html += `
            <div class="card" style="margin-bottom:1rem;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                ${backBtn}
                <div style="flex:1;">
                  <div style="font-size:15px;font-weight:700;">${l.titre}</div>
                  <div style="font-size:12px;color:var(--gray-muted);">${m.titre}</div>
                </div>
              </div>
              ${ytId ? `
              <div style="position:relative;width:100%;padding-bottom:56.25%;border-radius:12px;overflow:hidden;background:#000;margin-bottom:12px;">
                <iframe src="https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1"
                  frameborder="0" loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;">
                </iframe>
              </div>` : ''}
              ${l.description ? `<div style="font-size:14px;color:var(--black);line-height:1.7;margin-bottom:14px;">${l.description}</div>` : ''}
              <button class="btn ${done ? 'btn-secondary' : 'btn-primary'}" style="height:48px;"
                onclick="FormationPage._toggleComplete('${l.id}', ${!done})">
                ${done ? '↩ Marquer comme non vue' : '✅ Marquer comme vue'}
              </button>
            </div>`;
        }
        el.innerHTML = html;
        return;
      }
    }

    // Liste des modules
    modules.forEach((m, mi) => {
      const lecons     = m.formation_lecons || [];
      const doneMod    = lecons.filter(l => doneIds.has(l.id)).length;
      const isOpen     = this._openModuleId === m.id;
      const allDone    = lecons.length > 0 && doneMod === lecons.length;
      const unlockDay  = m.unlock_day || 0;
      const isLocked   = daysSince < unlockDay;
      const daysLeft   = unlockDay - daysSince;

      html += `
        <div class="card" style="margin-bottom:0.75rem;padding:0;overflow:hidden;${isLocked ? 'opacity:0.65;' : ''}">
          <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:${isLocked ? 'default' : 'pointer'};"
            onclick="${isLocked ? '' : `FormationPage._openModuleId='${isOpen ? '' : m.id}';FormationPage._render()`}">
            <div style="font-size:22px;">${isLocked ? '🔒' : allDone ? '✅' : '📂'}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:700;color:var(--black);">${m.titre}</div>
              <div style="font-size:12px;color:var(--gray-muted);margin-top:2px;">
                ${isLocked
                  ? `<span style="color:var(--gold);font-weight:600;">Disponible dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}</span>`
                  : `${doneMod}/${lecons.length} leçon${lecons.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            ${!isLocked ? `<div style="font-size:12px;font-weight:700;color:var(--gold);">${lecons.length > 0 ? Math.round(doneMod/lecons.length*100) : 0}%</div>` : ''}
            ${!isLocked ? `<div style="color:var(--gray-muted);font-size:18px;">${isOpen ? '▲' : '▼'}</div>` : ''}
          </div>
          ${isOpen && !isLocked ? `
          <div style="border-top:1px solid var(--border);">
            ${lecons.map((l, li) => {
              const done  = doneIds.has(l.id);
              const hasYt = !!l.youtube_url;
              return `
                <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;
                             border-bottom:1px solid var(--border);cursor:pointer;
                             background:${done ? 'var(--success-bg)' : 'var(--white)'};"
                  onclick="FormationPage._openLeconId='${l.id}';FormationPage._render()">
                  <div style="width:28px;height:28px;border-radius:50%;border:2px solid ${done ? 'var(--success)' : l.type==='quizz'?'#8B5CF6':'var(--border-solid)'};
                               background:${done ? 'var(--success)' : 'transparent'};
                               display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    ${done ? '<span style="color:#fff;font-size:13px;">✓</span>' : l.type==='quizz'?'<span style="font-size:13px;">🧠</span>':`<span style="font-size:11px;color:var(--gray-muted);">${li+1}</span>`}
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:14px;font-weight:${done ? '400' : '500'};color:${done ? 'var(--gray)' : 'var(--black)'};">${l.titre}
                      ${l.type==='quizz'?`<span style="font-size:10px;font-weight:600;padding:1px 6px;border-radius:6px;background:#8B5CF622;color:#8B5CF6;margin-left:4px;">Quizz</span>`:''}
                    </div>
                    ${l.type==='quizz'
                      ? `<div style="font-size:11px;color:var(--gray-muted);">${(l.questions||[]).length} question${(l.questions||[]).length!==1?'s':''}</div>`
                      : l.duree_min ? `<div style="font-size:11px;color:var(--gray-muted);">${hasYt ? '▶ ' : ''}${l.duree_min} min</div>` : (hasYt ? '<div style="font-size:11px;color:var(--gray-muted);">▶ Vidéo</div>' : '')}
                  </div>
                  <div style="color:var(--gray-muted);font-size:16px;">›</div>
                </div>`;
            }).join('')}
          </div>` : ''}
        </div>`;
    });

    el.innerHTML = html;
  },

  _renderQuizz(l, m, done) {
    const qs         = l.questions || [];
    const answers    = this._quizzAnswers[l.id] || {};
    const submitted  = this._quizzSubmitted[l.id] || false;
    const allAnswered = qs.every((_, qi) => answers[qi] !== undefined);

    if (submitted || done) {
      // Résultats
      const score   = qs.filter((q, qi) => q.options[answers[qi]]?.correct).length;
      const perfect = score === qs.length;
      return `
        <div class="card" style="margin-bottom:1rem;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <button onclick="FormationPage._openLeconId=null;FormationPage._render()"
              style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--gray);">←</button>
            <div style="flex:1;"><div style="font-size:15px;font-weight:700;">${l.titre}</div>
              <div style="font-size:12px;color:var(--gray-muted);">${m.titre}</div></div>
          </div>
          <div style="text-align:center;padding:16px 0 8px;">
            <div style="font-size:48px;margin-bottom:8px;">${perfect ? '🏆' : score >= qs.length * 0.7 ? '🎉' : '💪'}</div>
            <div style="font-size:22px;font-weight:800;color:${perfect?'var(--success)':'var(--gold)'};">${score} / ${qs.length}</div>
            <div style="font-size:14px;color:var(--gray-muted);margin-top:4px;">${perfect ? 'Parfait !' : 'Bonne tentative !'}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
            ${qs.map((q, qi) => {
              const chosen  = answers[qi];
              const correct = q.options.findIndex(o => o.correct);
              const ok      = chosen === correct;
              return `<div style="background:${ok?'var(--success-bg)':'var(--error-bg)'};border-radius:10px;padding:10px 12px;border:1px solid ${ok?'#bbf7d0':'#fecaca'};">
                <div style="font-size:13px;font-weight:600;margin-bottom:6px;">${qi+1}. ${q.question}</div>
                ${q.options.map((o, oi) => `
                  <div style="font-size:13px;padding:3px 0;color:${oi===correct?'var(--success)':oi===chosen&&!ok?'var(--error)':'var(--gray)'};">
                    ${oi===correct?'✅':oi===chosen&&!ok?'❌':'  '} ${o.text}
                  </div>`).join('')}
                ${q.explication ? `<div style="font-size:12px;color:var(--gray);margin-top:6px;font-style:italic;">💡 ${q.explication}</div>` : ''}
              </div>`;
            }).join('')}
          </div>
          ${!done ? `<button class="btn btn-primary" style="height:48px;margin-top:14px;"
            onclick="FormationPage._toggleComplete('${l.id}', true)">✅ Valider le quizz</button>` : ''}
          <button class="btn btn-secondary" style="height:44px;margin-top:8px;"
            onclick="delete FormationPage._quizzAnswers['${l.id}'];delete FormationPage._quizzSubmitted['${l.id}'];FormationPage._render()">
            🔄 Recommencer
          </button>
        </div>`;
    }

    // Questions
    return `
      <div class="card" style="margin-bottom:1rem;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <button onclick="FormationPage._openLeconId=null;FormationPage._render()"
            style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--gray);">←</button>
          <div style="flex:1;"><div style="font-size:15px;font-weight:700;">🧠 ${l.titre}</div>
            <div style="font-size:12px;color:var(--gray-muted);">${m.titre} · ${qs.length} question${qs.length!==1?'s':''}</div></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${qs.map((q, qi) => `
            <div style="background:var(--card-bg);border-radius:12px;padding:12px 14px;">
              <div style="font-size:14px;font-weight:600;margin-bottom:10px;">${qi+1}. ${q.question}</div>
              <div style="display:flex;flex-direction:column;gap:7px;">
                ${q.options.map((o, oi) => {
                  const sel = answers[qi] === oi;
                  return `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;
                    border-radius:10px;border:1.5px solid ${sel?'var(--gold)':'var(--border-solid)'};
                    background:${sel?'var(--gold-light)':'var(--white)'};">
                    <input type="radio" name="q${l.id}_${qi}" value="${oi}" ${sel?'checked':''}
                      onchange="if(!FormationPage._quizzAnswers['${l.id}'])FormationPage._quizzAnswers['${l.id}']={};FormationPage._quizzAnswers['${l.id}'][${qi}]=${oi};FormationPage._render()"
                      style="width:18px;height:18px;accent-color:var(--gold);flex-shrink:0;">
                    <span style="font-size:14px;">${o.text}</span>
                  </label>`;
                }).join('')}
              </div>
            </div>`).join('')}
        </div>
        <button class="btn btn-primary" style="height:50px;margin-top:14px;font-size:16px;"
          ${allAnswered?'':'disabled style="height:50px;margin-top:14px;font-size:16px;"'}
          onclick="FormationPage._quizzSubmitted['${l.id}']=true;FormationPage._render()">
          ${allAnswered ? '✓ Soumettre mes réponses' : `Réponds à toutes les questions (${Object.keys(answers).length}/${qs.length})`}
        </button>
      </div>`;
  },

  async _toggleComplete(leconId, done) {
    const profile = Router.userProfile;
    try {
      await db.toggleLeconComplete(profile.id, leconId, done);
      if (done) {
        this.progression.push({ lecon_id: leconId });
      } else {
        this.progression = this.progression.filter(p => p.lecon_id !== leconId);
      }
      this._render();
      if (done) toast('✅ Leçon complétée !', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  _findLecon(leconId) {
    for (const m of (this.formation?.formation_modules || [])) {
      const l = (m.formation_lecons || []).find(x => x.id === leconId);
      if (l) return { m, l };
    }
    return { m: null, l: null };
  },

  _ytId(url) {
    if (!url) return null;
    const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }
};
