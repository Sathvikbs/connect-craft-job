/* =========================================================
   jobs.js — browse, filter, sort, details, apply, save
   ========================================================= */

import { Jobs, Applications, Saved, Session, Recent, Ratings, Notifications } from './storage.js';
import { $, $$, esc, inr, timeAgo, debounce, toast, openModal, closeModal, fileToBase64 } from './utils.js';
import { jobCardHTML } from './app.js';

/* --------------- Jobs list (jobs.html) --------------- */
export function initJobsList() {
  const grid = $('#jobsGrid');
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get('q') || '',
    location: params.get('loc') || '',
    company: params.get('company') || '',
    types: new Set(),
    experience: new Set(),
    salary: new Set(),
    categories: params.get('category') ? new Set([params.get('category')]) : new Set(),
    sort: 'latest',
  };

  // Pre-fill search
  const searchInput = $('#searchInput');
  if (searchInput) searchInput.value = state.q;
  const locInput = $('#locInput');
  if (locInput) locInput.value = state.location;

  // Pre-check category filters
  $$('.filter-opt input').forEach(cb => {
    if (cb.dataset.group === 'category' && state.categories.has(cb.value)) cb.checked = true;
  });

  const render = () => {
    let list = Jobs.all();

    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        (j.skills || []).some(s => s.toLowerCase().includes(q))
      );
    }
    if (state.location) list = list.filter(j => j.location.toLowerCase().includes(state.location.toLowerCase()));
    if (state.company) list = list.filter(j => j.company === state.company);
    if (state.types.size) list = list.filter(j => state.types.has(j.type));
    if (state.experience.size) list = list.filter(j => state.experience.has(j.experience));
    if (state.categories.size) list = list.filter(j => state.categories.has(j.category));
    if (state.salary.size) list = list.filter(j => {
      const max = j.salaryMax;
      return [...state.salary].some(b => {
        if (b === '<3')  return max < 300000;
        if (b === '3-6') return max >= 300000 && max <= 600000;
        if (b === '6-10')return max > 600000 && max <= 1000000;
        if (b === '>10') return max > 1000000;
      });
    });

    if (state.sort === 'salary') list.sort((a, b) => b.salaryMax - a.salaryMax);
    else if (state.sort === 'popular') list.sort((a, b) => b.views - a.views);
    else list.sort((a, b) => b.createdAt - a.createdAt);

    $('#jobsCount').textContent = `${list.length} job${list.length !== 1 ? 's' : ''} found`;
    grid.innerHTML = list.length
      ? list.map(jobCardHTML).join('')
      : `<div class="empty" style="grid-column:1/-1">
           <h3>No jobs match your filters</h3>
           <p>Try clearing some filters or search a different keyword.</p>
         </div>`;
  };

  // Wire search + location (debounced)
  searchInput?.addEventListener('input', debounce(e => { state.q = e.target.value; render(); }, 250));
  locInput?.addEventListener('input', debounce(e => { state.location = e.target.value; render(); }, 250));

  // Wire filter checkboxes
  $$('.filter-opt input').forEach(cb => {
    cb.addEventListener('change', () => {
      const bucket = state[cb.dataset.group === 'category' ? 'categories'
                   : cb.dataset.group === 'type' ? 'types'
                   : cb.dataset.group === 'exp'  ? 'experience'
                   : 'salary'];
      if (cb.checked) bucket.add(cb.value);
      else bucket.delete(cb.value);
      render();
    });
  });

  $('#sortSelect')?.addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('#clearFilters')?.addEventListener('click', () => {
    state.types.clear(); state.experience.clear(); state.salary.clear(); state.categories.clear();
    state.q = ''; state.location = ''; state.company = '';
    if (searchInput) searchInput.value = '';
    if (locInput) locInput.value = '';
    $$('.filter-opt input').forEach(cb => cb.checked = false);
    render();
  });

  render();
}

