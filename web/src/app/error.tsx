'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import styles from '@/app/page.module.css'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className={styles.main}>
      <div className="container" style={{ textAlign: 'center', marginTop: '6rem', marginBottom: '6rem' }}>
        <AlertCircle size={64} color="#ef4444" style={{ margin: '0 auto 2rem auto', opacity: 0.8 }} />
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Ops! Algo deu errado</h1>
        <p style={{ marginBottom: '3rem', maxWidth: '500px', margin: '0 auto 3rem auto', color: 'var(--text-muted)' }}>
          Tivemos um problema inesperado ao carregar os dados. Nossa equipe técnica já foi notificada.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={() => reset()}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              padding: '1rem 2rem',
              borderRadius: '999px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Tentar novamente
          </button>
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
            Ir para a Home
          </Link>
        </div>
      </div>
    </main>
  )
}
