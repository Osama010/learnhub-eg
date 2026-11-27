import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing, downloadBlob } from "../../shared/common.js";
import { bindTeacherTabs, teacherCache, teacherLoad, teacherLoadLessons, teacherTabs } from "./dashboard.js";
import { lessonsState } from "./lessons.js";
import { AN_CSS, anAvg, anBandsSvg, anPct, anTrendSvg, anTs } from "../../shared/analytics-kit.js";
import { termCurrent } from "../../shared/terms.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { listActivityOfTeacher } from "../../main/data.js";
import { gradesOfStage } from "../../domain/student.js";
import { termName } from "../../domain/term.js";
import { anExportRows } from "../../domain/reporting.js";
import { analyticsCsv, buildAnalyticsModel } from "./analytics.presenter.js";

/* ======================= داشبورد التحليل للمدرس ======================= */
let tanState = { grade: "", days: 30, term: 0 };
// بيحسب كل أرقام الداشبورد من الداتا المحمّلة (من غير قراءات جديدة)
function buildTeacherAnalytics(opts, acts, now) {
  return buildAnalyticsModel({ opts, acts, now, students: teacherCache, data: lessonsState, kit: { anAvg, anPct, anTs }, currentTerm: termCurrent() });
}

function anDashHtml(m) {
  const kpi = (v, l) => T("teacher.kpi", { l, v });
  const empty = (t) => T("teacher.empty", { t });
  return T("teacher.anDashHtml", { AN_CSS, anBandsSvg, anTrendSvg, empty, esc, kpi, m });
}

function teacherAnalyticsExport(kind, m) {
  const stamp = new Date().toISOString().slice(0, 10), rows = anExportRows(m);
  if (kind === "csv") {
    downloadBlob(new Blob([analyticsCsv(rows)], { type: "text/csv;charset=utf-8" }), `تحليل-${stamp}.csv`);
  } else {
    const escP = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    const html = T("teacher.teacherAnalyticsExport", { escP, rows });
    downloadBlob(new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel" }), `تحليل-${stamp}.xls`);
  }
}
function teacherAnalyticsPrint(m) {
  const w = window.open("", "_blank");
  if (!w) { alert("المتصفح مانع النافذة المنبثقة. اسمح بيها وجرّب تاني."); return; }
  const escP = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  w.document.write(T("teacher.teacherAnalyticsPrint", { anDashHtml, escP, fbProfile, m, tanState }));
  w.document.close();
}

let tanCache = null;
export async function renderTeacherAnalytics() {
  if (bailIfSignedOut()) return;
  if (!fbUser) return renderLogin();
  app.innerHTML = T("teacher.renderTeacherAnalytics");
  try {
    await Promise.all([teacherLoad(), teacherLoadLessons()]);
    const actSnap = await listActivityOfTeacher(fbUser.uid);
    tanCache = actSnap;
  } catch (e) { app.innerHTML = T("teacher.renderTeacherAnalytics_2", { e, esc }); return; }
  drawTeacherAnalytics();
}
function drawTeacherAnalytics() {
  const m = buildTeacherAnalytics(tanState, tanCache || []);
  const grades = [...new Set(((fbProfile && fbProfile.stages) || []).flatMap((st) => gradesOfStage(st)))];
  app.innerHTML = T("teacher.drawTeacherAnalytics", { anDashHtml, closing, esc, fbProfile, grades, m, tanState, teacherTabs, termName });
  bindTeacherTabs();
  document.getElementById("an-grade").onchange = (e) => { tanState.grade = e.target.value; drawTeacherAnalytics(); };
  document.getElementById("an-days").onchange = (e) => { tanState.days = Number(e.target.value); drawTeacherAnalytics(); };
  document.getElementById("an-term").onchange = (e) => { tanState.term = Number(e.target.value); drawTeacherAnalytics(); };
  document.getElementById("an-print").onclick = () => teacherAnalyticsPrint(m);
  document.getElementById("an-xls").onclick = () => teacherAnalyticsExport("xls", m);
  import("./weak-points.js").then((m) => { const f = document.getElementById("an-grade"); m.mountTeacherWeak(f && f.closest(".filterrow")); }).catch(() => {});
  document.getElementById("an-csv").onclick = () => teacherAnalyticsExport("csv", m);
}
