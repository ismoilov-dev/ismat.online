// Theme + UI language. Runs in <head> so the page never flashes the wrong colors or language.
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var put = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

  root.dataset.theme = get("theme") || "dark";

  var lang = get("lang");
  if (lang !== "uz" && lang !== "en") lang = (navigator.language || "").indexOf("en") === 0 ? "en" : "uz";
  root.dataset.lang = lang;

  function setTheme(theme, store) {
    root.dataset.theme = theme;
    if (store) put("theme", theme);
  }

  function setLang(next) {
    root.dataset.lang = next;
    put("lang", next);
    document.dispatchEvent(new CustomEvent("sitelang", { detail: next }));
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest(".theme-toggle")) setTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
    if (e.target.closest(".lang-toggle")) setLang(root.dataset.lang === "en" ? "uz" : "en");
  });
})();
