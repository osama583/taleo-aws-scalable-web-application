import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import coverImage from './assets/taleo-cover.png'
import dedicationImage from './assets/taleo-dedication.png'
import logoImage from './assets/logo.png'
import { getTranslation } from './translations'
import './App.css'

type Language = {
  code: string
  name: string
}

type DropdownOption = {
  code: string
  label: string
}

type DropdownCategory = {
  code: string
  options: DropdownOption[]
}

type RegistrationForm = {
  name: string
  phoneNumber: string
  bookForCode: string
  formatInterestCode: string
}

type FormStatus =
  | { type: 'idle'; message: '' }
  | { type: 'success' | 'error'; message: string }

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:4000'
).replace(/\/$/, '')

const initialForm: RegistrationForm = {
  name: '',
  phoneNumber: '',
  bookForCode: '',
  formatInterestCode: '',
}

function messageFromPayload(payload: unknown, fallback: string) {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    return payload.error
  }

  return fallback
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  fallback = getTranslation('en').genericError,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init)
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      messageFromPayload(payload, fallback),
    )
  }

  return payload as T
}

function scrollToRegistration() {
  document
    .getElementById('join')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 1.5c.8 9 5.5 13.7 14.5 14.5-9 .8-13.7 5.5-14.5 14.5C15.2 21.5 10.5 16.8 1.5 16 10.5 15.2 15.2 10.5 16 1.5Z" />
    </svg>
  )
}

