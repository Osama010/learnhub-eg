/* Presenter حساب الأدمن (النبذة، أرقام الهبوط، جملة الأسفل): دوال صافية. */

/** مستند النبذة من القيم المقصوصة (v) والصورة. */
export function buildAboutDoc(v, photo, updatedAt) {
  return {
    name: v.name, title: v.title, shortBio: v.short,
    longBio: v.long, skills: v.skills,
    whatsapp: v.wa.replace(/[^\d]/g, ""), facebook: v.fb, youtube: v.yt,
    telegram: v.tg, linkedin: v.li, photo, updatedAt,
  };
}

/** تحقق أرقام الصفحة الرئيسية: {error} أو {vals} (أرقام صحيحة مقرّبة). raw = {teachers, lessons, students} نصوص. */
export function parseStatsInputs(raw) {
  const vals = {};
  for (const k of ["teachers", "lessons", "students"]) {
    const n = Number(raw[k]);
    if (!isFinite(n) || n < 0 || n > 100000000) return { error: "اكتب أرقام صحيحة (صفر أو أكتر)." };
    vals[k] = Math.round(n);
  }
  return { vals };
}

/** رسالة خطأ جملة الأسفل أو null. */
export const validateFooterText = (text) => (text ? null : "اكتب نص الجملة الأول.");
