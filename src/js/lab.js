import { applyLang } from "./i18n.js";
import { initTerminal } from "./terminal.js";
import { initChat } from "./chat.js";

async function boot() {
  const profile = await fetch(new URL("../data/profile.json", import.meta.url)).then(r => r.json());
  applyLang(document.documentElement.dataset.lang || "uz");
  initTerminal(profile);
  initChat(profile);
}

document.addEventListener("sitelang", e => applyLang(e.detail));
boot();
