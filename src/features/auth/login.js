import { route } from "../../core/router.js";
import { BASE, PORTAL, PORTAL_INFO, authErrAr, fbProfile, fbRole, resolveRole, set_fbRole } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app } from "../../core/utils.js";
import { loadFooterSettings } from "../about/about.js";
import { aboutState } from "../../shared/about-state.js";
import { closing } from "../../shared/common.js";
import { renderFirstLogin } from "../student/first-login.js";
import { bindPwaCard, pwaInstallCard } from "../../shared/pwa.js";
import { themeCycle, themeIcon } from "../../shared/theme.js";
import { showToast } from "../../shared/toast.js";
import { LOGO_FULL_SVG } from "../../shared/topbar.js";
import { getLookup } from "../../main/data.js";
import { LOGIN_MSG, LOGIN_ROLES, roleMismatchMessage } from "./login.presenter.js";
import { useCases } from "../../main/compose.js";
import { getAdmin } from "../../main/data.js";
import { sendPasswordReset, signInWithPassword, signInWithGoogle, signOutUser } from "../../main/data.js";
import { newGoogleProvider } from "../../main/data.js";

/* ---------- صفحة الدخول: كارت لكل دور ---------- */
let loginRole = "student";

export function renderLogin() {
  if (PORTAL) loginRole = PORTAL;
  // جملة أسفل الصفحة قراءتها عامة: بتتقري async وبتتحدث في مكانها أول ما توصل
  loadFooterSettings().then(() => {
    const c = document.querySelector(".loginwrap .closing");
    if (c) c.textContent = aboutState.footerText;
  });
  const roles = LOGIN_ROLES;
  app.innerHTML = T("auth.renderLogin", { BASE, LOGO_FULL_SVG, PORTAL, PORTAL_INFO, closing, loginRole, pwaInstallCard, roles, themeIcon });
  document.querySelectorAll(".rolecard").forEach((b) => {
    b.onclick = () => {
      loginRole = b.dataset.role;
      document.querySelectorAll(".rolecard").forEach((x) => x.classList.toggle("active", x === b));
      renderLoginForm();
    };
  });
  document.querySelectorAll("[data-themebtn]").forEach((b) => b.onclick = () => themeCycle());
  renderLoginForm();
  bindPwaCard();
  window.scrollTo(0, 0);
}

function renderLoginForm() {
  const el = document.getElementById("login-form");
  if (!el) return;
  if (loginRole === "student") {
    el.innerHTML = T("auth.renderLoginForm");
    document.getElementById("li-btn").onclick = () => doLogin("student");
  } else if (loginRole === "teacher") {
    el.innerHTML = T("auth.renderLoginForm_2");
    document.getElementById("li-btn").onclick = () => doLogin("teacher");
  } else {
    el.innerHTML = T("auth.renderLoginForm_3");
    document.getElementById("li-btn").onclick = () => doLogin("admin");
    document.getElementById("li-google").onclick = doGoogleLogin;
    document.getElementById("li-forgot").onclick = doAdminForgot;
  }
}

async function doAdminForgot() {
  const email = document.getElementById("li-email").value.trim().toLowerCase();
  if (!email) return loginMsg(LOGIN_MSG.needEmailForReset);
  try {
    await sendPasswordReset(email);
    loginMsg(LOGIN_MSG.resetSent, true);
  } catch (e) {
    loginMsg(authErrAr(e));
  }
}

function loginMsg(t, good) {
  const m = document.getElementById("login-msg");
  if (m) { m.textContent = t || ""; m.className = "msg " + (good ? "good" : "bad"); }
  if (t) showToast(t, good ? "good" : "bad");
}

/* ربط الحساب وتنضيف الفهرس بقوا use cases (application/usecases.js). الدالة دي متصدّرة لشاشة أول دخول. */
export const clearLookupPinAfterLink = (email) => useCases.clearLookupPin(email);

const tryRelinkStudent = (email, user) => useCases.relinkStudent(email, user);

async function doLogin(expectedRole) {
  const email = document.getElementById("li-email").value.trim();
  const pass = document.getElementById("li-pass").value;
  if (!email || !pass) return loginMsg(LOGIN_MSG.needCredentials);
  loginMsg("");
  try {
    const cred = await signInWithPassword(email, pass);
    await resolveRole(cred.user);
    // طالب بحساب Auth موجود لكن ملفه مش بنفس الـ uid (حساب قديم أو أول دخول اتقطع في النص):
    // نحاول نربط ملفه بحسابه تلقائياً من الفهرس العام، قبل ما نقول إنه "مش طالب"
    let relinkStage = "";
    if (expectedRole === "student" && fbRole === "unknown") {
      const rel = await tryRelinkStudent(email, cred.user);
      if (rel.ok) await resolveRole(cred.user);
      else relinkStage = rel.stage || "R?";
    }
    if (fbRole !== expectedRole) {
      const blockedSt = fbRole === "blocked" && fbProfile ? fbProfile.status : "";
      await signOutUser();
      return loginMsg(roleMismatchMessage({ expectedRole, role: fbRole, blockedStatus: blockedSt, relinkStage, portal: PORTAL }));
    }
    // دخول طالب ناجح: لو فهرسه لسه شايل الرقم السري (حسابات اتربطت قبل التنضيف)
    // ننضّفه دلوقتي، عشان أي باسورد غلط بعد كده ما يرجّعوش لشاشة التسجيل
    if (expectedRole === "student") await clearLookupPinAfterLink(email);
    route();
  } catch (e) {
    // طالب جديد بعد القبول؟ لو لسه معملش باسورد، نوديه يختاره بالرقم السري
    if (expectedRole === "student") {
      try {
        const lk = await getLookup(email.toLowerCase());
        if (lk && lk.status === "approved" && lk.pinHash) {
          return renderFirstLogin(email.toLowerCase());
        }
        // تحذير دقيق: الإيميل مش مسجل أصلاً كطالب (الفهرس العام مقروء قبل الدخول)
        if (!lk) {
          return loginMsg(LOGIN_MSG.notStudent);
        }
      } catch (_) {}
    }
    // تحذير دقيق للمدرس: ندور على إيميله في النسخة العامة من بيانات المدرسين
    if (expectedRole === "teacher") {
      try {
        const registered = await useCases.isTeacherEmailRegistered(email.toLowerCase());
        if (!registered) return loginMsg(LOGIN_MSG.notTeacher);
      } catch (_) {}
    }
    loginMsg(authErrAr(e));
  }
}

async function doGoogleLogin() {
  loginMsg("");
  try {
    const provider = newGoogleProvider();
    const cred = await signInWithGoogle(provider);
    let isAdm = cred.user.email === ADMIN_EMAIL;
    if (!isAdm) {
      try {
        isAdm = !!(await getAdmin((cred.user.email || "").toLowerCase()));
      } catch (_) {}
    }
    if (!isAdm) {
      await signOutUser();
      return loginMsg(LOGIN_MSG.notAdmin);
    }
    set_fbRole("admin");
    route();
  } catch (e) {
    if (e && e.code !== "auth/popup-closed-by-user") loginMsg(authErrAr(e));
  }
}