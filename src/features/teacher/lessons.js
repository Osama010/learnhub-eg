import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { bindTeacherTabs, tLessonRatingHtml, teacherLoadLessons, teacherTabs } from "./dashboard.js";
import { examResultsHtml, teacherDeleteExam, teacherToggleExam } from "./exams.js";
import { tsToLocalInput } from "./exams.presenter.js";
import { renderExamFormPage, renderLessonFormPage, renderQuizFormPage } from "./forms.js";
import { quizResultsHtml, teacherDeleteLesson, teacherDeleteQuiz, teacherTogglePin } from "./lesson-preview.js";
import { loadLessonMedia } from "../../shared/lesson-media.js";
import { bindTermTabs, termCurrent, termRoChip, termTabsHtml, termWritable } from "../../shared/terms.js";
import { bailIfSignedOut, showToast } from "../../shared/toast.js";
import { gradesOfStage } from "../../domain/student.js";
import { fmtTs } from "../../domain/format.js";
import { attemptPct, examStatus } from "../../domain/quiz.js";
import { lessonHasPdf, lessonHasVideo } from "../../domain/media.js";
import { termName, termOf } from "../../domain/term.js";
import { attemptsOfQuiz } from "../../domain/progress.js";
import { STAGE_ICONS, STAGE_NAMES, blankExamForm, blankLessonForm, blankQuizForm, byGrade, byStage, byTerm, examFormFrom, lessonFormFrom, quizFormFrom, sortLessons, sortQuizzes, stageCounts } from "./lessons.presenter.js";

/* ---------- الدروس والكويزات ---------- */
export const lessonsState = {
  lessons: [],
  attempts: [],
  ratings: [], // تقييمات الطلبة لدروسي بالنجوم (متوسطات بس، من غير أسماء)
  exams: [],
  quizzes: [],
  lessonForm: null, // {id, unit, lessonNum, title, desc, videoUrl, pdfUrl}
  examForm: null, // {id, title, desc, openAt, closeAt, closed, quiz:[question]}
  quizForm: null, // {id, title, lessonId, quiz:[question]}
  lessonFormOpen: false,
  examFormOpen: false,
  quizFormOpen: false,
  innerTab: "lessons", // lessons | quizexams
  quizResultsOpenFor: null,
  examResultsOpenFor: null,
};













let lessonsGradeFilter = ""; // فلتر الصف في قوائم المحتوى
export let dashGradeFilter = "";    // فلتر الصف في تاب طلابي

export function emptyExamForm() {
  return blankExamForm(termCurrent());
}

export function emptyLessonForm() {
  return blankLessonForm(termCurrent());
}

export function emptyQuizForm() {
  return blankQuizForm(termCurrent());
}

/* تاب الترم الحالي في قوائم محتوى المدرس — الافتراضي الترم الحالي اللي الأدمن محدده */
var tTermTab = null;
function tTerm() {
  if (tTermTab !== 1 && tTermTab !== 2) tTermTab = termCurrent();
  return tTermTab;
}

/* اختيار الترم في فورم المحتوى: بيتقفل لو بتعدل محتوى ترم قديم (للقراءة بس) */
export function termPickerHtml(form) {
  const ro = form.id && !termWritable(form);
  return T("teacher.termPickerHtml", { form, ro, termCurrent, termName, termOf });
}
export function bindTermPicker(form, rerender) {
  document.querySelectorAll("[data-tterm]").forEach((b) => b.onclick = () => {
    if (b.disabled) return;
    form.term = Number(b.dataset.tterm);
    rerender();
  });
}

export function lsMsg(t, good) {
  const m = document.getElementById("ls-msg");
  if (m) { m.className = "msg " + (good ? "good" : "bad"); m.textContent = t; }
  if (t) showToast(t, good ? "good" : "bad");
}





// شارة صف المحتوى: فاضي = كل صفوف المرحلة
export function gradeChip(g) {
  return g ? T("teacher.gradeChip", { esc, g }) : T("teacher.gradeChip_2");
}

// سيلكت الصف لفورمات المحتوى: "كل صفوف المرحلة" (الافتراضي) أو صف معين
export function gradeSelectHtml(id, stage, val) {
  return T("teacher.gradeSelectHtml", { STAGE_NAMES, esc, gradesOfStage, id, stage, val });
}

