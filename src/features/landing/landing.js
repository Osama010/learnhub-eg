
import { openLoginModal } from "../auth/login.js";
import { supportWhatsAppUrl, waDirect } from "../../shared/site-config.js";
import { pwaCanPrompt, pwaIsIOS, pwaIsStandalone, pwaPrompt } from "../../shared/pwa.js";
import { setupChatbot } from "./chatbot.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { aboutGet, aboutPhotoHtml, aboutRich, loadAboutSettings, loadFooterSettings } from "../about/about.js";
import { loadStatsSettings, statsGet, t4kObserveReveal } from "./stats.js";
import { closing } from "../../shared/common.js";
import { themeCycle, themeIcon } from "../../shared/theme.js";
import { LANDING_FEATURES, readMoreLabel, splitParas, splitSkills } from "./landing.presenter.js";
import { LOGO_FULL_SVG } from "../../shared/topbar.js";

/* ---------- صفحة الهبوط (الرابط الرئيسي لو مفيش جلسة) ---------- */
export async function renderLanding() {
  app.innerHTML = T("app.renderLanding");
  await Promise.all([loadAboutSettings(), loadFooterSettings(), loadStatsSettings()]);
  const a = aboutGet(), st = statsGet();
  const skills = splitSkills(a.skills);
  const paras = splitParas(a.longBio);
  app.innerHTML = T("app.renderLanding_2", { LANDING_FEATURES, LOGO_FULL_SVG, a, aboutPhotoHtml, aboutRich, closing, esc, paras, skills, st, themeIcon, waUrl: safeWa() });
  document.querySelectorAll("[data-themebtn]").forEach((b) => b.onclick = () => themeCycle());
  document.querySelectorAll("[data-goto]").forEach((el) => el.onclick = (ev) => {
    ev.preventDefault();
    const t = document.getElementById(el.dataset.goto);
    if (t && t.scrollIntoView) t.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const more = document.getElementById("lp-more");
  if (more) more.onclick = () => {
    const l = document.getElementById("lp-long");
    const open = l.style.display === "none";
    l.style.display = open ? "block" : "none";
    more.textContent = readMoreLabel(open);
  };
  setupLoginMenu();
  try { document.querySelectorAll("[data-wa]").forEach((a) => a.addEventListener("click", (ev) => waDirect(ev))); } catch (_) {}
  setupInstall();
  setupChatbot();
  window.scrollTo(0, 0);
  t4kObserveReveal(app);
  setupIntroVideo();
}

/* ---------- الفيديو التعريفي ----------
   بيشتغل أول ما الصفحة تفتح وهو صامت (المتصفح بيمنع الصوت من غير لمسة). أول ضغطة/لمسة/زرار في أي مكان
   بتفتح الصوت (ولو لسه في أول ثواني بيرجع للبداية)، وفي زرار صوت واضح. لو ملف الفيديو مش موجود بيظهر مكانه كارت بسيط. */
const UNMUTE_EVENTS = ["pointerdown", "touchend", "click", "keydown", "wheel", "scroll"];
export function setupIntroVideo() {
  const box = document.getElementById("lp-video"), v = document.getElementById("lp-vid");
  if (!box || !v) return;
  const btn = document.getElementById("lp-snd"), hint = document.getElementById("lp-vhint");
  const ico = document.getElementById("lp-sndico"), txt = document.getElementById("lp-sndtxt");
  let off = false;
  const paint = () => {
    const on = !v.muted;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    ico.textContent = on ? "🔊" : "🔇";
    txt.textContent = on ? "كتم الصوت" : "تشغيل الصوت";
    box.classList.toggle("sound-on", on);
    if (on && hint) hint.style.display = "none";
  };
  const detach = () => { off = true; UNMUTE_EVENTS.forEach((n) => document.removeEventListener(n, onFirst, true)); };
  const unmute = () => {
    try {
      v.muted = false; v.volume = 1;
      if (v.currentTime < 3) v.currentTime = 0;
      const p = v.play();
      const ok = () => { paint(); if (!v.muted) detach(); };
      if (p && p.then) p.then(ok).catch(() => { v.muted = true; paint(); v.play().catch(() => {}); });
      else ok();
    } catch (_) { v.muted = true; paint(); }
  };
  function onFirst(ev) {
    if (!document.body.contains(v)) { detach(); return; }
    if (ev && (ev.type === "wheel" || ev.type === "scroll")) { document.removeEventListener("wheel", onFirst, true); document.removeEventListener("scroll", onFirst, true); }
    if (ev && ev.target && btn.contains(ev.target)) return;
    unmute();
  }
  const fallback = () => { box.classList.add("no-video"); detach(); };
  const src = v.querySelector("source");
  if (src) src.addEventListener("error", fallback);
  v.addEventListener("error", fallback);
  setTimeout(() => { if (v.readyState === 0 && v.networkState === 3) fallback(); }, 3000);
  btn.onclick = () => { if (v.muted) unmute(); else { v.muted = true; paint(); } detach(); };
  UNMUTE_EVENTS.forEach((n) => document.addEventListener(n, onFirst, true));
  v.muted = true;
  const p = v.play();
  if (p && p.catch) p.catch(() => {});
  v.addEventListener("volumechange", paint);
  paint();
}

/* ---------- قايمة "دخول" في الهيدر: طالب أو مدرس ----------
   لو الجافاسكريبت وقع لأي سبب، الزرار نفسه لسه لينك عادي لصفحة الدخول. */
export function setupLoginMenu() {
  try {
    document.querySelectorAll("[data-login]").forEach((a) => a.addEventListener("click", (ev) => {
      ev.preventDefault();
      const dd = document.querySelector(".lp-dd");
      if (dd) dd.classList.remove("open");
      openLoginModal(a.dataset.login);
    }));
    const btn = document.getElementById("lp-login");
    const dd = btn && btn.closest(".lp-dd");
    if (!btn || !dd) return;
    const set = (open) => { dd.classList.toggle("open", open); btn.setAttribute("aria-expanded", open ? "true" : "false"); };
    btn.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); set(!dd.classList.contains("open")); };
    const closeIf = (ev) => {
      if (!document.body.contains(dd)) { document.removeEventListener("click", closeIf); document.removeEventListener("keydown", onKey); return; }
      if (!dd.contains(ev.target)) set(false);
    };
    const onKey = (ev) => { if (ev.key === "Escape") set(false); };
    document.addEventListener("click", closeIf);
    document.addEventListener("keydown", onKey);
  } catch (e) { console.warn("قايمة الدخول مش شغالة", e); }
}

