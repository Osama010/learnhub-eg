/* Presenter شاشة التسجيل: دوال صافية (من غير DOM). بتحوّل بيانات الفورم الخام لقيم نضيفة أو لرسالة خطأ للعرض. */
import { normalizeEgPhone, stageOfGrade } from "../../domain/student.js";

export const REG_DUPLICATE_MSG = "الإيميل ده مسجل قبل كده. لو نسيت بياناتك كلّم مدرسك.";

/** raw: {name,email,grade,phone,parentPhone,pin,teacherIds} كما اتكتبت. بترجّع {error} أو {values}. */
export function presentRegistration(raw) {
  const name = String(raw.name || "").trim();
  const email = String(raw.email || "").trim().toLowerCase();
  const grade = raw.grade;
  const phone = normalizeEgPhone(raw.phone) || "";
  const parentPhone = normalizeEgPhone(raw.parentPhone) || "";
  const pin = String(raw.pin || "").trim();
  const teacherIds = raw.teacherIds || [];
  if (!name) return { error: "اكتب اسمك." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "اكتب إيميل صح." };
  if (!grade) return { error: "اختار السنة الدراسية." };
  if (!phone) return { error: "اكتب رقم موبايل مصري صح (11 رقم يبدأ بـ 01)." };
  if (!parentPhone) return { error: "اكتب رقم موبايل ولي الأمر مصري صح (11 رقم يبدأ بـ 01)." };
  if (parentPhone === phone) return { error: "رقم ولي الأمر لازم يكون مختلف عن رقم الطالب." };
  if (!/^[0-9]{4,6}$/.test(pin)) return { error: "الرقم السري من 4 لـ 6 أرقام." };
  if (!teacherIds.length) return { error: "اختار مدرس واحد على الأقل." };
  return { values: { name, email, grade, phone, parentPhone, pin, teacherIds } };
}

/** المدرس اللي معملوله قبل ميزة المراحل (مفيش stages) يظهر لكل المراحل. */
export function teacherShownForGrade(stagesCsv, grade, gradesCsv) {
  const st = stageOfGrade(grade);
  const stages = String(stagesCsv || "").split(",").filter(Boolean);
  const grades = String(gradesCsv || "").split(",").filter(Boolean); // مدرس معاه صفوف محددة: بنطابق الصف نفسه
  if (grade && grades.length) return grades.includes(grade);
  return !st || !stages.length || stages.includes(st);
}
