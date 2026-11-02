import { getLang, applyLang } from "./i18n.js";
import { ask } from "./chat.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function initTerminal(profile) {
  const body = document.getElementById("term-body");
  const form = document.getElementById("term-form");
  const input = document.getElementById("term-input");
  const past = [];
  let cursor = 0;
  let posts = null;

  const L = (uz, en) => (getLang() === "en" ? en : uz);

  function print(html, cls = "out") {
    const div = document.createElement("div");
    div.className = cls;
    div.innerHTML = html;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  const commands = {
    help: () => [
      ["whoami", L("qisqacha men haqimda", "short intro")],
      ["projects", L("loyihalar ro'yxati", "list projects")],
      ["open <nom>", L("loyiha haqida batafsil, masalan: open tester", "project details, e.g. open tester")],
      ["experience", L("ish tajribasi", "work history")],
      ["skills", L("texnologiyalar", "tech I use")],
      ["blog", L("so'nggi postlar", "latest posts")],
      ["ask <savol>", L("AI'dan men haqimda so'rash", "ask the AI about me")],
      ["contact", L("bog'lanish", "how to reach me")],
      ["lang uz|en", L("tilni almashtirish", "switch language")],
      ["clear", L("ekranni tozalash", "clear screen")]
    ].map(([c, d]) => `  <span class="hl">${esc(c.padEnd(16))}</span>${d}`).join("\n"),

    whoami: () => `<span class="hl">${profile.name}</span> · ${profile.role[getLang()]}\n${profile.about[getLang()]}`,

    projects: () => profile.projects
      .map(p => `  <span class="hl">${p.id.padEnd(10)}</span>${p.name.padEnd(26)}<span class="dim">${p.status[getLang()]}</span>`)
      .join("\n") + `\n\n<span class="dim">${L("batafsil: open <nom>", "details: open <id>")}</span>`,

    ls: () => commands.projects(),

    open: arg => {
      const p = profile.projects.find(x => x.id === (arg || "").toLowerCase());
      if (!p) return L(`topilmadi: ${esc(arg)}. "projects" bilan ro'yxatni ko'ring`, `not found: ${esc(arg)}. try "projects"`);
      const lines = [`<span class="hl">${p.name}</span> (${p.year}) · ${p.stack.join(", ")}`, p.summary[getLang()]];
      if (p.notes) lines.push(p.notes[getLang()]);
      if (p.url) lines.push(`→ <a href="${p.url}" target="_blank" rel="noopener">${p.url}</a>`);
      if (p.docs) lines.push(`→ <a href="${p.docs}" target="_blank" rel="noopener">${p.docs}</a>`);
      return lines.join("\n");
    },

    experience: () => profile.experience
      .map(e => `<span class="hl">${(getLang() === "en" ? e.when_en : e.when).padEnd(13)}</span>${e.title[getLang()]}\n${" ".repeat(13)}<span class="dim">${e.where}</span>`)
      .join("\n"),

    skills: () => profile.skills.map(g => `<span class="hl">${g.group.padEnd(10)}</span>${g.items.join(" · ")}`).join("\n"),

    contact: () => [
      `email     <a href="mailto:${profile.email}">${profile.email}</a>`,
      `github    <a href="${profile.links.github}" target="_blank" rel="noopener">${profile.links.github.replace("https://", "")}</a>`,
      `linkedin  <a href="${profile.links.linkedin}" target="_blank" rel="noopener">${profile.links.linkedin.replace("https://www.", "")}</a>`
    ].join("\n"),

    blog: async () => {
      if (!posts) {
        try { posts = await fetch(new URL("../posts.json", import.meta.url)).then(r => r.json()); }
        catch { posts = []; }
      }
      if (!posts.length) return L("hozircha post yo'q", "no posts yet");
      return posts.slice(0, 6).map(p => `<span class="dim">${p.date}</span>  <a href="${new URL("../" + p.url, import.meta.url)}">${esc(p.title)}</a>`).join("\n");
    },

    ask: async (_a, raw) => {
      if (!raw) return L("savol yozing: ask Tester nima?", "type a question: ask what is Tester?");
      const wait = print(`<span class="dim">${L("o'ylayapti...", "thinking...")}</span>`);
      const { text, offline } = await ask(raw);
      wait.remove();
      return esc(text) + (offline ? `\n<span class="dim">${L("(oflayn javob)", "(offline answer)")}</span>` : "");
    },

    lang: arg => {
      if (arg !== "uz" && arg !== "en") return "lang uz | lang en";
      applyLang(arg);
      return arg === "en" ? "language: english" : "til: o'zbekcha";
    },

    sudo: (_a, raw) => raw.startsWith("hire")
      ? L(`ruxsat berildi. <a href="mailto:${profile.email}?subject=Ish%20taklifi">${profile.email}</a> ga yozing`,
          `permission granted. write to <a href="mailto:${profile.email}?subject=Job%20offer">${profile.email}</a>`)
      : L("sudo: bu yerda faqat 'sudo hire-me' ishlaydi", "sudo: only 'sudo hire-me' works here"),

    date: () => new Date().toLocaleString(getLang() === "en" ? "en-GB" : "uz-UZ", { timeZone: "Asia/Samarkand" }) + " (Qarshi)",

    echo: (_a, raw) => esc(raw),

    clear: () => { body.innerHTML = ""; return null; },

    history: () => past.map((c, i) => `${String(i + 1).padStart(3)}  ${esc(c)}`).join("\n")
  };

  async function run(line) {
    print(`<b>guest@ismat:~$</b> ${esc(line)}`, "cmd");
    const [name, ...rest] = line.split(/\s+/);
    const raw = line.slice(name.length).trim();
    const fn = commands[name.toLowerCase()];
    if (!fn) {
      print(L(`${esc(name)}: buyruq topilmadi. "help" ni sinang`, `${esc(name)}: command not found. try "help"`));
      return;
    }
    const out = await fn(rest[0], raw);
    if (out != null) print(out);
  }

  print(L(
    `<span class="hl">ismat.live</span> terminaliga xush kelibsiz.\nBuyruqlar ro'yxati uchun <span class="hl">help</span> deb yozing.\n`,
    `Welcome to the <span class="hl">ismat.live</span> terminal.\nType <span class="hl">help</span> to see what it can do.\n`
  ));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const line = input.value.trim();
    input.value = "";
    if (!line) return;
    past.push(line);
    cursor = past.length;
    input.disabled = true;
    await run(line);
    input.disabled = false;
    input.focus();
  });

  input.addEventListener("keydown", e => {
    if (e.key === "ArrowUp" && cursor > 0) { input.value = past[--cursor]; e.preventDefault(); }
    if (e.key === "ArrowDown") { cursor = Math.min(past.length, cursor + 1); input.value = past[cursor] || ""; }
    if (e.key === "Tab") {
      e.preventDefault();
      const match = Object.keys(commands).find(c => c.startsWith(input.value));
      if (match) input.value = match + " ";
    }
  });

  document.getElementById("term").addEventListener("click", () => {
    if (!window.getSelection().toString()) input.focus({ preventScroll: true });
  });
}
