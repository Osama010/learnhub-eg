import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { bindTeacherTabs, teacherTabs } from "./dashboard.js";
import { qzMsg } from "./forms.js";
import { lateStudentsHtml } from "./late-students.js";
import { emptyLessonForm, emptyQuizForm, lsMsg, quizAttemptsFor, renderTeacherLessons, lessonsState } from "./lessons.js";
import { saveToBank } from "./question-bank.js";
import { PDF_MAX_BYTES, fileToChunks, mountLessonMedia } from "../../shared/lesson-media.js";
import { termWritable } from "../../shared/terms.js";
import { showToast } from "../../shared/toast.js";
import { createLesson, deleteLesson, deleteLessonFileChunks, deleteLessonMedia, getLesson, saveLessonFileChunk, saveLessonMedia, setLessonPinned, updateLesson } from "../../main/data.js";
import { deleteQuiz, listQuizzesOfLesson, saveQuiz } from "../../main/data.js";
import { fmtTs } from "../../domain/format.js";
import { lessonHasPdf, lessonHasVideo } from "../../domain/media.js";
import { toStoredTime } from "../../main/data.js";
import { STAGE_NAMES } from "./lessons.presenter.js";
import { buildLessonDoc, buildQuizDoc, lessonDeleteConfirm, validateLessonForm, validateQuizForm } from "./lesson-preview.presenter.js";

/* ---------- معاينة الدرس: صفحة عرض محتوى الدرس للمدرس ---------- */
export async function renderTeacherLessonView(id) {
  if (!fbUser) return renderLogin();
  app.innerHTML = T("teacher.renderTeacherLessonView");
  let l = null;
  try {
    l = await getLesson(id);
  } catch (e) {
    app.innerHTML = T("teacher.renderTeacherLessonView_2", { closing, e, esc });
    return;
  }
  const backHash = l && l.stage ? "#/teacher/lessons/" + encodeURIComponent(l.stage) : "#/teacher";
  if (!l) {
    app.innerHTML = T("teacher.renderTeacherLessonView_3", { closing });
    return;
  }
  const hasV = lessonHasVideo(l), hasP = lessonHasPdf(l);
  // الكويزات المرتبطة بالدرس (بتتدار من تاب الكويزات والامتحانات)
  let linkedQuizzes = [];
  try {
    linkedQuizzes = await listQuizzesOfLesson(id);
  } catch (_) {}
  app.innerHTML = T("teacher.renderTeacherLessonView_4", { STAGE_NAMES, closing, esc, hasP, hasV, l, linkedQuizzes, teacherTabs });
  bindTeacherTabs();
  document.getElementById("lv-back").onclick = () => location.hash = backHash;
  mountLessonMedia(app, l, { student: false });
  window.scrollTo(0, 0);
}

export function quizResultsHtml(q) {
  const attempts = quizAttemptsFor(q);
  const table = attempts.length ? T("teacher.quizResultsHtml", { attempts, esc, fmtTs }) : T("teacher.quizResultsHtml_2");
  return table + lateStudentsHtml(q.stage, attempts, "الكويز", q.title, q.grade);
}

export async function teacherSaveLesson(stage) {
  if (!termWritable(lessonsState.lessonForm)) return lsMsg("ده محتوى ترم منتهي — للقراءة بس، مش ممكن تعديله.");
  const chk = validateLessonForm(lessonsState.lessonForm, PDF_MAX_BYTES);
  if (chk.error) return lsMsg(chk.error);
  const { unit, lessonNum, pdfIsFile, hasPdfNow } = chk;
  const btn = document.getElementById("ls-save");
  btn.disabled = true;
  const data = buildLessonDoc({ uid: fbUser.uid, profile: fbProfile, stage, form: lessonsState.lessonForm, unit, lessonNum, hasPdf: hasPdfNow, toStored: toStoredTime });
  try {
    let lid = lessonsState.lessonForm.id;
    if (lid) {
      // الروابط القديمة على وثيقة الدرس بتتشال (بتتنقل لـ lessonMedia)
      await updateLesson(lid, data);
    } else {
      lid = await createLesson(data);
    }
    // بعد وثيقة الدرس: الوسائط (القواعد بتتأكد إن الدرس موجود وبتاعك)
    let pdfFile = null, oldChunks = (lessonsState.lessonForm.pdfMeta && lessonsState.lessonForm.pdfMeta.chunks) || 0;
    if (pdfIsFile && lessonsState.lessonForm.pdfFile) {
      const pm = document.getElementById("ls-msg"); const prog = (x) => { if (pm) { pm.className = "msg good"; pm.textContent = x; } }; prog("جاري رفع الملف…");
      const parts = await fileToChunks(lessonsState.lessonForm.pdfFile);
      for (let i = 0; i < parts.length; i++) {
        await saveLessonFileChunk(lid, i, fbUser.uid, parts[i]);
        prog(`جاري رفع الملف… ${i + 1}/${parts.length}`);
      }
      pdfFile = { name: lessonsState.lessonForm.pdfFile.name, size: lessonsState.lessonForm.pdfFile.size, chunks: parts.length };
      await deleteLessonFileChunks(lid, parts.length, oldChunks);
    } else if (pdfIsFile && lessonsState.lessonForm.pdfMeta) {
      pdfFile = lessonsState.lessonForm.pdfMeta;
    }
    if (!pdfIsFile && oldChunks) await deleteLessonFileChunks(lid, 0, oldChunks);
    await saveLessonMedia(lid, {
      teacherId: fbUser.uid,
      videoUrl: lessonsState.lessonForm.videoUrl.trim(),
      pdfUrl: pdfIsFile ? "" : lessonsState.lessonForm.pdfUrl.trim(),
      pdfFile,
    });
    lessonsState.lessonForm = emptyLessonForm();
    lessonsState.lessonFormOpen = false;
    await renderTeacherLessons(stage);
  } catch (e) {
    btn.disabled = false;
    lsMsg("حصلت مشكلة: " + (e.message || e));
  }
}

