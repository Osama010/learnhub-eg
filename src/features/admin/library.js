import { fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { adminCache, adminLayout, adminLoad } from "./shell.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { useCases } from "../../main/compose.js";
import { blankLibForm, libFormFrom, libItemDoc, validateLibForm } from "./library.presenter.js";

/* ---------- المكتبة العامة: محتوى من الأدمن يظهر لكل الطلبة ---------- */
let libForm = null; // {id, title, subject, desc, videoUrl, pdfUrl}
function emptyLibForm() { return blankLibForm(); }

function libMsg(txt, ok) {
  const m = document.getElementById("lb-msg");
  m.className = "msg " + (ok ? "good" : "bad"); m.textContent = txt;
}

export function adminLibrary() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!libForm) libForm = emptyLibForm();
  const items = adminCache.library || [];
  const content = T("admin.adminLibrary", { esc, items, libForm });
  adminLayout(content, "library");
  const bind = (id, key) => { document.getElementById(id).oninput = (e) => libForm[key] = e.target.value; };
  bind("lb-title", "title"); bind("lb-subject", "subject"); bind("lb-desc", "desc");
  bind("lb-video", "videoUrl"); bind("lb-pdf", "pdfUrl");
  document.getElementById("lb-save").onclick = adminSaveLibrary;
  const cancel = document.getElementById("lb-cancel");
  if (cancel) cancel.onclick = () => { libForm = emptyLibForm(); adminLibrary(); };
  document.querySelectorAll("[data-lbe]").forEach((b) => b.onclick = () => {
    const it = (adminCache.library || []).find((x) => x.id === b.dataset.lbe);
    if (!it) return;
    libForm = libFormFrom(it);
    adminLibrary();
  });
  document.querySelectorAll("[data-lbd]").forEach((b) => b.onclick = () => adminDeleteLibrary(b.dataset.lbd));
}

async function adminSaveLibrary() {
  const bad = validateLibForm(libForm);
  if (bad) return libMsg(bad);
  const data = libItemDoc(libForm);
  const btn = document.getElementById("lb-save");
  btn.disabled = true;
  try {
    await useCases.saveLibraryItem(libForm.id, data, (fbUser && fbUser.email) || ADMIN_EMAIL);
    libForm = emptyLibForm();
    await adminLoad();
    adminLibrary();
  } catch (e) {
    btn.disabled = false;
    libMsg("مشكلة في الحفظ: " + (e.message || e));
  }
}

async function adminDeleteLibrary(id) {
  const it = (adminCache.library || []).find((x) => x.id === id);
  if (!confirm(`حذف "${(it && it.title) || "المحتوى"}" من المكتبة؟`)) return;
  try {
    await useCases.deleteLibraryItem(id);
    if (libForm && libForm.id === id) libForm = emptyLibForm();
    await adminLoad();
    adminLibrary();
  } catch (e) { alert("مشكلة في الحذف: " + (e.message || e)); }
}