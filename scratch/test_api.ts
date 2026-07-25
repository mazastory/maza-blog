import { getApprovedPosts } from '../src/lib/api.js';

async function main() {
  const posts = await getApprovedPosts('autosite.kr');
  console.log(`Returned posts: ${posts.length}`);
}
main();
