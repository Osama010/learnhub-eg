import { authErrAr } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { adminCache, adminLayout, adminLoad, adminLogAction, makePayment, renderAdmin } from "./shell.js";
import { teacherStagesText } from "./subjects.js";
import { STAGES } from "./subjects.presenter.js";
import { subChip } from "../../shared/subscriptions.js";
import { openConfirmOverlay } from "../../shared/terms.js";
import { bailIfSignedOut, showToast } from "../../shared/toast.js";
import { deleteTeacherEverywhere, waLink } from "../../shared/transfer.js";
import { sendPasswordReset, setTeacherSignupStatus } from "../../main/data.js";
import { gradesSummary } from "../auth/teacher-signup.presenter.js";
import { stageOfGrade } from "../../domain/student.js";
import { presentTeacherForm, validateNewTeacherPassword, validatePaymentPeriod } from "./teachers.presenter.js";
import { fmtTs, tsToDate } from "../../domain/format.js";
import { SUB_TYPES, subDateStr, subEndDefault, subEndOf, subFmtDate, subInfo } from "../../domain/subscription.js";
import { serverNow, toStoredTime, createAuthUserSecondary } from "../../main/data.js";
import { useCases } from "../../main/compose.js";

function showDetail(title, rows) {
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = T("admin.showDetail", { rows, title });
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  ov.querySelector("#ov-close").onclick = () => ov.remove();
  return ov;
}

export function adminShowTeacher(id) {
  const t = (adminCache.teachers || []).find((x) => x.id === id);
  if (!t) return;
  const mine = (adminCache.students || []).filter((s) => (s.teacherIds || []).includes(id));
  showDetail("بيانات المدرس كاملة", [
    ["الصورة", t.photoData ? T("admin.adminShowTeacher", { t }) : "—"],
    ["الاسم", esc(t.name)],
    ["المادة", esc(t.subject || "—")],
    ["المراحل", esc((t.stages || []).join("، ") || "—")],
    ["الإيميل", T("admin.adminShowTeacher_2", { esc, t })],
    ["رقم الواتساب", T("admin.adminShowTeacher_3", { esc, t })],
    ["الحالة", t.active === false ? "معطّل" : "نشط"],
    ["تاريخ الإضافة", fmtTs(t.createdAt)],
    ["عدد الطلاب", String(mine.length)],
    ["طلاب كل مرحلة", esc(teacherStagesText(t))],
    ["أسماء الطلاب", mine.length ? mine.map((s) => esc(s.name)).join("، ") : "—"],
    ["الاشتراك", `${subChip(subInfo(t))} ${subInfo(t).end ? "حتى " + subFmtDate(subInfo(t).end) : ""}`],
  ]);
  // سجل المدفوعات + زر تسجيل دفعة جديدة جوه نفس المودال
  const ov = document.querySelectorAll(".overlay");
  const cur = ov[ov.length - 1];
  const pays = (adminCache.payments || []).filter((p) => p.teacherId === id);
  const card = cur && cur.querySelector(".detailcard");
  if (card) {
    const sec = document.createElement("div");
    sec.innerHTML = T("admin.adminShowTeacher_4", { SUB_TYPES, esc, fmtTs, pays, subFmtDate, tsToDate });
    card.insertBefore(sec, card.querySelector(".btnrow"));
    sec.querySelector("#pay-add").onclick = () => { cur.remove(); adminPaymentModal(t); };
  }
}

/* مودال تسجيل دفعة اشتراك: بيحدّث اشتراك المدرس ويسجّل الدفعة في نفس الباتش.
   تاريخ النهاية بيتحسب تلقائي حسب النوع (شهر / 4 شهور / سنة) وقابل للتعديل. */
