import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { sMyWeeklyRank, sStreak } from "./activity.js";
import { bindStudentTabs, sIsWatched, sTeacherLocked, sTeacherName, sVisible, studentData, studentLoadAll, studentTabs } from "./shell.js";
import { AN_CSS, anAvg, anPct, anTrendSvg, anTs } from "../../shared/analytics-kit.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { sLessonOpen } from "../../domain/reporting.js";
import { subDateStr } from "../../domain/subscription.js";
import { buildStudentAnalyticsModel } from "./analytics.presenter.js";

/* ======================= تحليل أداء الطالب ======================= */
let sanState = { tid: "", days: 30 };
let sanRank = null;

function buildStudentAnalytics(opts, now) {
  return buildStudentAnalyticsModel({ opts, now: now || new Date(), profile: fbProfile, data: studentData, kit: { anAvg, anPct, anTs }, rules: { visible: sVisible, locked: sTeacherLocked, lessonOpen: sLessonOpen, isWatched: sIsWatched, teacherName: sTeacherName, streak: sStreak, dateStr: subDateStr } });
}

function sanHtml(m, rank) {
  const empty = (t) => T("student.empty", { t });
  const kpi = (v, l) => T("student.kpi", { l, v });
  return T("student.sanHtml", { AN_CSS, anTrendSvg, empty, esc, kpi, m, rank });
}

export async function renderStudentAnalytics() {
  if (bailIfSignedOut()) return;
  if (!fbUser) return renderLogin();
  app.innerHTML = T("student.renderStudentAnalytics");
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = T("student.renderStudentAnalytics_2", { e, esc }); return; }
  sanRank = await sMyWeeklyRank();
  drawStudentAnalytics();
}
function drawStudentAnalytics() {
  const m = buildStudentAnalytics(sanState);
  const tchs = (studentData.teachers || []);
  app.innerHTML = T("student.drawStudentAnalytics", { closing, esc, fbProfile, m, sanHtml, sanRank, sanState, studentTabs, tchs });
  bindStudentTabs();
  document.getElementById("san-t").onchange = (e) => { sanState.tid = e.target.value; drawStudentAnalytics(); };
  document.getElementById("san-d").onchange = (e) => { sanState.days = Number(e.target.value); drawStudentAnalytics(); };
  document.querySelectorAll("[data-san-go]").forEach((b) => b.onclick = () => { location.hash = b.dataset.sanGo; });
}
