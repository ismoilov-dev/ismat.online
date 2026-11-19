// Cloudflare Worker: statik sayt (dist/) + /api va /admin yo'llari.
import * as chat from "../functions/api/chat.js";
import * as auth from "../functions/api/auth.js";
import * as callback from "../functions/api/callback.js";
import * as admin from "../functions/admin/_middleware.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const next = () => env.ASSETS.fetch(request);

    if (pathname === "/api/chat") return chat.onRequest({ request, env });
    if (pathname === "/api/auth") return auth.onRequestGet({ request, env });
    if (pathname === "/api/callback") return callback.onRequestGet({ request, env });
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return admin.onRequest({ request, env, next });
    return next();
  }
};
