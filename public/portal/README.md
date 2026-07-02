# JOBCONNECT — Smart Online Job Portal System

> *"Connecting Talent With Opportunities"*

A complete, production-quality job portal mini project built with **only HTML, CSS, and Vanilla JavaScript** — no frameworks, no build tools, no backend. All data is persisted in the browser's `localStorage`, which acts as a fully functional mock database.

Suitable for MCA / BCA / B.Tech mini-project submissions and classroom demonstrations.

---

## 1. Introduction

JobConnect is a modern, LinkedIn/Naukri/Indeed-inspired job platform that lets:

- **Candidates** browse jobs, apply, save bookmarks, build resumes, and manage their profile.
- **Employers** post jobs, review applicants, shortlist candidates, and view application analytics.

Everything runs entirely in the browser using nothing but web fundamentals.

## 2. Objectives

- Demonstrate a real-world, multi-role web application built with pure web fundamentals.
- Practise clean separation of concerns (HTML structure / CSS design system / JS modules).
- Showcase advanced UI/UX: glassmorphism, dark mode, animations, dashboards, canvas charts.
- Deliver an evaluator-friendly, viva-ready codebase.

## 3. Technologies Used

| Layer            | Technology                    |
| ---------------- | ----------------------------- |
| Structure        | HTML5 semantic elements       |
| Styling          | CSS3 (variables, grid, flex, glassmorphism, animations) |
| Behaviour        | JavaScript ES6+ modules       |
| Data             | Browser `localStorage` (JSON) |
| Charts           | HTML5 Canvas API (custom)     |
| Fonts            | Google Fonts (Inter, Sora)    |

No React, Angular, Vue, Bootstrap, jQuery or backend frameworks.

## 4. Features

### Home
- Animated hero with search
- Live counters (jobs / companies / candidates / employers)
- Featured jobs, top companies, categories, testimonials, CTA

### Authentication
- Multi-step registration with real-time validation, password strength meter
- Login with "Remember me" and show/hide password
- Role selection (Candidate / Employer)
- One-click **demo login** buttons for evaluators
- Duplicate email prevention, email/mobile validation

### Job Search & Filtering
- Full-text search (title, company, skills), debounced input
- Filters: employment type, experience, salary bucket, category
- Sorting: latest, highest salary, most popular
- Company / location deep links via URL params

### Job Details
- Rich detail view: description, requirements, skills, benefits
- Apply modal with resume upload (base64), portfolio, cover letter
- Save / share job (copy link)
- Similar-jobs sidebar, view counter, applicant count

### Candidate Dashboard
- Stat cards: applications, saved, profile %, matches
- Canvas-based **donut chart** (application status)
- Canvas-based **bar chart** (applications over 6 weeks)
- Profile completion progress bar
- Skill-based **job recommendations**
- **Recently viewed** jobs

### Employer Dashboard
- Stat cards: total jobs, active jobs, applications, shortlisted
- Applications-per-job bar chart, status donut chart
- Job CRUD (create / edit / delete)
- Applicant review modal with Shortlist / Select / Reject actions
- Company logo upload (base64)

### Resume Builder
- Three templates: **Classic**, **Modern**, **Minimal**
- Live side-by-side preview
- Photo upload
- Repeating sections (education, experience, projects, certifications)
- Auto-save draft to localStorage
- Print & downloadable HTML resume (opens in print dialog)

### Profile
- Edit personal info, skills, avatar
- **Export profile as JSON**, **Import profile from JSON**
- Profile completion progress feedback

### System
- **Dark / light mode** with saved preference and smooth transitions
- Toast notification system (success / error / warning / info)
- Global modal system
- Scroll progress bar + back-to-top button
- Reveal-on-scroll animations (IntersectionObserver)
- Skeleton loaders, empty states, loading spinners
- Company rating system (average stars)
- **Reset demo data** hotkey: `Shift + Alt + R`

### Content Pages
- About, Contact (with working form), FAQ (accordion), Privacy, Terms
- Custom 404 page

## 5. Folder Structure

