/* لوحة شرف الكويزات: متوسط درجات الطالب عند كل مدرس، وترتيب زملاء نفس الصف بالاسم الأول بس. دوال صافية. */
export const BOARD_MIN_COUNT = 2, BOARD_TOP = 5;
const pct = (a) => (a && a.total > 0 ? (a.score / a.total) * 100 : null);

/** متوسط نسب الكويزات والامتحانات للطالب عند مدرس (آخر محاولة لكل اختبار). {sum,count,avg} */
export function quizStatsOf(attempts, teacherId) {
  let sum = 0, count = 0;
  (attempts || []).forEach((a) => { if (a && a.teacherId === teacherId) { const p = pct(a); if (p != null) { sum += p; count++; } } });
  sum = Math.round(sum * 100) / 100;
  return { sum, count, avg: count ? Math.round(sum / count) : 0 };
}
const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "طالب";
/** مستند اللوحة (يتخزن في quizBoard/{uid_teacherId}). */
export function boardDoc({ uid, teacherId, profile, stats, hidden, now }) {
  return { teacherId, studentId: uid, name: firstName(profile && profile.name).slice(0, 30), grade: (profile && profile.grade) || "", sum: stats.sum, count: stats.count, avg: stats.avg, hidden: !!hidden, updatedAt: now };
}
export const boardId = (uid, teacherId) => uid + "_" + teacherId;
/** بصمة الحالة المتخزنة: لو ما اتغيرتش ما نكتبش تاني. */
export const boardKey = (stats, hidden) => stats.sum + ":" + stats.count + ":" + (hidden ? 1 : 0);

/** أوائل صف الطالب. بيدمج الطالب مع نفسه عند أكتر من مدرس بمتوسط الأوزان. */
export function topOfBoard(entries, { grade, uid, limit, minCount }) {
  const min = minCount || BOARD_MIN_COUNT, lim = limit || BOARD_TOP;
  const by = new Map();
  (entries || []).forEach((e) => {
    if (!e || e.grade !== grade || !(e.count > 0)) return;
    if (e.hidden && e.studentId !== uid) return;
    const g = by.get(e.studentId) || { studentId: e.studentId, name: e.name, sum: 0, count: 0, hidden: false };
    g.sum += Number(e.sum) || 0; g.count += Number(e.count) || 0; g.hidden = g.hidden || !!e.hidden;
    by.set(e.studentId, g);
  });
  const all = [...by.values()].filter((g) => g.count >= min).map((g) => ({ ...g, avg: Math.round(g.sum / g.count), me: g.studentId === uid }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count || String(a.name).localeCompare(String(b.name), "ar"));
  all.forEach((g, i) => { g.rank = i + 1; });
  const visible = all.filter((g) => !g.hidden || g.me);
  return { top: visible.filter((g) => !g.hidden).slice(0, lim), me: all.find((g) => g.me) || null, total: all.length };
}
