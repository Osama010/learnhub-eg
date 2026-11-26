import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../landing/landing.js";
import { bindTeacherTabs, teacherTabs } from "./dashboard.js";
import { gradeChip, gradeSelectHtml } from "./lessons.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { addAnnouncement, deleteAnnouncement, listTeacherAnnouncements } from "../../main/data.js";
import { fmtTs } from "../../domain/format.js";
import { serverNow } from "../../main/data.js";
import { buildAnnouncement, resolveStage, validateAnnouncement } from "./announcements.presenter.js";
import { STAGE_NAMES } from "./lessons.presenter.js";

/* ---------- الإعلانات لطلاب مرحلة ---------- */
let teacherAnn = [];
let annStageSel = "";
let annGradeSel = "";

export async function renderTeacherAnnouncements() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("teacher.renderTeacherAnnouncements");
  try {
    teacherAnn = await listTeacherAnnouncements(fbUser.uid);
  } catch (e) { app.innerHTML = T("teacher.renderTeacherAnnouncements_2", { e, esc }); return; }
  const myStages = (fbProfile && fbProfile.stages) || [];
  annStageSel = resolveStage(annStageSel, myStages);
  app.innerHTML = T("teacher.renderTeacherAnnouncements_3", { STAGE_NAMES, annGradeSel, annStageSel, closing, esc, fmtTs, gradeChip, gradeSelectHtml, myStages, teacherAnn, teacherTabs });
  bindTeacherTabs();
  document.getElementById("an-stage").onchange = (e) => { annStageSel = e.target.value; annGradeSel = ""; renderTeacherAnnouncements(); };
  document.getElementById("an-grade").onchange = (e) => annGradeSel = e.target.value;
  document.getElementById("an-send").onclick = async () => {
    const text = document.getElementById("an-text").value.trim();
    const m = document.getElementById("an-msg");
    const bad = validateAnnouncement(text, annStageSel);
    if (bad) { m.className = "msg bad"; m.textContent = bad; return; }
    const btn = document.getElementById("an-send");
    btn.disabled = true;
    try {
      await addAnnouncement(buildAnnouncement({ uid: fbUser.uid, profile: fbProfile, stage: annStageSel, grade: annGradeSel, text, createdAt: serverNow() }));
      await renderTeacherAnnouncements();
    } catch (e) {
      btn.disabled = false;
      m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e);
    }
  };
  document.querySelectorAll("[data-adel]").forEach((b) => b.onclick = async () => {
    if (!confirm("تحذف الإعلان ده؟")) return;
    try { await deleteAnnouncement(b.dataset.adel); await renderTeacherAnnouncements(); }
    catch (e) { alert("مشكلة: " + (e.message || e)); }
  });
  window.scrollTo(0, 0);
}