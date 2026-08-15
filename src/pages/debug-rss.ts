export const prerender = false;
export async function GET() {
  return new Response("Debug RSS Endpoint works!", { status: 200 });
}
