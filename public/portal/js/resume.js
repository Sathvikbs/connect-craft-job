/* =========================================================
   resume.js — resume builder with 3 templates + print/export
   ========================================================= */

import { Session } from './storage.js';
import { $, $$, esc, toast, fileToBase64 } from './utils.js';

const DEFAULTS = {
  photo: '',
  fullName: 'Aarav Sharma',
  title: 'Full Stack Developer',
  email: 'aarav.sharma@mail.com',
  phone: '+91 98765 43210',
  location: 'Bengaluru, India',
  about: 'Motivated MCA graduate with hands-on experience in modern web development, cloud services, and product thinking.',
  skills: 'JavaScript, React, Node.js, MongoDB, AWS, Git',
  education: [
    { degree: 'MCA', school: 'ABC University', year: '2022-2024', detail: 'CGPA: 9.1' },
    { degree: 'B.Sc. Computer Science', school: 'XYZ College', year: '2019-2022', detail: 'CGPA: 8.7' },
  ],
  experience: [
    { role: 'Software Engineering Intern', company: 'NovaTech Labs', year: '2023', detail: 'Built internal dashboards used by 200+ analysts.' },
  ],
  projects: [
    { name: 'JobConnect Portal', tech: 'HTML, CSS, JavaScript', detail: 'Full-featured job portal with dashboards, resume builder, and analytics.' },
    { name: 'Analytics Kit', tech: 'React, D3', detail: 'Reusable charting library adopted across 3 internal apps.' },
  ],
  certifications: [
    { name: 'AWS Cloud Practitioner', year: '2024' },
    { name: 'Google UX Design', year: '2023' },
  ],
  languages: 'English, Hindi',
  achievements: 'Winner, Smart India Hackathon 2023',
};

const KEY = 'jc_resume_draft';

function loadDraft(user) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) return saved;
  } catch {}
  return { ...DEFAULTS,
    fullName: user?.name || DEFAULTS.fullName,
    email: user?.email || DEFAULTS.email,
    phone: user?.mobile || DEFAULTS.phone,
    location: user?.location || DEFAULTS.location,
    skills: (user?.skills || []).length ? user.skills.join(', ') : DEFAULTS.skills,
    photo: user?.photo || '',
  };
}