/* --------------- Job details page --------------- */
export function initJobDetails() {
  const wrap = $('#jobDetail');
  if (!wrap) return;

  const id = new URLSearchParams(location.search).get('id');
  const job = Jobs.byId(id);
  if (!job) {
    wrap.innerHTML = `<div class="empty"><h3>Job not found</h3><a href="jobs.html" class="btn btn-primary mt-2">Back to jobs</a></div>`;
    return;
  }

  // Log view + recent
  Jobs.update(job.id, { views: (job.views || 0) + 1 });
  const cur = Session.get();
  if (cur) Recent.push(cur.id, job.id);

  const saved = cur && Saved.isSaved(cur.id, job.id);
  const applied = cur && Applications.hasApplied(cur.id, job.id);
  const rating = Ratings.avg(job.company);

  wrap.innerHTML = `
    <div class="job-details-grid">
      <div>
        <div class="job-hero-card">
          <div class="top">
            <div class="job-logo">${esc(job.logoInitials)}</div>
            <div>
              <h1>${esc(job.title)}</h1>
              <div class="job-company">${esc(job.company)} · ${esc(job.location)} · ★ ${rating.toFixed(1)}</div>
            </div>
          </div>
          <div class="job-meta">
            <span class="chip">${esc(job.type)}</span>
            <span class="chip chip-muted">${esc(job.experience)}</span>
            <span class="chip chip-muted">${esc(job.category)}</span>
            <span class="chip chip-success">${inr(job.salaryMin)} – ${inr(job.salaryMax)}</span>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
            <button class="btn btn-primary" id="applyBtn" ${applied ? 'disabled' : ''}>
              ${applied ? '✓ Already applied' : 'Apply now'}
            </button>
            <button class="btn btn-ghost" id="saveBtn">${saved ? '★ Saved' : '☆ Save job'}</button>
            <button class="btn btn-ghost" id="shareBtn">Share</button>
          </div>
          <div class="section-block">
            <h3>About the role</h3>
            <p>${esc(job.description)}</p>
          </div>
          <div class="section-block">
            <h3>Requirements</h3>
            <ul>${job.requirements.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
          </div>
          <div class="section-block">
            <h3>Skills</h3>
            <div class="job-meta">${job.skills.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>
          </div>
          <div class="section-block">
            <h3>Benefits</h3>
            <ul>${job.benefits.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
          </div>
        </div>
      </div>
      <aside>
        <div class="card">
          <h3>Job overview</h3>
          <div class="mt-2"><b>Posted:</b> ${timeAgo(job.createdAt)}</div>
          <div class="mt-1"><b>Deadline:</b> ${new Date(job.deadline).toDateString()}</div>
          <div class="mt-1"><b>Applicants:</b> ${job.applicants || 0}</div>
          <div class="mt-1"><b>Views:</b> ${job.views}</div>
        </div>
        <div class="card mt-3">
          <h3>Similar jobs</h3>
          <div class="flex-col gap-2 mt-2" id="similar"></div>
        </div>
      </aside>
    </div>`;

  // Similar
  const similar = Jobs.all().filter(j => j.id !== job.id && (j.category === job.category || j.company === job.company)).slice(0, 4);
  $('#similar').innerHTML = similar.map(s => `
    <a href="job-details.html?id=${s.id}" class="flex gap-2" style="align-items:center;text-decoration:none;color:inherit">
      <div class="job-logo" style="width:38px;height:38px;font-size:.85rem">${esc(s.logoInitials)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;color:var(--text)">${esc(s.title)}</div>
        <div class="job-company" style="font-size:.82rem">${esc(s.company)}</div>
      </div>
    </a>
  `).join('') || '<p style="margin:0">No similar jobs.</p>';

  // Actions
  $('#saveBtn').addEventListener('click', () => {
    if (!cur) return location.href = 'login.html';
    const now = Saved.toggle(cur.id, job.id);
    toast(now ? 'Job saved' : 'Removed from saved', 'success');
    $('#saveBtn').textContent = now ? '★ Saved' : '☆ Save job';
  });

  $('#shareBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(location.href).then(() => toast('Link copied to clipboard', 'success'));
  });

  $('#applyBtn').addEventListener('click', () => {
    if (!cur) return location.href = 'login.html';
    if (cur.role !== 'candidate') return toast('Only candidates can apply', 'warning');
    if (applied) return;
    openApplyModal(job, cur);
  });
}

