/* خدمة المكتبة العامة اللي الأدمن بينزّل فيها محتوى للطلبة (collection: library) */
import { db } from "./db.js";

/** تعديل عنصر (id) أو إضافة جديد مع تسجيل مين أضافه. */
export async function saveLibraryItem(id, data, createdBy) {
  if (id) return db.library().doc(id).update(data);
  data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  data.createdBy = createdBy;
  return db.library().add(data);
}
export const deleteLibraryItem = (id) => db.library().doc(id).delete();
