/* خدمة المشرفين (collection: admins): الأدمن الأساسي + مشرفين بإيميلاتهم ورقم سري PIN مشفّر */
import { db } from "./db.js";

export async function addAdmin(email, name, addedBy) {
  const doc = { email, name, addedAt: firebase.firestore.FieldValue.serverTimestamp(), addedBy };
  await db.admins().doc(email).set(doc);
  return doc;
}
export const removeAdmin = (email) => db.admins().doc(email).delete();
export const setAdminPinHash = (email, pinHash) => db.admins().doc(email).update({ pinHash });
