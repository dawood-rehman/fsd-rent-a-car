import Link from 'next/link'
import Icon from '@/components/Icon'

export default function NotFound() {
  return (
    <main className="adm-login-page">
      <div className="adm-state-card">
        <div className="adm-login-badge-icon">
          <Icon name="car" size={28} />
        </div>
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist or may have been moved.</p>
        <Link className="btn copper lg" href="/">
          Back to home
        </Link>
      </div>
    </main>
  )
}
