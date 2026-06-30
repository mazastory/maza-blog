import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://vcaiezmfxvgavwcltqsu.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYWllem1meHZnYXZ3Y2x0cXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM3NzAzNiwiZXhwIjoyMDkyOTUzMDM2fQ.wrJF5p0auXSHXMBzwDr5DXJBf5blnnaOfwEDzrbgiZM');
async function run() {
  console.time('count');
  const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true });
  console.timeEnd('count');
  console.log('total posts (admin):', count);
}
run();
