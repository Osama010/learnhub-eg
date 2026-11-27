import { fbProfile, fbUser, authErrAr } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { bailIfSignedOut, showToast } from "../../shared/toast.js";
import { bindTeacherTabs, teacherTabs } from "./dashboard.js";
import { GRADES, gradesOfStage } from "../../domain/student.js";
import { MAX_IMPORT_ROWS, failedRowsCsv, parseCsv, prepareImport, presentSingleStudent, templateCsv } from "../../domain/student-import.js";
import { useCases } from "../../main/compose.js";

/* ---------- المدرس بيضيف طلاب: واحد واحد أو من ملف CSV/Excel ---------- */
let running = false;
let prepared = null;   // نتيجة prepareImport للملف المرفوع
let lastResults = [];

/** الصفوف المسموحة للمدرس: صفوفه المحددة لو فيه، وإلا صفوف مراحله، وإلا كل الصفوف. */
export function allowedGradesOf(profile) {
  const p = profile || {};
  const g = Array.isArray(p.grades) ? p.grades : String(p.grades || "").split(",").filter(Boolean);
  if (g.length) return GRADES.filter((x) => g.includes(x));
  const st = Array.isArray(p.stages) ? p.stages : String(p.stages || "").split(",").filter(Boolean);
  if (st.length) return st.flatMap((s) => gradesOfStage(s));
  return GRADES.slice();
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type: type || "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
}

async function readTable(file) {
  const name = (file.name || "").toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());
  if (name.endsWith(".xlsx")) { const { readXlsxRows } = await import("../../shared/xlsx-read.js"); return readXlsxRows(buf); }
  if (name.endsWith(".xls")) throw new Error("ملفات .xls القديمة مش مدعومة. احفظ الملف كـ .xlsx أو CSV وارفعه.");
  let text = new TextDecoder("utf-8").decode(buf);
  if (text.includes("\uFFFD")) { try { text = new TextDecoder("windows-1256").decode(buf); } catch (_) {} }
  return parseCsv(text);
}

function countsOf(rows) {
  const c = { created: 0, existing: 0, failed: 0, skipped: 0 };
  rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
  return c;
}

function showResults(rows) {
  lastResults = rows;
  const box = document.getElementById("as-res");
  if (!box) return;
  box.innerHTML = T("teacher.addStudentsResults", { counts: countsOf(rows), esc, rows });
  const dl = document.getElementById("as-dlfail");
  if (dl) dl.onclick = () => download("students-not-added.csv", failedRowsCsv(rows));
  box.querySelectorAll("[data-as-resend]").forEach((b) => b.onclick = () => resend(+b.dataset.asResend, b));
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function resend(i, btn) {
  const r = lastResults[i];
  if (!r || !r.email) return;
  btn.disabled = true;
  try { await useCases.sendPasswordReset(r.email); showToast("اتبعت الإيميل تاني لـ " + r.email + " ✅", "good"); }
  catch (e) { showToast(authErrAr(e), "bad"); }
  btn.disabled = false;
}

async function addOne(allowed) {
  const msg = document.getElementById("as-msg"), btn = document.getElementById("as-add");
  const say = (t, good) => { msg.textContent = t; msg.style.color = good ? "#15803d" : "#b91c1c"; };
  if (running) return;
  const pres = presentSingleStudent({
    name: document.getElementById("as-name").value, email: document.getElementById("as-email").value, grade: document.getElementById("as-grade").value,
    phone: document.getElementById("as-phone").value, parentPhone: document.getElementById("as-parent").value,
  }, { allowedGrades: allowed });
  if (pres.error) return say(pres.error);
  running = true; btn.disabled = true; say("بنضيف الطالب...", true);
  try {
    const [res] = await useCases.importStudents(fbUser.uid, [pres.values], {});
    if (res.status === "created") {
      say(res.reason + " ✅", res.emailSent);
      ["as-name", "as-email", "as-phone", "as-parent"].forEach((id) => { document.getElementById(id).value = ""; });
      lastResults = [res]; showResults(lastResults);
    } else say((res.status === "existing" ? "⚠ " : "") + res.reason);
  } catch (e) { say("حصلت مشكلة: " + (e.message || e)); }
  running = false; btn.disabled = false;
}

async function onFile(allowed) {
  const input = document.getElementById("as-file"), prev = document.getElementById("as-prev");
  const file = input.files && input.files[0];
  prepared = null; prev.innerHTML = "";
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) { prev.innerHTML = '<p style="color:#b91c1c;">الملف كبير جدًا (أكتر من 3 ميجا).</p>'; return; }
  prev.innerHTML = '<div class="muted">بنقرا الملف...</div>';
  try {
    const table = await readTable(file);
    prepared = prepareImport(table, { defaultGrade: document.getElementById("as-dgrade").value, allowedGrades: allowed });
    prepared.fileTable = table;
    if (prepared.error) { prev.innerHTML = '<p style="color:#b91c1c;font-weight:700;">' + esc(prepared.error) + "</p>"; prepared = null; return; }
    const bad = prepared.rows.filter((r) => r.error);
    prev.innerHTML = T("teacher.addStudentsPreview", { bad, badCount: prepared.badCount, esc, tooMany: prepared.tooMany, maxRows: MAX_IMPORT_ROWS, validCount: prepared.validCount })
      + (prepared.validCount && !prepared.tooMany ? `<div class="btnrow" style="margin-top:10px;"><button type="button" class="btn" id="as-start">ابدأ إضافة ${prepared.validCount} طالب</button><button type="button" class="btn ghost" id="as-stop" hidden>إيقاف</button></div><div id="as-prog" class="muted" aria-live="polite" style="margin-top:8px;"></div>` : "");
    const st = document.getElementById("as-start");
    if (st) st.onclick = () => runImport(allowed);
  } catch (e) { prev.innerHTML = '<p style="color:#b91c1c;font-weight:700;">' + esc(e.message || String(e)) + "</p>"; prepared = null; }
}

