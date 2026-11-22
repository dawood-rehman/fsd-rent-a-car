'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Icon from '@/components/Icon'
import { api } from './api'

export default function AdminLogin({ siteName }: { siteName: string }) {
  const router = useRouter()
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const login = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const r = await api('/api/admin/login', 'POST', { password: pw })
    setBusy(false)
    if (r.ok) router.refresh()
    else setMsg(r.error)
  }

  return (
    <main className="adm-login-page">
      <div className="adm-login-card">
        <div className="adm-login-header">
          <div className="adm-login-badge-icon">
            <Icon name="car" size={28} />
          </div>
          <h1>Admin Portal</h1>
          <p>{siteName} · Fleet &amp; Website Management</p>
        </div>

        <form onSubmit={login} className="adm-login-form">
          <label className="adm-field">
            <span className="adm-label">Admin Password</span>
            <div className="adm-password-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value)
                  setMsg('')
                }}
                autoFocus
                placeholder="Enter your security password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="adm-pw-toggle"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw((v) => !v)}
              >
                <Icon name={showPw ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          </label>

          {msg && (
            <div className="adm-alert err" role="alert">
              <Icon name="alert" size={16} />
              <span>{msg}</span>
            </div>
          )}

          <button className="btn copper lg w-full" type="submit" disabled={busy}>
            <span>{busy ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
          </button>
        </form>

        <div className="adm-login-footer">
          <Link className="btn ghost sm" href="/">
            <Icon name="arrow" size={14} />
            <span>Return to public website</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
