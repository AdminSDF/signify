import { type MetadataRoute } from 'next'
import { initialWheelConfigs } from '@/lib/appConfig';
 
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = 'https://studio--spinify-m348p.us-central1.hosted.app'; // NOTE: This should be replaced with your production domain 'https://spinify.fun' later.
 
  const staticPages = [
    '/',
    '/login',
    '/forgot-password',
    '/leaderboard',
    '/transactions',
    '/profile',
    '/help',
  ].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '/' ? 1 : 0.8,
  }));

  const gamePages = Object.keys(initialWheelConfigs).map((tierId) => ({
    url: `${siteUrl}/game/${tierId}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));
 
  return [...staticPages, ...gamePages];
}