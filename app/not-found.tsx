import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="adm">
      <div className="box">
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist.</p>
        <Link className="btn copper" href="/">Back to home</Link>
      </div>
    </main>
  )
}
