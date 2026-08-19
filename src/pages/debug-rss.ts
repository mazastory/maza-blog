export const prerender = false;
export async function GET() {
  if (!import.meta.env.DEV) {
    return new Response('Not Found', { status: 404 });
  }
  return new Response("Debug RSS Endpoint works!", { status: 200 });
}
