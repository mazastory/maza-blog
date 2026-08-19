import type { APIRoute } from 'astro';
import { getRequestDomain } from '../../lib/api';

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  // 프로덕션에서 인증 없이 요청 헤더를 그대로 노출하지 않도록 차단
  if (!import.meta.env.DEV) {
    return new Response('Not Found', { status: 404 });
  }

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