function adminPaymentModal(t) {
  const si = subInfo(t);
  const today = subDateStr(new Date());
  const defStart = today;
  const ov = openConfirmOverlay(T("admin.adminPaymentModal", { SUB_TYPES, defStart, esc, si, subFmtDate, t }));
  const typeEl = ov.querySelector("#pm-type"), fromEl = ov.querySelector("#pm-from"), toEl = ov.querySelector("#pm-to");
  const syncEnd = () => { toEl.value = subEndDefault(typeEl.value, fromEl.value); };
  syncEnd();
  typeEl.onchange = syncEnd;
  fromEl.onchange = syncEnd;
  ov.querySelector("#pm-no").onclick = () => ov.remove();
  ov.querySelector("#pm-ok").onclick = async () => {
    const m = ov.querySelector("#pm-msg");
    const subType = typeEl.value;
    const amount = Number(ov.querySelector("#pm-amount").value || 0);
    const from = fromEl.value, to = toEl.value, note = ov.querySelector("#pm-note").value.trim();
    const perr = validatePaymentPeriod(from, to);
    if (perr) { m.className = "msg bad"; m.textContent = perr; return; }
    const btn = ov.querySelector("#pm-ok");
    btn.disabled = true;
    m.className = "msg"; m.textContent = "بنحفظ...";
    const subData = {
      subType, subAmount: amount,
      subStart: toStoredTime(new Date(from + "T00:00:00")),
      subEnd: toStoredTime(new Date(to + "T23:59:59")),
    };
    try {
      await useCases.recordTeacherPayment(t.id, subData, makePayment(t, subData, note));
      ov.remove();
      showToast(`اتسجلت الدفعة واشتراك ${t.name || "المدرس"} بقى ${SUB_TYPES[subType]} حتى ${subFmtDate(subData.subEnd.toDate())} ✅`, "good");
      await renderAdmin(location.hash || "#/admin");
    } catch (e) { btn.disabled = false; m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
  };
}

export function adminShowStudent(id) {
  const s = (adminCache.students || []).find((x) => x.id === id);
  if (!s) return;
  const teachers = adminCache.teachers || [];
  const tnames = (s.teacherIds || []).map((tid) => (teachers.find((t) => t.id === tid) || {}).name || "—").join("، ");
  const prog = (s.progress && s.progress["programming-ai"] && s.progress["programming-ai"].percent) || 0;
  showDetail("بيانات الطالب كاملة", [
    ["الاسم", esc(s.name)],
    ["الإيميل", T("admin.adminShowStudent", { esc, s })],
    ["الموبايل (واتساب)", T("admin.adminShowStudent_2", { esc, s })],
    ["موبايل ولي الأمر", s.parentPhone ? T("admin.adminShowStudent_3", { esc, s, waLink }) : "غير مسجل"],
    ["السنة الدراسية", esc(s.grade || "—")],
    ["المدرسين", esc(tnames || "—")],
    ["الحالة", s.status === "approved" ? "مقبول" : s.status === "rejected" ? "مرفوض" : "تحت المراجعة"],
    ["تقدمه في البرمجة والذكاء الاصطناعي", prog + "%"],
    ["حساب الدخول", s.authLinked ? "اتعمل (دخل وعمل باسورد)" : "لسه مدخلش"],
    ["تاريخ التسجيل", fmtTs(s.createdAt)],
  ]);
}

export function adminTeachers() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const teachers = adminCache.teachers || [];
  const students = adminCache.students || [];
  const editing = editingTeacherId ? (adminCache.teachers || []).find((t) => t.id === editingTeacherId) : null;
  const subjects = adminCache.subjects || [];
  // المدرس بيتربط بالمادة بالاسم في المرحلة، فبنعرض كل اسم مادة مرة واحدة مهما اتكررت على الصفوف
  const seenSub = new Set();
  const subjectOptions = subjects.filter((s) => { const k = (s.name || "") + "|" + (s.stage || ""); if (seenSub.has(k)) return false; seenSub.add(k); return true; })
    .map((s) => T("admin.adminTeachers", { editing, esc, s })).join("");
  let signupsHtml = "";
  try { signupsHtml = editing ? "" : T("admin.signupsCard", { esc, gradesSummary, signups: adminCache.signups || [], signupsError: adminCache.signupsError || "" }); }
  catch (e) { console.warn("تعذر عرض طلبات المدرسين", e); }
  const content = signupsHtml + T("admin.adminTeachers_2", { STAGES, SUB_TYPES, editing, esc, students, subChip, subDateStr, subEndDefault, subEndOf, subFmtDate, subInfo, subjectOptions, subjects, teacherStagesText, teachers });
  adminLayout(content, "teachers");
  taPhotoData = null;
  const photoInp = document.getElementById("ta-photo");
  if (photoInp) photoInp.onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) { taPhotoData = null; return; }
    try {
      taPhotoData = await resizePhoto(f);
      document.getElementById("ta-photo-prev").innerHTML = T("admin.adminTeachers_3", { taPhotoData });
    } catch (err) {
      taPhotoData = null;
      taMsg("الصورة دي مش مدعومة، جرّب صورة تانية (JPG أو PNG).");
    }
  };
  // مدخلات الاشتراك: تعطيلها للنوع المجاني + حساب تاريخ النهاية تلقائيًا من النوع والبداية
  const subTypeSel = document.getElementById("ta-subtype");
  const subStartInp = document.getElementById("ta-substart");
  const subEndInp = document.getElementById("ta-subend");
  const subAmountInp = document.getElementById("ta-subamount");
  const syncSubDisabled = () => {
    const free = subTypeSel.value === "free";
    [subStartInp, subEndInp, subAmountInp].forEach((x) => { x.disabled = free; });
  };
  subTypeSel.onchange = () => {
    syncSubDisabled();
    if (subTypeSel.value === "free") { subStartInp.value = ""; subEndInp.value = ""; }
    else {
      if (!subStartInp.value) subStartInp.value = subDateStr(new Date());
      subEndInp.value = subEndDefault(subTypeSel.value, subStartInp.value);
    }
  };
  subStartInp.onchange = () => {
    if (subTypeSel.value !== "free" && subStartInp.value) subEndInp.value = subEndDefault(subTypeSel.value, subStartInp.value);
  };
  syncSubDisabled();
  document.getElementById("ta-add").onclick = adminSaveTeacher;
  try {
    document.querySelectorAll("[data-sg-ok]").forEach((b) => b.onclick = () => adminAcceptSignup(b.dataset.sgOk));
    document.querySelectorAll("[data-sg-no]").forEach((b) => b.onclick = () => adminRejectSignup(b.dataset.sgNo));
    if (activeSignup && !editing) applySignupPrefill(activeSignup);
  } catch (e) { console.warn("تعذر تجهيز طلبات المدرسين", e); }
  const cancelBtn = document.getElementById("ta-cancel");
  if (cancelBtn) cancelBtn.onclick = () => { editingTeacherId = null; adminTeachers(); };
  document.querySelectorAll("[data-tv]").forEach((b) => b.onclick = () => adminShowTeacher(b.dataset.tv));
  document.querySelectorAll("[data-tc]").forEach((b) => b.onclick = () => { location.hash = "#/admin/teacher-content/" + b.dataset.tc; });
  document.querySelectorAll("[data-rv-t]").forEach((tr) => tr.onclick = (e) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    adminShowTeacher(tr.dataset.rvT);
  });
  document.querySelectorAll("[data-te]").forEach((b) => b.onclick = () => { editingTeacherId = b.dataset.te; adminTeachers(); });
  document.querySelectorAll("[data-tr]").forEach((b) => b.onclick = () => adminResetTeacher(b.dataset.tr));
  document.querySelectorAll("[data-tg]").forEach((b) => b.onclick = () => adminToggleTeacher(b.dataset.tg));
  document.querySelectorAll("[data-td]").forEach((b) => b.onclick = () => adminDeleteTeacher(b.dataset.td));
}

