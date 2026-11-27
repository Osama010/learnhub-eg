/* أسئلة وتعليقات الدروس: دوال صافية (من غير DOM ولا Firebase). */
export const MAX_COMMENT = 500, MAX_REPLY = 1000, COMMENTS_LIMIT = 100;

/** الاسم الأول بس (خصوصية: الطلاب بيشوفوا بعض بالاسم الأول). */
export function firstName(name) {
  const s = String(name || "").trim().split(/\s+/)[0];
  return s || "طالب";
}
export const cleanText = (t, max) => String(t || "").replace(/\s+/g, " ").trim().slice(0, max);
/** مستند تعليق جديد، أو null لو النص فاضي. */
export function buildComment({ lesson, student, uid, text, now }) {
  const t = cleanText(text, MAX_COMMENT);
  if (!t || !lesson || !lesson.id || !lesson.teacherId) return null;
  return { lessonId: lesson.id, teacherId: lesson.teacherId, studentId: uid, studentName: firstName(student && student.name), text: t, createdAt: now };
}
const sec = (x) => (x && x.seconds) || 0;
/** الأقدم الأول جوه الدرس. */
export const sortThread = (list) => (list || []).slice().sort((a, b) => sec(a.createdAt) - sec(b.createdAt));
/** صندوق المدرس: اللي ملوش رد الأول (الأقدم الأول)، وبعده المجاوب عليه (الأحدث الأول). */
export function sortInbox(list) {
  const open = (list || []).filter((c) => !c.reply).sort((a, b) => sec(a.createdAt) - sec(b.createdAt));
  const done = (list || []).filter((c) => c.reply).sort((a, b) => sec(b.createdAt) - sec(a.createdAt));
  return open.concat(done);
}
export const unansweredCount = (list) => (list || []).filter((c) => !c.reply).length;
export const canDeleteOwn = (c, uid) => !!c && c.studentId === uid;
/** نص الرد (أو null لو فاضي). */
export function buildReply(text) { const t = cleanText(text, MAX_REPLY); return t || null; }
