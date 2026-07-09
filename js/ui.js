// APEX APP — UI Utilities : Toast · Ripple · Stagger · Modal Close · AMRAP ambiance

/* ═══════════════════════════════════════════════════════════
   🅐 HTML ESCAPE — texte utilisateur injecté dans du HTML
   escHtml(s) → sûr pour texte ET attributs (value="...", etc.)
   escJs(s)   → sûr pour une string JS dans onclick="fn('...')"
   ═══════════════════════════════════════════════════════════ */
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escJs(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/</g, '\\x3C');
}

/* ═══════════════════════════════════════════════════════════
   🅑 TOAST SYSTEM
   Usage : toast('Message', 'success' | 'error' | 'info')
   ═══════════════════════════════════════════════════════════ */
function toast(msg, type = 'success', duration = 2600) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || '✓'}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('toast-hiding');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

/* ═══════════════════════════════════════════════════════════
   🅒 BUTTON RIPPLE
   Ajoute automatiquement l'effet ripple sur tous les .btn-primary
   ═══════════════════════════════════════════════════════════ */
function initRipple() {
  document.addEventListener('pointerdown', e => {
    const btn = e.target.closest('.btn-primary');
    if (!btn || btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════════
   🅒 BUTTON LOADING STATE
   Usage : btnLoading(btn) → restore = btnLoading(btn)
           restore() // pour remettre le bouton normal
   ═══════════════════════════════════════════════════════════ */
function btnLoading(btn) {
  if (!btn) return () => {};
  const original = btn.innerHTML;
  btn.classList.add('btn-loading');
  btn.disabled = true;
  return () => {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
    btn.innerHTML = original;
  };
}

/* ═══════════════════════════════════════════════════════════
   🅓 STAGGER FADE-IN
   Usage : staggerCards(containerEl)
           staggerCards(document.getElementById('myList'))
   ═══════════════════════════════════════════════════════════ */
function staggerCards(container) {
  if (!container) return;
  const children = container.querySelectorAll('.card, .client-row, .rec-card, .entry-row');
  children.forEach(el => {
    el.classList.remove('card-animate');
    void el.offsetWidth;
    el.classList.add('card-animate');
  });
}

/* ═══════════════════════════════════════════════════════════
   🅖 MODAL CLOSE ANIMÉ
   Usage : closeModal('myModalEl') → fade-out puis innerHTML=''
   ═══════════════════════════════════════════════════════════ */
function closeModal(containerId) {
  const container = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;
  if (!container) return;
  const overlay = container.querySelector('.modal-overlay');
  const modal   = container.querySelector('.modal');
  if (modal)   modal.classList.add('modal-closing');
  if (overlay) overlay.classList.add('overlay-closing');
  setTimeout(() => { container.innerHTML = ''; }, 260);
}

/* ═══════════════════════════════════════════════════════════
   🅔 PROGRESS BAR — détection completion
   Appelle après avoir rempli les barres pour déclencher le glow
   ═══════════════════════════════════════════════════════════ */
function animateProgressBars() {
  document.querySelectorAll('.pct-fill').forEach(bar => {
    const width = parseFloat(bar.style.width) || 0;
    bar.classList.remove('complete');
    if (width >= 98 && !bar.classList.contains('over')) {
      void bar.offsetWidth;
      bar.classList.add('complete');
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🅘 SÉANCE ACTIVE — ambiance AMRAP warning
   ═══════════════════════════════════════════════════════════ */
function setAmrapWarning(active) {
  const card = document.querySelector('#saWrap .card-dark, #saWrap > div > div');
  if (!card) return;
  if (active) card.classList.add('amrap-warning');
  else        card.classList.remove('amrap-warning');
}

/* ═══════════════════════════════════════════════════════════
   🅘 SÉANCE ACTIVE — slide entre exercices
   ═══════════════════════════════════════════════════════════ */
function animateExoTransition(el) {
  if (!el) return;
  el.classList.remove('exo-enter');
  void el.offsetWidth;
  el.classList.add('exo-enter');
}

/* ═══════════════════════════════════════════════════════════
   🅘 FIN DE SÉANCE — confetti + trophée
   ═══════════════════════════════════════════════════════════ */
function launchConfetti(container) {
  if (!container) return;
  const colors = ['#004aad','#F59E0B','#10B981','#EF4444','#8B5CF6','#F97316'];
  for (let i = 0; i < 22; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const size = 6 + Math.random() * 6;
    piece.style.cssText = `
      left:${10 + Math.random() * 80}%;
      top:${Math.random() * 30}%;
      width:${size}px; height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay:${Math.random() * 0.5}s;
      animation-duration:${0.9 + Math.random() * 0.6}s;
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove(), { once: true });
  }
}

/* ═══════════════════════════════════════════════════════════
   🅗 NAV BOTTOM — badge sur un item
   Usage : setNavBadge('dashboard', true/false)
   ═══════════════════════════════════════════════════════════ */
function setNavBadge(href, visible) {
  const item = document.querySelector(`.nav-item[href="#${href}"] .nav-icon-wrap`);
  if (!item) return;
  const existing = item.querySelector('.nav-badge');
  if (visible && !existing) {
    const badge = document.createElement('span');
    badge.className = 'nav-badge';
    item.appendChild(badge);
  } else if (!visible && existing) {
    existing.remove();
  }
}

/* ═══════════════════════════════════════════════════════════
   INIT GLOBAL — appelé au chargement de l'app
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initRipple();
});
