import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { adminCache, adminLayout } from "./shell.js";
import { downloadBlob } from "../landing/landing.js";
import { AN_CSS, anAvg, anPct } from "../../shared/analytics-kit.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { listCreatedSince, countByStage } from "../../main/data.js";
import { aanExportRows } from "../../domain/reporting.js";
import { toStoredTime } from "../../main/data.js";
import { adminAnalyticsCsv, buildAdminAnalyticsModel } from "./analytics.presenter.js";

/* ======================= تحليل الأدمن (نسخة خفيفة من غير ملخص يومي) ======================= */
let aanState = { days: 30 };
let aanExtra = null; // { days, atts, lessons, quizzes, counts }
const aanDate = (ts) => (ts && ts.toDate ? ts.toDate() : null);

function buildAdminAnalytics(opts, extra, now) {
  return buildAdminAnalyticsModel({ opts, extra, now, cache: adminCache, kit: { anAvg, anPct } });
}

function aanLineSvg(pts) {
  if (pts.length < 2) return T("admin.aanLineSvg");
  const mx = Math.max(1, ...pts.map((p) => p.v)), step = 320 / (pts.length - 1);
  const xy = pts.map((p, i) => [20 + i * step, 100 - (p.v / mx) * 80]);
  const every = Math.ceil(pts.length / 8);
  return T("admin.aanLineSvg_2", { esc, every, mx, pts, xy });
}
function aanBarsSvg(pts) {
  const mx = Math.max(1, ...pts.map((p) => p.v)), w = 320 / pts.length;
  return T("admin.aanBarsSvg", { esc, mx, pts, w });
}

function aanHtml(m) {
  const kpi = (v, l) => T("admin.kpi", { l, v });
  const empty = (t) => T("admin.empty", { t });
  const mxN = Math.max(1, ...m.perTeacher.map((p) => p.n));
  return T("admin.aanHtml", { AN_CSS, aanBarsSvg, aanLineSvg, empty, esc, kpi, m, mxN });
}

function aanExport(kind, m) {
  const stamp = new Date().toISOString().slice(0, 10), rows = aanExportRows(m);
  if (kind === "csv") {
    downloadBlob(new Blob([adminAnalyticsCsv(rows)], { type: "text/csv;charset=utf-8" }), `تحليل-المنصة-${stamp}.csv`);
  } else {
    const escP = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    downloadBlob(new Blob(["\ufeff" + T("admin.aanExport", { escP, rows })], { type: "application/vnd.ms-excel" }), `تحليل-المنصة-${stamp}.xls`);
  }
}
function aanPrint(m) {
  const w = window.open("", "_blank");
  if (!w) { alert("المتصفح مانع النافذة المنبثقة. اسمح بيها وجرّب تاني."); return; }
  w.document.write(T("admin.aanPrint", { aanHtml, aanState, m }));
  w.document.close();
}

async function aanLoadExtra(days) {
  const DAY = 86400000, now = Date.now();
  const T = (ms) => toStoredTime(new Date(ms));
  const out = { days, atts: [], lessons: [], quizzes: [], counts: null };
  const get = async (col, field, ms) => listCreatedSince(col, field, T(ms));
  const [atts, lessons, quizzes] = await Promise.all([
    get("quizAttempts", "updatedAt", now - days * DAY).catch(() => []),
    get("lessons", "createdAt", now - 90 * DAY).catch(() => null),
    get("quizzes", "createdAt", now - 90 * DAY).catch(() => null),
  ]);
  out.atts = atts; out.lessons = lessons || []; out.quizzes = quizzes || [];
  if (!lessons || !quizzes) out.noContentCheck = true;
  try {
    const stages = ["ابتدائي", "إعدادي", "ثانوي"];
    const cnt = (col, st) => countByStage(col, st);
    out.counts = await Promise.all(stages.map(async (st) => ({ stage: st, lessons: await cnt("lessons", st), quizzes: await cnt("quizzes", st) })));
  } catch (_) { out.counts = null; }
  return out;
}

export async function adminAnalytics() {
  if (bailIfSignedOut()) return;
  adminLayout(T("admin.adminAnalytics"), "analytics");
  try { if (!aanExtra || aanExtra.days !== aanState.days) aanExtra = await aanLoadExtra(aanState.days); }
  catch (e) { adminLayout(T("admin.adminAnalytics_2", { e, esc }), "analytics"); return; }
  const m = buildAdminAnalytics(aanState, aanExtra);
  adminLayout(T("admin.adminAnalytics_3", { aanExtra, aanHtml, aanState, m }), "analytics");
  document.getElementById("aan-days").onchange = (e) => { aanState.days = Number(e.target.value); adminAnalytics(); };
  document.getElementById("aan-print").onclick = () => aanPrint(m);
  document.getElementById("aan-xls").onclick = () => aanExport("xls", m);
  document.getElementById("aan-csv").onclick = () => aanExport("csv", m);
}
