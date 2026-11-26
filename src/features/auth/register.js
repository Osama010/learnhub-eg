import { routeByRole } from "../../core/router.js";
import { fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { closing } from "../landing/landing.js";
import { themeCycle, themeIcon } from "../../shared/theme.js";
import { LOGO_FULL_SVG } from "../../shared/topbar.js";
import { listActiveTeachersPublic } from "../../main/data.js";
import { GRADES } from "../../domain/student.js";
import { presentRegistration, REG_DUPLICATE_MSG } from "./register.presenter.js";
import { filterRegTeachers, preselectTeacher, readRegisterForm, showRegMessage } from "./register.view.js";
import { useCases } from "../../main/compose.js";
import { DuplicateEmailError } from "../../application/usecases.js";

/* ---------- تسجيل طالب جديد (Controller): بيربط الـ view بالـ presenter والـ use case ---------- */
let regTeachersCache = null;

export async function renderRegister() {
  if (fbUser) return routeByRole();
  app.innerHTML = T("auth.renderRegister");
  if (!regTeachersCache) {
    try {
      const snap = await listActiveTeachersPublic();
      regTeachersCache = snap;
    } catch (e) { regTeachersCache = []; }
  }
  app.innerHTML = T("auth.renderRegister_2", { GRADES, LOGO_FULL_SVG, closing, esc, regTeachersCache, themeIcon });
  document.getElementById("rg-btn").onclick = doRegister;
  document.getElementById("rg-grade").onchange = filterRegTeachers;
  preselectTeacher();
  document.querySelectorAll("[data-themebtn]").forEach((b) => b.onclick = () => themeCycle());
  window.scrollTo(0, 0);
}

async function doRegister() {
  const r = presentRegistration(readRegisterForm());
  if (r.error) return showRegMessage(r.error);
  showRegMessage("");
  try {
    await useCases.registerStudent(r.values);
    app.innerHTML = T("auth.doRegister", { closing });
  } catch (e) {
    if (e instanceof DuplicateEmailError) return showRegMessage(REG_DUPLICATE_MSG);
    showRegMessage("حصلت مشكلة في التسجيل: " + (e.message || e));
  }
}