function App() {
  const [languages, setLanguages] = useState<Language[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [languageError, setLanguageError] = useState('')
  const [options, setOptions] = useState<DropdownCategory[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const [count, setCount] = useState<number | null>(null)
  const [goal, setGoal] = useState<number | null>(null)
  const [countError, setCountError] = useState('')
  const [form, setForm] = useState<RegistrationForm>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [isLanguageChanging, setIsLanguageChanging] = useState(false)
  const languageTransitionTimer = useRef<number | null>(null)
  const [formStatus, setFormStatus] = useState<FormStatus>({
    type: 'idle',
    message: '',
  })

  const t = getTranslation(selectedLanguage)
  const isRtl = selectedLanguage === 'ar'

  const bookForOptions = useMemo(
    () => options.find((category) => category.code === 'BOOK_FOR')?.options ?? [],
    [options],
  )
  const formatOptions = useMemo(
    () =>
      options.find((category) => category.code === 'FORMAT_INTEREST')?.options ??
      [],
    [options],
  )

  const progress =
    count !== null && goal !== null && goal > 0
      ? Math.min((count / goal) * 100, 100)
      : 0

  const loadCount = useCallback(async () => {
    try {
      const result = await apiRequest<{ count: number; goal: number }>(
        '/registration-count',
        undefined,
        t.genericError,
      )
      setCount(result.count)
      setGoal(result.goal)
      setCountError('')
    } catch (error) {
      setCountError(
        error instanceof Error ? error.message : t.countError,
      )
    }
  }, [t.countError, t.genericError])

  useEffect(() => {
    const controller = new AbortController()

    apiRequest<{ languages: Language[] }>(
      '/languages',
      { signal: controller.signal },
      getTranslation('en').genericError,
    )
      .then((result) => {
        setLanguages(result.languages)
        setLanguageError('')
        setSelectedLanguage((current) => current || result.languages[0]?.code || '')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setLanguageError(
          error instanceof Error
            ? error.message
            : getTranslation('en').languageError,
        )
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!selectedLanguage) return

    const controller = new AbortController()
    setOptionsLoading(true)
    setOptionsError('')
    setForm((current) => ({
      ...current,
      bookForCode: '',
      formatInterestCode: '',
    }))

    apiRequest<{ categories: DropdownCategory[] }>(
      `/dropdown-options?lang=${encodeURIComponent(selectedLanguage)}`,
      { signal: controller.signal },
      t.genericError,
    )
      .then((result) => setOptions(result.categories))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setOptions([])
        setOptionsError(
          error instanceof Error ? error.message : t.optionsError,
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setOptionsLoading(false)
      })

    return () => controller.abort()
  }, [selectedLanguage, t.genericError, t.optionsError])

  useEffect(() => {
    void loadCount()
    const interval = window.setInterval(() => void loadCount(), 30_000)
    return () => window.clearInterval(interval)
  }, [loadCount])

  useEffect(() => {
    const languageCode = selectedLanguage || 'en'
    document.documentElement.lang = languageCode
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
    document.title = t.pageTitle
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute('content', t.pageDescription)
    setFormStatus({ type: 'idle', message: '' })
  }, [isRtl, selectedLanguage, t.pageDescription, t.pageTitle])

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]'),
    )

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((element) => element.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [selectedLanguage])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const parallaxElements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-parallax]'),
    )

    const update = () => {
      frame = 0
      const viewportCenter = window.innerHeight / 2

      parallaxElements.forEach((element) => {
        const rect = element.getBoundingClientRect()
        const distance = (rect.top + rect.height / 2 - viewportCenter) / window.innerHeight
        const speed = Number(element.dataset.parallax || 0)
        element.style.setProperty('--parallax-y', `${distance * speed * -90}px`)
      })
    }

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [selectedLanguage])

  useEffect(() => {
    const updatePointer = (event: PointerEvent) => {
      document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`)
      document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`)
    }

    window.addEventListener('pointermove', updatePointer, { passive: true })
    return () => window.removeEventListener('pointermove', updatePointer)
  }, [])

  useEffect(() => {
    return () => {
      if (languageTransitionTimer.current !== null) {
        window.clearTimeout(languageTransitionTimer.current)
      }
    }
  }, [])

  function handleLanguageChange(nextLanguage: string) {
    if (!nextLanguage || nextLanguage === selectedLanguage) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSelectedLanguage(nextLanguage)
      return
    }

    if (languageTransitionTimer.current !== null) {
      window.clearTimeout(languageTransitionTimer.current)
    }

    setIsLanguageChanging(true)
    languageTransitionTimer.current = window.setTimeout(() => {
      setSelectedLanguage(nextLanguage)

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setIsLanguageChanging(false))
      })
      languageTransitionTimer.current = null
    }, 320)
  }

  function updateField(field: keyof RegistrationForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    if (formStatus.type !== 'idle') {
      setFormStatus({ type: 'idle', message: '' })
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFormStatus({ type: 'idle', message: '' })

    try {
      await apiRequest<{ id: string; message: string }>(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
        t.genericError,
      )

      setForm(initialForm)
      setFormStatus({
        type: 'success',
        message: t.successMessage,
      })
      await loadCount()
    } catch (error) {
      setFormStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : t.registrationError,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={`site-shell${isLanguageChanging ? ' language-is-changing' : ''}`}
      lang={selectedLanguage || 'en'}
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-busy={isLanguageChanging}
    >
      <div className="language-transition-curtain" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#top" aria-label={t.homeAria}>
          <span className="brand-logo" aria-hidden="true">
            <img src={logoImage} alt="" />
          </span>
        </a>

        <div className="header-actions">
          <label className="language-control">
            <span className="language-label">{t.language}</span>
            <span className="language-select-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3.5 12h17M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21c-2.2-2.5-3.3-5.5-3.3-9S9.8 5.5 12 3Z" />
              </svg>
              <select
                value={selectedLanguage}
                onChange={(event) => handleLanguageChange(event.target.value)}
                disabled={languages.length === 0}
                aria-describedby={languageError ? 'language-error' : undefined}
              >
                {languages.length === 0 ? (
                  <option value="">{t.loading}</option>
                ) : (
                  languages.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.name}
                    </option>
                  ))
                )}
              </select>
            </span>
          </label>
          <button className="header-cta" type="button" onClick={scrollToRegistration}>
            {t.headerJoin}
          </button>
        </div>
        {languageError && (
          <span className="header-error" id="language-error" role="status">
            {languageError}
          </span>
        )}
      </header>

      <main key={selectedLanguage || 'initial'}>
        <section className="hero-section" id="top">
          <div className="hero-story-sky" aria-hidden="true">
            <span className="sky-star sky-star-one">★</span>
            <span className="sky-star sky-star-two">✦</span>
            <span className="sky-star sky-star-three">★</span>
            <span className="sky-star sky-star-four">✦</span>
            <span className="sky-star sky-star-five">★</span>
            <span className="sky-moon" />
            <span className="sky-cloud sky-cloud-one" />
            <span className="sky-cloud sky-cloud-two" />
            <span className="sky-doodle sky-doodle-one" />
            <span className="sky-doodle sky-doodle-two" />
          </div>
          <div className="hero-orbit orbit-one" aria-hidden="true" />
          <div className="hero-orbit orbit-two" aria-hidden="true" />

          <div className="hero-copy">
            <p className="eyebrow reveal" data-reveal>
              <span className="eyebrow-dot" />
              {t.heroEyebrow}
            </p>
            <h1 className="hero-title reveal" data-reveal>
              <span>{t.heroTitleLead}</span>
              <span className="accent-word">{t.heroTitleAccent}</span>
            </h1>
            <p className="hero-subtitle reveal" data-reveal>
              {t.heroSubtitle}
            </p>
            <p className="hero-body reveal" data-reveal>
              {t.heroBody}
            </p>
            <div className="hero-actions reveal" data-reveal>
              <button className="primary-button" type="button" onClick={scrollToRegistration}>
                <span>{t.heroCta}</span>
                <ArrowIcon />
              </button>
              <span className="no-commitment">{t.noCommitment}</span>
            </div>
          </div>

          <div className="hero-visual reveal" data-reveal aria-label={t.heroVisualAria}>
            <div className="hero-spark hero-spark-one" aria-hidden="true">
              <SparkIcon />
            </div>
            <div className="hero-spark hero-spark-two" aria-hidden="true">
              <SparkIcon />
            </div>
            <div className="book-shadow" aria-hidden="true" />
            <div className="hero-book-float">
              <div className="hero-book" data-parallax="0.65">
                <img src={coverImage} alt={t.coverAlt} />
              </div>
            </div>
            <div className="story-pill story-pill-top" data-parallax="0.32">
              <span aria-hidden="true">✦</span>
              {t.theirName}
            </div>
            <div className="story-pill story-pill-bottom" data-parallax="0.48">
              <span aria-hidden="true">♥</span>
              {t.theirAdventure}
            </div>
          </div>

          <div className="scroll-cue" aria-hidden="true">
            <span>{t.scrollToDiscover}</span>
            <i />
          </div>
        </section>

        <section className="why-section section-pad" id="why">
          <div className="section-index reveal" data-reveal>
            <span className="section-number">01</span>
            <span className="section-index-line" />
            <span className="section-index-label">{t.whyIndex}</span>
          </div>
          <div className="why-grid">
            <div className="why-heading reveal" data-reveal>
              <p className="section-kicker">{t.whyKicker}</p>
              <h2>{t.whyHeading}</h2>
            </div>
            <div className="why-copy reveal" data-reveal>
              <p>{t.whyBody}</p>
              <div className="why-note">
                <span className="note-icon" aria-hidden="true">♥</span>
                <span>{t.whyNote}</span>
              </div>
            </div>
          </div>
          <div className="marquee" aria-hidden="true">
            <div>
              {t.marquee}
            </div>
          </div>
        </section>

        <section className="personal-section section-pad">
          <div className="personal-visual reveal" data-reveal>
            <div className="image-halo" aria-hidden="true" />
            <div className="dedication-frame" data-parallax="0.55">
              <img
                src={dedicationImage}
                alt={t.dedicationAlt}
                loading="lazy"
              />
            </div>
            <div className="personal-tag tag-personality" data-parallax="0.3">{t.personality}</div>
            <div className="personal-tag tag-family" data-parallax="0.45">{t.family}</div>
            <div className="personal-tag tag-values" data-parallax="0.6">{t.values}</div>
          </div>
          <div className="personal-copy">
            <div className="section-index light reveal" data-reveal>
              <span className="section-number">02</span>
              <span className="section-index-line" />
              <span className="section-index-label">{t.personalIndex}</span>
            </div>
            <p className="section-kicker reveal" data-reveal>{t.personalKicker}</p>
            <h2 className="reveal" data-reveal>{t.personalHeading}</h2>
            <p className="reveal" data-reveal>{t.personalBody}</p>
            <div className="signature-line reveal" data-reveal>
              <SparkIcon />
              <span>{t.personalSignature}</span>
            </div>
          </div>
        </section>

        <section className="process-section section-pad" id="how-it-works">
          <div className="process-head">
            <div>
              <div className="section-index reveal" data-reveal>
                <span className="section-number">03</span>
                <span className="section-index-line" />
                <span className="section-index-label">{t.processIndex}</span>
              </div>
              <p className="section-kicker reveal" data-reveal>{t.processKicker}</p>
              <h2 className="reveal" data-reveal>{t.processHeading}</h2>
            </div>
            <p className="process-intro reveal" data-reveal>
              {t.processIntro}
            </p>
          </div>

          <ol className="steps-list">
            {t.steps.map((step, index) => (
              <li className="step reveal" data-reveal key={`${selectedLanguage}-${index}`}>
                <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="step-title">{step}</span>
                <span className="step-arrow" aria-hidden="true"><ArrowIcon /></span>
              </li>
            ))}
          </ol>
        </section>

        <section className="support-section section-pad" id="support">
          <div className="support-spark" aria-hidden="true"><SparkIcon /></div>
          <div className="support-copy">
            <div className="section-index light reveal" data-reveal>
              <span className="section-number">04</span>
              <span className="section-index-line" />
              <span className="section-index-label">{t.supportIndex}</span>
            </div>
            <p className="section-kicker reveal" data-reveal>{t.supportKicker}</p>
            <h2 className="reveal" data-reveal>{t.supportHeading}</h2>
            <p className="reveal" data-reveal>{t.supportBody}</p>
          </div>

          <div className="counter-card reveal" data-reveal>
            <div className="counter-topline">
              <div>
                <span className="counter-label">{t.counterLabel}</span>
                {count !== null && goal !== null ? (
                  <strong>{t.counterJoined(count, goal)}</strong>
                ) : (
                  <strong className="count-loading">{t.loadingCount}</strong>
                )}
              </div>
              {count !== null && goal !== null && (
                <span className="progress-percent">{Math.round(progress)}%</span>
              )}
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={t.progressAria}
              aria-valuemin={0}
              aria-valuemax={goal ?? undefined}
              aria-valuenow={count ?? undefined}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            {countError && <p className="api-error" role="status">{countError}</p>}
            <p className="counter-note">{t.counterNote}</p>
          </div>
        </section>

        <section className="form-section section-pad" id="join">
          <div className="form-intro">
            <div className="section-index reveal" data-reveal>
              <span className="section-number">05</span>
              <span className="section-index-line" />
              <span className="section-index-label">{t.formIndex}</span>
            </div>
            <p className="section-kicker reveal" data-reveal>{t.formKicker}</p>
            <h2 className="reveal" data-reveal>{t.formHeading}</h2>
            <p className="reveal" data-reveal>{t.formIntro}</p>
            <div className="privacy-note reveal" data-reveal>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z" />
              </svg>
              <span>{t.privacyNote}</span>
            </div>
          </div>

          <form className="registration-form reveal" data-reveal onSubmit={handleSubmit}>
            <div className="field field-full">
              <label htmlFor="name">{t.nameLabel}</label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder={t.namePlaceholder}
                autoComplete="name"
                maxLength={150}
                required
              />
            </div>

            <div className="field field-full">
              <label htmlFor="phoneNumber">{t.phoneLabel}</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={form.phoneNumber}
                onChange={(event) => updateField('phoneNumber', event.target.value)}
                placeholder={t.phonePlaceholder}
                autoComplete="tel"
                inputMode="tel"
                pattern="\+[1-9][0-9]{7,14}"
                title={t.phoneHint}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="bookForCode">{t.bookForLabel}</label>
              <span className="select-field">
                <select
                  id="bookForCode"
                  name="bookForCode"
                  value={form.bookForCode}
                  onChange={(event) => updateField('bookForCode', event.target.value)}
                  disabled={optionsLoading || bookForOptions.length === 0}
                  required
                >
                  <option value="">
                    {optionsLoading ? t.loadingOptions : t.selectOne}
                  </option>
                  {bookForOptions.map((option) => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
              </span>
            </div>

            <div className="field">
              <label htmlFor="formatInterestCode">{t.formatLabel}</label>
              <span className="select-field">
                <select
                  id="formatInterestCode"
                  name="formatInterestCode"
                  value={form.formatInterestCode}
                  onChange={(event) => updateField('formatInterestCode', event.target.value)}
                  disabled={optionsLoading || formatOptions.length === 0}
                  required
                >
                  <option value="">
                    {optionsLoading ? t.loadingOptions : t.selectOne}
                  </option>
                  {formatOptions.map((option) => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
              </span>
            </div>

            {optionsError && <p className="form-message error" role="status">{optionsError}</p>}
            {formStatus.type !== 'idle' && (
              <p className={`form-message ${formStatus.type}`} role="status">
                {formStatus.message}
              </p>
            )}

            <button
              className="submit-button"
              type="submit"
              disabled={submitting || optionsLoading || !!optionsError}
            >
              <span>{submitting ? t.joining : t.supportIdea}</span>
              <ArrowIcon />
            </button>
          </form>
        </section>

        <section className="closing-section section-pad">
          <div className="closing-rings" aria-hidden="true">
            <i /><i /><i />
          </div>
          <div className="closing-star closing-star-left" aria-hidden="true"><SparkIcon /></div>
          <div className="closing-star closing-star-right" aria-hidden="true"><SparkIcon /></div>
          <p className="section-kicker reveal" data-reveal>{t.closingKicker}</p>
          <h2 className="reveal" data-reveal>{t.closingHeading}</h2>
          <p className="reveal" data-reveal>{t.closingBody}</p>
          <button className="closing-button reveal" data-reveal type="button" onClick={scrollToRegistration}>
            <span>{t.closingCta}</span>
            <ArrowIcon />
          </button>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top" aria-label={t.homeAria}>
          <span className="brand-logo" aria-hidden="true">
            <img src={logoImage} alt="" loading="lazy" />
          </span>
        </a>
        <p>{t.footerTagline}</p>
        <a href="#top" className="back-to-top">{t.backToTop} <span>↑</span></a>
      </footer>
    </div>
  )
}

export default App
