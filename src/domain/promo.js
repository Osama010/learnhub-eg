/* أكواد التجربة والخصم للمدرسين الجداد: دوال صافية. الكود بيتكتب في طلب التسجيل، والأدمن بيراجعه وهو بيقبل الطلب. */
export const PROMO_KINDS = { trial: "تجربة مجانية", discount: "خصم" };
const DAY = 86400000;

/** الكود بحروف إنجليزي كبيرة وأرقام و _ - بس، لحد 20 حرف. */
export function normalizeCode(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 20); }

/** raw من فورم الأدمن. {error} أو {doc} (من غير uses/createdAt). */
export function validatePromo(raw) {
  const code = normalizeCode(raw && raw.code);
  if (code.length < 3) return { error: "الكود لازم 3 حروف أو أرقام إنجليزي على الأقل." };
  const kind = raw && raw.kind === "discount" ? "discount" : "trial";
  const maxUses = Math.floor(Number(raw && raw.maxUses) || 0);
  if (maxUses < 0 || maxUses > 100000) return { error: "عدد مرات الاستخدام مش صح (0 يعني من غير حد)." };
  const note = String((raw && raw.note) || "").trim().slice(0, 80);
  const doc = { code, kind, maxUses, note, active: true, expiresAt: raw && raw.expiresAt ? String(raw.expiresAt) : "" };
  if (doc.expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(doc.expiresAt)) return { error: "تاريخ الانتهاء مش صح." };
  if (kind === "trial") {
    const d = Math.floor(Number(raw && raw.value));
    if (!(d >= 1 && d <= 90)) return { error: "أيام التجربة من 1 لـ 90." };
    doc.trialDays = d;
  } else {
    const p = Math.floor(Number(raw && raw.value));
    if (!(p >= 1 && p <= 100)) return { error: "نسبة الخصم من 1 لـ 100." };
    doc.discountPct = p;
  }
  return { doc };
}

/** حالة الكود: {ok, why}. */
export function promoStatus(doc, nowMs) {
  if (!doc) return { ok: false, why: "الكود ده مش موجود." };
  if (doc.active === false) return { ok: false, why: "الكود موقوف." };
  if (doc.expiresAt && nowMs > new Date(doc.expiresAt + "T23:59:59").getTime()) return { ok: false, why: "الكود انتهى." };
  if (doc.maxUses > 0 && (doc.uses || 0) >= doc.maxUses) return { ok: false, why: "الكود اتستخدم للحد الأقصى." };
  return { ok: true, why: "" };
}
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
/** تعبئة الاشتراك لكود تجربة: اشتراك شهري بمبلغ صفر لعدد أيام الكود. */
export function trialSubData(doc, today) {
  const start = new Date(today + "T00:00:00");
  return { subType: "monthly", subStart: today, subEnd: ymd(new Date(start.getTime() + (doc.trialDays - 1) * DAY + 3600000)), subAmount: 0 };
}
export const promoLabel = (d) => d.kind === "trial" ? "تجربة " + d.trialDays + " يوم" : "خصم " + d.discountPct + "%";
