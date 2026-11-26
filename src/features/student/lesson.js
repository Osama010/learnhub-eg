import { fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../landing/landing.js";
import { sPingActivity } from "./activity.js";
import { bindStudentTabs, sAttemptFor, sIsWatched, sMarkWatched, sMyRating, sQuizBlocked, sQuizBtnHtml, sRate, sTeacherLocked, sTeacherName, sUnavailable, sVisible, studentData, studentLoadAll, studentTabs } from "./shell.js";
import { mountLessonMedia } from "../../shared/lesson-media.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { fmtTs } from "../../domain/format.js";
import { sLessonOpen } from "../../domain/reporting.js";
import { lessonHasPdf, lessonHasVideo } from "../../domain/media.js";

/* ---------- صفحة الدرس ---------- */
export async function renderStudentLesson(id) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("student.renderStudentLesson");
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = T("student.renderStudentLesson_2", { e, esc }); return; }
  const l = (studentData.lessons || []).find((x) => x.id === id);
  if (!l || !sVisible(l)) return sUnavailable("الدرس ده مش متاح ليك.");
  if (sTeacherLocked(l)) return sUnavailable("تم إيقاف وصولك لمحتوى هذا المدرس.");
  if (!sLessonOpen(l)) return sUnavailable("الدرس ده مجدول — هيتفتح " + fmtTs(l.publishAt) + ".");
  const firstWatch = !sIsWatched(id); // أول مشاهدة بس اللي بتتحسب نقاط
  sMarkWatched(id); // علامة «شوفت الدرس» لشريط التقدم والتذكير
  if (firstWatch) sPingActivity("lesson", id, l.teacherId, 10);
  const myStars = sMyRating(id);
  const hasV = lessonHasVideo(l), hasP = lessonHasPdf(l);
  const linked = (studentData.quizzes || []).filter((q) => q.lessonId === id && sVisible(q) && !sTeacherLocked(q));
  app.innerHTML = T("student.renderStudentLesson_3", { closing, esc, hasP, hasV, l, linked, myStars, sAttemptFor, sQuizBlocked, sQuizBtnHtml, sTeacherName, studentTabs });
  bindStudentTabs();
  document.querySelectorAll("[data-sq]").forEach((b) => b.onclick = () => { location.hash = "#/student/quiz/" + b.dataset.sq; });
  document.querySelectorAll("[data-star]").forEach((b) => b.onclick = () => sRate(id, Number(b.dataset.star)));
  mountLessonMedia(app, l, { student: true });
  window.scrollTo(0, 0);
}