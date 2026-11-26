/* قواعد تقدّم الطالب والمدرس (نقاط، شارات، غلطات، متوسطات). كل الدوال بتاخد مدخلاتها كباراميترز ومبتقراش أي حالة عامة. */

/** عدد الدروس اللي الطالب شافها من الدروس الموجودة فعلاً. */
export function watchedCountOf(lessons, watchedIds) {
  const lessonIds = new Set((lessons || []).map((l) => l.id));
  return [...watchedIds].filter((id) => lessonIds.has(id)).length;
}
/** عدد الاختبارات الناجحة (50% أو أكتر). */
export function passedCountOf(attempts) {
  return (attempts || []).filter((a) => a.total > 0 && a.score / a.total >= 0.5).length;
}
/** نقاط الطالب: 10 لكل درس اتشاف + 20 لكل اختبار ناجح. */
export function pointsOf({ lessons, attempts, watchedIds }) {
  return watchedCountOf(lessons, watchedIds) * 10 + passedCountOf(attempts) * 20;
}
export function badgesOf({ watched, passed, streak }) {
  return [
    { icon: "⭐", name: "أول خطوة", desc: "شوفت أول درس", got: watched >= 1 },
    { icon: "📚", name: "قارئ نشيط", desc: "شوفت 10 دروس", got: watched >= 10 },
    { icon: "🎯", name: "أول نجاح", desc: "عديت أول اختبار", got: passed >= 1 },
    { icon: "🏆", name: "بطل الاختبارات", desc: "عديت 5 اختبارات", got: passed >= 5 },
    { icon: "⚡", name: "سلسلة 3 أيام", desc: "نشاط 3 أيام ورا بعض", got: streak >= 3 },
    { icon: "🗓️", name: "أسبوع كامل", desc: "نشاط 7 أيام ورا بعض", got: streak >= 7 },
  ];
}
/** الأسئلة اللي الطالب غلط فيها، مع الاختبار أو الامتحان بتاعها. */
export function mistakesOf({ attempts, exams, quizzes }) {
  const out = [];
  for (const att of (attempts || [])) {
    const isExam = !!att.examId;
    const item = isExam
      ? (exams || []).find((e) => e.id === att.examId)
      : (quizzes || []).find((q) => q.id === att.quizId);
    if (!item) continue;
    const qs = isExam ? (item.quiz || []) : (item.questions || []);
    (att.answers || []).forEach((a, i) => {
      if (a && a.correct === false && qs[i]) out.push({ q: qs[i], idx: i, item, isExam });
    });
  }
  return out;
}
export function findAttempt(attempts, quizId, examId) {
  return (attempts || []).find((a) => (quizId && a.quizId === quizId) || (examId && a.examId === examId)) || null;
}
export function myRatingOf(ratings, lessonId) {
  const r = (ratings || []).find((x) => x.lessonId === lessonId);
  return r ? r.stars || 0 : 0;
}
/** متوسط تقييم درس: {avg, count} أو null لو مفيش تقييمات. */
export function lessonRatingOf(ratings, lid) {
  const rs = ratings.filter((r) => r.lessonId === lid);
  if (!rs.length) return null;
  const avg = rs.reduce((s, r) => s + (r.stars || 0), 0) / rs.length;
  return { avg: Math.round(avg * 10) / 10, count: rs.length };
}
/** متوسط درجات الطالب في الكويزات كنسبة مئوية. */
export function studentQuizAvgOf(attempts, sid) {
  const att = attempts.filter((a) => a.studentId === sid && a.total > 0);
  if (!att.length) return null;
  return Math.round(att.reduce((sum, a) => sum + (a.score / a.total) * 100, 0) / att.length);
}
export function attemptsOfQuiz(attempts, q) {
  return attempts.filter((a) => a.quizId === q.id || (q.lessonId && a.lessonId === q.lessonId));
}
