import React from 'react'
import { supabase } from '@/lib/supabase'
import styles from '@/app/page.module.css'
import MatchCard from '@/components/MatchCard'
import AdSlot from '@/components/AdSlot'
import Link from 'next/link'
import { ChevronRight, Trophy } from 'lucide-react'

export const revalidate = 0

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: comp } = await supabase.from('competitions').select('name').eq('slug', slug).single()
  if (!comp) return { title: 'Campeonato não encontrado | Onde Assistir' }
  return {
    title: `${comp.name}: jogos e onde assistir | Onde Assistir`,
    description: `Confira a tabela de próximos jogos da ${comp.name} e saiba onde assistir ao vivo na TV e Streaming.`,
    alternates: {
      canonical: `/campeonato/${slug}`,
    },
  }
}

export default async function CampeonatoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: comp } = await supabase.from('competitions').select('*').eq('slug', slug).single()
  
  if (!comp) {
    return (
      <main className={styles.main}>
        <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
          <h1>Campeonato não encontrado</h1>
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
    .eq('competition_id', comp.id)
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })

  return (
    <main className={styles.main}>
      <div className="container">
        <AdSlot height="90px" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          <Link href="/">Início</Link>
          <ChevronRight size={14} />
          <span>Campeonatos</span>
          <ChevronRight size={14} />
          <span>{comp.name}</span>
        </div>

        <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '50%' }}>
            <Trophy size={32} color="var(--primary)" />
          </div>
          <div>
            <h1 className="title">{comp.name}</h1>
            <p className="subtitle">Saiba onde assistir os próximos jogos.</p>
          </div>
        </header>

        <div className={styles.layout}>
          <div className={styles.content}>
            {!matches || matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Nenhum jogo programado para {comp.name} no momento.
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
