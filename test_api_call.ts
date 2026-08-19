import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.PUBLIC_SUPABASE_ANON_KEY!);

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
