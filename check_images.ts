import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data: site } = await supabase.from('sites').select('id').eq('domain', 'mazastory.com').single();
  if (!site) return;
  
  const { data: posts } = await supabase.from('posts').select('title, source_image_url, metadata').eq('site_id', site.id).limit(10);
  
  for (const post of posts || []) {
    const url = post.source_image_url || post.metadata?.data?.image1;
    if (url) {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        console.log(`Title: ${post.title.substring(0, 20)}... Size: ${res.headers.get('content-length')} bytes`);
      } catch (e) {
        console.log(`Failed to fetch ${url}`);
      }
    }
  }
}
run();
