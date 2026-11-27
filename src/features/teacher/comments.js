import { fbUser } from "../../core/session.js";
import { fmtTs } from "../../domain/format.js";
import { buildReply, sortInbox, unansweredCount } from "../../domain/comments.js";
import { deleteLessonComment, listCommentsOfTeacher, replyToComment, serverNow } from "../../main/data.js";
import { lessonsState } from "./lessons.js";
import { threadHtml } from "../../shared/comments.view.js";
import { showToast } from "../../shared/toast.js";

/* ---------- صندوق أسئلة الطلاب للمدرس (بيتحمّل بس لما يدوس «اعرض الأسئلة»، قراءة واحدة بحد أقصى 100) ---------- */
export function mountCommentsCard(anchorCard) {
  try {
    if (!anchorCard || !fbUser) return;
    const box = document.createElement("div");
    box.className = "card cm-box";
    box.innerHTML = '<h2 class="u-fs18px-mt0">💬 أسئلة الطلاب على الدروس</h2><p class="muted u-fs125px-m006px">الأسئلة اللي الطلاب بيكتبوها تحت كل درس. ردك بيظهر لكل طلابك. آخر 100 سؤال.</p><div class="btnrow"><button type="button" class="btn" id="cmt-open">اعرض الأسئلة</button></div><div id="cmt-body"></div>';
    anchorCard.insertAdjacentElement("afterend", box);
    let list = [];
    const body = box.querySelector("#cmt-body");
    const lessonTitle = (c) => { const l = (lessonsState.lessons || []).find((x) => x.id === c.lessonId); return l ? (l.title || "درس") : "درس"; };
    const draw = () => {
      const open = unansweredCount(list);
      body.innerHTML = '<p class="muted" style="margin:10px 0;">' + (list.length ? open + " سؤال مستني ردك من " + list.length : "") + "</p>" + threadHtml(sortInbox(list), { uid: null, fmt: fmtTs, canReply: true, showLesson: lessonTitle });
      body.querySelectorAll("[data-cdel]").forEach((b) => b.onclick = async () => {
        if (!confirm("تحذف السؤال ده؟")) return;
        try { await deleteLessonComment(b.dataset.cdel); list = list.filter((x) => x.id !== b.dataset.cdel); draw(); }
        catch (e) { showToast("مقدرتش أحذف: " + (e.message || e)); }
      });
      body.querySelectorAll("[data-crs]").forEach((b) => b.onclick = async () => {
        const id = b.dataset.crs, ta = body.querySelector('[data-crt="' + id + '"]');
        const r = buildReply(ta && ta.value);
        if (!r) { showToast("اكتب الرد الأول"); return; }
        b.disabled = true;
        try { await replyToComment(id, r, serverNow()); const c = list.find((x) => x.id === id); if (c) c.reply = r; draw(); showToast("الرد اتبعت ✅"); }
        catch (e) { b.disabled = false; showToast("مشكلة: " + (e.message || e)); }
      });
    };
    box.querySelector("#cmt-open").onclick = async (ev) => {
      const b = ev.currentTarget; b.disabled = true; body.innerHTML = '<div class="spin">بنحمل...</div>';
      try { list = await listCommentsOfTeacher(fbUser.uid); draw(); b.textContent = "تحديث"; }
      catch (e) { body.innerHTML = '<p class="msg bad">مقدرتش أحمّل الأسئلة: ' + String(e.message || e).replace(/[<>&]/g, "") + "</p>"; }
      b.disabled = false;
    };
  } catch (e) { console.warn("صندوق الأسئلة مش شغال", e); }
}
