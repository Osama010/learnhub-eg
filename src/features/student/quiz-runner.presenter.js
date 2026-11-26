/* حل الكويز/الامتحان: التصحيح وبناء مستند المحاولة وقرار النقاط. من غير DOM. */
export function gradeSubmission({ questions, given, item, isExam, studentId, studentName, now, gradeOne }) {
  const results = questions.map((q, i) => ({ correct: gradeOne(q, given[i]) }));
  const score = results.filter((r) => r.correct).length;
  const docId = "att_" + studentId + "_" + (isExam ? "x_" : "") + item.id;
  const data = {
    studentId,
    studentName: studentName || "",
    teacherId: item.teacherId || "",
    quizId: isExam ? null : item.id,
    examId: isExam ? item.id : null,
    lessonId: (!isExam && item.lessonId) ? item.lessonId : null,
    score, total: questions.length,
    answers: results,
    updatedAt: now,
  };
  return { results, score, docId, data };
}
export function missingAnswer(given) { return given.findIndex((g) => g == null); }
export function earnsQuizPoints({ attempts, item, isExam, score, total }) {
  const prev = (attempts || []).find((a) => (isExam ? a.examId === item.id : a.quizId === item.id));
  const prevPassed = !!(prev && prev.total > 0 && prev.score / prev.total >= 0.5);
  return total > 0 && score / total >= 0.5 && !prevPassed;
}
