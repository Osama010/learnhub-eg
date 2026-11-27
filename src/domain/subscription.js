/* طبقة الدومين (entities + business rules): دوال وثوابت صافية من غير DOM ولا Firebase ولا حالة عامة.
   الطبقة دي ماتستوردش أي حاجة من برّه domain/. */

export const SUB_TYPES = { free: "مجاني", monthly: "شهري", term: "بالترم", year: "سنوي" };

export const SUB_WARN_DAYS = 15; // تحذير "قرب ينتهي" قبل الانتهاء بالأيام دي

// تاريخ نهاية الاشتراك من مستند المدرس (Timestamp أو نص تاريخ أو null)
export function subEndOf(t) {
  const v = t && t.subEnd;
  if (!v) return null;
  if (v.toDate) return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// حالة اشتراك مدرس: free (مجاني) / active (نشط) / expiring (قرب ينتهي) / expired (منتهي)
export function subInfo(t) {
  const type = SUB_TYPES[t && t.subType] ? t.subType : "free";
  if (type === "free") return { type, status: "free", label: SUB_TYPES.free, daysLeft: null, end: null };
  const end = subEndOf(t);
  if (!end) return { type, status: "active", label: SUB_TYPES[type], daysLeft: null, end: null }; // نوع بس من غير تاريخ = من غير انتهاء
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000);
  const status = daysLeft < 0 ? "expired" : daysLeft <= SUB_WARN_DAYS ? "expiring" : "active";
  return { type, status, label: SUB_TYPES[type], daysLeft, end, amount: Number((t && t.subAmount) || 0) };
}

// تاريخ بصيغة yyyy-mm-dd لمدخلات التاريخ، و dd/mm/yyyy للعرض
export function subDateStr(d) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

export function subFmtDate(d) {
  if (!d) return "—";
  return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
}

// تاريخ النهاية الافتراضي حسب نوع الاشتراك من تاريخ بداية معين (شهري +شهر، ترم +4 شهور، سنوي +سنة)
export function subEndDefault(type, startStr) {
  const d = startStr ? new Date(startStr + "T00:00:00") : new Date();
  if (type === "monthly") d.setMonth(d.getMonth() + 1);
  else if (type === "term") d.setMonth(d.getMonth() + 4);
  else if (type === "year") d.setFullYear(d.getFullYear() + 1);
  return subDateStr(d);
}

/* بداية أسبوع النشاط: الجمعة بتبدأ أسبوع لوحة الشرف والنقاط الأسبوعية */
export function weekStartFriday() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() - 5 + 7) % 7; // 5 = الجمعة
  d.setDate(d.getDate() - diff);
  return d;
}

export function activeBroadcastText(bc, role) {
  try {
    if (!bc || !bc.text) return null;
    const until = bc.until && bc.until.toDate ? bc.until.toDate() : null;
    if (until && until <= new Date()) return null;
    if (bc.audience === "teachers" && role !== "teacher" && role !== "admin") return null;
    if (bc.audience === "students" && role !== "student" && role !== "admin") return null;
    return String(bc.text);
  } catch (_) { return null; }
}

export const RENEWAL_ALERT_DAYS = 7; // تنبيه الأدمن بالتجديد: قبل الانتهاء بـ 7 أيام (والمنتهي كمان)

/** رسالة التجديد الجاهزة لمدرس (نص بس، من غير أسعار). */
export function renewalMessage(t, daysLeft, end) {
  const nm = (t && t.name) || "";
  const type = SUB_TYPES[t && t.subType] || "";
  const d = end ? subFmtDate(end) : "";
  const state = daysLeft < 0 ? `انتهى يوم ${d}` : daysLeft === 0 ? `بينتهي النهارده (${d})` : `بينتهي يوم ${d} (فاضل ${daysLeft} يوم)`;
  return `السلام عليكم${nm ? " أ/ " + nm : ""}، اشتراكك${type ? " (" + type + ")" : ""} في منصة المستر ${state}. لو حابب تجدد قولي وأنا أظبطه لحضرتك.`;
}

/** المدرسين اللي محتاجين تجديد: منتهي أو فاضل <= days يوم. الأقرب انتهاءً الأول. المجاني وبدون تاريخ مش بيظهروا. */
export function renewalAlerts(teachers, now, days) {
  const lim = days == null ? RENEWAL_ALERT_DAYS : days, ref = (now || new Date()).getTime();
  const out = [];
  (teachers || []).forEach((t) => {
    if (!t || !SUB_TYPES[t.subType] || t.subType === "free") return;
    const end = subEndOf(t);
    if (!end) return;
    const daysLeft = Math.ceil((end.getTime() - ref) / 86400000);
    if (daysLeft > lim) return;
    out.push({ teacher: t, daysLeft, expired: daysLeft < 0, end, message: renewalMessage(t, daysLeft, end) });
  });
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
