import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vcaiezmfxvgavwcltqsu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYWllem1meHZnYXZ3Y2x0cXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzcwMzYsImV4cCI6MjA5Mjk1MzAzNn0.ppE6itBkU1j88qMci0HEIwKTuIRHbBBS8cFtBxT3w18';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const targetDomain = 'mazastory.com';
  const slug = '점심시간-15분-경제적-자유-파이어족-달성을-위한-연도별-자산-목표-설정-100-활용법-9368d18b';
  
  console.log('--- Profiling [slug] ---');
  let t0 = Date.now();
  
  const { data: site } = await supabase.from('sites').select('id').eq('domain', targetDomain).limit(1).maybeSingle();
  let t1 = Date.now();
  console.log('1. getSiteConfig took:', t1 - t0, 'ms');
  
  const nowIso = new Date().toISOString();
  const { data: posts } = await supabase.from('posts')
      .select('id, title, source_image_url, created_at, publish_at, status, metadata, source_type')
      .eq('site_id', site.id)
      .eq('status', 'published')
      .lte('publish_at', nowIso)
      .order('publish_at', { ascending: false })
      .limit(60);
      
  let t2 = Date.now();
  console.log('2. getApprovedPosts took:', t2 - t1, 'ms');
  
  let match = posts.find(p => p.id === slug || p.title.includes('파이어족'));
  let t3 = Date.now();
  console.log('3. findPostMetaInList took:', t3 - t2, 'ms', match ? '(found)' : '(not found)');
  
  if (!match) {
      console.log('Running fallback query...');
      // fallback
      const prefix = '9368d18b'.padEnd(8, '0').substring(0, 8);
      const minUuid = `${prefix}-0000-0000-0000-000000000000`;
      const prefixMax = '9368d18b'.padEnd(8, 'f').substring(0, 8);
      const maxUuid = `${prefixMax}-ffff-ffff-ffff-ffffffffffff`;
      const { data: fallbackData } = await supabase.from('posts')
        .select('id, title, source_image_url, created_at, publish_at, status, metadata, source_type')
        .eq('site_id', site.id)
        .eq('status', 'published')
        .gte('id', minUuid)
        .lte('id', maxUuid)
        .limit(5);
      match = fallbackData?.[0];
      console.log('Fallback took:', Date.now() - t3, 'ms', match ? '(found)' : '(not found)');
      t3 = Date.now();
  }
  
  if (match) {
    const { data: _content } = await supabase.from('posts').select('html_content, content').eq('id', match.id).single();
    let t4 = Date.now();
    console.log('4. getPostContent took:', t4 - t3, 'ms');
    console.log('Total DB time:', t4 - t0, 'ms');
  }
}

run();
