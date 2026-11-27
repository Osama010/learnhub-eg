import { loc } from "../../domain/format.js";
/* تحليل أداء الطالب: نموذج العرض من غير DOM ولا Firebase. */
export function longestStreak(profile) {
  const ds = Object.keys((profile && profile.activityDays) || {}).sort();
  let best = 0, cur = 0, prev = null;
  ds.forEach((s) => {
    const d = new Date(s + "T12:00:00");
    cur = prev && Math.round((d - prev) / 86400000) === 1 ? cur + 1 : 1;
    if (cur > best) best = cur;
    prev = d;
  });
  return best;
}


export function buildStudentAnalyticsModel({ opts, now, profile, data, kit: { anAvg, anPct, anTs }, rules: { visible, locked, lessonOpen, isWatched, teacherName, streak: currentStreak, dateStr } }) {
  const DAY = 86400000, myGrade = (profile && profile.grade) || "";
  const contentOf = (a) => a.examId ? (data.exams || []).find((e) => e.id === a.examId) : a.quizId ? (data.quizzes || []).find((q) => q.id === a.quizId) : null;
  const all = (data.attempts || []).filter((a) => { const c = contentOf(a); return c && (!c.grade || c.grade === myGrade) && (!opts.tid || c.teacherId === opts.tid); });
  const from = new Date(now.getTime() - opts.days * DAY), prevFrom = new Date(now.getTime() - 2 * opts.days * DAY);
  const inR = (a, f, t) => { const d = anTs(a); return d && d >= f && d < t; };
  const cur = all.filter((a) => inR(a, from, new Date(now.getTime() + DAY))), prev = all.filter((a) => inR(a, prevFrom, from));
  const avg = anAvg(cur.map(anPct)), pavg = anAvg(prev.map(anPct));
  const lessons = (data.lessons || []).filter((l) => visible(l) && !locked(l) && lessonOpen(l) && (!opts.tid || l.teacherId === opts.tid));
  const done = lessons.filter((l) => isWatched(l.id));
  const perTeacher = {};
  lessons.forEach((l) => { const p = perTeacher[l.teacherId] || (perTeacher[l.teacherId] = { total: 0, done: 0 }); p.total++; if (isWatched(l.id)) p.done++; });
  const teachers = Object.keys(perTeacher).map((tid) => ({ tid, name: teacherName(tid) || "مدرس", ...perTeacher[tid] }));
  const line = all.slice().filter((a) => anTs(a)).sort((a, b) => anTs(a) - anTs(b)).slice(-8).map((a, i) => ({ label: String(i + 1), v: Math.round(anPct(a)) }));
  const subj = {};
  all.forEach((a) => { const c = contentOf(a); const t = (data.teachers || []).find((x) => x.id === c.teacherId) || {}; const k = c.subject || t.subject || teacherName(c.teacherId) || "عام"; (subj[k] = subj[k] || []).push(anPct(a)); });
  const subjects = Object.keys(subj).map((k) => ({ name: k, avg: Math.round(anAvg(subj[k])) })).sort((a, b) => b.avg - a.avg);
  // أضعف كويز (آخر محاولة تحت 70%)
  const weak = all.filter((a) => a.quizId && anPct(a) < 70).sort((a, b) => anPct(a) - anPct(b))[0];
  const weakQuiz = weak ? (data.quizzes || []).find((q) => q.id === weak.quizId) : null;
  const week = [];
  const days = (profile && profile.activityDays) || {};
  for (let i = 6; i >= 0; i--) { const d = new Date(now.getTime() - i * DAY); week.push({ on: !!days[dateStr(d)], l: d.toLocaleDateString(loc(), { weekday: "short" }) }); }
  const todayOn = !!days[dateStr(now)], streak = currentStreak();
  const recos = [];
  if (weakQuiz) recos.push({ t: `أضعف نقطة عندك: "${weakQuiz.title || "كويز"}" (${Math.round(anPct(weak))}%) — أعده`, act: { label: "إعادة الكويز", hash: "#/student/quiz/" + weakQuiz.id } });
  const left = lessons.length - done.length;
  if (left > 0) recos.push({ t: `فاضلك ${left} ${left === 1 ? "درس" : "دروس"} متشافوش`, act: { label: "دروسي", hash: "#/student" } });
  if (!todayOn && streak > 0) recos.push({ t: `افتح درس أو حل كويز النهاردة عشان تكمل سلسلة ${streak + 1} أيام 🔥` });
  if (!all.length) recos.push({ t: "ابدأ بأول كويز عشان يظهر تحليل أدائك" });
  return { avg: avg === null ? null : Math.round(avg), delta: avg !== null && pavg !== null ? Math.round(avg - pavg) : null, done: done.length, total: lessons.length, teachers, line, subjects, week, streak, longest: longestStreak(profile), recos, attempts: cur.length };
}