export let editingTeacherId = null;
let activeSignup = null; // طلب مدرس اتضغط عليه "قبول": بيملّى الفورم، وبعد الإضافة بيتعلّم accepted

/* قبول طلب مدرس: ملّى فورم الإضافة ببياناته والأدمن يكمّل الباسورد المؤقت والاشتراك */
function adminAcceptSignup(id) {
  const g = (adminCache.signups || []).find((x) => x.id === id);
  if (!g) return;
  activeSignup = g;
  editingTeacherId = null;
  adminTeachers();
}

function applySignupPrefill(g) {
  const setv = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || ""; };
  setv("ta-name", g.name); setv("ta-email", g.email); setv("ta-phone", g.phone);
  const sel = document.getElementById("ta-subject");
  if (sel) {
    const opt = Array.from(sel.options).find((o) => o.value === g.subject);
    if (opt) sel.value = g.subject;
  }
  document.querySelectorAll(".ta-stage").forEach((c) => { c.checked = (g.stages || []).includes(c.value); });
  const box = document.getElementById("ta-add");
  const card = box && box.closest(".card");
  if (card) {
    const note = document.createElement("div");
    note.className = "msg good";
    note.style.cssText = "margin:0 0 10px;";
    note.textContent = "ده طلب من " + g.name + " (المادة اللي كتبها: " + (g.subject || "—") + " · الصفوف: " + gradesSummary(g.grades) + "). اختار المادة من القايمة وحط باسورد مؤقت وادوس إضافة.";
    card.insertBefore(note, card.children[1] || null);
    if (card.scrollIntoView) card.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function adminRejectSignup(id) {
  const g = (adminCache.signups || []).find((x) => x.id === id);
  if (!g) return;
  if (!confirm(`رفض طلب "${g.name}"؟ مش هيتبعتله إشعار، بلّغه بنفسك لو حابب.`)) return;
  try {
    await setTeacherSignupStatus(id, "rejected");
    adminLogAction("رفض طلب مدرس", "teacher", id, g.name || "", g.email || "");
    if (activeSignup && activeSignup.id === id) activeSignup = null;
    showToast("اترفض طلب " + g.name, "good");
    await adminLoad();
    adminTeachers();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}
let taPhotoData = null;

function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 256;
      let w = img.width, h = img.height;
      if (w > h) { if (w > max) { h = Math.round(h * max / w); w = max; } }
      else { if (h > max) { w = Math.round(w * max / h); h = max; } }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      const d = c.toDataURL("image/jpeg", 0.82);
      URL.revokeObjectURL(img.src);
      if (d.length > 700000) return reject(new Error("كبيرة"));
      resolve(d);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error("مش صورة")); };
    img.src = URL.createObjectURL(file);
  });
}

