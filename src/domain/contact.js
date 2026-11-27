/* التواصل مع المدرس خارج المنصة (واتساب/تليجرام): دوال صافية. صفر استهلاك: المنصة بتفتح اللينك بس ومبتخزّنش رسايل. */
export const GROUP_RE = /^https:\/\/(chat\.whatsapp\.com|wa\.me|t\.me|telegram\.me|telegram\.dog)\/\S+$/i;
/** رقم مصري أو دولي → أرقام بس بكود الدولة (مثال 01012345678 → 201012345678). بيرجّع "" لو مش منطقي. */
export function normalizePhone(raw) {
  let d = String(raw || "").replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "20" + d.slice(1);
  return d.length >= 11 && d.length <= 15 ? d : "";
}
export function validateContact({ phone, groupLink, on }) {
  const p = String(phone || "").trim(), g = String(groupLink || "").trim();
  if (!p && !g) return { error: "اكتب رقم واتساب أو لينك جروب (واحد منهم على الأقل)." };
  const np = p ? normalizePhone(p) : "";
  if (p && !np) return { error: "رقم الواتساب مش صحيح. اكتبه كده: 01012345678" };
  if (g && (g.length > 200 || !GROUP_RE.test(g))) return { error: "لينك الجروب لازم يبدأ بـ https:// ويكون من واتساب أو تليجرام." };
  return { doc: { phone: np, groupLink: g, on: on === true } };
}
export const waLink = (phone, text) => "https://wa.me/" + phone + (text ? "?text=" + encodeURIComponent(text) : "");
export const waMessage = (student, teacher) => "السلام عليكم أستاذ " + (teacher || "") + "، أنا " + (student || "طالب") + " من طلابك على منصة المستر.";
/** موديل العرض للطالب: بيتأكد من الأنواع لأن المستند جاي من الشبكة. */
export function contactView(doc) {
  if (!doc || doc.on !== true) return null;
  const phone = /^\d{11,15}$/.test(String(doc.phone || "")) ? String(doc.phone) : "";
  const group = GROUP_RE.test(String(doc.groupLink || "")) ? String(doc.groupLink) : "";
  return phone || group ? { phone, group } : null;
}
