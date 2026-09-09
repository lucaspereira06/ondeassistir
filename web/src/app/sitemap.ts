import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

export const revalidate = 3600 // Cache sitemap for 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ondeassistirjogos.com'

  // Fetch all slugs
  const [{ data: fixtures }, { data: teams }, { data: competitions }] = await Promise.all([
    supabase.from('fixtures').select('slug, start_at').limit(5000),
    supabase.from('teams').select('slug').limit(1000),
    supabase.from('competitions').select('slug').limit(200)
  ])

  const sitemapData: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1,
    },
    {
      url: `${siteUrl}/jogos-hoje`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.9,
    },
  ]

  if (fixtures) {
    fixtures.forEach((f) => {
      sitemapData.push({
        url: `${siteUrl}/jogo/${f.slug}`,
        lastModified: f.start_at ? new Date(f.start_at) : new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      })
    })
  }

  if (teams) {
    teams.forEach((t) => {
      sitemapData.push({
        url: `${siteUrl}/time/${t.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    })
  }

  if (competitions) {
    competitions.forEach((c) => {
      sitemapData.push({
        url: `${siteUrl}/campeonato/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      })
    })
  }

  return sitemapData
}
