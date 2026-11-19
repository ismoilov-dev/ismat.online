# ismat.live

Shaxsiy sayt: portfolio, interaktiv terminal, AI chat va blog.
Server kerak emas: statik sayt Netlify'da turadi, AI chat Netlify Function orqali ishlaydi, blog Decap CMS admin panelidan yoziladi.

Hamma narsa admin paneldan boshqariladi: blog, loyihalar, tajriba va profil.

```
content/blog/*.md         blog postlar
content/projects/*.md     loyihalar (har biri alohida fayl)
content/experience/*.md   ish tajribasi
src/data/profile.json     profil: ism, rol, bio, men haqimda, havolalar, "hozir", texnologiyalar
src/img/uploads/          admin paneldan yuklangan rasmlar
templates/base.html       umumiy shablon (header, footer)
src/css/style.css         dizayn (dark/light ranglar :root da)
src/js/                   tema/til, Lab (terminal, AI chat)
build.mjs                 hamma sahifalarni dist/ ga yig'adi
dev.mjs                   lokal server + admin + avto-build
```

Sahifalar: `/` (hero, ishlar, tajriba, blog, aloqa) · `/blog/` · `/blog/tag/<teg>/` · `/blog/<slug>/` · `/lab/`

Bo'sh bo'limlar (masalan, hali loyiha qo'shilmagan bo'lsa) bosh sahifada ko'rinmaydi.

### Admin panel

`npm run dev` → http://localhost:5173/admin/ → **Login** (lokalda GitHub kerak emas).

| Bo'lim | Nima qilasiz |
|---|---|
| **Blog** | post yozish, tahrirlash, o'chirish, qoralama |
| **Loyihalar** | nom, yil, tavsif (uz/en), texnologiyalar, havolalar, muqova rasmi, "asosiy loyiha", tartib raqami |
| **Tajriba** | lavozim (uz/en), kompaniya, boshlangan/tugagan sana (`2024-09`, hozir ishlasangiz bo'sh), tavsif |
| **Sozlamalar → Profil** | ism, rol, bio, men haqimda, email, GitHub/LinkedIn/Telegram, "hozir" ro'yxati, texnologiyalar |

Saqlaganingizda fayl `content/` yoki `src/data/` ga yoziladi va sayt o'zi qayta build bo'ladi.

## Lokal ishga tushirish

```bash
npm install
npm run dev        # http://localhost:5173
```

Lokalda AI chat "oflayn rejim"da ishlaydi (saytdagi ma'lumotdan javob beradi). Haqiqiy Claude javobi uchun `npx netlify dev` ishlating va `.env` ga `ANTHROPIC_API_KEY=...` yozing.

## Deploy: Cloudflare (Workers + static assets)

Repo Cloudflare'ning yangi Workers oqimi uchun tayyor: `wrangler.toml` statik saytni (`dist/`) va `worker/index.js` ni ulaydi. Worker `/api/chat` (AI chat), `/api/auth` + `/api/callback` (Decap uchun GitHub OAuth) va `/admin` (parol) ni boshqaradi. Kod `functions/` papkasida turadi.

1. dash.cloudflare.com → **Workers & Pages → Create application → Continue with GitHub** → `ismoilov-dev/ismat.online`.
2. Project name `ismat-online` (`wrangler.toml` dagi `name` bilan bir xil bo'lsin). Build command `npm run build`. Deploy command standart: `npx wrangler deploy`.
3. Deploydan keyin **Settings → Variables and secrets** ga qo'shing (Secret turida):
   - `ANTHROPIC_API_KEY` (AI chat uchun), ixtiyoriy `CLAUDE_MODEL`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SECRET` (secret: uzun tasodifiy qator)
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (blog admin paneli uchun)
4. GitHub → Settings → Developer settings → OAuth Apps: Authorization callback URL `https://ismat.online/api/callback`.
5. **Settings → Domains & Routes → Add → Custom domain** → `ismat.online`.
6. Hammasi ishlagach, Netlify'dagi saytni o'chirishingiz mumkin.

Cloudflare build paytida `WORKERS_CI` o'zgaruvchisini o'zi qo'yadi, shu sabab `build.mjs` admin `config.yml` ga `base_url` va `auth_endpoint` ni o'zi qo'shadi. Netlify'da esa standart OAuth ishlayveradi.

Lokal sinash: `npm run build && npx wrangler dev`.

---

## Eski yo'l: Netlify (1-qadam, GitHub)

```bash
git init && git add . && git commit -m "first version"
git branch -M main
git remote add origin https://github.com/ismoilov-dev/portfolio.git
git push -u origin main
```

Repo nomi boshqa bo'lsa, `src/admin/config.yml` dagi `repo:` qatorini ham o'zgartiring.

## 2-qadam, Netlify

1. app.netlify.com → **Add new site → Import an existing project** → GitHub → repo'ni tanlang.
2. Build sozlamalari `netlify.toml` dan o'zi o'qiladi (`npm run build`, `dist`).
3. **Site configuration → Environment variables** → `ANTHROPIC_API_KEY` qo'shing (console.anthropic.com dan olinadi). Ixtiyoriy: `CLAUDE_MODEL` (standart `claude-haiku-5-5`).
4. Deploy tugagach `https://<nom>.netlify.app` ochiladi.

## 3-qadam, Spaceship domeni (.live)

Netlify'da: **Domain management → Add a domain** → `ismat.live` yozing (domeningiz nomi).
Netlify DNS'ni yoqmang, "external DNS" yo'li bilan boring.

Spaceship'da: **Domain → DNS records** bo'limiga:

| Type  | Host | Value                      |
|-------|------|----------------------------|
| A     | @    | 75.2.60.5                  |
| CNAME | www  | `<nom>.netlify.app`        |

Eski A/AAAA yozuvlar (Spaceship parking) bo'lsa o'chiring. DNS 1-24 soatda tarqaladi, keyin Netlify HTTPS sertifikatni o'zi chiqaradi.

`build.mjs` da sitemap/RSS uchun domen `https://ismat.live`. Boshqa domen olsangiz, Netlify'da `SITE_URL` env qo'shing.

## 4-qadam, blog admin paneli (/admin)

1. GitHub → Settings → Developer settings → **OAuth Apps → New OAuth App**
   - Homepage URL: `https://ismat.live`
   - Authorization callback URL: `https://api.netlify.com/auth/done`
2. Client ID va Client Secret'ni nusxalang.
3. Netlify → **Site configuration → Access & security → OAuth → Install provider** → GitHub → ID va Secret'ni kiriting.
4. `https://ismat.live/admin/` ga kiring → "Login with GitHub".

Post yozib "Publish" bossangiz, Decap uni `content/blog/` ga commit qiladi, Netlify qayta build qiladi, 1-2 daqiqada saytda chiqadi. "Qoralama" belgilangan postlar saytda ko'rinmaydi.

## Matnni o'zgartirish

- Hamma ma'lumot admin paneldan o'zgartiriladi (yuqoridagi jadval).
- Lab sahifasidagi terminal va chat yozuvlari: `src/js/i18n.js` (uz va en).
- AI chat faqat admin paneldagi ma'lumotlardan javob beradi (build `netlify/functions/profile.generated.json` ni yaratadi).
# ismat.online