// أزرار فلتر الصفوف فوق القوائم
function gradeFilterRowHtml(attr, stage, current) {
  return T("teacher.gradeFilterRowHtml", { attr, current, esc, gradesOfStage, stage });
}

export async function renderTeacherLessons(stageArg) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("teacher.renderTeacherLessons");
  try { await teacherLoadLessons(); }
  catch (e) { app.innerHTML = T("teacher.renderTeacherLessons_2", { e, esc }); return; }
  if (!lessonsState.lessonForm) lessonsState.lessonForm = emptyLessonForm();
  if (!lessonsState.examForm) lessonsState.examForm = emptyExamForm();
  if (!lessonsState.quizForm) lessonsState.quizForm = emptyQuizForm();
  const subject = (fbProfile && fbProfile.subject) || "";
  const myStages = (fbProfile && fbProfile.stages) || [];
  let stage = stageArg || null;
  if (!stage && myStages.length === 1) stage = myStages[0];

  // اختيار المرحلة: لو المدرس مسجل في أكتر من مرحلة ومش مختر واحدة
  if (myStages.length && !stage) {
    app.innerHTML = T("teacher.renderTeacherLessons_3", { STAGE_ICONS, STAGE_NAMES, closing, esc, myStages, teacherExams: lessonsState.exams, teacherLessons: lessonsState.lessons, teacherQuizzes: lessonsState.quizzes, teacherTabs });
    bindTeacherTabs();
    document.querySelectorAll("[data-gstage]").forEach((el) => el.onclick = () => {
      lessonsState.innerTab = "lessons";
      location.hash = "#/teacher/lessons/" + encodeURIComponent(el.dataset.gstage);
    });
    window.scrollTo(0, 0);
    return;
  }

  // الفورم المفتوح ليه أولوية على العرض
  if (lessonsState.lessonFormOpen) return renderLessonFormPage(stage, subject);
  if (lessonsState.quizFormOpen) return renderQuizFormPage(stage, subject);
  if (lessonsState.examFormOpen) return renderExamFormPage(stage);
  return renderStageLists(stage, myStages);
}

function bigAddBtn(id, txt) {
  return T("teacher.bigAddBtn", { id, txt });
}

function innerTabsHtml(stage) {
  const { ln, qn } = stageCounts(lessonsState.lessons, lessonsState.quizzes, lessonsState.exams, stage);
  return T("teacher.innerTabsHtml", { lessonsInnerTab: lessonsState.innerTab, ln, qn });
}

// محاولات الكويز: المحاولات الجديدة بـ quizId + القديمة بـ lessonId لو الكويز مرتبط بدرس
export function quizAttemptsFor(q) {
  return attemptsOfQuiz(lessonsState.attempts, q);
}

