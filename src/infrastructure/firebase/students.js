/* خدمة الطلاب وفهرس التسجيل (collections: students, registrationLookup).
   الدوال اللي اسمها batch* بتضيف العملية لدفعة مفتوحة وماتكتبش لوحدها. */
import { db } from "./db.js";
import { rows, one } from "./mapping.js";

export const listStudentsOfTeacher = (teacherId) => db.students().where("teacherIds", "array-contains", teacherId).get().then(rows);
export const listAllStudentsNewestFirst = () => db.students().orderBy("createdAt", "desc").get().then(rows);
/** بيانات الطالب أو null لو مش موجود. */
export const getStudent = (id) => db.students().doc(id).get().then(one);
export const addStudent = (data) => db.students().add(data);
export const setStudent = (id, data) => db.students().doc(id).set(data);
export const updateStudent = (id, data) => db.students().doc(id).update(data);
export const deleteStudent = (id) => db.students().doc(id).delete();
export const batchUpdateStudent = (batch, id, data) => batch.update(db.students().doc(id), data);
export const batchDeleteStudent = (batch, id) => batch.delete(db.students().doc(id));

const lk = (email) => db.registrationLookup().doc(email);
/** فهرس التسجيل العام للإيميل أو null. */
export const getLookup = (email) => lk(email).get().then(one);
export const setLookup = (email, data) => lk(email).set(data);
export const updateLookup = (email, data) => lk(email).update(data);
export const batchUpdateLookup = (batch, email, data) => batch.update(lk(email), data);
export const batchSetLookup = (batch, email, data) => batch.set(lk(email), data);
export const batchDeleteLookup = (batch, email) => batch.delete(lk(email));
/** حذف كل مستندات collection الخاصة بطالب (على دفعات 400) وترجيع عددها. */
export async function wipeByStudent(col, studentId) {
  const snap = await db[col]().where("studentId", "==", studentId).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.size;
}
/** شيل مدرس من قوائم كل طلابه (على دفعات 400) وترجيع عدد الطلاب. */
export async function detachTeacherFromStudents(teacherId) {
  const studs = await db.students().where("teacherIds", "array-contains", teacherId).get();
  for (let i = 0; i < studs.docs.length; i += 400) {
    const batch = db.batch();
    studs.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { teacherIds: firebase.firestore.FieldValue.arrayRemove(teacherId) }));
    await batch.commit();
  }
  return studs.size;
}
