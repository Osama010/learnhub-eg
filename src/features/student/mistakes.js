import { fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { qImgHtml } from "./quiz-runner.js";
import { bindStudentTabs, studentData, studentLoadAll, studentTabs } from "./shell.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { sCorrectText } from "../../domain/quiz.js";
import { mistakesOf } from "../../domain/progress.js";
import { groupMistakes } from "./mistakes.presenter.js";

/* ---------- راجع غلطاتك: الأسئلة اللي الطالب غلط فيها من آخر محاولة لكل اختبار ---------- */
/* بيرجع كل سؤال غلط مع مصدره؛ محاولة إعادة الحل بتستبدل القديمة فالغلط دايماً من آخر محاولة */
function sMistakes() {
  return mistakesOf({ attempts: studentData.attempts, exams: studentData.exams, quizzes: studentData.quizzes });
}
/* كارت الدخول فوق تاب الكويزات — بيظهر بس لو في غلطات فعلاً */
export function sMistakesCardHtml() {
  const n = sMistakes().length;
  if (!n) return "";
  return T("student.sMistakesCardHtml", { n });
}
export function bindMistakesBtn() {
  document.querySelectorAll("[data-gomistakes]").forEach((b) => b.onclick = () => { location.hash = "#/student/mistakes"; });
}
/* صفحة المراجعة: الغلطات متجمعة حسب الاختبار، ومع كل سؤال إجابته الصحيحة */
export async function renderStudentMistakes() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("student.renderStudentMistakes");
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = T("student.renderStudentMistakes_2", { e, esc }); return; }
  const { groups, total } = groupMistakes(sMistakes());
  app.innerHTML = T("student.renderStudentMistakes_3", { closing, esc, groups, qImgHtml, sCorrectText, studentTabs, total });
  bindStudentTabs();
  window.scrollTo(0, 0);
}