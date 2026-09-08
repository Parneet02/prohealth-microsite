'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PROGRAMS, SERVICE_TO_KEY, getProgramByService } from '@/lib/programs';

/** Two rotating slides for the home-style banner. Add a slide here to extend the carousel. */
const inr = (n) => `₹${n.toLocaleString('en-IN')}`;

/* Every figure below is derived from lib/programs.js — the single source of
   truth for pricing — so the banner can never drift from the plan cards. */
const PLUS = PROGRAMS.find((p) => p.key === 'plus');
const CHEAPEST = PROGRAMS.reduce((a, b) => (b.priceValue < a.priceValue ? b : a));
const BEST_SAVING = Math.max(
  ...PROGRAMS.map((p) => Math.round(((p.mrpValue - p.priceValue) / p.mrpValue) * 100))
);

const BANNER_SLIDES = [
  {
    key: 'overview',
    eyebrow: 'ProHealth Care Plans',
    title: 'Diagnostics, diet and fitness in one plan',
    // "6 months" -> "6 month" so it reads as an adjective before "plans".
    sub: `${CHEAPEST.duration.replace(/s$/, '')} plans from ${inr(CHEAPEST.priceValue)} · Save up to ${BEST_SAVING}%`,
    cta: 'Explore Plans',
    action: 'programs',
  },
  {
    key: 'plus-highlight',
    eyebrow: `${PLUS.name} · ${PLUS.duration}`,
    title: '3 lab panels, 3 doctor consults, 2 diet consults',
    sub: `${inr(PLUS.priceValue)} instead of ${inr(PLUS.mrpValue)}`,
    cta: 'Register Now',
    action: 'register-plus',
  },
];

