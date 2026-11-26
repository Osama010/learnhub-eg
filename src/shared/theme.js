import { signOut } from "../core/session.js";
import { T } from "../core/templates.js";
import { esc } from "../core/utils.js";
import { LOGO_ICON_SVG } from "./topbar.js";

/* ---------- الوضع النهاري/الليلي: تلقائي (حسب الجهاز) أو اختيار يدوي محفوظ على الجهاز ---------- */
const THEME_KEY = "stTheme"; // auto | light | dark
function themeGet() { try { return localStorage.getItem(THEME_KEY) || "auto"; } catch (e) { return "auto"; } }
function themeResolve() {
  const t = themeGet();
  if (t !== "auto") return t;
  return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
}
function themeApply() {
  if (document.documentElement && document.documentElement.setAttribute) document.documentElement.setAttribute("data-theme", themeResolve());
}
export function themeIcon() { return themeGet() === "dark" ? "🌙" : themeGet() === "light" ? "☀️" : "🌓"; }
export function themeCycle() {
  const order = ["auto", "light", "dark"];
  const next = order[(order.indexOf(themeGet()) + 1) % order.length];
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  themeApply();
  document.querySelectorAll("[data-themebtn]").forEach((b) => { b.textContent = themeIcon(); });
}
// أول تسجيل: طبّق الوضع واسمع لتغيّر إعداد الجهاز في الوضع التلقائي
(function themeInit() {
  themeApply();
  if (window.matchMedia) {
    try {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (themeGet() === "auto") themeApply(); });
    } catch (e) {}
  }
})();

export function platNavHtml(name, avatarUrl, profileHash) {
  const nm = String(name || "").trim();
  const av = avatarUrl
    ? T("app.platNavHtml", { avatarUrl })
    : T("app.platNavHtml_2", { esc, nm });
  return T("app.platNavHtml_3", { LOGO_ICON_SVG, av, esc, nm, profileHash, themeIcon });
}

export function bindPlatNav() {
  // زرار الاسم/الصورة يفتح ويقفل قايمة الحساب
  document.querySelectorAll(".pnav [data-medrop]").forEach((b) => b.onclick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const d = b.parentElement.querySelector(".medrop");
    const willOpen = d.style.display === "none";
    document.querySelectorAll(".medrop").forEach((x) => { x.style.display = "none"; });
    if (willOpen) d.style.display = "block";
  });
  document.querySelectorAll(".pnav [data-prof]").forEach((b) => b.onclick = () => { location.hash = b.dataset.prof; });
  document.querySelectorAll("[data-themebtn]").forEach((b) => b.onclick = () => themeCycle());
  document.querySelectorAll(".pnav [data-mesout]").forEach((b) => b.onclick = () => signOut());
  // أي دوس برا القايمة يقفلها — بتتسجل مرة واحدة على مستوى الصفحة
  if (!window.__meDropBound) {
    window.__meDropBound = true;
    document.addEventListener("click", (e) => {
      if (e && e.target && e.target.closest && e.target.closest(".mewrap")) return;
      document.querySelectorAll(".medrop").forEach((x) => { x.style.display = "none"; });
    });
  }
}