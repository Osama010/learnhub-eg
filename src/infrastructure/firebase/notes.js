/* خدمة ملاحظات المدرس الخاصة على الطلاب (collection: studentNotes) */
import { db } from "./db.js";

export async function listStudentNotes(teacherId, studentId) {
  const snap = await db.studentNotes().where("teacherId", "==", teacherId).where("studentId", "==", studentId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));
}
export const addStudentNote = (teacherId, studentId, text) =>
  db.studentNotes().add({ teacherId, studentId, text, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
export const deleteStudentNote = (id) => db.studentNotes().doc(id).delete();
