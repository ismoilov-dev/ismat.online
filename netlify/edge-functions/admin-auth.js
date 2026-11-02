// /admin/* ni email + parol bilan himoyalaydi.
// Netlify env: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SECRET (cookie imzosi uchun)

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 kun

const enc = new TextEncoder();

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function makeToken(secret) {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return `${exp}.${await hmac(secret, exp)}`;
}

async function validToken(secret, token) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(secret, exp));
}

function getCookie(req, name) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function loginPage(error = "") {
  return new Response(`<!doctype html>
<html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Admin kirish</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1115;color:#e6e6e6;font:16px/1.5 system-ui,-apple-system,sans-serif}
form{width:min(360px,92vw);background:#171a21;border:1px solid #262a33;border-radius:14px;padding:28px}
h1{font-size:20px;margin:0 0 18px}label{display:block;font-size:13px;color:#9aa0aa;margin:14px 0 6px}
input{width:100%;padding:11px 12px;border-radius:9px;border:1px solid #2c313b;background:#0f1115;color:inherit;font:inherit}
input:focus{outline:2px solid #5b8cff;border-color:transparent}
button{margin-top:20px;width:100%;padding:11px;border:0;border-radius:9px;background:#5b8cff;color:#fff;font:600 15px system-ui;cursor:pointer}
.err{margin-top:14px;color:#ff6b6b;font-size:14px}
</style></head><body>
<form method="post" action="/admin/login">
<h1>Admin panel</h1>
<label for="e">Email</label><input id="e" name="email" type="email" autocomplete="username" required autofocus>
<label for="p">Parol</label><input id="p" name="password" type="password" autocomplete="current-password" required>
<button type="submit">Kirish</button>
${error ? `<div class="err">${error}</div>` : ""}
</form></body></html>`, {
    status: error ? 401 : 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export default async (req, context) => {
  const email = Netlify.env.get("ADMIN_EMAIL");
  const password = Netlify.env.get("ADMIN_PASSWORD");
  const secret = Netlify.env.get("ADMIN_SECRET");
  if (!email || !password || !secret) {
    return new Response("Admin sozlanmagan: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SECRET env kerak.", { status: 503 });
  }

  const url = new URL(req.url);
  const secure = url.protocol === "https:" ? "; Secure" : "";

  if (url.pathname === "/admin/logout") {
    return new Response(null, {
      status: 302,
      headers: { location: "/admin/", "set-cookie": `${COOKIE}=; Path=/admin; Max-Age=0; HttpOnly; SameSite=Lax${secure}` },
    });
  }

  if (url.pathname === "/admin/login" && req.method === "POST") {
    const form = await req.formData();
    const okEmail = safeEqual(String(form.get("email") || "").trim().toLowerCase(), email.trim().toLowerCase());
    const okPass = safeEqual(String(form.get("password") || ""), password);
    if (!(okEmail && okPass)) {
      await new Promise(r => setTimeout(r, 800)); // brute-force'ni sekinlashtirish
      return loginPage("Email yoki parol noto'g'ri");
    }
    return new Response(null, {
      status: 303,
      headers: {
        location: "/admin/",
        "set-cookie": `${COOKIE}=${encodeURIComponent(await makeToken(secret))}; Path=/admin; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
      },
    });
  }

  if (await validToken(secret, getCookie(req, COOKIE))) {
    const res = await context.next();
    const out = new Response(res.body, res);
    out.headers.set("cache-control", "no-store");
    return out;
  }

  return loginPage();
};

export const config = { path: ["/admin", "/admin/*"] };
