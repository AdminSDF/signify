import { type MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const siteUrl = 'https://studio--spinify-m348p.us-central1.hosted.app'; // NOTE: This should be replaced with your production domain 'https://spinify.fun' later.
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}