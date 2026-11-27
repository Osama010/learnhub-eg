import { esc } from "../core/utils.js";

/* عرض الأسئلة (HTML فقط، من غير تحميل بيانات). */
const when = (t, fmt) => { try { return t && t.seconds ? fmt(t) : ""; } catch (_) { return ""; } };

export function threadHtml(list, { uid, fmt, canReply, showLesson }) {
  if (!list.length) return '<div class="cm-empty">لسه مفيش أسئلة. كن أول واحد يسأل 👋</div>';
  return list.map((c) => '<div class="cm-item" data-cid="' + esc(c.id) + '">'
    + '<div class="cm-h"><b>' + esc(c.studentName || "طالب") + '</b><span class="muted">' + esc(when(c.createdAt, fmt)) + '</span>'
    + (showLesson ? '<span class="chip">' + esc(showLesson(c)) + '</span>' : '')
    + ((uid && c.studentId === uid) || canReply ? '<button type="button" class="cm-del" data-cdel="' + esc(c.id) + '" aria-label="حذف">🗑</button>' : '') + '</div>'
    + '<div class="cm-t">' + esc(c.text || "") + '</div>'
    + (c.reply ? '<div class="cm-r"><b>👨‍🏫 رد المدرس</b><div>' + esc(c.reply) + '</div></div>'
      : (canReply ? '<div class="cm-rf"><textarea class="inp" rows="2" maxlength="1000" placeholder="اكتب ردك..." data-crt="' + esc(c.id) + '"></textarea><button type="button" class="btn sm" data-crs="' + esc(c.id) + '">إرسال الرد</button></div>' : '')) + '</div>').join("");
}
export const askFormHtml = () => '<div class="cm-ask"><textarea class="inp" id="cm-text" rows="2" maxlength="500" placeholder="اكتب سؤالك أو تعليقك عن الدرس..."></textarea><button type="button" class="btn" id="cm-send">إرسال</button></div><p class="msg" id="cm-msg"></p>';
