import React from 'react'
import { supabase } from '@/lib/supabase'
import styles from '@/app/page.module.css'
import MatchCard from '@/components/MatchCard'
import AdSlot from '@/components/AdSlot'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export const revalidate = 0

export const metadata = {
  title: 'Jogos de hoje: onde assistir ao vivo | Onde Assistir',
  description: 'Confira a lista completa de jogos de futebol hoje e saiba onde assistir cada partida ao vivo na TV ou Streaming.',
}

export default async function JogosHojePage() {
  const formatterDateOnly = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
  const todayStr = formatterDateOnly.format(new Date())
  
  const formatterDisplay = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long' })
  const todayDisplay = formatterDisplay.format(new Date())

  const { data: matches } = await supabase
    .from('fixtures')
    .select(`
      id, slug, start_at,
      competition:competitions(name, slug),
      home_team:teams!home_team_id(name, popular_name, logo_url, slug),
      away_team:teams!away_team_id(name, popular_name, logo_url, slug),
      broadcasts(name, type, description, url, broadcast_sources(logo_url))
    `)
    .gte('start_at', `${todayStr}T00:00:00-03:00`)
    .lte('start_at', `${todayStr}T23:59:59-03:00`)
    .order('start_at', { ascending: true })

  return (
    <main className={styles.main}>
      <div className="container">
        <AdSlot height="90px" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          <Link href="/">Início</Link>
          <ChevronRight size={14} />
          <span>Jogos de hoje</span>
        </div>

        <header style={{ marginBottom: '2rem' }}>
          <h1 className="title">Jogos de hoje — {todayDisplay}</h1>
          <p className="subtitle">Saiba onde assistir todas as partidas de futebol hoje.</p>
        </header>

        <div className={styles.layout}>
          <div className={styles.content}>
            {!matches || matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Nenhum jogo programado para hoje.
              </div>
            ) : (
              <div className={styles.grid}>
                {matches.map((m: any, idx: number) => (
                  <React.Fragment key={m.id}>
                    <MatchCard partida={m} />
                    {(idx + 1) % 6 === 0 && <AdSlot height="250px" className={styles.inFeedAd} />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          <aside className={styles.sidebar}>
            <AdSlot width="300px" height="600px" hideOnMobile />
          </aside>
        </div>
      </div>
      <AdSlot height="60px" isSticky />
    </main>
  )
}
