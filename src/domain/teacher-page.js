/* صفحة المدرس العامة ولينك الدعوة: دوال صافية. */
export const BIO_MAX = 300;
const cnt = (n) => Math.max(0, Math.min(100000, Math.floor(Number(n) || 0)));
export function pageStatsOf({ students, lessons, quizzes, now }) { return { students: cnt(students), lessons: cnt(lessons), quizzes: cnt(quizzes), at: now }; }
export function validateBio(s) { const b = String(s || "").trim(); return b.length > BIO_MAX ? { error: "النبذة لازم تكون أقل من " + BIO_MAX + " حرف." } : { bio: b }; }
/** موديل العرض للصفحة العامة، أو null لو الصفحة مقفولة/المدرس موقوف. */
export function publicPageModel(doc) {
  if (!doc || doc.pageOn !== true || doc.active === false) return null;
  const st = doc.pageStats || {};
  return { id: doc.id, name: String(doc.name || "").slice(0, 80), subject: String(doc.subject || ""), stages: Array.isArray(doc.stages) ? doc.stages : [], avatar: doc.avatar || "", bio: String(doc.pageBio || ""), stats: { students: cnt(st.students), lessons: cnt(st.lessons), quizzes: cnt(st.quizzes), at: st.at || 0 } };
}
const root = (base) => String(base || "").split("#")[0];
export const pageLink = (base, id) => root(base) + "#/t/" + encodeURIComponent(id);
export const inviteLink = (base, id) => root(base) + "#/join/" + encodeURIComponent(id);
export const inviteText = (name, link) => "أهلاً! سجّل عند " + (name || "المدرس") + " على المنصة من اللينك ده:\n" + link;
