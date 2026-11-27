import { esc } from "../../core/utils.js";
import { starsText } from "../../domain/reviews.js";
import { deleteTeacherReview, listPendingReviews, setReviewStatus } from "../../main/data.js";

/* ---------- موافقة الأدمن على تقييمات المدرسين: بتقرا لما يضغط الزرار بس ---------- */
export function rowHtml(r, teacherName) {
  return '<div class="an-row" style="align-items:center;"><span><b>' + esc(r.studentName || "طالب") + "</b> → " + esc(teacherName || r.teacherId) + ' <span style="color:#f59e0b;">' + starsText(r.stars) + "</span>"
    + (r.text ? '<br><span class="u-fs14px">' + esc(r.text) + "</span>" : "") + '</span><span><button type="button" class="btn sm" data-ra="' + esc(r.id) + '">قبول</button> <button type="button" class="btn sm ghost" data-rd="' + esc(r.id) + '">رفض</button></span></div>';
}
export function mountReviewsAdmin(anchor, teachers) {
  try {
    if (!anchor) return;
    const box = document.createElement("div"); box.className = "card";
    box.innerHTML = '<h2 class="u-fs18px-mt0">⭐ تقييمات المدرسين</h2><div class="muted u-fs125px">التقييم مبيظهرش في صفحة المدرس غير بعد قبولك.</div><button type="button" class="btn sm" id="rva-load">عرض التقييمات المستنية</button><div id="rva-list"></div>';
    anchor.insertAdjacentElement("afterend", box);
    const name = (id) => { const t = (teachers || []).find((x) => x.id === id); return t && t.name; };
    const btn = box.querySelector("#rva-load"), list = box.querySelector("#rva-list");
    const draw = async () => {
      const rs = await listPendingReviews();
      list.innerHTML = rs.length ? rs.map((r) => rowHtml(r, name(r.teacherId))).join("") : '<div class="muted" style="padding:6px 0;">مفيش تقييمات مستنية.</div>';
      list.querySelectorAll("[data-ra]").forEach((b) => b.onclick = async () => { b.disabled = true; try { await setReviewStatus(b.dataset.ra, "approved"); await draw(); } catch (e) { b.disabled = false; } });
      list.querySelectorAll("[data-rd]").forEach((b) => b.onclick = async () => { if (!confirm("رفض التقييم ومسحه؟")) return; b.disabled = true; try { await deleteTeacherReview(b.dataset.rd); await draw(); } catch (e) { b.disabled = false; } });
    };
    btn.onclick = async () => { btn.disabled = true; try { await draw(); } catch (e) { list.innerHTML = '<div class="msg bad">معرفتش أحمّل التقييمات.</div>'; } btn.disabled = false; };
  } catch (e) { console.warn("تقييمات الأدمن مش شغالة", e); }
}
