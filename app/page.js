'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PROGRAMS, SERVICE_TO_KEY, getProgramByService } from '@/lib/programs';

/** Two rotating slides for the home-style banner. Add a slide here to extend the carousel. */
const BANNER_SLIDES = [
  {
    key: 'overview',
    eyebrow: 'HCL Healthcare Care Plan · ProHealth Programs',
    title: 'Be proactive about your health',
    cta: 'Register Your Interest!',
    sub: 'Take the first steps towards a healthier you',
    icon: 'M12 21s-7-4.35-9.33-9.02C1.06 8.9 2.7 5.5 6.1 5.5c2 0 3.2 1.1 3.9 2.2C10.7 6.6 11.9 5.5 13.9 5.5c3.4 0 5.04 3.4 3.43 6.48C19 16.65 12 21 12 21Z',
  },
  {
    key: 'plus-highlight',
    eyebrow: 'ProHealth Plus · 6 Month Plan',
    title: 'Diagnostics, dietitian and fitness in one plan',
    cta: 'Register Your Interest!',
    sub: 'Stay ahead of your health with proactive, on-demand care',
    icon: 'M12 2C9 6 6 8 6 13a6 6 0 0 0 12 0c0-5-3-7-6-11Z',
  },
];

/** Static, non-functional icon row matching the app home page's wellness shortcuts. */
const WELLNESS_ITEMS = [
  { label: 'Book Health Check', icon: 'M9 12h6M9 16h4M8 3v3M16 3v3M4 8h16M6 3h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z' },
  { label: 'Lab Tests', icon: 'M9 2h6M10 2v6.5L5.5 17A3 3 0 0 0 8 21.5h8a3 3 0 0 0 2.5-4.5L14 8.5V2' },
  { label: 'Pharmacy', icon: 'M4 21V9l8-6 8 6v12M9 21v-6h6v6' },
  { label: 'Gym', icon: 'M4 8v8M20 8v8M7 12h10M2 12h2M20 12h2' },
  { label: 'In-clinic Consult', icon: 'M12 21s-7-4.35-9.33-9.02C1.06 8.9 2.7 5.5 6.1 5.5c2 0 3.2 1.1 3.9 2.2C10.7 6.6 11.9 5.5 13.9 5.5c3.4 0 5.04 3.4 3.43 6.48C19 16.65 12 21 12 21Z' },
];

const BLANK_FORM = {
  fullName: '',
  mobile: '',
  empId: '',
  email: '',
  location: '',
  service: '',
  company: '', // honeypot
};

