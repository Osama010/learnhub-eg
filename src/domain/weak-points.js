/* تحليل نقاط الضعف من نتايج الكويزات والامتحانات (دوال صافية). بيعتمد على إن كل محاولة بتخزّن answers[i].correct. */
export const WEAK_BELOW = 50, MID_BELOW = 75;
export const levelOf = (pct) => (pct < WEAK_BELOW ? "weak" : pct < MID_BELOW ? "mid" : "strong");
const pctOf = (c, t) => (t > 0 ? Math.round((c / t) * 100) : 0);

function itemOf(att, quizzes, exams) {
  return att.examId ? (exams || []).find((e) => e.id === att.examId) : (quizzes || []).find((q) => q.id === att.quizId);
}
const questionsOf = (item, isExam) => (isExam ? item.quiz : item.questions) || [];

/** مواضيع الطالب مرتبة من الأضعف: لو الكويز مربوط بدرس بيتجمّع باسم الدرس، وغير كده باسم الكويز/الامتحان. */
export function weakAreas({ attempts, quizzes, exams, lessons }) {
  const map = new Map();
  for (const att of (attempts || [])) {
    const item = itemOf(att, quizzes, exams);
    if (!item || !Array.isArray(att.answers) || !att.answers.length) continue;
    const isExam = !!att.examId;
    const lesson = !isExam && item.lessonId ? (lessons || []).find((l) => l.id === item.lessonId) : null;
    const key = lesson ? "l:" + lesson.id : (isExam ? "x:" : "q:") + item.id;
    const g = map.get(key) || { key, label: lesson ? (lesson.title || "درس") : (item.title || (isExam ? "امتحان" : "كويز")), lessonId: lesson ? lesson.id : null, itemId: item.id, isExam, correct: 0, total: 0, attempts: 0 };
    att.answers.forEach((a) => { if (a && typeof a.correct === "boolean") { g.total++; if (a.correct) g.correct++; } });
    g.attempts++;
    map.set(key, g);
  }
  return [...map.values()].filter((g) => g.total > 0).map((g) => ({ ...g, pct: pctOf(g.correct, g.total), level: levelOf(pctOf(g.correct, g.total)) })).sort((a, b) => a.pct - b.pct || b.total - a.total);
}

/** أضعف أسئلة عند الفصل كله: نسبة الصح لكل سؤال، بشرط عدد إجابات أدنى عشان الرقم يبقى له معنى. */
export function weakQuestions({ attempts, quizzes, exams, minAnswers = 3, limit = 10 }) {
  const map = new Map();
  for (const att of (attempts || [])) {
    const item = itemOf(att, quizzes, exams);
    if (!item || !Array.isArray(att.answers)) continue;
    const isExam = !!att.examId, qs = questionsOf(item, isExam);
    att.answers.forEach((a, i) => {
      if (!a || typeof a.correct !== "boolean" || !qs[i]) return;
      const key = item.id + ":" + i;
      const g = map.get(key) || { key, itemId: item.id, itemTitle: item.title || "", isExam, idx: i, q: qs[i].q || "", lessonId: (!isExam && item.lessonId) || null, correct: 0, total: 0 };
      g.total++; if (a.correct) g.correct++;
      map.set(key, g);
    });
  }
  return [...map.values()].filter((g) => g.total >= minAnswers).map((g) => ({ ...g, pct: pctOf(g.correct, g.total) })).sort((a, b) => a.pct - b.pct || b.total - a.total).slice(0, limit);
}

/** أضعف دروس/اختبارات عند الفصل (متوسط نسبة الصح عبر كل الطلاب). */
export function weakAreasOfClass({ attempts, quizzes, exams, lessons, limit = 8 }) {
  return weakAreas({ attempts, quizzes, exams, lessons }).slice(0, limit);
}
