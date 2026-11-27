/* تقرير الدرس للمدرس: مين فتح ومين شغّل الفيديو وخلّصه ومين فتح الـ PDF، ومين لسه. دوال صافية. */
export const FINISH_PCT = 90;
const num = (x) => (Number(x) > 0 ? Number(x) : 0);
export function lessonReport({ students, docs, lessonId, grade }) {
  const byId = new Map((docs || []).filter((d) => d && d.lessonId === lessonId).map((d) => [d.studentId, d]));
  const mine = (students || []).filter((s) => s && (s.status || "approved") === "approved" && (!grade || !s.grade || s.grade === grade));
  const rows = [], missing = [];
  mine.forEach((s) => {
    const d = byId.get(s.id) || {};
    const legacy = !!(s.watchedLessons && s.watchedLessons[lessonId]);
    const opened = num(d.openedAt), played = num(d.playedAt), finished = num(d.finishedAt), pdf = num(d.pdfAt);
    const any = opened || played || finished || pdf || legacy;
    const r = { id: s.id, name: s.name || "طالب", grade: s.grade || "", opened: !!(opened || legacy || played || pdf), openedAt: opened, legacyOnly: !opened && legacy && !played && !pdf,
      played: !!(played || finished), playedAt: played, finished: !!finished || num(d.pct) >= FINISH_PCT, finishedAt: finished, pct: Math.min(100, Math.round(num(d.pct))), pdf: !!pdf, pdfAt: pdf,
      lastAt: Math.max(opened, played, finished, pdf) };
    (any ? rows : missing).push(r);
  });
  rows.sort((a, b) => b.lastAt - a.lastAt || a.name.localeCompare(b.name, "ar"));
  missing.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const sum = { total: mine.length, opened: rows.length, played: rows.filter((r) => r.played).length, finished: rows.filter((r) => r.finished).length, pdf: rows.filter((r) => r.pdf).length, missing: missing.length };
  return { rows, missing, sum };
}
