/* وضع ولي الأمر: لقطة تقدّم الطالب (من غير موبايل ولا إيميل) بتتنشر تحت كود طويل عشوائي، وولي الأمر بيفتح اللينك للقراءة بس. */
const ALPHA = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_RE = /^[A-Za-z0-9]{20,40}$/;
export function newParentCode(rand) {
  let s = ""; const r = rand || ((n) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; });
  const bytes = r(24); for (let i = 0; i < 24; i++) s += ALPHA[bytes[i] % ALPHA.length];
  return s;
}
const root = (b) => String(b || "").split("#")[0];
export const parentLink = (base, code) => root(base) + "#/p/" + code;
export const parentText = (name, link) => "تقدّم " + (name || "ابني") + " على منصة المستر (للقراءة بس):\n" + link;
const clampN = (n, max) => Math.max(0, Math.min(max, Math.round(Number(n) || 0)));
const day = (ms) => { const d = new Date(ms); return d.getDate() + "/" + (d.getMonth() + 1); };
export function parentSnapshot({ uid, profile, watched, lessons, attempts, quizzes, weak, streak, now }) {
  const att = (attempts || []).filter((a) => a && a.total > 0);
  const pcts = att.map((a) => (a.score / a.total) * 100);
  const sec = (a) => (a.createdAt && a.createdAt.seconds) || 0;
  const recent = att.slice().sort((a, b) => sec(b) - sec(a)).slice(0, 5).map((a) => {
    const q = (quizzes || []).find((x) => x.id === a.quizId);
    return { title: String((q && q.title) || (a.examId ? "امتحان" : "كويز")).slice(0, 40), pct: clampN((a.score / a.total) * 100, 100), day: sec(a) ? day(sec(a) * 1000) : "" };
  });
  return {
    studentId: uid, name: String((profile && profile.name) || "").trim().split(/\s+/).slice(0, 2).join(" ").slice(0, 30), grade: String((profile && profile.grade) || "").slice(0, 60),
    stats: { watched: clampN(watched, 100000), lessons: clampN(lessons, 100000), attempts: clampN(att.length, 100000), avg: pcts.length ? clampN(pcts.reduce((a, b) => a + b, 0) / pcts.length, 100) : null, streak: clampN(streak && streak.current, 1000), best: clampN(streak && streak.best, 1000), activeToday: !!(streak && streak.activeToday) },
    weak: (weak || []).filter((w) => w && w.level === "weak").slice(0, 3).map((w) => ({ label: String(w.label || "").slice(0, 40), pct: clampN(w.pct, 100) })),
    recent, updatedAt: now,
  };
}
/** موديل العرض لصفحة ولي الأمر: بيتأكد من الأنواع لأن الوثيقة جاية من الشبكة. */
export function parentView(doc) {
  if (!doc || typeof doc !== "object") return null;
  const st = doc.stats || {};
  return { name: String(doc.name || "").slice(0, 30), grade: String(doc.grade || "").slice(0, 60), updatedAt: Number(doc.updatedAt) || 0,
    stats: { watched: clampN(st.watched, 1e5), lessons: clampN(st.lessons, 1e5), attempts: clampN(st.attempts, 1e5), avg: st.avg == null ? null : clampN(st.avg, 100), streak: clampN(st.streak, 1000), best: clampN(st.best, 1000), activeToday: st.activeToday === true },
    weak: (Array.isArray(doc.weak) ? doc.weak : []).slice(0, 3).map((w) => ({ label: String((w && w.label) || "").slice(0, 40), pct: clampN(w && w.pct, 100) })),
    recent: (Array.isArray(doc.recent) ? doc.recent : []).slice(0, 5).map((r) => ({ title: String((r && r.title) || "").slice(0, 40), pct: clampN(r && r.pct, 100), day: String((r && r.day) || "").slice(0, 8) })) };
}
