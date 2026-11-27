import { esc } from "../../core/utils.js";
import { renewalAlerts, subFmtDate } from "../../domain/subscription.js";
import { waLink } from "../../shared/transfer.js";

/* ---------- تنبيهات تجديد الاشتراكات (أدمن): المنتهي + اللي فاضل له 7 أيام أو أقل، وزرار واتساب برسالة جاهزة.
   الأدمن هو اللي بيدوس إرسال في واتساب بنفسه، المنصة مابتبعتش حاجة لوحدها. ---------- */
export function mountRenewals(anchor, teachers) {
  try {
    const list = renewalAlerts(teachers, new Date());
    if (!list.length) return;
    const box = document.createElement("div");
    box.className = "card tint-amber u-bord4pxsolidvaramber";
    box.innerHTML = '<b>⏳ اشتراكات محتاجة تجديد (' + list.length + ')</b><div class="muted u-fs125px-m006px">منتهية أو فاضل لها 7 أيام أو أقل. دوس «تذكير واتساب» وهيفتح الشات برسالة جاهزة.</div>'
      + list.map((a) => '<div class="btnrow u-justspacebetween" style="margin:8px 0;align-items:center;"><span><b>' + esc(a.teacher.name || "مدرس") + '</b> · ' + (a.expired ? '<span class="chip red">منتهي</span>' : '<span class="chip amber">باقي ' + a.daysLeft + ' يوم</span>') + ' <span class="muted ltr">' + esc(subFmtDate(a.end)) + "</span></span>"
        + (a.teacher.phone ? '<a class="btn sm" target="_blank" rel="noopener" href="' + esc(waLink(a.teacher.phone, a.message)) + '">📲 تذكير واتساب</a>' : '<span class="muted u-fs12px">مفيش رقم واتساب للمدرس</span>') + "</div>").join("");
    (anchor || document.body).insertAdjacentElement(anchor ? "afterend" : "beforeend", box);
  } catch (e) { console.warn("تنبيهات التجديد مش شغالة", e); }
}