```
public/portal/
├── index.html                  Home / landing
├── login.html                  Sign in
├── register.html               Multi-step registration
├── jobs.html                   Job list + filters
├── job-details.html            Single job view
├── candidate-dashboard.html    Candidate overview + charts
├── employer-dashboard.html     Employer overview + charts
├── profile.html                Edit profile / import-export
├── resume-builder.html         Resume builder (3 templates)
├── saved-jobs.html             Bookmarked jobs
├── applications.html           My applications
├── about.html                  About page
├── contact.html                Contact page
├── faq.html                    FAQ
├── privacy.html                Privacy policy
├── terms.html                  Terms of service
├── 404.html                    Custom 404
│
├── css/
│   ├── style.css               Global design system
│   ├── dashboard.css           Dashboards, jobs, resume
│   ├── auth.css                Login / register
│   └── responsive.css          Mobile-first breakpoints
│
└── js/
    ├── app.js                  Chrome (nav/footer), home, bootstrap
    ├── auth.js                 Login + multi-step register
    ├── jobs.js                 List / filter / detail / apply / save
    ├── employer.js             Employer dashboard + job CRUD
    ├── candidate.js            Candidate dashboard + Canvas charts
    ├── resume.js               Resume builder + templates
    ├── storage.js              LocalStorage "DB" + demo seed
    └── utils.js                Toast, modal, theme, helpers
```

## 6. LocalStorage Data Model

| Key                    | Shape                                                            |
| ---------------------- | ---------------------------------------------------------------- |
| `jc_users`             | `[{ id, name, email, mobile, password, role, ... }]`             |
| `jc_jobs`              | `[{ id, title, company, salaryMin/Max, skills[], ... }]`         |
| `jc_applications`      | `[{ id, jobId, candidateId, status, coverLetter, ... }]`         |
| `jc_savedJobs`         | `{ [candidateId]: [jobId, ...] }`                                |
| `jc_notifications`     | `{ [userId]: [{ id, msg, type, ts, read }] }`                    |
| `jc_recentlyViewed`    | `{ [userId]: [jobId, ...] }`                                     |
| `jc_companyRatings`    | `{ [company]: { total, count } }`                                |
| `jc_currentUser`       | Currently signed-in user object                                  |
| `jc_theme`             | `"light" \| "dark"`                                              |
| `jc_resume_draft`      | Resume builder state                                             |

## 7. Demo Data (auto-seeded on first load)

- **20 companies** across 13 industries
- **55 jobs** with realistic titles, salaries, skills, deadlines
- **10 candidate accounts** + **5 employer accounts**
- **18 sample applications** in mixed statuses
- **Company ratings** for all companies

### Demo credentials

| Role      | Email                                | Password    |
| --------- | ------------------------------------ | ----------- |
| Candidate | `aarav.sharma@mail.com`              | `demo1234`  |
| Employer  | `hr1@novatechlabs.com`               | `demo1234`  |

Or use the **Demo login** buttons on the login page.

## 8. System Requirements

- Any modern browser (Chrome, Edge, Firefox, Safari)
- No server, no build step — just open `index.html`
- Ideal viewport: 320px → 1920px (fully responsive)

## 9. How to Run

Option 1 — direct:
```
Open public/portal/index.html in any modern browser.
```

Option 2 — any static server (recommended, so ES modules load cleanly):
```
npx serve public/portal
# or
python3 -m http.server -d public/portal
```

## 10. Future Enhancements

1. Real backend with REST API + JWT auth
2. Cloud database (PostgreSQL / MongoDB)
3. Real file storage for resumes (S3 / Cloudinary)
4. Push notifications & email alerts (real SMTP)
5. AI-powered resume scoring & job matching
6. Video-interview scheduling
7. Salary insights per role & location
8. Two-factor authentication
9. Multi-language (i18n) support
10. Progressive Web App (offline install)

## 11. Viva-Ready Notes

**Q: Why LocalStorage?**
A: The project brief mandates a frontend-only implementation. LocalStorage gives us key-value JSON persistence across sessions without a backend.

**Q: How is state kept in sync across pages?**
A: Every page reads/writes the same localStorage keys through the `storage.js` module, so navigating between pages always shows the latest data.

**Q: How does the dashboard render charts without a library?**
A: `candidate.js` exports `drawBarChart` and `drawDonutChart` that use the HTML5 Canvas API directly. High-DPI scaling is handled via `devicePixelRatio`.

**Q: How is XSS prevented?**
A: All user-supplied strings are passed through the `esc()` helper in `utils.js`, which HTML-escapes `& < > " '` before insertion.

**Q: What if a user clears browser storage?**
A: The app detects a missing seed flag on next load and repopulates all demo data automatically. Users can also press `Shift+Alt+R` to reset manually.

**Q: Is it responsive?**
A: `responsive.css` targets 1024px, 768px, and 480px breakpoints. Every dashboard collapses to a single column on mobile, and the nav becomes a slide-down drawer.

## 12. Conclusion

JobConnect demonstrates that a rich, multi-role product experience — filtering, dashboards, charts, a resume builder, dark mode, and animations — can be delivered with nothing more than HTML, CSS, and Vanilla JavaScript. The codebase is modular, commented, and organised for easy walkthrough during evaluation.

Built with 💙 for MCA mini-project submission.
