import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { adminCache, adminLayout } from "./shell.js";
import { teacherStagesText } from "./subjects.js";
import { STAGES } from "./subjects.presenter.js";
import { downloadBlob } from "../landing/landing.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { GRADES } from "../../domain/student.js";
import { adminReportCsv, buildAdminReport } from "./reports.presenter.js";

/* ---------- التقارير ---------- */
let reportState = { type: "students", teacher: "", status: "", grade: "", stage: "", kind: "", q: "", from: "", to: "", sub: "", month: "" };




function buildReport() {
  return buildAdminReport({ cache: adminCache, state: reportState, teacherStagesText });
}

export function adminReports() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const rep = buildReport();
  const teachers = adminCache.teachers || [];
  const subjects = adminCache.subjects || [];
  const subjectNames = Array.from(new Set(subjects.map((s) => s.name)));
  const typeBtn = (id, label) => T("admin.typeBtn", { id, label, reportState });
  let filtersHtml = T("admin.adminReports", { esc, reportState });
  if (reportState.type === "students") {
    filtersHtml = T("admin.adminReports_2", { GRADES, esc, reportState, teachers }) + filtersHtml;
  } else if (reportState.type === "teachers") {
    filtersHtml = T("admin.adminReports_3", { esc, reportState, subjectNames }) + filtersHtml;
  } else if (reportState.type === "payments") {
    filtersHtml = T("admin.adminReports_4", { esc, reportState, teachers }) + filtersHtml;
  } else {
    filtersHtml = T("admin.adminReports_5", { STAGES, reportState }) + filtersHtml;
  }
  const content = T("admin.adminReports_6", { esc, filtersHtml, rep, typeBtn });
  adminLayout(content, "reports");
  document.querySelectorAll("[data-rt]").forEach((b) => b.onclick = () => { reportState = { type: b.dataset.rt, teacher: "", status: "", grade: "", stage: "", kind: "", q: "", from: "", to: "", sub: "", month: "" }; adminReports(); });
  const bind = (id, key, ev) => { const el = document.getElementById(id); if (el) el[ev] = (e) => { reportState[key] = e.target.value.trim ? e.target.value.trim() : e.target.value; adminReports(); }; };
  bind("rf-teacher", "teacher", "onchange");
  bind("rf-status", "status", "onchange");
  bind("rf-grade", "grade", "onchange");
  bind("rf-stage", "stage", "onchange");
  bind("rf-kind", "kind", "onchange");
  bind("rf-subject", "subject", "onchange");
  bind("rf-sub", "sub", "onchange");
  bind("rf-from", "from", "onchange");
  bind("rf-to", "to", "onchange");
  bind("rf-month", "month", "onchange");
  const q = document.getElementById("rf-q");
  if (q) q.onchange = (e) => { reportState.q = e.target.value.trim(); adminReports(); };
  document.getElementById("rp-clear").onclick = () => { const t = reportState.type; reportState = { type: t, teacher: "", status: "", grade: "", stage: "", kind: "", q: "", from: "", to: "", sub: "", month: "" }; adminReports(); };
  document.getElementById("rp-print").onclick = printReport;
  document.getElementById("rp-csv").onclick = () => exportReport("csv");
  document.getElementById("rp-xls").onclick = () => exportReport("xls");
}

function printReport() {
  const rep = buildReport();
  const w = window.open("", "_blank");
  if (!w) { alert("المتصفح مانع النافذة المنبثقة. اسمح بيها وجرّب تاني."); return; }
  const escP = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  w.document.write(T("admin.printReport", { escP, rep }));
  w.document.close();
}

function exportReport(kind) {
  const rep = buildReport();
  const stamp = new Date().toISOString().slice(0, 10);
  if (kind === "csv") {
    const blob = new Blob([adminReportCsv(rep)], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `${rep.title}-${stamp}.csv`);
  } else {
    const escP = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const html = T("admin.exportReport", { escP, rep });
    const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel" });
    downloadBlob(blob, `${rep.title}-${stamp}.xls`);
  }
}