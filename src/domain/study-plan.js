/* خطة المذاكرة اليومية والسلسلة اليومية: دوال صافية. */
const pad = (n) => String(n).padStart(2, "0");
export const dayStr = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

/** السلسلة الحالية وأطول سلسلة. days = {"2026-11-27": true}. لو النهارده لسه مفيش نشاط بنعد من إمبارح. */
export function streakInfo(days, now) {
  const set = days || {};
  const t = new Date(now); t.setHours(0, 0, 0, 0);
  const activeToday = !!set[dayStr(t)];
  const c = new Date(t); if (!activeToday) c.setDate(c.getDate() - 1);
  let current = 0;
  while (set[dayStr(c)]) { current++; c.setDate(c.getDate() - 1); }
  const keys = Object.keys(set).filter((k) => set[k] && /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
  let best = 0, run = 0, prev = null;
  keys.forEach((k) => {
    const d = new Date(k + "T00:00:00");
    run = prev && Math.round((d - prev) / 86400000) === 1 ? run + 1 : 1;
    prev = d; if (run > best) best = run;
  });
  return { current, best: Math.max(best, current), activeToday };
}

const ts = (x) => (x && x.createdAt && x.createdAt.seconds) || 0;
const passed = (a) => a && a.total > 0 && a.score / a.total >= 0.5;

/** خطة النهاردة: لحد 4 مهام مرتبة. kind: lesson | quiz | review | retry. href هاش داخل المنصة. */
export function studyPlan({ lessons, quizzes, attempts, watchedIds, weak, lessonOpen, visible }) {
  const vis = (x) => (!visible || visible(x));
  const ls = (lessons || []).filter((l) => vis(l) && (!lessonOpen || lessonOpen(l))).slice().sort((a, b) => ts(a) - ts(b));
  const qs = (quizzes || []).filter(vis);
  const att = (q) => (attempts || []).filter((a) => a && a.quizId === q.id && !a.examId);
  const tasks = [];
  const nextLesson = ls.find((l) => !(watchedIds && watchedIds.has(l.id)));
  if (nextLesson) tasks.push({ kind: "lesson", title: nextLesson.title || "درس", why: "الدرس الجاي في الترتيب", href: "#/student/lesson/" + nextLesson.id, id: nextLesson.id });
  const retry = qs.map((q) => ({ q, a: att(q) })).filter((x) => x.a.length && !x.a.some(passed))[0];
  if (retry) tasks.push({ kind: "retry", title: retry.q.title || "كويز", why: "لسه ما عدّتهوش (محتاج 50% أو أكتر)", href: "#/student/quiz/" + retry.q.id, id: retry.q.id });
  const watchedLessonIds = new Set(ls.filter((l) => watchedIds && watchedIds.has(l.id)).map((l) => l.id));
  const fresh = qs.filter((q) => !att(q).length && (!q.lessonId || watchedLessonIds.has(q.lessonId)))[0];
  if (fresh) tasks.push({ kind: "quiz", title: fresh.title || "كويز", why: "كويز لسه ما حليتوش", href: "#/student/quiz/" + fresh.id, id: fresh.id });
  const w = (weak || []).find((x) => x.level === "weak" && x.lessonId && ls.some((l) => l.id === x.lessonId) && !tasks.some((t) => t.id === x.lessonId));
  if (w) tasks.push({ kind: "review", title: w.label, why: "نقطة ضعف (" + w.pct + "%)، راجعها", href: "#/student/lesson/" + w.lessonId, id: w.lessonId });
  return tasks.slice(0, 4);
}
