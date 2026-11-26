/* خدمة إعدادات المنصة (collections: settings, broadcasts) */
import { db } from "./db.js";

/** هل عميل البيانات اتفتح؟ */
export const isDataReady = () => { try { return !!db.settings(); } catch (_) { return false; } };

/** أرقام صفحة الهبوط اللي بيكتبها الأدمن. بترجّع {} لو مفيش. */
export async function getStatsSettings() {
  const d = await db.settings().doc("stats").get();
  return d.exists ? (d.data() || {}) : {};
}
export const setCurrentTerm = (currentTerm) => db.settings().doc("app").set({ currentTerm }, { merge: true });

/** الإعلان العام (بانر) اللي بيظهر لكل المستخدمين. */
export const publishBroadcast = ({ text, audience, until }) =>
  db.broadcasts().doc("current").set({
    text, audience,
    until: firebase.firestore.Timestamp.fromDate(until),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
export const clearBroadcast = () => db.broadcasts().doc("current").delete();