/** Fire and forget funnel counters. A failed beacon must never surface to the user. */
function track(type, programKey) {
  try {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, programKey }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

function Icon({ path, size = 20, width = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

export default function Page() {
  const [view, setView] = useState('banner');
  const [theme, setTheme] = useState(null);
  const [viewerKey, setViewerKey] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null); // { service, key, leadId }
  const [tab, setTab] = useState('view');
  const [activeSlide, setActiveSlide] = useState(0);
  const nameRef = useRef(null);
  const modalRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    track('page_view');
  }, []);

  /* Report height to the Habit Health app so the iframe can resize itself. */
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return;
    const post = () => {
      const height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      window.parent.postMessage({ type: 'prohealth:height', height }, '*');
    };
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.body);
    window.addEventListener('load', post);
    return () => {
      ro.disconnect();
      window.removeEventListener('load', post);
    };
  }, [view, formOpen, viewerKey, success]);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setSuccess(null);
    setServerError('');
    setErrors({});
    setForm(BLANK_FORM);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setViewerKey(null);
      closeForm();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeForm]);

  function toggleTheme() {
    const dark =
      theme != null
        ? theme === 'dark'
        : typeof window !== 'undefined' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  }

  function onTrackScroll() {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setActiveSlide(Math.min(BANNER_SLIDES.length - 1, Math.max(0, i)));
  }

  function goToSlide(i) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    setActiveSlide(i);
  }

  function goPrograms() {
    setView('programs');
    track('programs_view');
    window.scrollTo({ top: 0 });
  }

  function openForm(service) {
    setForm({ ...BLANK_FORM, service });
    setErrors({});
    setServerError('');
    setSuccess(null);
    setFormOpen(true);
    track('form_open', SERVICE_TO_KEY[service]);
    setTimeout(() => nameRef.current?.focus(), 60);
  }

  function openViewer(key) {
    setViewerKey(key);
    track('flyer_view', key);
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  }

  function validate(d) {
    const e = {};
    if (d.fullName.trim().length < 2) e.fullName = 'Please enter your full name.';
    if (!/^[6-9]\d{9}$/.test(d.mobile.replace(/\D/g, '')))
      e.mobile = 'Enter a valid 10 digit mobile number.';
    if (!d.empId.trim()) e.empId = 'Please enter your Employee ID.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()))
      e.email = 'Enter a valid email address.';
    if (!d.location.trim()) e.location = 'Please enter your location.';
    if (!d.service) e.service = 'Please choose a preferred service.';
    return e;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setServerError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, mobile: form.mobile.replace(/\D/g, '') }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        if (data.errors) setErrors(data.errors);
        setServerError(data.message || 'Something went wrong. Please try again.');
        return;
      }

      setSuccess({
        service: form.service,
        key: SERVICE_TO_KEY[form.service] || 'plus',
        leadId: data.id,
      });
      setTab('view');
      if (modalRef.current) modalRef.current.scrollTop = 0;
    } catch {
      setServerError('Network problem. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const successProgram = success ? getProgramByService(success.service) : null;
  const viewerProgram = viewerKey ? PROGRAMS.find((p) => p.key === viewerKey) : null;
  const formProgram = form.service ? getProgramByService(form.service) : null;
  const accentStyle = (p) =>
    p ? { '--accent': p.accent, '--accent-soft': p.soft } : undefined;

  return (
    <>
      {view === 'programs' && (
        <div className="topbar">
          <div className="brand">
            <span className="logo" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 21s-7-4.35-9.33-9.02C1.06 8.9 2.7 5.5 6.1 5.5c2 0 3.2 1.1 3.9 2.2C10.7 6.6 11.9 5.5 13.9 5.5c3.4 0 5.04 3.4 3.43 6.48C19 16.65 12 21 12 21Z"
                  fill="#fff"
                />
              </svg>
            </span>
            <span>
              ProHealth<small>HCL Healthcare</small>
            </span>
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle light or dark theme"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3a9 9 0 1 0 9 9c0-.46-.03-.9-.1-1.34A6 6 0 0 1 12 3Z" />
            </svg>
          </button>
        </div>
      )}

      {/* ---------- Home (banner) ---------- */}
      <section className={`view home-view ${view === 'banner' ? 'active' : ''}`}>
        <div className="home-header">
          <div className="brand">
            <span className="logo" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 21s-7-4.35-9.33-9.02C1.06 8.9 2.7 5.5 6.1 5.5c2 0 3.2 1.1 3.9 2.2C10.7 6.6 11.9 5.5 13.9 5.5c3.4 0 5.04 3.4 3.43 6.48C19 16.65 12 21 12 21Z"
                  fill="#fff"
                />
              </svg>
            </span>
            <span>
              ProHealth<small>HCL Healthcare</small>
            </span>
          </div>
          <div className="home-header-icons">
            <button
              className="hh-icon-btn"
              onClick={toggleTheme}
              aria-label="Toggle light or dark theme"
            >
              <Icon path="M12 3a9 9 0 1 0 9 9c0-.46-.03-.9-.1-1.34A6 6 0 0 1 12 3Z" size={18} />
            </button>
            <button className="hh-icon-btn" aria-label="Notifications" disabled>
              <Icon path="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" size={18} />
            </button>
            <button className="hh-icon-btn" aria-label="Cart" disabled>
              <Icon path="M6 6h15l-1.5 9h-12L4 3H2m6 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" size={18} />
            </button>
          </div>
        </div>

        <p className="home-greeting">
          Hi <b>there</b>
        </p>

        <div className="hh-banner-wrap">
          <div className="hh-track" ref={trackRef} onScroll={onTrackScroll}>
            {BANNER_SLIDES.map((slide) => (
              <div
                className="hh-slide"
                key={slide.key}
                role="button"
                tabIndex={0}
                aria-label={`${slide.title}. ${slide.cta}`}
                onClick={goPrograms}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    goPrograms();
                  }
                }}
              >
                <div className="hh-slide-text">
                  <span className="hh-eyebrow">{slide.eyebrow}</span>
                  <h1 className="hh-title">{slide.title}</h1>
                  <span className="hh-cta-line">{slide.cta}</span>
                  <p className="hh-sub">{slide.sub}</p>
                </div>
                <div className="hh-slide-art" aria-hidden="true">
                  <span className="hh-art-circle">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={slide.icon} />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="hh-dots">
            {BANNER_SLIDES.map((slide, i) => (
              <button
                key={slide.key}
                type="button"
                className={`hh-dot ${i === activeSlide ? 'active' : ''}`}
                aria-label={`Show slide ${i + 1}`}
                onClick={() => goToSlide(i)}
              />
            ))}
          </div>
        </div>

        <div className="wellness-row">
          {WELLNESS_ITEMS.map((item) => (
            <div className="wellness-item" key={item.label} aria-disabled="true">
              <span className="wellness-icon">
                <Icon path={item.icon} size={22} width={1.8} />
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="step-card" aria-hidden="true">
          <div className="step-card-top">
            <span className="step-sync">
              <Icon path="M4 4v6h6M20 20v-6h-6M4.5 15a8 8 0 0 0 13.9 3M19.5 9A8 8 0 0 0 5.6 6" size={14} width={2} />
              Last sync: just now
            </span>
            <span className="step-goal">
              <Icon path="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 14a4 4 0 1 1 4-4 4 4 0 0 1-4 4Z" size={14} width={1.8} />
              8,000 daily step goal
            </span>
          </div>
          <div className="step-count">2,602 steps</div>
          <div className="step-bar">
            <div className="step-bar-fill" style={{ width: '32%' }} />
          </div>
          <div className="step-scale">
            <span>0</span>
            <span>4k</span>
            <span>8k</span>
          </div>
          <button className="step-cta" disabled>
            Start a Challenge
          </button>
        </div>

        <div className="engage-card" aria-hidden="true">
          <h3>Engage yourself for a healthier you</h3>
          <p>Take charge of your wellbeing with programs built around your goals.</p>
        </div>
      </section>

      {/* ---------- Programs ---------- */}
      <section className={`view ${view === 'programs' ? 'active' : ''}`}>
        <div className="programs-head">
          <button className="back" onClick={() => setView('banner')}>
            <Icon path="M19 12H5M11 18l-6-6 6-6" size={18} width={2.4} />
            Back
          </button>
          <h2>Choose your ProHealth program</h2>
          <p className="lead">
            Premium, on-demand health programs from HCL Healthcare. Register in the one that fits
            you and download your flyer instantly.
          </p>
        </div>

        <div className="programs">
          {PROGRAMS.map((p) => (
            <article className="card" key={p.key} style={accentStyle(p)}>
              <div className="stripe" />
              <div className="card-body">
                <span className="pill">
                  <svg
                    className="ico"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  >
                    <path d={p.icon} />
                  </svg>
                  {p.name}
                </span>
                <h3>{p.name}</h3>
                <div className="tagline">{p.tagline}</div>
                <div className="price-badge">
                  <span className="pd">Plan duration {p.duration}</span>
                  <span className="pp">
                    <s>{p.mrp}</s> <b>{p.price}</b>
                  </span>
                </div>
                <p className="desc">{p.desc}</p>
                <div className="chips">
                  {p.chips.map((c) => (
                    <span className="chip" key={c}>
                      {c}
                    </span>
                  ))}
                </div>
                <div className="card-actions">
                  <button className="btn btn-primary" onClick={() => openForm(p.service)}>
                    Register Now
                  </button>
                  <button className="btn btn-ghost" onClick={() => openViewer(p.key)}>
                    View Flyer
                  </button>
                </div>
              </div>
              <div className="card-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previews[0]} alt={`${p.name} flyer`} loading="lazy" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <div className="foot">
          <span>© HCL Healthcare · ProHealth Programs. Making Corporate India Healthier.</span>
          <span>Care team: +91 9599105133 · careplan@hclhealthcare.in</span>
        </div>
      </footer>

      {/* ---------- Flyer preview ---------- */}
      <div
        className={`overlay ${viewerProgram ? 'open' : ''}`}
        aria-hidden={!viewerProgram}
        onClick={(e) => {
          if (e.target === e.currentTarget) setViewerKey(null);
        }}
      >
        {viewerProgram && (
          <div className="modal viewer" role="dialog" aria-modal="true" style={accentStyle(viewerProgram)}>
            <div className="modal-head">
              <div>
                <span className="badge">{viewerProgram.name}</span>
                <div className="mtitle">{viewerProgram.name} flyer</div>
                <div className="msub">Preview only. Register to download the PDF.</div>
              </div>
              <button className="x" onClick={() => setViewerKey(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="viewer-body">
              {viewerProgram.previews.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt={`${viewerProgram.name} flyer page ${i + 1}`} />
              ))}
              <button
                className="btn btn-primary vfull"
                onClick={() => {
                  const service = viewerProgram.service;
                  setViewerKey(null);
                  openForm(service);
                }}
              >
                Register to download this flyer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Registration ---------- */}
      <div
        className={`overlay ${formOpen ? 'open' : ''}`}
        aria-hidden={!formOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeForm();
        }}
      >
        {formOpen && (
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            ref={modalRef}
            style={accentStyle(success ? successProgram : formProgram)}
          >
            <div className="modal-head">
              <div>
                <span className="badge">{form.service || 'ProHealth'}</span>
                <div className="mtitle">Register Now</div>
                <div className="msub">Fill in your details to register and get your flyer.</div>
              </div>
              <button className="x" onClick={closeForm} aria-label="Close">
                ✕
              </button>
            </div>

            {!success && (
              <form onSubmit={onSubmit} noValidate>
                {serverError && <div className="form-error">{serverError}</div>}

                <div className={`field ${errors.fullName ? 'invalid' : ''}`}>
                  <label htmlFor="fullName">
                    Full Name <span className="req">*</span>
                  </label>
                  <input
                    id="fullName"
                    ref={nameRef}
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Anjali Sharma"
                    value={form.fullName}
                    onChange={(e) => update('fullName', e.target.value)}
                  />
                  <span className="err">{errors.fullName}</span>
                </div>

                <div className="two">
                  <div className={`field ${errors.mobile ? 'invalid' : ''}`}>
                    <label htmlFor="mobile">
                      Mobile Number <span className="req">*</span>
                    </label>
                    <input
                      id="mobile"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="10 digit number"
                      maxLength={10}
                      value={form.mobile}
                      onChange={(e) => update('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                    <span className="err">{errors.mobile}</span>
                  </div>
                  <div className={`field ${errors.empId ? 'invalid' : ''}`}>
                    <label htmlFor="empId">
                      Employee ID <span className="req">*</span>
                    </label>
                    <input
                      id="empId"
                      type="text"
                      placeholder="e.g. HCL123456"
                      value={form.empId}
                      onChange={(e) => update('empId', e.target.value)}
                    />
                    <span className="err">{errors.empId}</span>
                  </div>
                </div>

                <div className={`field ${errors.email ? 'invalid' : ''}`}>
                  <label htmlFor="email">
                    Email ID <span className="req">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                  />
                  <span className="err">{errors.email}</span>
                </div>

                <div className="two">
                  <div className={`field ${errors.location ? 'invalid' : ''}`}>
                    <label htmlFor="location">
                      Location <span className="req">*</span>
                    </label>
                    <input
                      id="location"
                      type="text"
                      autoComplete="address-level2"
                      placeholder="e.g. Noida"
                      value={form.location}
                      onChange={(e) => update('location', e.target.value)}
                    />
                    <span className="err">{errors.location}</span>
                  </div>
                  <div className={`field ${errors.service ? 'invalid' : ''}`}>
                    <label htmlFor="service">
                      Preferred Service <span className="req">*</span>
                    </label>
                    <select
                      id="service"
                      value={form.service}
                      onChange={(e) => update('service', e.target.value)}
                    >
                      <option value="">Select a program</option>
                      {PROGRAMS.map((p) => (
                        <option key={p.key} value={p.service}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <span className="err">{errors.service}</span>
                  </div>
                </div>

                {/* Honeypot. Hidden from people, irresistible to bots. */}
                <input
                  className="hp"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={form.company}
                  onChange={(e) => update('company', e.target.value)}
                />

                <button className="submit" type="submit" disabled={submitting}>
                  {submitting && <span className="spinner" aria-hidden="true" />}
                  {submitting ? 'Registering' : 'Register and get my flyer'}
                </button>
                <p className="consent">
                  By registering you agree that HCL Healthcare may contact you about your selected
                  ProHealth program.
                </p>
              </form>
            )}

            {success && successProgram && (
              <div className="success show">
                <div className="check">
                  <Icon path="M20 6 9 17l-5-5" size={34} width={2.6} />
                </div>
                <h3>Thank you for sharing your interest!</h3>
                <p className="stext">
                  Our team will reach out to you about {success.service} within 48 working hours.
                  You can view or download your flyer below.
                </p>
                <div className="flyer-tabs">
                  <button
                    className={tab === 'view' ? 'active' : ''}
                    onClick={() => setTab('view')}
                  >
                    View flyer
                  </button>
                  <button
                    className={tab === 'download' ? 'active' : ''}
                    onClick={() => setTab('download')}
                  >
                    Download flyer
                  </button>
                </div>

                {tab === 'view' && (
                  <div className="flyer-panel">
                    {successProgram.previews.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src}
                        src={src}
                        alt={`${successProgram.name} flyer page ${i + 1}`}
                        style={i ? { marginTop: 12 } : undefined}
                      />
                    ))}
                  </div>
                )}

                {tab === 'download' && (
                  <div className="flyer-panel dl-row">
                    <a
                      className="dl-btn"
                      href={`/api/brochure/${successProgram.key}?lead=${success.leadId}`}
                      download={successProgram.downloadName}
                      target="_blank"
                      rel="noopener"
                    >
                      <Icon path="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" width={2.2} />
                      Download PDF flyer
                    </a>
                    <p className="note">
                      Saves the full resolution flyer for {successProgram.name}. Your download is
                      logged so the care team knows you have the details.
                    </p>
                  </div>
                )}

                <button className="done" onClick={closeForm}>
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {view === 'banner' && (
        <nav className="bottom-nav" aria-hidden="true">
          <div className="bn-item active">
            <Icon path="M4 11.5 12 4l8 7.5V21a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z" size={20} />
            <span>Home</span>
          </div>
          <div className="bn-item">
            <Icon path="M8 5v14l11-7Z" size={20} />
            <span>Play</span>
          </div>
          <div className="bn-item">
            <Icon path="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2c-4 0-8 2-8 5v2h16v-2c0-3-4-5-8-5Z" size={20} />
            <span>Profile</span>
          </div>
          <div className="bn-item">
            <Icon path="M4 6h16M4 12h16M4 18h16" size={20} />
            <span>Menu</span>
          </div>
          <div className="bn-benefits">
            <Icon path="M12 21s-7-4.35-9.33-9.02C1.06 8.9 2.7 5.5 6.1 5.5c2 0 3.2 1.1 3.9 2.2C10.7 6.6 11.9 5.5 13.9 5.5c3.4 0 5.04 3.4 3.43 6.48C19 16.65 12 21 12 21Z" size={16} />
            My Benefits
          </div>
        </nav>
      )}
    </>
  );
}
