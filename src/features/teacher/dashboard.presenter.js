/* Presenter لوحة المدرس: دوال صافية بتحوّل البيانات الخام لنماذج عرض (من غير DOM ولا Firebase). */
import { GRADES } from "../../domain/student.js";

/** الأحدث الأول حسب createdAt.seconds (بيسيب الترتيب زي ما هو لو أي طرف من غير createdAt). */
export const newestFirst = (list) => list.slice().sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));

/** الطلاب مقسّمين حسب الحالة: {pending, approved}. */
export function partitionStudents(students) {
  return { pending: students.filter((s) => s.status === "pending"), approved: students.filter((s) => s.status === "approved") };
}

/** نشاط الأسبوع الحالي بس (من بداية الأسبوع ws). */
export function activitiesSince(acts, ws) {
  return acts.filter((a) => { const t = a && a.ts && a.ts.toDate ? a.ts.toDate() : null; return t && t >= ws; });
}

/** لون ميدالية المركز i في لوحة الشرف. */
export const medalStyle = (i) => i === 0 ? "background:#f59e0b;color:#fff;" : i === 1 ? "background:#94a3b8;color:#fff;" : i === 2 ? "background:#b45309;color:#fff;" : "background:var(--border, #d8dee9);";

/** لوحة الشرف: نقاط كل طالب من نشاط الأسبوع (نفس الدرس/الكويز مرة واحدة)، وأوائل كل صف (5 بالكتير).
    بيرجّع null لو مفيش حد عنده نقاط، وإلا {pts, grades:[{grade, top:[student]}]}. */
export function honorBoardModel(students, weekActs) {
  const pts = {}; const seen = new Set();
  (weekActs || []).forEach((a) => {
    if (!a || !a.studentId) return;
    const key = a.studentId + "|" + (a.kind || "") + "|" + (a.refId || "");
    if (seen.has(key)) return;
    seen.add(key);
    pts[a.studentId] = (pts[a.studentId] || 0) + (Number(a.points) || 0);
  });
  const withPts = (students || []).filter((s) => s.status === "approved" && (pts[s.id] || 0) > 0);
  if (!withPts.length) return null;
  const grades = [...new Set(withPts.map((s) => s.grade || "—"))];
  grades.sort((a, b) => GRADES.indexOf(a) - GRADES.indexOf(b));
  return {
    pts,
    grades: grades.map((g) => ({
      grade: g,
      top: withPts.filter((s) => (s.grade || "—") === g).sort((a, b) => (pts[b.id] || 0) - (pts[a.id] || 0)).slice(0, 5),
    })),
  };
}
