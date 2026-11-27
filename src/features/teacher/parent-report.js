import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { bindTeacherTabs, teacherCache, teacherLoad, teacherLoadLessons, teacherTabs } from "./dashboard.js";
import { lessonsState } from "./lessons.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { waLink } from "../../shared/transfer.js";
import { buildParentReport, parentReportText } from "./parent-report.presenter.js";
import { phoneFor, phoneOk } from "./recipient.presenter.js";
import { getRecipientMode, recipientPickHtml, setRecipientMode } from "./recipient.js";

/* ---------- تقرير ولي الأمر لطالب: عرض + واتساب (اختيار المستلم) + طباعة/PDF ---------- */
export async function renderTeacherParentReport(studentId) {
  if (bailIfSignedOut()) return;
  if (!fbUser) return renderLogin();
  app.innerHTML = T("teacher.renderPReport");
  try { await Promise.all([teacherLoad(), teacherLoadLessons()]); } catch (e) { app.innerHTML = T("teacher.renderPReport_2", { e, esc }); return; }
  const student = (teacherCache || []).find((s) => s.id === studentId);
  if (!student) { app.innerHTML = T("teacher.renderPReport_4", { closing, teacherTabs }); bindTeacherTabs(); return; }
  const rep = buildParentReport({ student, attempts: lessonsState.attempts || [], quizzes: lessonsState.quizzes || [], lessons: lessonsState.lessons || [], exams: lessonsState.exams || [], now: new Date() });
  const draw = () => {
    const mode = getRecipientMode();
    const to = phoneFor(student, mode);
    const text = parentReportText(rep, mode, (fbProfile && fbProfile.name) || "");
    app.innerHTML = T("teacher.renderPReport_3", { closing, esc, mode, rep, recipientPickHtml, teacherTabs, text, to, valid: phoneOk(to), waLink, teacherName: (fbProfile && fbProfile.name) || "" });
    bindTeacherTabs();
    document.getElementById("pr-mode").onchange = (e) => { setRecipientMode(e.target.value); draw(); };
    document.getElementById("pr-print").onclick = () => window.print();
  };
  draw();
}
