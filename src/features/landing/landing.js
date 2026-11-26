
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { aboutGet, aboutPhotoHtml, aboutRich, loadAboutSettings, loadFooterSettings, aboutState } from "../about/about.js";
import { loadStatsSettings, statsGet, t4kObserveReveal } from "./stats.js";
import { themeCycle, themeIcon } from "../../shared/theme.js";
import { listActiveTeachersPublic } from "../../main/data.js";

/* ---------- صفحة الهبوط (الرابط الرئيسي لو مفيش جلسة) ---------- */
const LANDING_FEATURES = [
  ["📚", "دروس منظمة", "شروحات مرتبة حسب السنة والمادة"],
  ["📝", "كويزات وامتحانات", "تدريب فوري ونتيجة على طول"],
  ["🏆", "نقاط وترتيب", "تحفيز أسبوعي لكل طالب"],
  ["📱", "على الموبايل", "ثبّتها كتطبيق وادخل بضغطة"],
];
export async function renderLanding() {
  app.innerHTML = T("app.renderLanding");
  let teachers = [];
  await Promise.all([
    loadAboutSettings(), loadFooterSettings(), loadStatsSettings(),
    (async () => {
      try {
        const snap = await listActiveTeachersPublic();
        teachers = snap
          .filter((t) => (t.subType || "free") === "free" || !t.subEnd || !t.subEnd.toDate || t.subEnd.toDate() >= new Date());
      } catch (_) { teachers = []; }
    })(),
  ]);
  const a = aboutGet(), st = statsGet();
  const skills = String(a.skills || "").split(/[،,]/).map((x) => x.trim()).filter(Boolean);
  const paras = String(a.longBio || "").split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const initial = (n) => esc(String(n || "م").replace(/^(مستر|أ\.?|د\.?)\s*/, "").trim()[0] || "م");
  const tcard = (t, i) => T("app.tcard", { esc, i, initial, t });
  app.innerHTML = T("app.renderLanding_2", { LANDING_FEATURES, a, aboutPhotoHtml, aboutRich, closing, esc, paras, skills, st, tcard, teachers, themeIcon });
  document.querySelectorAll("[data-themebtn]").forEach((b) => b.onclick = () => themeCycle());
  document.querySelectorAll("[data-pickt]").forEach((b) => b.onclick = () => {
    try { localStorage.setItem("t4kPreTeacher", b.dataset.pickt); } catch (_) {}
    location.href = "student/#/register";
  });
  const more = document.getElementById("lp-more");
  if (more) more.onclick = () => {
    const l = document.getElementById("lp-long");
    const open = l.style.display === "none";
    l.style.display = open ? "block" : "none";
    more.textContent = open ? "إخفاء النبذة" : "اقرأ النبذة كاملة";
  };
  window.scrollTo(0, 0);
  t4kObserveReveal(app);
}


export function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function closing() {
  return T("app.closing", { esc, footerText: aboutState.footerText });
}

export function statusChip(st) {
  if (st === "approved") return T("app.statusChip");
  if (st === "rejected") return T("app.statusChip_2");
  if (st === "suspended") return T("app.statusChip_3");
  return T("app.statusChip_4");
}