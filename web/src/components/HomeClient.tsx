'use client'

import React, { useState, useMemo, useRef, MouseEvent as ReactMouseEvent } from 'react'
import styles from '@/app/page.module.css'
import { Filter, Trophy } from 'lucide-react'
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

export default function HomeClient({ initialPartidas }: HomeClientProps) {
  const formatterDateOnly = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
  const todayStr = formatterDateOnly.format(new Date())

  const [filterDate, setFilterDate] = useState<string>(todayStr)
  const [filterTeam, setFilterTeam] = useState<string>('all')
  const [filterChamp, setFilterChamp] = useState<string>('all')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  // Drag to scroll logic
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const onMouseDown = (e: ReactMouseEvent) => {
    if (!scrollRef.current) return
    setIsMouseDown(true)
    setIsDragging(false)
    setStartX(e.pageX - scrollRef.current.offsetLeft)
    setScrollLeft(scrollRef.current.scrollLeft)
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
    if (!isMouseDown || !scrollRef.current) return
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 2

    // Threshold to prevent accidental drags on clicks
    if (Math.abs(walk) > 10) {
      setIsDragging(true)
    }

    if (isDragging) {
      e.preventDefault()
      scrollRef.current.scrollLeft = scrollLeft - walk
    }
  }

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

      return true
    })
  }, [initialPartidas, filterDate, filterChamp, filterTeam])

  // Group by championship
  const grouped = useMemo(() => {
    const map = new Map<string, Fixture[]>()
    filtered.forEach(p => {
      const champName = p.competition?.name || 'Outros'
      if (!map.has(champName)) map.set(champName, [])
      map.get(champName)!.push(p)
    })
    return Array.from(map.entries())
  }, [filtered])

  return (
    <main className={`container animate-enter`}>
      <header>
        <h1 className="title">Onde Assistir?</h1>
        <p className="subtitle">Descubra em qual canal vai passar o jogo do seu time em segundos.</p>
      </header>

      <AdSlot height="90px" />

      <div className={styles.filtersWrapper}>
        <div 
          className={`${styles.filters} ${isDragging ? styles.dragging : ''}`}
          ref={scrollRef}
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseLeave}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
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
          {grouped.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhuma partida encontrada para estes filtros.
            </div>
          )}
          
          {grouped.map(([champName, matches]) => (
            <div key={champName} className={styles.championshipGroup}>
              <h2 className={styles.championshipTitle}><Trophy size={24} /> {champName}</h2>
              <div className={styles.grid}>
                {matches.map((partida, idx) => {
                  return (
                    <React.Fragment key={partida.id}>
                      <MatchCard partida={partida} />
                      {(idx + 1) % 6 === 0 && (
                        <AdSlot height="250px" className={styles.inFeedAd} />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <aside className={styles.sidebar}>
          <AdSlot width="300px" height="600px" hideOnMobile />
        </aside>
      </div>

      <AdSlot height="60px" isSticky />
    </main>
  )
}
