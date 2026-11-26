/* Presenter إعلانات المدرس: دوال صافية (من غير DOM ولا Firebase). */

/** المرحلة المختارة: لو مش من مراحل المدرس نرجع لأول مرحلة (أو فاضي). */
export const resolveStage = (sel, myStages) => (!sel || !myStages.includes(sel)) ? (myStages[0] || "") : sel;

/** تحقق قبل الإرسال: بيرجع رسالة الخطأ أو null. */
export function validateAnnouncement(text, stage) {
  if (!text) return "اكتب نص الإعلان الأول.";
  if (!stage) return "مفيش مرحلة مسجل فيها — راجع الأدمن.";
  return null;
}

/** مستند الإعلان الجاهز للحفظ (createdAt بيتحط من برّه). */
export function buildAnnouncement({ uid, profile, stage, grade, text, createdAt }) {
  return { teacherId: uid, teacherName: (profile && profile.name) || "", subject: (profile && profile.subject) || "", stage, grade: grade || "", text, createdAt };
}
