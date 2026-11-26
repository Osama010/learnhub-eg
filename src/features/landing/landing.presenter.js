/* صفحة الهبوط: تصفية المدرسين النشطين وتجهيز نص النبذة. دوال صافية. */
export const LANDING_FEATURES = [
  ["📚", "دروس منظمة", "شروحات مرتبة حسب السنة والمادة"],
  ["📝", "كويزات وامتحانات", "تدريب فوري ونتيجة على طول"],
  ["🏆", "نقاط وترتيب", "تحفيز أسبوعي لكل طالب"],
  ["📱", "على الموبايل", "ثبّتها كتطبيق وادخل بضغطة"],
];
/** مدرس مجاني أو اشتراكه ما انتهاش (أو مفيش تاريخ انتهاء يتقري). */
export function activeTeachers(list, now) {
  return (list || []).filter((t) => (t.subType || "free") === "free" || !t.subEnd || !t.subEnd.toDate || t.subEnd.toDate() >= now);
}
export const splitSkills = (s) => String(s || "").split(/[،,]/).map((x) => x.trim()).filter(Boolean);
export const splitParas = (s) => String(s || "").split(/\n+/).map((p) => p.trim()).filter(Boolean);
export const initialOf = (n) => String(n || "م").replace(/^(مستر|أ\.?|د\.?)\s*/, "").trim()[0] || "م";
export const readMoreLabel = (open) => (open ? "إخفاء النبذة" : "اقرأ النبذة كاملة");
