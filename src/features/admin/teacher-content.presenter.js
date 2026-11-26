/* Presenter محتوى المدرس وطلاب الأدمن: تصدير، فلترة، تحقق تعديل طالب (دوال صافية). */
import { fmtTs } from "../../domain/format.js";
import { normalizeEgPhone } from "../../domain/student.js";
import { atcStats } from "../../domain/reporting.js";

const byUnit = (a, b) => (a.unit || 0) - (b.unit || 0) || (a.lessonNum || 0) - (b.lessonNum || 0);
/** الدروس مرتبة بالوحدة ثم رقم الدرس. */
export const lessonsByUnit = (lessons) => lessons.slice().sort(byUnit);

/** عدد التقييمات ومتوسط النجوم لدرس. */
export function lessonRatingStats(ratings, l) {
  const rs = ratings.filter((r) => r.lessonId === l.id);
  const avg = rs.length ? (rs.reduce((s, r) => s + (r.stars || 0), 0) / rs.length).toFixed(1) : null;
  return { count: rs.length, avg };
}

/** طلاب الأدمن بعد الفلتر (مدرس/حالة/بحث بالاسم). */
export function filterAdminStudents(all, f) {
  return all.filter((s) => {
    if (f.teacher && !(s.teacherIds || []).includes(f.teacher)) return false;
    if (f.status && s.status !== f.status) return false;
    if (f.q && !(s.name || "").includes(f.q)) return false;
    return true;
  });
}

/** نص CSV بأقسام لمحتوى مدرس (بـ BOM وحماية معادلات Excel). */
export function teacherContentCsv(t, data, stamp) {
  const { lessons, quizzes, exams, ann, attempts } = data;
  const q = (c) => {
    let s = String(c == null ? "" : c);
    if (/^[=+\-@\t\r ]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const row = (cells) => cells.map(q).join(",");
  const lines = [];
  lines.push(row(["محتوى المدرس", t.name || "", "", "", "", "", ""]));
  lines.push(row(["المادة", t.subject || "", "تاريخ التحميل", stamp]));
  lines.push("");
  lines.push(row(["الدروس"]));
  lines.push(row(["الوحدة", "الدرس", "العنوان", "الصف", "الترم", "رابط الفيديو", "رابط PDF"]));
  lessonsByUnit(lessons)
    .forEach((l) => lines.push(row([l.unit || "", l.lessonNum || "", l.title || "", l.grade || "كل الصفوف", l.term === 2 ? "الثاني" : "الأول", l.videoUrl || "", l.pdfUrl || ""])));
  lines.push("");
  lines.push(row(["الكويزات"]));
  lines.push(row(["العنوان", "الصف", "عدد الأسئلة", "المحاولات", "متوسط الدرجة"]));
  quizzes.forEach((x) => { const st = atcStats(attempts, x.id, false); lines.push(row([x.title || "", x.grade || "كل الصفوف", (x.questions || []).length, st.count, st.avg != null ? st.avg + "%" : ""])); });
  lines.push("");
  lines.push(row(["الامتحانات"]));
  lines.push(row(["العنوان", "الحالة", "عدد الأسئلة", "المحاولات", "متوسط الدرجة"]));
  exams.forEach((x) => { const st = atcStats(attempts, x.id, true); lines.push(row([x.title || "", x.closed ? "مقفول" : "مفتوح", (x.quiz || []).length, st.count, st.avg != null ? st.avg + "%" : ""])); });
  lines.push("");
  lines.push(row(["الإعلانات"]));
  lines.push(row(["الإعلان", "التاريخ"]));
  ann.forEach((a) => lines.push(row([a.text || "", a.createdAt ? fmtTs(a.createdAt) : ""])));
  lines.push("");
  lines.push(row(["نتائج الطلاب"]));
  lines.push(row(["الطالب", "العنصر", "الدرجة", "النسبة", "التاريخ"]));
  const itemName = (a) => {
    if (a.examId) { const e = exams.find((x) => x.id === a.examId); return "امتحان: " + ((e && e.title) || ""); }
    const qz = quizzes.find((x) => x.id === a.quizId);
    return "كويز: " + ((qz && qz.title) || "");
  };
  attempts.forEach((a) => lines.push(row([a.studentName || "", itemName(a), `${a.score} من ${a.total}`, a.total > 0 ? Math.round((a.score / a.total) * 100) + "%" : "", a.updatedAt ? fmtTs(a.updatedAt) : ""])));
  return "\ufeff" + lines.join("\r\n");
}

/** نسخة JSON كاملة (من غير بيانات تواصل أو مفاتيح داخلية للطلاب). */
export function teacherContentJson(t, data, nowIso) {
  const stripIds = (a) => { const { studentId, ...rest } = a; return rest; };
  const dump = {
    exportedAt: nowIso,
    platform: "learnhub-eg",
    teacher: { name: t.name || "", subject: t.subject || "", stages: t.stages || [] },
    lessons: data.lessons, quizzes: data.quizzes, exams: data.exams,
    announcements: data.ann,
    quizAttempts: (data.attempts || []).map(stripIds),
    lessonRatings: (data.ratings || []).map(stripIds),
  };
  const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v && typeof v === "object" && typeof v.toDate === "function" ? v.toDate().toISOString() : v)));
  return JSON.stringify(clean(dump), null, 2);
}

/** تحقق تعديل بيانات طالب: {error} أو {values}. raw = {name, email, grade, phone, parentPhone}. */
export function validateStudentEdit(raw, linked) {
  const name = raw.name.trim();
  const email = raw.email.trim().toLowerCase();
  const phone = normalizeEgPhone(raw.phone) || "";
  const parentPhone = normalizeEgPhone(raw.parentPhone) || "";
  if (!name) return { error: "اكتب اسم الطالب." };
  if (!linked && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return { error: "اكتب إيميل صح." };
  if (!phone) return { error: "اكتب رقم موبايل مصري صح (11 رقم يبدأ بـ 01)." };
  if (raw.parentPhone.trim() && !parentPhone) return { error: "رقم ولي الأمر مش صح (11 رقم يبدأ بـ 01)، أو سيبه فاضي." };
  return { values: { name, grade: raw.grade, phone, parentPhone, email } };
}
