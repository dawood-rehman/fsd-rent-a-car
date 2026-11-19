import { adminConfigured, isAdmin } from '@/lib/auth'
import { readDb, storageMode } from '@/lib/db'
import AdminLogin from '@/components/admin/AdminLogin'
import AdminPanel from '@/components/admin/AdminPanel'

export const dynamic = 'force-dynamic'

export default async function Admin() {
  if (!adminConfigured()) {
    return (
      <main className="adm">
        <div className="box">
          <h1>Admin not configured</h1>
          <p>Create a file named <code>.env.local</code> in the project folder with the line <code>ADMIN_PASSWORD=your-password</code>, then restart the server.</p>
        </div>
      </main>
    )
  }
  if (!(await isAdmin())) return <AdminLogin />
  try {
    return <AdminPanel initial={await readDb()} storage={storageMode()} />
  } catch {
    return (
      <main className="adm">
        <div className="box">
          <h1>Storage problem</h1>
          <p>Could not read your stored data. Check <code>data/db.json</code> (or your Supabase credentials in <code>.env.local</code>) and reload.</p>
        </div>
      </main>
    )
  }
}
