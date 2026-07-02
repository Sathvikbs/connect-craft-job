/* =========================================================
   app.js — global bootstrap. Renders nav+footer, wires
   theme, scroll UX, mobile nav, and re-seeds demo data.
   Also powers the home page (hero counters, featured jobs,
   categories, top companies, testimonials).
   ========================================================= */

import { ensureSeed, Session, Jobs, StorageMeta, Ratings, resetAll } from './storage.js';
import { $, $$, esc, inr, timeAgo, initTheme, initNav, initScrollUX, animateCounter, toast } from './utils.js';

/* ---------------- Nav + footer partials ---------------- */
function renderChrome() {
  const user = Session.get();
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.innerHTML = `
    <div class="container nav-inner">
      <a href="index.html" class="brand" aria-label="JobConnect home">
        <span class="brand-logo">JC</span>
        <span>JobConnect</span>
      </a>
      <ul class="nav-links" id="navLinks">
        <li><a href="index.html">Home</a></li>
        <li><a href="jobs.html">Jobs</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="contact.html">Contact</a></li>
        <li><a href="faq.html">FAQ</a></li>
      </ul>
      <div class="nav-actions">
        <button class="theme-toggle" id="themeBtn" aria-label="Toggle theme">🌙</button>
        ${user
          ? `<a class="btn btn-ghost btn-sm" href="${user.role === 'employer' ? 'employer-dashboard.html' : 'candidate-dashboard.html'}">Dashboard</a>
             <button class="btn btn-primary btn-sm" id="logoutBtn">Logout</button>`
          : `<a class="btn btn-ghost btn-sm" href="login.html">Login</a>
             <a class="btn btn-primary btn-sm" href="register.html">Sign up</a>`}
        <button class="nav-toggle" id="navToggle" aria-label="Toggle menu">☰</button>
      </div>
    </div>`;
  document.body.prepend(nav);

  const foot = document.createElement('footer');
  foot.innerHTML = `
    <div class="container">
      <div class="foot-grid">
        <div>
          <div class="brand"><span class="brand-logo">JC</span><span>JobConnect</span></div>
          <p style="margin-top:12px;max-width:340px">Connecting talent with opportunities. Discover jobs from top companies, build a modern resume, and land your dream role.</p>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li><a href="jobs.html">Browse Jobs</a></li>
            <li><a href="resume-builder.html">Resume Builder</a></li>
            <li><a href="saved-jobs.html">Saved Jobs</a></li>
            <li><a href="applications.html">My Applications</a></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a href="about.html">About</a></li>
            <li><a href="contact.html">Contact</a></li>
            <li><a href="faq.html">FAQ</a></li>
          </ul>
        </div>
        <div>
          <h4>Legal</h4>
          <ul>
            <li><a href="privacy.html">Privacy</a></li>
            <li><a href="terms.html">Terms</a></li>
          </ul>
        </div>
      </div>
      <div class="copy">© ${new Date().getFullYear()} JobConnect · Built as an MCA mini project · HTML · CSS · JavaScript</div>
    </div>`;
  document.body.appendChild(foot);

  const lb = $('#logoutBtn');
  if (lb) lb.addEventListener('click', () => {
    Session.clear();
    toast('Signed out. See you soon!', 'success');
    setTimeout(() => location.href = 'index.html', 500);
  });
}

/* ---------------- Home page ---------------- */
function initHome() {
  if (!$('#home')) return;

  const t = StorageMeta.totals();
  const map = { jobs: t.jobs, companies: t.companies, candidates: t.candidates + 4820, employers: t.employers + 320 };
  $$('[data-count]').forEach(el => {
    const key = el.dataset.count;
    animateCounter(el, map[key] || 0);
  });

  // Featured jobs
  const featured = [...Jobs.all()].sort((a, b) => b.views - a.views).slice(0, 6);
  const feWrap = $('#featuredJobs');
  if (feWrap) feWrap.innerHTML = featured.map(jobCardHTML).join('');

  // Categories
  const cats = StorageMeta.categories();
  const icons = { 'Software Development':'💻','Web Development':'🌐','Data Science':'📊','Machine Learning':'🤖',
    'UI/UX Design':'🎨','Cyber Security':'🛡️','Networking':'🔗','Cloud Computing':'☁️','DevOps':'🚀',
    'Mobile Development':'📱','Marketing':'📣','Finance':'💰','HR':'👥' };
  const catWrap = $('#catGrid');
  if (catWrap) {
    catWrap.innerHTML = Object.entries(cats).map(([name, count]) => `
      <a class="cat-card reveal" href="jobs.html?category=${encodeURIComponent(name)}">
        <div class="cat-ico">${icons[name] || '📁'}</div>
        <div class="cat-name">${esc(name)}</div>
        <div class="cat-count">${count} open roles</div>
      </a>`).join('');
  }

  // Top companies
  const companies = StorageMeta.companies().slice(0, 8);
  const coWrap = $('#topCompanies');
  if (coWrap) {
    coWrap.innerHTML = companies.map(c => {
      const initials = c.split(' ').map(w => w[0]).slice(0, 2).join('');
      const roles = Jobs.all().filter(j => j.company === c).length;
      const avg = Ratings.avg(c);
      return `<a class="card company-card reveal" href="jobs.html?company=${encodeURIComponent(c)}">
        <div class="job-logo">${esc(initials)}</div>
        <div style="font-weight:700">${esc(c)}</div>
        <div class="chip chip-muted" style="margin-top:6px">${roles} open roles</div>
        <div style="margin-top:8px;color:var(--accent);font-weight:700">★ ${avg.toFixed(1)}</div>
      </a>`;
    }).join('');
  }

  // Hero search
  const heroForm = $('#heroSearch');
  if (heroForm) {
    heroForm.addEventListener('submit', e => {
      e.preventDefault();
      const q = $('#heroQ').value.trim();
      const l = $('#heroL').value.trim();
      const p = new URLSearchParams();
      if (q) p.set('q', q);
      if (l) p.set('loc', l);
      location.href = 'jobs.html' + (p.toString() ? `?${p}` : '');
    });
  }
}

/* Small helper reused across pages */
export function jobCardHTML(j) {
  return `
  <a class="card job-card reveal" href="job-details.html?id=${encodeURIComponent(j.id)}">
    <div class="top">
      <div class="job-logo">${esc(j.logoInitials || j.company.slice(0,2))}</div>
      <div style="flex:1;min-width:0">
        <p class="job-title">${esc(j.title)}</p>
        <div class="job-company">${esc(j.company)} · ${esc(j.location)}</div>
      </div>
    </div>
    <div class="job-meta">
      <span class="chip">${esc(j.type)}</span>
      <span class="chip chip-muted">${esc(j.experience)}</span>
      <span class="chip chip-muted">${esc(j.category)}</span>
    </div>
    <div class="job-foot">
      <span class="salary">${inr(j.salaryMin)} – ${inr(j.salaryMax)}</span>
      <span class="badge">${timeAgo(j.createdAt)}</span>
    </div>
  </a>`;
}

/* ---------------- Bootstrap ---------------- */
window.addEventListener('DOMContentLoaded', () => {
  ensureSeed();
  renderChrome();
  initTheme();
  initNav();
  initScrollUX();
  initHome();

  // Global "reset demo" hotkey (Shift+Alt+R)
  window.addEventListener('keydown', e => {
    if (e.shiftKey && e.altKey && (e.key === 'R' || e.key === 'r')) {
      resetAll();
      toast('Demo data reset', 'success');
      setTimeout(() => location.reload(), 600);
    }
  });
});
