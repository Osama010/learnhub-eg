/* صفحة الدرس (الطالب): قرار إتاحة الدرس + الكويزات المرتبطة. القواعد (visible/locked/open) بتيجي كمدخلات. */
export function findLesson(data, id) {
  return ((data && data.lessons) || []).find((x) => x.id === id) || null;
}
/** بيرجّع { ok: true } أو { ok: false, message } بنفس ترتيب الفحوص القديم. */
export function lessonAccess(l, { visible, teacherLocked, isOpen, fmtTs }) {
  if (!l || !visible(l)) return { ok: false, message: "الدرس ده مش متاح ليك." };
  if (teacherLocked(l)) return { ok: false, message: "تم إيقاف وصولك لمحتوى هذا المدرس." };
  if (!isOpen(l)) return { ok: false, message: "الدرس ده مجدول — هيتفتح " + fmtTs(l.publishAt) + "." };
  return { ok: true };
}
export function linkedQuizzes(data, lessonId, { visible, teacherLocked }) {
  return ((data && data.quizzes) || []).filter((q) => q.lessonId === lessonId && visible(q) && !teacherLocked(q));
}
