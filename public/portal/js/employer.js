/* =========================================================
   employer.js — employer dashboard, post job, applications
   ========================================================= */

import { Jobs, Applications, Users, Session, Notifications } from './storage.js';
import { $, $$, esc, inr, uid, toast, openModal, closeModal, parseList, fileToBase64, timeAgo } from './utils.js';
import { drawBarChart, drawDonutChart } from './candidate.js'; // reuse chart helpers

/* --------------- Dashboard --------------- */
export function initEmployerDashboard() {
  const wrap = $('#empDash');
  if (!wrap) return;
  const cur = Session.require('employer'); if (!cur) return;

  const jobs = Jobs.byEmployer(cur.id);
  const apps = Applications.byEmployer(cur.id);
  const active = jobs.filter(j => j.status === 'active').length;
  const shortlisted = apps.filter(a => a.status === 'shortlisted' || a.status === 'selected').length;

  $('#kJobs').textContent = jobs.length;
  $('#kActive').textContent = active;
  $('#kApps').textContent = apps.length;
  $('#kShort').textContent = shortlisted;

  // Charts
  const byJob = jobs.slice(0, 6).map(j => ({ label: j.title.slice(0, 12), value: apps.filter(a => a.jobId === j.id).length }));
  drawBarChart($('#chartApps'), byJob, '#2563EB');

  const statusCounts = ['pending','shortlisted','rejected','selected'].map(s => ({ label: s, value: apps.filter(a => a.status === s).length }));
  drawDonutChart($('#chartStatus'), statusCounts, ['#F59E0B','#06B6D4','#EF4444','#10B981']);

  // Recent jobs table
  const tb = $('#empJobsBody');
  const renderJobs = () => {
    const list = Jobs.byEmployer(cur.id);
    if (!list.length) {
      tb.innerHTML = `<tr><td colspan="5"><div class="empty" style="padding:32px"><h3>No jobs posted yet</h3><p>Post your first job to attract candidates.</p></div></td></tr>`;
      return;
    }
    tb.innerHTML = list.map(j => `
      <tr>
        <td><b>${esc(j.title)}</b><br><span style="color:var(--text-muted);font-size:.82rem">${esc(j.location)}</span></td>
        <td>${j.applicants || 0}</td>
        <td>${j.views}</td>
        <td>${timeAgo(j.createdAt)}</td>
        <td>
          <button class="btn btn-sm btn-ghost" data-edit="${j.id}">Edit</button>
          <button class="btn btn-sm btn-danger" data-del="${j.id}">Delete</button>
        </td>
      </tr>`).join('');
    tb.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openJobModal(Jobs.byId(b.dataset.edit)));
    tb.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      if (!confirm('Delete this job?')) return;
      Jobs.remove(b.dataset.del);
      toast('Job deleted', 'success');
      renderJobs();
    });
  };
  renderJobs();

  $('#newJobBtn').addEventListener('click', () => openJobModal());

  // Recent applications
  const rt = $('#recentAppsBody');
  const recentApps = apps.slice(-8).reverse();
  if (!recentApps.length) {
    rt.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:22px">No applications yet.</td></tr>`;
  } else {
    rt.innerHTML = recentApps.map(a => {
      const j = Jobs.byId(a.jobId);
      return `<tr>
        <td>${esc(a.candidateName)}<br><span style="color:var(--text-muted);font-size:.82rem">${esc(a.candidateEmail)}</span></td>
        <td>${esc(j?.title || '—')}</td>
        <td>${timeAgo(a.createdAt)}</td>
        <td><span class="status-${a.status}">${a.status}</span></td>
        <td>
          <button class="btn btn-sm btn-ghost" data-view="${a.id}">Review</button>
        </td>
      </tr>`;
    }).join('');
    rt.querySelectorAll('[data-view]').forEach(b => b.onclick = () => openReviewModal(b.dataset.view));
  }

  // Post job modal helper
  function openJobModal(existing) {
    const j = existing || {};
    const m = openModal(`
      <h3>${existing ? 'Edit job' : 'Post a job'}</h3>
      <form id="jobForm" style="display:grid;gap:12px;grid-template-columns:1fr 1fr">
        <div class="form-group" style="grid-column:1/-1"><label>Job title</label><input name="title" class="form-control" required value="${esc(j.title || '')}"></div>
        <div class="form-group"><label>Company</label><input name="company" class="form-control" required value="${esc(j.company || cur.company || '')}"></div>
        <div class="form-group"><label>Location</label><input name="location" class="form-control" required value="${esc(j.location || '')}"></div>
        <div class="form-group"><label>Category</label>
          <select name="category" class="form-control">
            ${['Software Development','Web Development','Data Science','Machine Learning','UI/UX Design','Cyber Security','Networking','Cloud Computing','DevOps','Mobile Development','Marketing','Finance','HR'].map(c => `<option ${j.category===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Employment type</label>
          <select name="type" class="form-control">
            ${['Full Time','Part Time','Remote','Hybrid','Internship'].map(t => `<option ${j.type===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Experience</label>
          <select name="experience" class="form-control">
            ${['Fresher','1-2 Years','3-5 Years','5+ Years'].map(t => `<option ${j.experience===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Salary min (INR)</label><input type="number" name="salaryMin" class="form-control" value="${j.salaryMin || 300000}"></div>
        <div class="form-group"><label>Salary max (INR)</label><input type="number" name="salaryMax" class="form-control" value="${j.salaryMax || 800000}"></div>
        <div class="form-group" style="grid-column:1/-1"><label>Required skills (comma separated)</label><input name="skills" class="form-control" value="${esc((j.skills || []).join(', '))}"></div>
        <div class="form-group" style="grid-column:1/-1"><label>Job description</label><textarea name="description" rows="4" class="form-control" required>${esc(j.description || '')}</textarea></div>
        <div class="form-group" style="grid-column:1/-1"><label>Requirements (one per line)</label><textarea name="requirements" rows="3" class="form-control">${esc((j.requirements || []).join('\n'))}</textarea></div>
        <div class="form-group" style="grid-column:1/-1"><label>Benefits (one per line)</label><textarea name="benefits" rows="2" class="form-control">${esc((j.benefits || []).join('\n'))}</textarea></div>
        <div class="form-group"><label>Application deadline</label><input type="date" name="deadline" class="form-control" value="${j.deadline ? new Date(j.deadline).toISOString().slice(0,10) : ''}"></div>
        <div class="form-group"><label>Company logo</label><input type="file" name="logo" accept="image/*" class="form-control"></div>
        <button class="btn btn-primary" style="grid-column:1/-1">${existing ? 'Save changes' : 'Publish job'}</button>
      </form>`);
    m.querySelector('#jobForm').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const logoFile = fd.get('logo');
      const logo = logoFile && logoFile.size ? await fileToBase64(logoFile) : (j.companyLogo || '');
      const co = String(fd.get('company'));
      const payload = {
        title: String(fd.get('title')),
        company: co,
        logoInitials: co.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(),
        companyLogo: logo,
        location: String(fd.get('location')),
        category: String(fd.get('category')),
        type: String(fd.get('type')),
        experience: String(fd.get('experience')),
        salaryMin: Number(fd.get('salaryMin')),
        salaryMax: Number(fd.get('salaryMax')),
        skills: parseList(fd.get('skills')),
        description: String(fd.get('description')),
        requirements: parseList(fd.get('requirements')),
        benefits: parseList(fd.get('benefits')),
        deadline: fd.get('deadline') ? new Date(fd.get('deadline')).getTime() : Date.now() + 30*86400000,
      };
      if (existing) {
        Jobs.update(existing.id, payload);
        toast('Job updated', 'success');
      } else {
        Jobs.add({ id: uid('job'), ...payload, employerId: cur.id, createdAt: Date.now(), views: 0, applicants: 0, status: 'active' });
        toast('Job published', 'success');
      }
      closeModal();
      setTimeout(() => location.reload(), 500);
    });
  }

  function openReviewModal(appId) {
    const a = Applications.all().find(x => x.id === appId);
    const j = Jobs.byId(a.jobId);
    const c = Users.byId(a.candidateId);
    const m = openModal(`
      <h3>${esc(a.candidateName)}</h3>
      <p style="margin-bottom:14px">Applied for <b>${esc(j?.title || '—')}</b> · ${timeAgo(a.createdAt)}</p>
      <div class="flex gap-2 mb-2"><span class="chip chip-muted">${esc(a.candidateEmail)}</span>${a.portfolio ? `<a class="chip" href="${esc(a.portfolio)}" target="_blank">Portfolio</a>` : ''}</div>
      ${c ? `<p><b>About:</b> ${esc(c.about || '—')}</p><p><b>Skills:</b> ${(c.skills || []).map(s=>`<span class="chip">${esc(s)}</span>`).join(' ')}</p>` : ''}
      <p style="margin-top:12px"><b>Cover letter:</b><br>${esc(a.coverLetter || '—')}</p>
      <p><b>Current status:</b> <span class="status-${a.status}">${a.status}</span></p>
      <div class="flex gap-2 mt-3">
        <button class="btn btn-primary" data-s="shortlisted">Shortlist</button>
        <button class="btn btn-accent" data-s="selected">Select</button>
        <button class="btn btn-danger" data-s="rejected">Reject</button>
      </div>`);
    m.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
      Applications.updateStatus(a.id, b.dataset.s);
      Notifications.push(a.candidateId, `Your application for ${j?.title || 'a job'} was ${b.dataset.s}`, 'info');
      toast('Status updated', 'success');
      closeModal();
      setTimeout(() => location.reload(), 500);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => initEmployerDashboard());
