import type { APIRoute } from 'astro';

import { getSiteConfig, getRequestDomain } from '../lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const domain = getRequestDomain(request);
  const siteConfig = await getSiteConfig(domain);
  const pubId = siteConfig?.adsense_pub;

  if (!pubId) {
    return new Response('No AdSense Publisher ID configured.', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // Generate ads.txt content
  const adsTxtContent = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0`;

  return new Response(adsTxtContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