async function adminResetTeacher(id) {
  const t = adminCache.teachers.find((x) => x.id === id);
  if (!t) return;
  if (!confirm(`هيتبعت إيميل إعادة ضبط الباسورد للمدرس "${t.name}" على ${t.email}. موافق؟`)) return;
  try {
    await sendPasswordReset(t.email);
    taMsg("اتبعت إيميل إعادة الضبط لـ " + t.email + " ✅", true);
  } catch (e) { taMsg(authErrAr(e)); }
}

function taMsg(t, good) {
  const m = document.getElementById("ta-msg");
  if (m) { m.textContent = t || ""; m.className = "msg " + (good ? "good" : "bad"); }
  if (t) showToast(t, good ? "good" : "bad");
}

async function adminSaveTeacher() {
  const subTypeEl = document.getElementById("ta-subtype");
  const form = presentTeacherForm({
    name: document.getElementById("ta-name").value,
    subject: document.getElementById("ta-subject").value,
    email: document.getElementById("ta-email").value,
    phone: document.getElementById("ta-phone").value,
    stages: Array.from(document.querySelectorAll(".ta-stage:checked")).map((c) => c.value),
    subType: subTypeEl && subTypeEl.value,
    subAmount: document.getElementById("ta-subamount").value,
    subStart: document.getElementById("ta-substart").value,
    subEnd: document.getElementById("ta-subend").value,
  });
  if (form.error) return taMsg(form.error);
  const { name, subject, email, phone, stages, subType, subAmount, subStart: subStartStr, subEnd: subEndStr } = form.values;
  const subData = subType === "free"
    ? { subType: "free", subAmount: 0, subStart: null, subEnd: null }
    : { subType, subAmount,
        subStart: toStoredTime(new Date(subStartStr + "T00:00:00")),
        subEnd: toStoredTime(new Date(subEndStr + "T23:59:59")) };
  if (editingTeacherId) {
    // تعديل بيانات مدرس موجود (السجل + النسخة العامة)
    try {
      const newData = { name, subject, email, phone, stages, ...subData };
      if (taPhotoData) newData.photoData = taPhotoData;
      const pubUpd = { name, subject, stages, email, subType: subData.subType, subEnd: subData.subEnd };
      if (taPhotoData) pubUpd.avatar = taPhotoData;
      // لو الاشتراك اتجدد (تاريخ النهاية اتغير) سجّل الدفعة تلقائيًا مع الحفظ
      const oldT = (adminCache.teachers || []).find((x) => x.id === editingTeacherId) || {};
      const oldEnd = subEndOf(oldT), newEnd = subEndOf(subData);
      const renewed = subData.subType !== "free" && (!oldEnd || !newEnd || oldEnd.getTime() !== newEnd.getTime());
      const payment = renewed ? makePayment({ id: editingTeacherId, name }, subData) : null;
      adminLogAction("تعديل مدرس", "teacher", editingTeacherId, name, "");
      await useCases.updateTeacher(editingTeacherId, newData, pubUpd, payment);
      taMsg("اتحفظت التعديلات ✅", true);
      editingTeacherId = null;
      await adminLoad();
      adminTeachers();
    } catch (e) { taMsg("مشكلة: " + (e.message || e)); }
    return;
  }
  const pass = document.getElementById("ta-pass").value;
  const passErr = validateNewTeacherPassword(pass);
  if (passErr) return taMsg(passErr);
  taMsg("بننشئ حساب المدرس...");
  // تطبيق ثانوي مؤقت عشان إنشاء الحساب ميطلّعش الأدمن
  try {
    const uid = await createAuthUserSecondary(email, pass);
    // طلب مدرس مقبول: الصفوف اللي اختارها بتتحفظ مع بيانات المدرس (اللي في مراحل مختارة بس)
    const sg = activeSignup && activeSignup.email === email ? activeSignup : null;
    const sgGrades = sg ? (sg.grades || []).filter((x) => stages.includes(stageOfGrade(x))) : [];
    const teacherDoc = {
      name, email, subject, phone, stages,
      photoData: taPhotoData || "",
      active: true,
      ...subData,
      emailVerifyRequired: true, // حساب جديد: لازم يفعّل إيميله قبل أول دخول
      createdAt: serverNow(),
      ...(sgGrades.length ? { grades: sgGrades } : {}),
    };
    // نسخة عامة لصفحة التسجيل وتحذير "الإيميل مش مسجل" وصورة المدرس عند طلابه — من غير تليفون
    const payment = subData.subType !== "free" ? makePayment({ id: uid, name }, subData, "أول اشتراك") : null;
    adminLogAction("إضافة مدرس", "teacher", uid, name, `المادة: ${subject}`);
    await useCases.addTeacher(uid, teacherDoc, { name, subject, stages, email, avatar: taPhotoData || "", active: true, subType: subData.subType, subEnd: subData.subEnd, ...(sgGrades.length ? { grades: sgGrades } : {}) }, payment);
    if (sg) {
      try { await setTeacherSignupStatus(sg.id, "accepted"); adminLogAction("قبول طلب مدرس", "teacher", uid, name, email); }
      catch (e2) { console.warn("المدرس اتضاف بس تعليم الطلب فشل", e2); }
      activeSignup = null;
    }
    taMsg("اتضاف المدرس " + name + " ✅ واتبعت لينك التفعيل على إيميله", true);
    adminCache.teachers = null;
    await adminLoad();
    adminTeachers();
  } catch (e) {
    taMsg(authErrAr(e) + " (لو الإيميل متسجل قبل كده في Firebase Auth لازم يتحذف من هناك الأول)");
  }
}

