import { fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { bindStudentTabs, sTeacherLocked, sTerm, sTermTab, sVisible, set_sTermTab, studentData, studentLoadAll, studentTabs } from "./shell.js";
import { bindTermTabs, termTabsHtml } from "../../shared/terms.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { fmtTs } from "../../domain/format.js";
import { lessonHasPdf, lessonHasVideo } from "../../domain/media.js";
import { termOf } from "../../domain/term.js";
import { sUpcomingExamTs } from "../../domain/reporting.js";
import { upcomingExams, upcomingLessons } from "./upcoming.presenter.js";

/* ---------- تاب القادم: أجندة الدروس المجدولة والامتحانات اللي ليها معاد ---------- */
/* الدروس المجدولة اللي لسه منزلتش، مرتبة بأقرب معاد */
function upcomingRules() { return { visible: sVisible, term: sTerm(), termOf, locked: sTeacherLocked, examTs: sUpcomingExamTs }; }
function sUpcomingLessons() { return upcomingLessons({ data: studentData, rules: upcomingRules() }); }
function sUpcomingExams() { return upcomingExams({ data: studentData, now: new Date(), rules: upcomingRules() }); }
function sUpLessonCard(l) {
  const tchr = (studentData.teachers || []).find((t) => t.id === l.teacherId) || {};
  return T("student.sUpLessonCard", { esc, fmtTs, l, lessonHasPdf, lessonHasVideo, tchr });
}
function sUpExamCard(e) {
  const opens = e.openAt && e.openAt.toDate && e.openAt.toDate() > new Date();
  return T("student.sUpExamCard", { e, esc, fmtTs, opens });
}
export async function renderStudentUpcoming() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("student.renderStudentUpcoming");
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = T("student.renderStudentUpcoming_2", { e, esc }); return; }
  const lessons = sUpcomingLessons();
  const exams = sUpcomingExams();
  app.innerHTML = T("student.renderStudentUpcoming_3", { closing, exams, lessons, sTerm, sUpExamCard, sUpLessonCard, studentTabs, termTabsHtml });
  bindStudentTabs();
  bindTermTabs((t) => { set_sTermTab(t); renderStudentUpcoming(); });
  window.scrollTo(0, 0);
}