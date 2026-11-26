/* Presenter شاشة مدرسين الأدمن: تحقق صافي من فورم المدرس ومن نافذة تسجيل الدفعة (من غير DOM ولا Firebase). */
import { SUB_TYPES } from "../../domain/subscription.js";

/** raw: {name,subject,email,phone,stages,subType,subAmount,subStart,subEnd} كنصوص الفورم.
    بيرجّع {error} أو {values} (التواريخ فاضلة نصوص yyyy-mm-dd؛ تحويلها لـ Timestamp شغل الـ controller). */
export function presentTeacherForm(raw) {
  const name = String(raw.name || "").trim();
  const subject = String(raw.subject || "").trim();
  const email = String(raw.email || "").trim().toLowerCase();
  const phone = String(raw.phone || "").trim();
  const stages = raw.stages || [];
  if (!name) return { error: "اكتب اسم المدرس." };
  if (!subject) return { error: "اختار المادة من القايمة." };
  if (!stages.length) return { error: "اختار مرحلة واحدة على الأقل اللي المدرس بيدرّسها." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "اكتب إيميل صح." };
  const subType = raw.subType && SUB_TYPES[raw.subType] ? raw.subType : "free"; // قيمة غريبة = مجاني
  const subAmount = Number(raw.subAmount || 0);
  if (subType !== "free") {
    if (!raw.subStart || !raw.subEnd) return { error: "حدد بداية ونهاية الاشتراك، أو خلي النوع مجاني." };
    if (raw.subEnd <= raw.subStart) return { error: "نهاية الاشتراك لازم تكون بعد البداية." };
  }
  return { values: { name, subject, email, phone, stages, subType, subAmount, subStart: raw.subStart, subEnd: raw.subEnd } };
}

export function validateNewTeacherPassword(pass) {
  return pass.length < 6 ? "الباسورد المؤقت 6 أحرف على الأقل." : null;
}

/** نافذة تسجيل دفعة: رسالة خطأ أو null. */
export function validatePaymentPeriod(from, to) {
  if (!from || !to) return "حدد بداية ونهاية الفترة.";
  if (to <= from) return "نهاية الفترة لازم تكون بعد البداية.";
  return null;
}
