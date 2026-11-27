import { fbProfile, fbUser } from "../../core/session.js";
import { showToast } from "../../shared/toast.js";
import { batchUpdateTeacher, newBatch } from "../../main/data.js";

export function switchHtml(on) {
  return '<h2 class="u-fs18px-mt0">🎓 اكتمال الكورس</h2><div class="muted u-fs125px" style="margin-bottom:8px;">طلابك مش هيقدروا ينزّلوا شهادة إتمام الكورس غير لما تعلن إن الكورس اكتمل (حتى لو خلّصوا كل المتاح). تقدر ترجع تقفلها في أي وقت لو ضفت دروس جديدة.</div>'
        + '<div class="btnrow" style="justify-content:space-between;align-items:center;"><span>' + (on ? '<span class="chip green">الكورس مكتمل، الشهادة مفتوحة للطلاب</span>' : '<span class="chip amber">الكورس لسه شغال، الشهادة مقفولة</span>') + '</span>'
        + '<button type="button" class="btn sm' + (on ? " ghost" : "") + '" id="cs-btn">' + (on ? "قفل الشهادة" : "إعلان اكتمال الكورس") + "</button></div>";
}

/* ---------- زرار «الكورس اكتمل» (المدرس بس): شهادة الإتمام عند الطلاب مبتفتحش غير بعده ---------- */
export function mountCourseSwitch(anchor) {
  try {
    if (!anchor || !fbUser) return;
    const box = document.createElement("div");
    box.className = "card";
    const draw = () => {
      const on = !!(fbProfile && fbProfile.courseComplete === true);
      box.innerHTML = switchHtml(on);
      box.querySelector("#cs-btn").onclick = async (ev) => {
        const b = ev.currentTarget; b.disabled = true;
        const next = !on;
        try {
          const batch = newBatch();
          batchUpdateTeacher(batch, fbUser.uid, { courseComplete: next }, { courseComplete: next });
          await batch.commit();
          fbProfile.courseComplete = next;
          showToast(next ? "اتفتحت الشهادة لطلابك ✅" : "الشهادة اتقفلت", "good");
        } catch (e) { showToast("مشكلة في الحفظ: " + ((e && e.message) || e), "bad"); }
        draw();
      };
    };
    draw();
    anchor.insertAdjacentElement("afterend", box);
  } catch (e) { console.warn("زرار اكتمال الكورس مش شغال", e); }
}
