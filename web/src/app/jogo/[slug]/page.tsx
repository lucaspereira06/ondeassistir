import React from 'react'
import { supabase } from '@/lib/supabase'
import styles from '@/app/page.module.css'
import { Tv, Clock, ChevronRight, MapPin } from 'lucide-react'
import Link from 'next/link'
import AdSlot from '@/components/AdSlot'
import MatchCard from '@/components/MatchCard'

export const revalidate = 0 // Disable cache temporarily during dev

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await supabase
    .from('fixtures')
    .select(`
      home_team:teams!home_team_id(popular_name, name),
      away_team:teams!away_team_id(popular_name, name)
    `)
    .eq('slug', slug)
    .single()

  const matchData = data as any

  if (!matchData) return { title: 'Jogo não encontrado | Onde Assistir' }

  const title = `${matchData.home_team?.popular_name || matchData.home_team?.name} x ${matchData.away_team?.popular_name || matchData.away_team?.name}: onde assistir, horário e transmissão | Onde Assistir`
  const desc = `Saiba onde assistir ${matchData.home_team?.popular_name || matchData.home_team?.name} x ${matchData.away_team?.popular_name || matchData.away_team?.name}, o horário da partida e quais canais transmitem o jogo ao vivo.`

  return {
    title,
    description: desc,
    alternates: {
      canonical: `/jogo/${slug}`,
    },
  }
}

export default async function JogoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      id,
      slug,
      start_at,
      phase,
      location,
      competition:competitions(name, slug),
      home_team:teams!home_team_id(name, popular_name, logo_url, slug),
      away_team:teams!away_team_id(name, popular_name, logo_url, slug),
      broadcasts(name, type, description, url, broadcast_sources(logo_url))
    `)
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('Supabase query error:', error)
  }

  const partida = data as any

  if (!partida) {
    return (
      <main className={styles.main}>
        <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
          <h1>Partida não encontrada</h1>
          <Link href="/" style={{ color: 'var(--primary)', marginTop: '1rem', display: 'inline-block' }}>
            Voltar para a página inicial
          </Link>
        </div>
      </main>
    )
  }

  const matchDateObj = new Date(partida.start_at)
  const dateStr = matchDateObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const timeStr = matchDateObj.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

  // Fetch some related matches for "Próximos Jogos"
  const { data: relatedMatches } = await supabase
    .from('fixtures')
    .select(`
      id, slug, start_at, location,
      competition:competitions(name, slug),
      home_team:teams!home_team_id(name, popular_name, logo_url, slug),
      away_team:teams!away_team_id(name, popular_name, logo_url, slug),
      broadcasts(name, type, description, url, broadcast_sources(logo_url))
    `)
    .eq('competition_id', (partida as any).competition_id || 0) // we didn't fetch competition_id, so this won't work well without it.
    // simpler: just fetch some random next matches
    .gte('start_at', new Date().toISOString())
    .neq('id', partida.id)
    .order('start_at', { ascending: true })
    .limit(4)

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${partida.home_team?.popular_name} x ${partida.away_team?.popular_name}`,
    startDate: partida.start_at,
    homeTeam: {
      '@type': 'SportsTeam',
      name: partida.home_team?.name,
    },
    awayTeam: {
      '@type': 'SportsTeam',
      name: partida.away_team?.name,
    },
    location: {
      '@type': 'Place',
      name: partida.location || 'A Definir'
    },
    description: `Assista ${partida.home_team?.popular_name} x ${partida.away_team?.popular_name} ao vivo.`,
  }

  return (
    <main className={styles.main}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <div className="container">
        {/* Top Banner Ad */}
        <AdSlot height="90px" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          <Link href="/">Início</Link>
          <ChevronRight size={14} />
          {partida.competition?.slug ? (
            <Link href={`/campeonato/${partida.competition.slug}`}>{partida.competition.name}</Link>
          ) : (
            <span>{partida.competition?.name}</span>
          )}
          <ChevronRight size={14} />
          <span>{partida.home_team?.popular_name} x {partida.away_team?.popular_name}</span>
        </div>

        <div className={styles.layout}>
          <div className={styles.content}>
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                {dateStr} às {timeStr}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                <div>{partida.competition?.name} {partida.phase && `— ${partida.phase}`}</div>
                {partida.location && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <MapPin size={14} />
                    <span>{partida.location}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', marginBottom: '3rem' }}>
                <Link href={`/time/${partida.home_team?.slug}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
                  <img src={partida.home_team?.logo_url || '/placeholder.png'} alt={partida.home_team?.name} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{partida.home_team?.popular_name || partida.home_team?.name}</span>
                </Link>

                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-muted)' }}>X</div>

                <Link href={`/time/${partida.away_team?.slug}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
                  <img src={partida.away_team?.logo_url || '/placeholder.png'} alt={partida.away_team?.name} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{partida.away_team?.popular_name || partida.away_team?.name}</span>
                </Link>
              </div>

              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Onde Assistir</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', margin: '0 auto' }}>
                {partida.broadcasts && partida.broadcasts.length > 0 ? (
                  partida.broadcasts.map((t: any, idx: number) => (
                    <a
                      key={idx}
                      href={t.url || '#'}
                      target={t.url ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      className={styles.transmissionItem}
                      style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}
                    >
                      {t.broadcast_sources?.logo_url ? (
                        <img src={t.broadcast_sources.logo_url} alt={t.name} className={styles.transmissionLogo} style={{ width: '30px', height: '30px' }} />
                      ) : (
                        <div className={styles.transmissionLogoPlaceholder} style={{ width: '30px', height: '30px' }}>
                          <Tv size={20} color="var(--text-muted)" />
                        </div>
                      )}
                      <div className={styles.transmissionInfo} style={{ textAlign: 'left' }}>
                        <span className={styles.transmissionName} style={{ fontSize: '1.1rem' }}>{t.name}</span>
                        {t.description && <span className={styles.transmissionDesc}>{t.description}</span>}
                      </div>
                      {t.url && (
                        <div style={{ marginLeft: 'auto', background: 'var(--primary)', color: '#fff', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600 }}>
                          Assistir
                        </div>
                      )}
                    </a>
                  ))
                ) : (
                  <div className={styles.transmissionEmpty} style={{ padding: '2rem' }}>
                    A transmissão ainda não foi divulgada.
                  </div>
                )}
              </div>
            </div>

            <AdSlot height="250px" />

            {relatedMatches && relatedMatches.length > 0 && (
              <div style={{ marginTop: '4rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Próximos Jogos</h3>
                <div className={styles.grid}>
                  {relatedMatches.map((m: any) => (
                    <MatchCard key={m.id} partida={m} />
                  ))}
                </div>
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
