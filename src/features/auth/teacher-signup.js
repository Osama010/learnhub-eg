import { routeByRole } from "../../core/router.js";
import { fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app } from "../../core/utils.js";
import { closing } from "../../shared/common.js";
import { themeCycle, themeIcon } from "../../shared/theme.js";
import { LOGO_FULL_SVG } from "../../shared/topbar.js";
import { createTeacherSignup, isTeacherEmailRegistered, serverNow } from "../../main/data.js";
import { GRADES, gradesOfStage } from "../../domain/student.js";
import { SIGNUP_STAGES, presentTeacherSignup, signupErrorMessage } from "./teacher-signup.presenter.js";

/* ---------- طلب حساب مدرس (Controller): فورم عام من غير دخول، بيتبعت للأدمن يوافق عليه ---------- */
const el = (id) => document.getElementById(id);
function showMsg(t) { const m = el("ts-msg"); if (m) m.textContent = t || ""; }

/** تحديث خانة "كل الصفوف" لكل مرحلة من حالة صفوفها. */
function syncStageBoxes() {
  document.querySelectorAll(".ts-stage-all").forEach((all) => {
    const boxes = Array.from(document.querySelectorAll('.ts-grade[data-stage="' + all.dataset.stage + '"]'));
    all.checked = boxes.length > 0 && boxes.every((b) => b.checked);
  });
}

export async function renderTeacherSignup() {
  try {
    if (fbUser) return routeByRole();
    app.innerHTML = T("auth.renderTeacherSignup", { GRADES, LOGO_FULL_SVG, SIGNUP_STAGES, closing, gradesOfStage, themeIcon });
    el("ts-btn").onclick = doTeacherSignup;
    document.querySelectorAll(".ts-stage-all").forEach((all) => all.onchange = () => {
      document.querySelectorAll('.ts-grade[data-stage="' + all.dataset.stage + '"]').forEach((b) => { b.checked = all.checked; });
    });
    document.querySelectorAll(".ts-grade").forEach((b) => b.onchange = syncStageBoxes);
    document.querySelectorAll("[data-themebtn]").forEach((b) => b.onclick = () => themeCycle());
    window.scrollTo(0, 0);
  } catch (e) {
    console.warn("تعذر عرض فورم طلب المدرس", e);
    app.innerHTML = '<div class="card center u-mw520px-m60pxauto"><p>حصلت مشكلة في تحميل الصفحة. <a href="#/">رجوع</a></p></div>';
  }
}

async function doTeacherSignup() {
  const btn = el("ts-btn");
  try {
    const r = presentTeacherSignup({
      name: el("ts-name").value, email: el("ts-email").value, phone: el("ts-phone").value,
      subject: el("ts-subject").value, bio: el("ts-bio").value, website: el("ts-website").value, promo: (el("ts-promo") || {}).value,
      grades: Array.from(document.querySelectorAll(".ts-grade:checked")).map((b) => b.value),
    });
    if (r.bot) { app.innerHTML = T("auth.doTeacherSignup", { closing }); return; }
    if (r.error) return showMsg(r.error);
    showMsg("");
    btn.disabled = true;
    // الإيميل ده لو مدرس على المنصة فعلًا مفيش داعي للطلب (محاولة مش حرجة: لو القراءة فشلت بنكمّل)
    try {
      if (await isTeacherEmailRegistered(r.values.email)) { btn.disabled = false; return showMsg("الإيميل ده مسجل كمدرس على المنصة بالفعل. ادخل من \"دخول مدرس\"."); }
    } catch (_) {}
    await createTeacherSignup(r.values.email, { ...r.values, status: "pending", createdAt: serverNow() });
    app.innerHTML = T("auth.doTeacherSignup", { closing });
    window.scrollTo(0, 0);
  } catch (e) {
    if (btn) btn.disabled = false;
    showMsg(signupErrorMessage(e));
  }
}
