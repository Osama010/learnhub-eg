
import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { adminCache, adminLayout, adminLoad, adminLogAction } from "./shell.js";
import { bailIfSignedOut, showToast } from "../../shared/toast.js";
import { gradesOfStage } from "../../domain/student.js";
import { useCases } from "../../main/compose.js";
import { STAGES, missingCoreSubjects, stagesTextOf, subjectRows, validateNewSubject } from "./subjects.presenter.js";

/* ---------- المواد الدراسية ---------- */

// مرحلة الطالب من سنة دراسته


// نص: كل مرحلة بيدرّسها المدرس وقد إيه طالب فيها
export function teacherStagesText(t) {
  return stagesTextOf(t, adminCache.students);
}

// اختيارات الصف حسب المرحلة المختارة في فورم المادة
function sjGradeOptions(stage, val) {
  return T("admin.sjGradeOptions") + gradesOfStage(stage).map((g) => T("admin.sjGradeOptions_2", { esc, g, val })).join("");
}

export function adminSubjects() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const subjects = adminCache.subjects || [];
  const content = T("admin.adminSubjects", { STAGES, esc, gradesOfStage, sjGradeOptions, subjectReportRows, subjects });
  adminLayout(content, "subjects");
  document.getElementById("sj-stage").onchange = (e) => { document.getElementById("sj-grade").innerHTML = sjGradeOptions(e.target.value, ""); };
  document.getElementById("sj-add").onclick = adminAddSubject;
  const seedBtn = document.getElementById("sj-seed");
  if (seedBtn) seedBtn.onclick = adminSeedSubjects;
  document.querySelectorAll("[data-se-sub]").forEach((b) => b.onclick = () => adminEditSubject(b.dataset.seSub));
  document.querySelectorAll("[data-sd-sub]").forEach((b) => b.onclick = () => adminDeleteSubject(b.dataset.sdSub));
}

function subjectReportRows() {
  return subjectRows(adminCache.subjects, adminCache.teachers, adminCache.students);
}

function adminEditSubject(id) {
  const s = (adminCache.subjects || []).find((x) => x.id === id);
  if (!s) return;
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = T("admin.adminEditSubject", { STAGES, esc, s, sjGradeOptions });
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  ov.querySelector("#ej-cancel").onclick = () => ov.remove();
  ov.querySelector("#ej-stage").onchange = (e) => { ov.querySelector("#ej-grade").innerHTML = sjGradeOptions(e.target.value, ""); };
  ov.querySelector("#ej-save").onclick = async () => {
    const name = ov.querySelector("#ej-name").value.trim();
    const stage = ov.querySelector("#ej-stage").value;
    const grade = ov.querySelector("#ej-grade").value;
    const m = ov.querySelector("#ej-msg");
    if (!name) { m.textContent = "اكتب اسم المادة."; m.className = "msg bad"; return; }
    try {
      await useCases.updateSubject(id, { name, stage, grade });
      ov.remove();
      await adminLoad();
      adminSubjects();
    } catch (e) {
      m.textContent = "مشكلة: " + (e.message || e);
      m.className = "msg bad";
    }
  };
}

function sjMsg(t, good) {
  const m = document.getElementById("sj-msg");
  if (m) { m.textContent = t || ""; m.className = "msg " + (good ? "good" : "bad"); }
  if (t) showToast(t, good ? "good" : "bad");
}

async function adminAddSubject() {
  const name = document.getElementById("sj-name").value.trim();
  const stage = document.getElementById("sj-stage").value;
  const grade = document.getElementById("sj-grade").value;
  const bad = validateNewSubject(adminCache.subjects, { name, stage, grade });
  if (bad) return sjMsg(bad);
  try {
    await useCases.addSubject({ name, stage, grade });
    adminLogAction("إضافة مادة", "subject", "", name, `${stage}${grade ? " — " + grade : ""}`);
    sjMsg("اتضافت المادة ✅", true);
    await adminLoad();
    adminSubjects();
  } catch (e) { sjMsg("مشكلة: " + (e.message || e)); }
}

async function adminSeedSubjects() {
  try {
    const missing = missingCoreSubjects(adminCache.subjects);
    await useCases.addCoreSubjects(missing);
    await adminLoad();
    adminSubjects();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

async function adminDeleteSubject(id) {
  const s = (adminCache.subjects || []).find((x) => x.id === id);
  if (!confirm(`متأكد إنك عايز تحذف مادة "${s ? s.name : ""}"؟`)) return;
  try {
    await useCases.deleteSubject(id);
    adminLogAction("حذف مادة", "subject", id, s ? s.name : "", "");
    await adminLoad();
    adminSubjects();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}