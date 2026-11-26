import { getStatsSettings } from "../../main/data.js";
import { countTarget, countText, statsWithDefaults } from "./stats.presenter.js";
import { isDataReady } from "../../main/data.js";

/* ---------- أرقام صفحة الهبوط (settings/stats، بيكتبها الأدمن) + حركات ---------- */
export var statsCfg = null;
export function statsGet() { return statsWithDefaults(statsCfg); }
export async function loadStatsSettings() {
  try {
    if (!isDataReady()) return;
    statsCfg = await getStatsSettings();
  } catch (_) { statsCfg = statsCfg || {}; }
}
function reducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (_) { return false; }
}
/* عدّاد: من صفر لحد الرقم الثابت ويقف. لو الجهاز طالب تقليل الحركة بيظهر الرقم النهائي علطول */
function t4kCountUp(el, target) {
  const n = countTarget(target);
  const fmt = (v) => countText(v, false);
  if (reducedMotion() || typeof requestAnimationFrame !== "function") { el.textContent = fmt(n) + "+"; return; }
  const dur = 1600, t0 = Date.now();
  const step = () => {
    const k = Math.min(1, (Date.now() - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(n * e) + (k >= 1 ? "+" : "");
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
/* ظهور تدريجي للعناصر .rv لما توصل للشاشة + تشغيل العدادات [data-count] */
export function t4kObserveReveal(root) {
  const scope = root || document;
  const items = Array.from(scope.querySelectorAll(".rv, [data-count]"));
  const show = (el) => {
    el.classList.add("rv-in");
    if (el.hasAttribute("data-count") && !el.dataset.done) { el.dataset.done = "1"; t4kCountUp(el, el.getAttribute("data-count")); }
  };
  if (typeof IntersectionObserver === "undefined" || reducedMotion()) { items.forEach(show); return; }
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } }), { threshold: 0.15 });
  items.forEach((el) => io.observe(el));
}
/* كونفيتي احتفالي (CSS بس) — بيتشال لوحده بعد ثواني */
export function t4kConfetti() {
  if (reducedMotion() || typeof document === "undefined" || !document.body) return;
  const box = document.createElement("div");
  box.className = "confetti";
  const colors = ["#0d9488", "#f59e0b", "#3b82f6", "#ef4444", "#22c55e", "#a855f7"];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement("i");
    p.style.cssText = `left:${Math.random() * 100}%; background:${colors[i % colors.length]}; animation-delay:${(Math.random() * 0.6).toFixed(2)}s; animation-duration:${(1.8 + Math.random() * 1.4).toFixed(2)}s; transform:rotate(${Math.floor(Math.random() * 360)}deg);`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3600);
}

export function set_statsCfg(v) { return (statsCfg = v); }
