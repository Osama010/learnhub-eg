/* القادم: الدروس المجدولة والامتحانات اللي ليها معاد. rules بتتحقن من الشاشة. */
export function upcomingLessons({ data, rules: { visible, term, termOf, locked } }) {
  return (data.lessons || []).filter((l) => visible(l) && termOf(l) === term && !locked(l))
    .filter((l) => l.publishAt && l.publishAt.toDate && l.publishAt.toDate() > new Date())
    .sort((a, b) => a.publishAt.seconds - b.publishAt.seconds);
}
export function upcomingExams({ data, now, rules: { visible, term, termOf, locked, examTs } }) {
  return (data.exams || []).filter((e) => visible(e) && termOf(e) === term && !locked(e))
    .filter((e) => !e.closed && ((e.openAt && e.openAt.toDate && e.openAt.toDate() > now)
      || ((!e.openAt || e.openAt.toDate() <= now) && e.closeAt && e.closeAt.toDate && e.closeAt.toDate() > now)))
    .sort((a, b) => examTs(a) - examTs(b));
}
