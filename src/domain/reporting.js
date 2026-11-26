/* طبقة الدومين (entities + business rules): دوال وثوابت صافية من غير DOM ولا Firebase ولا حالة عامة.
   الطبقة دي ماتستوردش أي حاجة من برّه domain/. */

export function statusText(st) {
  return st === "approved" ? "مقبول" : st === "rejected" ? "مرفوض" : "تحت المراجعة";
}

export function studentProgressAvg(st) {
  const p = st.progress || {};
  const vals = Object.keys(p).map((k) => p[k] && p[k].percent).filter((v) => typeof v === "number");
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

/* عدد المحاولات ومتوسط النسبة لعنصر (كويز أو امتحان) */
export function atcStats(attempts, id, isExam) {
  const at = attempts.filter((a) => isExam ? a.examId === id : a.quizId === id);
  const pcts = at.filter((a) => a.total > 0).map((a) => Math.round((a.score / a.total) * 100));
  const avg = pcts.length ? Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length) : null;
  return { count: at.length, avg };
}

export function aanExportRows(m) {
  const r = [["المؤشرات"], ["طلاب مقبولين", m.approved], ["إجمالي الطلاب", m.total], ["نشطين آخر 7 أيام", m.active7], ["المدرسين", m.teachers], ["تسجيلات جديدة", m.newRegs], [],
    ["مدرس", "عدد الطلاب", "نشطين آخر 7 أيام", "متوسط الدرجات %"]];
  m.perTeacher.forEach((p) => r.push([p.t.name || "", p.n, p.act, p.avg === null ? "" : p.avg]));
  r.push([], ["محتاج انتباه", "النوع"]); m.attention.forEach((a) => r.push([a.txt, a.tag]));
  return r;
}

// صفوف التصدير (CSV/Excel): أقسام الداشبورد
export function anExportRows(m) {
  const r = [];
  r.push(["المؤشرات"], ["طلاب نشطين آخر 7 أيام", m.activeNow + " من " + m.total], ["متوسط الدرجات", m.avg === null ? "" : m.avg + "%"], ["نسبة فتح الدروس", m.completion === null ? "" : m.completion + "%"], ["متوسط التقييم", m.rating === null ? "" : m.rating], []);
  r.push(["كويز/امتحان", "المتوسط %"]); m.bars.forEach((b) => r.push([b.title, b.avg])); r.push([]);
  r.push(["نطاق الدرجات", "عدد المحاولات"]); ["0-50", "50-70", "70-90", "90+"].forEach((l, i) => r.push([l, m.bands[i]])); r.push([]);
  r.push(["طلاب محتاجين متابعة", "الصف", "السبب"]); m.risk.forEach((x) => r.push([x.s.name || "", x.s.grade || "", x.tag])); r.push([]);
  r.push(["أصعب الأسئلة", "نسبة الصح %"]); m.hard.forEach((h) => r.push([h.item + " - س" + h.n + ": " + h.q, h.rate])); r.push([]);
  r.push(["أفضل الطلاب", "المتوسط %"]); m.top.forEach((t) => r.push([t.s.name || "", t.avg]));
  return r;
}

export function sLessonsCountText(n) {
  return n + " " + (n === 1 ? "درس" : n === 2 ? "درسين" : n <= 10 ? "دروس" : "درس");
}

// الدرس المجدول يظهر بشارة لكن مايتفتحش قبل معاده
export function sLessonOpen(l) {
  return !(l.publishAt && l.publishAt.toDate && l.publishAt.toDate() > new Date());
}

/* مفتاح ترتيب الامتحان في الأجندة: معاد الفتح لو لسه جاي، وإلا معاد القفل */
export function sUpcomingExamTs(e) {
  const now = new Date();
  if (e.openAt && e.openAt.toDate && e.openAt.toDate() > now) return e.openAt.seconds;
  return (e.closeAt && e.closeAt.seconds) || 0;
}
