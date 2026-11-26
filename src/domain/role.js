import { subInfo } from "./subscription.js";

/* تحديد دور المستخدم من السجلات اللي اتقرت له: أدمن أساسي، أدمن إضافي، مدرس، طالب. من غير قراءة ولا DOM. */
export function roleFromRecords({ uid, isBaseAdmin, adminDoc, teacher, student }) {
  if (isBaseAdmin) return { role: "admin", profile: null };
  if (adminDoc) return { role: "admin", profile: { id: uid, ...adminDoc } };
  if (teacher && teacher.active !== false) {
    const profile = { id: uid, ...teacher };
    // مدرس اشتراكه انتهى: دور مميز يوريه رسالة التجديد، والقواعد بتقفل محتواه على طلابه
    return { role: subInfo(profile).status === "expired" ? "teacherSubExpired" : "teacher", profile };
  }
  // مدرس موقوف من الأدمن: دور مميز عشان تظهر له رسالة واضحة بدل "مش حساب مدرس"
  if (teacher && teacher.active === false) return { role: "teacherSuspended", profile: { id: uid, ...teacher } };
  if (student) return { role: student.status === "approved" ? "student" : "blocked", profile: { id: uid, ...student } };
  return { role: "unknown", profile: null };
}
