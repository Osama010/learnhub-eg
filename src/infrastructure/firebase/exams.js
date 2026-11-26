/* خدمة الامتحانات المستقلة (collection: exams) */
import { db } from "./db.js";

/** تعديل امتحان موجود (id) أو إنشاء جديد لو id فاضي. */
export async function saveExam(id, data) {
  if (id) return db.exams().doc(id).update(data);
  data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  return db.exams().add(data);
}
export const setExamClosed = (id, closed) => db.exams().doc(id).update({ closed });
export const deleteExam = (id) => db.exams().doc(id).delete();
