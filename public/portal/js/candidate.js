/* =========================================================
   candidate.js — candidate dashboard, profile, canvas charts
   ========================================================= */

import { Jobs, Applications, Saved, Session, Recent, Users } from './storage.js';
import { $, $$, esc, inr, timeAgo, toast, fileToBase64 } from './utils.js';
import { jobCardHTML } from './app.js';

/* --------------- Canvas chart helpers (exported) --------------- */

export function drawBarChart(canvas, data, color = '#2563EB') {
  if (!canvas || !data.length) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pad = 34;
  const chartW = W - pad * 2, chartH = H - pad * 2;
  const max = Math.max(1, ...data.map(d => d.value));
  const bw = chartW / data.length * 0.6;
  const gap = chartW / data.length * 0.4;

  // grid
  ctx.strokeStyle = 'rgba(148,163,184,.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
  }

  data.forEach((d, i) => {
    const x = pad + i * (bw + gap) + gap / 2;
    const h = (d.value / max) * chartH;
    const y = H - pad - h;
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '55');
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, bw, h, 6);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, x + bw / 2, H - pad + 16);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px Inter';
    ctx.fillText(d.value, x + bw / 2, y - 6);
  });
}

export function drawDonutChart(canvas, data, colors) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  const total = data.reduce((a, b) => a + b.value, 0);
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 20;
  let angle = -Math.PI / 2;

  if (!total) {
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 24;
    ctx.beginPath(); ctx.arc(cx, cy, r - 12, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.font = '13px Inter'; ctx.textAlign = 'center';
    ctx.fillText('No data yet', cx, cy);
    return;
  }
  data.forEach((d, i) => {
    const slice = (d.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    angle += slice;
  });
  // hollow center
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#0f172a'; ctx.font = 'bold 18px Sora'; ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 4);
  ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter';
  ctx.fillText('total', cx, cy + 20);
}

function roundRect(ctx, x, y, w, h, r) {
  if (h < 1) h = 1;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* --------------- Candidate dashboard --------------- */
function initCandidateDashboard() {
  const wrap = $('#candDash');
  if (!wrap) return;
  const cur = Session.require('candidate'); if (!cur) return;

  const apps = Applications.byCandidate(cur.id);
  const saved = Saved.list(cur.id);
  const completion = profileCompletion(cur);

  $('#kApplied').textContent = apps.length;
  $('#kSaved').textContent = saved.length;
  $('#kProfile').textContent = completion + '%';
  $('#kMatches').textContent = recommendedJobs(cur).length;

  // Charts
  const statusCounts = ['pending','shortlisted','rejected','selected'].map(s => ({ label: s, value: apps.filter(a => a.status === s).length }));
  drawDonutChart($('#chartStatus'), statusCounts, ['#F59E0B','#06B6D4','#EF4444','#10B981']);

  // Applications over last 6 weeks (by createdAt)
  const now = Date.now();
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const from = now - (5 - i) * 7 * 86400000;
    const to = from + 7 * 86400000;
    return { label: `W${i+1}`, value: apps.filter(a => a.createdAt >= from && a.createdAt < to).length };
  });
  drawBarChart($('#chartTrend'), buckets, '#14B8A6');

  // Profile completion progress bar
  $('#profileBar').style.width = completion + '%';
  $('#profileTip').textContent = completion === 100 ? 'Your profile looks great!' : 'Complete your profile to unlock better job matches.';

  // Recommended jobs
  const rec = recommendedJobs(cur).slice(0, 6);
  $('#recJobs').innerHTML = rec.length ? rec.map(jobCardHTML).join('') : `<p style="grid-column:1/-1;color:var(--text-muted)">Add skills to your profile to see recommendations.</p>`;

  // Recently viewed
  const recent = Recent.list(cur.id).map(id => Jobs.byId(id)).filter(Boolean).slice(0, 4);
  $('#recentJobs').innerHTML = recent.length ? recent.map(jobCardHTML).join('') : `<p style="color:var(--text-muted)">Browse jobs to see them here.</p>`;
}

function profileCompletion(u) {
  const fields = [u.name, u.email, u.mobile, u.location, u.about, (u.skills||[]).length ? 'x' : '', (u.education||[]).length ? 'x' : ''];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}
function recommendedJobs(u) {
  const skills = new Set((u.skills || []).map(s => s.toLowerCase()));
  if (!skills.size) return Jobs.all().slice(0, 6);
  return Jobs.all()
    .map(j => ({ j, score: (j.skills || []).filter(s => skills.has(s.toLowerCase())).length }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.j);
}

/* --------------- Profile page --------------- */
function initProfile() {
  const form = $('#profileForm');
  if (!form) return;
  const cur = Session.require(); if (!cur) return;

  // Populate
  form.name.value = cur.name || '';
  form.email.value = cur.email || '';
  form.mobile.value = cur.mobile || '';
  form.location.value = cur.location || '';
  form.about.value = cur.about || '';
  form.skills.value = (cur.skills || []).join(', ');
  if (cur.photo) $('#pfAvatar').src = cur.photo;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const photoFile = form.photo.files[0];
    const photo = photoFile ? await fileToBase64(photoFile) : cur.photo;
    Users.update(cur.id, {
      name: form.name.value.trim(),
      mobile: form.mobile.value.trim(),
      location: form.location.value.trim(),
      about: form.about.value.trim(),
      skills: form.skills.value.split(',').map(s => s.trim()).filter(Boolean),
      photo,
    });
    toast('Profile updated', 'success');
    setTimeout(() => location.reload(), 500);
  });

  // Export / import
  $('#exportBtn')?.addEventListener('click', () => {
    import('./storage.js').then(m => {
      const blob = new Blob([m.exportProfileJson(Session.get())], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${cur.name.replace(/\s+/g,'_')}_profile.json`; a.click();
      URL.revokeObjectURL(url);
      toast('Profile exported', 'success');
    });
  });
  $('#importBtn')?.addEventListener('click', () => $('#importFile').click());
  $('#importFile')?.addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    const text = await f.text();
    try {
      const m = await import('./storage.js');
      m.importProfileJson(text);
      toast('Profile imported', 'success');
      setTimeout(() => location.reload(), 500);
    } catch { toast('Invalid profile JSON', 'error'); }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initCandidateDashboard();
  initProfile();
});
