import { cleanMinutes } from "../../domain/exam-mode.js";
/* Presenter حفظ الدروس والكويزات وحذفها: تحقق وبناء مستندات ورسائل (دوال صافية، من غير DOM ولا Firebase). */
import { qSerialize, qValidate } from "../../domain/quiz.js";
import { videoEmbed } from "../../domain/media.js";
import { termOf } from "../../domain/term.js";

/** تحقق فورم الدرس. بيرجع {error} أو {unit, lessonNum, pdfIsFile, hasPdfNow}. pdfMaxBytes بتتحقن. */
export function validateLessonForm(form, pdfMaxBytes) {
  const unit = Number(form.unit);
  const lessonNum = Number(form.lessonNum);
  if (!unit || unit < 1) return { error: "اكتب رقم الوحدة." };
  if (!lessonNum || lessonNum < 1) return { error: "اكتب رقم الدرس." };
  if (!form.title.trim()) return { error: "اكتب عنوان الدرس." };
  const pdfIsFile = form.pdfMode !== "link";
  const hasPdfNow = pdfIsFile ? !!(form.pdfFile || form.pdfMeta) : !!form.pdfUrl.trim();
  if (!form.videoUrl.trim() && !hasPdfNow) return { error: "ضيف على الأقل فيديو أو ملف PDF." };
  if (pdfIsFile && form.pdfFile) {
    if (form.pdfFile.size > pdfMaxBytes) return { error: "الملف أكبر من 10 ميجا. صغّره أو استخدم رابط درايف." };
    if (!/pdf$/i.test(form.pdfFile.name) && form.pdfFile.type !== "application/pdf") return { error: "لازم الملف يكون PDF." };
  }
  if (form.videoUrl.trim() && !videoEmbed(form.videoUrl)) return { error: "رابط الفيديو مش واضح. انسخ رابط يوتيوب أو رابط ملف فيديو من جوجل درايف وهو مفتوح في المتصفح." };
  return { unit, lessonNum, pdfIsFile, hasPdfNow };
}

/** مستند الدرس للحفظ. */
export function buildLessonDoc({ uid, profile, stage, form, unit, lessonNum, hasPdf, toStored }) {
  return {
    teacherId: uid,
    teacherName: (profile && profile.name) || "",
    subject: (profile && profile.subject) || "",
    stage: stage || "",
    unit,
    lessonNum,
    title: form.title.trim(),
    hasVideo: !!form.videoUrl.trim(),
    hasPdf,
    desc: form.desc.trim(),
    publishAt: form.publishAt ? toStored(new Date(form.publishAt)) : null,
    grade: form.grade || "",
    term: termOf(form),
  };
}

/** تحقق فورم الكويز: رسالة الخطأ أو null. */
export function validateQuizForm(form) {
  if (!form.title.trim()) return "اكتب عنوان الكويز.";
  if (!form.quiz.length) return "ضيف سؤال واحد على الأقل من زرار \"+ إضافة سؤال\".";
  for (let i = 0; i < form.quiz.length; i++) {
    const err = qValidate(form.quiz[i], i);
    if (err) return err;
  }
  return null;
}

/** مستند الكويز للحفظ. */
export function buildQuizDoc({ uid, profile, stage, form }) {
  return {
    teacherId: uid,
    teacherName: (profile && profile.name) || "",
    subject: (profile && profile.subject) || "",
    stage: stage || "",
    title: form.title.trim(),
    lessonId: form.lessonId || null,
    questions: form.quiz.map(qSerialize),
    grade: form.grade || "",
    maxAttempts: form.oneAttempt ? 1 : 0, // 1 = محاولة واحدة بس للطالب، غير كده إعادة مفتوحة
    timerMin: cleanMinutes(form.timerMin), // 0 = من غير وضع امتحان
    term: termOf(form),
  };
}

/** رسالة تأكيد حذف الدرس (بتنبّه لو فيه كويزات مرتبطة هتتحذف). */
export function lessonDeleteConfirm(lesson, linkedCount) {
  const extra = linkedCount ? `\nتنبيه: فيه ${linkedCount} كويز مرتبط بالدرس ده هيتحذف معاه.` : "";
  return `متأكد إنك عايز تحذف الدرس "${lesson ? lesson.title : ""}"؟${extra}`;
}