async function runImport() {
  if (running || !prepared) return;
  const good = prepared.rows.filter((r) => !r.error);
  const bad = prepared.rows.filter((r) => r.error).map((r) => ({ ...r, status: "failed", reason: r.error }));
  const st = document.getElementById("as-start"), stop = document.getElementById("as-stop"), prog = document.getElementById("as-prog");
  let stopFlag = false;
  running = true; st.disabled = true; stop.hidden = false; stop.onclick = () => { stopFlag = true; stop.disabled = true; prog.textContent = "بنوقف بعد الطالب الحالي..."; };
  const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
  window.addEventListener("beforeunload", warn);
  try {
    const res = await useCases.importStudents(fbUser.uid, good, {
      shouldStop: () => stopFlag,
      onProgress: (i, n) => { prog.textContent = "بنضيف... " + i + " من " + n; },
    });
    showResults([...res, ...bad]);
    const c = countsOf(res);
    showToast("اتضاف " + c.created + " طالب" + ((c.failed + c.existing + c.skipped) ? " والباقي في الجدول بأسبابه" : " ✅"), c.created ? "good" : "bad");
    prog.textContent = "خلصت.";
  } catch (e) { prog.textContent = "حصلت مشكلة: " + (e.message || e); }
  window.removeEventListener("beforeunload", warn);
  running = false; stop.hidden = true; st.hidden = true; prepared = null;
}

export function renderTeacherAddStudents() {
  if (bailIfSignedOut()) return;
  if (!fbUser) return renderLogin();
  const allowed = allowedGradesOf(fbProfile);
  const gradeOptions = allowed.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
  app.innerHTML = teacherTabs("students") + T("teacher.addStudentsPage", { gradeOptions: '<option value="">— اختار الصف —</option>' + gradeOptions, maxRows: MAX_IMPORT_ROWS }) + closing();
  bindTeacherTabs();
  prepared = null; lastResults = []; running = false;
  document.getElementById("as-add").onclick = () => addOne(allowed);
  document.getElementById("as-tpl").onclick = () => download("students-template.csv", templateCsv());
  document.getElementById("as-file").onchange = () => onFile(allowed);
  document.getElementById("as-dgrade").onchange = () => { if (prepared && prepared.fileTable) onFileRecompute(allowed); };
  window.scrollTo(0, 0);
}

function onFileRecompute(allowed) {
  // الصف الافتراضي اتغيّر بعد رفع الملف: نعيد الفحص على نفس الملف
  const input = document.getElementById("as-file");
  if (input && input.files && input.files[0]) onFile(allowed);
}
