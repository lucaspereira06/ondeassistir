import React from 'react'
import { supabase } from '@/lib/supabase'
import HomeClient from '@/components/HomeClient'
import { Fixture } from '@/types'

export const revalidate = 0 // Disable cache temporarily during dev

export const metadata = {
  title: 'Onde Assistir? Futebol ao vivo hoje na TV e Streaming',
  description: 'Descubra em qual canal vai passar o jogo do seu time hoje. Agenda completa de transmissões de futebol ao vivo na TV e Streaming.',
}

export default async function Home() {
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      id,
      slug,
      start_at,
      competition:competitions(name, slug),
      home_team:teams!home_team_id(name, popular_name, logo_url, slug),
      away_team:teams!away_team_id(name, popular_name, logo_url, slug),
      broadcasts(name, type, description, url, broadcast_sources(logo_url))
    `)
    .order('start_at', { ascending: true })

  if (error) {
    console.error('Supabase error on Home:', error)
  }

  const partidas: Fixture[] = (data as any) || []

  return <HomeClient initialPartidas={partidas} />
}
