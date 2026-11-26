/* خدمة إعلانات المدرس لطلاب مرحلة (collection: announcements) */
import { db } from "./db.js";

const byNewest = (a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0);

export async function listTeacherAnnouncements(teacherId) {
  const snap = await db.announcements().where("teacherId", "==", teacherId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest);
}
export const addAnnouncement = (fields) => db.announcements().add({ ...fields, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
export const deleteAnnouncement = (id) => db.announcements().doc(id).delete();