function safeWa() { try { return supportWhatsAppUrl(); } catch (_) { return ""; } }

/* ---------- زرار تثبيت المنصة على الموبايل ----------
   أندرويد/كروم: بيفتح نافذة التثبيت الأصلية. آيفون ومتصفحات تانية: بنظهر خطوات بسيطة. لو المنصة مثبتة بالفعل الزرار بيختفي. */
export function setupInstall() {
  try {
    const btn = document.getElementById("lp-install");
    if (!btn) return;
    if (pwaIsStandalone()) { const box = btn.closest(".lp-install"); if (box) box.style.display = "none"; return; }
    btn.onclick = async () => {
      try {
        if (pwaCanPrompt()) { await pwaPrompt(); return; }
        const steps = pwaIsIOS()
          ? "افتح الموقع في Safari، اضغط زرار المشاركة (المربع اللي فيه سهم لفوق)، ثم اختار «إضافة إلى الشاشة الرئيسية»."
          : "من قايمة المتصفح (النقط التلاتة ⋮) اختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».";
        const ov = document.createElement("div");
        ov.className = "overlay lgm";
        ov.innerHTML = '<div class="card lgm-card"><button type="button" class="lgm-x" aria-label="إغلاق">✕</button><div class="lgm-title">📲 تثبيت المنصة</div><p style="line-height:1.9;margin:0;">' + steps + '</p></div>';
        ov.onclick = (e) => { if (e.target === ov || e.target.classList.contains("lgm-x")) ov.remove(); };
        document.body.appendChild(ov);
      } catch (e) { console.warn("التثبيت مش متاح", e); }
    };
  } catch (e) { console.warn("زرار التثبيت مش شغال", e); }
}
