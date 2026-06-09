// APEX APP — Coach : Suivi global d'un client

const CoachClientSuiviPage = {
  client:   null,
  mesures:  [],
  bilans:   [],
  notes:    [],
  seances:  [],
  _semaine: null, // semaine courante de la note (YYYY-MM-DD)

  render() {
    document.body.classList.add('coach-wide');
    return `
      <div class="app-header">
        <div>
          <div class="app-logo">ONE2ONE · COACH</div>
          <div class="app-title" id="suiviTitle">Suivi</div>
        </div>
        <button class="header-btn" onclick="window.location.hash='#coach-clients'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
      <div id="suiviNav"></div>
      <div id="suiviContent"><div class="spinner" style="margin-top:3rem;"></div></div>`;
  },

  async init() {
    this.client  = null; this.mesures = []; this.bilans = [];
    this.notes   = []; this.seances = [];
    this._semaine = this._mondayStr(new Date());

    const params = Router.getParams();
    const clientId = params.clientId;
    if (!clientId) { window.location.hash = '#coach-clients'; return; }

    try {
      [this.client, this.mesures, this.bilans, this.notes, this.seances] = await Promise.all([
        db.getProfile(clientId),
        db.getClientMesures(clientId),
        db.getBilanInstancesForCoach(clientId).catch(() => []),
        db.getCoachNotes(clientId).catch(() => []),
        db.getSeancesLog(clientId, 12).catch(() => []),
      ]);

      document.getElementById('suiviTitle').textContent = 'Suivi — ' + (this.client.prenom || 'Client');
      const nav = document.getElementById('suiviNav');
      if (nav) nav.innerHTML = coachClientNav(clientId, 'coach-client-suivi');
      this._render();
    } catch (e) {
      document.getElementById('suiviContent').innerHTML =
        '<div class="alert alert-error">' + e.message + '</div>';
    }
  },

  _mondayStr(d) {
    const day  = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const m    = new Date(d);
    m.setDate(d.getDate() + diff);
    return m.toISOString().split('T')[0];
  },

  _render() {
    const el = document.getElementById('suiviContent');
    if (!el) return;
    el.innerHTML = this._renderPoids()
                 + this._renderNote()
                 + this._renderBilanTimeline()
                 + this._renderRessenti();
  },

  // ── POIDS ──────────────────────────────────────────────────────────────────
  _renderPoids() {
    const pts = this.mesures.filter(m => m.poids != null);
    if (pts.length === 0) return `
      <div class="card card-dark" style="margin-bottom:1rem;text-align:center;padding:1.5rem;">
        <div style="font-size:13px;color:rgba(255,255,255,0.4);">Aucun poids enregistré</div>
      </div>`;

    const first  = parseFloat(pts[0].poids);
    const last   = parseFloat(pts[pts.length - 1].poids);
    const delta  = (last - first).toFixed(1);
    const arrow  = delta > 0 ? '↑' : delta < 0 ? '↓' : '=';
    const color  = delta < 0 ? '#10B981' : delta > 0 ? '#EF4444' : '#A1A1AA';

    return `
      <div class="card card-dark" style="margin-bottom:1rem;">
        <div class="card-title">⚖️ Évolution du poids</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
          <div style="text-align:center;">
            <div style="font-size:22px;font-weight:800;color:var(--white);">${last} <span style="font-size:13px;font-weight:400;color:rgba(255,255,255,0.4);">kg</span></div>
            <div style="font-size:11px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:.05em;">Actuel</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:22px;font-weight:800;color:var(--white);">${first} <span style="font-size:13px;font-weight:400;color:rgba(255,255,255,0.4);">kg</span></div>
            <div style="font-size:11px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:.05em;">Début</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:22px;font-weight:800;color:${color};">${delta > 0 ? '+' : ''}${delta} <span style="font-size:18px;">${arrow}</span></div>
            <div style="font-size:11px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:.05em;">Total</div>
          </div>
        </div>
        ${pts.length >= 2 ? this._miniGraph(pts.map(p => ({ v: parseFloat(p.poids), d: p.date_entree })), '#C4820A', 'suiviPoids', 'kg') : ''}
      </div>`;
  },

  _miniGraph(pts, color, gradId, unit) {
    if (pts.length < 2) return '';
    const W = 300, H = 72, px = 10, py = 14, pb = 4;
    const vals = pts.map(p => p.v);
    const minV = Math.min(...vals), maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    const innerH = H - py - pb;
    const xStep  = (W - px * 2) / (pts.length - 1);
    const coords = pts.map((p, i) => ({
      x: px + i * xStep,
      y: py + (1 - (p.v - minV) / range) * innerH,
      v: p.v
    }));
    const t = 0.25;
    let lp = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[Math.max(0, i-1)], p1 = coords[i],
            p2 = coords[i+1], p3 = coords[Math.min(coords.length-1, i+2)];
      lp += ` C ${(p1.x+(p2.x-p0.x)*t).toFixed(1)},${(p1.y+(p2.y-p0.y)*t).toFixed(1)}`
          + ` ${(p2.x-(p3.x-p1.x)*t).toFixed(1)},${(p2.y-(p3.y-p1.y)*t).toFixed(1)}`
          + ` ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    const ap = lp + ` L ${coords[coords.length-1].x.toFixed(1)},${H} L ${coords[0].x.toFixed(1)},${H} Z`;
    const step = pts.length <= 8 ? 1 : Math.ceil(pts.length / 8);
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;overflow:visible;">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${color}" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${ap}" fill="url(#${gradId})"/>
      <path d="${lp}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
      ${coords.map((p, i) => `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${color}"/>
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.5" fill="#1A1A1A"/>
        ${(i % step === 0 || i === coords.length - 1) ? `<text x="${p.x.toFixed(1)}" y="${(p.y-7).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="600" fill="${color}">${p.v}${unit}</text>` : ''}
      `).join('')}
    </svg>`;
  },

  // ── NOTE HEBDO COACH ────────────────────────────────────────────────────────
  _renderNote() {
    const note = this.notes.find(n => n.semaine === this._semaine);
    const semStr = new Date(this._semaine + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

    // Sélecteur de semaines (courante + 8 précédentes)
    const weeks = [];
    for (let i = 0; i < 9; i++) {
      const d = new Date(this._semaine + 'T00:00:00');
      d.setDate(d.getDate() - i * 7);
      const s = d.toISOString().split('T')[0];
      const label = i === 0 ? 'Cette semaine' : new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const hasNote = this.notes.find(n => n.semaine === s);
      weeks.push({ s, label, hasNote });
    }

    return `
      <div class="card" style="margin-bottom:1rem;">
        <div class="card-title">📝 Note coach — semaine du ${semStr}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;">
          ${weeks.map(w => `
            <button onclick="CoachClientSuiviPage._setSemaine('${w.s}')"
              style="height:28px;padding:0 10px;border-radius:8px;border:1.5px solid ${w.s === this._semaine ? 'var(--gold)' : 'var(--border-solid)'};
                     background:${w.s === this._semaine ? 'var(--gold-light)' : 'var(--card-bg)'};
                     color:${w.s === this._semaine ? 'var(--gold)' : 'var(--gray)'};
                     font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);white-space:nowrap;">
              ${w.label}${w.hasNote ? ' ✓' : ''}
            </button>`).join('')}
        </div>
        <textarea id="suiviNoteText" class="input" rows="4"
          placeholder="Observations, points d'attention, progression…"
          style="resize:none;font-size:14px;line-height:1.6;"
          oninput="CoachClientSuiviPage._noteDirty=true">${note?.note || ''}</textarea>
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
          <button class="btn btn-primary" style="height:40px;font-size:13px;flex:1;"
            onclick="CoachClientSuiviPage.saveNote()">💾 Enregistrer la note</button>
          <span id="suiviNoteSaved" style="font-size:12px;color:var(--success);display:none;">✓ Sauvegardé</span>
        </div>
      </div>

      <!-- Notes précédentes -->
      ${this.notes.filter(n => n.note?.trim() && n.semaine !== this._semaine).slice(0, 4).map(n => `
        <div style="background:var(--card-bg);border-radius:10px;padding:10px 12px;margin-bottom:6px;border-left:3px solid var(--gold-border);">
          <div style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em;">
            Semaine du ${new Date(n.semaine + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </div>
          <div style="font-size:13px;color:var(--black);line-height:1.6;white-space:pre-wrap;">${n.note}</div>
        </div>`).join('')}`;
  },

  _setSemaine(s) {
    this._semaine = s;
    this._render();
  },

  async saveNote() {
    const text = document.getElementById('suiviNoteText')?.value || '';
    try {
      const saved = await db.upsertCoachNote(this.client.id, Router.userProfile.id, this._semaine, text);
      const idx = this.notes.findIndex(n => n.semaine === this._semaine);
      if (idx >= 0) this.notes[idx] = saved; else this.notes.unshift(saved);
      toast('✓ Note enregistrée', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  },

  // ── BILAN TIMELINE ──────────────────────────────────────────────────────────
  _renderBilanTimeline() {
    const completed = this.bilans.filter(b => b.statut === 'complete' && b.reponses?.length > 0).slice(0, 8);
    if (completed.length === 0) return `
      <div class="card" style="margin-bottom:1rem;">
        <div class="card-title">📋 Bilans</div>
        <div style="font-size:13px;color:var(--gray-muted);">Aucun bilan rempli.</div>
      </div>`;

    return `
      <div class="card" style="margin-bottom:1rem;">
        <div class="card-title">📋 Bilans récents</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${completed.map((inst, idx) => {
            const semStr = new Date(inst.semaine + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
            const prev   = completed[idx + 1];
            const scales = inst.reponses.filter(r => r.type === 'scale');

            return `<div style="background:var(--card-bg);border-radius:10px;padding:10px 12px;">
              <div style="font-size:12px;font-weight:700;color:var(--gold);margin-bottom:8px;">Sem. du ${semStr}</div>
              <div style="display:flex;flex-direction:column;gap:5px;">
                ${scales.map(r => {
                  const val  = parseFloat(r.reponse) || 0;
                  const pval = prev?.reponses?.find(pr => pr.id === r.id);
                  const diff = pval ? val - (parseFloat(pval.reponse) || 0) : null;
                  const trendColor = diff === null ? 'var(--gray-muted)' : diff > 0 ? '#10B981' : diff < 0 ? '#EF4444' : 'var(--gray-muted)';
                  const trendIcon  = diff === null ? '' : diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
                  const barColor   = val >= 7 ? '#10B981' : val >= 5 ? '#C4820A' : '#EF4444';
                  return `<div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;">
                      <span style="color:var(--gray-muted);">${r.label}</span>
                      <span style="font-weight:700;color:${barColor};">${val}/10 <span style="color:${trendColor};font-size:10px;">${trendIcon}</span></span>
                    </div>
                    <div style="height:4px;background:var(--border-solid);border-radius:2px;overflow:hidden;">
                      <div style="height:100%;width:${val * 10}%;background:${barColor};border-radius:2px;transition:width .6s;"></div>
                    </div>
                  </div>`;
                }).join('')}
                ${inst.reponses.filter(r => r.type === 'text' && r.reponse).map(r => `
                  <div style="margin-top:4px;border-top:1px solid var(--border);padding-top:6px;">
                    <div style="font-size:11px;font-weight:600;color:var(--gray);margin-bottom:2px;">${r.label}</div>
                    <div style="font-size:13px;color:var(--black);line-height:1.5;">"${r.reponse}"</div>
                  </div>`).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  // ── RESSENTI SÉANCES ────────────────────────────────────────────────────────
  _renderRessenti() {
    if (this.seances.length === 0) return '';
    const emojis = { dur: '😓', bien: '😊', feu: '🤩' };
    const labels = { dur: 'Difficile', bien: 'Bien', feu: 'En feu !' };
    const colors = { dur: '#EF4444', bien: '#10B981', feu: '#C4820A' };

    return `
      <div class="card" style="margin-bottom:1rem;">
        <div class="card-title">💪 Ressenti séances</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${this.seances.map(s => {
            const r = s.note_ressenti;
            if (!r) return '';
            const date = new Date(s.date_seance + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
            return `<div style="background:var(--card-bg);border-radius:10px;padding:7px 10px;text-align:center;min-width:52px;">
              <div style="font-size:22px;">${emojis[r] || '—'}</div>
              <div style="font-size:9px;color:${colors[r] || 'var(--gray-muted)'};font-weight:600;margin-top:2px;">${labels[r] || r}</div>
              <div style="font-size:9px;color:var(--gray-muted);margin-top:1px;">${date}</div>
            </div>`;
          }).filter(Boolean).join('')}
        </div>
      </div>`;
  }
};
