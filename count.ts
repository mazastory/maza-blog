import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.PUBLIC_SUPABASE_ANON_KEY!);
async function run() {
  console.time('count');
  const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true });
  console.timeEnd('count');
  console.log('total posts:', count);
}
run();
