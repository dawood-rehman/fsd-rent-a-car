'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/Icon'
import { api } from './api'

export default function AdminLogin() {
  const router = useRouter()
  const [pw, setPw] = useState('')
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
          <p>Rent a Car Faisalabad · Fleet & Website Management</p>
        </div>

        <form onSubmit={login} className="adm-login-form">
          <label className="adm-field">
            <span className="adm-label">Admin Password</span>
            <input
              type="password"
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
          </label>

          {msg && (
            <div className="adm-alert err">
              <Icon name="alert" size={16} />
              <span>{msg}</span>
            </div>
          )}

          <button className="btn copper lg w-full" type="submit" disabled={busy}>
            <span>{busy ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
          </button>
        </form>

        <div className="adm-login-footer">
          <a className="btn ghost sm" href="/">
            <Icon name="arrow" size={14} />
            <span>Return to public website</span>
          </a>
        </div>
      </div>
    </main>
  )
}
