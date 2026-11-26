import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { adminCache, adminLayout, adminLoad, adminLogAction } from "./shell.js";
import { teacherStagesText } from "./subjects.js";
import { adminShowStudent } from "./teachers.js";
import { downloadBlob, statusChip } from "../landing/landing.js";
import { openConfirmOverlay } from "../../shared/terms.js";
import { bailIfSignedOut, showToast } from "../../shared/toast.js";
import { confirmDeleteStudent, renderTransferPage, waLink } from "../../shared/transfer.js";
import { listByTeacher, getLessonMedia } from "../../main/data.js";
import { GRADES } from "../../domain/student.js";
import { fmtTs } from "../../domain/format.js";
import { lessonHasPdf, lessonHasVideo } from "../../domain/media.js";
import { atcStats } from "../../domain/reporting.js";
import { useCases } from "../../main/compose.js";
import { filterAdminStudents, lessonRatingStats, lessonsByUnit, teacherContentCsv, teacherContentJson, validateStudentEdit } from "./teacher-content.presenter.js";

/* ---------- صفحة محتوى مدرس (قراءة فقط للأدمن) ----------
   الأدمن يشوف دروس وكويزات وامتحانات وإعلانات أي مدرس مع محاولات ومتوسطات طلابه،
   ويحمّل نسخة من المحتوى (CSV / JSON / طباعة) — مفيش أي تعديل من الصفحة دي. */
async function adminTeacherContentData(tid) {
  const byT = (col) => listByTeacher(col, tid);
  const [lessons, quizzes, exams, ann, attempts, ratings] = await Promise.all([
    byT("lessons"), byT("quizzes"), byT("exams"), byT("announcements"), byT("quizAttempts"), byT("lessonRatings"),
  ]);
  // الروابط الأصلية متخزنة في lessonMedia — الأدمن بيشوفها ويدخلها في التصدير
  await Promise.all(lessons.filter((l) => l.hasVideo || l.hasPdf).map(async (l) => {
    try {
      const m = await getLessonMedia(l.id);
      if (m) { const d = m; l.videoUrl = d.videoUrl || l.videoUrl || ""; l.pdfUrl = d.pdfUrl || (d.pdfFile ? "(ملف مرفوع: " + (d.pdfFile.name || "PDF") + ")" : l.pdfUrl || ""); }
    } catch (_) {}
  }));
  return { lessons, quizzes, exams, ann, attempts, ratings };
}


export async function renderAdminTeacherContent(tid) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const t = (adminCache.teachers || []).find((x) => x.id === tid);
  if (!t) { location.hash = "#/admin/teachers"; return; }
  app.innerHTML = T("admin.renderAdminTeacherContent");
  let data;
  try { data = await adminTeacherContentData(tid); }
  catch (e) { app.innerHTML = T("admin.renderAdminTeacherContent_2", { e, esc }); return; }
  const { lessons, quizzes, exams, ann, attempts, ratings } = data;
  const mine = (adminCache.students || []).filter((s) => (s.teacherIds || []).includes(tid)).length;
  const sortedLessons = lessonsByUnit(lessons);
  const lessonStats = (l) => lessonRatingStats(ratings, l);
  const content = T("admin.renderAdminTeacherContent_3", { ann, atcStats, attempts, esc, exams, fmtTs, lessonHasPdf, lessonHasVideo, lessonStats, mine, quizzes, sortedLessons, t, teacherStagesText });
  adminLayout(content, "teachers");
  document.getElementById("atc-back").onclick = () => { location.hash = "#/admin/teachers"; };
  document.getElementById("atc-dl").onclick = () => adminTeacherDownloadModal(t, data, mine);
}

/* مودال تحميل محتوى مدرس: 3 صيغ. الفيديوهات على يوتيوب والـ PDF على جوجل درايف،
   فالتحميل بيشمل الروابط والبيانات والأسئلة ونتائج الطلاب — مش الملفات نفسها */
function adminTeacherDownloadModal(t, data, studentCount) {
  const ov = openConfirmOverlay(T("admin.adminTeacherDownloadModal", { esc, t }));
  ov.querySelector("#dl-no").onclick = () => ov.remove();
  ov.querySelector("#dl-csv").onclick = () => { adminTeacherCsv(t, data); ov.remove(); showToast("اتحمّل ملف Excel (CSV) ✅", "good"); };
  ov.querySelector("#dl-json").onclick = () => { adminTeacherJson(t, data); ov.remove(); showToast("اتحمّلت النسخة الاحتياطية (JSON) ✅", "good"); };
  ov.querySelector("#dl-print").onclick = () => { adminTeacherPrint(t, data, studentCount); ov.remove(); };
}

function adminTeacherStamp() { return new Date().toISOString().slice(0, 10); }

/* CSV بأقسام: دروس / كويزات / امتحانات / إعلانات / نتائج الطلاب — مع BOM عشان العربي يظهر صح في Excel */
function adminTeacherCsv(t, data) {
  const blob = new Blob([teacherContentCsv(t, data, adminTeacherStamp())], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `محتوى-${t.name || "مدرس"}-${adminTeacherStamp()}.csv`);
}

/* نسخة JSON كاملة: بيانات المدرس + المحتوى بالأسئلة + نتائج الطلاب والتقييمات.
   من غير بيانات تواصل (إيميل/تليفون) أو مفاتيح داخلية للطلاب — اسم المدرس والطالب ودرجاته بس */
