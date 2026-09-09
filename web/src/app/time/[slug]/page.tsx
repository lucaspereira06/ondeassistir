import React from 'react'
import { supabase } from '@/lib/supabase'
import styles from '@/app/page.module.css'
import MatchCard from '@/components/MatchCard'
import AdSlot from '@/components/AdSlot'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export const revalidate = 0

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: team } = await supabase.from('teams').select('name, popular_name').eq('slug', slug).single()
  if (!team) return { title: 'Time não encontrado | Onde Assistir' }
  const name = team.popular_name || team.name
  return {
    title: `Jogos do ${name} hoje e onde assistir ao vivo | Onde Assistir`,
    description: `Acompanhe os próximos jogos do ${name} e saiba em qual canal vai passar na TV e Streaming.`,
    alternates: {
      canonical: `/time/${slug}`,
    },
  }
}

export default async function TimePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: team } = await supabase.from('teams').select('*').eq('slug', slug).single()
  
  if (!team) {
    return (
      <main className={styles.main}>
        <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
          <h1>Time não encontrado</h1>
          <Link href="/">Voltar</Link>
        </div>
      </main>
    )
  }

  const { data: matches } = await supabase
    .from('fixtures')
    .select(`
      id, slug, start_at,
      competition:competitions(name, slug),
      home_team:teams!home_team_id(name, popular_name, logo_url, slug),
      away_team:teams!away_team_id(name, popular_name, logo_url, slug),
      broadcasts(name, type, description, url, broadcast_sources(logo_url))
    `)
    .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })

  const name = team.popular_name || team.name

  return (
    <main className={styles.main}>
      <div className="container">
        <AdSlot height="90px" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          <Link href="/">Início</Link>
          <ChevronRight size={14} />
          <span>Times</span>
          <ChevronRight size={14} />
          <span>{name}</span>
        </div>

        <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {team.logo_url && <img src={team.logo_url} alt={name} style={{ width: '60px', height: '60px' }} />}
          <div>
            <h1 className="title">Jogos do {name}</h1>
            <p className="subtitle">Saiba onde assistir os próximos jogos.</p>
          </div>
        </header>

        <div className={styles.layout}>
          <div className={styles.content}>
            {!matches || matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Nenhum jogo programado para o {name} no momento.
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
