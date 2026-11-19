import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const SITE = (process.env.SITE_URL || "https://ismat.online").replace(/\/$/, "");
const SRC = "src", OUT = "dist";
const year = new Date().getFullYear();

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
const write = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };
const iso = d => d.toISOString().slice(0, 10);
const slugify = s => String(s).toLowerCase().replace(/[ʻʼ'`’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const list = v => (Array.isArray(v) ? v : v ? String(v).split(",") : []).map(x => String(x).trim()).filter(Boolean);
const str = v => (v === undefined || v === null ? "" : String(v).trim());
// "tester.lesson24.uz" kabi protokolsiz havolalarga https:// qo'shadi (aks holda nisbiy yo'l bo'lib 404 beradi)
const link = v => { const s = str(v); return !s || /^(https?:|mailto:|tel:|\/|#)/i.test(s) ? s : `https://${s.replace(/^\/+/, "")}`; };
/** bilingual text: renders both languages, CSS shows the active one */
const bi = (o, tag = "span") => {
  if (!o) return "";
  if (typeof o === "string") return esc(o);
  const uz = str(o.uz), en = str(o.en) || uz;
  return uz === en ? esc(uz) : `<${tag} class="uz">${esc(uz)}</${tag}><${tag} class="en">${esc(en)}</${tag}>`;
};
const T = (uz, en) => `<span class="uz">${uz}</span><span class="en">${en}</span>`;

const MONTHS = {
  uz: ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
};
const fmtDate = (d, lang = "uz") => `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[lang][d.getUTCMonth()]}, ${d.getUTCFullYear()}`;

// ================= data =================
const settings = JSON.parse(fs.readFileSync(`${SRC}/data/profile.json`, "utf8"));
settings.links ||= {};
// "@username" yoki "username" ko'rinishidagi Telegramni https://t.me/username ga aylantiradi
{
  const tg = str(settings.links.telegram);
  settings.links.telegram = !tg ? "" : /^@|^[a-z0-9_]+$/i.test(tg) ? `https://t.me/${tg.replace(/^@/, "")}` : link(tg);
}
for (const k of ["github", "linkedin"]) settings.links[k] = link(settings.links[k]);
settings.now = (settings.now || []).filter(n => str(n?.uz));
settings.achievements = (settings.achievements || []).filter(a => str(a?.uz));
settings.skills = (settings.skills || []).filter(g => str(g?.group)).map(g => ({ group: str(g.group), items: list(g.items) }));

function loadCollection(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(".md")).map(file => {
    const { data, content } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
    return { file, id: file.replace(/\.md$/, ""), data, content };
  });
}

function addHeadingAnchors(html) {
  const seen = {}, toc = [];
  const out = html.replace(/<h([23])>(.*?)<\/h\1>/g, (_, n, inner) => {
    const text = inner.replace(/<[^>]+>/g, "");
    let id = slugify(text) || "bolim";
    if (seen[id]) id += "-" + ++seen[id]; else seen[id] = 1;
    if (n === "2") toc.push({ id, text });
    return `<h${n} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${inner}</h${n}>`;
  });
  return { html: out, toc };
}

const posts = loadCollection("content/blog").map(({ id, data, content }) => {
  const slug = data.slug || id.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  const date = data.date ? new Date(data.date) : new Date();
  const words = content.split(/\s+/).filter(Boolean).length;
  const { html, toc } = addHeadingAnchors(marked.parse(content));
  return {
    slug, date, html, toc,
    minutes: Math.max(1, Math.round(words / 200)),
    title: str(data.title) || slug,
    description: str(data.description),
    lang: data.lang === "en" ? "en" : "uz",
    tags: list(data.tags),
    cover: str(data.cover),
    draft: !!data.draft
  };
}).filter(p => !p.draft).sort((a, b) => b.date - a.date);

const projects = loadCollection("content/projects").map(({ id, data, content }) => ({
  id: slugify(id) || id,
  name: str(data.title) || id,
  year: str(data.year),
  summary: { uz: str(data.summary_uz), en: str(data.summary_en) || str(data.summary_uz) },
  status: { uz: str(data.status), en: str(data.status) },
  stack: list(data.stack),
  url: link(data.url), repo: link(data.repo), docs: link(data.docs),
  cover: str(data.cover),
  featured: !!data.featured,
  order: Number.isFinite(Number(data.order)) ? Number(data.order) : 10,
  details: content.trim() ? marked.parse(content) : ""
})).sort((a, b) => a.order - b.order || String(b.year).localeCompare(String(a.year)) || a.name.localeCompare(b.name));

const ym = v => {
  const m = str(v).match(/^(\d{4})(?:-(\d{1,2}))?/);
  return m ? { y: +m[1], m: m[2] ? +m[2] - 1 : null, key: m[1] + "-" + String(m[2] || "00").padStart(2, "0") } : null;
};
const fmtYM = (v, lang) => {
  const d = ym(v);
  if (!d) return lang === "en" ? "now" : "hozir";
  return d.m === null ? String(d.y) : `${MONTHS[lang][d.m].slice(0, 3)} ${d.y}`;
};
const experience = loadCollection("content/experience").map(({ data }) => {
  const when = `${fmtYM(data.start, "uz")} — ${fmtYM(data.end, "uz")}`;
  const whenEn = `${fmtYM(data.start, "en")} — ${fmtYM(data.end, "en")}`;
  return {
    start: ym(data.start)?.key || "0000-00",
    when, when_en: whenEn,
    where: str(data.company),
    current: !ym(data.end),
    title: { uz: str(data.role_uz), en: str(data.role_en) || str(data.role_uz) },
    text: { uz: str(data.text_uz), en: str(data.text_en) || str(data.text_uz) }
  };
}).sort((a, b) => b.start.localeCompare(a.start));

const profile = { ...settings, projects, experience };

const hasAboutBlock = !!(str(settings.about?.uz) || experience.length || settings.now.length || settings.skills.length);

const tags = {};
for (const p of posts) for (const t of p.tags) (tags[t] ||= []).push(p);

// ================= shared pieces =================
const base = fs.readFileSync("templates/base.html", "utf8");

function page({ out, root, title, description, content, lang = "uz", ogtype = "website", nav = "", bodyclass = "", scripts = "", head = "" }) {
  write(`${OUT}/${out}`, fill(base, {
    root, title: esc(title), description: esc(description), content, lang, ogtype, bodyclass, scripts, head, year,
    name: esc(settings.name),
    url: `${SITE}/${out.replace(/index\.html$/, "")}`,
    nav_blog: nav === "blog" ? ' aria-current="page"' : "",
    nav_lab: nav === "lab" ? ' aria-current="page"' : "",
    nav_work: projects.length ? "" : " hidden",
    nav_exp: hasAboutBlock ? "" : " hidden",
    footer_links: footerLinks(root)
  }));
}

const icons = {
  github: '<path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/>',
  linkedin: '<path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/>',
  telegram: '<path fill="currentColor" d="M21.94 3.6 18.7 19.86c-.24 1.08-.88 1.35-1.78.84l-4.93-3.63-2.38 2.29c-.26.26-.48.48-.99.48l.35-5.02 9.14-8.26c.4-.35-.09-.55-.62-.2L6.2 13.47l-4.86-1.52c-1.06-.33-1.08-1.06.22-1.57L20.55 3.06c.88-.32 1.65.2 1.39 1.54z"/>',
  mail: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M3 5.5h18v13H3z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="m3.5 6 8.5 7 8.5-7"/>',
  rss: '<circle cx="5" cy="19" r="2.2" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M3 11a10 10 0 0 1 10 10M3 4a17 17 0 0 1 17 17"/>',
  chatgpt: '<g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8.2" y="2.5" width="7.6" height="19" rx="3.8"/><rect x="8.2" y="2.5" width="7.6" height="19" rx="3.8" transform="rotate(60 12 12)"/><rect x="8.2" y="2.5" width="7.6" height="19" rx="3.8" transform="rotate(120 12 12)"/></g>',
  claude: '<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5M5.3 5.3l3.5 3.5M15.2 15.2l3.5 3.5M5.3 18.7l3.5-3.5M15.2 8.8l3.5-3.5"/>',
  gemini: '<path fill="currentColor" d="M12 2c.8 5.5 4.5 9.2 10 10-5.5.8-9.2 4.5-10 10-.8-5.5-4.5-9.2-10-10 5.5-.8 9.2-4.5 10-10z"/>',
  arrow: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M8 7h9v9"/>'
};
const icon = (name, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${icons[name]}</svg>`;

const socialList = () => [
  settings.links.github && ["GitHub", settings.links.github, "github"],
  settings.links.linkedin && ["LinkedIn", settings.links.linkedin, "linkedin"],
  settings.links.telegram && ["Telegram", settings.links.telegram, "telegram"],
  settings.email && ["Email", `mailto:${settings.email}`, "mail"]
].filter(Boolean);
const socials = () => socialList().map(([label, href, ic]) =>
  `<a href="${esc(href)}"${href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""} aria-label="${label}">${icon(ic)}</a>`).join("");
const footerLinks = root => [...socialList().filter(s => s[2] !== "mail").map(([l, h]) => `<a href="${esc(h)}" target="_blank" rel="noopener">${l}</a>`),
  `<a href="${root}blog/rss.xml">RSS</a>`].join("");

const sectionHead = (num, title, extra = "") => `<header class="sec-head reveal">
    <p class="sec-num">${num}</p>
    <h2 class="sec-title">${title}</h2>
    ${extra}
  </header>`;

const postCard = (p, root) => `<a class="post-card reveal" href="${root}blog/${p.slug}/">
    ${p.cover ? `<span class="pc-cover"><img src="${esc(p.cover)}" alt="" loading="lazy"></span>` : ""}
    <span class="pc-meta"><time datetime="${iso(p.date)}">${fmtDate(p.date, p.lang)}</time><span>·</span><span>${p.minutes} ${p.lang === "en" ? "min" : "daq"}</span>${p.lang === "en" ? '<span class="badge">EN</span>' : ""}</span>
    <span class="pc-title">${esc(p.title)}</span>
    ${p.description ? `<span class="pc-desc">${esc(p.description)}</span>` : ""}
    ${p.tags.length ? `<span class="pc-tags">${p.tags.map(t => `<span>#${esc(t)}</span>`).join("")}</span>` : ""}
  </a>`;

const emptyNote = (uz, en) => `<p class="empty reveal">${T(uz, en)}</p>`;

// ================= static files =================
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true });

// ================= home =================
const projectCard = (p, i) => {
  const main = p.url || p.repo || p.docs;
  const links = [
    p.url && `<a href="${esc(p.url)}" target="_blank" rel="noopener">${T("Sayt", "Website")} ${icon("arrow", 14)}</a>`,
    p.repo && `<a href="${esc(p.repo)}" target="_blank" rel="noopener">GitHub ${icon("arrow", 14)}</a>`,
    p.docs && `<a href="${esc(p.docs)}" target="_blank" rel="noopener">Docs ${icon("arrow", 14)}</a>`
  ].filter(Boolean).join("");
  return `<article class="card proj${p.featured ? " is-featured" : ""}${p.cover ? "" : " no-cover"} reveal" style="--i:${i % 3}">
    ${p.cover ? `<div class="proj-cover"><img src="${esc(p.cover)}" alt="${esc(p.name)}" loading="lazy"></div>` : ""}
    <div class="proj-body">
      <div class="proj-top">
        ${p.cover ? "" : `<span class="proj-mark" style="--h:${(i * 47) % 360}" aria-hidden="true">${esc(p.name.charAt(0))}</span>`}
        <h3>${main ? `<a class="stretched" href="${esc(main)}" target="_blank" rel="noopener">${esc(p.name)}</a>` : esc(p.name)}</h3>
        ${p.year ? `<span class="proj-year">${esc(p.year)}</span>` : ""}
      </div>
      ${p.status.uz ? `<p class="proj-status">${esc(p.status.uz)}</p>` : ""}
      ${p.summary.uz ? `<p class="proj-sum">${bi(p.summary)}</p>` : ""}
      ${p.stack.length ? `<ul class="chips">${p.stack.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
      ${links ? `<div class="proj-links">${links}</div>` : ""}
    </div>
  </article>`;
};

// "AI agentingizdan so'rang" bloki: har bir chip tayyor prompt bilan AI'ni ochadi
const [first, ...restName] = settings.name.split(" ");
const nameRev = [...restName, first].join(" "); // "Ismoilov Ismat"
const AI_PROMPT = {
  uz: `Web search ${first} (${SITE.replace(/^https?:\/\//, "")}) haqida to‘liq ma’lumot ber: kim, qayerda ishlaydi, loyihalari va natijalari. Manba: ${SITE}/llms.txt. O‘zbek tilida javob ber.`,
  en: `Web search: give me full information about ${settings.name} (${SITE.replace(/^https?:\/\//, "")}): who he is, where he works, his projects and results. Source: ${SITE}/llms.txt. Answer in English.`
};
const aiChips = lang => {
  const q = encodeURIComponent(AI_PROMPT[lang]);
  return [
    ["ChatGPT", `https://chatgpt.com/?hints=search&q=${q}`, "chatgpt"],
    ["Claude", `https://claude.ai/new?q=${q}`, "claude"],
    ["Gemini", `https://www.google.com/search?udm=50&q=${q}`, "gemini"]
  ].map(([label, href, ic]) => `<a class="ai-chip" href="${href}" target="_blank" rel="noopener">${icon(ic, 18)}<span>${label}</span></a>`).join("");
};
const aiAsk = `<div class="ai-ask rise" style="--d:5">
      <p class="ai-ask-text"><span class="uz">AI agentingizdan so‘rang: <q>${esc(nameRev)} kim?</q></span><span class="en">Ask your AI agent: <q>Who is ${esc(nameRev)}?</q></span></p>
      <div class="ai-chips uz">${aiChips("uz")}</div>
      <div class="ai-chips en">${aiChips("en")}</div>
    </div>`;

let n = 0;
const num = () => String(++n).padStart(2, "0");

const workSection = projects.length ? `
<section id="work" class="section">
  ${sectionHead(num(), T("Ishlar", "Work"), `<p class="sec-lede">${T("Men qurgan va ishga tushirgan loyihalar.", "Things I've built and shipped.")}</p>`)}
  <div class="proj-grid">
    ${projects.map(projectCard).join("\n    ")}
  </div>
</section>` : "";

const expSection = hasAboutBlock ? `
<section id="experience" class="section">
  ${sectionHead(num(), T("Tajriba", "Experience"))}
  <div class="exp-layout">
    <div class="exp-side reveal">
      ${str(settings.about?.uz) ? `<div class="about">${bi(settings.about, "p")}</div>` : ""}
      ${settings.now.length ? `<div class="now-box">
        <p class="label"><span class="pulse"></span>${T("Hozir", "Right now")}</p>
        <ul>${settings.now.map(x => `<li>${bi(x)}</li>`).join("")}</ul>
      </div>` : ""}
    </div>
    <div class="exp-main">
      ${experience.length ? `<ol class="timeline">
        ${experience.map(e => `<li class="reveal${e.current ? " is-current" : ""}">
          <p class="t-when">${T(esc(e.when), esc(e.when_en))}</p>
          <div class="t-body">
            <h3>${bi(e.title)}</h3>
            ${e.where ? `<p class="t-where">${esc(e.where)}</p>` : ""}
            ${e.text.uz ? `<p class="t-text">${bi(e.text)}</p>` : ""}
          </div>
        </li>`).join("\n        ")}
      </ol>` : ""}
      ${settings.skills.length ? `<div class="skills reveal">
        ${settings.skills.map(g => `<div class="skill-group"><p class="label">${esc(g.group)}</p><ul class="chips">${g.items.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}
      </div>` : ""}
    </div>
  </div>
</section>` : "";

const blogSection = `
<section id="blog" class="section">
  ${sectionHead(num(), "Blog", posts.length ? `<a class="sec-link" href="blog/">${T("Barcha postlar", "All posts")} ${icon("arrow", 16)}</a>` : "")}
  ${posts.length ? `<div class="post-grid">
    ${posts.slice(0, 6).map(p => postCard(p, "")).join("\n    ")}
  </div>` : emptyNote("Hozircha post yo'q. Tez orada yozaman.", "No posts yet. Coming soon.")}
</section>`;

page({
  out: "index.html", root: "", bodyclass: "home",
  title: `${settings.name} · ${settings.role?.uz || ""}`,
  description: settings.bio?.uz || "",
  head: `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "Person",
    name: settings.name, alternateName: nameRev, url: SITE + "/",
    jobTitle: settings.role?.en || settings.role?.uz,
    description: settings.about?.en || settings.about?.uz || settings.bio?.en,
    address: settings.city ? { "@type": "PostalAddress", addressLocality: settings.city, addressCountry: "UZ" } : undefined,
    email: settings.email ? `mailto:${settings.email}` : undefined,
    sameAs: [settings.links.github, settings.links.linkedin, settings.links.telegram].filter(Boolean),
    worksFor: experience.filter(e => e.current && e.where).map(e => ({ "@type": "Organization", name: e.where }))
  }).replace(/</g, "\\u003c")}</script>`,
  content: `
<section class="hero">
  <div class="glow" aria-hidden="true"><span></span><span></span><span></span></div>
  <div class="hero-inner">
    <p class="hero-eyebrow rise" style="--d:0"><span class="pulse"></span>${settings.city ? esc(settings.city) + " · " : ""}${T("Yangi loyihalarga ochiqman", "Open to new projects")}</p>
    <h1 class="hero-name rise" style="--d:1"><span>${esc(first)}</span>${restName.length ? `<span class="grad">${esc(restName.join(" "))}</span>` : ""}</h1>
    <p class="hero-role rise" style="--d:2">${bi(settings.role)}</p>
    ${settings.bio?.uz ? `<p class="hero-bio rise" style="--d:3">${bi(settings.bio)}</p>` : ""}
    <p class="hero-cta rise" style="--d:4">
      <a class="btn btn-primary" href="blog/">${T("Blogni o'qish", "Read the blog")} ${icon("arrow", 16)}</a>
      <a class="btn btn-ghost" href="#contact">${T("Bog'lanish", "Get in touch")}</a>
    </p>
    ${aiAsk}
  </div>
  <a class="scroll-hint" href="#${projects.length ? "work" : hasAboutBlock ? "experience" : "blog"}" aria-label="Pastga">
    <span></span>
  </a>
</section>
${workSection}
${expSection}
${blogSection}

<section id="contact" class="section contact">
  <div class="contact-card reveal">
    <p class="sec-num">${num()}</p>
    <h2 class="contact-title">${T("Birga ishlaymizmi?", "Let's work together")}</h2>
    <p class="contact-text">${T("Loyiha, ish taklifi yoki shunchaki savol bo'lsa, yozing. Odatda bir kun ichida javob beraman.", "Got a project, a job offer or just a question? Write to me. I usually reply within a day.")}</p>
    ${settings.email ? `<a class="contact-mail" href="mailto:${esc(settings.email)}">${esc(settings.email)} ${icon("arrow", 28)}</a>` : ""}
    <div class="socials">${socials()}</div>
  </div>
</section>`
});

// ================= blog =================
const tagCloud = (root, active) => Object.keys(tags).length ? `<nav class="tags" aria-label="Teglar">
    <a href="${root}blog/"${!active ? ' aria-current="page"' : ""}>${T("Hammasi", "All")} <small>${posts.length}</small></a>
    ${Object.keys(tags).sort().map(t => `<a href="${root}blog/tag/${slugify(t)}/"${active === t ? ' aria-current="page"' : ""}>#${esc(t)} <small>${tags[t].length}</small></a>`).join("\n    ")}
  </nav>` : "";

function archive(items, root) {
  const byYear = {};
  for (const p of items) (byYear[p.date.getUTCFullYear()] ||= []).push(p);
  return Object.keys(byYear).sort((a, b) => b - a).map(y => `
<section class="year-block">
  <h2 class="year-num">${y} <small>${byYear[y].length}</small></h2>
  <div class="post-grid">
    ${byYear[y].map(p => postCard(p, root)).join("\n    ")}
  </div>
</section>`).join("");
}

const blogHead = (root, title, lede, active) => `
<header class="page-hero">
  <div class="glow small" aria-hidden="true"><span></span><span></span></div>
  ${active ? `<p class="crumb"><a href="${root}blog/">← Blog</a></p>` : ""}
  <h1 class="page-title">${title}</h1>
  ${lede ? `<p class="page-lede">${lede}</p>` : ""}
  ${tagCloud(root, active)}
</header>`;

page({
  out: "blog/index.html", root: "../", nav: "blog",
  title: `Blog · ${settings.name}`,
  description: "Backend, AI va dars berish haqida yozganlarim.",
  content: `${blogHead("../", "Blog", T("Backend, AI va dars berish haqida yozganlarim.", "Writing on backends, AI and teaching."))}
<div class="section tight">
${posts.length ? archive(posts, "../") : emptyNote("Hozircha post yo'q. Admin paneldan birinchisini yozing.", "No posts yet.")}
</div>`
});

for (const [t, items] of Object.entries(tags)) {
  page({
    out: `blog/tag/${slugify(t)}/index.html`, root: "../../../", nav: "blog",
    title: `#${t} · Blog · ${settings.name}`,
    description: `${t} tegidagi postlar`,
    content: `${blogHead("../../../", `#${esc(t)}`, "", t)}
<div class="section tight">${archive(items, "../../../")}</div>`
  });
}

posts.forEach((p, i) => {
  const root = "../../";
  const newer = posts[i - 1], older = posts[i + 1];
  const L = (uz, en) => (p.lang === "en" ? en : uz);
  const subscribe = `<aside class="subscribe">
    <h2>${L("Yangi postlarni o'tkazib yubormang", "Don't miss new posts")}</h2>
    <p>${L("Yangi yozuvlar chiqqanda xabar olish uchun obuna bo'ling.", "Subscribe to hear when something new is out.")}</p>
    <p class="sub-links">
      ${settings.links.telegram ? `<a class="btn btn-primary" href="${esc(settings.links.telegram)}" target="_blank" rel="noopener">${icon("telegram", 17)} Telegram</a>` : ""}
      <a class="btn ${settings.links.telegram ? "btn-ghost" : "btn-primary"}" href="${root}blog/rss.xml">${icon("rss", 16)} RSS</a>
    </p>
  </aside>`;
  page({
    out: `blog/${p.slug}/index.html`, root, nav: "blog", lang: p.lang, ogtype: "article", bodyclass: "is-post",
    title: `${p.title} · ${settings.name}`,
    description: p.description,
    content: `
<article class="post">
  <header class="page-hero post-hero">
    <div class="glow small" aria-hidden="true"><span></span><span></span></div>
    <p class="crumb"><a href="${root}blog/">← Blog</a></p>
    <h1 class="page-title">${esc(p.title)}</h1>
    <p class="post-meta">
      <time datetime="${iso(p.date)}">${fmtDate(p.date, p.lang)}</time><span>·</span>
      <span>${p.minutes} ${L("daqiqa o'qish", "min read")}</span>
      ${p.tags.map(t => `<a href="${root}blog/tag/${slugify(t)}/">#${esc(t)}</a>`).join("")}
    </p>
    ${p.description ? `<p class="page-lede">${esc(p.description)}</p>` : ""}
  </header>
  <div class="post-layout">
    <div class="post-main">
      ${p.cover ? `<img class="cover" src="${esc(p.cover)}" alt="">` : ""}
      <div class="prose">
${p.html}
      </div>
      ${subscribe}
      <nav class="post-nav">
        ${older ? `<a class="prev" href="${root}blog/${older.slug}/"><small>← ${L("Oldingi", "Previous")}</small><span>${esc(older.title)}</span></a>` : "<span></span>"}
        ${newer ? `<a class="next" href="${root}blog/${newer.slug}/"><small>${L("Keyingi", "Next")} →</small><span>${esc(newer.title)}</span></a>` : `<a class="next" href="${root}blog/"><small>Blog →</small><span>${L("Barcha postlar", "All posts")}</span></a>`}
      </nav>
    </div>
    ${p.toc.length > 1 ? `<aside class="toc">
      <p class="label">${L("Mundarija", "Contents")}</p>
      <ol>${p.toc.map(h => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join("")}</ol>
    </aside>` : ""}
  </div>
</article>`
  });
});

// ================= lab =================
page({
  out: "lab/index.html", root: "../", nav: "lab", bodyclass: "lab",
  title: `Lab · ${settings.name}`,
  description: "Interaktiv terminal va men haqimda biladigan AI chat.",
  scripts: `<script type="module" src="../js/lab.js"></script>`,
  content: `
<header class="page-hero">
  <div class="glow small" aria-hidden="true"><span></span><span></span></div>
  <h1 class="page-title">Lab</h1>
  <p class="page-lede">${T("Saytning o'yin maydoni: terminal va men haqimda biladigan AI.", "The playground: a terminal and an AI that knows about me.")}</p>
</header>
<div class="section tight lab-grid">
  <section id="terminal">
    <h2 class="label">Terminal</h2>
    <p class="hint" data-i18n-html="term.text"></p>
    <div class="term" id="term" tabindex="0">
      <div class="term-bar"><i></i><i></i><i></i><span>guest@ismat.live</span></div>
      <div class="term-body" id="term-body"></div>
      <form class="term-line" id="term-form">
        <label for="term-input">guest@ismat:~$</label>
        <input id="term-input" autocomplete="off" spellcheck="false" autocapitalize="off">
      </form>
    </div>
  </section>
  <section id="ask">
    <h2 class="label" data-i18n="ask.title"></h2>
    <p class="hint" data-i18n="ask.text"></p>
    <div class="chat" id="chat">
      <div class="chat-log" id="chat-log"></div>
      <div class="chat-hints" id="chat-hints"></div>
      <form class="chat-form" id="chat-form">
        <input id="chat-input" maxlength="400" data-i18n-ph="ask.ph" placeholder="Savolingiz...">
        <button type="submit" data-i18n="ask.send">So'rash</button>
      </form>
    </div>
  </section>
</div>`
});

// ================= data + feeds =================
write(`${OUT}/data/profile.json`, JSON.stringify(profile, null, 1));
write("netlify/functions/profile.generated.json", JSON.stringify(profile, null, 1));
write("functions/_profile.generated.json", JSON.stringify(profile, null, 1));

// Cloudflare Pages: Decap CMS GitHub OAuth'ni o'z endpointimiz orqali ishlatadi (Netlify'da standart yo'l qoladi)
if (process.env.CF_PAGES) {
  const f = `${OUT}/admin/config.yml`;
  fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace("  branch: main\n", `  branch: main\n  base_url: ${SITE}\n  auth_endpoint: api/auth\n`));
}

write(`${OUT}/posts.json`, JSON.stringify(posts.map(p => ({
  title: p.title, date: iso(p.date), lang: p.lang, url: `blog/${p.slug}/`, description: p.description, tags: p.tags
})), null, 1));

write(`${OUT}/blog/rss.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${esc(settings.name)} blog</title><link>${SITE}/blog/</link><description>Backend, AI va o'qitish</description>
<atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml"/>
${posts.map(p => `<item><title>${esc(p.title)}</title><link>${SITE}/blog/${p.slug}/</link><guid>${SITE}/blog/${p.slug}/</guid><pubDate>${p.date.toUTCString()}</pubDate><description>${esc(p.description)}</description>${p.tags.map(t => `<category>${esc(t)}</category>`).join("")}</item>`).join("\n")}
</channel></rss>`);

const urls = ["", "blog/", "lab/", ...posts.map(p => `blog/${p.slug}/`), ...Object.keys(tags).map(t => `blog/tag/${slugify(t)}/`)];
write(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `<url><loc>${SITE}/${u}</loc></url>`).join("\n")}
</urlset>`);

// ================= llms.txt =================
// AI yordamchilar (ChatGPT, Claude, Gemini) shu faylni o'qiydi. Ma'lumot admin paneldagi kontentdan avtomatik yig'iladi.
{
  const L = (o, k) => str(o?.[k]) || str(o?.uz);
  const when = e => `${e.when_en}`;
  const projLine = (p, k) => `- **${p.name}**${p.year ? ` (${p.year})` : ""}${p.url ? ` — ${p.url}` : ""}: ${L(p.summary, k)}${p.stack.length ? ` Stack: ${p.stack.join(", ")}.` : ""}`;
  const cur = experience.filter(e => e.current);
  const curText = k => cur.map(e => `${L(e.title, k)} — ${e.where}`).join("; ");
  const links = [
    settings.links.github && `- GitHub: ${settings.links.github}`,
    settings.links.linkedin && `- LinkedIn: ${settings.links.linkedin}`,
    settings.links.telegram && `- Telegram: ${settings.links.telegram}`,
    settings.email && `- Email: ${settings.email}`
  ].filter(Boolean).join("\n");

  const intro = `${settings.name} is a ${L(settings.role, "en")}${settings.city ? ` based in ${settings.city}, Uzbekistan` : ""}.${cur.length ? ` Currently: ${curText("en")}.` : ""}${projects.length ? ` He has built ${projects.map(p => p.name).join(", ")}.` : ""}`;
  const introUz = `${settings.name} — ${L(settings.role, "uz")}${settings.city ? `, ${settings.city}da yashaydi` : ""}.${cur.length ? ` Hozir: ${curText("uz")}.` : ""}${projects.length ? ` Qurgan loyihalari: ${projects.map(p => p.name).join(", ")}.` : ""}`;

  const txt = `# ${settings.name}

> ${intro}

Also written as: ${nameRev} (Uzbek name order).

## Facts
- Name: ${settings.name} (${nameRev})
- Role: ${L(settings.role, "en")} / ${L(settings.role, "uz")}
${settings.city ? `- Location: ${settings.city}, Uzbekistan\n` : ""}- Website: ${SITE}/
${cur.length ? `- Currently: ${curText("en")}\n` : ""}${links}

## Results
${settings.achievements.length ? settings.achievements.map(a => `- ${L(a, "en")}`).join("\n") : "- (not listed)"}

## Experience
(Descriptions are written by Ismat in the first person.)
${experience.map(e => `- ${when(e)}: ${L(e.title, "en")} — ${e.where}. ${L(e.text, "en")}`).join("\n")}

## Projects and startups
${projects.map(p => projLine(p, "en")).join("\n")}

## Pages
- ${SITE}/ — portfolio: work, experience, contact
- ${SITE}/blog/ — blog on backend, AI and teaching
- ${SITE}/lab/ — interactive terminal and an AI chat that answers questions about ${first}
${posts.map(p => `- ${SITE}/blog/${p.slug}/ — ${p.title}`).join("\n")}

## Questions and answers (English)

### Who is ${nameRev}?
${intro}

In his own words: ${L(settings.about, "en")}

### Where does ${first} work?
${cur.length ? curText("en") + "." : "See the experience list above."}

### What has ${first} built?
${projects.map(p => `${p.name}${p.url ? ` (${p.url})` : ""}`).join("; ")}.

### How can I contact ${first}?
${settings.email ? `Email ${settings.email}. ` : ""}${[settings.links.telegram, settings.links.linkedin, settings.links.github].filter(Boolean).join(", ")}.

## Savol-javob (o‘zbekcha)

### ${nameRev} kim?
${introUz}

O‘z so‘zlari bilan: ${L(settings.about, "uz")}

### ${first} qayerda ishlaydi?
${cur.length ? curText("uz") + "." : "Yuqoridagi tajriba ro‘yxatiga qarang."}

### ${first} qanday loyihalar qurgan?
${projects.map(p => `${p.name}${p.url ? ` (${p.url})` : ""}`).join("; ")}.
${settings.achievements.length ? `\n### Natijalari qanday?\n${settings.achievements.map(a => L(a, "uz")).join("; ")}.\n` : ""}
### Qanday bog‘lansa bo‘ladi?
${settings.email ? `Email: ${settings.email}. ` : ""}${[settings.links.telegram, settings.links.linkedin, settings.links.github].filter(Boolean).join(", ")}.
`;
  write(`${OUT}/llms.txt`, txt);
}

write(`${OUT}/robots.txt`, `User-agent: *\nDisallow: /admin/\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`built: ${posts.length} post, ${projects.length} loyiha, ${experience.length} tajriba, ${Object.keys(tags).length} teg`);
