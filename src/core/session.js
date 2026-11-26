import { route } from "./router.js";
import { clearAdminPinSession } from "../features/auth/admin-pin.js";
import { loadAppSettings } from "../shared/terms.js";
import { roleFromRecords } from "../domain/role.js";
import { getAdmin, getStudent, getTeacher } from "../main/data.js";
import { fbAuth, openFirebaseClient } from "../infrastructure/firebase/client.js";

/* ---------- المصادقة والأدوار ----------
   الأدوار: admin (الأدمن - صاحب المنصة) | teacher (مدرس سجله الأدمن) | student (طالب)
   الطالب: يسجل بياناته من غير باسورد → المدرس يوافق → أول دخول بإيميله + رقمه السري
   ويختار باسورده بنفسه → بعدها دخول عادي إيميل + باسورد. */


/* بوابات الأدوار: كل فولدر (student/ teacher/ admin/) بيحدد T4K_PORTAL و T4K_BASE (مسار الجذر).
   في الجذر الاتنين فاضيين: صفحة الهبوط + دخول عام زي الأول. */
export const PORTAL = (typeof window !== "undefined" && window.T4K_PORTAL) || "";
export const BASE = (typeof window !== "undefined" && window.T4K_BASE) || "";
export const PORTAL_INFO = {
  student: { icon: "🎓", title: "بوابة الطلاب", sub: "سجّل دخولك لدروسك واختباراتك" },
  teacher: { icon: "📚", title: "بوابة المدرسين", sub: "سجّل دخولك لطلابك وتقاريرك" },
  admin: { icon: "🛠️", title: "لوحة الإدارة", sub: "دخول إدارة المنصة" },
};

export { fbAuth } from "../infrastructure/firebase/client.js";
export let fbUser = null;
export let fbReady = false;
export let fbRole = null;      // admin | teacher | student | null
export let fbProfile = null;   // بيانات المدرس أو الطالب

export function initFirebase() {
  openFirebaseClient(FIREBASE_CONFIG);
  fbAuth.onAuthStateChanged(async (u) => {
    fbReady = true;
    fbUser = u;
    fbRole = null;
    fbProfile = null;
    if (u) { await resolveRole(u); await loadAppSettings(); }
    route();
  });
}

export async function resolveRole(u) {
  try {
    const isBaseAdmin = u.email === ADMIN_EMAIL;
    let adminDoc = null, teacher = null, student = null;
    if (!isBaseAdmin) {
      // مشرف إضافي: إيميله مسجل في مجموعة admins
      try { adminDoc = await getAdmin((u.email || "").toLowerCase()); } catch (_) {}
      if (!adminDoc) {
        teacher = await getTeacher(u.uid);
        if (!teacher) student = await getStudent(u.uid);
      }
    }
    const r = roleFromRecords({ uid: u.uid, isBaseAdmin, adminDoc, teacher, student });
    fbRole = r.role;
    if (r.profile) fbProfile = r.profile;
  } catch (e) {
    console.warn("فشل تحديد الدور", e);
    fbRole = "unknown";
  }
}

export function signOut() {
  clearAdminPinSession();
  // نفضّي الجلسة محلياً قبل ما نطلب الخروج من فايربيز: أي إعادة رندر متأخرة لصفحة
  // محمية (زي بوابة الأدمن) هتشوف إن مفيش جلسة فترجع لصفحة الدخول بهدوء، بدل ما
  // تضرب قراءة فايرستور وهي مش مسجلة فتظهر رسالة صلاحيات لحظة الخروج
  fbUser = null;
  fbRole = null;
  fbProfile = null;
  if (location.hash !== "#/login") location.hash = "#/login";
  fbAuth.signOut();
}

export function authErrAr(e) {
  const c = (e && e.code) || "";
  if (c.includes("user-not-found") || c.includes("wrong-password") || c.includes("invalid-credential")) return "الإيميل أو الباسورد غلط.";
  if (c.includes("email-already-in-use")) return "الإيميل ده متسجل قبل كده.";
  if (c.includes("invalid-email")) return "الإيميل مش مكتوب صح.";
  if (c.includes("weak-password")) return "الباسورد ضعيف، خليه 6 حروف أو أرقام على الأقل.";
  if (c.includes("too-many-requests")) return "محاولات كتير، استنى شوية وجرّب تاني.";
  if (c.includes("network")) return "مشكلة في النت، اتأكد من الاتصال وجرّب تاني.";
  return "حصلت مشكلة، جرّب تاني.";
}

export function set_fbRole(v) { return (fbRole = v); }