/* إيقاف مدرس مؤقتًا: مودال بيوضح الأثر (مش هيدخل، محتواه بيتقفل على طلابه، بيختفي من التسجيل)
   والإيقاف مبيمسحش حاجة — كل حاجة بترجع زي ما هي عند إلغاء الإيقاف */
async function adminToggleTeacher(id) {
  const t = adminCache.teachers.find((x) => x.id === id);
  if (!t) return;
  const doToggle = async () => {
    try {
      adminLogAction(t.active === false ? "إلغاء إيقاف مدرس" : "إيقاف مدرس مؤقتًا", "teacher", id, t.name || "", "");
      await useCases.setTeacherActive(id, t.active === false);
      showToast(t.active === false ? `رجع ${t.name} للمنصة ✅` : `اتوقف ${t.name} مؤقتًا.`, "good");
      await adminLoad();
      adminTeachers();
    } catch (e) { alert("مشكلة: " + (e.message || e)); }
  };
  // إلغاء الإيقاف على طول من غير مودال — مفيش فيه خطر
  if (t.active === false) return doToggle();
  const mine = (adminCache.students || []).filter((s) => (s.teacherIds || []).includes(id)).length;
  const ov = openConfirmOverlay(T("admin.adminToggleTeacher", { esc, mine, t }));
  ov.querySelector("#st-no").onclick = () => ov.remove();
  ov.querySelector("#st-ok").onclick = async () => { ov.remove(); await doToggle(); };
}

