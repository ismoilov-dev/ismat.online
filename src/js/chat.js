import { getLang, t } from "./i18n.js";

let profile;
const history = [];

function localAnswer(q, lang) {
  const s = q.toLowerCase();
  const has = (...w) => w.some(x => s.includes(x));

  if (has("bog'lan", "boglan", "aloqa", "contact", "email", "pochta", "reach", "telegram")) {
    return `Email: ${profile.email}\nGitHub: ${profile.links.github}\nLinkedIn: ${profile.links.linkedin}`;
  }
  const project = profile.projects.find(p => s.includes(p.name.toLowerCase().split(" ")[0]) || s.includes(p.id));
  if (project) {
    return `${project.name}: ${project.summary[lang]}${project.notes ? " " + project.notes[lang] : ""}`;
  }
  if (has("stack", "texnolog", "bilad", "skill", "django", "fastapi", "python", "tajriba", "experience")) {
    const skills = profile.skills.map(g => `${g.group}: ${g.items.join(", ")}`).join("\n");
    const exp = profile.experience[0];
    const now = !exp ? "" : lang === "en"
      ? ` Right now: ${exp.title.en} at ${exp.where}.`
      : ` Hozir: ${exp.where}, ${exp.title.uz.toLowerCase()}.`;
    return `${profile.role[lang]}.${now}\n` + skills;
  }
  return profile.about[lang];
}

export async function ask(question) {
  const lang = getLang();
  history.push({ role: "user", content: question });
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-8), lang })
    });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (!data.reply) throw new Error("empty");
    history.push({ role: "assistant", content: data.reply });
    return { text: data.reply, offline: false };
  } catch {
    history.pop();
    return { text: localAnswer(question, lang), offline: true };
  }
}

function addMsg(log, who, text, cls = "") {
  const div = document.createElement("div");
  div.className = "msg " + cls;
  div.innerHTML = `<span class="who"></span><div class="txt"></div>`;
  div.querySelector(".who").textContent = who;
  div.querySelector(".txt").textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}

export function initChat(p) {
  profile = p;
  const log = document.getElementById("chat-log");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const hints = document.getElementById("chat-hints");
  const btn = form.querySelector("button");

  function drawHints() {
    hints.innerHTML = "";
    ["ask.h1", "ask.h2", "ask.h3"].forEach(k => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = t(k);
      b.onclick = () => { input.value = b.textContent; form.requestSubmit(); };
      hints.appendChild(b);
    });
  }

  function hello() {
    log.innerHTML = "";
    addMsg(log, "claude", t("ask.hello"));
  }

  drawHints();
  hello();
  document.addEventListener("langchange", () => { drawHints(); if (log.children.length <= 1) hello(); });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    btn.disabled = true;
    addMsg(log, getLang() === "en" ? "you" : "siz", q, "me");
    const wait = addMsg(log, "claude", t("ask.wait"), "wait");
    const { text, offline } = await ask(q);
    wait.classList.remove("wait");
    const txt = wait.querySelector(".txt");
    txt.textContent = text;
    if (offline) {
      const note = document.createElement("span");
      note.className = "note";
      note.textContent = t("ask.offline");
      txt.appendChild(note);
    }
    log.scrollTop = log.scrollHeight;
    btn.disabled = false;
  });
}
