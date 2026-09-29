'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  PROGRAMS,
  SERVICE_TO_KEY,
  getProgramByService,
} from '@/lib/programs';

const BLANK_FORM = {
  fullName: '',
  mobile: '',
  email: '',
  service: '',
};

function track(name, props = {}) {
  try {
    window.parent?.postMessage(
      {
        type: 'prohealth:track',
        name,
        props,
      },
      '*'
    );
  } catch {}
}

function Icon({ children }) {
  return <span aria-hidden="true">{children}</span>;
}

function HabitHealthLogo() {
  return (
    <div className="hhl">
      <img
        src="/habit-health-logo.png"
        alt="Habit Health"
        className="hhl-logo-image"
      />
    </div>
  );
}

export default function Home() {
  const [viewer, setViewer] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const formRef = useRef(null);

  useEffect(() => {
    const sendHeight = () => {
      try {
        window.parent?.postMessage(
          {
            type: 'prohealth:height',
            height: document.documentElement.scrollHeight,
          },
          '*'
        );
      } catch {}
    };

    sendHeight();

    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);

    window.addEventListener('resize', sendHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sendHeight);
    };
  }, []);

  const openForm = useCallback((program) => {
    setForm({
      ...BLANK_FORM,
      service: program.service || program.name || '',
    });

    setErrors({});
    setSuccess(null);
    setShowForm(true);

    track('register_click', {
      program: program.key,
    });
  }, []);

  const openViewer = useCallback((program) => {
    setViewer(program);

    track('flyer_view', {
      program: program.key,
    });
  }, []);

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: '',
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Please enter your name.';
    }

    if (!/^[0-9]{10}$/.test(form.mobile.trim())) {
      nextErrors.mobile =
        'Please enter a valid 10-digit mobile number.';
    }

    if (
      !form.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!form.service.trim()) {
      nextErrors.service = 'Please select a program.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setSuccess(null);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim(),
          service: form.service.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || 'We could not save your details.'
        );
      }

      const program =
        getProgramByService(form.service) ||
        PROGRAMS.find(
          (item) => item.name === form.service
        );

      setSuccess({
        name: form.fullName,
        program,
      });

      track('registration_success', {
        program: program?.key || form.service,
      });

      setForm(BLANK_FORM);
    } catch (error) {
      setErrors({
        submit:
          error?.message ||
          'Something went wrong. Please try again.',
      });

      track('registration_error', {
        message:
          error?.message || 'unknown_error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * IMPORTANT:
   * Every card gets its OWN accent color from PROGRAMS.
   * Therefore the banner matches the corresponding flyer.
   */
  const accentStyle = (program) =>
    program
      ? {
          '--accent': program.accent,
          '--accent-soft': program.soft,
          '--banner-ratio': program.bannerRatio,
          '--banner-top': program.bannerTop,
        }
      : undefined;

  const downloadFlyer = (program) => {
    if (!program?.previews?.[0]) {
      return;
    }

    const link = document.createElement('a');

    link.href = program.previews[0];
    link.download = `${program.key || 'prohealth'}-flyer`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    document.body.appendChild(link);
    link.click();
    link.remove();

    track('flyer_download', {
      program: program.key,
    });
  };

  return (
    <main className="programs-view">
      <header className="sub-header">
        <HabitHealthLogo />

        <div className="sub-spacer" />

        <nav className="top-nav">
          <button
            type="button"
            className="active"
          >
            Programs
          </button>
        </nav>
      </header>

      <section className="programs-head">
        <p className="eyebrow">
          HABIT HEALTH × HCL HEALTHCARE
        </p>

        <h2>Personalised Health Programs</h2>

        <p className="lead">
          Take control of your health with personalised
          programs designed around your needs, goals and
          everyday habits.
        </p>
      </section>

      <section className="programs" id="programs">
        {PROGRAMS.map((program) => (
          <article
            className="card"
            key={program.key}
            style={accentStyle(program)}
          >
            <div className="stripe" />

            <div className="card-body">
              <div className="plan-banner">
                <span className="plan-banner-icon">
                  ♡
                </span>

                <span>{program.name}</span>
              </div>

              <h3 className="program-title">
                {program.title || program.name}
              </h3>

              {program.tagline && (
                <p className="program-tagline">
                  {program.tagline}
                </p>
              )}

              {program.price && (
                <div className="price-badge">
                  <span className="pd">
                    {program.priceLabel || 'Program'}
                  </span>

                  <span className="pp">
                    {program.oldPrice && (
                      <s>{program.oldPrice}</s>
                    )}

                    <b>{program.price}</b>
                  </span>
                </div>
              )}

              {program.description && (
                <p className="desc">
                  {program.description}
                </p>
              )}

              {Array.isArray(program.chips) &&
                program.chips.length > 0 && (
                  <div className="chips">
                    {program.chips.map((chip) => (
                      <span
                        className="chip"
                        key={chip}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}

              <div className="card-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => openForm(program)}
                >
                  Register Now
                </button>

                <button
                  type="button"
                  className="flyer-link"
                  onClick={() => openViewer(program)}
                >
                  View Flyer
                </button>
              </div>
            </div>

            <button
              type="button"
              className="card-media"
              onClick={() => openViewer(program)}
              aria-label={`View ${program.name} flyer`}
            >
              <img
                src={program.previews?.[0]}
                alt={`${program.name} flyer`}
              />
            </button>
          </article>
        ))}
      </section>

      {/* REGISTRATION MODAL */}
      {showForm && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setShowForm(false);
            }
          }}
        >
          <div
            className="form-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Program registration"
            ref={formRef}
          >
            {!success ? (
              <>
                <div className="viewer-head">
                  <div>
                    <p className="eyebrow">
                      GET STARTED
                    </p>

                    <h2>Register for a Program</h2>
                  </div>

                  <button
                    type="button"
                    className="modal-close"
                    onClick={() =>
                      setShowForm(false)
                    }
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <form
                  className="registration-form"
                  onSubmit={onSubmit}
                  noValidate
                >
                  <div className="form-grid">
                    <label>
                      <span>Full Name</span>

                      <input
                        type="text"
                        value={form.fullName}
                        onChange={(event) =>
                          update(
                            'fullName',
                            event.target.value
                          )
                        }
                        placeholder="Enter your full name"
                      />

                      {errors.fullName && (
                        <small>
                          {errors.fullName}
                        </small>
                      )}
                    </label>

                    <label>
                      <span>Mobile Number</span>

                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={form.mobile}
                        onChange={(event) =>
                          update(
                            'mobile',
                            event.target.value.replace(
                              /\D/g,
                              ''
                            )
                          )
                        }
                        placeholder="10-digit mobile number"
                      />

                      {errors.mobile && (
                        <small>
                          {errors.mobile}
                        </small>
                      )}
                    </label>

                    <label>
                      <span>Email Address</span>

                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          update(
                            'email',
                            event.target.value
                          )
                        }
                        placeholder="Enter your email"
                      />

                      {errors.email && (
                        <small>
                          {errors.email}
                        </small>
                      )}
                    </label>

                    <label>
                      <span>Program</span>

                      <select
                        value={form.service}
                        onChange={(event) =>
                          update(
                            'service',
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          Select a program
                        </option>

                        {PROGRAMS.map((item) => (
                          <option
                            key={item.key}
                            value={
                              item.service ||
                              item.name
                            }
                          >
                            {item.name}
                          </option>
                        ))}
                      </select>

                      {errors.service && (
                        <small>
                          {errors.service}
                        </small>
                      )}
                    </label>
                  </div>

                  {errors.submit && (
                    <div className="form-error">
                      {errors.submit}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary submit-btn"
                    disabled={submitting}
                  >
                    {submitting
                      ? 'Submitting...'
                      : 'Submit Registration'}
                  </button>
                </form>
              </>
            ) : (
              <div className="success-state">
                <button
                  type="button"
                  className="modal-close success-close"
                  onClick={() =>
                    setShowForm(false)
                  }
                  aria-label="Close"
                >
                  ×
                </button>

                <div className="success-icon">
                  ✓
                </div>

                <h2>
                  Registration Submitted
                </h2>

                <p>
                  Thank you, {success.name}. Your
                  registration has been received
                  successfully.
                </p>

                {success.program?.previews?.[0] && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      downloadFlyer(
                        success.program
                      )
                    }
                  >
                    Download Flyer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLYER VIEWER */}
      {viewer && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setViewer(null);
            }
          }}
        >
          <div
            className="viewer-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${viewer.name} flyer`}
          >
            <div className="viewer-head">
              <div>
                <p className="eyebrow">
                  PROGRAM FLYER
                </p>

                <h2>{viewer.name}</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setViewer(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="viewer-content">
              <img
                src={viewer.previews?.[0]}
                alt={`${viewer.name} flyer`}
              />
            </div>

            <div className="viewer-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setViewer(null);
                  openForm(viewer);
                }}
              >
                Register Now
              </button>

              <button
                type="button"
                className="flyer-link"
                onClick={() =>
                  downloadFlyer(viewer)
                }
              >
                Download Flyer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}