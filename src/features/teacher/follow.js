import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { bindTeacherTabs, teacherCache, teacherLoad, teacherLoadLessons, teacherTabs } from "./dashboard.js";
import { gradeSelectHtml, lessonsState } from "./lessons.js";
import { STAGE_NAMES } from "./lessons.presenter.js";
import { resolveStage } from "./announcements.presenter.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { waLink } from "../../shared/transfer.js";
import { INACT_DAYS, allRows, followSummary, followTargets, inactiveRows } from "./follow.presenter.js";
import { getRecipientMode, recipientPickHtml, setRecipientMode } from "./recipient.js";
import { backupCardHtml, bindBackup } from "./backup.js";

/* ---------- متابعة الطلاب: المتأخرين عن النشاط + تذكير واتساب + روابط التقرير والشهادة ---------- */
let followStage = "";
let followGrade = "";
let followDays = 7;
let followMode = "parent";
let followQuery = "";

function drawFollowList() {
  const students = followTargets(teacherCache, followStage, followGrade);
  const rows = inactiveRows(students, lessonsState.attempts || [], new Date(), followDays, followMode);
  const sum = followSummary(students.length, rows);
  document.getElementById("fl-list").innerHTML = T("teacher.followListHtml", { esc, followDays, followMode, rows, sum, waLink });
  drawAll(students);
}

function drawAll(students) {
  const el = document.getElementById("fl-all");
  if (el) el.innerHTML = T("teacher.followAllHtml", { all: allRows(students, followMode, followQuery), esc, waLink });
}

export async function renderTeacherFollow() {
  if (bailIfSignedOut()) return;
  if (!fbUser) return renderLogin();
  app.innerHTML = T("teacher.renderFollow");
  try { await Promise.all([teacherLoad(), teacherLoadLessons()]); } catch (e) { app.innerHTML = T("teacher.renderFollow_2", { e, esc }); return; }
  const myStages = (fbProfile && fbProfile.stages) || [];
  followStage = resolveStage(followStage, myStages);
  followMode = getRecipientMode();
  app.innerHTML = T("teacher.renderFollow_3", { INACT_DAYS, STAGE_NAMES, backupCardHtml, closing, esc, followDays, followGrade, followMode, followStage, gradeSelectHtml, myStages, recipientPickHtml, teacherTabs });
  bindTeacherTabs();
  bindBackup();
  import("./comments.js").then((m) => { const j = document.getElementById("bk-json"); m.mountCommentsCard(j && j.closest(".card")); }).catch(() => {});
  import("./backup-extras.js").then((m) => { const j = document.getElementById("bk-json"); m.mountRestoreCard(j && j.closest(".card")); }).catch(() => {});
  import("./export.js").then((m) => { const j = document.getElementById("bk-json"); m.mountExportCard(j && j.closest(".card")); }).catch(() => {});
  document.getElementById("fl-stage").onchange = (e) => { followStage = e.target.value; followGrade = ""; renderTeacherFollow(); };
  document.getElementById("fl-grade").onchange = (e) => { followGrade = e.target.value; drawFollowList(); };
  document.getElementById("fl-days").onchange = (e) => { followDays = Number(e.target.value) || 7; drawFollowList(); };
  document.getElementById("fl-mode").onchange = (e) => { followMode = setRecipientMode(e.target.value); drawFollowList(); };
  const q = document.getElementById("fl-q");
  q.value = followQuery;
  q.oninput = (e) => { followQuery = e.target.value; drawAll(followTargets(teacherCache, followStage, followGrade)); };
  drawFollowList();
}
