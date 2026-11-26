import { T } from "../core/templates.js";
import { app, esc } from "../core/utils.js";
import { closing } from "../features/landing/landing.js";
import { openConfirmOverlay } from "./terms.js";
import { showToast } from "./toast.js";
import { GRADES } from "../domain/student.js";
import { useCases } from "../main/compose.js";

/* ---------- النقل الجماعي بين الصفوف ----------
   شاشة منفصلة مخصصة للنقل عشان محدش ينقل بالغلط: اختيار صف → تحديد طلبة → صف جديد → تأكيد بالعدد.
   بعد النقل الطالب يشوف محتوى صفه الجديد بس، ودرجاته القديمة بتفضل على السيرفر للتقارير.
   «متخرج» لطلاب الثالث الثانوي اللي خلصوا. */
var transferState = { from: "", to: "", picked: {}, teacher: "" };
const GRADUATED = "🎓 متخرج";

export function renderTransferPage(cfg) {
  const all = (cfg.students || []).filter((s) => s.status === "approved");
  if (!transferState.from || !GRADES.includes(transferState.from)) transferState.from = (all[0] && all[0].grade) || GRADES[0];
  const teachers = cfg.teachers || null; // الأدمن بس اللي بيبعت قايمة المدرسين (فلتر + عمود)
  if (teachers && transferState.teacher && !teachers.some((t) => t.id === transferState.teacher)) transferState.teacher = "";
  let list = all.filter((s) => s.grade === transferState.from);
  if (teachers && transferState.teacher) list = list.filter((s) => (s.teacherIds || []).includes(transferState.teacher));
  const tNames = (s) => ((s.teacherIds || []).map((id) => ((teachers.find((t) => t.id === id) || {}).name || "")).filter(Boolean).join("، ") || "—");
  const filteredTeacherName = teachers && transferState.teacher ? ((teachers.find((t) => t.id === transferState.teacher) || {}).name || "") : "";
  const targets = GRADES.filter((g) => g !== transferState.from).concat([GRADUATED]);
  if (!transferState.to || transferState.to === transferState.from) transferState.to = targets[0] || "";
  const pickedCount = list.filter((s) => transferState.picked[s.id]).length;
  const allChecked = list.length > 0 && list.every((s) => transferState.picked[s.id]);
  const content = T("app.renderTransferPage", { GRADES, allChecked, esc, filteredTeacherName, list, pickedCount, tNames, targets, teachers, transferState });
  /* الصفحة بتتلف بغلاف اللوحة بتاع الدور (أدمن أو مدرس) عشان التنقل يفضل شغال */
  if (cfg.wrap) cfg.wrap(content);
  else app.innerHTML = cfg.headerHtml + content + closing();
  document.getElementById("tr-back").onclick = () => { transferState.picked = {}; location.hash = cfg.backHash; };
  document.getElementById("tr-from").onchange = (e) => { transferState.from = e.target.value; transferState.picked = {}; renderTransferPage(cfg); };
  const trTeacher = teachers ? document.getElementById("tr-teacher") : null;
  if (trTeacher) trTeacher.onchange = (e) => { transferState.teacher = e.target.value; renderTransferPage(cfg); };
  document.getElementById("tr-to").onchange = (e) => { transferState.to = e.target.value; renderTransferPage(cfg); };
  const allBox = document.getElementById("tr-all");
  if (allBox) allBox.onchange = () => {
    list.forEach((s) => { transferState.picked[s.id] = allBox.checked; });
    renderTransferPage(cfg);
  };
  document.querySelectorAll("[data-trp]").forEach((b) => b.onchange = () => {
    transferState.picked[b.dataset.trp] = b.checked;
    renderTransferPage(cfg);
  });
  document.getElementById("tr-go").onclick = () => {
    const chosen = list.filter((s) => transferState.picked[s.id]);
    if (!chosen.length) return;
    const to = transferState.to;
    const ov = openConfirmOverlay(T("app.renderTransferPage_2", { chosen, esc, to, transferState }));
    ov.querySelector("#cf-no").onclick = () => ov.remove();
    ov.querySelector("#cf-ok").onclick = async () => {
      const btn = ov.querySelector("#cf-ok");
      const m = ov.querySelector("#cf-msg");
      btn.disabled = true;
      try {
        await useCases.transferStudents(chosen.map((s) => s.id), to);
        transferState.picked = {};
        ov.remove();
        showToast(`اتنقل ${chosen.length} طالب لـ«${to}» ✅`, "good");
        if (cfg.onTransfer) cfg.onTransfer(chosen.length, transferState.from, to);
        await cfg.onDone();
      } catch (e) { btn.disabled = false; m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
    };
  };
  window.scrollTo(0, 0);
}

/* حذف طالب نهائيًا مع كل بياناته: محاولاته وتقييماته وفهرس تسجيله ومستنده.
   الحذف على دفعات (حد 450 عملية في الباتش الواحد). حساب الدخول في Firebase Auth
   بيفضل يتيم (مفيش حذف لمستخدمين Auth من الكلاينت) لكن من غير مستند ميعملش حاجة. */
const deleteStudentEverywhere = (s) => useCases.deleteStudentEverywhere(s);

/* حذف مدرس من كل حتة: كل محتواه (دروس وكويزات وامتحانات وإعلانات وبنك أسئلة وملاحظات)
   ومحاولات وتقييمات طلابه على محتواه، وشيله من قوائم طلابه، وحذف ملفه ونسخته العامة.
   حسابه في Firebase Auth بيفضل يتيم (زي حذف الطالب) — مفيش حذف Auth من المتصفح. */
export const deleteTeacherEverywhere = (t) => useCases.deleteTeacherEverywhere(t);

/* مودال تأكيد الحذف النهائي — نفس التصميم المتفق عليه: بيوضح إيه اللي هيتحذف قبل التنفيذ */
export function confirmDeleteStudent(s, onDone) {
  const ov = openConfirmOverlay(T("app.confirmDeleteStudent", { esc, s }));
  ov.querySelector("#cd-no").onclick = () => ov.remove();
  ov.querySelector("#cd-ok").onclick = async () => {
    const btn = ov.querySelector("#cd-ok");
    const m = ov.querySelector("#cd-msg");
    btn.disabled = true;
    m.className = "msg"; m.textContent = "بنحذف...";
    try {
      const w = await deleteStudentEverywhere(s);
      ov.remove();
      showToast(`اتحذف ${s.name || "الطالب"} نهائيًا مع ${w.attCount} محاولة و${w.rateCount} تقييم.`, "good");
      await onDone();
    } catch (e) { btn.disabled = false; m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
  };
}


export function waLink(phone, text) {
  let p = String(phone || "").replace(/[^\d]/g, "");
  // توحيد الرقم المصري: 00201... → 201... و 01xxxxxxxxx → 201xxxxxxxxx (كود البلد من غير + ولا صفر)
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "2" + p;
  const t = encodeURIComponent(text);
  // على الموبايل: wa.me بيفتح التطبيق على طول. على الكمبيوتر: web.whatsapp.com/send
  // بيفتح الشات في واتساب ويب مباشرة من غير صفحة وسيطة
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  return isMobile
    ? `https://wa.me/${p}?text=${t}`
    : `https://web.whatsapp.com/send?phone=${p}&text=${t}`;
}



