import { fbProfile, fbRole, set_fbRole, signOut } from "../core/session.js";
import { T } from "../core/templates.js";
import { app } from "../core/utils.js";
import { aboutPageHtml, loadAboutSettings, loadFooterSettings } from "../features/about/about.js";
import { renderLogin } from "../features/auth/login.js";
import { closing } from "./common.js";
import { bindPlatNav, platNavHtml } from "./theme.js";
import { bailIfSignedOut } from "./toast.js";
import { subFmtDate, subInfo } from "../domain/subscription.js";

/* ---------- تثبيت المنصة كتطبيق (PWA) ----------
   بنلقط حدث التثبيت ونحفظه، وبنظهر كارت «ثبّت التطبيق» في صفحة الدخول.
   على الآيفون مفيش حدث تثبيت — بنظهر تعليمات الإضافة من قائمة المشاركة بداله. */
var deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstallPrompt = e; });
function isIOS() { return /iphone|ipad|ipod/i.test((typeof navigator !== "undefined" && navigator.userAgent) || ""); }
function isStandalone() { return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || ((window.navigator || {}).standalone === true); }
export const pwaIsIOS = isIOS;
export const pwaIsStandalone = isStandalone;
export const pwaCanPrompt = () => !!deferredInstallPrompt;
export async function pwaPrompt() {
  if (!deferredInstallPrompt) return false;
  deferredInstallPrompt.prompt();
  try { await deferredInstallPrompt.userChoice; } catch (_) {}
  deferredInstallPrompt = null;
  return true;
}
export function pwaInstallCard() {
  if (isStandalone() || localStorage.getItem("pwaDismissed") === "1") return "";
  if (deferredInstallPrompt) {
    return T("app.pwaInstallCard");
  }
  if (isIOS()) {
    return T("app.pwaInstallCard_2");
  }
  return "";
}
export function bindPwaCard() {
  const i = document.getElementById("pwa-install");
  if (i) i.onclick = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch (_) {}
    deferredInstallPrompt = null;
    renderLogin();
  };
  const d = document.getElementById("pwa-dismiss");
  if (d) d.onclick = () => { localStorage.setItem("pwaDismissed", "1"); renderLogin(); };
}

/* شاشة المدرس الموقوف من الأدمن — لو دخل وهو موقوف يشوف الرسالة دي بدل لوحته */
export function renderTeacherSuspended() {
  if (bailIfSignedOut()) return;
  app.innerHTML = T("app.renderTeacherSuspended", { closing });
  document.getElementById("so").onclick = signOut;
}

/* شاشة المدرس اللي اشتراكه انتهى — يشوف الرسالة دي بدل لوحته، ومحتواه بيتقفل على طلابه */
export function renderTeacherSubExpired() {
  if (bailIfSignedOut()) return;
  const si = subInfo(fbProfile || {});
  app.innerHTML = T("app.renderTeacherSubExpired", { closing, si, subFmtDate });
  document.getElementById("so").onclick = signOut;
}

/* صفحة «نبذة عن المهندس»: تاب مستقل متاح لكل الأدوار، محتواه من settings/about */
export async function renderAboutPage() {
  if (bailIfSignedOut()) return;
  await Promise.all([loadAboutSettings(), loadFooterSettings()]);
  const profHash = fbRole === "admin" ? "#/admin/profile" : fbRole === "teacher" ? "#/teacher/profile" : "#/student/profile";
  const backHash = fbRole === "admin" ? "#/admin" : fbRole === "teacher" ? "#/teacher" : "#/student";
  const nm = (fbProfile && (fbProfile.name || "")) || "";
  const av = (fbProfile && (fbProfile.avatar || fbProfile.photoData)) || "";
  app.innerHTML = T("app.renderAboutPage", { aboutPageHtml, av, closing, nm, platNavHtml, profHash });
  bindPlatNav();
  document.getElementById("ab-back").onclick = () => { location.hash = backHash; };
  window.scrollTo(0, 0);
}