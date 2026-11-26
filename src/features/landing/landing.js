
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { aboutGet, aboutPhotoHtml, aboutRich, loadAboutSettings, loadFooterSettings } from "../about/about.js";
import { loadStatsSettings, statsGet, t4kObserveReveal } from "./stats.js";
import { closing } from "../../shared/common.js";
import { themeCycle, themeIcon } from "../../shared/theme.js";
import { LANDING_FEATURES, activeTeachers, initialOf, readMoreLabel, splitParas, splitSkills } from "./landing.presenter.js";
import { listActiveTeachersPublic } from "../../main/data.js";

/* ---------- صفحة الهبوط (الرابط الرئيسي لو مفيش جلسة) ---------- */
export async function renderLanding() {
  app.innerHTML = T("app.renderLanding");
  let teachers = [];
  await Promise.all([
    loadAboutSettings(), loadFooterSettings(), loadStatsSettings(),
    (async () => {
      try {
        const snap = await listActiveTeachersPublic();
        teachers = activeTeachers(snap, new Date());
      } catch (_) { teachers = []; }
    })(),
  ]);
  const a = aboutGet(), st = statsGet();
  const skills = splitSkills(a.skills);
  const paras = splitParas(a.longBio);
  const initial = (n) => esc(initialOf(n));
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
    more.textContent = readMoreLabel(open);
  };
  window.scrollTo(0, 0);
  t4kObserveReveal(app);
}
