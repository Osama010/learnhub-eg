/* تقييم الطالب للمدرس (نجوم + تعليق): دوال صافية. بيظهر بعد موافقة الأدمن بس. */
export const TEXT_MAX = 300;
export const reviewId = (uid, teacherId) => uid + "_" + teacherId;
export function validateReview({ stars, text }) {
  const s = Math.floor(Number(stars));
  if (!(s >= 1 && s <= 5)) return { error: "اختار عدد النجوم من 1 لـ 5." };
  const t = String(text || "").trim();
  if (t.length > TEXT_MAX) return { error: "التعليق لازم يكون أقل من " + TEXT_MAX + " حرف." };
  return { stars: s, text: t };
}
export function reviewDoc({ uid, teacherId, profile, stars, text, now }) {
  const name = String((profile && profile.name) || "طالب").trim().split(/\s+/)[0].slice(0, 20) || "طالب";
  return { teacherId, studentId: uid, studentName: name, stars, text, status: "pending", updatedAt: now };
}
export function reviewSummary(list) {
  const ok = (list || []).filter((r) => r && r.stars >= 1 && r.stars <= 5);
  if (!ok.length) return { count: 0, avg: 0 };
  return { count: ok.length, avg: Math.round((ok.reduce((n, r) => n + r.stars, 0) / ok.length) * 10) / 10 };
}
export const starsText = (n) => "★".repeat(Math.max(0, Math.min(5, Math.round(n)))) + "☆".repeat(5 - Math.max(0, Math.min(5, Math.round(n))));
