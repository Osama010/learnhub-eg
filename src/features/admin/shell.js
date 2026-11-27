import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { aboutTeaserHtml, bindAboutTeaser, loadAboutSettings, loadFooterSettings } from "../about/about.js";
import { adminProfile } from "./account.js";
import { adminAdmins } from "./admins.js";
import { adminAnalytics } from "./analytics.js";
import { adminLibrary } from "./library.js";
import { adminLogPage, adminStats } from "./log.js";
import { adminReports } from "./reports.js";
import { adminSubjects } from "./subjects.js";
import { adminStudents, adminTransferPage, renderAdminTeacherContent } from "./teacher-content.js";
import { adminTeachers } from "./teachers.js";
import { adminPinOk, renderAdminPinGate } from "../auth/admin-pin.js";
import { closing } from "../../shared/common.js";
import { bindPlatNav, platNavHtml } from "../../shared/theme.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { addAdminLog, listSubjects, listAdmins, listLibraryNewestFirst, listPayments, listAdminLog, getBroadcast, setAdmin } from "../../main/data.js";
import { listTeachersNewestFirst, listTeachersPublic, batchSetTeacherPublic, batchUpdateTeacherPublic } from "../../main/data.js";
import { listAllStudentsNewestFirst, listTeacherSignups } from "../../main/data.js";
import { newBatch } from "../../main/data.js";
import { SUB_TYPES } from "../../domain/subscription.js";
import { serverNow } from "../../main/data.js";
import { adminTabOf, buildLogEntry, buildPaymentDoc, planPublicSync, sortSubjectsByStage } from "./shell.presenter.js";

/* ---------- لوحة الأدمن ----------
   يضيف مدرسين (بإنشاء حسابهم في Firebase Auth) ويقدر يعطّلهم أو يشطبهم.
   تقرير الطلاب بعدد طلاب كل مدرس ومستوى كل طالب في كل مادة. */

export let adminCache = { signups: [], signupsError: "", teachers: null, students: null, subjects: null, admins: null, library: null, payments: null, log: null, broadcast: null };

/* سجل نشاط الأدمن: بيتكتب مع كل حركة حساسة — نار ونسيان، فشل التسجيل ميوقفش الحركة */
export function adminLogAction(action, targetType, targetId, targetName, details) {
  try {
    addAdminLog(buildLogEntry({
      action, targetType, targetId, targetName, details,
      by: (fbProfile && fbProfile.name) || (fbUser && fbUser.email) || "الأدمن",
      at: serverNow(),
    })).catch((e) => console.warn("فشل تسجيل الحركة في السجل", e));
  } catch (_) {}
}

/* تسجيل دفعة اشتراك مدرس (تلقائي مع التجديد أو يدوي من صفحة المدرس) */
export function makePayment(t, subData, note) {
  const data = buildPaymentDoc({ teacher: t, sub: subData, note, paidAt: serverNow(), recordedBy: (fbProfile && fbProfile.name) || (fbUser && fbUser.email) || "الأدمن" });
  adminLogAction("تسجيل دفعة", "teacher", t.id, t.name || "", `${SUB_TYPES[subData.subType] || subData.subType} — ${data.amount} ج${note ? " — " + note : ""}`);
  return data;
}

export async function adminLoad() {
  const [t, s, sub, adm, lib, pay, lg, bc] = await Promise.all([
    listTeachersNewestFirst(),
    listAllStudentsNewestFirst(),
    listSubjects(),
    listAdmins(),
    listLibraryNewestFirst(),
    listPayments(),
    listAdminLog(),
    getBroadcast(),
  ]);
  // طلبات المدرسين الجداد: قراءة منفصلة، لو القواعد لسه متنشرتش اللوحة كلها تفضل شغالة
  try {
    adminCache.signups = (await listTeacherSignups()).filter((g) => g.status === "pending");
    adminCache.signupsError = "";
  } catch (e) { adminCache.signups = []; adminCache.signupsError = (e && (e.code || e.message)) || "خطأ"; console.warn("تعذر تحميل طلبات المدرسين", e); }
  adminCache.payments = pay;
  adminCache.log = lg;
  adminCache.broadcast = bc;
  await Promise.all([loadAboutSettings(), loadFooterSettings()]); // النبذة وجملة الأسفل
  adminCache.teachers = t;
  adminCache.students = s;
  adminCache.subjects = sortSubjectsByStage(sub);
  adminCache.admins = adm;
  adminCache.library = lib;
  // مزامنة النسخة العامة من بيانات المدرسين: الإيميل (لتحذير "مش مسجل" في صفحة الدخول)
  // والصورة (بتظهر لطلاب المدرس) — تعبئة تلقائية للمدرسين الموجودين من قبل الميزة
  try {
    const pubs = await listTeachersPublic();
    const plan = planPublicSync(adminCache.teachers, pubs);
    const batch = newBatch();
    plan.creates.forEach((c) => batchSetTeacherPublic(batch, c.id, c.data));
    plan.fixes.forEach((f) => batchUpdateTeacherPublic(batch, f.id, f.fix));
    if (plan.creates.length + plan.fixes.length) await batch.commit();
  } catch (e) { console.warn("مزامنة النسخة العامة للمدرسين فشلت", e); }
  // أول تشغيل: سجّل الأدمن الأساسي في المجموعة لو مش موجود
  if (fbUser && fbUser.email === ADMIN_EMAIL && !adminCache.admins.some((a) => a.id === ADMIN_EMAIL)) {
    const doc = { email: ADMIN_EMAIL, name: "الأدمن الأساسي", addedAt: serverNow(), addedBy: "النظام" };
    await setAdmin(ADMIN_EMAIL, doc);
    adminCache.admins.unshift({ id: ADMIN_EMAIL, ...doc, addedAt: null });
  }
}

export function adminLayout(content, tab) {
  const myEmail = ((fbUser && fbUser.email) || "").toLowerCase();
  const me = (adminCache.admins || []).find((a) => a.id === myEmail);
  const myName = (me && me.name) || (myEmail === ADMIN_EMAIL ? "الأدمن الأساسي" : "مشرف");
  app.innerHTML = T("admin.adminLayout", { aboutTeaserHtml, closing, content, myName, platNavHtml, tab });
  document.querySelectorAll(".tab[data-g]").forEach((b) => b.onclick = () => location.hash = b.dataset.g);
  bindPlatNav();
  bindAboutTeaser();
  window.scrollTo(0, 0);
}

export async function renderAdmin(h) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  // بوابة الرقم السري قبل أي تحميل لبيانات اللوحة
  if (!adminPinOk()) return renderAdminPinGate(h);
  app.innerHTML = T("admin.renderAdmin");
  try { await adminLoad(); }
  catch (e) { app.innerHTML = T("admin.renderAdmin_2", { e, esc }); return; }
  if (h.startsWith("#/admin/teacher-content/")) {
    const tid = decodeURIComponent(h.slice("#/admin/teacher-content/".length));
    return renderAdminTeacherContent(tid);
  }
  const tab = adminTabOf(h);
  if (tab === "profile") return adminProfile();
  if (tab === "transfer") return adminTransferPage();
  if (tab === "teachers") return adminTeachers();
  if (tab === "students") return adminStudents();
  if (tab === "subjects") return adminSubjects();
  if (tab === "library") return adminLibrary();
  if (tab === "reports") return adminReports();
  if (tab === "analytics") return adminAnalytics();
  if (tab === "log") return adminLogPage();
  if (tab === "admins") return adminAdmins();
  return adminStats();
}