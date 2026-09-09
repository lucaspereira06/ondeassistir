import { ImageResponse } from 'next/og'
import { supabase } from '@/lib/supabase'

export const alt = 'Onde Assistir - Capa da Partida'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  const { data } = await supabase
    .from('fixtures')
    .select(`
      start_at,
      competition:competitions(name),
      home_team:teams!home_team_id(name, popular_name, logo_url),
      away_team:teams!away_team_id(name, popular_name, logo_url)
    `)
    .eq('slug', slug)
    .single()

  const partida = data as any

  if (!partida) {
    return new ImageResponse(
      (
        <div style={{ background: '#09090b', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 64, fontWeight: 'bold' }}>
          Onde Assistir?
        </div>
      )
    )
  }

  const hName = partida.home_team?.popular_name || partida.home_team?.name || 'Mandante'
  const aName = partida.away_team?.popular_name || partida.away_team?.name || 'Visitante'
  const cName = partida.competition?.name || 'Onde Assistir?'
  
  const formatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
  const dateStr = partida.start_at ? formatter.format(new Date(partida.start_at)) : 'Em breve'

  return new ImageResponse(
    (
      <div style={{
        background: 'linear-gradient(135deg, #09090b 0%, #1e1b4b 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          display: 'flex',
          fontSize: 36,
          color: '#60a5fa',
          marginBottom: 40,
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: 'uppercase'
        }}>
          {cName}
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 60
        }}>
          {/* Home Team */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 300 }}>
            {partida.home_team?.logo_url ? (
              <img src={partida.home_team.logo_url} width={200} height={200} style={{ objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 200, height: 200, background: '#333', borderRadius: 100 }} />
            )}
            <span style={{ fontSize: 40, fontWeight: 'bold', marginTop: 30, textAlign: 'center', lineHeight: 1.2 }}>
              {hName}
            </span>
          </div>

          <div style={{ fontSize: 64, fontWeight: 'bold', color: '#6b7280', margin: '0 20px', paddingBottom: 60 }}>
            X
          </div>

          {/* Away Team */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 300 }}>
            {partida.away_team?.logo_url ? (
              <img src={partida.away_team.logo_url} width={200} height={200} style={{ objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 200, height: 200, background: '#333', borderRadius: 100 }} />
            )}
            <span style={{ fontSize: 40, fontWeight: 'bold', marginTop: 30, textAlign: 'center', lineHeight: 1.2 }}>
              {aName}
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          fontSize: 48,
          fontWeight: 'bold',
          marginTop: 60,
          background: 'white',
          color: '#09090b',
          padding: '16px 48px',
          borderRadius: 999
        }}>
          {dateStr}
        </div>
      </div>
    ),
    { ...size }
  )
}
