import { usSet } from "../../shared/user-state.js";
import { T } from "../../core/templates.js";
import { fbProfile, fbUser } from "../../core/session.js";
import { downloadBlob } from "../../shared/common.js";
import { teacherCache, teacherLoad, teacherLoadLessons } from "./dashboard.js";
import { lessonsState } from "./lessons.js";
import { showToast } from "../../shared/toast.js";
import { getLessonMedia } from "../../main/data.js";
import { backupJson, backupName, backupStudentsCsv, buildBackup } from "./backup.presenter.js";

export const LAST_BACKUP_KEY = "t4kLastBackup";

/* ---------- نسخة احتياطية لبيانات المدرس (تصدير JSON / CSV) ---------- */
export const backupCardHtml = () => T("teacher.backupCard");

/* روابط الفيديو/PDF لكل درس (قراءة واحدة لكل درس ليه وسائط، وبس لما المدرس ينزّل نسخة). فشل درس واحد مابيوقفش النسخة. */
async function collectMedia(lessons) {
  const media = {}, todo = (lessons || []).filter((l) => l.hasVideo || l.hasPdf);
  for (let i = 0; i < todo.length; i += 5) {
    await Promise.all(todo.slice(i, i + 5).map(async (l) => { try { const m = await getLessonMedia(l.id); if (m && (m.videoUrl || m.pdfUrl)) media[l.id] = { videoUrl: m.videoUrl || "", pdfUrl: m.pdfUrl || "" }; } catch (_) {} }));
  }
  return media;
}

async function collect() {
  await Promise.all([teacherLoad(), teacherLoadLessons()]);
  const teacher = { id: fbUser.uid, name: (fbProfile && fbProfile.name) || "" };
  return buildBackup({ teacher, students: teacherCache || [], lessons: lessonsState.lessons, quizzes: lessonsState.quizzes, exams: lessonsState.exams, attempts: lessonsState.attempts, ratings: lessonsState.ratings, media: await collectMedia(lessonsState.lessons), now: new Date() });
}

/** تنزيل نسخة كاملة دلوقتي (بيستخدمها زرار الصفحة وزرار التذكير). */
export async function downloadFullBackup() {
  const b = await collect();
  downloadBlob(new Blob([backupJson(b)], { type: "application/json" }), backupName(new Date(), "json"));
  try { usSet("backupLast", Date.now()); } catch (_) {}
}

export function bindBackup() {
  const j = document.getElementById("bk-json"), c = document.getElementById("bk-csv");
  if (!j || !c) return;
  j.onclick = async () => {
    j.disabled = true;
    try { await downloadFullBackup(); showToast("اتنزلت النسخة الاحتياطية ✅"); }
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
