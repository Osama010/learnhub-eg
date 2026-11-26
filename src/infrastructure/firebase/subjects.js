/* خدمة المواد الدراسية (collection: subjects) */
import { db } from "./db.js";

export const updateSubject = (id, { name, stage, grade }) => db.subjects().doc(id).update({ name, stage, grade });
export const addSubject = ({ name, stage, grade }) => db.subjects().add({ name, stage, grade, core: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
export const deleteSubject = (id) => db.subjects().doc(id).delete();

/** إضافة مواد أساسية كتير مرة واحدة (list = [{name, stage, grade}]). */
export async function addCoreSubjects(list) {
  const batch = db.batch();
  list.forEach(({ name, stage, grade }) => batch.set(db.subjects().doc(), { name, stage, grade, core: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() }));
  return batch.commit();
}
