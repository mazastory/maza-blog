# Performance Strategy: Static vs SSR (Short)

## Summary
- If your content changes infrequently and you can accept build-time generation, switch to `output: 'static'` (SSG) — provides the biggest improvement in TTFB and page navigation speed because pages are served as static assets from CDN.
- If you need dynamic runtime rendering (per-request personalization, frequent updates), keep SSR but apply aggressive CDN caching (`s-maxage`, `stale-while-revalidate`) or use an ISR/edge approach.

## Pros/Cons
- Static (SSG)
  - Pros: fastest TTFB, simpler CDN caching, low runtime cost.
  - Cons: rebuild time on content changes (mitigate with incremental builds or partial deploys).

- SSR (Server)
  - Pros: fresh content per request, easy personalization.
  - Cons: higher TTFB, cold starts on serverless, complexity for caching.

## Recommendation
1. Prefer SSG (`output: 'static'`) if posts are published via CI/GitHub Actions after user approval (fits your pipeline). Use short rebuilds for new posts.
2. If you must keep SSR, ensure every page uses `Cache-Control` with `s-maxage` and `stale-while-revalidate`, and consider running on an edge runtime (Cloudflare Workers, Vercel Edge) to reduce network latency.

## Quick Steps
- Test switching `astro.config.mjs` `output: 'static'` locally and run a full build to measure build time and resulting site size.
- If SSG is not feasible, use CDN caching and set `Cache-Control` headers globally (already applied in layout).

