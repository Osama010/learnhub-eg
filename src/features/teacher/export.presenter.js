/* Presenter تصدير الطلاب والدرجات (Excel/CSV). صافي. */
const STATUS = { approved: "مقبول", pending: "مستني الموافقة", suspended: "موقوف", rejected: "مرفوض" };
export const exportStudentsRows = (students) => [["الاسم", "الصف", "الحالة", "رقم الطالب", "رقم ولي الأمر", "الإيميل"]]
  .concat((students || []).map((s) => [s.name || "", s.grade || "", STATUS[s.status] || s.status || "", s.phone || "", s.parentPhone || "", s.email || ""]));

/** جدول الدرجات: صف لكل طالب، وعمود لكل كويز/امتحان (نسبة مئوية)، وآخر عمود المتوسط. اللي ماحلش = «—». */
export function exportGradesRows({ students, quizzes, exams, attempts }) {
  const items = [].concat((quizzes || []).map((q) => ({ kind: "كويز", id: q.id, title: q.title || "", isExam: false })), (exams || []).map((e) => ({ kind: "امتحان", id: e.id, title: e.title || "", isExam: true })));
  const byKey = new Map();
  (attempts || []).forEach((a) => { if (a.total > 0) byKey.set(a.studentId + "|" + (a.examId ? "x:" + a.examId : "q:" + a.quizId), Math.round((a.score / a.total) * 100)); });
  const head = ["الاسم", "الصف"].concat(items.map((it) => it.kind + ": " + it.title), ["المتوسط %"]);
  const rows = (students || []).map((s) => {
    const vals = items.map((it) => byKey.get(s.id + "|" + (it.isExam ? "x:" : "q:") + it.id));
    const got = vals.filter((v) => v != null);
    return [s.name || "", s.grade || ""].concat(vals.map((v) => (v == null ? "—" : v)), [got.length ? Math.round(got.reduce((x, y) => x + y, 0) / got.length) : "—"]);
  });
  return [head].concat(rows);
}
export const exportFileName = (kind, now, ext) => "المستر-" + kind + "-" + now.toISOString().slice(0, 10) + "." + ext;
