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
export function buildBackup({ teacher, students, lessons, quizzes, exams, attempts, ratings, media, now }) {
  const data = { students: students || [], lessons: lessons || [], quizzes: quizzes || [], exams: exams || [], attempts: attempts || [], ratings: ratings || [] };
  const out = {
    meta: { app: "المستر", kind: "teacher-backup", exportedAt: now.toISOString(), teacherId: (teacher && teacher.id) || "", teacherName: (teacher && teacher.name) || "", counts: {} },
  };
  Object.keys(data).forEach((k) => { out[k] = data[k].map(bkPlain); out.meta.counts[k] = data[k].length; });
  out.meta.version = 2;
  out.media = media || {}; // روابط فيديو/PDF لكل درس (lessonId -> {videoUrl, pdfUrl}). الملفات المرفوعة نفسها مش جوه النسخة.
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

/* ---------- تذكير النسخة الاحتياطية والاسترجاع ---------- */
export const BACKUP_REMIND_DAYS = 7;
/** هل النسخة الأخيرة قديمة (أو مفيش) ومحتاجة تذكير؟ lastMs = وقت آخر نسخة بالمللي ثانية أو 0. */
export const backupDue = (lastMs, nowMs, days) => !lastMs || nowMs - lastMs >= (days || BACKUP_REMIND_DAYS) * 86400000;
export const backupAgeDays = (lastMs, nowMs) => (lastMs ? Math.floor((nowMs - lastMs) / 86400000) : null);

const DATE_KEYS = ["createdAt", "updatedAt", "publishAt", "openAt", "closeAt"];
const ISO = /^\d{4}-\d{2}-\d{2}T/;
/** مستند للرفع: التواريخ ISO ترجع Timestamps (toStored بتتحقن) والمدرس بيتثبّت من الحساب الحالي. */
export function reviveDoc(doc, uid, toStored) {
  const out = {};
  Object.keys(doc || {}).forEach((k) => {
    if (k === "id") return;
    const v = doc[k];
    if (DATE_KEYS.includes(k)) { if (typeof v === "string" && ISO.test(v) && !isNaN(new Date(v).getTime())) out[k] = toStored(new Date(v)); else if (v == null) out[k] = null; return; }
    out[k] = v;
  });
  out.teacherId = uid;
  return out;
}

/** خطة الاسترجاع: بترجع {error} لو الملف غلط/لمدرس تاني، أو العناصر الناقصة بس (اللي مش موجودة حاليًا بنفس الـ id). مفيش حاجة موجودة بتتكتب فوقها. */
export function restorePlan({ backup, uid, existing, toStored }) {
  if (!backup || typeof backup !== "object" || !backup.meta || backup.meta.kind !== "teacher-backup") return { error: "الملف ده مش نسخة احتياطية من المنصة." };
  if (!uid || backup.meta.teacherId !== uid) return { error: "النسخة دي تخص حساب مدرس تاني، مينفعش ترجعها على حسابك." };
  const items = [], counts = { lessons: 0, quizzes: 0, exams: 0 }, kept = { lessons: 0, quizzes: 0, exams: 0 };
  ["lessons", "quizzes", "exams"].forEach((col) => {
    (Array.isArray(backup[col]) ? backup[col] : []).forEach((d) => {
      if (!d || typeof d.id !== "string" || !d.id || d.id.includes("/")) return;
      if (d.teacherId && d.teacherId !== uid) return;
      if (existing && existing[col] && existing[col].has(d.id)) { kept[col]++; return; }
      items.push({ col, id: d.id, data: reviveDoc(d, uid, toStored) });
      counts[col]++;
    });
  });
  const media = [];
  const bm = backup.media && typeof backup.media === "object" ? backup.media : {};
  items.filter((x) => x.col === "lessons").forEach((x) => { const m = bm[x.id]; if (m && (m.videoUrl || m.pdfUrl)) media.push({ lessonId: x.id, videoUrl: m.videoUrl || "", pdfUrl: m.pdfUrl || "" }); });
  return { items, counts, kept, media };
}