// حفظ الكويز المستقل (مع ربط اختياري بدرس)
export async function teacherSaveQuiz(stage) {
  if (!termWritable(lessonsState.quizForm)) return qzMsg("ده محتوى ترم منتهي — للقراءة بس، مش ممكن تعديله.");
  const bad = validateQuizForm(lessonsState.quizForm);
  if (bad) return qzMsg(bad);
  const btn = document.getElementById("qz-save");
  btn.disabled = true;
  const data = buildQuizDoc({ uid: fbUser.uid, profile: fbProfile, stage, form: lessonsState.quizForm });
  try {
    await saveQuiz(lessonsState.quizForm.id, data);
    const toBank = lessonsState.quizForm.quiz.filter((q) => q.saveToBank);
    lessonsState.quizForm = emptyQuizForm();
    lessonsState.quizFormOpen = false;
    lessonsState.innerTab = "quizexams";
    try { await saveToBank(toBank); } catch (_) {}
    await renderTeacherLessons(stage);
  } catch (e) {
    btn.disabled = false;
    qzMsg("حصلت مشكلة: " + (e.message || e));
  }
}

export async function teacherDeleteQuiz(id, stage) {
  const q = lessonsState.quizzes.find((x) => x.id === id);
  if (q && !termWritable(q)) return showToast("ده محتوى ترم منتهي — للقراءة بس.", "bad");
  if (!confirm(`متأكد إنك عايز تحذف الكويز "${q ? q.title : ""}"؟`)) return;
  try {
    await deleteQuiz(id);
    if (lessonsState.quizForm && lessonsState.quizForm.id === id) { lessonsState.quizForm = emptyQuizForm(); lessonsState.quizFormOpen = false; }
    if (lessonsState.quizResultsOpenFor === id) lessonsState.quizResultsOpenFor = null;
    await renderTeacherLessons(stage);
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

/* تثبيت/إلغاء تثبيت درس: المثبت يطلع فوق قسم مادته عند الطلاب (مراجعة قبل الامتحان مثلاً) */
export async function teacherTogglePin(id, stage) {
  const l = lessonsState.lessons.find((x) => x.id === id);
  if (!l) return;
  if (!termWritable(l)) return showToast("ده محتوى ترم منتهي — للقراءة بس.", "bad");
  try {
    await setLessonPinned(id, !l.pinned);
    showToast(l.pinned ? "اتلغى تثبيت الدرس." : "الدرس اتثبت — هيظهر الأول عند طلابك في قسم المادة.", "good");
    await renderTeacherLessons(stage);
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

export async function teacherDeleteLesson(id, stage) {
  const l = lessonsState.lessons.find((x) => x.id === id);
  if (l && !termWritable(l)) return showToast("ده محتوى ترم منتهي — للقراءة بس.", "bad");
  const linked = lessonsState.quizzes.filter((q) => q.lessonId === id);
  if (!confirm(lessonDeleteConfirm(l, linked.length))) return;
  try {
    // نمسح الوسائط الأول (best effort) لأن القواعد محتاجة الدرس موجود
    await deleteLessonMedia(id);
    await deleteLesson(id);
    for (const q of linked) await deleteQuiz(q.id);
    if (lessonsState.lessonForm && lessonsState.lessonForm.id === id) { lessonsState.lessonForm = emptyLessonForm(); lessonsState.lessonFormOpen = false; }
    await renderTeacherLessons(stage);
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}