/** Static, non-functional icon row matching the app home page's wellness shortcuts. */
const WELLNESS_ITEMS = [
  { label: 'Book Health Check', icon: 'M9 12h6M9 16h4M8 3v3M16 3v3M4 8h16M6 3h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z' },
  { label: 'Lab Tests', icon: 'M9 2h6M10 2v6.5L5.5 17A3 3 0 0 0 8 21.5h8a3 3 0 0 0 2.5-4.5L14 8.5V2' },
  { label: 'Pharmacy', icon: 'M4 21V9l8-6 8 6v12M9 21v-6h6v6' },
  { label: 'Gym', icon: 'M4 8v8M20 8v8M7 12h10M2 12h2M20 12h2', highlight: true },
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

/**
 * Habit Health lockup — "HABIT" in a heavy royal-blue serif with the "A"
 * replaced by a stylised yoga figure in an orange→coral gradient, "HEALTH"
 * tracked wide below. Ported from the ForHer repo's HabitHealthLogo so the
 * two surfaces render the same mark.
 */
function HabitHealthLogo({ id = 'a' }) {
  // The gradient id must be unique per instance — the lockup renders on more
  // than one screen, and a duplicated id makes the fill reference resolve to
  // the wrong (or a hidden) node, leaving the figure unpainted.
  const grad = `habit-figure-${id}`;
  return (
    <div className="hhl">
      <div className="hhl-word">
        <span className="hhl-letter">H</span>
        <svg className="hhl-figure" viewBox="0 0 100 120" aria-hidden="true">
          <defs>
            <linearGradient id={grad} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#F5A623" />
              <stop offset="60%" stopColor="#F08144" />
              <stop offset="100%" stopColor="#E94B3F" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="16" r="10" fill={`url(#${grad})`} />
          <path d="M 50 28 C 42 46, 32 78, 18 112 L 34 112 C 42 88, 48 68, 56 50 Z" fill={`url(#${grad})`} />
          <path d="M 56 50 C 64 68, 70 88, 82 112 L 98 112 C 84 78, 74 46, 66 28 C 60 26, 55 26, 50 28 Z" fill={`url(#${grad})`} />
          <rect x="36" y="78" width="32" height="7" rx="2.5" fill={`url(#${grad})`} />
        </svg>
        <span className="hhl-letter">B</span>
        <span className="hhl-letter">I</span>
        <span className="hhl-letter">T</span>
      </div>
      <div className="hhl-sub">HEALTH</div>
    </div>
  );
}

/** Original flat-illustration graphics (hand-built shapes, not stock photography)
 * standing in for the host app's real photos on this screen. */
function ConsultIllustration() {
  return (
    <svg
      viewBox="0 0 200 150"
      className="hh-illo"
      /* Anchored to the card's bottom-right so it bleeds off those edges.
         "meet" not "slice": this is a sparse placeholder, and slicing crops
         mid-figure. Swap to slice once the real lifestyle photo lands. */
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <rect x="6" y="118" width="188" height="8" rx="4" fill="var(--hab-ground, #CFEAD1)" opacity=".6" />
      <rect x="14" y="78" width="52" height="42" rx="12" fill="#8FB6DE" />
      <circle cx="40" cy="60" r="17" fill="#F2C9A0" />
      <rect x="30" y="98" width="20" height="26" rx="8" fill="#5B7A9A" />
      <rect x="118" y="46" width="46" height="76" rx="16" fill="#FFFFFF" stroke="#E3E7EC" strokeWidth="2" />
      <circle cx="141" cy="34" r="16" fill="#F2C9A0" />
      <rect x="96" y="72" width="30" height="9" rx="4.5" fill="#F2C9A0" transform="rotate(-18 96 72)" />
      <rect x="90" y="66" width="16" height="6" rx="3" fill="var(--hab-orange, #F0862A)" transform="rotate(-18 90 66)" />
    </svg>
  );
}

function HighFiveIllustration() {
  return (
    <svg viewBox="0 0 140 90" className="engage-illo" aria-hidden="true">
      <circle cx="34" cy="30" r="14" fill="#FFE0B2" />
      <rect x="18" y="46" width="32" height="38" rx="12" fill="#FFFFFF" opacity=".92" />
      <path d="M46 52 62 38" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" opacity=".92" />
      <circle cx="106" cy="28" r="14" fill="#D7C4A3" />
      <rect x="90" y="44" width="32" height="38" rx="12" fill="#FFFFFF" opacity=".8" />
      <path d="M94 50 78 36" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" opacity=".8" />
      <circle cx="70" cy="34" r="7" fill="#FFFFFF" opacity=".95" />
    </svg>
  );
}

export default function Page() {
  const [view, setView] = useState('banner');
  const [viewerKey, setViewerKey] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null); // { service, key, leadId }
  const [tab, setTab] = useState('none');
  const [activeSlide, setActiveSlide] = useState(0);
  const nameRef = useRef(null);
  const modalRef = useRef(null);
  const trackRef = useRef(null);

  /* The host app draws its own header and bottom tab bar around this page, so
     the replica chrome below would double up. Hidden when embedded (in a frame,
     or ?embed=1 for a plain webview, which is not framed); shown standalone so
     the page still demos as the full home screen. */
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    track('page_view');
    if (typeof window === 'undefined') return;
    const forced = new URLSearchParams(window.location.search).get('embed');
    if (forced === '1') setEmbedded(true);
    else if (forced === '0') setEmbedded(false);
    else setEmbedded(window.parent !== window);
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
      setTab('none');
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
    p
      ? { '--accent': p.accent, '--accent-soft': p.soft, '--banner-ratio': p.bannerRatio, '--banner-top': p.bannerTop }
      : undefined;

  return (
    <>
      {/* ---------- Home (banner) ---------- */}
      <section className={`view home-view ${view === 'banner' ? 'active' : ''}`}>
        <div className="home-header" hidden={embedded}>
          <HabitHealthLogo />
          <div className="home-header-icons">
            <button className="hh-icon-btn hh-badge" aria-label="Habit Cares" disabled>
              HC
            </button>
            <button className="hh-icon-btn" aria-label="Wallet" disabled>
              <Icon path="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-4M3 7l4-3h9M15 15h4v-4h-4a2 2 0 0 0 0 4Z" size={18} />
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
                /* Redundant affordance so the whole card stays tappable; the
                   button below carries the accessible semantics. */
                onClick={() =>
                  slide.action === 'register-plus' ? openForm(PLUS.service) : goPrograms()
                }
              >
                <div className="hh-slide-art" aria-hidden="true">
                  <ConsultIllustration />
                </div>
                <div className="hh-slide-text">
                  <span className="hh-eyebrow">{slide.eyebrow}</span>
                  <h1 className="hh-title">{slide.title}</h1>
                  <p className="hh-sub">{slide.sub}</p>
                  <button
                    type="button"
                    className="hh-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (slide.action === 'register-plus') openForm(PLUS.service);
                      else goPrograms();
                    }}
                  >
                    {slide.cta}
                  </button>
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

        <h2 className="section-head">Extensive Range Of Wellness Test</h2>
        <div className="wellness-row">
          {WELLNESS_ITEMS.map((item) => (
            <div className="wellness-item" key={item.label} aria-disabled="true">
              <span className={`wellness-icon${item.highlight ? ' highlight' : ''}`}>
                <Icon path={item.icon} size={22} width={1.8} />
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="step-card" aria-hidden="true">
          <div className="step-card-head">
            <span className="step-sync">
              <Icon path="M4 4v6h6M20 20v-6h-6M4.5 15a8 8 0 0 0 13.9 3M19.5 9A8 8 0 0 0 5.6 6" size={13} width={2.25} />
              Last sync: Just now
            </span>
            <span className="step-goal">
              <span className="step-goal-ic">
                <Icon path="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 14a4 4 0 1 1 4-4 4 4 0 0 1-4 4Z" size={16} width={2} />
              </span>
              <span>
                <b>8,000</b>
                <small>Daily Step Goal</small>
              </span>
            </span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="step-scene-img" src="/home/park-scene.png" alt="" />
          <button className="step-cta" disabled>
            <Icon path="M12 2 4 14h6l-1 8 9-13h-6l1-7Z" size={16} width={1.8} />
            Start a Challenge
          </button>
        </div>

        <div className="engage-card" aria-hidden="true">
          <HighFiveIllustration />
          <div className="engage-card-text">
            <h3>
              Engage yourself
              <br />
              for a healthier you.
            </h3>
            <p>Take charge of your wellbeing with programs built around your goals.</p>
          </div>
          <div className="engage-stat-chip">
            <span className="engage-stat-label">StepUp Showdown</span>
            <span className="engage-stat-row">
              <Icon path="M12 21s-7-4.35-9.33-9.02C1.06 8.9 2.7 5.5 6.1 5.5c2 0 3.2 1.1 3.9 2.2C10.7 6.6 11.9 5.5 13.9 5.5c3.4 0 5.04 3.4 3.43 6.48C19 16.65 12 21 12 21Z" size={11} width={2} />
              2900m · 231kcal
            </span>
          </div>
          <span className="engage-badge">
            <Icon path="M20 6 9 17l-5-5" size={13} width={2.6} />
          </span>
          <span className="engage-chevron">
            <Icon path="M9 6l6 6-6 6" size={20} width={2.4} />
          </span>
        </div>
      </section>

      {/* ---------- Programs ---------- */}
      <section className={`view programs-view ${view === 'programs' ? 'active' : ''}`}>
        <div className="sub-header">
          <button className="sub-back" onClick={() => setView('banner')} aria-label="Back">
            <Icon path="M19 12H5M11 18l-6-6 6-6" size={20} width={2} />
          </button>
          <HabitHealthLogo id="programs" />
          <span className="sub-spacer" />
        </div>

        <div className="programs-head">
          <h2>Care Plans</h2>
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
                {/* No icon chip: the banner above already carries the brand
                    mark, so it was a third repetition of the same identity. */}
                <div className="card-head">
                  <div className="card-head-text">
                    <h3>{p.name}</h3>
                    <div className="tagline">{p.tagline}</div>
                  </div>
                </div>
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
                  <button className="flyer-link" onClick={() => openViewer(p.key)}>
                    View flyer
                  </button>
                </div>
              </div>
              {/* Square thumbnail, tappable. The source art is 1:1, so the old
                  full-width contain box letterboxed it with ~80px of white
                  either side. */}
              <button
                type="button"
                className="card-media"
                onClick={() => openViewer(p.key)}
                aria-label={`View the ${p.name} flyer`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previews[0]} alt="" loading="lazy" />
              </button>
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
            {/* No badge here: it repeated the title verbatim, and the header
                was eating ~330px before any flyer showed. */}
            <div className="modal-head">
              <div>
                <div className="mtitle">{viewerProgram.name} flyer</div>
                <div className="msub">Preview only — register to download the PDF.</div>
              </div>
              <button className="x" onClick={() => setViewerKey(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="viewer-body">
              {viewerProgram.previews.map((src, i) => (
                <figure className="viewer-page" key={src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${viewerProgram.name} flyer page ${i + 1}`} />
                  <figcaption>
                    Page {i + 1} of {viewerProgram.previews.length}
                  </figcaption>
                </figure>
              ))}
            </div>
            {/* Sticky: the CTA sat under ~1200px of flyer images, so it could
                only be reached by scrolling both pages. */}
            <div className="viewer-cta">
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
                <div className="mtitle">{success ? 'You’re registered' : 'Register Now'}</div>
                <div className="msub">
                  {success
                    ? 'Your flyer is ready to download.'
                    : 'Fill in your details to register and get your flyer.'}
                </div>
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
                {/* Download is the point of this screen, so it is the primary
                    button rather than one of two equal-weight tabs. The preview
                    stays collapsed so "Done" is reachable without scrolling. */}
                <div className="success-actions">
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
                  <button
                    type="button"
                    className="flyer-toggle"
                    aria-expanded={tab === 'view'}
                    onClick={() => setTab(tab === 'view' ? 'none' : 'view')}
                  >
                    {tab === 'view' ? 'Hide flyer' : 'View flyer'}
                    <Icon
                      path={tab === 'view' ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                      size={16}
                      width={2.2}
                    />
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
              </div>
            )}
          </div>
        )}
      </div>

      {view === 'banner' && !embedded && (
        <nav className="bottom-nav" aria-hidden="true">
          <div className="bn-bar">
            <div className="bn-item active">
              <span className="bn-ic">
                <Icon path="M4 11.5 12 4l8 7.5V21a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z" size={20} width={1.75} />
              </span>
              <span className="bn-l">Home</span>
            </div>
            <div className="bn-item">
              <span className="bn-ic">
                <Icon path="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Zm0 5a4 4 0 1 0 4 4 4 4 0 0 0-4-4Zm0 3a1 1 0 1 0 1 1 1 1 0 0 0-1-1Z" size={20} width={1.75} />
              </span>
              <span className="bn-l">Play</span>
            </div>
            <div className="bn-item">
              <span className="bn-ic">
                <Icon path="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5Z" size={20} width={1.75} />
              </span>
              <span className="bn-l">Profile</span>
            </div>
            <div className="bn-item">
              <span className="bn-ic">
                <Icon path="M4 7h16M4 12h16M4 17h16" size={20} width={1.75} />
              </span>
              <span className="bn-l">Menu</span>
            </div>
          </div>
          <div className="bn-benefits">
            <Icon path="M12 5v14M5 12h14" size={18} width={2} />
            <span>My Benefits</span>
          </div>
        </nav>
      )}
    </>
  );
}
