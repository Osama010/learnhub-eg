/* طبقة الدومين (entities + business rules): دوال وثوابت صافية من غير DOM ولا Firebase ولا حالة عامة.
   الطبقة دي ماتستوردش أي حاجة من برّه domain/. */

// توحيد رقم موبايل مصري: يقبل 01xxxxxxxxx أو 1xxxxxxxxx أو بكود الدولة 20/0020/+20
// ويرجع الصيغة القياسية 01xxxxxxxxx، أو null لو الرقم مش مصري صح
export function normalizeEgPhone(p) {
  let d = String(p || "").replace(/[^\d]/g, "");
  if (d.startsWith("0020")) d = d.slice(4);
  else if (d.startsWith("20") && d.length >= 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  return /^01[0-9]{9}$/.test(d) ? d : null;
}

// المرحلة الدراسية من اسم الصف (مشتركة بين التسجيل ولوحة الأدمن)
export function stageOfGrade(g) {
  if (!g) return "";
  if (g.includes("ابتدائي")) return "ابتدائي";
  if (g.includes("إعدادي")) return "إعدادي";
  return "ثانوي";
}

export const GRADES = [
  "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
  "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
  "الصف الأول الإعدادي", "الصف الثاني الإعدادي", "الصف الثالث الإعدادي",
  "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي",
];

// صفوف مرحلة معينة من قايمة GRADES الثابتة (كل مرحلة ماسكة صفوفها)
export function gradesOfStage(st) {
  return GRADES.filter((g) => stageOfGrade(g) === st);
}

/* ---------- مستويات الطالب: نقاط تحفيزية خاصة، مفيش ترتيب بين الطلبة ---------- */
export const S_LEVELS = [
  { min: 0, name: "مبتدئ", icon: "🌱" },
  { min: 100, name: "مجتهد", icon: "💪" },
  { min: 300, name: "متفوق", icon: "🏆" },
  { min: 600, name: "نجم", icon: "⭐" },
  { min: 1000, name: "أسطورة", icon: "👑" },
];

/* المستوى الحالي والمستوى الجاي من جدول S_LEVELS */
export function sLevelFor(points) {
  let cur = S_LEVELS[0], next = null;
  for (const lv of S_LEVELS) { if (points >= lv.min) cur = lv; else { next = lv; break; } }
  return { cur, next };
}

export function rolePortal(role) {
  if (role === "student") return "student";
  if (role === "teacher" || role === "teacherSuspended" || role === "teacherSubExpired") return "teacher";
  if (role === "admin") return "admin";
  return "";
}
