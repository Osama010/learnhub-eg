/* تاب الكويزات والامتحانات: المرئي في الترم الحالي. */
export function quizExamsModel({ data, rules: { visible, term, termOf, locked } }) {
  const quizzes = (data.quizzes || []).filter((q) => visible(q) && termOf(q) === term && !locked(q))
    .slice().sort((a, b) => (a.title || "").localeCompare(b.title || "", "ar"));
  const exams = (data.exams || []).filter((e) => visible(e) && termOf(e) === term && !locked(e));
  return { quizzes, exams };
}
