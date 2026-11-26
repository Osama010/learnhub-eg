/* درجاتي: الصفوف والمتوسط من غير DOM. بعد النقل لصف جديد بيظهر محتوى صفه الجديد بس. */
export function buildGradesModel({ data, grade }) {
  const contentOf = (a) => a.examId
    ? (data.exams || []).find((e) => e.id === a.examId)
    : a.quizId
      ? (data.quizzes || []).find((q) => q.id === a.quizId)
      : (data.lessons || []).find((l) => l.id === a.lessonId);
  const atts = (data.attempts || []).slice()
    .filter((a) => { const c = contentOf(a); return !c || !c.grade || c.grade === grade; })
    .sort((a, b) => ((b.updatedAt && b.updatedAt.seconds) || 0) - ((a.updatedAt && a.updatedAt.seconds) || 0));
  const nameFor = (a) => {
    if (a.examId) return ((data.exams || []).find((e) => e.id === a.examId) || {}).title || "امتحان";
    if (a.quizId) return ((data.quizzes || []).find((q) => q.id === a.quizId) || {}).title || "كويز";
    return ((data.lessons || []).find((l) => l.id === a.lessonId) || {}).title || "كويز درس";
  };
  const pcts = atts.map((a) => (a.total > 0 ? (a.score / a.total) * 100 : 0));
  const avg = pcts.length ? Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length) : null;
  return { atts, avg, nameFor };
}
