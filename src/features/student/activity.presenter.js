/* ترتيب الطالب الأسبوعي: أرقام بس من غير أسماء. نفس النشاط ميتحسبش مرتين. */
export function weeklyRank({ activity, weekStart, grade, studentId }) {
  const pts = {}; const seen = new Set();
  activity.forEach((a) => {
    const t = a && a.ts && a.ts.toDate ? a.ts.toDate() : null;
    if (!t || t < weekStart || (a.grade || "") !== grade || !a.studentId) return;
    const key = a.studentId + "|" + (a.kind || "") + "|" + (a.refId || "");
    if (seen.has(key)) return;
    seen.add(key);
    pts[a.studentId] = (pts[a.studentId] || 0) + (Number(a.points) || 0);
  });
  const mine = pts[studentId] || 0;
  const rivals = Object.keys(pts).length;
  if (!rivals) return null;
  const rank = Object.values(pts).filter((p) => p > mine).length + 1;
  return { rank, rivals, mine };
}
