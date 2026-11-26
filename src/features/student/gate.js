import { fbProfile, fbRole, set_fbRole, signOut } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app } from "../../core/utils.js";
import { closing } from "../landing/landing.js";
import { renderParentPhoneGate } from "./first-login.js";
import { renderStudentDash } from "./home.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { studentGateView } from "./gate.presenter.js";

/* ---------- بوابة الطالب ----------
   أول دخول بعد القبول: إيميل + الرقم السري → يختار باسورده → دخول عادي.
   لو عنده حساب Auth من غير باسورد معروف، الرقم السري بيأكد هويته. */

export async function renderStudentHome() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const gate = studentGateView({ role: fbRole, profile: fbProfile });
  if (gate.view === "blocked") {
    const st = gate.status;
    const isSus = gate.suspended;
    app.innerHTML = T("student.renderStudentHome", { closing, isSus, st });
    document.getElementById("so").onclick = signOut;
    return;
  }
  if (gate.view === "unknown") {
    app.innerHTML = T("student.renderStudentHome_2", { closing });
    document.getElementById("so").onclick = signOut;
    return;
  }
  // طالب قديم من غير رقم ولي أمر؟ شاشة إلزامية قبل أي صفحة تانية لحد ما يسجله
  if (gate.view === "parent-phone") return renderParentPhoneGate();
  return renderStudentDash();
}