/* حذف مدرس نهائيًا: مودال تحذير كامل (بياناته + كل محتواه + محاولات وتقييمات طلابه عليه)
   مع نصيحة تحميل نسخة من المحتوى الأول، وبعدين مسح شامل بـ deleteTeacherEverywhere */
function adminDeleteTeacher(id) {
  const t = adminCache.teachers.find((x) => x.id === id);
  if (!t) return;
  const mine = (adminCache.students || []).filter((s) => (s.teacherIds || []).includes(id)).length;
  const ov = openConfirmOverlay(T("admin.adminDeleteTeacher", { esc, mine, t }));
  ov.querySelector("#td-no").onclick = () => ov.remove();
  ov.querySelector("#td-ok").onclick = async () => {
    const btn = ov.querySelector("#td-ok");
    const m = ov.querySelector("#td-msg");
    btn.disabled = true;
    m.className = "msg"; m.textContent = "بنحذف...";
    try {
      const c = await deleteTeacherEverywhere(t);
      adminLogAction("حذف مدرس نهائيًا", "teacher", t.id, t.name || "", `${c.lessons} درس و${c.quizzes} كويز و${c.exams} امتحان`);
      ov.remove();
      showToast(`اتحذف ${t.name || "المدرس"} نهائيًا: ${c.lessons} درس و${c.quizzes} كويز و${c.exams} امتحان و${c.quizAttempts} محاولة، واتشال من قوائم ${c.students} طالب.`, "good");
      await adminLoad();
      adminTeachers();
    } catch (e) { btn.disabled = false; m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
  };
}

export function set_editingTeacherId(v) { return (editingTeacherId = v); }
