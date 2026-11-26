/* خدمة الدروس ووسائطها (collections: lessons, lessonMedia, lessonFileChunks).
   وثيقة الدرس فيها المحتوى النصي بس، والفيديو/PDF في lessonMedia، وملفات PDF المرفوعة متقسّمة على lessonFileChunks. */
import { db } from "./db.js";

export async function getLesson(id) {
  const d = await db.lessons().doc(id).get();
  return d.exists ? { id: d.id, ...d.data() } : null;
}
/** إنشاء درس جديد وترجيع id بتاعه. */
export async function createLesson(data) {
  data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  return (await db.lessons().add(data)).id;
}
/** تعديل درس موجود. الروابط القديمة على وثيقة الدرس بتتشال (بتتنقل لـ lessonMedia). */
export const updateLesson = (id, data) =>
  db.lessons().doc(id).update({ ...data, videoUrl: firebase.firestore.FieldValue.delete(), pdfUrl: firebase.firestore.FieldValue.delete() });
export const setLessonPinned = (id, pinned) => db.lessons().doc(id).update({ pinned });
export const deleteLesson = (id) => db.lessons().doc(id).delete();

export const saveLessonMedia = (lessonId, { teacherId, videoUrl, pdfUrl, pdfFile }) =>
  db.lessonMedia().doc(lessonId).set({ teacherId, videoUrl, pdfUrl, pdfFile: pdfFile || null, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
export const saveLessonFileChunk = (lessonId, i, teacherId, data) =>
  db.lessonFileChunks().doc(lessonId + "_" + i).set({ teacherId, lessonId, i, data });
/** مسح أجزاء ملف PDF من رقم from لحد to (من غير ما يوقف لو جزء مش موجود). */
export async function deleteLessonFileChunks(lessonId, from, to) {
  for (let i = from; i < to; i++) { try { await db.lessonFileChunks().doc(lessonId + "_" + i).delete(); } catch (_) {} }
}
/** مسح وسائط الدرس وأجزاء الـ PDF بتاعته (best effort). */
export async function deleteLessonMedia(lessonId) {
  try {
    const md = await db.lessonMedia().doc(lessonId).get();
    const n = md.exists && md.data().pdfFile ? md.data().pdfFile.chunks || 0 : 0;
    await deleteLessonFileChunks(lessonId, 0, n);
    if (md.exists) await db.lessonMedia().doc(lessonId).delete();
  } catch (_) {}
}
