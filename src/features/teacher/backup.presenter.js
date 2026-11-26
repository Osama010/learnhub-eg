/* Presenter النسخة الاحتياطية: بيحوّل بيانات المدرس لملف JSON/CSV. صافي. */
import { analyticsCsv } from "./analytics.presenter.js";

const BK_SECRET = /hash|password|^pin$|token|secret/i;

/** نسخة عادية من القيمة: التواريخ → ISO، وبيشيل أي حقل شكله سري. */
export function bkPlain(v) {
  if (v == null || typeof v !== "object") return v;
  if (typeof v.toDate === "function") { try { return v.toDate().toISOString(); } catch (e) { return null; } }
  if (Array.isArray(v)) return v.map(bkPlain);
  const o = {};
  Object.keys(v).forEach((k) => { if (!BK_SECRET.test(k)) o[k] = bkPlain(v[k]); });
  return o;
}

/** ملف النسخة الاحتياطية (كائن). */
export function buildBackup({ teacher, students, lessons, quizzes, exams, attempts, ratings, now }) {
  const data = { students: students || [], lessons: lessons || [], quizzes: quizzes || [], exams: exams || [], attempts: attempts || [], ratings: ratings || [] };
  const out = {
    meta: { app: "المستر", kind: "teacher-backup", exportedAt: now.toISOString(), teacherId: (teacher && teacher.id) || "", teacherName: (teacher && teacher.name) || "", counts: {} },
  };
  Object.keys(data).forEach((k) => { out[k] = data[k].map(bkPlain); out.meta.counts[k] = data[k].length; });
  return out;
}

export const backupJson = (obj) => JSON.stringify(obj, null, 1);

/** اسم الملف: t4k-backup-YYYY-MM-DD. */
export const backupName = (now, ext) => "t4k-backup-" + now.toISOString().slice(0, 10) + "." + ext;

/** CSV الطلاب (بيانات أساسية). */
export function backupStudentsCsv(students) {
  const rows = [["الاسم", "الصف", "الحالة", "رقم الطالب", "رقم ولي الأمر", "الإيميل"]];
  (students || []).forEach((s) => rows.push([s.name || "", s.grade || "", s.status || "", s.phone || "", s.parentPhone || "", s.email || ""]));
  return analyticsCsv(rows);
}

/** نسخة احتياطية للأدمن: كل المدرسين والطلاب وسجل الحركات. */
export function buildAdminBackup({ admin, teachers, students, log, now }) {
  const data = { teachers: teachers || [], students: students || [], log: log || [] };
  const out = { meta: { app: "المستر", kind: "admin-backup", exportedAt: now.toISOString(), adminEmail: (admin && admin.email) || "", counts: {} } };
  Object.keys(data).forEach((k) => { out[k] = data[k].map(bkPlain); out.meta.counts[k] = data[k].length; });
  return out;
}
