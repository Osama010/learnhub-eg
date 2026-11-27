/* مراجعة متباعدة وخطة ليلة الامتحان: دوال صافية. السؤال الغلط بيرجع بعد يومين، وبعدها بأسبوع، وبعدها بيخلص. */
export const SRS_FIRST_DAYS = 2, SRS_SECOND_DAYS = 7;
const DAY = 86400000;
const tsMs = (t) => (t && t.seconds ? t.seconds * 1000 : t && t.toMillis ? t.toMillis() : 0);

/** الأسئلة الغلط من آخر محاولة لكل كويز/امتحان. wrongAt = وقت المحاولة. */
export function srsItems({ attempts, quizzes, exams }) {
  const out = [];
  (attempts || []).forEach((att) => {
    const isExam = !!att.examId;
    const item = (isExam ? exams : quizzes || []).find((x) => x.id === (isExam ? att.examId : att.quizId));
    if (!item) return;
    const qs = (isExam ? item.quiz : item.questions) || [];
    (att.answers || []).forEach((a, i) => {
      if (a && a.correct === false && qs[i]) out.push({ key: (isExam ? "x" : "q") + item.id + ":" + i, itemId: item.id, isExam, idx: i, q: qs[i], title: item.title || "", lessonId: (!isExam && item.lessonId) || null, wrongAt: tsMs(att.updatedAt) || tsMs(att.createdAt) || 0 });
    });
  });
  return out;
}
/** state = {key: {wrongAt, step, due}}. step 0: لسه ما راجعش، 1: راجع مرة، 2: خلّص. */
export function srsSchedule(items, state, nowMs) {
  const st = state || {};
  return (items || []).map((it) => {
    const s = st[it.key];
    const cur = s && s.wrongAt === it.wrongAt ? s : { wrongAt: it.wrongAt, step: 0, due: it.wrongAt + SRS_FIRST_DAYS * DAY };
    return { ...it, step: cur.step, due: cur.due, isDue: cur.step < 2 && cur.due <= nowMs };
  }).filter((x) => x.step < 2).sort((a, b) => a.due - b.due);
}
export const dueItems = (sched) => sched.filter((x) => x.isDue);
/** بعد ما الطالب يقيّم نفسه. knew=true: يتقدم خطوة. false: يرجع يومين من دلوقتي. */
export function srsAnswer(state, item, knew, nowMs) {
  const next = { ...(state || {}) };
  const cur = next[item.key] && next[item.key].wrongAt === item.wrongAt ? next[item.key] : { wrongAt: item.wrongAt, step: 0 };
  next[item.key] = knew ? (cur.step >= 1 ? { wrongAt: item.wrongAt, step: 2, due: 0, at: nowMs } : { wrongAt: item.wrongAt, step: 1, due: nowMs + SRS_SECOND_DAYS * DAY, at: nowMs }) : { wrongAt: item.wrongAt, step: 0, due: nowMs + SRS_FIRST_DAYS * DAY, at: nowMs };
  return next;
}
/** بيشيل من الحالة أي سؤال مبقاش غلط (الطالب حلّه صح في محاولة جديدة). */
export function srsPrune(state, items) {
  const keys = new Set((items || []).map((i) => i.key)), out = {};
  Object.keys(state || {}).forEach((k) => { if (keys.has(k)) out[k] = state[k]; });
  return out;
}

/** خطة ليلة الامتحان في وقت محدد: بلوكات بالدقايق، من الأضعف. weak = weakAreas(...). */
export function examNightPlan({ budgetMin, items, weak, quizzes, attempts, lessons, teacherId }) {
  const budget = Math.max(15, Math.min(480, Math.floor(Number(budgetMin) || 0)));
  const mine = (x) => !teacherId || x.teacherId === teacherId;
  const its = (items || []).filter((i) => { const q = i.isExam ? null : (quizzes || []).find((z) => z.id === i.itemId); return !teacherId || (q ? mine(q) : true); });
  const blocks = [];
  let left = budget;
  const add = (b) => { const m = Math.min(left, b.minutes); if (m >= 3) { blocks.push({ ...b, minutes: m }); left -= m; } };
  // 1) أضعف المواضيع: راجع الدرس (10 دقايق لكل موضوع، أقصى 40% من الوقت)
  const weakList = (weak || []).filter((w) => w.level === "weak" && w.lessonId && (lessons || []).some((l) => l.id === w.lessonId && (!teacherId || l.teacherId === teacherId)));
  let lessonBudget = Math.floor(budget * 0.4);
  for (const w of weakList) { const m = Math.min(10, lessonBudget); if (m < 5) break; lessonBudget -= m; add({ kind: "lesson", title: w.label, minutes: m, why: "نقطة ضعف (" + w.pct + "%)", href: "#/student/lesson/" + w.lessonId }); }
  // 2) أسئلتك الغلط: بطاقات، دقيقة لكل سؤال، أقصى 35% من الوقت
  const cards = Math.min(its.length, Math.floor(budget * 0.35), 40);
  if (cards >= 3) add({ kind: "flash", title: cards + " سؤال من غلطاتك", minutes: cards, why: "راجع الإجابة الصحيحة بسرعة", href: "#/student/review/all" });
  // 3) كويزات ما عدّتهاش: وقت الحل تقريبًا نص دقيقة لكل سؤال
  const failed = (quizzes || []).filter((q) => mine(q)).map((q) => ({ q, a: (attempts || []).filter((a) => a.quizId === q.id) })).filter((x) => x.a.length && !x.a.some((a) => a.total > 0 && a.score / a.total >= 0.5));
  for (const f of failed) add({ kind: "quiz", title: f.q.title || "كويز", minutes: Math.max(5, Math.ceil(((f.q.questions || []).length || 10) / 2)), why: "لسه ما عدّتهوش", href: "#/student/quiz/" + f.q.id });
  // 4) لو فاضل وقت: سؤال بعد سؤال من الغلطات الباقية
  if (left >= 5 && its.length > cards) add({ kind: "flash", title: "كمّل بقية غلطاتك", minutes: left, why: "استغل باقي الوقت", href: "#/student/review/all" });
  let at = 0;
  return { budget, usedMin: budget - left, blocks: blocks.map((b) => { const r = { ...b, from: at, to: at + b.minutes }; at += b.minutes; return r; }) };
}
