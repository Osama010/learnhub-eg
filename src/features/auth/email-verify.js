import { route } from "../../core/router.js";
import { fbProfile, fbRole, fbUser, resolveRole, set_fbRole, signOut } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { closing } from "../landing/landing.js";
import { themeCycle, themeIcon } from "../../shared/theme.js";
import { LOGO_FULL_SVG } from "../../shared/topbar.js";
import { cooldownSecondsLeft, verifyRequired } from "./email-verify.presenter.js";

/* ---------- بوابة تأكيد الإيميل (للحسابات الجديدة فقط) ----------
   الحسابات الجديدة بس (طالب عمل حسابه من أول دخول، أو مدرس ضافه الأدمن) بيتحط
   في ملفها علامة emailVerifyRequired، ولازم تدوس لينك التفعيل اللي بيتبعت على
   إيميلها قبل ما تدخل. الحسابات القديمة مفيهاش العلامة فبتدخل عادي زي ما هي. */

export function needsEmailVerify() {
  return verifyRequired({ user: fbUser, role: fbRole, profile: fbProfile });
}

// عداد إعادة الإرسال: 60 ثانية بين كل لينك والتاني، محفوظ لكل إيميل
const EV_COOLDOWN_SEC = 60;
let evTimer = null;

function evCooldownLeft(email) {
  try {
    const until = +(localStorage.getItem("evCool:" + email) || 0);
    return cooldownSecondsLeft(until, Date.now());
  } catch (_) { return 0; }
}

export function renderVerifyGate(msg, resent) {
  if (evTimer) { clearInterval(evTimer); evTimer = null; }
  const email = (fbUser && fbUser.email) || "";
  const isTeacher = fbRole === "teacher";
  app.innerHTML = T("auth.renderVerifyGate", { LOGO_FULL_SVG, closing, email, esc, isTeacher, msg, resent, themeIcon });
  document.querySelectorAll("[data-themebtn]").forEach((b) => b.onclick = () => themeCycle());
  window.scrollTo(0, 0);

  // زرار "عملت التفعيل": بنحدّث حالة الحساب من فايربيز — اتفعّل؟ يدخل. لسه؟ رسالة
  document.getElementById("ev-done").onclick = async () => {
    const b = document.getElementById("ev-done");
    b.disabled = true; b.textContent = "بنتأكد...";
    try {
      await fbUser.reload();
      if (fbUser.emailVerified) { await resolveRole(fbUser); route(); return; }
      renderVerifyGate("اللينك لسه ما اتدوسش — بص على إيميلك تاني وبعدين دوس هنا.");
    } catch (e) {
      renderVerifyGate("مشكلة في الاتصال، جرّب تاني.");
    }
  };

  // إعادة الإرسال مع عداد 60 ثانية ضد السبام
  const resBtn = document.getElementById("ev-resend");
  const startCountdown = () => {
    const tick = () => {
      const left = evCooldownLeft(email);
      if (left > 0) {
        resBtn.disabled = true;
        resBtn.textContent = "إعادة الإرسال متاحة بعد " + left + " ثانية";
      } else {
        resBtn.disabled = false;
        resBtn.textContent = "إعادة إرسال اللينك";
        if (evTimer) { clearInterval(evTimer); evTimer = null; }
      }
    };
    tick();
    if (evCooldownLeft(email) > 0) evTimer = setInterval(tick, 1000);
  };
  resBtn.onclick = async () => {
    if (evCooldownLeft(email) > 0) return;
    resBtn.disabled = true; resBtn.textContent = "بنبعت...";
    try {
      await fbUser.sendEmailVerification();
      try { localStorage.setItem("evCool:" + email, String(Date.now() + EV_COOLDOWN_SEC * 1000)); } catch (_) {}
      renderVerifyGate(null, true);
    } catch (e) {
      renderVerifyGate("مشكلة في الإرسال، جرّب تاني بعد شوية.");
    }
  };
  startCountdown();

  document.getElementById("ev-out").onclick = signOut;
}