function adminTeacherJson(t, data) {
  const blob = new Blob([teacherContentJson(t, data, new Date().toISOString())], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, `نسخة-احتياطية-${t.name || "مدرس"}-${adminTeacherStamp()}.json`);
}

/* صفحة طباعة منسقة لمحتوى المدرس — تتطبع أو تتحفظ PDF من المتصفح */
function adminTeacherPrint(t, data, studentCount) {
  const { lessons, quizzes, exams, ann, attempts } = data;
  const w = window.open("", "_blank");
  if (!w) { alert("المتصفح مانع النافذة المنبثقة. اسمح بيها وجرّب تاني."); return; }
  const escP = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tbl = (cols, rows) => T("admin.tbl", { cols, escP, rows });
  w.document.write(T("admin.adminTeacherPrint", { ann, atcStats, attempts, escP, exams, fmtTs, lessons, quizzes, studentCount, t, tbl }));
  w.document.close();
}

let adminFilter = { teacher: "", status: "", q: "" };

export function adminStudents() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const teachers = adminCache.teachers || [];
  const all = adminCache.students || [];
  const students = filterAdminStudents(all, adminFilter);
  const content = T("admin.adminStudents", { adminFilter, all, esc, statusChip, students, teachers, waLink });
  adminLayout(content, "students");
  document.getElementById("st-transfer").onclick = () => { location.hash = "#/admin/transfer"; };
  document.getElementById("af-t").onchange = (e) => { adminFilter.teacher = e.target.value; adminStudents(); };
  document.getElementById("af-s").onchange = (e) => { adminFilter.status = e.target.value; adminStudents(); };
  document.getElementById("af-q").oninput = (e) => { adminFilter.q = e.target.value.trim(); adminStudents(); };
  document.querySelectorAll("[data-sv]").forEach((b) => b.onclick = () => adminShowStudent(b.dataset.sv));
  document.querySelectorAll("[data-se]").forEach((b) => b.onclick = () => adminEditStudent(b.dataset.se));
  document.querySelectorAll("[data-rv-s]").forEach((tr) => tr.onclick = (e) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    adminShowStudent(tr.dataset.rvS);
  });
  document.querySelectorAll("[data-ap]").forEach((b) => b.onclick = () => adminApprove(b.dataset.ap));
  document.querySelectorAll("[data-ss]").forEach((b) => b.onclick = () => adminSetSuspended(b.dataset.ss, true));
  document.querySelectorAll("[data-us]").forEach((b) => b.onclick = () => adminSetSuspended(b.dataset.us, false));
  document.querySelectorAll("[data-sd]").forEach((b) => b.onclick = () => adminDeleteStudent(b.dataset.sd));
}

/* إيقاف/إلغاء إيقاف طالب من المنصة كلها (الأدمن بس) */
async function adminSetSuspended(id, suspend) {
  const s = (adminCache.students || []).find((x) => x.id === id);
  if (!s) return;
  try {
    await useCases.changeStudentStatus(s, suspend ? "suspended" : "approved");
    showToast(suspend ? `اتوقف ${s.name} من المنصة.` : `رجع ${s.name} للمنصة ✅`, "good");
    await adminLoad();
    adminStudents();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

function adminEditStudent(id) {
  const s = (adminCache.students || []).find((x) => x.id === id);
  if (!s) return;
  const linked = !!s.authLinked;
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = T("admin.adminEditStudent", { GRADES, esc, linked, s });
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  ov.querySelector("#es-cancel").onclick = () => ov.remove();
  ov.querySelector("#es-save").onclick = async () => {
    const m = ov.querySelector("#es-msg");
    m.textContent = "";
    const v = validateStudentEdit({ name: ov.querySelector("#es-name").value, email: ov.querySelector("#es-email").value, grade: ov.querySelector("#es-grade").value, phone: ov.querySelector("#es-phone").value, parentPhone: ov.querySelector("#es-parent-phone").value }, linked);
    if (v.error) return m.textContent = v.error, m.className = "msg bad";
    try {
      await useCases.editStudent(id, s, v.values, linked);
      ov.remove();
      await adminLoad();
      adminStudents();
    } catch (e) {
      m.textContent = "مشكلة: " + (e.message || e);
      m.className = "msg bad";
    }
  };
}

async function adminApprove(id) {
  try {
    const s = (adminCache.students || []).find((x) => x.id === id);
    adminLogAction("قبول طالب", "student", id, (s && s.name) || "", "");
    await useCases.changeStudentStatus(s || { id }, "approved");
    await adminLoad();
    adminStudents();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

/* حذف نهائي: مودال تأكيد بيوضح إن المحاولات والتقييمات والبيانات كلها هتتمسح */
function adminDeleteStudent(id) {
  const s = (adminCache.students || []).find((x) => x.id === id);
  if (!s) return;
  confirmDeleteStudent(s, async () => {
    adminLogAction("حذف طالب نهائيًا", "student", s.id, s.name || "", s.grade || "");
    await adminLoad();
    adminStudents();
  });
}

/* صفحة النقل الجماعي للأدمن — أي طلبة */
export function adminTransferPage() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  renderTransferPage({
    students: adminCache.students || [],
    teachers: adminCache.teachers || [],
    wrap: (content) => adminLayout(content, "students"),
    backHash: "#/admin/students",
    onTransfer: (n, from, to) => adminLogAction("نقل جماعي", "students", "", `${n} طالب`, `من «${from}» إلى «${to}»`),
    onDone: async () => { await adminLoad(); adminTransferPage(); },
  });
}