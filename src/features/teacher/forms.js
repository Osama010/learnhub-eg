import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { closing } from "../../shared/common.js";
import { bindTeacherTabs, teacherTabs } from "./dashboard.js";
import { teacherSaveExam } from "./exams.js";
import { teacherSaveLesson, teacherSaveQuiz } from "./lesson-preview.js";
import { bindTermPicker, emptyExamForm, emptyLessonForm, emptyQuizForm, gradeSelectHtml, renderTeacherLessons, termPickerHtml, lessonsState } from "./lessons.js";
import { bindQuizEditor, quizBuilderHtml } from "./quiz-editor.js";
import { openBankPicker } from "./question-bank.js";
import { bailIfSignedOut, showToast } from "../../shared/toast.js";
import { qNew } from "../../domain/quiz.js";
import { STAGE_NAMES, byStage, sortLessons } from "./lessons.presenter.js";

/* ---------- صفحة فورم الدرس (محتوى بس — الكويز بقى لوحده) ---------- */
export function renderLessonFormPage(stage, subject) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const editing = !!lessonsState.lessonForm.id;
  app.innerHTML = T("teacher.renderLessonFormPage", { STAGE_NAMES, closing, editing, esc, gradeSelectHtml, lessonForm: lessonsState.lessonForm, stage, subject, teacherTabs, termPickerHtml });
  bindTeacherTabs();
  bindTermPicker(lessonsState.lessonForm, () => renderLessonFormPage(stage, subject));
  document.getElementById("ls-unit").oninput = (e) => lessonsState.lessonForm.unit = e.target.value;
  document.getElementById("ls-num").oninput = (e) => lessonsState.lessonForm.lessonNum = e.target.value;
  document.getElementById("ls-title").oninput = (e) => lessonsState.lessonForm.title = e.target.value;
  document.getElementById("ls-video").oninput = (e) => lessonsState.lessonForm.videoUrl = e.target.value;
  const pdfIn = document.getElementById("ls-pdf"); if (pdfIn) pdfIn.oninput = (e) => lessonsState.lessonForm.pdfUrl = e.target.value;
  const pdfFileIn = document.getElementById("ls-pdffile"); if (pdfFileIn) pdfFileIn.onchange = (e) => { lessonsState.lessonForm.pdfFile = e.target.files[0] || null; };
  document.querySelectorAll("[name=ls-pdfmode]").forEach((r) => r.onchange = () => { lessonsState.lessonForm.pdfMode = r.value; renderLessonFormPage(stage, subject); });
  document.getElementById("ls-desc").oninput = (e) => lessonsState.lessonForm.desc = e.target.value;
  document.getElementById("ls-pub").onchange = (e) => lessonsState.lessonForm.publishAt = e.target.value;
  document.getElementById("ls-grade").onchange = (e) => lessonsState.lessonForm.grade = e.target.value;
  document.getElementById("ls-save").onclick = () => teacherSaveLesson(stage);
  const goBack = () => { lessonsState.lessonForm = emptyLessonForm(); lessonsState.lessonFormOpen = false; renderTeacherLessons(stage); };
  document.getElementById("ls-cancel").onclick = goBack;
  document.getElementById("lf-back").onclick = goBack;
  window.scrollTo(0, 0);
}

/* ---------- صفحة فورم الكويز ---------- */
export function qzMsg(t, good) {
  const m = document.getElementById("qz-msg");
  if (m) { m.className = "msg " + (good ? "good" : "bad"); m.textContent = t; }
  if (t) showToast(t, good ? "good" : "bad");
}

export function renderQuizFormPage(stage, subject) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const editing = !!lessonsState.quizForm.id;
  const stageLessons = sortLessons(byStage(lessonsState.lessons, stage));
  app.innerHTML = T("teacher.renderQuizFormPage", { STAGE_NAMES, closing, editing, esc, gradeSelectHtml, quizBuilderHtml, quizForm: lessonsState.quizForm, stage, stageLessons, subject, teacherTabs, termPickerHtml });
  bindTeacherTabs();
  bindTermPicker(lessonsState.quizForm, () => renderQuizFormPage(stage, subject));
  document.getElementById("qz-title").oninput = (e) => lessonsState.quizForm.title = e.target.value;
  document.getElementById("qz-grade").onchange = (e) => lessonsState.quizForm.grade = e.target.value;
  document.getElementById("qz-lesson").onchange = (e) => lessonsState.quizForm.lessonId = e.target.value;
  document.getElementById("qz-oneattempt").onchange = (e) => lessonsState.quizForm.oneAttempt = e.target.checked;
  document.getElementById("qz-addq").onclick = () => {
    lessonsState.quizForm.quiz.push(qNew("mcq"));
    renderTeacherLessons(stage);
  };
  document.getElementById("qz-bank").onclick = () => openBankPicker(lessonsState.quizForm.quiz, stage);
  bindQuizEditor("q", lessonsState.quizForm.quiz, () => renderTeacherLessons(stage));
  document.getElementById("qz-save").onclick = () => teacherSaveQuiz(stage);
  const goBack = () => { lessonsState.quizForm = emptyQuizForm(); lessonsState.quizFormOpen = false; renderTeacherLessons(stage); };
  document.getElementById("qz-cancel").onclick = goBack;
  document.getElementById("qf-back").onclick = goBack;
  window.scrollTo(0, 0);
}

/* ---------- صفحة فورم الامتحان ---------- */
export function renderExamFormPage(stage) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  app.innerHTML = T("teacher.renderExamFormPage", { STAGE_NAMES, closing, esc, examForm: lessonsState.examForm, gradeSelectHtml, quizBuilderHtml, stage, teacherTabs, termPickerHtml });
  bindTeacherTabs();
  bindTermPicker(lessonsState.examForm, () => renderExamFormPage(stage));
  document.getElementById("ex-title").oninput = (e) => lessonsState.examForm.title = e.target.value;
  document.getElementById("ex-desc").oninput = (e) => lessonsState.examForm.desc = e.target.value;
  document.getElementById("ex-open").onchange = (e) => lessonsState.examForm.openAt = e.target.value;
  document.getElementById("ex-close").onchange = (e) => lessonsState.examForm.closeAt = e.target.value;
  document.getElementById("ex-grade").onchange = (e) => lessonsState.examForm.grade = e.target.value;
  document.getElementById("ex-addq").onclick = () => { lessonsState.examForm.quiz.push(qNew("mcq")); renderTeacherLessons(stage); };
  document.getElementById("ex-bank").onclick = () => openBankPicker(lessonsState.examForm.quiz, stage);
  bindQuizEditor("x", lessonsState.examForm.quiz, () => renderTeacherLessons(stage));
  document.getElementById("ex-save").onclick = () => teacherSaveExam(stage);
  const goBack = () => { lessonsState.examForm = emptyExamForm(); lessonsState.examFormOpen = false; renderTeacherLessons(stage); };
  document.getElementById("ex-cancel").onclick = goBack;
  document.getElementById("xf-back").onclick = goBack;
  window.scrollTo(0, 0);
}