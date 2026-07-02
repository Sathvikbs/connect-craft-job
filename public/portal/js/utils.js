/* =========================================================
   utils.js — shared helpers, toast, modal, theme, animations
   ========================================================= */

/** Query helpers */
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Generate a stable-ish id */
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Escape HTML to protect against XSS from stored strings */
export const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/** Format a number as INR currency */
export const inr = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

/** Format a timestamp like "2 days ago" */
export const timeAgo = ts => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30); if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo/12)}y ago`;
};

/** Debounce helper for search inputs */
export const debounce = (fn, wait = 250) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};

/** Turn "React, Node, GraphQL" into ["React","Node","GraphQL"] */
export const parseList = str => (str || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean);

/* ---------------- Toast ---------------- */

const ICONS = {
  success: '✓', error: '✕', warning: '!', info: 'i'
};
export function toast(message, type = 'info', timeout = 3200) {
  let stack = $('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="ico">${ICONS[type] || 'i'}</span><span>${esc(message)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 300);
  }, timeout);
}

/* ---------------- Modal ---------------- */
export function openModal(html) {
  let bd = $('#modalBackdrop');
  if (!bd) {
    bd = document.createElement('div');
    bd.id = 'modalBackdrop';
    bd.className = 'modal-backdrop';
    document.body.appendChild(bd);
    bd.addEventListener('click', e => { if (e.target === bd) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }
  bd.innerHTML = `<div class="modal" role="dialog" aria-modal="true" style="position:relative">
    <button class="modal-close" aria-label="Close">×</button>${html}
  </div>`;
  bd.classList.add('open');
  bd.querySelector('.modal-close').addEventListener('click', closeModal);
  return bd.querySelector('.modal');
}
export function closeModal() {
  const bd = $('#modalBackdrop');
  if (bd) bd.classList.remove('open');
}

/* ---------------- Theme ---------------- */
export function initTheme() {
  const saved = localStorage.getItem('jc_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = $('#themeBtn');
  if (btn) {
    btn.innerHTML = saved === 'dark' ? '☀️' : '🌙';
    btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', cur);
      localStorage.setItem('jc_theme', cur);
      btn.innerHTML = cur === 'dark' ? '☀️' : '🌙';
    });
  }
}

/* ---------------- Scroll UX ---------------- */
export function initScrollUX() {
  const bar = document.createElement('div'); bar.id = 'scrollProgress'; document.body.appendChild(bar);
  const top = document.createElement('button'); top.id = 'backTop'; top.textContent = '↑'; top.setAttribute('aria-label','Back to top');
  document.body.appendChild(top);
  top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const onScroll = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = h > 0 ? `${(window.scrollY / h) * 100}%` : '0';
    top.classList.toggle('show', window.scrollY > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // Reveal-on-scroll observer
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting && e.target.classList.add('in'));
  }, { threshold: 0.15 });
  $$('.reveal').forEach(el => io.observe(el));
}

/* ---------------- Animated counter ---------------- */
export function animateCounter(el, target, duration = 1400) {
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(from + (target - from) * eased).toLocaleString('en-IN');
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString('en-IN');
  }
  requestAnimationFrame(tick);
}

/* ---------------- Mobile nav toggle ---------------- */
export function initNav() {
  const t = $('#navToggle');
  const links = $('#navLinks');
  if (t && links) t.addEventListener('click', () => links.classList.toggle('open'));

  // Mark active link
  const path = location.pathname.split('/').pop() || 'index.html';
  $$('#navLinks a').forEach(a => {
    if ((a.getAttribute('href') || '').endsWith(path)) a.classList.add('active');
  });
}

/* ---------------- Validation helpers ---------------- */
export const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isMobile = v => /^[6-9]\d{9}$/.test(String(v).replace(/\D/g, ''));
export const passwordStrength = v => {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[a-z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s; // 0..5
};

/* ---------------- File → Base64 ---------------- */
export function fileToBase64(file) {
  return new Promise((res, rej) => {
    if (!file) return res('');
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ---------------- Download helpers ---------------- */
export function downloadText(filename, text, mime = 'text/plain') {
  const b = new Blob([text], { type: mime });
  const url = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 300);
}
