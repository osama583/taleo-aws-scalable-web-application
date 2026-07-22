import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import logoImage from '../assets/logo.png'
import vipGif from '../assets/tenor.gif'
import './admin.css'

type LoginResponse = {
  token: string
  expiresIn: string
  user: {
    id: string
    email: string
    role: string
  }
}

type Registration = {
  id: string
  name: string
  phoneNumber: string
  createdAt: string
  bookForCode: string | null
  bookForLabel: string | null
  formatInterestCode: string | null
  formatInterestLabel: string | null
}

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:4000'
).replace(/\/$/, '')

const TOKEN_KEY = 'taleo_admin_token'

function tokenRole() {
  const token = window.localStorage.getItem(TOKEN_KEY)
  if (!token) return null

  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.role === 'string' ? payload.role.toUpperCase() : null
  } catch {
    return null
  }
}

function readError(payload: unknown, fallback: string) {
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

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = window.localStorage.getItem(TOKEN_KEY)
  const headers = new Headers(init?.headers)

  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      window.localStorage.removeItem(TOKEN_KEY)
    }
    throw new Error(readError(payload, 'The request could not be completed.'))
  }

  return payload as T
}

function goTo(path: string, replace = false) {
  if (replace) window.location.replace(path)
  else window.location.assign(path)
}

function AdminLogo() {
  return <img className="admin-logo" src={logoImage} alt="Taleo" />
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.documentElement.lang = 'en'
    document.documentElement.dir = 'ltr'
    document.title = 'Admin Login — Taleo'

    const role = tokenRole()
    if (role) {
      goTo(role === 'ADMIN' ? '/admin/interested-people' : '/vip', true)
    }
  }, [])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const result = await adminRequest<LoginResponse>('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      window.localStorage.setItem(TOKEN_KEY, result.token)
      goTo(result.user.role === 'ADMIN' ? '/admin/interested-people' : '/vip', true)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Login failed. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-glow login-glow-one" aria-hidden="true" />
      <div className="login-glow login-glow-two" aria-hidden="true" />

      <section className="login-card" aria-labelledby="login-title">
        <AdminLogo />
        <div className="login-heading">
          <span className="admin-eyebrow">Taleo administration</span>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to manage Taleo and view registered families.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <label>
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              autoComplete="username"
              maxLength={254}
              required
              autoFocus
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              maxLength={200}
              required
            />
          </label>

          {error && <p className="admin-message error" role="alert">{error}</p>}

          <button type="submit" className="login-button" disabled={submitting}>
            <span>{submitting ? 'Signing in…' : 'Sign in'}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>

        <p className="login-security">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z" />
          </svg>
          Protected admin access
        </p>
      </section>
    </main>
  )
}

function logout() {
  window.localStorage.removeItem(TOKEN_KEY)
  goTo('/login', true)
}

