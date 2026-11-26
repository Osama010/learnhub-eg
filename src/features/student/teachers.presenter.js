/* مدرسيني + إحصائيات حسابي. */
export function teachersCardModel({ pubs, reqs, mine, stage }) {
  const mineList = pubs.filter((t) => mine.includes(t.id));
  const others = pubs.filter((t) => !mine.includes(t.id) && (!stage || !(t.stages || []).length || (t.stages || []).includes(stage)));
  const reqOf = (tid) => reqs.find((r) => r.teacherId === tid && r.status !== "accepted");
  return { mineList, others, reqOf };
}
export function newTeacherRequest({ studentId, teacherId, name, grade, email, now }) {
  return { studentId, teacherId, studentName: name || "", grade: grade || "", email: email || "", status: "pending", createdAt: now };
}
export function profileStats(attempts) {
  const pcts = attempts.map((a) => (a.total > 0 ? Math.round((a.score / a.total) * 100) : 0));
  const avg = pcts.length ? Math.round(pcts.reduce((x, y) => x + y, 0) / pcts.length) : null;
  const best = pcts.length ? Math.max(...pcts) : null;
  return { avg, best };
}
