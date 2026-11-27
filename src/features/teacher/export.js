import { analyticsCsv } from "./analytics.presenter.js";
import { buildXlsx } from "../../domain/xlsx.js";
import { downloadBlob } from "../../shared/common.js";
import { showToast } from "../../shared/toast.js";
import { teacherCache, teacherLoad, teacherLoadLessons } from "./dashboard.js";
import { lessonsState } from "./lessons.js";
import { exportFileName, exportGradesRows, exportStudentsRows } from "./export.presenter.js";

/* ---------- تصدير الطلاب والدرجات (Excel حقيقي .xlsx + CSV). الكود ده بيتحمّل بس لما المدرس يفتح صفحة المتابعة، والملف بيتبني على جهازه ---------- */
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export function mountExportCard(anchorCard) {
  try {
    if (!anchorCard) return;
    const box = document.createElement("div");
    box.className = "card";
    box.innerHTML = '<h2 class="u-fs18px-mt0">📊 تصدير الطلاب والدرجات</h2><p class="muted u-fs125px-m006px">ملف Excel فيه صفحتين: بيانات الطلاب، وجدول الدرجات (نسبة كل طالب في كل كويز وامتحان والمتوسط). أو CSV لو عايز.</p><div class="btnrow"><button type="button" class="btn" id="ex-xlsx">تنزيل Excel (.xlsx)</button><button type="button" class="btn ghost" id="ex-csvg">تنزيل الدرجات CSV</button></div>';
    anchorCard.insertAdjacentElement("afterend", box);
    const data = async () => {
      await Promise.all([teacherLoad(), teacherLoadLessons()]);
      const s = lessonsState;
      return { students: teacherCache || [], quizzes: s.quizzes, exams: s.exams, attempts: s.attempts };
    };
    const run = (btn, fn) => async () => { btn.disabled = true; try { await fn(await data()); } catch (e) { showToast("مشكلة: " + (e.message || e)); } btn.disabled = false; };
    const x = box.querySelector("#ex-xlsx"), c = box.querySelector("#ex-csvg");
    x.onclick = run(x, (d) => {
      const bytes = buildXlsx([{ name: "الطلاب", rows: exportStudentsRows(d.students) }, { name: "الدرجات", rows: exportGradesRows(d) }]);
      downloadBlob(new Blob([bytes], { type: XLSX_MIME }), exportFileName("الطلاب-والدرجات", new Date(), "xlsx")); showToast("اتنزل ملف Excel ✅");
    });
    c.onclick = run(c, (d) => { downloadBlob(new Blob([analyticsCsv(exportGradesRows(d))], { type: "text/csv;charset=utf-8" }), exportFileName("الدرجات", new Date(), "csv")); showToast("اتنزل ملف الدرجات ✅"); });
  } catch (e) { console.warn("التصدير مش شغال", e); }
}
