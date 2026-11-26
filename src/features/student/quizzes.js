import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { bindMistakesBtn, sMistakesCardHtml } from "./mistakes.js";
import { bindStudentTabs, sAttemptFor, sExamState, sQuizBtnHtml, sTeacherLocked, sTerm, sTermTab, sVisible, set_sTermTab, studentData, studentLoadAll, studentTabs } from "./shell.js";
import { bindTermTabs, termTabsHtml } from "../../shared/terms.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { fmtTs } from "../../domain/format.js";
import { termOf } from "../../domain/term.js";
import { quizExamsModel } from "./quizzes.presenter.js";

/* ---------- تاب الكويزات والامتحانات ---------- */
export async function renderStudentQuizExams() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("student.renderStudentQuizExams");
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = T("student.renderStudentQuizExams_2", { e, esc }); return; }
  const { quizzes, exams } = quizExamsModel({ data: studentData, rules: { visible: sVisible, term: sTerm(), termOf, locked: sTeacherLocked } });
  app.innerHTML = T("student.renderStudentQuizExams_3", { closing, esc, exams, fbProfile, fmtTs, quizzes, sAttemptFor, sExamState, sMistakesCardHtml, sQuizBtnHtml, sTerm, studentData, studentTabs, termTabsHtml });
  bindStudentTabs();
  bindTermTabs((t) => { set_sTermTab(t); renderStudentQuizExams(); });
  document.querySelectorAll("[data-sq]").forEach((b) => b.onclick = () => { location.hash = "#/student/quiz/" + b.dataset.sq; });
  document.querySelectorAll("[data-se]").forEach((b) => b.onclick = () => { location.hash = "#/student/exam/" + b.dataset.se; });
  bindMistakesBtn();
  window.scrollTo(0, 0);
}