import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/leermomenten', '/resultaten', '/privacy', '/voorwaarden'],
        disallow: ['/home', '/profiel', '/vakken', '/wrapped', '/week', '/pomodoro', '/agenda', '/api/'],
      },
    ],
    sitemap: 'https://myknowl.com/sitemap.xml',
  }
}
