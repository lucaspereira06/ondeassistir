'use client'

import React, { useState, useMemo, useRef, useEffect, MouseEvent as ReactMouseEvent } from 'react'
import styles from '@/app/page.module.css'
import { Filter, Trophy, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import AdSlot from '@/components/AdSlot'
import MatchCard from '@/components/MatchCard'
import { Fixture } from '@/types'

type DateOption = {
  dateStr: string // YYYY-MM-DD
  label: string
}

interface HomeClientProps {
  initialPartidas: Fixture[]
}

function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const onMouseDown = (e: ReactMouseEvent) => {
    if (!ref.current) return
    setIsMouseDown(true)
    setIsDragging(false)
    setStartX(e.pageX - ref.current.offsetLeft)
    setScrollLeft(ref.current.scrollLeft)
  }

  const onMouseLeave = () => {
    setIsMouseDown(false)
    setIsDragging(false)
  }

  const onMouseUp = () => {
    setIsMouseDown(false)
    setTimeout(() => setIsDragging(false), 0)
  }

  const onMouseMove = (e: ReactMouseEvent) => {
    if (!isMouseDown || !ref.current) return
    const x = e.pageX - ref.current.offsetLeft
    const walk = (x - startX) * 2
    if (Math.abs(walk) > 10) setIsDragging(true)
    if (isDragging) {
      e.preventDefault()
      ref.current.scrollLeft = scrollLeft - walk
    }
  }

  return { ref, isDragging, onMouseDown, onMouseLeave, onMouseUp, onMouseMove }
}

