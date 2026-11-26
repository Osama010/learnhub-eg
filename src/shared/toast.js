import { fbUser } from "../core/session.js";
import { T } from "../core/templates.js";
import { renderLogin } from "../features/auth/login.js";

/* ---------- رسائل التنبيه في منتصف الشاشة ----------
   كل التحذيرات والرسائل المهمة بتظهر في كارت في نص الشاشة:
   الأخطاء حمرا وبتفضل قدام المستخدم لحد ما يدوس تمام،
   ورسائل النجاح خضرا وبتختفي لوحدها بعد ثواني. */
export function showToast(msg, type) {
  const old = document.querySelector(".toastwrap");
  if (old) old.remove();
  const w = document.createElement("div");
  w.className = "toastwrap";
  const icon = type === "good" ? "✅" : "⚠️";
  w.innerHTML = T("app.showToast", { icon, type });
  w.querySelector(".tmsg").textContent = msg || "";
  const close = () => { if (w.parentNode) w.remove(); };
  w.querySelector("button").onclick = close;
  w.onclick = (e) => { if (e.target === w) close(); };
  document.body.appendChild(w);
  if (type === "good") setTimeout(close, 3500);
}

/* التقاط أي خطأ غير متوقع في الصفحة: يظهر كرسالة مفهومة في النص
   بدل ما الصفحة تضرب، والتفاصيل الفنية بتتسجل في الكونسول للمراجعة */
window.addEventListener("error", (e) => {
  console.error("خطأ غير متوقع:", e.error || e.message);
  if (!fbUser) return; // بعد الخروج: أي خطأ متأخر من جلسة قديمة يتجاهل بهدوء
  showToast("حصل خطأ غير متوقع في الصفحة. حدّث الصفحة وجرّب تاني.", "bad");
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("عملية فشلت من غير التقاط:", e.reason);
  if (!fbUser) return; // بعد الخروج: أي عملية متأخرة من جلسة قديمة تتجاهل بهدوء
  showToast("حصلت مشكلة في الاتصال أو التحميل. جرّب تاني.", "bad");
});

/* حارس الصفحات المحمية: أي رندر متأخر بعد تسجيل الخروج يرجع لصفحة الدخول
   بدل ما يضرب قراءة فايرستور من غير جلسة فيظهر خطأ صلاحيات */
export function bailIfSignedOut() {
  if (fbUser) return false;
  renderLogin();
  return true;
}