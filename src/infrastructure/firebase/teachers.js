/* خدمة المدرسين (collections: teachers الخاصة، teachersPublic النسخة العامة بدون تليفون).
   أي تعديل مهم بيتكتب على الاتنين في نفس الدفعة. */
import { db } from "./db.js";
import { one, rows } from "./mapping.js";

/** ملف المدرس الخاص (أو null). */
export const getTeacher = (id) => db.teachers().doc(id).get().then(one);
export const listTeachersNewestFirst = () => db.teachers().orderBy("createdAt", "desc").get().then(rows);
export const listTeachersPublic = () => db.teachersPublic().get().then(rows);
export const listActiveTeachersPublic = () => db.teachersPublic().where("active", "==", true).get().then(rows);
/** هل الإيميل ده متسجل كمدرس؟ (من النسخة العامة) */
export const isTeacherEmailRegistered = (email) => db.teachersPublic().where("email", "==", email).limit(1).get().then((q) => !q.empty);
export const listTeachersPublicByIds = (ids) => db.teachersPublic().where(firebase.firestore.FieldPath.documentId(), "in", ids).get().then(rows);
export const batchUpdateTeacher = (batch, id, privateData, publicData) => {
  batch.update(db.teachers().doc(id), privateData);
  batch.update(db.teachersPublic().doc(id), publicData);
};
export const batchSetTeacher = (batch, id, privateData, publicData) => {
  batch.set(db.teachers().doc(id), privateData);
  batch.set(db.teachersPublic().doc(id), publicData);
};
export const batchSetTeacherPublic = (batch, id, data) => batch.set(db.teachersPublic().doc(id), data);
export const batchUpdateTeacherPublic = (batch, id, data) => batch.update(db.teachersPublic().doc(id), data);
export const batchDeleteTeacher = (batch, id) => { batch.delete(db.teachers().doc(id)); batch.delete(db.teachersPublic().doc(id)); };
/** حذف كل مستندات collection الخاصة بمدرس (على دفعات 400) وترجيع عددها. */
export async function wipeByTeacher(col, teacherId) {
  const snap = await db[col]().where("teacherId", "==", teacherId).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.size;
}
