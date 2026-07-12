import type { APIRoute } from 'astro';
import { getRequestDomain } from '../../lib/api';

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  const domain = getRequestDomain(request);
  const url = request.url;

  return new Response(JSON.stringify({ domain, url, headers }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
};
