import { fbRole, fbUser, set_fbRole, signOut } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderAdmin } from "../admin/shell.js";
import { renderLogin } from "./login.js";
import { useCases } from "../../main/compose.js";
import { pinFailure, validateNewAdminPin } from "./admin-pin.presenter.js";
import { closing } from "../../shared/common.js";

/* ---------- حماية جلسة الأدمن: رقم سري (PIN) + خروج تلقائي عند الخمول ----------
   بعد دخول الأدمن (بجوجل أو بالباسورد) لازم يكتب رقمه السري قبل ما اللوحة تفتح.
   أول مرة بيختار الرقم بنفسه وبيتحفظ مشفّر (SHA-256) في مستنده في مجموعة admins.
   فتح اللوحة بيفضل ساري في التاب الحالي بس (sessionStorage)، ويقفل بقفل التاب.
   وكمان خروج تلقائي بعد 15 دقيقة من غير أي نشاط، وخروج إجباري بعد 5 محاولات غلط. */

const ADMIN_IDLE_MINUTES = 15;
let adminIdleTimer = null;
let adminPinFails = 0;

export function adminPinOk() {
  return !!fbUser && sessionStorage.getItem("admPinOk") === (fbUser.email || "");
}

export function clearAdminPinSession() {
  sessionStorage.removeItem("admPinOk");
  adminPinFails = 0;
  stopIdleWatch();
}

function startIdleWatch() {
  stopIdleWatch();
  if (fbRole !== "admin") return;
  const reset = () => {
    if (adminIdleTimer) clearTimeout(adminIdleTimer);
    adminIdleTimer = setTimeout(() => {
      alert("اتسجّل خروجك تلقائياً بعد " + ADMIN_IDLE_MINUTES + " دقيقة من غير نشاط، حمايةً للوحة الأدمن.");
      signOut();
    }, ADMIN_IDLE_MINUTES * 60 * 1000);
  };
  ["click", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, reset, { passive: true }));
  startIdleWatch._reset = reset;
  reset();
}

function stopIdleWatch() {
  if (adminIdleTimer) { clearTimeout(adminIdleTimer); adminIdleTimer = null; }
  if (startIdleWatch._reset) {
    ["click", "keydown", "touchstart"].forEach((ev) => document.removeEventListener(ev, startIdleWatch._reset));
    startIdleWatch._reset = null;
  }
}

export async function renderAdminPinGate(afterHash) {
  // الجلسة اتقفلت (خروج): منعرضش البوابة ولا نقرا من فايرستور — نرجع للدخول
  if (!fbUser) { renderLogin(); return; }
  const email = ((fbUser && fbUser.email) || "").toLowerCase();
  let doc = null;
  let hasPin = false;
  let loadErr = null;
  try {
    ({ doc, hasPin } = await useCases.loadAdminPinState(email));
  } catch (e) { loadErr = e; }

  app.innerHTML = T("auth.renderAdminPinGate", { closing, email, esc, hasPin, loadErr });

  if (loadErr) return;
  const msg = (t) => { const m = document.getElementById("apg-msg"); if (m) m.textContent = t || ""; };
  document.getElementById("apg-btn").onclick = async () => {
    msg("");
    if (hasPin) {
      const pin = document.getElementById("apg-pin").value.trim();
      if (!pin) return msg("اكتب الرقم السري.");
      if (await useCases.verifyAdminPin(email, doc, pin)) {
        sessionStorage.setItem("admPinOk", fbUser.email);
        adminPinFails = 0;
        startIdleWatch();
        renderAdmin(afterHash || "#/admin");
      } else {
        const f = pinFailure(adminPinFails);
        adminPinFails = f.fails;
        if (f.lockout) {
          alert("محاولات كتير غلط. اتسجّل خروجك حمايةً للوحة الأدمن.");
          signOut();
          return;
        }
        msg(f.message);
      }
    } else {
      const p1 = document.getElementById("apg-pin1").value.trim();
      const p2 = document.getElementById("apg-pin2").value.trim();
      const verr = validateNewAdminPin(p1, p2);
      if (verr) return msg(verr);
      try {
        await useCases.setAdminPin(email, doc, p1);
        sessionStorage.setItem("admPinOk", fbUser.email);
        startIdleWatch();
        renderAdmin(afterHash || "#/admin");
      } catch (e) {
        msg("حصلت مشكلة في الحفظ: " + (e.message || e));
      }
    }
  };
}
