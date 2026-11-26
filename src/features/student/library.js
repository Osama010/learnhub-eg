import { fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { bindStudentTabs, studentData, studentLoadAll, studentTabs } from "./shell.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { libraryItems } from "./library.presenter.js";
import { videoEmbed } from "../../domain/media.js";

/* ---------- تاب المكتبة: المحتوى العام اللي الأدمن بينزله لكل الطلبة ---------- */
function sLibraryCard(it) {
  const emb = it.videoUrl ? videoEmbed(it.videoUrl) : null;
  return T("student.sLibraryCard", { emb, esc, it });
}
export async function renderStudentLibrary() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("student.renderStudentLibrary");
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = T("student.renderStudentLibrary_2", { e, esc }); return; }
  const items = libraryItems(studentData);
  app.innerHTML = T("student.renderStudentLibrary_3", { closing, items, sLibraryCard, studentTabs });
  bindStudentTabs();
  window.scrollTo(0, 0);
}