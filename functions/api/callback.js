// Decap CMS uchun GitHub OAuth: 2-qadam, kodni tokenga almashtirib, admin oynasiga qaytarish.
const page = (status, payload) => {
  const msg = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const body = `<!doctype html><meta charset="utf-8"><title>Kirish</title><script>
(function () {
  var msg = ${JSON.stringify(msg).replace(/</g, "\\u003c")};
  function receive(e) { window.opener.postMessage(msg, e.origin); }
  window.addEventListener("message", receive, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>`;
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "set-cookie": "oauth_state=; Path=/api; Max-Age=0; HttpOnly; Secure; SameSite=Lax" }
  });
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = (request.headers.get("cookie") || "").match(/(?:^|;\s*)oauth_state=([^;]+)/)?.[1];
  if (!code || !state || state !== saved) return page("error", { message: "state mos kelmadi, qayta urinib ko'ring" });

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", "user-agent": "ismat-online-decap" },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code })
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) return page("error", { message: data.error_description || "token olinmadi" });
  return page("success", { token: data.access_token, provider: "github" });
}
