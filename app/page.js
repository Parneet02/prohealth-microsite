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
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function HabitHealthLogo({ id = 'programs' }) {
  return (
    <div className="hh-logo" id={id}>
      <div className="hh-logo-mark">
        <span />
        <span />
        <span />
      </div>
      <div className="hh-logo-text">
        <strong>Habit</strong>
        <strong>Health</strong>
      </div>
    </div>
  );
}

export default function Page() {
  const [viewerKey, setViewerKey] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formProgram, setFormProgram] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [successProgram, setSuccessProgram] = useState(null);
  const [tab, setTab] = useState('details');

  const shellRef = useRef(null);

  const viewerProgram = viewerKey
    ? PROGRAMS.find((program) => program.key === viewerKey)
    : null;

  const openViewer = (program) => {
    setViewerKey(program.key);
    setTab('details');
    track('view_program', program.key);
  };

  const closeViewer = () => {
    setViewerKey(null);
    setTab('details');
  };

  const openForm = (program) => {
    setFormProgram(program);
    setForm(BLANK_FORM);
    setErrors({});
    setSuccess(null);
    setSuccessProgram(null);
    setFormOpen(true);
    track('register_click', program.key);
  };

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setFormProgram(null);
    setForm(BLANK_FORM);
    setErrors({});
    setSubmitting(false);
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: '',
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Please enter your name.';
    }

    if (!form.mobile.trim()) {
      nextErrors.mobile = 'Please enter your mobile number.';
    } else if (!/^[0-9]{10}$/.test(form.mobile.trim())) {
      nextErrors.mobile = 'Please enter a valid 10-digit mobile number.';
    }

    if (!form.empId.trim()) {
      nextErrors.empId = 'Please enter your employee ID.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Please enter your email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!form.location.trim()) {
      nextErrors.location = 'Please enter your location.';
    }

    if (!form.service) {
      nextErrors.service = 'Please select a service.';
    }

    if (!form.company.trim()) {
      nextErrors.company = 'Please enter your company.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!validate() || !formProgram) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'registration',
          programKey: formProgram.key,
          fullName: form.fullName.trim(),
          mobile: form.mobile.trim(),
          empId: form.empId.trim(),
          email: form.email.trim(),
          location: form.location.trim(),
          service: form.service,
          company: form.company.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Registration failed');
      }

      setSuccess(data);
      setSuccessProgram(formProgram);
      track('registration_success', formProgram.key);
    } catch (error) {
      setErrors({
        submit: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleServiceChange = (event) => {
    const service = event.target.value;

    setForm((previous) => ({
      ...previous,
      service,
    }));

    setErrors((previous) => ({
      ...previous,
      service: '',
    }));

    const mappedKey = SERVICE_TO_KEY?.[service];

    if (mappedKey) {
      const program = PROGRAMS.find((item) => item.key === mappedKey);

      if (program) {
        setFormProgram(program);
      }
    } else {
      const program = getProgramByService?.(service);

      if (program) {
        setFormProgram(program);
      }
    }
  };

  useEffect(() => {
    track('page_view');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateVh = () => {
      const height = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${height}px`);
    };

    updateVh();
    window.addEventListener('resize', updateVh);

    return () => {
      window.removeEventListener('resize', updateVh);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const sendHeight = () => {
      const height = document.documentElement.scrollHeight;

      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'habithealth_height',
            height,
          },
          '*'
        );
      }
    };

    sendHeight();

    const observer = new ResizeObserver(sendHeight);

    if (shellRef.current) {
      observer.observe(shellRef.current);
    }

    window.addEventListener('resize', sendHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sendHeight);
    };
  }, [formOpen, viewerKey, success, tab]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (viewerKey) {
        closeViewer();
      }

      if (formOpen) {
        closeForm();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [viewerKey, formOpen, closeForm]);

  return (
    <main ref={shellRef} className="app-shell">
      <section className="view programs-view active">
        <div className="sub-header">
          <HabitHealthLogo id="programs" />
          <span className="sub-spacer" />
        </div>

        <div className="programs-head">
          <div>
            <p className="eyebrow">PERSONALISED WELLNESS</p>
            <h2>Care Plans</h2>
            <p>
              Choose a wellness program designed to support your health goals.
            </p>
          </div>
        </div>

        <div className="programs">
          {PROGRAMS.map((program) => (
            <article className="program-card" key={program.key}>
              <div className="card-media">
                {program.image ? (
                  <img
                    src={program.image}
                    alt={program.name}
                    loading="lazy"
                  />
                ) : (
                  <div className="card-media-placeholder" />
                )}
              </div>

              <div className="card-content">
                <span className="card-tag">{program.category}</span>

                <h3>{program.name}</h3>

                {program.description && (
                  <p className="card-description">
                    {program.description}
                  </p>
                )}

                <div className="card-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => openViewer(program)}
                  >
                    View Details
                  </button>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => openForm(program)}
                  >
                    Register
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {viewerProgram && (
        <div className="modal-overlay" onClick={closeViewer}>
          <div
            className="modal viewer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={closeViewer}
              aria-label="Close"
            >
              <Icon path="M6 6l12 12M18 6L6 18" />
            </button>

            <div className="viewer-content">
              <div className="viewer-image">
                {viewerProgram.image ? (
                  <img
                    src={viewerProgram.image}
                    alt={viewerProgram.name}
                  />
                ) : (
                  <div className="viewer-image-placeholder" />
                )}
              </div>

              <div className="viewer-info">
                <span className="card-tag">
                  {viewerProgram.category}
                </span>

                <h2>{viewerProgram.name}</h2>

                {viewerProgram.description && (
                  <p>{viewerProgram.description}</p>
                )}

                <div className="viewer-tabs">
                  <button
                    type="button"
                    className={tab === 'details' ? 'active' : ''}
                    onClick={() => setTab('details')}
                  >
                    Details
                  </button>

                  <button
                    type="button"
                    className={tab === 'benefits' ? 'active' : ''}
                    onClick={() => setTab('benefits')}
                  >
                    Benefits
                  </button>
                </div>

                {tab === 'details' && viewerProgram.details && (
                  <div className="viewer-section">
                    <p>{viewerProgram.details}</p>
                  </div>
                )}

                {tab === 'benefits' && viewerProgram.benefits && (
                  <div className="viewer-section">
                    <ul>
                      {viewerProgram.benefits.map((benefit, index) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  className="primary-btn viewer-register"
                  onClick={() => {
                    closeViewer();
                    openForm(viewerProgram);
                  }}
                >
                  Register Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {formOpen && formProgram && (
        <div className="modal-overlay">
          <div
            className="modal registration-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={closeForm}
              aria-label="Close"
            >
              <Icon path="M6 6l12 12M18 6L6 18" />
            </button>

            {!success ? (
              <>
                <div className="modal-header">
                  <span className="card-tag">
                    {formProgram.category}
                  </span>

                  <h2>Register for {formProgram.name}</h2>

                  <p>
                    Enter your details to register for this wellness program.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="registration-form">
                  <div className="form-grid">
                    <div className="form-field">
                      <label htmlFor="fullName">Full Name</label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                      />
                      {errors.fullName && (
                        <span className="field-error">
                          {errors.fullName}
                        </span>
                      )}
                    </div>

                    <div className="form-field">
                      <label htmlFor="mobile">Mobile Number</label>
                      <input
                        id="mobile"
                        name="mobile"
                        type="tel"
                        value={form.mobile}
                        onChange={handleChange}
                        placeholder="Enter 10-digit mobile number"
                      />
                      {errors.mobile && (
                        <span className="field-error">
                          {errors.mobile}
                        </span>
                      )}
                    </div>

                    <div className="form-field">
                      <label htmlFor="empId">Employee ID</label>
                      <input
                        id="empId"
                        name="empId"
                        type="text"
                        value={form.empId}
                        onChange={handleChange}
                        placeholder="Enter employee ID"
                      />
                      {errors.empId && (
                        <span className="field-error">
                          {errors.empId}
                        </span>
                      )}
                    </div>

                    <div className="form-field">
                      <label htmlFor="email">Email</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="Enter email address"
                      />
                      {errors.email && (
                        <span className="field-error">
                          {errors.email}
                        </span>
                      )}
                    </div>

                    <div className="form-field">
                      <label htmlFor="location">Location</label>
                      <input
                        id="location"
                        name="location"
                        type="text"
                        value={form.location}
                        onChange={handleChange}
                        placeholder="Enter your location"
                      />
                      {errors.location && (
                        <span className="field-error">
                          {errors.location}
                        </span>
                      )}
                    </div>

                    <div className="form-field">
                      <label htmlFor="company">Company</label>
                      <input
                        id="company"
                        name="company"
                        type="text"
                        value={form.company}
                        onChange={handleChange}
                        placeholder="Enter your company"
                      />
                      {errors.company && (
                        <span className="field-error">
                          {errors.company}
                        </span>
                      )}
                    </div>

                    <div className="form-field form-field-full">
                      <label htmlFor="service">Service</label>
                      <select
                        id="service"
                        name="service"
                        value={form.service}
                        onChange={handleServiceChange}
                      >
                        <option value="">Select a service</option>
                        {PROGRAMS.map((program) => (
                          <option
                            key={program.key}
                            value={program.service || program.name}
                          >
                            {program.name}
                          </option>
                        ))}
                      </select>

                      {errors.service && (
                        <span className="field-error">
                          {errors.service}
                        </span>
                      )}
                    </div>
                  </div>

                  {errors.submit && (
                    <div className="submit-error">
                      {errors.submit}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="primary-btn submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? 'Registering...' : 'Register'}
                  </button>
                </form>
              </>
            ) : (
              <div className="success-content">
                <div className="success-icon">
                  <Icon
                    path="M5 12l4 4L19 6"
                    size={28}
                    width={2.5}
                  />
                </div>

                <h2>Registration Successful</h2>

                <p>
                  Thank you for registering for {successProgram?.name}.
                </p>

                {success?.leadId && successProgram && (
                  <a
                    className="primary-btn download-btn"
                    href={`/api/brochure/${successProgram.key}?lead=${success.leadId}`}
                    download
                  >
                    <Icon
                      path="M12 3v12M7 10l5 5 5-5M5 21h14"
                      size={18}
                    />
                    Download Brochure
                  </a>
                )}

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeForm}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}