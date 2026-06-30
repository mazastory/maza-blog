import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://vcaiezmfxvgavwcltqsu.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYWllem1meHZnYXZ3Y2x0cXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzcwMzYsImV4cCI6MjA5Mjk1MzAzNn0.ppE6itBkU1j88qMci0HEIwKTuIRHbBBS8cFtBxT3w18');

async function run() {
  const { data: site } = await supabase.from('sites').select('*').eq('domain', 'mazastory.com').single();
  console.log(site);
}
run();
