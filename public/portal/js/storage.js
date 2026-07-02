/* =========================================================
   storage.js — LocalStorage-backed "database"
   Tables: users, jobs, applications, savedJobs,
           notifications, currentUser, recentlyViewed
   ========================================================= */

const KEYS = {
  users: 'jc_users',
  jobs: 'jc_jobs',
  applications: 'jc_applications',
  saved: 'jc_savedJobs',
  notifications: 'jc_notifications',
  currentUser: 'jc_currentUser',
  recent: 'jc_recentlyViewed',
  companyRatings: 'jc_companyRatings',
  seeded: 'jc_seeded_v1',
};

const read  = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/* ---------------- Users ---------------- */
export const Users = {
  all: () => read(KEYS.users, []),
  add(user) { const list = this.all(); list.push(user); write(KEYS.users, list); return user; },
  update(id, patch) {
    const list = this.all().map(u => u.id === id ? { ...u, ...patch } : u);
    write(KEYS.users, list);
    const cur = Session.get();
    if (cur && cur.id === id) Session.set({ ...cur, ...patch });
  },
  findByEmail: email => read(KEYS.users, []).find(u => u.email.toLowerCase() === String(email).toLowerCase()),
  byId: id => read(KEYS.users, []).find(u => u.id === id),
  byRole: role => read(KEYS.users, []).filter(u => u.role === role),
};

/* ---------------- Session ---------------- */
export const Session = {
  get: () => read(KEYS.currentUser, null),
  set: u => write(KEYS.currentUser, u),
  clear: () => localStorage.removeItem(KEYS.currentUser),
  require(role) {
    const u = this.get();
    if (!u) { location.href = 'login.html'; return null; }
    if (role && u.role !== role) { location.href = 'index.html'; return null; }
    return u;
  }
};

/* ---------------- Jobs ---------------- */
export const Jobs = {
  all: () => read(KEYS.jobs, []),
  byId: id => read(KEYS.jobs, []).find(j => j.id === id),
  add(job) { const list = this.all(); list.unshift(job); write(KEYS.jobs, list); return job; },
  update(id, patch) {
    write(KEYS.jobs, this.all().map(j => j.id === id ? { ...j, ...patch } : j));
  },
  remove(id) { write(KEYS.jobs, this.all().filter(j => j.id !== id)); },
  byEmployer: employerId => read(KEYS.jobs, []).filter(j => j.employerId === employerId),
};

/* ---------------- Applications ---------------- */
export const Applications = {
  all: () => read(KEYS.applications, []),
  byCandidate: cid => read(KEYS.applications, []).filter(a => a.candidateId === cid),
  byJob: jid => read(KEYS.applications, []).filter(a => a.jobId === jid),
  byEmployer(employerId) {
    const jobIds = Jobs.byEmployer(employerId).map(j => j.id);
    return this.all().filter(a => jobIds.includes(a.jobId));
  },
  add(app) { const l = this.all(); l.push(app); write(KEYS.applications, l); return app; },
  updateStatus(id, status) {
    write(KEYS.applications, this.all().map(a => a.id === id ? { ...a, status, updatedAt: Date.now() } : a));
  },
  hasApplied: (cid, jid) => read(KEYS.applications, []).some(a => a.candidateId === cid && a.jobId === jid),
};

/* ---------------- Saved jobs ---------------- */
export const Saved = {
  list: cid => read(KEYS.saved, {})[cid] || [],
  toggle(cid, jid) {
    const all = read(KEYS.saved, {});
    const arr = new Set(all[cid] || []);
    arr.has(jid) ? arr.delete(jid) : arr.add(jid);
    all[cid] = [...arr];
    write(KEYS.saved, all);
    return arr.has(jid);
  },
  isSaved: (cid, jid) => (read(KEYS.saved, {})[cid] || []).includes(jid),
};