function renderStageLists(stage, myStages) {
  // فلتر الصف: "الصف الأول" بيوري محتوى الصف ده + محتوى "كل الصفوف"
  const gf = (items) => byGrade(items, lessonsGradeFilter);
  // فلتر الترم: كل تاب بيوري محتوى ترمه بس
  const tf = (items) => byTerm(items, tTerm());
  const list = sortLessons(tf(gf(byStage(lessonsState.lessons, stage))));
  const quizList = sortQuizzes(tf(gf(byStage(lessonsState.quizzes, stage))));
  const examList = tf(gf(byStage(lessonsState.exams, stage)));
  const gradeRow = stage ? gradeFilterRowHtml("gf", stage, lessonsGradeFilter) : "";
  let content = "";

  if (lessonsState.innerTab === "lessons") {
    content = T("teacher.renderStageLists", { STAGE_NAMES, bigAddBtn, esc, fmtTs, gradeChip, gradeRow, lessonHasPdf, lessonHasVideo, lessonsGradeFilter, list, stage, tLessonRatingHtml, tTerm, termCurrent, termName, termRoChip, termWritable });
  } else {
    content = T("teacher.renderStageLists_2", { attemptPct, bigAddBtn, esc, examList, examResultsHtml, examResultsOpenFor: lessonsState.examResultsOpenFor, examStatus, fmtTs, gradeChip, gradeRow, lessonsGradeFilter, quizAttemptsFor, quizList, quizResultsHtml, quizResultsOpenFor: lessonsState.quizResultsOpenFor, tTerm, teacherAttempts: lessonsState.attempts, teacherLessons: lessonsState.lessons, termCurrent, termName, termRoChip, termWritable });
  }

  app.innerHTML = T("teacher.renderStageLists_3", { STAGE_ICONS, STAGE_NAMES, closing, content, esc, innerTabsHtml, myStages, stage, tTerm, teacherTabs, termTabsHtml });
  bindTeacherTabs();
  bindTermTabs((t) => { tTermTab = t; renderTeacherLessons(stage); });
  const backBtn = document.getElementById("ls-backst");
  if (backBtn) backBtn.onclick = () => location.hash = "#/teacher/lessons";
  document.getElementById("it-lessons").onclick = () => { lessonsState.innerTab = "lessons"; renderTeacherLessons(stage); };
  document.getElementById("it-quizexams").onclick = () => { lessonsState.innerTab = "quizexams"; renderTeacherLessons(stage); };
  document.querySelectorAll("[data-gf]").forEach((b) => b.onclick = () => { lessonsGradeFilter = b.dataset.gf; renderTeacherLessons(stage); });
  const addL = document.getElementById("ls-addbig");
  if (addL) addL.onclick = () => { lessonsState.lessonForm = emptyLessonForm(); lessonsState.lessonFormOpen = true; renderTeacherLessons(stage); };
  const addQ = document.getElementById("qz-addbig");
  if (addQ) addQ.onclick = () => { lessonsState.quizForm = emptyQuizForm(); lessonsState.quizFormOpen = true; renderTeacherLessons(stage); };
  const addX = document.getElementById("ex-addbig");
  if (addX) addX.onclick = () => { lessonsState.examForm = emptyExamForm(); lessonsState.examFormOpen = true; renderTeacherLessons(stage); };
  document.querySelectorAll("[data-lview]").forEach((b) => b.onclick = () => { location.hash = "#/teacher/lesson/" + b.dataset.lview; });
  document.querySelectorAll("[data-ledit]").forEach((b) => b.onclick = async () => {
    const l = lessonsState.lessons.find((x) => x.id === b.dataset.ledit);
    if (!l) return;
    const med = await loadLessonMedia(l);
    lessonsState.lessonForm = lessonFormFrom(l, med, tsToLocalInput);
    lessonsState.lessonFormOpen = true;
    renderTeacherLessons(stage);
  });
  document.querySelectorAll("[data-ldel]").forEach((b) => b.onclick = () => teacherDeleteLesson(b.dataset.ldel, stage));
  document.querySelectorAll("[data-lpin]").forEach((b) => b.onclick = () => teacherTogglePin(b.dataset.lpin, stage));
  document.querySelectorAll("[data-qedit]").forEach((b) => b.onclick = () => {
    const q = lessonsState.quizzes.find((x) => x.id === b.dataset.qedit);
    if (!q) return;
    lessonsState.quizForm = quizFormFrom(q);
    lessonsState.quizFormOpen = true;
    renderTeacherLessons(stage);
  });
  document.querySelectorAll("[data-qdel]").forEach((b) => b.onclick = () => teacherDeleteQuiz(b.dataset.qdel, stage));
  document.querySelectorAll("[data-qres]").forEach((b) => b.onclick = () => {
    lessonsState.quizResultsOpenFor = lessonsState.quizResultsOpenFor === b.dataset.qres ? null : b.dataset.qres;
    renderTeacherLessons(stage);
  });
  document.querySelectorAll("[data-xedit]").forEach((b) => b.onclick = () => {
    const e = lessonsState.exams.find((x) => x.id === b.dataset.xedit);
    if (!e) return;
    lessonsState.examForm = examFormFrom(e, tsToLocalInput);
    lessonsState.examFormOpen = true;
    renderTeacherLessons(stage);
  });
  document.querySelectorAll("[data-xtgl]").forEach((b) => b.onclick = () => teacherToggleExam(b.dataset.xtgl, stage));
  document.querySelectorAll("[data-xdel]").forEach((b) => b.onclick = () => teacherDeleteExam(b.dataset.xdel, stage));
  document.querySelectorAll("[data-xres]").forEach((b) => b.onclick = () => {
    lessonsState.examResultsOpenFor = lessonsState.examResultsOpenFor === b.dataset.xres ? null : b.dataset.xres;
    renderTeacherLessons(stage);
  });
  window.scrollTo(0, 0);
}
















export function set_dashGradeFilter(v) { return (dashGradeFilter = v); }



























