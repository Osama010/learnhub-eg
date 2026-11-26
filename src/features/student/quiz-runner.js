import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../landing/landing.js";
import { t4kConfetti } from "../landing/stats.js";
import { sPingActivity } from "./activity.js";
import { bindStudentTabs, sExamState, sQuizBlocked, sTeacherLocked, sTeacherName, sUnavailable, sVisible, studentData, studentLoadAll, studentTabs } from "./shell.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { normalizeAnswer, sCorrectText, sGivenText, sGradeOne } from "../../domain/quiz.js";
import { serverNow } from "../../main/data.js";
import { earnsQuizPoints, gradeSubmission, missingAnswer } from "./quiz-runner.presenter.js";
import { useCases } from "../../main/compose.js";

/* ---------- حل كويز/امتحان ---------- */
function sQuestionHtml(q, i) {
  let body = "";
  if (q.type === "mcq") {
    body = T("student.sQuestionHtml", { esc, i, q });
  } else if (q.type === "multi") {
    body = T("student.sQuestionHtml_2", { esc, i, q });
  } else if (q.type === "tf") {
    body = T("student.sQuestionHtml_3", { i });
  } else if (q.type === "match") {
    const opts = (q.pairs || []).map((pr) => pr.b);
    body = T("student.sQuestionHtml_4", { esc, i, opts, q });
  } else if (q.type === "num") {
    body = T("student.sQuestionHtml_5", { i });
  } else {
    body = T("student.sQuestionHtml_6", { i });
  }
  return T("student.sQuestionHtml_7", { body, esc, i, q, qImgHtml });
}

export async function renderStudentTake(id, isExam) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("student.renderStudentTake");
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = T("student.renderStudentTake_2", { e, esc }); return; }
  const item = isExam
    ? (studentData.exams || []).find((x) => x.id === id)
    : (studentData.quizzes || []).find((x) => x.id === id);
  if (!item || !sVisible(item)) return sUnavailable((isExam ? "الامتحان" : "الكويز") + " ده مش متاح ليك.");
  if (sTeacherLocked(item)) return sUnavailable("تم إيقاف وصولك لمحتوى هذا المدرس.");
  if (isExam && sExamState(item)[0] !== "مفتوح") return sUnavailable("الامتحان ده مش مفتوح دلوقتي.");
  if (!isExam && sQuizBlocked(item)) return sUnavailable("حليت الكويز ده قبل كده — الكويز ده بمحاولة واحدة بس.");
  const questions = (isExam ? item.quiz : item.questions) || [];
  if (!questions.length) return sUnavailable("مفيش أسئلة في " + (isExam ? "الامتحان" : "الكويز") + " ده لسه.");
  app.innerHTML = T("student.renderStudentTake_3", { closing, esc, isExam, item, questions, sQuestionHtml, sTeacherName, studentTabs });
  bindStudentTabs();
  document.getElementById("sq-submit").onclick = () => sSubmit(item, questions, isExam);
  window.scrollTo(0, 0);
}

// تجميع إجابات الطالب من الشاشة — null معناها سؤال من غير إجابة
function sGather(questions) {
  const given = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (q.type === "mcq" || q.type === "tf") {
      const sel = document.querySelector(`input[name="sq${i}"]:checked`);
      given.push(sel == null ? null : Number(sel.value));
    } else if (q.type === "multi") {
      const picked = Array.from(document.querySelectorAll(`input[name="sq${i}"]:checked`)).map((c) => Number(c.value)).sort((a, b) => a - b);
      given.push(picked.length ? picked : null);
    } else if (q.type === "match") {
      const rows = Array.from(document.querySelectorAll(`[data-sqm^="${i}:"]`));
      const ans = rows.map((sel) => sel.value);
      given.push(ans.some((v) => !v) ? null : ans);
    } else {
      const inp = document.querySelector(`[data-sqt="${i}"]`);
      const v = inp ? inp.value.trim() : "";
      given.push(v === "" ? null : v);
    }
  }
  return given;
}


/* صورة السؤال (اختيارية) — بتظهر في الحل والمراجعة */
export function qImgHtml(q) {
  return q.img ? T("student.qImgHtml", { q }) : "";
}



async function sSubmit(item, questions, isExam) {
  const m = document.getElementById("sq-msg");
  const given = sGather(questions);
  const missing = missingAnswer(given);
  if (missing >= 0) {
    m.className = "msg bad"; m.textContent = "جاوب على سؤال " + (missing + 1) + " الأول.";
    return;
  }
  const graded = gradeSubmission({ questions, given, item, isExam, studentId: fbUser.uid, studentName: fbProfile && fbProfile.name, now: serverNow(), gradeOne: sGradeOne });
  const { results, score, docId, data } = graded;
  const btn = document.getElementById("sq-submit");
  btn.disabled = true;
  try {
    await useCases.submitAttempt(docId, data);
  } catch (e) {
    btn.disabled = false;
    m.className = "msg bad"; m.textContent = "مشكلة في الحفظ: " + (e.message || e);
    return;
  }
  // أول نجاح في الاختبار ده (50%+) بيسجل نقاط ونشاط للسلسلة ولوحة الشرف — إعادة النجاح ما بتتحسبش
  if (earnsQuizPoints({ attempts: studentData.attempts, item, isExam, score, total: questions.length })) sPingActivity("quiz", item.id, item.teacherId, 20);
  sShowResult(item, questions, results, isExam, given);
}

function sShowResult(item, questions, results, isExam, given) {
  const score = results.filter((r) => r.correct).length;
  const pct = Math.round((score / questions.length) * 100);
  app.innerHTML = T("student.sShowResult", { closing, esc, given, isExam, item, pct, qImgHtml, questions, results, sCorrectText, sGivenText, score, studentTabs });
  bindStudentTabs();
  const r = document.getElementById("sr-retry");
  if (r) r.onclick = () => renderStudentTake(item.id, isExam);
  window.scrollTo(0, 0);
  if (pct >= 85 && typeof t4kConfetti === "function") t4kConfetti();
}