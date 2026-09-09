import Link from 'next/link'
import styles from '@/app/page.module.css'
import { Tv } from 'lucide-react'

export default function NotFound() {
  return (
    <main className={styles.main}>
      <div className="container" style={{ textAlign: 'center', marginTop: '6rem', marginBottom: '6rem' }}>
        <Tv size={64} color="var(--primary)" style={{ margin: '0 auto 2rem auto', opacity: 0.8 }} />
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
        <h2 style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>Página não encontrada</h2>
        <p style={{ marginBottom: '3rem', maxWidth: '500px', margin: '0 auto 3rem auto', color: 'var(--text-muted)' }}>
          Desculpe, não conseguimos encontrar a partida, time ou campeonato que você está procurando. Pode ser que o link esteja quebrado ou o evento já tenha passado há muito tempo.
        </p>
        <Link href="/" style={{
          display: 'inline-block',
          background: 'var(--primary)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '999px',
          textDecoration: 'none',
          fontWeight: 600,
          boxShadow: '0 4px 14px 0 rgba(229, 9, 20, 0.39)'
        }}>
          Ver jogos de hoje
        </Link>
      </div>
    </main>
  )
}
