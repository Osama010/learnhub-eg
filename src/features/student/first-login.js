import { route } from "../../core/router.js";
import { authErrAr, fbProfile, fbUser, resolveRole } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { clearLookupPinAfterLink, renderLogin } from "../auth/login.js";
import { useCases } from "../../main/compose.js";
import { EMAIL_IN_USE_MSG, PARENT_PHONE_MSG, presentParentPhone, validateFirstLogin } from "./first-login.presenter.js";
import { closing } from "../../shared/common.js";
import { renderStudentHome } from "./gate.js";
import { showToast } from "../../shared/toast.js";
import { currentAuthUser, sendPasswordReset } from "../../main/data.js";

/* شاشة إلزامية: تسجيل رقم ولي الأمر للطلبة المسجلين قبل إضافة الحقل.
   بتظهر عند كل دخول لحد ما الرقم يتحفظ — مفيش تخطي. */
export function renderParentPhoneGate() {
  app.innerHTML = T("student.renderParentPhoneGate", { closing });
  document.getElementById("pp-save").onclick = async () => {
    const v = presentParentPhone(document.getElementById("pp-phone").value);
    const m = document.getElementById("pp-msg");
    if (!v) { m.textContent = PARENT_PHONE_MSG; return; }
    const btn = document.getElementById("pp-save");
    btn.disabled = true;
    try {
      await useCases.saveParentPhone(fbUser.uid, v);
      if (fbProfile) fbProfile.parentPhone = v;
      renderStudentHome();
    } catch (e) {
      btn.disabled = false;
      m.textContent = "حصلت مشكلة: " + (e.message || e);
    }
  };
  window.scrollTo(0, 0);
}

/* أول دخول بالرقم السري: بعد تسجيل الدخول المؤقت بالإيميل فقط ما ينفعش
   من غير باسورد، فالحل: الطالب يكتب إيميله ورقمه السري، نتأكد من الرقم السري
   من Firestore، وبعدين نعمله حساب Auth بباسورد يختاره. لأن إنشاء حساب Auth
   من المتصفح بيعمل تسجيل دخول تلقائي، ننفذه بعد ما نتأكد من البيانات. */

const studentFirstLogin = (email, pin, newPass) => useCases.completeFirstLogin(email, pin, newPass);

/* هل الطالب عنده حساب Auth أصلاً؟ نحاول تسجيل الدخول العادي، ولو فشل
   بسبب كلمة السر وعنده pinHash نعرض له شاشة اختيار باسورد. */
let firstLoginEmail = "";

export function renderFirstLogin(email) {
  firstLoginEmail = email;
  app.innerHTML = T("student.renderFirstLogin", { closing, email, esc });
  document.getElementById("fl-btn").onclick = async () => {
    const pin = document.getElementById("fl-pin").value.trim();
    const p1 = document.getElementById("fl-pass1").value;
    const p2 = document.getElementById("fl-pass2").value;
    const m = document.getElementById("fl-msg");
    const flm = (t) => { m.textContent = t; showToast(t, "bad"); };
    m.textContent = "";
    const verr = validateFirstLogin({ pin, pass1: p1, pass2: p2 });
    if (verr) return flm(verr);
    try {
      await studentFirstLogin(email, pin, p1);
      await resolveRole(currentAuthUser());
      route();
    } catch (e) {
      // عندها حساب Auth قديم بنفس الإيميل (من ربط سابق اتمسح ملفه): نبعت لينك إعادة ضبط
      // وبعد ما تدخل بالباسورد الجديد، صفحة الدخول بتربط ملفها بحسابها تلقائياً
      if (e && e.code === "auth/email-already-in-use") {
        try {
          await sendPasswordReset(email.toLowerCase());
          flm(EMAIL_IN_USE_MSG);
        } catch (_) { flm(authErrAr(e)); }
        return;
      }
      flm(e.code ? authErrAr(e) : (e.message || "حصلت مشكلة."));
    }
  };
  // الرابط وجهته #/login واحنا أصلاً عليها، فالهاش مبيتغيرش ومفيش حدث بيشتغل —
  // لازم نرسم صفحة الدخول بأنفسنا بدل ما نستنى hashchange مش هيجي أبداً
  document.getElementById("fl-back").onclick = (e) => { e.preventDefault(); renderLogin(); };
  window.scrollTo(0, 0);
}