import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://vcaiezmfxvgavwcltqsu.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYWllem1meHZnYXZ3Y2x0cXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzcwMzYsImV4cCI6MjA5Mjk1MzAzNn0.ppE6itBkU1j88qMci0HEIwKTuIRHbBBS8cFtBxT3w18');

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
