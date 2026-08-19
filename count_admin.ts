import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// service_role 키는 RLS를 완전히 우회하므로 절대 하드코딩하지 않는다.
const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  console.time('count');
  const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true });
  console.timeEnd('count');
  console.log('total posts (admin):', count);
}
run();
