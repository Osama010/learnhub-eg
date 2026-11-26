import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../landing/landing.js";
import { bindStudentTabs, sSuspendedSet, sTeacherChip, sVisible, studentData, studentLoadAll, studentTabs } from "./shell.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { fmtTs } from "../../domain/format.js";
import { studentAnnouncements } from "./announcements.presenter.js";

/* ---------- تاب الإعلانات ---------- */
export async function renderStudentAnn() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("student.renderStudentAnn");
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = T("student.renderStudentAnn_2", { e, esc }); return; }
  // إعلانات المدرس الموقوف عن الطالب ما تظهرش له
  const list = studentAnnouncements({ data: studentData, rules: { visible: sVisible, suspended: sSuspendedSet } });
  app.innerHTML = T("student.renderStudentAnn_3", { closing, esc, fbProfile, fmtTs, list, sTeacherChip, studentTabs });
  bindStudentTabs();
  window.scrollTo(0, 0);
}