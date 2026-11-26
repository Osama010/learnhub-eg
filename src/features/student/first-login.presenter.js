/* Presenter أول دخول وبوابة رقم ولي الأمر: تحقق صافي من المدخلات. بيرجّع رسالة خطأ أو null. */
import { normalizeEgPhone } from "../../domain/student.js";

export const PARENT_PHONE_MSG = "اكتب رقم موبايل مصري صح (11 رقم يبدأ بـ 01).";

export function validateFirstLogin({ pin, pass1, pass2 }) {
  if (!/^[0-9]{4,6}$/.test(pin)) return "اكتب الرقم السري صح.";
  if (pass1.length < 6) return "الباسورد لازم يكون 6 أحرف على الأقل.";
  if (pass1 !== pass2) return "الباسوردين مش زي بعض.";
  return null;
}

export const presentParentPhone = (raw) => normalizeEgPhone(raw) || null;

export const EMAIL_IN_USE_MSG = "عندك حساب قديم بنفس الإيميل. بعتلنك لينك على إيميلك تعمل بيه باسورد جديد، وبعدين ادخل عادي من صفحة الدخول.";
