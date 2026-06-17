import type { APIRoute } from 'astro';
export const prerender = false;
import { supabase } from '../../lib/supabase';
import { getRequestDomain } from '../../lib/api';

export const POST: APIRoute = async ({ request }) => {
  try {
    const domain = getRequestDomain(request);
    
    // JSON Payload parsing
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400 });
    }

    const { postId, scrollDepth, timeSpentMs, adVariant } = body;

    if (!postId) {
      return new Response(JSON.stringify({ error: 'postId is required' }), { status: 400 });
    }

    // Insert analytics data into Supabase
    // Note: The `analytics` table must be created in the database first.
    const { error } = await supabase.from('analytics').insert([{
      post_id: postId,
      domain: domain,
      scroll_depth: scrollDepth || 0,
      time_spent_ms: timeSpentMs || 0,
      ad_variant: adVariant,
      created_at: new Date().toISOString()
    }]);

    if (error) {
      console.error('Analytics Insert Error:', error);
      return new Response(JSON.stringify({ error: 'Database insertion failed' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Analytics API Route Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
