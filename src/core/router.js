import { PORTAL, PORTAL_INFO, fbReady, fbRole, fbUser, set_fbRole, signOut } from "./session.js";
import { T } from "./templates.js";
import { app, esc } from "./utils.js";
import { renderAdmin } from "../features/admin/shell.js";
import { needsEmailVerify, renderVerifyGate } from "../features/auth/email-verify.js";
import { renderLogin } from "../features/auth/login.js";
import { renderRegister } from "../features/auth/register.js";
import { renderLanding } from "../features/landing/landing.js";
import { renderStudentAnalytics } from "../features/student/analytics.js";
import { renderStudentAnn } from "../features/student/announcements.js";
import { renderStudentHome } from "../features/student/gate.js";
import { renderStudentGrades } from "../features/student/grades.js";
import { renderStudentLesson } from "../features/student/lesson.js";
import { renderStudentLibrary } from "../features/student/library.js";
import { renderStudentMistakes } from "../features/student/mistakes.js";
import { renderStudentTake } from "../features/student/quiz-runner.js";
import { renderStudentQuizExams } from "../features/student/quizzes.js";
import { renderStudentProfile } from "../features/student/teachers.js";
import { renderStudentUpcoming } from "../features/student/upcoming.js";
import { renderTeacherProfile } from "../features/teacher/account.js";
import { renderTeacherAnalytics } from "../features/teacher/analytics.js";
import { renderTeacherAnnouncements } from "../features/teacher/announcements.js";
import { renderTeacherDash, renderTeacherTransfer } from "../features/teacher/dashboard.js";
import { renderTeacherLessonView } from "../features/teacher/lesson-preview.js";
import { renderTeacherLessons } from "../features/teacher/lessons.js";
import { renderTeacherReports } from "../features/teacher/reports.js";
import { renderAboutPage, renderTeacherSubExpired, renderTeacherSuspended } from "../shared/pwa.js";
import { rolePortal } from "../domain/student.js";

/* ---------- الراوتر ---------- */
function renderWrongPortal() {
  const info = PORTAL_INFO[PORTAL] || {};
  const mine = rolePortal(fbRole);
  const where = { student: "student/", teacher: "teacher/", admin: "admin/" }[mine] || "./";
  app.innerHTML = T("app.renderWrongPortal", { PORTAL, esc, info });
  document.getElementById("wp-out").onclick = signOut;
}

export function route() {
  const h = location.hash || "#/login";
  if (!fbReady) { renderLoading(); return; }
  if (!PORTAL && !fbUser && (location.hash === "" || location.hash === "#" || location.hash === "#/")) return renderLanding();
  if (h === "#/register") return (!PORTAL || PORTAL === "student") ? renderRegister() : renderLogin();
  if (h === "#/login" || h === "#/" || h === "") return fbUser ? routeByRole() : renderLogin();
  if (!fbUser) return renderLogin();
  // بوابة دور: حساب من دور تاني يوقف هنا برسالة واضحة (الحماية الحقيقية في القواعد)
  if (PORTAL && rolePortal(fbRole) && rolePortal(fbRole) !== PORTAL) return renderWrongPortal();
  if (fbRole === "teacherSuspended") return renderTeacherSuspended();
  if (fbRole === "teacherSubExpired") return renderTeacherSubExpired();
  // بوابة تأكيد الإيميل: حساب جديد لسه مفعّلش إيميله يقف هنا مهما كان الرابط
  if (needsEmailVerify()) return renderVerifyGate();
  if (h === "#/about") return renderAboutPage();
  if (fbRole === "admin") {
    if (h.startsWith("#/admin")) return renderAdmin(h);
    return renderAdmin("#/admin/analytics");
  }
  if (fbRole === "teacher") {
    if (h === "#/teacher/profile") return renderTeacherProfile();
    if (h === "#/teacher/reports") return renderTeacherReports();
    if (h === "#/teacher/analytics") return renderTeacherAnalytics();
    if (h === "#/teacher/transfer") return renderTeacherTransfer();
    if (h === "#/teacher/announcements") return renderTeacherAnnouncements();
    if (h.startsWith("#/teacher/lesson/")) {
      const lid = decodeURIComponent(h.slice("#/teacher/lesson/".length));
      return renderTeacherLessonView(lid);
    }
    if (h.startsWith("#/teacher/lessons")) {
      const st = decodeURIComponent(h.slice("#/teacher/lessons".length).replace(/^\//, "") || "");
      return renderTeacherLessons(st || null);
    }
    return renderTeacherDash();
  }
  if (fbRole === "student") {
    if (h === "#/student") return renderStudentHome();
    if (h === "#/student/quizexams") return renderStudentQuizExams();
    if (h === "#/student/upcoming") return renderStudentUpcoming();
    if (h === "#/student/mistakes") return renderStudentMistakes();
    if (h === "#/student/library") return renderStudentLibrary();
    if (h === "#/student/ann") return renderStudentAnn();
    if (h === "#/student/grades") return renderStudentGrades();
    if (h === "#/student/analytics") return renderStudentAnalytics();
    if (h === "#/student/profile") return renderStudentProfile();
    if (h.startsWith("#/student/lesson/")) {
      const lid = decodeURIComponent(h.slice("#/student/lesson/".length));
      return renderStudentLesson(lid);
    }
    if (h.startsWith("#/student/quiz/")) {
      const qid = decodeURIComponent(h.slice("#/student/quiz/".length));
      return renderStudentTake(qid, false);
    }
    if (h.startsWith("#/student/exam/")) {
      const eid = decodeURIComponent(h.slice("#/student/exam/".length));
      return renderStudentTake(eid, true);
    }
    return renderStudentHome();
  }
  renderLogin();
}

export function routeByRole() {
  if (fbRole === "admin") location.hash = "#/admin/analytics";
  else if (fbRole === "teacher") location.hash = "#/teacher/analytics";
  else if (fbRole === "student") location.hash = "#/student/analytics";
  else location.hash = "#/login";
}

function renderLoading() {
  app.innerHTML = T("app.renderLoading");
  window.scrollTo(0, 0);
}