function initResume() {
  const form = $('#resumeForm');
  const preview = $('#resumePreview');
  if (!form || !preview) return;

  const user = Session.get();
  const state = loadDraft(user);
  let template = 'classic';

  // populate simple fields
  ['fullName','title','email','phone','location','about','skills','languages','achievements'].forEach(k => {
    const el = form.querySelector(`[name="${k}"]`);
    if (el) el.value = state[k] || '';
  });

  // repeating sections
  buildRepeater('education', ['degree','school','year','detail'], state.education);
  buildRepeater('experience', ['role','company','year','detail'], state.experience);
  buildRepeater('projects', ['name','tech','detail'], state.projects);
  buildRepeater('certifications', ['name','year'], state.certifications);

  function buildRepeater(name, fields, arr) {
    const wrap = $(`#rep-${name}`);
    if (!wrap) return;
    const render = () => {
      wrap.innerHTML = arr.map((row, i) => `
        <div class="card" style="padding:14px;margin-bottom:10px">
          ${fields.map(f => `<div class="form-group" style="margin-bottom:8px">
            <label style="font-size:.75rem">${f}</label>
            <input class="form-control" data-i="${i}" data-f="${f}" value="${esc(row[f] || '')}">
          </div>`).join('')}
          <button type="button" class="btn btn-sm btn-danger" data-del="${i}">Remove</button>
        </div>`).join('');
      wrap.querySelectorAll('input').forEach(inp => inp.oninput = e => {
        arr[+e.target.dataset.i][e.target.dataset.f] = e.target.value;
        state[name] = arr;
        update();
      });
      wrap.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
        arr.splice(+b.dataset.del, 1); state[name] = arr; render(); update();
      });
    };
    render();
    $(`#add-${name}`)?.addEventListener('click', () => {
      arr.push(Object.fromEntries(fields.map(f => [f, ''])));
      state[name] = arr; render(); update();
    });
  }

  // Photo upload
  form.photo?.addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    state.photo = await fileToBase64(f);
    update();
  });

  // Inputs
  form.addEventListener('input', e => {
    if (e.target.name && e.target.name !== 'photo') {
      state[e.target.name] = e.target.value;
      update();
    }
  });

  // Template picker
  $$('.tmpl-picker button').forEach(b => b.addEventListener('click', () => {
    $$('.tmpl-picker button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    template = b.dataset.tmpl;
    update();
  }));

  // Actions
  $('#saveResume')?.addEventListener('click', () => {
    localStorage.setItem(KEY, JSON.stringify(state));
    toast('Draft saved', 'success');
  });
  $('#printResume')?.addEventListener('click', () => window.print());
  $('#downloadResume')?.addEventListener('click', () => downloadHTML());

  function update() {
    localStorage.setItem(KEY, JSON.stringify(state));
    preview.innerHTML = renderTemplate(template, state);
  }
  update();

  function downloadHTML() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(state.fullName)} — Resume</title>
      <link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/dashboard.css">
      </head><body style="background:white"><div style="max-width:820px;margin:0 auto;background:white">${renderTemplate(template, state)}</div>
      <script>window.onload=()=>window.print()</script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${state.fullName.replace(/\s+/g,'_')}_Resume.html`; a.click();
    URL.revokeObjectURL(url);
    toast('Resume downloaded', 'success');
  }
}

function renderTemplate(t, s) {
  const skills = (s.skills || '').split(',').map(x => x.trim()).filter(Boolean);
  const langs  = (s.languages || '').split(',').map(x => x.trim()).filter(Boolean);
  const avatar = s.photo ? `<img class="rz-avatar" src="${s.photo}" alt="">` : '';

  if (t === 'modern') {
    return `<div class="rz rz-modern">
      <aside>
        ${avatar}
        <h4>Contact</h4>
        <p>${esc(s.email)}</p><p>${esc(s.phone)}</p><p>${esc(s.location)}</p>
        <h4>Skills</h4>
        <ul style="padding-left:16px;margin:0">${skills.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
        <h4>Languages</h4>
        <p>${langs.map(esc).join(' · ')}</p>
        <h4>Certifications</h4>
        ${(s.certifications||[]).map(c=>`<p>${esc(c.name)} <span style="color:#F59E0B">${esc(c.year)}</span></p>`).join('')}
      </aside>
      <main>
        <h2 class="rz-name">${esc(s.fullName)}</h2>
        <div class="rz-title">${esc(s.title)}</div>
        <p style="margin-top:12px">${esc(s.about)}</p>
        <h4>Experience</h4>
        ${(s.experience||[]).map(e=>`<div class="item"><b>${esc(e.role)}</b> — ${esc(e.company)} <span style="color:#999">(${esc(e.year)})</span><br><span style="color:#555">${esc(e.detail)}</span></div>`).join('')}
        <h4>Education</h4>
        ${(s.education||[]).map(e=>`<div class="item"><b>${esc(e.degree)}</b> — ${esc(e.school)} <span style="color:#999">(${esc(e.year)})</span><br><span style="color:#555">${esc(e.detail)}</span></div>`).join('')}
        <h4>Projects</h4>
        ${(s.projects||[]).map(p=>`<div class="item"><b>${esc(p.name)}</b> <span style="color:#999">— ${esc(p.tech)}</span><br><span style="color:#555">${esc(p.detail)}</span></div>`).join('')}
        <h4>Achievements</h4><p>${esc(s.achievements)}</p>
      </main>
    </div>`;
  }
  if (t === 'minimal') {
    return `<div class="rz rz-minimal">
      ${avatar}
      <h2 class="rz-name">${esc(s.fullName)}</h2>
      <div class="rz-title">${esc(s.title)}</div>
      <div style="margin-top:10px;color:#666;font-size:.9rem">${esc(s.email)} · ${esc(s.phone)} · ${esc(s.location)}</div>
      <p style="margin-top:14px">${esc(s.about)}</p>
      <h4>Skills</h4><p>${skills.map(esc).join(' · ')}</p>
      <h4>Experience</h4>
      ${(s.experience||[]).map(e=>`<div class="item"><b>${esc(e.role)}</b>, ${esc(e.company)} <span style="color:#999">— ${esc(e.year)}</span><br><span style="color:#555">${esc(e.detail)}</span></div>`).join('')}
      <h4>Education</h4>
      ${(s.education||[]).map(e=>`<div class="item"><b>${esc(e.degree)}</b>, ${esc(e.school)} <span style="color:#999">— ${esc(e.year)}</span><br><span style="color:#555">${esc(e.detail)}</span></div>`).join('')}
      <h4>Projects</h4>
      ${(s.projects||[]).map(p=>`<div class="item"><b>${esc(p.name)}</b> <span style="color:#999">— ${esc(p.tech)}</span><br><span style="color:#555">${esc(p.detail)}</span></div>`).join('')}
      <h4>Certifications</h4><p>${(s.certifications||[]).map(c=>`${esc(c.name)} (${esc(c.year)})`).join(' · ')}</p>
      <h4>Languages</h4><p>${langs.map(esc).join(' · ')}</p>
    </div>`;
  }
  // classic (default)
  return `<div class="rz rz-classic">
    ${avatar}
    <h2 class="rz-name">${esc(s.fullName)}</h2>
    <div class="rz-title">${esc(s.title)}</div>
    <div class="rz-contact">${esc(s.email)} · ${esc(s.phone)} · ${esc(s.location)}</div>
    <hr>
    <h4>Objective</h4><p>${esc(s.about)}</p>
    <h4>Skills</h4><p>${skills.map(esc).join(' · ')}</p>
    <h4>Experience</h4>
    ${(s.experience||[]).map(e=>`<div class="item"><div class="head"><span>${esc(e.role)} — ${esc(e.company)}</span><span>${esc(e.year)}</span></div><div class="sub">${esc(e.detail)}</div></div>`).join('')}
    <h4>Education</h4>
    ${(s.education||[]).map(e=>`<div class="item"><div class="head"><span>${esc(e.degree)} — ${esc(e.school)}</span><span>${esc(e.year)}</span></div><div class="sub">${esc(e.detail)}</div></div>`).join('')}
    <h4>Projects</h4>
    ${(s.projects||[]).map(p=>`<div class="item"><div class="head"><span>${esc(p.name)}</span><span>${esc(p.tech)}</span></div><div class="sub">${esc(p.detail)}</div></div>`).join('')}
    <h4>Certifications</h4><p>${(s.certifications||[]).map(c=>`${esc(c.name)} (${esc(c.year)})`).join(' · ')}</p>
    <h4>Languages</h4><p>${langs.map(esc).join(' · ')}</p>
    <h4>Achievements</h4><p>${esc(s.achievements)}</p>
  </div>`;
}

window.addEventListener('DOMContentLoaded', initResume);
