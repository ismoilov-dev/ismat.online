import profile from "../_profile.generated.json";


const system = `You answer questions from visitors of Ismat Ismoilov's portfolio site (ismat.online).
Use only the facts below. If something isn't covered, say you don't know and suggest emailing ${profile.email}.
Talk about Ismat in the third person. Keep answers under 90 words, plain text, no markdown headings.
Reply in the visitor's language (Uzbek latin, English or Russian).
Politely decline anything unrelated to Ismat, his work, or hiring him.

FACTS (JSON):
${JSON.stringify(profile)}`;

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" }
});

export async function onRequest({ request: req, env }) {
  if (req.method !== "POST") return json(405, { error: "POST only" });
  const MODEL = env.CLAUDE_MODEL || "claude-haiku-5-5";
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return json(503, { error: "ANTHROPIC_API_KEY is not set" });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: "bad json" }); }

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-8)
    .map(m => ({ role: m.role, content: m.content.slice(0, 600) }));

  if (!messages.length || messages[0].role !== "user" || messages.at(-1).role !== "user") {
    return json(400, { error: "messages must start and end with a user turn" });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages })
  });

  if (!res.ok) return json(502, { error: `claude ${res.status}` });
  const data = await res.json();
  const reply = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
  return json(200, { reply });
}
