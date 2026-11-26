/* Presenter رسالة لصف (رسائل جماعية بزرار لكل ولي أمر): دوال صافية. */
import { eligibleStudents } from "./late-students.presenter.js";
import { normMode, phoneFor, phoneOk } from "./recipient.presenter.js";

/** قوالب جاهزة بصيغتين: لولي الأمر (p) وللطالب (s). {اسم} بيتبدل باسم الطالب. */
export const BULK_TEMPLATES = [
  { id: "general", label: "رسالة عامة", p: "أهلاً بحضرتك، معاك مدرس {اسم}. ", s: "أهلاً {اسم}، معاك مدرسك. " },
  { id: "session", label: "تذكير بحصة", p: "أهلاً بحضرتك، بنفكركم إن {اسم} عنده حصة قريب. من فضلكم تأكدوا إنه جاهز وحاضر في ميعاده.", s: "أهلاً {اسم}، فكرك إن عندك حصة قريب. كون جاهز وحاضر في ميعادك." },
  { id: "exam", label: "تذكير بامتحان", p: "أهلاً بحضرتك، بنفكركم إن {اسم} عنده امتحان قريب. يا ريت يراجع كويس ويحل الكويزات المتاحة.", s: "أهلاً {اسم}، فكرك إن عندك امتحان قريب. راجع كويس وحل الكويزات المتاحة." },
  { id: "praise", label: "تهنئة وتشجيع", p: "أهلاً بحضرتك، حبيت أبلغكم إن {اسم} مستواه كويس وبيتحسن. استمروا في المتابعة.", s: "أهلاً {اسم}، مستواك كويس وبيتحسن. كمل كده!" },
];

/** نص القالب بالـ id حسب المستلم (أو فاضي). */
export const templateText = (id, mode) => { const t = BULK_TEMPLATES.find((x) => x.id === id); return t ? (normMode(mode) === "student" ? t.s : t.p) : ""; };

/** الطلاب المستهدفين: المقبولين في المرحلة (والصف لو متحدد). */
export const bulkTargets = (students, stage, grade) => eligibleStudents(students, stage, grade);

/** المستلم حسب اختيار المدرس: الرقم المختار بس (من غير بديل). */
export function recipientOf(x, mode) {
  return { parent: normMode(mode) === "parent", to: phoneFor(x, mode) };
}

/** رقم صالح. */
export const hasValidPhone = phoneOk;

/** تبديل {اسم} باسم الطالب. */
export const personalize = (text, x) => String(text || "").split("{اسم}").join((x && x.name) || "نجلكم");

/** مفتاح بسيط للرسالة (عشان علامة "تم" تخص الرسالة دي بس). */
export function bulkKey(text) {
  let h = 5381; const s = String(text || "");
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** صفوف العرض: لكل طالب الرقم والنص الجاهز وهل اتعلّم "تم". */
export function bulkRows(students, text, doneIds, mode) {
  const done = new Set(doneIds || []);
  return students.map((x) => {
    const { parent, to } = recipientOf(x, mode);
    return { id: x.id, name: x.name || "—", grade: x.grade || "", parent, to, valid: hasValidPhone(to), text: personalize(text, x), done: done.has(x.id) };
  });
}

/** ملخص الأعداد: الكل / المختارين / اللي ليهم رقم / اللي اتعلّم تم. */
export function bulkSummary(rows, selectedIds) {
  const sel = new Set(selectedIds);
  const chosen = rows.filter((r) => sel.has(r.id));
  return { total: rows.length, chosen: chosen.length, sendable: chosen.filter((r) => r.valid).length, done: chosen.filter((r) => r.done).length, noPhone: chosen.filter((r) => !r.valid).length };
}

/** تحقق قبل العرض: رسالة الخطأ أو null. */
export function validateBulk(text, stage, selectedCount) {
  if (!stage) return "مفيش مرحلة مسجل فيها — راجع الأدمن.";
  if (!String(text || "").trim()) return "اكتب نص الرسالة الأول.";
  if (!selectedCount) return "اختار طالب واحد على الأقل.";
  return null;
}
