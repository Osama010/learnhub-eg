import { T } from "../core/templates.js";
import { esc } from "../core/utils.js";
import { activeBroadcastText } from "../domain/subscription.js";

/* ---------- اشتراكات المدرسين ----------
   الأدمن بيحدد لكل مدرس نوع اشتراك (مجاني/شهري/بالترم/سنوي) ومبلغ وتاريخ بداية ونهاية.
   المدرسين القدامى (من غير subType) معتبرين مجانيين. المدرس المجاني أو اللي ميعملش
   subType تاريخ نهاية مالوش انتهاء. الانتهاء بيقفل حساب المدرس ومحتواه على طلابه. */



// شرائح عرض حالة الاشتراك في الجداول والتقارير
export function subChip(si) {
  if (si.status === "free") return '<span class="chip gray">مجاني</span>';
  if (si.status === "expired") return '<span class="chip red">منتهي</span>';
  if (si.status === "expiring") return T("app.subChip", { si });
  return '<span class="chip green">نشط</span>';
}




/* الإعلان العام (broadcast): بيرجع نص الإعلان لو ساري للدور ده، أو null.
   المستند الحالي بيتخزن في broadcasts/current وبيحمل نص + جمهور + تاريخ انتهاء. */
/* بانر الإعلان — نفس الشكل في لوحة المدرس والطالب */
export function broadcastBannerHtml(bc, role) {
  const txt = activeBroadcastText(bc, role);
  if (!txt) return "";
  return T("app.broadcastBannerHtml", { esc, txt });
}