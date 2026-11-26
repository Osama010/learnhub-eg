/* Presenter متابعة الطلاب (المتأخرين عن النشاط): دوال صافية. */
import { eligibleStudents } from "./late-students.presenter.js";
import { normMode, phoneFor, phoneOk } from "./recipient.presenter.js";

export const INACT_DAYS = [7, 14, 30];
const INACT_DAY_MS = 86400000;

/** تاريخ محاولة (updatedAt أو ts أو createdAt) أو null. */
export const inactTs = (a) => { const t = a && (a.updatedAt || a.ts || a.createdAt); return t && t.toDate ? t.toDate() : null; };

/** آخر نشاط للطالب: أحدث يوم في activityDays أو أحدث محاولة (Date أو null). */
export function lastActiveOf(student, attempts) {
  let last = null;
  const ds = Object.keys((student && student.activityDays) || {}).sort();
  if (ds.length) last = new Date(ds[ds.length - 1] + "T12:00:00");
  (attempts || []).forEach((a) => { if (a.studentId !== student.id) return; const d = inactTs(a); if (d && (!last || d > last)) last = d; });
  return last;
}

/** عدد الأيام من آخر نشاط (null = لسه ما دخلش). */
export const daysSinceActive = (last, now) => (last ? Math.max(0, Math.floor((now - last) / INACT_DAY_MS)) : null);

/** وصف آخر نشاط. */
export const inactLabel = (n) => (n === null ? "لسه ما دخلش" : n === 0 ? "النهارده" : "من " + n + " يوم");

/** نص التذكير حسب المستلم. */
export function inactiveText(x, mode, n) {
  const name = x.name || (normMode(mode) === "parent" ? "نجلكم" : "");
  const gap = n === null ? "لسه ما دخلش المنصة" : "ما دخلش المنصة من " + n + " يوم";
  return normMode(mode) === "parent"
    ? "أهلاً بحضرتك، معاك مدرس " + name + ". بنفكركم إن " + name + " " + gap + ". من فضلكم شجعوه يدخل ويكمل دروسه وكويزاته."
    : "أهلاً " + (x.name || "") + "، معاك مدرسك. لاحظت إنك " + gap + ". ادخل كمل دروسك وكويزاتك وأنا معاك.";
}

/** الطلاب المتأخرين: اللي آخر نشاطهم من days يوم أو أكتر، أو ما دخلوش خالص. الأقدم الأول (اللي ما دخلش في الأول). */
export function inactiveRows(students, attempts, now, days, mode) {
  return (students || []).map((x) => {
    const last = lastActiveOf(x, attempts);
    const n = daysSinceActive(last, now);
    const to = phoneFor(x, mode);
    return { id: x.id, name: x.name || "—", grade: x.grade || "", days: n, label: inactLabel(n), to, valid: phoneOk(to), text: inactiveText(x, mode, n), parent: normMode(mode) === "parent" };
  }).filter((r) => r.days === null || r.days >= days).sort((a, b) => (a.days === null ? 1e9 : a.days) < (b.days === null ? 1e9 : b.days) ? 1 : -1);
}

/** طلاب المرحلة/الصف المقبولين (نفس تعريف المتأخرين عن كويز). */
export const followTargets = (students, stage, grade) => eligibleStudents(students, stage, grade);

/** ملخص: العدد الكلي والمتأخرين واللي ليهم رقم. */
export function followSummary(total, rows) {
  return { total, late: rows.length, never: rows.filter((r) => r.days === null).length, sendable: rows.filter((r) => r.valid).length };
}
