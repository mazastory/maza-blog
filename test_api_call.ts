import { getApprovedPosts } from './src/lib/api.ts';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/m/Downloads/MazaWorkspace/maza-studio/.env' });

async function check() {
  process.env.PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
  process.env.PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const posts = await getApprovedPosts('mazastory.com', 'ko');
  console.log("Posts length:", posts.length);
}
check();
