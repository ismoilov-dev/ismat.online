export const dict = {
  uz: {
    "nav.work": "ishlar", "nav.path": "tajriba", "nav.terminal": "terminal", "nav.blog": "blog", "nav.contact": "aloqa",
    "hero.title": "Backend yozaman,<br>unga <em>AI</em> ulayman,<br>keyin o'quvchilarga o'rgataman.",
    "hero.lede": "Ismat Ismoilov. Python, Django, FastAPI va Claude API. Tester va Acadium'ni quryapman, Sfera IT Academy'da mentorman.",
    "hero.cta": "Ishlarni ko'rish ↓",
    "now.label": "hozir nima bilan bandman",
    "now.1": "Tester uchun Claude connector'ni rasmiy katalogga chiqarish",
    "now.2": "Acadium: o'qituvchi va markaz admin paneli",
    "now.3": "Lesson24'da Python backend kursi",
    "work.title": "Ishlar",
    "work.aside": "O'zim yozgan, deploy qilgan va hozir ham ishlab turganlari. Qatorni bossangiz, batafsil ochiladi.",
    "work.open": "saytni ochish", "work.docs": "Swagger", "work.try": "API'ni sinash ↓", "work.repo": "kod",
    "path.title": "Qayerda ishlaganman",
    "term.title": "Yoki terminal orqali",
    "term.text": "Backend dasturchiga ko'proq shu tanish. <code>help</code> deb yozing. <code>ask</code> bilan menga savol ham berish mumkin.",
    "ask.title": "Men haqimda so'rang",
    "ask.text": "Bu Claude, faqat mening tajribam va loyihalarim haqidagi ma'lumot bilan ishlaydi. Masalan: \"Tester qanday ishlaydi?\" yoki \"Django'da qancha tajribasi bor?\"",
    "ask.ph": "Savolingiz...", "ask.send": "So'rash",
    "ask.hello": "Salom! Ismatning loyihalari, tajribasi yoki u bilan qanday bog'lanish haqida so'rashingiz mumkin.",
    "ask.wait": "o'ylayapti...",
    "ask.offline": "(oflayn rejim: AI server ulanmagan, saytdagi ma'lumotdan javob berdim)",
    "ask.h1": "Tester qanday ishlaydi?", "ask.h2": "Qaysi texnologiyalarni biladi?", "ask.h3": "Qanday bog'lansam bo'ladi?",
    "blog.title": "Blogdan", "blog.all": "hammasi →",
    "contact.big": "Loyiha yoki ish taklifi bo'lsa, yozing.",
    "contact.city": "Qarshi, O'zbekiston"
  },
  en: {
    "nav.work": "work", "nav.path": "experience", "nav.terminal": "terminal", "nav.blog": "blog", "nav.contact": "contact",
    "hero.title": "I build backends,<br>wire <em>AI</em> into them,<br>then teach it to students.",
    "hero.lede": "Ismat Ismoilov. Python, Django, FastAPI and the Claude API. Building Tester and Acadium, mentoring at Sfera IT Academy.",
    "hero.cta": "See the work ↓",
    "now.label": "what I'm on right now",
    "now.1": "Getting the Tester connector into Claude's official directory",
    "now.2": "Acadium: teacher and center admin panel",
    "now.3": "A Python backend course on Lesson24",
    "work.title": "Work",
    "work.aside": "Things I wrote, deployed, and that are still running. Click a row to open it.",
    "work.open": "open site", "work.docs": "Swagger", "work.try": "try the API ↓", "work.repo": "code",
    "path.title": "Where I've worked",
    "term.title": "Or use the terminal",
    "term.text": "It's what a backend dev feels at home in. Type <code>help</code>. You can also ask me things with <code>ask</code>.",
    "ask.title": "Ask about me",
    "ask.text": "This is Claude, working only from what's written about my experience and projects. Try \"How does Tester work?\" or \"How much Django has he done?\"",
    "ask.ph": "Your question...", "ask.send": "Ask",
    "ask.hello": "Hi! Ask about Ismat's projects, experience, or how to reach him.",
    "ask.wait": "thinking...",
    "ask.offline": "(offline mode: the AI server isn't connected, so this answer comes from the site's own data)",
    "ask.h1": "How does Tester work?", "ask.h2": "What's his stack?", "ask.h3": "How do I contact him?",
    "blog.title": "From the blog", "blog.all": "all posts →",
    "contact.big": "Got a project or a job offer? Write to me.",
    "contact.city": "Qarshi, Uzbekistan"
  }
};

const KEY = "lang";

export function getLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "uz" || saved === "en") return saved;
  } catch {}
  return (navigator.language || "").startsWith("en") ? "en" : "uz";
}

export function t(key, lang = getLang()) {
  return dict[lang][key] ?? dict.uz[key] ?? key;
}

export function applyLang(lang) {
  try { localStorage.setItem(KEY, lang); } catch {}
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n, lang); });
  document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml, lang); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh, lang); });
  document.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
}
