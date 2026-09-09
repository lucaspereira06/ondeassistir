import React from 'react'
import Link from 'next/link'
import { Tv, Clock } from 'lucide-react'
import styles from '../app/page.module.css'
import { Fixture } from '../types'

interface MatchCardProps {
  partida: Fixture
}

export default function MatchCard({ partida }: MatchCardProps) {
  const matchDateObj = new Date(partida.start_at)
  const dateStr = matchDateObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const timeStr = matchDateObj.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  
  return (
    <div className={`glass-card ${styles.card}`}>
      <Link href={`/jogo/${partida.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className={styles.matchHeader}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
            <Clock size={16} /> {dateStr} às {timeStr}
          </span>
        </div>

        <div className={styles.teams}>
          <div className={styles.team}>
            <img src={partida.home_team?.logo_url || '/placeholder.png'} alt={partida.home_team?.popular_name || partida.home_team?.name} className={styles.teamLogo} />
            <span className={styles.teamName}>{partida.home_team?.popular_name || partida.home_team?.name}</span>
          </div>
          <div className={styles.vs}>X</div>
          <div className={styles.team}>
            <img src={partida.away_team?.logo_url || '/placeholder.png'} alt={partida.away_team?.popular_name || partida.away_team?.name} className={styles.teamLogo} />
            <span className={styles.teamName}>{partida.away_team?.popular_name || partida.away_team?.name}</span>
          </div>
        </div>
      </Link>

      <div className={styles.transmissions}>
        {partida.broadcasts && partida.broadcasts.length > 0 ? (
          partida.broadcasts.map((t, idx) => (
            <a
              key={idx}
              href={t.url || '#'}
              target={t.url ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className={styles.transmissionItem}
            >
              {t.broadcast_sources?.logo_url ? (
                <img src={t.broadcast_sources.logo_url} alt={t.name} className={styles.transmissionLogo} />
              ) : (
                <div className={styles.transmissionLogoPlaceholder}>
                  <Tv size={20} color="var(--text-muted)" />
                </div>
              )}
              <div className={styles.transmissionInfo}>
                <span className={styles.transmissionName}>{t.name}</span>
                {t.description && <span className={styles.transmissionDesc}>{t.description}</span>}
              </div>
            </a>
          ))
        ) : (
          <div className={styles.transmissionEmpty}>
            <Clock size={18} /> Aguardando Transmissão
          </div>
        )}
      </div>
    </div>
  )
}
