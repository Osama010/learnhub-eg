/* إعدادات الموقع العامة (قيمة واحدة لكل حاجة). رقم الدعم على واتساب بصيغة دولية من غير + أو أصفار: مصر = 20 + الرقم من غير الصفر.
   لو فضيته زرار الواتساب العايم بيختفي. */
export const SUPPORT_WHATSAPP = "201556655614";
export const SUPPORT_WHATSAPP_TEXT = "السلام عليكم، عندي استفسار عن منصة المستر";
export const supportWhatsAppUrl = () => SUPPORT_WHATSAPP ? "https://wa.me/" + SUPPORT_WHATSAPP + "?text=" + encodeURIComponent(SUPPORT_WHATSAPP_TEXT) : "";

/* فتح الشات مباشرة من غير صفحة wa.me الفاصلة:
   موبايل: whatsapp://send بيفتح التطبيق على الشات علطول (ولو مفيش تطبيق بنرجع للينك العادي بعد لحظة).
   كمبيوتر: web.whatsapp.com/send بيفتح الشات مباشرة. أي فشل = اللينك العادي (href) يشتغل زي ما هو. */
export function waDirect(ev, phone, text) {
  try {
    const p = phone || SUPPORT_WHATSAPP, t = encodeURIComponent(text == null ? SUPPORT_WHATSAPP_TEXT : text);
    if (!p) return;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
    ev.preventDefault();
    if (mobile) {
      const fb = setTimeout(() => { if (!document.hidden) location.href = "https://wa.me/" + p + "?text=" + t; }, 1800);
      document.addEventListener("visibilitychange", () => clearTimeout(fb), { once: true });
      location.href = "whatsapp://send?phone=" + p + "&text=" + t;
    } else {
      window.open("https://web.whatsapp.com/send?phone=" + p + "&text=" + t, "_blank", "noopener");
    }
  } catch (_) { /* الـ href العادي يكمّل */ }
}
