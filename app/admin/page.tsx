import Link from 'next/link'
import { adminConfigured, isAdmin } from '@/lib/auth'
import { readDb, readDbSafe, storageMode } from '@/lib/db'
import Icon from '@/components/Icon'
import AdminLogin from '@/components/admin/AdminLogin'
import AdminPanel from '@/components/admin/AdminPanel'

export const dynamic = 'force-dynamic'

export default async function Admin() {
  if (!adminConfigured()) {
    return (
      <main className="adm-login-page">
        <div className="adm-state-card">
          <div className="adm-login-badge-icon">
            <Icon name="alert" size={28} />
          </div>
          <h1>Admin not configured</h1>
          <p>
            Create a file named <code>.env.local</code> in the project folder with the line{' '}
            <code>ADMIN_PASSWORD=your-password</code>, then restart the server.
          </p>
          <Link className="btn ghost sm" href="/">
            Return to website
          </Link>
        </div>
      </main>
    )
  }
  if (!(await isAdmin())) {
    const { site } = await readDbSafe()
    return <AdminLogin siteName={site.name} />
  }
  try {
    return <AdminPanel initial={await readDb()} storage={storageMode()} />
  } catch {
    return (
      <main className="adm-login-page">
        <div className="adm-state-card">
          <div className="adm-login-badge-icon">
            <Icon name="alert" size={28} />
          </div>
          <h1>Storage problem</h1>
          <p>
            Could not read your stored data. Check <code>data/db.json</code> (or your Supabase credentials in{' '}
            <code>.env.local</code>) and reload.
          </p>
          <Link className="btn copper sm" href="/admin">
            Reload panel
          </Link>
        </div>
      </main>
    )
  }
}
