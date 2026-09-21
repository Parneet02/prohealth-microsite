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
  company: '',
};

function track(type, programKey) {
  try {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, programKey }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
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

function HabitHealthLogo({ id = 'a' }) {
  const grad = `habit-figure-${id}`;

  return (
    <div className="hhl">
      <div className="hhl-word">
        <span className="hhl-letter">H</span>

        <svg
          className="hhl-figure"
          viewBox="0 0 100 120"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={grad}
              x1="50%"
              y1="0%"
              x2="50%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#F5A623" />
              <stop offset="60%" stopColor="#F08144" />
              <stop offset="100%" stopColor="#E94B3F" />
            </linearGradient>
          </defs>

          <circle
            cx="50"
            cy="16"
            r="10"
            fill={`url(#${grad})`}
          />

          <path
            d="M 50 28 C 42 46, 32 78, 18 112 L 34 112 C 42 88, 48 68, 56 50 Z"
            fill={`url(#${grad})`}
          />

          <path
            d="M 56 50 C 64 68, 70 88, 82 112 L 98 112 C 84 78, 74 46, 66 28 C 60 26, 55 26, 50 28 Z"
            fill={`url(#${grad})`}
          />

          <rect
            x="36"
            y="78"
            width="32"
            height="7"
            rx="2.5"
            fill={`url(#${grad})`}
          />
        </svg>

        <span className="hhl-letter">B</span>
        <span className="hhl-letter">I</span>
        <span className="hhl-letter">T</span>
      </div>

      <div className="hhl-sub">HEALTH</div>
    </div>
  );
}

export default function Page() {
  const [viewerKey, setViewerKey] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [tab, setTab] = useState('none');

  const nameRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    track('page_view');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return;

    const root = document.documentElement;
    let width = window.innerWidth;

    const freeze = () => {
      root.style.setProperty('--vh', `${window.innerHeight}px`);
    };

    freeze();

    const onResize = () => {
      if (window.innerWidth === width) return;

      width = window.innerWidth;
      freeze();
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      root.style.removeProperty('--vh');
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return;

    let last = 0;

    const post = () => {
      const height = Math.ceil(
        Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        )
      );

      if (Math.abs(height - last) < 2) return;

      last = height;

      window.parent.postMessage(
        {
          type: 'prohealth:height',
          height,
        },
        '*'
      );
    };

    post();

    const ro = new ResizeObserver(post);
    ro.observe(document.body);

    window.addEventListener('load', post);

    return () => {
      ro.disconnect();
      window.removeEventListener('load', post);
    };
  }, [formOpen, viewerKey, success]);

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

    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [closeForm]);

  function openForm(service) {
    setForm({
      ...BLANK_FORM,
      service,
    });

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
    setForm((f) => ({
      ...f,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((e) => ({
        ...e,
        [field]: null,
      }));
    }
  }

  function validate(d) {
    const e = {};

    if (d.fullName.trim().length < 2) {
      e.fullName = 'Please enter your full name.';
    }

    if (!/^[6-9]\d{9}$/.test(d.mobile.replace(/\D/g, ''))) {
      e.mobile = 'Enter a valid 10 digit mobile number.';
    }

    if (!d.empId.trim()) {
      e.empId = 'Please enter your Employee ID.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) {
      e.email = 'Enter a valid email address.';
    }

    if (!d.location.trim()) {
      e.location = 'Please enter your location.';
    }

    if (!d.service) {
      e.service = 'Please choose a preferred service.';
    }

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          mobile: form.mobile.replace(/\D/g, ''),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        if (data.errors) {
          setErrors(data.errors);
        }

        setServerError(
          data.message || 'Something went wrong. Please try again.'
        );

        return;
      }

      setSuccess({
        service: form.service,
        key: SERVICE_TO_KEY[form.service] || 'plus',
        leadId: data.id,
      });

      setTab('none');

      if (modalRef.current) {
        modalRef.current.scrollTop = 0;
      }
    } catch {
      setServerError(
        'Network problem. Check your connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const successProgram = success
    ? getProgramByService(success.service)
    : null;

  const viewerProgram = viewerKey
    ? PROGRAMS.find((p) => p.key === viewerKey)
    : null;

  const formProgram = form.service
    ? getProgramByService(form.service)
    : null;

  const accentStyle = (p) =>
    p
      ? {
          '--accent': p.accent,
          '--accent-soft': p.soft,
          '--banner-ratio': p.bannerRatio,
          '--banner-top': p.bannerTop,
        }
      : undefined;

  return (
    <>
      <section className="view programs-view active">
        <div className="sub-header">
          <HabitHealthLogo id="programs" />
          <span className="sub-spacer" />
        </div>

        <div className="programs-head">
          <h2>Care Plans</h2>

          <p className="lead">
            Premium, on-demand health programs from HCL Healthcare. Register
            in the one that fits you and download your flyer instantly.
          </p>
        </div>

        <div className="programs">
          {PROGRAMS.map((p) => (
            <article
              className="card"
              key={p.key}
              style={accentStyle(p)}
            >
              <div className="stripe" />

              <div className="card-body">
                <h3 className="sr-only">
                  {p.name} — {p.tagline}
                </h3>

                <div className="price-badge">
                  <span className="pd">
                    Plan duration {p.duration}
                  </span>

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
                  <button
                    className="btn btn-primary"
                    onClick={() => openForm(p.service)}
                  >
                    Register Now
                  </button>

                  <button
                    className="flyer-link"
                    onClick={() => openViewer(p.key)}
                  >
                    View flyer
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="card-media"
                onClick={() => openViewer(p.key)}
                aria-label={`View the ${p.name} flyer`}
              >
                <img
                  src={p.previews[0]}
                  alt=""
                  loading="lazy"
                />
              </button>
            </article>
          ))}
        </div>
      </section>

      <div
        className={`overlay ${viewerProgram ? 'open' : ''}`}
        aria-hidden={!viewerProgram}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setViewerKey(null);
          }
        }}
      >
        {viewerProgram && (
          <div
            className="modal viewer"
            role="dialog"
            aria-modal="true"
            style={accentStyle(viewerProgram)}
          >
            <div className="modal-head">
              <div>
                <div className="mtitle">
                  {viewerProgram.name} flyer
                </div>

                <div className="msub">
                  Preview only — register to download the PDF.
                </div>
              </div>

              <button
                className="x"
                onClick={() => setViewerKey(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="viewer-body">
              {viewerProgram.previews.map((src, i) => (
                <figure className="viewer-page" key={src}>
                  <img
                    src={src}
                    alt={`${viewerProgram.name} flyer page ${i + 1}`}
                  />

                  <figcaption>
                    Page {i + 1} of {viewerProgram.previews.length}
                  </figcaption>
                </figure>
              ))}
            </div>

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

      <div
        className={`overlay ${formOpen ? 'open' : ''}`}
        aria-hidden={!formOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeForm();
          }
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
                <span className="badge">
                  {form.service || 'ProHealth'}
                </span>

                <div className="mtitle">
                  {success ? 'You’re registered' : 'Register Now'}
                </div>

                <div className="msub">
                  {success
                    ? 'Your flyer is ready to download.'
                    : 'Fill in your details to register and get your flyer.'}
                </div>
              </div>

              <button
                className="x"
                onClick={closeForm}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {!success && (
              <form onSubmit={onSubmit} noValidate>
                {serverError && (
                  <div className="form-error">
                    {serverError}
                  </div>
                )}

                <div
                  className={`field ${
                    errors.fullName ? 'invalid' : ''
                  }`}
                >
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
                    onChange={(e) =>
                      update('fullName', e.target.value)
                    }
                  />

                  <span className="err">
                    {errors.fullName}
                  </span>
                </div>

                <div className="two">
                  <div
                    className={`field ${
                      errors.mobile ? 'invalid' : ''
                    }`}
                  >
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
                      onChange={(e) =>
                        update(
                          'mobile',
                          e.target.value
                            .replace(/\D/g, '')
                            .slice(0, 10)
                        )
                      }
                    />

                    <span className="err">
                      {errors.mobile}
                    </span>
                  </div>

                  <div
                    className={`field ${
                      errors.empId ? 'invalid' : ''
                    }`}
                  >
                    <label htmlFor="empId">
                      Employee ID <span className="req">*</span>
                    </label>

                    <input
                      id="empId"
                      type="text"
                      placeholder="e.g. HCL123456"
                      value={form.empId}
                      onChange={(e) =>
                        update('empId', e.target.value)
                      }
                    />

                    <span className="err">
                      {errors.empId}
                    </span>
                  </div>
                </div>

                <div
                  className={`field ${
                    errors.email ? 'invalid' : ''
                  }`}
                >
                  <label htmlFor="email">
                    Email ID <span className="req">*</span>
                  </label>

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={(e) =>
                      update('email', e.target.value)
                    }
                  />

                  <span className="err">
                    {errors.email}
                  </span>
                </div>

                <div className="two">
                  <div
                    className={`field ${
                      errors.location ? 'invalid' : ''
                    }`}
                  >
                    <label htmlFor="location">
                      Location <span className="req">*</span>
                    </label>

                    <input
                      id="location"
                      type="text"
                      autoComplete="address-level2"
                      placeholder="e.g. Noida"
                      value={form.location}
                      onChange={(e) =>
                        update('location', e.target.value)
                      }
                    />

                    <span className="err">
                      {errors.location}
                    </span>
                  </div>

                  <div
                    className={`field ${
                      errors.service ? 'invalid' : ''
                    }`}
                  >
                    <label htmlFor="service">
                      Preferred Service{' '}
                      <span className="req">*</span>
                    </label>

                    <select
                      id="service"
                      value={form.service}
                      onChange={(e) =>
                        update('service', e.target.value)
                      }
                    >
                      <option value="">
                        Select a program
                      </option>

                      {PROGRAMS.map((p) => (
                        <option key={p.key} value={p.service}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <span className="err">
                      {errors.service}
                    </span>
                  </div>
                </div>

                <input
                  className="hp"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={form.company}
                  onChange={(e) =>
                    update('company', e.target.value)
                  }
                />

                <button
                  className="submit"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting && (
                    <span
                      className="spinner"
                      aria-hidden="true"
                    />
                  )}

                  {submitting
                    ? 'Registering'
                    : 'Register and get my flyer'}
                </button>

                <p className="consent">
                  By registering you agree that HCL Healthcare may
                  contact you about your selected ProHealth program.
                </p>
              </form>
            )}

            {success && successProgram && (
              <div className="success show">
                <div className="check">
                  <Icon
                    path="M20 6 9 17l-5-5"
                    size={34}
                    width={2.6}
                  />
                </div>

                <h3>
                  Thank you for sharing your interest!
                </h3>

                <p className="stext">
                  Our team will reach out to you about{' '}
                  {success.service} within 48 working hours. You
                  can view or download your flyer below.
                </p>

                <div className="success-actions">
                  <a
                    className="dl-btn"
                    href={`/api/brochure/${successProgram.key}?lead=${success.leadId}`}
                    download={successProgram.downloadName}
                    target="_blank"
                    rel="noopener"
                  >
                    <Icon
                      path="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16"
                      width={2.2}
                    />
                    Download PDF flyer
                  </a>

                  <button
                    type="button"
                    className="flyer-toggle"
                    aria-expanded={tab === 'view'}
                    onClick={() =>
                      setTab(
                        tab === 'view' ? 'none' : 'view'
                      )
                    }
                  >
                    {tab === 'view'
                      ? 'Hide flyer'
                      : 'View flyer'}

                    <Icon
                      path={
                        tab === 'view'
                          ? 'M18 15l-6-6-6 6'
                          : 'M6 9l6 6 6-6'
                      }
                      size={16}
                      width={2.2}
                    />
                  </button>
                </div>

                {tab === 'view' && (
                  <div className="flyer-panel">
                    {successProgram.previews.map((src, i) => (
                      <img
                        key={src}
                        src={src}
                        alt={`${successProgram.name} flyer page ${
                          i + 1
                        }`}
                        style={
                          i
                            ? { marginTop: 12 }
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}