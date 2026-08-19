import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data: site } = await supabase.from('sites').select('*').eq('domain', 'mazastory.com').single();
  console.log(site);
}
run();
