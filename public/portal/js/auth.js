/* =========================================================
   auth.js — login + multi-step register + password reset
   ========================================================= */

import { Users, Session, Notifications } from './storage.js';
import { $, $$, uid, toast, isEmail, isMobile, passwordStrength } from './utils.js';

/* ---------------- Login ---------------- */
export function initLogin() {
  const form = $('#loginForm');
  if (!form) return;

  const remembered = localStorage.getItem('jc_remember_email');
  if (remembered) form.email.value = remembered;

  $('#togglePw')?.addEventListener('click', () => {
    const p = form.password;
    p.type = p.type === 'password' ? 'text' : 'password';
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!isEmail(email)) return toast('Enter a valid email', 'error');
    const user = Users.findByEmail(email);
    if (!user || user.password !== password) return toast('Invalid credentials', 'error');
    if (form.remember.checked) localStorage.setItem('jc_remember_email', email);
    else localStorage.removeItem('jc_remember_email');
    Session.set(user);
    Notifications.push(user.id, 'Welcome back to JobConnect!', 'success');
    toast(`Welcome ${user.name.split(' ')[0]}!`, 'success');
    setTimeout(() => location.href = user.role === 'employer' ? 'employer-dashboard.html' : 'candidate-dashboard.html', 600);
  });

  // Quick demo login buttons
  $('#demoCand')?.addEventListener('click', () => quickLogin('aarav.sharma@mail.com'));
  $('#demoEmp')?.addEventListener('click', () => quickLogin('hr1@novatechlabs.com'));

  function quickLogin(email) {
    form.email.value = email;
    form.password.value = 'demo1234';
    form.requestSubmit();
  }
}

/* ---------------- Multi-step Registration ---------------- */
export function initRegister() {
  const form = $('#registerForm');
  if (!form) return;

  let step = 0;
  const steps = $$('.reg-step');
  const nav = $$('.step-nav .step');
  const showStep = i => {
    steps.forEach((s, k) => s.classList.toggle('hidden', k !== i));
    nav.forEach((n, k) => {
      n.classList.toggle('active', k === i);
      n.classList.toggle('done', k < i);
    });
  };
  showStep(0);

  $$('.btn-next').forEach(b => b.addEventListener('click', () => {
    if (!validateStep(step)) return;
    step = Math.min(steps.length - 1, step + 1);
    showStep(step);
  }));
  $$('.btn-prev').forEach(b => b.addEventListener('click', () => {
    step = Math.max(0, step - 1);
    showStep(step);
  }));

  // Password strength meter
  const pw = form.password;
  const meter = $('#pwMeter > span');
  pw?.addEventListener('input', () => {
    const s = passwordStrength(pw.value);
    const pct = (s / 5) * 100;
    const colors = ['#EF4444','#F59E0B','#F59E0B','#14B8A6','#10B981','#10B981'];
    meter.style.width = pct + '%';
    meter.style.background = colors[s];
  });

  // Show/hide password
  $$('.pw-toggle').forEach(t => t.addEventListener('click', () => {
    const field = form.querySelector(`[name="${t.dataset.for}"]`);
    if (field) field.type = field.type === 'password' ? 'text' : 'password';
  }));

  // Role picker
  $$('.role-picker label').forEach(l => l.addEventListener('click', () => {
    $$('.role-picker label').forEach(x => x.classList.remove('selected'));
    l.classList.add('selected');
  }));

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateStep(2)) return;
    const data = new FormData(form);
    const email = String(data.get('email')).trim();
    if (Users.findByEmail(email)) return toast('That email is already registered', 'error');
    const user = {
      id: uid('u'),
      name: String(data.get('name')).trim(),
      email,
      mobile: String(data.get('mobile')).trim(),
      password: String(data.get('password')),
      role: String(data.get('role')),
      company: String(data.get('company') || ''),
      location: '',
      about: '',
      skills: [],
      education: [],
      experience: [],
      createdAt: Date.now()
    };
    Users.add(user);
    Session.set(user);
    Notifications.push(user.id, 'Welcome to JobConnect! Complete your profile to get better matches.', 'info');
    toast('Account created successfully', 'success');
    setTimeout(() => location.href = user.role === 'employer' ? 'employer-dashboard.html' : 'candidate-dashboard.html', 700);
  });

  function validateStep(i) {
    let ok = true;
    const setInvalid = (el, cond) => { el.classList.toggle('invalid', !cond); if (!cond) ok = false; };
    if (i === 0) {
      setInvalid(form.name, form.name.value.trim().length >= 2);
      setInvalid(form.email, isEmail(form.email.value));
      setInvalid(form.mobile, isMobile(form.mobile.value));
    }
    if (i === 1) {
      setInvalid(form.password, passwordStrength(form.password.value) >= 3);
      setInvalid(form.confirm, form.confirm.value === form.password.value && form.password.value.length > 0);
    }
    if (i === 2) {
      const role = form.querySelector('input[name="role"]:checked');
      if (!role) { toast('Choose a role', 'error'); ok = false; }
      if (!form.terms.checked) { toast('Please accept the terms', 'error'); ok = false; }
    }
    if (!ok) toast('Please fix the highlighted fields', 'error');
    return ok;
  }
}

/* auto-init based on page */
window.addEventListener('DOMContentLoaded', () => { initLogin(); initRegister(); });
