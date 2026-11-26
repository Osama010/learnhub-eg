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
