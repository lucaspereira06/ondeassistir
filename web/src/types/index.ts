export type Fixture = {
  id: string
  slug: string
  start_at: string
  competition: { name: string, slug: string }
  home_team: { name: string, popular_name: string, logo_url: string, slug: string }
  away_team: { name: string, popular_name: string, logo_url: string, slug: string }
  broadcasts: {
    name: string
    type: string
    description: string
    url: string
    broadcast_sources: { logo_url: string }
  }[]
}
