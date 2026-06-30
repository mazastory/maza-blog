import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vcaiezmfxvgavwcltqsu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYWllem1meHZnYXZ3Y2x0cXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzcwMzYsImV4cCI6MjA5Mjk1MzAzNn0.ppE6itBkU1j88qMci0HEIwKTuIRHbBBS8cFtBxT3w18';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.time('get_public_site_config');
  const res1 = await supabase.rpc('get_public_site_config', { target_domain: 'mazastory.com' });
  console.timeEnd('get_public_site_config');
  console.log('site config error?', res1.error);
  
  console.time('sites_fetch');
  const { data: site } = await supabase.from('sites').select('id').eq('domain', 'mazastory.com').limit(1).maybeSingle();
  console.timeEnd('sites_fetch');
  console.log('site', site);
  
  if (site) {
    console.time('posts_fetch');
    const nowIso = new Date().toISOString();
    const result = await supabase.from('posts')
      .select('id, title, source_image_url, created_at, publish_at, status, metadata, source_type')
      .eq('site_id', site.id)
      .eq('status', 'published')
      .or(`publish_at.lte.${nowIso},publish_at.is.null`)
      .order('created_at', { ascending: false })
      .limit(60);
    console.timeEnd('posts_fetch');
    console.log('posts count', result.data?.length);
  }
}
run();
