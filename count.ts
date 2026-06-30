import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://vcaiezmfxvgavwcltqsu.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYWllem1meHZnYXZ3Y2x0cXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzcwMzYsImV4cCI6MjA5Mjk1MzAzNn0.ppE6itBkU1j88qMci0HEIwKTuIRHbBBS8cFtBxT3w18');
async function run() {
  console.time('count');
  const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true });
  console.timeEnd('count');
  console.log('total posts:', count);
}
run();
