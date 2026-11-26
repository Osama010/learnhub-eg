import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { lateStudentsHtml } from "./late-students.js";
import { emptyExamForm, renderTeacherLessons, lessonsState } from "./lessons.js";
import { saveToBank } from "./question-bank.js";
import { termWritable } from "../../shared/terms.js";
import { showToast } from "../../shared/toast.js";
import { deleteExam, saveExam, setExamClosed } from "../../main/data.js";
import { fmtTs } from "../../domain/format.js";
import { toStoredTime } from "../../main/data.js";
import { buildExamDoc, examStats, validateExamForm } from "./exams.presenter.js";

/* ---------- الامتحانات المستقلة ---------- */



function exMsg(t, good) {
  const m = document.getElementById("ex-msg");
  if (m) { m.className = "msg " + (good ? "good" : "bad"); m.textContent = t; }
  if (t) showToast(t, good ? "good" : "bad");
}

export function examResultsHtml(e) {
  const attempts = lessonsState.attempts.filter((a) => a.examId === e.id);
  if (!attempts.length) return T("teacher.examResultsHtml");
  const { pcts, avg } = examStats(attempts);
  return T("teacher.examResultsHtml_2", { attempts, avg, e, esc, fmtTs, lateStudentsHtml, pcts });
}

export async function teacherSaveExam(stage) {
  if (!termWritable(lessonsState.examForm)) return exMsg("ده محتوى ترم منتهي — للقراءة بس، مش ممكن تعديله.");
  const bad = validateExamForm(lessonsState.examForm);
  if (bad) return exMsg(bad);
  const btn = document.getElementById("ex-save");
  btn.disabled = true;
  const data = buildExamDoc({ uid: fbUser.uid, profile: fbProfile, stage, form: lessonsState.examForm, toStored: toStoredTime });
  try {
    await saveExam(lessonsState.examForm.id, data);
    const toBank = lessonsState.examForm.quiz.filter((q) => q.saveToBank);
    lessonsState.examForm = emptyExamForm();
    lessonsState.examFormOpen = false;
    lessonsState.innerTab = "quizexams";
    try { await saveToBank(toBank); } catch (_) {}
    await renderTeacherLessons(stage);
  } catch (e) {
    btn.disabled = false;
    exMsg("حصلت مشكلة: " + (e.message || e));
  }
}

export async function teacherToggleExam(id, stage) {
  const e = lessonsState.exams.find((x) => x.id === id);
  if (!e) return;
  if (!termWritable(e)) return showToast("ده محتوى ترم منتهي — للقراءة بس.", "bad");
  try {
    await setExamClosed(id, !e.closed);
    await renderTeacherLessons(stage);
  } catch (err) { alert("مشكلة: " + (err.message || err)); }
}

export async function teacherDeleteExam(id, stage) {
  const e = lessonsState.exams.find((x) => x.id === id);
  if (e && !termWritable(e)) return showToast("ده محتوى ترم منتهي — للقراءة بس.", "bad");
  if (!confirm(`متأكد إنك عايز تحذف الامتحان "${e ? e.title : ""}"؟`)) return;
  try {
    await deleteExam(id);
    if (lessonsState.examForm && lessonsState.examForm.id === id) lessonsState.examForm = emptyExamForm();
    if (lessonsState.examResultsOpenFor === id) lessonsState.examResultsOpenFor = null;
    await renderTeacherLessons(stage);
  } catch (err) { alert("مشكلة: " + (err.message || err)); }
}