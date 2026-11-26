/* Presenter الامتحانات المستقلة: دوال صافية (من غير DOM ولا Firebase). */
import { qSerialize, qValidate } from "../../domain/quiz.js";
import { termOf } from "../../domain/term.js";

/** Timestamp -> قيمة input من نوع datetime-local ("" لو مفيش). */
export function tsToLocalInput(ts) {
  try {
    if (!ts || !ts.toDate) return "";
    const d = ts.toDate();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch (e) { return ""; }
}

/** تحقق فورم الامتحان: رسالة الخطأ أو null. */
export function validateExamForm(form) {
  if (!form.title.trim()) return "اكتب عنوان الامتحان.";
  if (!form.quiz.length) return "ضيف سؤال واحد على الأقل للامتحان.";
  for (let i = 0; i < form.quiz.length; i++) {
    const err = qValidate(form.quiz[i], i);
    if (err) return err;
  }
  if (form.openAt && form.closeAt && new Date(form.closeAt) <= new Date(form.openAt)) return "موعد القفل لازم يكون بعد موعد الفتح.";
  return null;
}

/** مستند الامتحان للحفظ. toStored بتتحقن (تحويل Date لوقت متخزّن). */
export function buildExamDoc({ uid, profile, stage, form, toStored }) {
  return {
    teacherId: uid,
    teacherName: (profile && profile.name) || "",
    subject: (profile && profile.subject) || "",
    stage: stage || "",
    title: form.title.trim(),
    desc: form.desc.trim(),
    openAt: form.openAt ? toStored(new Date(form.openAt)) : null,
    closeAt: form.closeAt ? toStored(new Date(form.closeAt)) : null,
    closed: !!form.closed,
    quiz: form.quiz.map(qSerialize),
    grade: form.grade || "",
    term: termOf(form),
  };
}

/** متوسط نتيجة الامتحان بالنسبة المئوية + النسب الفردية. */
export function examStats(attempts) {
  const pcts = attempts.map((a) => (a.total > 0 ? (a.score / a.total) * 100 : 0));
  const avg = pcts.length ? Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length) : 0;
  return { pcts, avg };
}
