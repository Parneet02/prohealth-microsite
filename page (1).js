'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PROGRAMS, SERVICE_TO_KEY, getProgramByService } from '@/lib/programs';

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
  const nameRef = useRef(null);
  const modalRef = useRef(null);

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

      {/* ---------- Banner ---------- */}
      <section className={`view ${view === 'banner' ? 'active' : ''}`}>
        <div className="banner-wrap">
          <div
            className="banner"
            role="button"
            tabIndex={0}
            aria-label="Explore ProHealth programs"
            onClick={goPrograms}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goPrograms();
              }
            }}
          >
            <div className="banner-inner">
              <span className="eyebrow">HCL Healthcare Care Plan · ProHealth Programs</span>
              <h1>
                Be <span className="hl">proactive</span>
                <br />
                about your health
              </h1>
              <p className="sub">
                Personalized diagnostics, nutrition and lab tracking. Pick the ProHealth program
                built around your goals.
              </p>
              <button
                className="banner-cta"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrograms();
                }}
              >
                Explore Programs
                <Icon path="M5 12h14M13 6l6 6-6 6" width={2.4} />
              </button>
              <div className="banner-hint">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 3l1.5 4.5L15 9l-4.5 1.5L9 15l-1.5-4.5L3 9l4.5-1.5L9 3zm9 8l.9 2.6L21.5 15l-2.6.9L18 18.5l-.9-2.6L14.5 15l2.6-.9L18 11z" />
                </svg>
                Tap the banner to get started
              </div>
            </div>
            <div className="banner-art" aria-hidden="true">
              <div className="orb a" />
              <div className="orb b" />
              <div className="orb c" />
              <div className="dots" />
              <div className="pulse-ring">
                <svg
                  viewBox="0 0 220 90"
                  fill="none"
                  stroke="rgba(255,255,255,.9)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 46h44l12-30 20 62 16-40 12 20h96" />
                </svg>
              </div>
            </div>
          </div>
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
    </>
  );
}
