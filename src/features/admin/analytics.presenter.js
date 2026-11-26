/* Presenter تحليل الأدمن: بيحسب الأرقام من البيانات المتحقنة. صافي: من غير DOM ولا Firebase. */
import { subDateStr, subInfo } from "../../domain/subscription.js";

const tsDateOf = (ts) => (ts && ts.toDate ? ts.toDate() : null);

/** نص CSV (بـ BOM) مع حماية الخلايا اللي بتبدأ بحرف معادلة. */
export function adminAnalyticsCsv(rows) {
  return "\ufeff" + rows.map((r) => r.map((c) => { let s = String(c == null ? "" : c); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; }).join(",")).join("\r\n");
}

export function buildAdminAnalyticsModel({ opts, extra, now, cache: adminCache, kit: { anAvg, anPct } }) {
  now = now || new Date();
  const DAY = 86400000;
  const teachers = adminCache.teachers || [], students = adminCache.students || [];
  const approved = students.filter((s) => s.status === "approved");
  const dayKey = (d) => subDateStr(d);
  const activeOn = (key) => approved.filter((s) => s.activityDays && s.activityDays[key]).length;
  const last7 = new Set(Array.from({ length: 7 }, (_, i) => dayKey(new Date(now.getTime() - i * DAY))));
  const activeIds = new Set(approved.filter((s) => Object.keys(s.activityDays || {}).some((k) => last7.has(k))).map((s) => s.id));
  const from = new Date(now.getTime() - opts.days * DAY);
  const newRegs = students.filter((s) => { const d = tsDateOf(s.createdAt); return d && d >= from; });
  const weeks = Math.max(4, Math.min(12, Math.round(opts.days / 7)));
  const regWeeks = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const t1 = now.getTime() - i * 7 * DAY + DAY, t0 = t1 - 7 * DAY;
    regWeeks.push({ label: String(weeks - i), v: students.filter((s) => { const d = tsDateOf(s.createdAt); return d && d.getTime() >= t0 && d.getTime() < t1; }).length });
  }
  const nDays = Math.min(opts.days, 30);
  const daily = [];
  for (let i = nDays - 1; i >= 0; i--) { const d = new Date(now.getTime() - i * DAY); daily.push({ label: String(d.getDate()), v: activeOn(dayKey(d)) }); }
  const activeTeachers = teachers.filter((t) => t.active !== false);
  const perTeacher = activeTeachers.map((t) => {
    const mine = approved.filter((s) => (s.teacherIds || []).includes(t.id));
    const act = mine.filter((s) => activeIds.has(s.id)).length;
    const at = ((extra && extra.atts) || []).filter((a) => a.teacherId === t.id && a.total > 0);
    return { t, n: mine.length, act, avg: at.length ? Math.round(anAvg(at.map(anPct))) : null };
  }).sort((a, b) => b.n - a.n);
  const attention = [];
  const lastContent = {};
  ((extra && extra.lessons) || []).concat((extra && extra.quizzes) || []).forEach((x) => { const d = tsDateOf(x.createdAt); if (d && (!lastContent[x.teacherId] || d > lastContent[x.teacherId])) lastContent[x.teacherId] = d; });
  if (extra) activeTeachers.forEach((t) => {
    const d = lastContent[t.id];
    const age = d ? Math.floor((now - d) / DAY) : null;
    if (age === null) attention.push({ txt: `${t.name || "مدرس"} · مفيش محتوى جديد من أكتر من 90 يوم`, tag: "محتوى", o: true });
    else if (age >= 30) attention.push({ txt: `${t.name || "مدرس"} · مفيش محتوى جديد من ${age} يوم`, tag: "محتوى", o: true });
  });
  perTeacher.forEach((p) => { if (p.n >= 10 && p.act / p.n < 0.15) attention.push({ txt: `${p.t.name || "مدرس"} · نشاط طلابه ضعيف (${Math.round((p.act / p.n) * 100)}%)`, tag: "تفاعل" }); });
  let expiring = 0;
  teachers.forEach((t) => { const si = subInfo(t); if (si.status === "expiring") { expiring++; attention.push({ txt: `${t.name || "مدرس"} · اشتراك بينتهي بعد ${si.daysLeft} يوم`, tag: "اشتراك", o: true }); } else if (si.status === "expired") attention.push({ txt: `${t.name || "مدرس"} · الاشتراك منتهي`, tag: "اشتراك" }); });
  const late = students.filter((s) => { const d = tsDateOf(s.createdAt); return s.status === "pending" && d && now - d > 3 * DAY; }).length;
  if (late) attention.push({ txt: `${late} طلب تسجيل متأخر أكتر من 3 أيام`, tag: "طلبات", o: true });
  return { total: students.length, approved: approved.length, active7: activeIds.size, teachers: teachers.length, expiring, newRegs: newRegs.length, regWeeks, daily, perTeacher, attention, counts: (extra && extra.counts) || null };
}