/* --------------- Apply modal --------------- */
function openApplyModal(job, user) {
  const m = openModal(`
    <h3>Apply for ${esc(job.title)}</h3>
    <p style="margin-bottom:18px">at ${esc(job.company)} · ${esc(job.location)}</p>
    <form id="applyForm">
      <div class="form-group">
        <label>Upload resume (PDF/DOC)</label>
        <input type="file" name="resume" class="form-control" accept=".pdf,.doc,.docx" />
      </div>
      <div class="form-group">
        <label>Portfolio / LinkedIn URL</label>
        <input type="url" name="portfolio" class="form-control" placeholder="https://..." />
      </div>
      <div class="form-group">
        <label>Cover letter</label>
        <textarea name="coverLetter" class="form-control" rows="4" placeholder="Tell them why you're a great fit"></textarea>
      </div>
      <button class="btn btn-primary btn-block">Submit application</button>
    </form>`);
  m.querySelector('#applyForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const file = fd.get('resume');
    const resumeData = file && file.size ? await fileToBase64(file) : '';
    Applications.add({
      id: 'app_' + Date.now(),
      jobId: job.id,
      candidateId: user.id,
      candidateName: user.name,
      candidateEmail: user.email,
      resume: resumeData,
      coverLetter: fd.get('coverLetter') || '',
      portfolio: fd.get('portfolio') || '',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    Jobs.update(job.id, { applicants: (job.applicants || 0) + 1 });
    Notifications.push(user.id, `Application submitted for ${job.title}`, 'success');
    Notifications.push(job.employerId, `${user.name} applied to your ${job.title} role`, 'info');
    closeModal();
    toast('Application submitted!', 'success');
    setTimeout(() => location.reload(), 700);
  });
}

/* --------------- Saved jobs page --------------- */
export function initSaved() {
  const wrap = $('#savedGrid');
  if (!wrap) return;
  const cur = Session.require('candidate'); if (!cur) return;
  const render = () => {
    const list = Saved.list(cur.id).map(id => Jobs.byId(id)).filter(Boolean);
    wrap.innerHTML = list.length
      ? list.map(jobCardHTML).join('')
      : `<div class="empty" style="grid-column:1/-1">
          <h3>No saved jobs yet</h3>
          <p>Browse jobs and click ★ Save to bookmark them here.</p>
          <a href="jobs.html" class="btn btn-primary mt-2">Browse jobs</a>
         </div>`;
  };
  render();
}

/* --------------- My applications page --------------- */
export function initMyApplications() {
  const tbody = $('#appsBody');
  if (!tbody) return;
  const cur = Session.require('candidate'); if (!cur) return;

  const apps = Applications.byCandidate(cur.id).sort((a, b) => b.createdAt - a.createdAt);
  if (!apps.length) {
    $('#appsWrap').innerHTML = `<div class="empty"><h3>No applications yet</h3><p>Apply to jobs to see them here.</p><a href="jobs.html" class="btn btn-primary mt-2">Find jobs</a></div>`;
    return;
  }
  tbody.innerHTML = apps.map(a => {
    const j = Jobs.byId(a.jobId);
    if (!j) return '';
    return `<tr>
      <td><a href="job-details.html?id=${j.id}" style="font-weight:600">${esc(j.title)}</a><br><span style="color:var(--text-muted);font-size:.85rem">${esc(j.company)}</span></td>
      <td>${esc(j.location)}</td>
      <td>${inr(j.salaryMax)}</td>
      <td>${timeAgo(a.createdAt)}</td>
      <td><span class="status-${a.status}">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span></td>
    </tr>`;
  }).join('');
}

/* auto-init */
window.addEventListener('DOMContentLoaded', () => {
  initJobsList(); initJobDetails(); initSaved(); initMyApplications();
});
