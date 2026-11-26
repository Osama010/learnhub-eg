import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing, downloadBlob } from "../../shared/common.js";
import { bindTeacherTabs, studentQuizAvg, teacherCache, teacherLoad, teacherLoadLessons, teacherShowStudent, teacherTabs } from "./dashboard.js";
import { quizAttemptsFor, lessonsState } from "./lessons.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { GRADES, gradesOfStage } from "../../domain/student.js";
import { STAGE_NAMES } from "./lessons.presenter.js";
import { TREP_TYPES, buildReportModel, reportCsv } from "./reports.presenter.js";

/* ---------- تقارير المدرس ---------- */
let trepState = { type: "students", stage: "", grade: "", quizId: "", examId: "" };



function buildTeacherReport() {
  return buildReportModel({ students: teacherCache, state: trepState, profile: fbProfile, data: lessonsState, studentQuizAvg, quizAttemptsFor });
}

function teacherPrintReport() {
  const rep = buildTeacherReport();
  const w = window.open("", "_blank");
  if (!w) { alert("المتصفح مانع النافذة المنبثقة. اسمح بيها وجرّب تاني."); return; }
  const escP = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  w.document.write(T("teacher.teacherPrintReport", { escP, fbProfile, rep }));
  w.document.close();
}

function teacherExportReport(kind) {
  const rep = buildTeacherReport();
  const stamp = new Date().toISOString().slice(0, 10);
  const rows = rep.rows.map((r) => r.cells);
  if (kind === "csv") {
    downloadBlob(new Blob([reportCsv(rep)], { type: "text/csv;charset=utf-8" }), `${rep.title}-${stamp}.csv`);
  } else {
    const escP = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    const html = T("teacher.teacherExportReport", { escP, rep, rows });
    downloadBlob(new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel" }), `${rep.title}-${stamp}.xls`);
  }
}

export async function renderTeacherReports() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("teacher.renderTeacherReports");
  try { await Promise.all([teacherLoad(), teacherLoadLessons()]); }
  catch (e) { app.innerHTML = T("teacher.renderTeacherReports_2", { e, esc }); return; }
  const rep = buildTeacherReport();
  const myStages = (fbProfile && fbProfile.stages) || [];
  let filtersHtml = "";
  if (trepState.type === "students") {
    const gradeOpts = trepState.stage ? gradesOfStage(trepState.stage) : GRADES;
    filtersHtml = T("teacher.renderTeacherReports_3", { STAGE_NAMES, esc, gradeOpts, myStages, trepState });
  } else if (trepState.type === "stage") {
    const stSel = trepState.stage || myStages[0] || "";
    filtersHtml = T("teacher.renderTeacherReports_4", { STAGE_NAMES, esc, gradesOfStage, myStages, stSel, trepState });
  } else if (trepState.type === "quiz") {
    const sel = trepState.quizId || (lessonsState.quizzes[0] && lessonsState.quizzes[0].id) || "";
    filtersHtml = T("teacher.renderTeacherReports_5", { STAGE_NAMES, esc, sel, teacherQuizzes: lessonsState.quizzes });
  }
  app.innerHTML = T("teacher.renderTeacherReports_6", { TREP_TYPES, closing, esc, filtersHtml, rep, teacherTabs, trepState });
  bindTeacherTabs();
  document.querySelectorAll("[data-trt]").forEach((b) => b.onclick = () => { trepState = { type: b.dataset.trt, stage: "", grade: "", quizId: "", examId: "" }; renderTeacherReports(); });
  const stSel = document.getElementById("trf-stage");
  if (stSel) stSel.onchange = (e) => { trepState.stage = e.target.value; trepState.grade = ""; renderTeacherReports(); };
  const grSel = document.getElementById("trf-grade");
  if (grSel) grSel.onchange = (e) => { trepState.grade = e.target.value; renderTeacherReports(); };
  const qzSel = document.getElementById("trf-quiz");
  if (qzSel) qzSel.onchange = (e) => { trepState.quizId = e.target.value; renderTeacherReports(); };
  document.getElementById("trp-print").onclick = teacherPrintReport;
  document.getElementById("trp-csv").onclick = () => teacherExportReport("csv");
  document.getElementById("trp-xls").onclick = () => teacherExportReport("xls");
  document.querySelectorAll("[data-spop]").forEach((b) => b.onclick = () => teacherShowStudent(b.dataset.spop));
  window.scrollTo(0, 0);
}