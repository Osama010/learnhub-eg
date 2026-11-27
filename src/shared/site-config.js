/* إعدادات الموقع العامة (قيمة واحدة لكل حاجة). رقم الدعم على واتساب بصيغة دولية من غير + أو أصفار: مصر = 20 + الرقم من غير الصفر.
   لو فضيته زرار الواتساب العايم بيختفي. */
export const SUPPORT_WHATSAPP = "201556655614";
export const SUPPORT_WHATSAPP_TEXT = "السلام عليكم، عندي استفسار عن منصة المستر";
export const supportWhatsAppUrl = () => SUPPORT_WHATSAPP ? "https://wa.me/" + SUPPORT_WHATSAPP + "?text=" + encodeURIComponent(SUPPORT_WHATSAPP_TEXT) : "";