/* ---------------- Notifications ---------------- */
export const Notifications = {
  list: uid => read(KEYS.notifications, {})[uid] || [],
  push(uid, msg, type = 'info') {
    const all = read(KEYS.notifications, {});
    all[uid] = all[uid] || [];
    all[uid].unshift({ id: Date.now(), msg, type, ts: Date.now(), read: false });
    all[uid] = all[uid].slice(0, 40);
    write(KEYS.notifications, all);
  },
  markAllRead(uid) {
    const all = read(KEYS.notifications, {});
    (all[uid] || []).forEach(n => n.read = true);
    write(KEYS.notifications, all);
  },
};

/* ---------------- Recently viewed ---------------- */
export const Recent = {
  list: uid => read(KEYS.recent, {})[uid] || [],
  push(uid, jid) {
    if (!uid) return;
    const all = read(KEYS.recent, {});
    const arr = [jid, ...(all[uid] || []).filter(id => id !== jid)].slice(0, 8);
    all[uid] = arr;
    write(KEYS.recent, all);
  }
};

/* ---------------- Company Ratings ---------------- */
export const Ratings = {
  get: co => (read(KEYS.companyRatings, {})[co] || { total: 0, count: 0 }),
  add(co, stars) {
    const all = read(KEYS.companyRatings, {});
    const r = all[co] || { total: 0, count: 0 };
    r.total += stars; r.count += 1;
    all[co] = r;
    write(KEYS.companyRatings, all);
  },
  avg(co) { const r = this.get(co); return r.count ? (r.total / r.count) : 0; }
};

/* ---------------- Seed / Reset ---------------- */
export function ensureSeed() {
  if (localStorage.getItem(KEYS.seeded) === '1' && Jobs.all().length > 0) return;
  seedDemo();
  localStorage.setItem(KEYS.seeded, '1');
}
export function resetAll() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  seedDemo();
  localStorage.setItem(KEYS.seeded, '1');
}

