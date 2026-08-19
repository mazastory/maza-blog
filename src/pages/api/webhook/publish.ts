import type { APIContext } from 'astro';
import { getSiteConfig, getPostBySlug, getRequestDomain } from '../../../lib/api';

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    // [FIX] 인증 없이 누구나 slug만 알면 외부 웹훅(Zapier 등)을 반복 트리거할 수 있었다.
    // INTERNAL_WEBHOOK_SECRET이 설정된 경우에만 강제 — 기존 연동을 깨지 않기 위해
    // 미설정 시엔 기존처럼 동작하되, 설정을 강력히 권장한다.
    const expectedSecret = import.meta.env.INTERNAL_WEBHOOK_SECRET;
    if (expectedSecret) {
      const providedSecret = context.request.headers.get('x-webhook-secret');
      if (providedSecret !== expectedSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
    }

    const domain = getRequestDomain(context.request);
    const body = await context.request.json();
    const { slug, locale } = body;

    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug is required' }), { status: 400 });
    }

    // 1. 설정 가져오기 (webhook_url이 있는지 확인)
    const siteConfig = await getSiteConfig(domain);
    const webhookUrl = siteConfig?.metadata?.webhook_url;

    if (!webhookUrl) {
      return new Response(JSON.stringify({ message: 'No webhook_url configured for this site.' }), { status: 200 });
    }

    // 2. 승인된 포스트 정보 가져오기
    const post = await getPostBySlug(slug, domain, locale || 'ko');
    if (!post) {
      return new Response(JSON.stringify({ error: 'Post not found or not approved' }), { status: 404 });
    }

    // 3. Zapier / Make.com 등 외부 Webhook으로 보낼 페이로드 구성
    const payload = {
      event: 'post_published',
      site_domain: domain,
      site_name: siteConfig.blog_name,
      post: {
        id: post.id,
        title: post.title,
        url: `https://${domain}/${locale !== 'ko' ? locale + '/' : ''}${post.slug}`,
        description: post.metadata?.description || post.content.substring(0, 150),
        thumbnail_url: post.metadata?.thumbnail_url,
        hashtags: post.metadata?.hashtags || [],
        category: post.metadata?.category,
        language: locale || 'ko',
        published_at: post.created_at
      }
    };

    // 4. 외부 Webhook으로 POST 요청
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Failed to trigger external webhook:', await response.text());
      return new Response(JSON.stringify({ error: 'Failed to trigger external webhook' }), { status: 502 });
    }

    return new Response(JSON.stringify({ success: true, message: 'Webhook triggered successfully' }), { status: 200 });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
