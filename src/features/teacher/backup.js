import { T } from "../../core/templates.js";
import { fbProfile, fbUser } from "../../core/session.js";
import { downloadBlob } from "../../shared/common.js";
import { teacherCache, teacherLoad, teacherLoadLessons } from "./dashboard.js";
import { lessonsState } from "./lessons.js";
import { showToast } from "../../shared/toast.js";
import { backupJson, backupName, backupStudentsCsv, buildBackup } from "./backup.presenter.js";

/* ---------- نسخة احتياطية لبيانات المدرس (تصدير JSON / CSV) ---------- */
export const backupCardHtml = () => T("teacher.backupCard");

async function collect() {
  await Promise.all([teacherLoad(), teacherLoadLessons()]);
  const teacher = { id: fbUser.uid, name: (fbProfile && fbProfile.name) || "" };
  return buildBackup({ teacher, students: teacherCache || [], lessons: lessonsState.lessons, quizzes: lessonsState.quizzes, exams: lessonsState.exams, attempts: lessonsState.attempts, ratings: lessonsState.ratings, now: new Date() });
}

export function bindBackup() {
  const j = document.getElementById("bk-json"), c = document.getElementById("bk-csv");
  if (!j || !c) return;
  j.onclick = async () => {
    j.disabled = true;
    try { const b = await collect(); downloadBlob(new Blob([backupJson(b)], { type: "application/json" }), backupName(new Date(), "json")); showToast("اتنزلت النسخة الاحتياطية ✅"); }
    catch (e) { showToast("مشكلة: " + (e.message || e)); }
    j.disabled = false;
  };
  c.onclick = async () => {
    c.disabled = true;
    try { await teacherLoad(); downloadBlob(new Blob([backupStudentsCsv(teacherCache || [])], { type: "text/csv;charset=utf-8" }), backupName(new Date(), "csv")); showToast("اتنزل ملف الطلاب ✅"); }
    catch (e) { showToast("مشكلة: " + (e.message || e)); }
    c.disabled = false;
  };
}
