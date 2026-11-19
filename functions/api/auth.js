// Decap CMS uchun GitHub OAuth: 1-qadam, GitHub'ga yo'naltirish.
// Env: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET (Cloudflare Pages -> Settings -> Variables and Secrets)
export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_CLIENT_ID) return new Response("GITHUB_CLIENT_ID sozlanmagan", { status: 503 });
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const gh = new URL("https://github.com/login/oauth/authorize");
  gh.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  gh.searchParams.set("redirect_uri", `${url.origin}/api/callback`);
  gh.searchParams.set("scope", "repo,user");
  gh.searchParams.set("state", state);
  return new Response(null, {
    status: 302,
    headers: {
      location: gh.toString(),
      "set-cookie": `oauth_state=${state}; Path=/api; Max-Age=600; HttpOnly; Secure; SameSite=Lax`
    }
  });
}
