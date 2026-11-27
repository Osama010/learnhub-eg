import { fmtTs } from "../../domain/format.js";
import { buildComment, sortThread } from "../../domain/comments.js";
import { addLessonComment, deleteLessonComment, listLessonComments, serverNow } from "../../main/data.js";
import { askFormHtml, threadHtml } from "../../shared/comments.view.js";
import { showToast } from "../../shared/toast.js";

/* ---------- أسئلة الدرس (بتتحمّل بس لما الطالب يفتح الدرس، والقراءة بتحصل لما يدوس «اعرض»: قراءة واحدة بحد أقصى 100) ----------
   الأسئلة ظاهرة لطلاب نفس المدرس بالاسم الأول بس، والمدرس بيرد عليها من صفحة «متابعة الطلاب». */
export function mountLessonComments(anchor, lesson, uid, profile) {
  try {
    if (!anchor || !lesson || !uid) return;
    const box = document.createElement("div");
    box.className = "card cm-box";
    box.innerHTML = '<div class="btnrow u-justspacebetween"><b class="u-fs15px">💬 أسئلة وتعليقات الدرس</b><button type="button" class="btn sm ghost" id="cm-open">اعرض / اسأل</button></div><div id="cm-body"></div>';
    anchor.insertAdjacentElement("afterend", box);
    let list = [], loaded = false;
    const body = box.querySelector("#cm-body");
    const draw = () => {
      body.innerHTML = '<div class="cm-list">' + threadHtml(sortThread(list), { uid, fmt: fmtTs, canReply: false }) + "</div>" + askFormHtml();
      body.querySelectorAll("[data-cdel]").forEach((b) => b.onclick = async () => {
        if (!confirm("تحذف سؤالك؟")) return;
        try { await deleteLessonComment(b.dataset.cdel); list = list.filter((x) => x.id !== b.dataset.cdel); draw(); }
        catch (e) { showToast("مقدرتش أحذف: " + (e.message || e)); }
      });
      const send = body.querySelector("#cm-send"), msg = body.querySelector("#cm-msg");
      send.onclick = async () => {
        const doc = buildComment({ lesson, student: profile, uid, text: body.querySelector("#cm-text").value, now: serverNow() });
        if (!doc) { msg.className = "msg bad"; msg.textContent = "اكتب سؤالك الأول."; return; }
        send.disabled = true;
        try {
          const ref = await addLessonComment(doc);
          list.push({ ...doc, id: ref.id, createdAt: { seconds: Math.floor(Date.now() / 1000) } });
          draw(); showToast("سؤالك وصل للمدرس ✅");
        } catch (e) { send.disabled = false; msg.className = "msg bad"; msg.textContent = "مشكلة في الإرسال: " + (e.message || e); }
      };
    };
    box.querySelector("#cm-open").onclick = async (ev) => {
      const b = ev.currentTarget;
      if (loaded) { body.style.display = body.style.display === "none" ? "" : "none"; return; }
      b.disabled = true; body.innerHTML = '<div class="spin">بنحمل...</div>';
      try { list = await listLessonComments(lesson.id, lesson.teacherId); loaded = true; draw(); }
      catch (e) { body.innerHTML = '<p class="msg bad">مقدرتش أحمّل الأسئلة: ' + String(e.message || e).replace(/[<>&]/g, "") + "</p>"; }
      b.disabled = false;
    };
  } catch (e) { console.warn("الأسئلة مش شغالة", e); }
}
