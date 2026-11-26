/* خدمة الكويزات (collection: quizzes) */
import { db } from "./db.js";

export async function listQuizzesOfLesson(lessonId) {
  const snap = await db.quizzes().where("lessonId", "==", lessonId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
/** تعديل كويز (id) أو إنشاء جديد لو id فاضي. */
export async function saveQuiz(id, data) {
  if (id) return db.quizzes().doc(id).update(data);
  data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  return db.quizzes().add(data);
}
export const deleteQuiz = (id) => db.quizzes().doc(id).delete();
