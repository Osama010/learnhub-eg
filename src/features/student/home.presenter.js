/* دروسي (الرئيسية): إعلانات ودروس مجمّعة حسب المادة والمدرس. */
export function buildDashModel({ data, rules: { visible, suspended, term, termOf, locked, teacherName } }) {
  const annVisible = (data.ann || []).filter((a) => visible(a) && !suspended().has(a.teacherId))
    .sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));
  const lessons = (data.lessons || []).filter((l) => visible(l) && termOf(l) === term && !locked(l))
    .slice().sort((a, b) => (a.unit || 0) - (b.unit || 0) || (a.lessonNum || 0) - (b.lessonNum || 0));
  const quizzesVis = (data.quizzes || []).filter((q) => visible(q) && termOf(q) === term && !locked(q));
  const lockedTeachers = (data.teachers || []).filter((t) => suspended().has(t.id));
  const adminLockedTeachers = (data.teachers || []).filter((t) => t.active === false);
  const groups = {};
  lessons.forEach((l) => {
    const subj = l.subject || "عام";
    const tname = teacherName(l.teacherId) || "مدرسك";
    const k = subj + " · " + tname;
    (groups[k] = groups[k] || { subj, tname, items: [] }).items.push(l);
  });
  Object.values(groups).forEach((g) => g.items.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)));
  const gkeys = Object.keys(groups).sort((a, b) =>
    groups[b].items.length - groups[a].items.length || groups[a].subj.localeCompare(groups[b].subj, "ar"));
  return { annVisible, lessons, quizzesVis, lockedTeachers, adminLockedTeachers, groups, gkeys };
}
