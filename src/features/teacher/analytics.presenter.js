/* Presenter تحليلات المدرس: بيحسب أرقام الداشبورد من البيانات المتحقنة. صافي: من غير DOM ولا Firebase. */
import { termOf } from "../../domain/term.js";

/** نص CSV (بـ BOM) مع حماية الخلايا اللي بتبدأ بحرف معادلة. */
export function analyticsCsv(rows) {
  return "\ufeff" + rows.map((r) => r.map((c) => { let s = String(c == null ? "" : c); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; }).join(",")).join("\r\n");
}

// بيحسب كل أرقام الداشبورد من الداتا المحمّلة (من غير قراءات جديدة)
export function buildAnalyticsModel({ opts, acts, now, students: studentList, data: lessonsState, kit: { anAvg, anPct, anTs }, currentTerm }) {
  now = now || new Date();
  const DAY = 86400000;
  const term = opts.term || currentTerm;
  const students = (studentList || []).filter((s) => s.status === "approved" && (!opts.grade || s.grade === opts.grade));
  const ids = new Set(students.map((s) => s.id));
  const inTerm = (x) => termOf(x) === term;
  const quizzes = (lessonsState.quizzes || []).filter(inTerm), exams = (lessonsState.exams || []).filter(inTerm), lessons = (lessonsState.lessons || []).filter(inTerm);
  const quizIds = new Set(quizzes.map((q) => q.id)), examIds = new Set(exams.map((q) => q.id));
  const allAtt = (lessonsState.attempts || []).filter((a) => ids.has(a.studentId) && ((a.quizId && quizIds.has(a.quizId)) || (a.examId && examIds.has(a.examId))));
  const from = new Date(now.getTime() - opts.days * DAY), prevFrom = new Date(now.getTime() - 2 * opts.days * DAY);
  const inRange = (a, f, t) => { const d = anTs(a); return d && d >= f && d < t; };
  const att = allAtt.filter((a) => inRange(a, from, new Date(now.getTime() + DAY)));
  const prevAtt = allAtt.filter((a) => inRange(a, prevFrom, from));
  const avg = anAvg(att.map(anPct)), prevAvg = anAvg(prevAtt.map(anPct));
  // نشاط الطلاب: activityDays على وثيقة الطالب + تاريخ آخر محاولة
  const lastActive = {};
  students.forEach((s) => { const ds = Object.keys(s.activityDays || {}).sort(); if (ds.length) lastActive[s.id] = new Date(ds[ds.length - 1] + "T12:00:00"); });
  allAtt.forEach((a) => { const d = anTs(a); if (d && (!lastActive[a.studentId] || d > lastActive[a.studentId])) lastActive[a.studentId] = d; });
  const daysSince = (id) => (lastActive[id] ? Math.floor((now - lastActive[id]) / DAY) : null);
  const activeNow = students.filter((s) => daysSince(s.id) !== null && daysSince(s.id) < 7).length;
  // إنجاز الدروس (أول فتح من activityLog)
  const opened = new Set((acts || []).filter((a) => a.kind === "lesson").map((a) => a.studentId + "|" + a.refId));
  let possible = 0, done = 0; const perLesson = {};
  lessons.forEach((l) => {
    const elig = students.filter((s) => !l.grade || l.grade === s.grade);
    const dn = elig.filter((s) => opened.has(s.id + "|" + l.id)).length;
    possible += elig.length; done += dn;
    perLesson[l.id] = { l, elig: elig.length, done: dn };
  });
  const completion = possible ? Math.round((done / possible) * 100) : null;
  const rts = (lessonsState.ratings || []).filter((r) => ids.has(r.studentId) && lessons.some((l) => l.id === r.lessonId));
  const rating = anAvg(rts.map((r) => Number(r.stars) || 0));
  // اتجاه أسبوعي
  const weeks = Math.max(4, Math.min(12, Math.round(opts.days / 7)));
  const trend = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const t1 = new Date(now.getTime() - i * 7 * DAY + DAY), t0 = new Date(t1.getTime() - 7 * DAY);
    const v = anAvg(allAtt.filter((a) => inRange(a, t0, t1)).map(anPct));
    trend.push({ label: String(weeks - i), v: v === null ? null : Math.round(v) });
  }
  // كل كويز/امتحان
  const items = quizzes.map((q) => ({ id: q.id, title: q.title || "كويز", exam: false, qs: q.questions || [], grade: q.grade || "", at: createdTs(q) }))
    .concat(exams.map((q) => ({ id: q.id, title: q.title || "امتحان", exam: true, qs: q.questions || [], grade: q.grade || "", at: createdTs(q) })));
  function createdTs(q) { return q.createdAt && q.createdAt.toDate ? q.createdAt.toDate().getTime() : 0; }
  const perItem = items.map((it) => {
    const as = allAtt.filter((a) => (it.exam ? a.examId === it.id : a.quizId === it.id));
    return { ...it, attempts: as, avg: as.length ? Math.round(anAvg(as.map(anPct))) : null };
  });
  const bars = perItem.filter((x) => x.avg !== null).sort((a, b) => b.at - a.at).slice(0, 8);
  // توزيع الدرجات
  const bands = [0, 0, 0, 0];
  att.forEach((a) => { const p = anPct(a); bands[p < 50 ? 0 : p < 70 ? 1 : p < 90 ? 2 : 3]++; });
  // طلاب محتاجين متابعة
  const recentItems = perItem.slice().sort((a, b) => b.at - a.at);
  const risk = [];
  students.forEach((s) => {
    const mine = allAtt.filter((a) => a.studentId === s.id).sort((a, b) => (anTs(a) || 0) - (anTs(b) || 0));
    const ds = daysSince(s.id);
    if (ds === null) risk.push({ s, sev: 3, tag: "لسه ما بدأش", red: true });
    else if (ds >= 7) risk.push({ s, sev: 3 + Math.min(ds, 60) / 100, tag: "مفيش نشاط " + ds + " يوم", red: true });
    else {
      if (mine.length >= 3) {
        const last2 = anAvg(mine.slice(-2).map(anPct)), before = anAvg(mine.slice(0, -2).map(anPct));
        if (before - last2 >= 15) { risk.push({ s, sev: 2, tag: "درجاته نزلت " + Math.round(before - last2) + "%" }); return; }
      }
      const myItems = recentItems.filter((it) => !it.grade || it.grade === s.grade).slice(0, 2);
      if (myItems.length === 2 && myItems.every((it) => !it.attempts.some((a) => a.studentId === s.id))) risk.push({ s, sev: 1, tag: "ما حلش آخر كويزين" });
    }
  });
  risk.sort((a, b) => b.sev - a.sev);
  // أصعب الأسئلة
  const hard = [];
  perItem.forEach((it) => {
    if (it.attempts.length < 3) return;
    it.qs.forEach((q, i) => {
      const got = it.attempts.map((a) => a.answers && a.answers[i]).filter((x) => x);
      if (got.length < 3) return;
      const rate = Math.round((got.filter((x) => x.correct).length / got.length) * 100);
      hard.push({ item: it.title, n: i + 1, q: q.q || "", rate });
    });
  });
  hard.sort((a, b) => a.rate - b.rate);
  // أفضل 5
  const top = students.map((s) => { const m = allAtt.filter((a) => a.studentId === s.id); return { s, n: m.length, avg: m.length ? Math.round(anAvg(m.map(anPct))) : null }; })
    .filter((x) => x.avg !== null && x.n >= 2).sort((a, b) => b.avg - a.avg || b.n - a.n).slice(0, 5);
  // ملاحظات
  const notes = [];
  Object.values(perLesson).filter((x) => x.elig >= 5 && x.done / x.elig < 0.4).sort((a, b) => a.done / a.elig - b.done / b.elig).slice(0, 2)
    .forEach((x) => notes.push(`درس "${x.l.title || ""}" فتحه ${Math.round((x.done / x.elig) * 100)}% بس من الطلاب`));
  const low = bars.slice().sort((a, b) => a.avg - b.avg)[0];
  if (low && low.avg < 60) notes.push(`"${low.title}" أقل متوسط (${low.avg}%) — يستاهل إعادة شرح`);
  if (students.length >= 5 && students.length - activeNow >= students.length * 0.3) notes.push(`${students.length - activeNow} طالب من ${students.length} ملمسوش المنصة آخر 7 أيام`);
  return { total: students.length, activeNow, avg: avg === null ? null : Math.round(avg), delta: avg !== null && prevAvg !== null ? Math.round(avg - prevAvg) : null,
    completion, rating: rating === null ? null : Math.round(rating * 10) / 10, trend, bars, bands, risk, hard: hard.slice(0, 5), top, notes, attemptsCount: att.length, term };
}
