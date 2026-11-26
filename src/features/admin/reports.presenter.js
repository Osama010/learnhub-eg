/* Presenter تقارير الأدمن: بيبني نموذج التقرير من البيانات المتحقنة. صافي: من غير DOM ولا Firebase. */
import { fmtTs, tsToDate } from "../../domain/format.js";
import { SUB_TYPES, subDateStr, subFmtDate, subInfo } from "../../domain/subscription.js";
import { statusText, studentProgressAvg } from "../../domain/reporting.js";

/** نص CSV (بـ BOM) من نموذج التقرير. */
export function adminReportCsv(rep) {
  const lines = [rep.columns].concat(rep.rows).map((r) => r.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(","));
  return "\ufeff" + lines.join("\r\n");
}

// بترجع { title, columns, rows, filtersDesc }
export function buildAdminReport({ cache: adminCache, state: reportState, teacherStagesText }) {
  const teachers = adminCache.teachers || [];
  const students = adminCache.students || [];
  const subjects = adminCache.subjects || [];
  const tName = (id) => (teachers.find((t) => t.id === id) || {}).name || "—";
  const desc = [];

  if (reportState.type === "teachers") {
    let list = teachers.slice();
    if (reportState.subject) { list = list.filter((t) => (t.subject || "").trim() === reportState.subject); desc.push("المادة: " + reportState.subject); }
    if (reportState.status) { list = list.filter((t) => reportState.status === "active" ? t.active !== false : t.active === false); desc.push("الحالة: " + (reportState.status === "active" ? "نشط" : "معطّل")); }
    if (reportState.sub) {
      const subTxt = { free: "مجاني", active: "نشط", expiring: "قرب ينتهي", expired: "منتهي" };
      list = list.filter((t) => subInfo(t).status === reportState.sub);
      desc.push("الاشتراك: " + (subTxt[reportState.sub] || reportState.sub));
    }
    if (reportState.q) { list = list.filter((t) => (t.name || "").includes(reportState.q) || (t.email || "").includes(reportState.q)); desc.push("بحث: " + reportState.q); }
    const rows = list.map((t) => {
      const mine = students.filter((s) => (s.teacherIds || []).includes(t.id)).length;
      const si = subInfo(t);
      const subTxt = si.status === "free" ? "مجاني" : si.status === "expired" ? "منتهي" : si.status === "expiring" ? "قرب ينتهي" : "نشط";
      return [t.name || "", t.subject || "—", (t.stages || []).join("، ") || "—", teacherStagesText(t), t.email || "", t.phone || "", String(mine), t.active === false ? "معطّل" : "نشط", si.label, si.type === "free" ? "—" : String(si.amount || 0), si.end ? subFmtDate(si.end) : "—", subTxt, fmtTs(t.createdAt)];
    });
    return { title: "تقرير المدرسين", columns: ["الاسم", "المادة", "المراحل", "طلاب كل مرحلة", "الإيميل", "الواتساب", "عدد الطلاب", "الحالة", "الاشتراك", "مبلغ الاشتراك", "نهاية الاشتراك", "حالة الاشتراك", "تاريخ الإضافة"], rows, filtersDesc: desc };
  }

  // تقرير المدفوعات: كل دفعات اشتراكات المدرسين مع فلترة بالشهر والمدرس وإجمالي في الآخر
  if (reportState.type === "payments") {
    let list = (adminCache.payments || []).slice();
    if (reportState.teacher) { list = list.filter((p) => p.teacherId === reportState.teacher); desc.push("المدرس: " + tName(reportState.teacher)); }
    if (reportState.month) {
      list = list.filter((p) => { const d = tsToDate(p.paidAt); return d && subDateStr(d).slice(0, 7) === reportState.month; });
      desc.push("الشهر: " + reportState.month);
    }
    if (reportState.q) { list = list.filter((p) => (p.teacherName || "").includes(reportState.q) || (p.note || "").includes(reportState.q)); desc.push("بحث: " + reportState.q); }
    const total = list.reduce((a, p) => a + (Number(p.amount) || 0), 0);
    const rows = list.map((p) => [fmtTs(p.paidAt), p.teacherName || "—", SUB_TYPES[p.subType] || p.subType || "—", (p.from ? subFmtDate(tsToDate(p.from)) : "—") + " ← " + (p.to ? subFmtDate(tsToDate(p.to)) : "—"), String(p.amount || 0) + " ج", p.note || "—", p.recordedBy || "—"]);
    if (rows.length) rows.push(["الإجمالي", "", "", "", String(total) + " ج", "", ""]);
    return { title: "تقرير المدفوعات", columns: ["التاريخ", "المدرس", "النوع", "الفترة", "المبلغ", "ملاحظة", "سجلها"], rows, filtersDesc: desc };
  }

  if (reportState.type === "subjects") {
    let list = subjects.slice();
    if (reportState.stage) { list = list.filter((s) => s.stage === reportState.stage); desc.push("المرحلة: " + reportState.stage); }
    if (reportState.kind) { list = list.filter((s) => reportState.kind === "core" ? s.core : !s.core); desc.push("النوع: " + (reportState.kind === "core" ? "أساسية" : "إضافية")); }
    if (reportState.q) { list = list.filter((s) => (s.name || "").includes(reportState.q)); desc.push("بحث: " + reportState.q); }
    const rows = list.map((s) => {
      const ts = teachers.filter((t) => (t.subject || "").trim() === s.name.trim());
      const tids = ts.map((t) => t.id);
      const ss = students.filter((st) => (st.teacherIds || []).some((id) => tids.includes(id)));
      let sum = 0, n = 0;
      ss.forEach((st) => { const a = studentProgressAvg(st); if (a !== null) { sum += a; n++; } });
      return [s.name || "", "ال" + (s.stage || "") + "ة", s.core ? "أساسية" : "إضافية", String(ts.length), String(ss.length), n ? Math.round(sum / n) + "%" : "—"];
    });
    return { title: "تقرير المواد", columns: ["المادة", "المرحلة", "النوع", "عدد المدرسين", "عدد الطلاب", "متوسط التقدم"], rows, filtersDesc: desc };
  }

  // الطلاب (الافتراضي)
  let list = students.slice();
  if (reportState.teacher) { list = list.filter((s) => (s.teacherIds || []).includes(reportState.teacher)); desc.push("المدرس: " + tName(reportState.teacher)); }
  if (reportState.status) { list = list.filter((s) => s.status === reportState.status); desc.push("الحالة: " + statusText(reportState.status)); }
  if (reportState.grade) { list = list.filter((s) => s.grade === reportState.grade); desc.push("السنة: " + reportState.grade); }
  if (reportState.q) { list = list.filter((s) => (s.name || "").includes(reportState.q) || (s.email || "").includes(reportState.q)); desc.push("بحث: " + reportState.q); }
  if (reportState.from) { const d = new Date(reportState.from + "T00:00:00"); list = list.filter((s) => { const c = tsToDate(s.createdAt); return c && c >= d; }); desc.push("من: " + reportState.from); }
  if (reportState.to) { const d = new Date(reportState.to + "T23:59:59"); list = list.filter((s) => { const c = tsToDate(s.createdAt); return c && c <= d; }); desc.push("إلى: " + reportState.to); }
  const rows = list.map((s) => {
    const tnames = (s.teacherIds || []).map(tName).join("، ");
    const avg = studentProgressAvg(s);
    return [s.name || "", s.email || "", s.phone || "", s.parentPhone || "غير مسجل", s.grade || "—", tnames || "—", statusText(s.status), avg !== null ? avg + "%" : "—", fmtTs(s.createdAt)];
  });
  return { title: "تقرير الطلاب", columns: ["الاسم", "الإيميل", "الموبايل", "ولي الأمر", "السنة الدراسية", "المدرسين", "الحالة", "التقدم", "تاريخ التسجيل"], rows, filtersDesc: desc };
}
