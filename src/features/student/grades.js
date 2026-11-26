import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../landing/landing.js";
import { bindStudentTabs, studentData, studentLoadAll, studentTabs } from "./shell.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { fmtTs } from "../../domain/format.js";
import { buildGradesModel } from "./grades.presenter.js";

/* ---------- تاب درجاتي ---------- */
export async function renderStudentGrades() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("student.renderStudentGrades");
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = T("student.renderStudentGrades_2", { e, esc }); return; }
  const myGrade = (fbProfile && fbProfile.grade) || "";
  const { atts, avg, nameFor } = buildGradesModel({ data: studentData, grade: myGrade });
  app.innerHTML = T("student.renderStudentGrades_3", { atts, avg, closing, esc, fbProfile, fmtTs, nameFor, studentTabs });
  bindStudentTabs();
  window.scrollTo(0, 0);
}