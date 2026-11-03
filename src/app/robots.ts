import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/leermomenten', '/resultaten', '/privacy', '/voorwaarden', '/about', '/contact', '/llms.txt'],
        disallow: ['/home', '/profiel', '/vakken', '/wrapped', '/week', '/pomodoro', '/agenda', '/api/'],
      },
    ],
    sitemap: 'https://www.myknowl.com/sitemap.xml',
  }
}