function AdminSidebar({ active }: { active: 'people' | 'users' }) {
  return (
    <aside className="admin-sidebar">
      <a href="/admin/interested-people" className="admin-brand" aria-label="Taleo admin home">
        <AdminLogo />
        <span>Admin</span>
      </a>

      <nav className="admin-nav" aria-label="Admin navigation">
        <span className="admin-nav-label">Workspace</span>
        <a href="/admin/interested-people" className={active === 'people' ? 'active' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM16.5 10a3.5 3.5 0 1 0 0-7M2 21v-2a6 6 0 0 1 12 0v2M14 14.5a5 5 0 0 1 8 4V21" /></svg>
          <span>Interested people</span>
        </a>
        <a href="/admin/users/new" className={active === 'users' ? 'active' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM4 21a8 8 0 0 1 16 0M19 8v6M16 11h6" /></svg>
          <span>Create VIP user</span>
        </a>
      </nav>

      <button type="button" className="logout-button" onClick={logout}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5V3H4v18h6v-2M14 8l4 4-4 4M8 12h10" /></svg>
        <span>Sign out</span>
      </button>
    </aside>
  )
}

function InterestedPeoplePage() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    document.documentElement.lang = 'en'
    document.documentElement.dir = 'ltr'
    document.title = 'Interested People — Taleo Admin'

    if (!window.localStorage.getItem(TOKEN_KEY)) {
      goTo('/login', true)
      return
    }

    adminRequest<{ registrations: Registration[] }>('/admin/registrations')
      .then((result) => setRegistrations(result.registrations))
      .catch((requestError: unknown) => {
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'Could not load registrations.'
        setError(message)

        if (!window.localStorage.getItem(TOKEN_KEY)) {
          goTo('/login', true)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredRegistrations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return registrations

    return registrations.filter((registration) =>
      [
        registration.name,
        registration.phoneNumber,
        registration.bookForLabel,
        registration.formatInterestLabel,
      ].some((value) => value?.toLowerCase().includes(query)),
    )
  }, [registrations, search])

  return (
    <div className="admin-shell">
      <AdminSidebar active="people" />

      <main className="admin-main">
        <header className="admin-page-header">
          <div>
            <span className="admin-eyebrow">Community</span>
            <h1>Interested people</h1>
            <p>Families who have registered their interest in Taleo.</p>
          </div>
          <div className="admin-total-card">
            <span>Total registrations</span>
            <strong>{registrations.length}</strong>
          </div>
        </header>

        <section className="registrations-panel" aria-labelledby="registrations-title">
          <div className="panel-toolbar">
            <div>
              <h2 id="registrations-title">All registrations</h2>
              <p>Newest registrations appear first.</p>
            </div>
            <label className="admin-search">
              <span className="sr-only">Search registrations</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 5 5" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search people…"
              />
            </label>
          </div>

          {error && <p className="admin-message error" role="alert">{error}</p>}

          {loading ? (
            <div className="admin-loading" role="status">
              <span />
              Loading registrations…
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="admin-empty">
              <span aria-hidden="true">✦</span>
              <h3>{search ? 'No matching people' : 'No registrations yet'}</h3>
              <p>{search ? 'Try a different search.' : 'New supporters will appear here.'}</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="registrations-table">
                <thead>
                  <tr>
                    <th scope="col">Person</th>
                    <th scope="col">Phone number</th>
                    <th scope="col">Book for</th>
                    <th scope="col">Format</th>
                    <th scope="col">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((registration) => (
                    <tr key={registration.id}>
                      <td>
                        <span className="person-cell">
                          <span className="person-avatar" aria-hidden="true">
                            {registration.name.trim().charAt(0).toUpperCase() || '?'}
                          </span>
                          <strong>{registration.name}</strong>
                        </span>
                      </td>
                      <td><a href={`tel:${registration.phoneNumber}`}>{registration.phoneNumber}</a></td>
                      <td>{registration.bookForLabel || '—'}</td>
                      <td><span className="format-badge">{registration.formatInterestLabel || '—'}</span></td>
                      <td>
                        <time dateTime={registration.createdAt}>
                          {new Intl.DateTimeFormat('en-MY', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(registration.createdAt))}
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function CreateVipPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    document.title = 'Create VIP User — Taleo Admin'
    if (tokenRole() !== 'ADMIN') goTo('/login', true)
  }, [])

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      await adminRequest('/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      setMessage({ type: 'success', text: `VIP account created for ${email}.` })
      setEmail('')
      setPassword('')
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not create account.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-shell">
      <AdminSidebar active="users" />
      <main className="admin-main">
        <header className="admin-page-header">
          <div><span className="admin-eyebrow">Accounts</span><h1>Create VIP user</h1><p>Give a friend their own very important Taleo login.</p></div>
        </header>
        <section className="user-create-panel">
          <div className="vip-form-intro"><span aria-hidden="true">♥</span><div><h2>A tiny bit of VIP magic</h2><p>This account can only access the VIP message. It has no admin permissions.</p></div></div>
          <form className="login-form" onSubmit={createUser}>
            <label><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" placeholder="friend@example.com" maxLength={254} required autoFocus /></label>
            <label><span>Temporary password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" minLength={8} maxLength={200} required /></label>
            {message && <p className={`admin-message ${message.type}`} role="status">{message.text}</p>}
            <button type="submit" className="login-button" disabled={submitting}><span>{submitting ? 'Creating…' : 'Create VIP account'}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg></button>
          </form>
        </section>
      </main>
    </div>
  )
}

function VipPage() {
  const [escapePosition, setEscapePosition] = useState<{ left: number; top: number } | null>(null)

  useEffect(() => {
    document.title = 'Your VIP Access — Taleo'
    if (tokenRole() !== 'VIP') goTo('/login', true)
  }, [])

  function moveEscapeButton() {
    const buttonWidth = 150
    const buttonHeight = 48
    const padding = 16
    setEscapePosition({
      left: padding + Math.random() * Math.max(0, window.innerWidth - buttonWidth - padding * 2),
      top: padding + Math.random() * Math.max(0, window.innerHeight - buttonHeight - padding * 2),
    })
  }

  return (
    <main className="vip-page">
      <section className="vip-content">
        <h1>Welcome to the VIP Program.</h1>
        <p>After a thorough review, we've decided you can be VIP user with the VIP privileges.</p>
        <p>Privileges include:</p>
        <ul>
          <li>No extra permissions.</li>
          <li>No hidden features.</li>
          <li>No exclusive content.</li>
        </ul>
        <p className="vip-heart">However, you know you are VIP to me <span aria-label="heart">♥</span></p>
        <p>This decision is final and cannot be revoked.</p>
        <img src={vipGif} alt="A special celebration for my VIP friend" />
        <div className="vip-actions">
          <button type="button" className="vip-logout" onClick={logout}>Sign out</button>
          <button
            type="button"
            className={`vip-escape${escapePosition ? ' escaped' : ''}`}
            style={escapePosition ?? undefined}
            onPointerEnter={moveEscapeButton}
            onPointerDown={(event) => { event.preventDefault(); moveEscapeButton() }}
            onFocus={moveEscapeButton}
            onClick={(event) => { event.preventDefault(); moveEscapeButton() }}
          >
            I do not care
          </button>
        </div>
      </section>
    </main>
  )
}

export default function AdminApp() {
  if (window.location.pathname === '/login') return <LoginPage />
  if (window.location.pathname === '/vip') return <VipPage />
  if (window.location.pathname === '/admin/users/new') return <CreateVipPage />
  if (window.location.pathname === '/admin/interested-people') return <InterestedPeoplePage />
  goTo(tokenRole() === 'VIP' ? '/vip' : '/admin/interested-people', true)
  return null
}
