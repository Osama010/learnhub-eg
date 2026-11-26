/* Presenter المتأخرين عن كويز/امتحان: دوال صافية. */
import { stageOfGrade } from "../../domain/student.js";

/** الطلاب المقبولين في المرحلة (والصف لو متحدد). grade فاضي = كل صفوف المرحلة. */
export const eligibleStudents = (students, stage, grade) => (students || []).filter((x) => x.status === "approved" && stageOfGrade(x.grade) === stage && (!grade || x.grade === grade));

/** اللي لسه محلوش (مفيش محاولة بـ studentId بتاعهم). */
export const lateOf = (students, attempts) => { const done = new Set(attempts.map((a) => a.studentId)); return students.filter((x) => !done.has(x.id)); };

/** رقم الواتساب ونص التذكير (لولي الأمر لو مسجل، وإلا للطالب). */
export function reminderFor(x, kindLabel, title) {
  const parent = !!x.parentPhone;
  const to = x.parentPhone || x.phone || "";
  const text = parent
    ? "أهلاً بحضرتك، معاك مدرس " + (x.name || "نجلكم") + ". بنفكركم إن " + (x.name || "الطالب") + " لسه ما حلش " + kindLabel + ": " + (title || "") + ". لو سمحتوا فكروه يحله."
    : "أهلاً " + (x.name || "") + "، معاك مدرسك. فكرك إنك لسه ما حليتش " + kindLabel + ": " + (title || "") + ". متنساش تحله.";
  return { parent, to, text };
}
