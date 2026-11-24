// APEX APP — Mise en page d'un audit du bilan (rédigé par l'Edge Function
// audit-bilan, rangé dans audits.contenu). Même plan que les bilans faits à la
// main (bandeau profil, 7 sections, synthèse et leviers), aux couleurs du studio.
// Tout le texte vient du modèle (donc des réponses du prospect) : toujours escHtml.

function auditHTML(c, infos = {}) {
  if (!c) return '';
  const e = t => escHtml(String(t ?? ''));
  const nom = `${infos.prenom || ''} ${infos.nom || ''}`.trim();
  const date = infos.date ? new Date(infos.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const encadre = x => `<div class="au-encadre au-${e(x.type)}"><div class="au-encadre-titre">${e(x.titre)}</div><p>${e(x.texte)}</p></div>`;
  const section = (s, i) => `
    <section class="au-section">
      <h2><span class="au-num">${i + 1}</span>${e(s.titre)}</h2>
      ${(s.donnees || []).length ? `<dl class="au-donnees">${s.donnees.map(d => `<dt>${e(d.label)}</dt><dd>${e(d.valeur)}</dd>`).join('')}</dl>` : ''}
      ${(s.cartes || []).length ? `<div class="au-cartes">${s.cartes.map(k => `
        <div class="au-carte au-${e(k.etat)}"><div class="au-carte-titre">${e(k.titre)}</div><div>${e(k.texte)}</div></div>`).join('')}</div>` : ''}
      ${(s.indicateurs || []).length ? `<div class="au-indics">${s.indicateurs.map(k => `
        <div class="au-indic"><div class="au-indic-label">${e(k.label)}</div><div class="au-indic-val au-${e(k.niveau)}">${e(k.valeur)}</div></div>`).join('')}</div>` : ''}
      ${(s.paragraphes || []).map(p => `<p>${e(p)}</p>`).join('')}
      ${(s.encadres || []).map(encadre).join('')}
    </section>`;

  const sy = c.synthese || {};
  return `
    <div class="au">
      <header class="au-entete">
        <div class="au-badge">BILAN ONE2ONE</div>
        <h1>${e(nom || 'Bilan')}</h1>
        ${date ? `<div class="au-date">Questionnaire rempli le ${e(date)}</div>` : ''}
        <div class="au-profil">${(c.profil || []).map(p => `<span class="au-pastille au-${e(p.etat)}">${e(p.texte)}</span>`).join('')}</div>
      </header>

      ${(c.sections || []).map(section).join('')}

      <section class="au-synthese">
        <div class="au-badge au-badge-clair">SYNTHÈSE</div>
        <h2>${e(sy.titre)}</h2>
        ${sy.citation ? `<blockquote>${e(sy.citation)}</blockquote>` : ''}
        ${sy.resume ? `<p class="au-resume">${e(sy.resume)}</p>` : ''}
        ${(sy.leviers || []).map((l, i) => `
          <div class="au-levier"><div class="au-levier-titre">${l.priorite === 'haute' ? '🔴' : '🟡'} Levier ${i + 1} — ${e(l.titre)}</div><p>${e(l.texte)}</p></div>`).join('')}
        ${sy.acquis ? `<div class="au-levier"><div class="au-levier-titre">✅ Ce que ${e(infos.prenom || 'il ou elle')} a déjà construit</div><p>${e(sy.acquis)}</p></div>` : ''}
        <div class="au-pied">Bilan réalisé par ONE2ONE Coaching — Document confidentiel</div>
      </section>
    </div>`;
}

// Questions à creuser pendant le bilan (réservé au coach, pas imprimé)
function auditAVerifierHTML(c) {
  const l = c?.a_verifier || [];
  if (!l.length) return '';
  return `<div class="au-coach"><div class="au-coach-titre">🗒 À vérifier pendant le bilan (pour le coach)</div>
    <ul>${l.map(x => `<li>${escHtml(String(x))}</li>`).join('')}</ul></div>`;
}