/* ---------------- Demo data generator ---------------- */
function seedDemo() {
  const now = Date.now();

  // 20 companies
  const companies = [
    { name: 'NovaTech Labs', city: 'Bengaluru', ind: 'Software Development' },
    { name: 'QuantumForge', city: 'Hyderabad', ind: 'Data Science' },
    { name: 'PixelPeak Studios', city: 'Pune', ind: 'UI/UX Design' },
    { name: 'CloudRift Systems', city: 'Chennai', ind: 'Cloud Computing' },
    { name: 'CyberBastion', city: 'Delhi', ind: 'Cyber Security' },
    { name: 'MetricMuse', city: 'Mumbai', ind: 'Marketing' },
    { name: 'BlueOcean Fintech', city: 'Mumbai', ind: 'Finance' },
    { name: 'GreenLoop AI', city: 'Bengaluru', ind: 'Machine Learning' },
    { name: 'Northwind Networks', city: 'Noida', ind: 'Networking' },
    { name: 'Skylark Mobile', city: 'Bengaluru', ind: 'Mobile Development' },
    { name: 'HelixSoft', city: 'Gurugram', ind: 'Software Development' },
    { name: 'Orbital DevOps', city: 'Pune', ind: 'DevOps' },
    { name: 'Lumen Analytics', city: 'Hyderabad', ind: 'Data Science' },
    { name: 'PeopleFirst HR', city: 'Bengaluru', ind: 'HR' },
    { name: 'CodeCanvas Web', city: 'Ahmedabad', ind: 'Web Development' },
    { name: 'ByteBrew', city: 'Kolkata', ind: 'Web Development' },
    { name: 'Zenith Robotics', city: 'Chennai', ind: 'Machine Learning' },
    { name: 'AtlasPay', city: 'Bengaluru', ind: 'Finance' },
    { name: 'Marigold Media', city: 'Mumbai', ind: 'Marketing' },
    { name: 'IronBridge Cloud', city: 'Hyderabad', ind: 'Cloud Computing' },
  ];

  // Employers (one per first 5 companies)
  const employers = companies.slice(0, 5).map((c, i) => ({
    id: `u_emp_${i}`, name: `${c.name} Recruiter`, email: `hr${i+1}@${c.name.toLowerCase().replace(/\s+/g,'')}.com`,
    mobile: `98${(76540000 + i).toString().slice(-8)}`, password: 'demo1234',
    role: 'employer', company: c.name, createdAt: now - (i+1)*86400000
  }));

  // Candidates
  const candidates = [
    'Aarav Sharma', 'Priya Menon', 'Rohan Iyer', 'Diya Patel', 'Kabir Verma',
    'Anaya Reddy', 'Vihaan Nair', 'Ishaan Rao', 'Meera Joshi', 'Advik Gupta'
  ].map((name, i) => ({
    id: `u_cand_${i}`, name, email: `${name.toLowerCase().replace(/\s+/g, '.')}@mail.com`,
    mobile: `97${(87650000 + i).toString().slice(-8)}`, password: 'demo1234',
    role: 'candidate', location: companies[i % companies.length].city,
    about: 'Passionate developer focused on building meaningful products.',
    skills: ['JavaScript','React','Node.js','SQL'],
    education: [{ degree: 'MCA', school: 'ABC University', year: '2024' }],
    experience: [],
    createdAt: now - (i+1)*3600000
  }));

  const users = [...employers, ...candidates];

  // Jobs
  const cats = ['Software Development','Web Development','Data Science','Machine Learning','UI/UX Design',
    'Cyber Security','Networking','Cloud Computing','DevOps','Mobile Development','Marketing','Finance','HR'];
  const titles = {
    'Software Development': ['Software Engineer','Backend Developer','Full Stack Developer','Java Developer','Python Engineer'],
    'Web Development': ['Frontend Developer','React Developer','Web Designer','MERN Developer'],
    'Data Science': ['Data Analyst','Data Scientist','BI Engineer'],
    'Machine Learning': ['ML Engineer','Applied Scientist','NLP Engineer'],
    'UI/UX Design': ['UI Designer','UX Researcher','Product Designer'],
    'Cyber Security': ['Security Analyst','SOC Engineer','Penetration Tester'],
    'Networking': ['Network Engineer','Systems Admin'],
    'Cloud Computing': ['Cloud Engineer','AWS Architect','Azure Consultant'],
    'DevOps': ['DevOps Engineer','SRE','Platform Engineer'],
    'Mobile Development': ['Android Developer','iOS Developer','Flutter Developer'],
    'Marketing': ['Digital Marketing Executive','SEO Specialist'],
    'Finance': ['Financial Analyst','Investment Associate'],
    'HR': ['HR Executive','Talent Partner']
  };
  const skillsMap = {
    'Software Development': ['Java','Spring','SQL','Git','Microservices'],
    'Web Development': ['React','Next.js','CSS','TypeScript','Node'],
    'Data Science': ['Python','Pandas','SQL','Tableau','Statistics'],
    'Machine Learning': ['Python','PyTorch','TensorFlow','MLOps'],
    'UI/UX Design': ['Figma','Prototyping','User Research','Design Systems'],
    'Cyber Security': ['Networking','Kali','OWASP','SIEM'],
    'Networking': ['CCNA','Firewalls','TCP/IP'],
    'Cloud Computing': ['AWS','Terraform','Kubernetes','Linux'],
    'DevOps': ['CI/CD','Docker','Kubernetes','Ansible'],
    'Mobile Development': ['Kotlin','Swift','Flutter','React Native'],
    'Marketing': ['SEO','Google Ads','Analytics'],
    'Finance': ['Excel','Modelling','Valuation'],
    'HR': ['Recruitment','ATS','Sourcing']
  };
  const types = ['Full Time','Part Time','Remote','Hybrid','Internship'];
  const exps  = ['Fresher','1-2 Years','3-5 Years','5+ Years'];
  const salaries = [
    [200000, 300000], [300000, 600000], [600000, 1000000],
    [1000000, 1600000], [1600000, 2500000], [400000, 800000]
  ];
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];

  const jobs = [];
  for (let i = 0; i < 55; i++) {
    const cat = rand(cats);
    const co  = rand(companies);
    const t   = rand(titles[cat] || ['Associate']);
    const sr  = rand(salaries);
    const emp = employers[i % employers.length];
    jobs.push({
      id: `job_${i}`,
      title: t,
      company: co.name,
      logoInitials: co.name.split(' ').map(w=>w[0]).slice(0,2).join(''),
      location: co.city,
      category: cat,
      type: rand(types),
      experience: rand(exps),
      salaryMin: sr[0],
      salaryMax: sr[1],
      skills: skillsMap[cat] ? skillsMap[cat].slice(0, 4 + Math.floor(Math.random()*2)) : ['General'],
      description: `We are hiring a ${t} at ${co.name} (${co.city}). Join a fast-moving team building products used by millions. You'll collaborate closely with cross-functional partners and own meaningful features end-to-end.`,
      requirements: [
        `Proven experience with ${(skillsMap[cat] || ['relevant tools'])[0]}`,
        'Strong problem-solving and communication skills',
        'Ability to work independently in an agile environment',
        'Bachelor\'s or Master\'s in a related field'
      ],
      benefits: ['Health insurance', 'Flexible hours', 'Learning stipend', 'Team retreats'],
      deadline: now + (7 + Math.floor(Math.random()*30)) * 86400000,
      employerId: emp.id,
      companyLogo: '',
      createdAt: now - Math.floor(Math.random()*20) * 86400000,
      views: Math.floor(Math.random() * 500),
      applicants: 0,
      status: 'active',
    });
  }

  // Some sample applications from candidates -> jobs
  const applications = [];
  for (let i = 0; i < 18; i++) {
    const c = candidates[i % candidates.length];
    const j = jobs[Math.floor(Math.random() * jobs.length)];
    if (applications.some(a => a.candidateId === c.id && a.jobId === j.id)) continue;
    applications.push({
      id: `app_${i}`,
      jobId: j.id,
      candidateId: c.id,
      candidateName: c.name,
      candidateEmail: c.email,
      resume: '',
      coverLetter: 'I am excited about this opportunity and believe my skills align well.',
      portfolio: 'https://portfolio.example.com',
      status: rand(['pending','pending','shortlisted','rejected','selected']),
      createdAt: now - Math.floor(Math.random()*8) * 86400000,
      updatedAt: now,
    });
  }
  jobs.forEach(j => j.applicants = applications.filter(a => a.jobId === j.id).length);

  // Saved jobs — candidate 0 saved a couple
  const saved = {};
  saved[candidates[0].id] = [jobs[1].id, jobs[3].id, jobs[7].id];

  // Ratings
  const ratings = {};
  companies.forEach(c => {
    const count = 3 + Math.floor(Math.random()*20);
    const avg = 3.4 + Math.random()*1.5;
    ratings[c.name] = { total: Math.round(avg * count), count };
  });

  // Write to storage
  write(KEYS.users, users);
  write(KEYS.jobs, jobs);
  write(KEYS.applications, applications);
  write(KEYS.saved, saved);
  write(KEYS.companyRatings, ratings);
  write(KEYS.notifications, {});
  write(KEYS.recent, {});
}

export const StorageMeta = {
  companies: () => [...new Set(Jobs.all().map(j => j.company))],
  categories: () => {
    const counts = {};
    Jobs.all().forEach(j => counts[j.category] = (counts[j.category] || 0) + 1);
    return counts;
  },
  totals: () => ({
    jobs: Jobs.all().length,
    companies: new Set(Jobs.all().map(j => j.company)).size,
    candidates: Users.byRole('candidate').length,
    employers: Users.byRole('employer').length,
  })
};

export function exportProfileJson(user) {
  const data = { user, savedJobs: Saved.list(user.id), applications: Applications.byCandidate(user.id) };
  return JSON.stringify(data, null, 2);
}
export function importProfileJson(text) {
  const data = JSON.parse(text);
  if (!data.user || !data.user.email) throw new Error('Invalid file');
  const exists = Users.findByEmail(data.user.email);
  if (exists) Users.update(exists.id, data.user);
  else Users.add(data.user);
  return data.user;
}