export default function HomeClient({ initialPartidas }: HomeClientProps) {
  const formatterDateOnly = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
  const todayStr = formatterDateOnly.format(new Date())

  const [filterDate, setFilterDate] = useState<string>(todayStr)
  const [filterTeam, setFilterTeam] = useState<string>('all')
  const [filterChamp, setFilterChamp] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  const dragFilters = useDragScroll()
  const dragCarousel = useDragScroll()

  // Generate date tabs
  const dateTabs: DateOption[] = useMemo(() => {
    const tabs: DateOption[] = []
    const now = new Date()
    for (let i = -1; i < 6; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      const dateStr = formatterDateOnly.format(d)

      let label = ''
      if (i === -1) label = `Ontem, ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}`
      else if (i === 0) label = `Hoje, ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}`
      else if (i === 1) label = `Amanhã, ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}`
      else {
        const weekdayName = d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')
        const capitalized = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1)
        label = `${capitalized}, ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}`
      }
      tabs.push({ dateStr, label })
    }
    return tabs
  }, [])

  const { uniqueTeams, uniqueChamps } = useMemo(() => {
    const teams = new Set<string>()
    const champs = new Set<string>()
    initialPartidas.forEach(p => {
      if (p.home_team) teams.add(p.home_team.popular_name || p.home_team.name)
      if (p.away_team) teams.add(p.away_team.popular_name || p.away_team.name)
      if (p.competition) champs.add(p.competition.name)
    })
    return {
      uniqueTeams: Array.from(teams).sort(),
      uniqueChamps: Array.from(champs).sort()
    }
  }, [initialPartidas])

  const filtered = useMemo(() => {
    return initialPartidas.filter(p => {
      if (!p.start_at) return false

      const matchDateObj = new Date(p.start_at)
      const matchDate = formatterDateOnly.format(matchDateObj)

      if (filterDate !== 'all' && matchDate !== filterDate) return false
      if (filterChamp !== 'all' && p.competition?.name !== filterChamp) return false

      if (filterTeam !== 'all') {
        const hName = p.home_team?.popular_name || p.home_team?.name
        const aName = p.away_team?.popular_name || p.away_team?.name
        if (hName !== filterTeam && aName !== filterTeam) return false
      }

      if (searchTerm.trim() !== '') {
        const search = searchTerm.toLowerCase().trim()
        const hName = (p.home_team?.popular_name || p.home_team?.name || '').toLowerCase()
        const aName = (p.away_team?.popular_name || p.away_team?.name || '').toLowerCase()
        const cName = (p.competition?.name || '').toLowerCase()
        if (!hName.includes(search) && !aName.includes(search) && !cName.includes(search)) {
          return false
        }
      }

      return true
    })
  }, [initialPartidas, filterDate, filterChamp, filterTeam, searchTerm])

  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const getMatchStatus = (start_at: string): 'upcoming' | 'live' | 'finished' => {
    if (!now) return 'upcoming' // SSR Default
    const matchTime = new Date(start_at).getTime()
    const duration = 130 * 60 * 1000 // 130 mins
    if (now > matchTime + duration) return 'finished'
    if (now >= matchTime && now <= matchTime + duration) return 'live'
    return 'upcoming'
  }

  const getChampPriority = (champName: string | undefined): number => {
    if (!champName) return 99
    const lower = champName.toLowerCase()
    if (lower.includes('libertadores')) return 1
    if (lower === 'campeonato brasileiro' || lower === 'campeonato brasileiro série a' || lower === 'brasileirão') return 2
    if (lower.includes('sul-americana')) return 3
    if (lower.includes('copa do brasil')) return 4
    if (lower.includes('liga dos campeões') || lower.includes('champions league')) return 5
    if (lower.includes('série b')) return 6
    return 99
  }

  const { carouselMatches, normalMatches, finishedMatches } = useMemo(() => {
    const normal: Fixture[] = []
    const finished: Fixture[] = []

    // Lista normal e encerrados obedecem aos filtros da tela
    filtered.forEach(p => {
      const status = getMatchStatus(p.start_at)
      if (status === 'finished') {
        finished.push(p)
      } else {
        normal.push(p)
      }
    })

    // Carrossel consome apenas jogos de HOJE que não estão encerrados
    const carouselCandidates = initialPartidas.filter(p => {
      if (getMatchStatus(p.start_at) === 'finished') return false

      const matchDateObj = new Date(p.start_at)
      const matchDateStr = formatterDateOnly.format(matchDateObj)
      return matchDateStr === todayStr
    })

    carouselCandidates.sort((a, b) => {
      const statusA = getMatchStatus(a.start_at)
      const statusB = getMatchStatus(b.start_at)

      // 1. Ao Vivo primeiro
      if (statusA === 'live' && statusB !== 'live') return -1
      if (statusB === 'live' && statusA !== 'live') return 1

      // 2. Prioridade do Campeonato
      const prioA = getChampPriority(a.competition?.name)
      const prioB = getChampPriority(b.competition?.name)
      if (prioA !== prioB) return prioA - prioB

      // 3. Cronologia
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    })

    return {
      carouselMatches: carouselCandidates.slice(0, 15),
      normalMatches: normal,
      finishedMatches: finished.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()) // Most recent finished first
    }
  }, [filtered, initialPartidas, now])

  // Group normal matches by championship
  const grouped = useMemo(() => {
    const map = new Map<string, Fixture[]>()
    normalMatches.forEach(p => {
      const champName = p.competition?.name || 'Outros'
      if (!map.has(champName)) map.set(champName, [])
      map.get(champName)!.push(p)
    })
    return Array.from(map.entries())
  }, [normalMatches])

  return (
    <main className={`container animate-enter`}>
      <header>
        <h1 className="title">Encontre o jogo do seu time</h1>
        <p className="subtitle">Descubra em qual canal vai passar o jogo em segundos.</p>
      </header>

      <AdSlot height="90px" responsive={false} />

      {carouselMatches.length > 0 && (
        <div>
          <div style={{ marginBottom: '2rem', marginLeft: '-1rem', marginRight: '-1rem', position: 'relative' }}>
            <h2 className={styles.championshipTitle} style={{ paddingLeft: '1rem', borderBottom: 'none', marginBottom: '0.5rem' }}>
              Destaques
            </h2>

            <button
              className={`${styles.carouselArrow} ${styles.left}`}
              onClick={() => dragCarousel.ref.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              aria-label="Rolar para a esquerda"
            >
              <ChevronLeft size={24} />
            </button>

            <div
              className={`${styles.carouselWrapper} ${dragCarousel.isDragging ? styles.dragging : ''}`}
              style={{ paddingLeft: '1rem', paddingRight: '1rem' }}
              ref={dragCarousel.ref}
              onMouseDown={dragCarousel.onMouseDown}
              onMouseLeave={dragCarousel.onMouseLeave}
              onMouseUp={dragCarousel.onMouseUp}
              onMouseMove={dragCarousel.onMouseMove}
            >
              {carouselMatches.map(p => (
                <div key={`car-${p.id}`} className={styles.carouselCard}>
                  <MatchCard partida={p} status={getMatchStatus(p.start_at)} showChampionship={true} />
                </div>
              ))}
            </div>

            <button
              className={`${styles.carouselArrow} ${styles.right}`}
              onClick={() => dragCarousel.ref.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              aria-label="Rolar para a direita"
            >
              <ChevronRight size={24} />
            </button>
          </div>
          <AdSlot height="90px" responsive={false} />
        </div>
      )}

      <div className={styles.searchWrapper}>
        <Search className={styles.searchIcon} size={20} />
        <input
          type="text"
          placeholder="Buscar time, campeonato..."
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={styles.filtersWrapper}>
        <div
          className={`${styles.filters} ${dragFilters.isDragging ? styles.dragging : ''}`}
          ref={dragFilters.ref}
          onMouseDown={dragFilters.onMouseDown}
          onMouseLeave={dragFilters.onMouseLeave}
          onMouseUp={dragFilters.onMouseUp}
          onMouseMove={dragFilters.onMouseMove}
        >
          {dateTabs.map(tab => (
            <button
              key={tab.dateStr}
              className={`${styles.dateTab} ${filterDate === tab.dateStr ? styles.active : ''}`}
              onClick={() => setFilterDate(tab.dateStr)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.advancedFiltersToggle}>
        <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className={styles.toggleBtn}>
          <Filter size={18} />
          {isFiltersOpen ? 'Ocultar Filtros' : 'Refinar Busca'}
        </button>
      </div>

      {isFiltersOpen && (
        <div className={styles.combos}>
          <select
            className={styles.select}
            value={filterChamp}
            onChange={e => setFilterChamp(e.target.value)}
          >
            <option value="all">Todos os Campeonatos</option>
            {uniqueChamps.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            className={styles.select}
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value)}
          >
            <option value="all">Todos os Times</option>
            {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.content}>
          {grouped.length === 0 && normalMatches.length === 0 && finishedMatches.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhuma partida encontrada para estes filtros.
            </div>
          )}

          {grouped.map(([champName, matches]) => (
            <div key={champName} className={styles.championshipGroup}>
              <h2 className={styles.championshipTitle}><Trophy size={24} /> {champName}</h2>
              <div className={styles.grid}>
                {(() => {
                  const items: React.ReactNode[] = []
                  const N = matches.length

                  let middleAdIdx = -1
                  if (N >= 3 && N % 2 === 0) {
                    middleAdIdx = Math.floor(N / 2) - 1
                    if (middleAdIdx % 2 === 0) {
                      middleAdIdx += 1
                    }
                  }

                  matches.forEach((partida, idx) => {
                    items.push(<MatchCard key={partida.id} partida={partida} status={getMatchStatus(partida.start_at)} />)

                    if (idx === middleAdIdx) {
                      items.push(
                        <AdSlot key={`ad-mid-${idx}`} height="100%" className={styles.inFeedAd} />
                      )
                    }
                  })

                  if (N >= 3) {
                    items.push(
                      <AdSlot key={`ad-end-${champName}`} height="100%" className={styles.inFeedAd} />
                    )
                  }

                  return items
                })()}
              </div>
            </div>
          ))}

          {finishedMatches.length > 0 && (
            <div className={styles.championshipGroup} style={{ marginTop: '3rem' }}>
              <h2 className={styles.championshipTitle} style={{ opacity: 0.7 }}>
                Jogos Encerrados
              </h2>
              <div className={styles.grid}>
                {finishedMatches.map((partida) => (
                  <MatchCard key={`fin-${partida.id}`} partida={partida} status="finished" showChampionship={true} />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className={styles.sidebar}>
          <AdSlot width="300px" height="600px" format="vertical" hideOnMobile />
        </aside>
      </div>

      <AdSlot height="60px" isSticky responsive={false} />
    </main>
  )
}
