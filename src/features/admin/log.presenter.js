/* Presenter السجل والإحصائيات والإعلان العام (الأدمن): دوال صافية. */
import { tsToDate } from "../../domain/format.js";
import { subDateStr } from "../../domain/subscription.js";

/** تصفية سجل الأدمن بالحركة والتاريخ (from/to بصيغة yyyy-mm-dd). */
export function filterAdminLog(log, f) {
  let list = (log || []).slice();
  if (f.action) list = list.filter((l) => l.action === f.action);
  if (f.from) list = list.filter((l) => { const d = tsToDate(l.at); return d && subDateStr(d) >= f.from; });
  if (f.to) list = list.filter((l) => { const d = tsToDate(l.at); return d && subDateStr(d) <= f.to; });
  return list;
}

/** عدد الطلاب المقبولين والمعلّقين. */
export function studentStatusCounts(students) {
  return { approved: (students || []).filter((s) => s.status === "approved").length, pending: (students || []).filter((s) => s.status === "pending").length };
}

/** رسالة خطأ لنص الإعلان أو null. */
export const validateBroadcastText = (text) => (text ? null : "اكتب نص الإعلان الأول.");

/** آخر لحظة في يوم الانتهاء (بعد days أيام من now). */
export function broadcastUntil(days, now) { const until = new Date(now.getTime()); until.setDate(until.getDate() + days); until.setHours(23, 59, 59, 0); return until; }
