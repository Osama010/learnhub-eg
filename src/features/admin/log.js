
import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { adminCache, adminLayout, adminLoad, adminLogAction } from "./shell.js";
import { teacherStagesText } from "./subjects.js";
import { STAGES } from "./subjects.presenter.js";
import { adminShowStudent, adminShowTeacher, editingTeacherId, set_editingTeacherId } from "./teachers.js";
import { statusChip } from "../../shared/common.js";
import { subChip } from "../../shared/subscriptions.js";
import { appSettings, termCurrent } from "../../shared/terms.js";
import { bailIfSignedOut, showToast } from "../../shared/toast.js";
import { gradesOfStage, stageOfGrade } from "../../domain/student.js";
import { fmtTs, tsToDate } from "../../domain/format.js";
import { activeBroadcastText, subFmtDate, subInfo } from "../../domain/subscription.js";
import { termName } from "../../domain/term.js";
import { useCases } from "../../main/compose.js";
import { broadcastUntil, filterAdminLog, studentStatusCounts, validateBroadcastText } from "./log.presenter.js";
import { adminBackupCardHtml, bindAdminBackup } from "./backup.js";

/* ---------- تاب السجل ----------
   كل حركات الأدمن الحساسة (إضافة/إيقاف/حذف/نقل/دفعات/إعلانات) مرتبة بالأحدث.
   السجل قراءة فقط من اللوحة — مفيش تعديل أو مسح، والقواعد بتمنعهم من أساسه. */
let logFilter = { action: "", from: "", to: "" };
export function adminLogPage() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const ACTIONS = ["إضافة مدرس", "تعديل مدرس", "إيقاف مدرس مؤقتًا", "إلغاء إيقاف مدرس", "حذف مدرس نهائيًا", "قبول طالب", "حذف طالب نهائيًا", "نقل جماعي", "تغيير الترم", "إضافة مادة", "حذف مادة", "تسجيل دفعة", "نشر إعلان", "إيقاف إعلان"];
  const list = filterAdminLog(adminCache.log, logFilter);
  const content = T("admin.adminLogPage", { ACTIONS, esc, fmtTs, list, logFilter });
  adminLayout(content + adminBackupCardHtml(), "log");
  bindAdminBackup();
  const lf = (id, key) => { const el = document.getElementById(id); if (el) el.onchange = (e) => { logFilter[key] = e.target.value; adminLogPage(); }; };
  lf("lf-action", "action"); lf("lf-from", "from"); lf("lf-to", "to");
}

export function adminStats() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const teachers = adminCache.teachers || [];
  const students = adminCache.students || [];
  const { approved, pending } = studentStatusCounts(students);
  const content = T("admin.adminStats", { STAGES, activeBroadcastText, adminCache, approved, esc, gradesOfStage, pending, stageOfGrade, statusChip, students, subChip, subFmtDate, subInfo, teacherStagesText, teachers, termCurrent, termName, tsToDate });
  adminLayout(content, "stats");
  // تجديد سريع: يفتح فورم المدرس في تاب المدرسين
  document.querySelectorAll("[data-subren]").forEach((b) => b.onclick = () => { set_editingTeacherId(b.dataset.subren); location.hash = "#/admin/teachers"; });
  document.getElementById("term-save").onclick = async () => {
    const v = Number((document.querySelector('input[name="cur-term"]:checked') || {}).value || 1);
    const m = document.getElementById("term-msg");
    try {
      await useCases.setCurrentTerm(v);
      adminLogAction("تغيير الترم", "settings", "app", "", `الترم الحالي بقى: ${termName(v)}`);
      appSettings.currentTerm = v;
      showToast("الترم الحالي بقى: " + termName(v) + " ✅", "good");
      adminStats();
    } catch (e) { m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
  };
  // نشر/إيقاف الإعلان العام
  const bcPub = document.getElementById("bc-pub");
  if (bcPub) bcPub.onclick = async () => {
    const m = document.getElementById("bc-msg");
    const text = document.getElementById("bc-text").value.trim();
    const audience = document.getElementById("bc-aud").value;
    const days = Number(document.getElementById("bc-days").value || 3);
    const badText = validateBroadcastText(text);
    if (badText) { m.className = "msg bad"; m.textContent = badText; return; }
    try {
      const until = broadcastUntil(days, new Date());
      await useCases.publishBroadcast({ text, audience, until });
      adminLogAction("نشر إعلان", "broadcast", "current", "", text.slice(0, 80));
      showToast("اتنشر الإعلان ✅", "good");
      await adminLoad();
      adminStats();
    } catch (e) { m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
  };
  const bcDel = document.getElementById("bc-del");
  if (bcDel) bcDel.onclick = async () => {
    if (!confirm("إيقاف الإعلان الحالي؟ هيختفي من عند الكل فورًا.")) return;
    try {
      await useCases.clearBroadcast();
      adminLogAction("إيقاف إعلان", "broadcast", "current", "", "");
      showToast("اتوقف الإعلان.", "good");
      await adminLoad();
      adminStats();
    } catch (e) { alert("مشكلة: " + (e.message || e)); }
  };
  document.querySelectorAll("[data-rv-t]").forEach((tr) => tr.onclick = () => adminShowTeacher(tr.dataset.rvT));
  document.querySelectorAll("[data-rv-s]").forEach((tr) => tr.onclick = () => adminShowStudent(tr.dataset.rvS));
}