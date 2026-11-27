/* Presenter طلب حساب مدرس: دوال صافية (من غير DOM ولا Firebase). */
import { GRADES, gradesOfStage, normalizeEgPhone, stageOfGrade } from "../../domain/student.js";

export const SIGNUP_STAGES = ["ابتدائي", "إعدادي", "ثانوي"];
export const SIGNUP_BIO_MAX = 300;

/** المراحل اللي فيها صف واحد على الأقل من الصفوف المختارة (بترتيب المراحل). */
export function stagesOfGrades(grades) {
  const set = new Set(grades || []);
  return SIGNUP_STAGES.filter((st) => gradesOfStage(st).some((g) => set.has(g)));
}

/** هل كل صفوف المرحلة دي مختارة؟ */
export function stageFullySelected(stage, grades) {
  const all = gradesOfStage(stage);
  const set = new Set(grades || []);
  return all.length > 0 && all.every((g) => set.has(g));
}

/** raw: {name,email,phone,subject,grades,bio,website} كنصوص الفورم. بيرجّع {error} أو {values} أو {bot:true}. */
export function presentTeacherSignup(raw) {
  if (raw && raw.website) return { bot: true }; // خانة مخفية: البشر مبيملوهاش
  const name = String((raw && raw.name) || "").trim();
  const email = String((raw && raw.email) || "").trim().toLowerCase();
  const phone = normalizeEgPhone(raw && raw.phone) || "";
  const subject = String((raw && raw.subject) || "").trim();
  const bio = String((raw && raw.bio) || "").trim();
  const picked = new Set((raw && raw.grades) || []);
  const grades = GRADES.filter((g) => picked.has(g)); // بترتيب الصفوف، وأي قيمة غريبة بتتشال
  if (name.length < 3) return { error: "اكتب اسمك بالكامل." };
  if (name.length > 80) return { error: "الاسم طويل زيادة." };
  if (!email || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "اكتب إيميل صح." };
  if (!phone) return { error: "اكتب رقم موبايل مصري صح (11 رقم يبدأ بـ 01)." };
  if (!subject) return { error: "اكتب المادة اللي بتدرّسها." };
  if (subject.length > 60) return { error: "اسم المادة طويل زيادة." };
  if (!grades.length) return { error: "اختار صف واحد على الأقل، أو علّم \"كل الصفوف\" لمرحلة." };
  if (bio.length > SIGNUP_BIO_MAX) return { error: "النبذة لازم تكون أقل من " + SIGNUP_BIO_MAX + " حرف." };
  return { values: { name, email, phone, subject, grades, stages: stagesOfGrades(grades), bio } };
}

/** الخطأ اللي بيرجع من Firestore لو الطلب موجود قبل كده (المستند بنفس الإيميل) أو القواعد لسه متنشرتش. */
export function signupErrorMessage(e) {
  const code = String((e && e.code) || "");
  if (code.includes("permission")) return "الطلب ده اتبعت قبل كده بنفس الإيميل، أو الخدمة لسه مش متفعلة. كلّم الأدمن.";
  if (code.includes("unavailable") || code.includes("network")) return "مفيش اتصال بالإنترنت دلوقتي، جرّب تاني.";
  return "حصلت مشكلة في إرسال الطلب: " + ((e && e.message) || e);
}

/** نص الصفوف في كارت الأدمن: مرحلة كاملة تتكتب "كل صفوف الإعدادي" والباقي بأسماء الصفوف. */
export function gradesSummary(grades) {
  const set = new Set(grades || []);
  const parts = [];
  SIGNUP_STAGES.forEach((st) => {
    if (stageFullySelected(st, grades)) { parts.push("كل صفوف ال" + st); return; }
    gradesOfStage(st).filter((g) => set.has(g)).forEach((g) => parts.push(g.replace("الصف ", "")));
  });
  return parts.join("، ") || "—";
}
export { stageOfGrade };
