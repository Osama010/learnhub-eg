import { fbProfile, fbUser } from "../../core/session.js";
import { esc } from "../../core/utils.js";
import { GRADES } from "../../domain/student.js";
import { fmtLive, liveState, startMsOf, validateLive } from "../../domain/live.js";
import { addLiveClass, deleteLiveClass, listLiveOfTeacher, toStoredTime } from "../../main/data.js";

/* ---------- الحصص المباشرة (مدرس): بيحط لينك Zoom/Meet وميعاد، والطلاب بيشوفوها وبتظهر في الجرس ---------- */
export function liveRowsHtml(list, nowMs) {
  const rows = list.map((c) => ({ ...c, ms: startMsOf(c) })).sort((a, b) => b.ms - a.ms).slice(0, 15);
  if (!rows.length) return '<div class="muted" style="padding:6px 0;">لسه ما أضفتش حصص.</div>';
  return rows.map((c) => '<div class="btnrow" style="justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding:6px 0;"><span><b>' + esc(c.title || "") + '</b> <span class="muted u-fs12px">' + esc(c.ms ? fmtLive(c.ms) : "") + (c.grade ? " · " + esc(c.grade) : " · كل صفوفك") + (c.ms && liveState(c.ms, nowMs) === "ended" ? " · خلصت" : "") + '</span></span><button type="button" class="btn sm ghost" data-ld="' + esc(c.id) + '">مسح</button></div>').join("");
}
export async function mountTeacherLive(anchor) {
  try {
    if (!anchor || !fbUser) return;
    const box = document.createElement("div"); box.className = "card";
    anchor.insertAdjacentElement("afterend", box);
    let list = [];
    const grades = (() => { const mine = (fbProfile && fbProfile.grades) || []; return mine.length ? mine : GRADES; })();
    const draw = () => {
      box.innerHTML = '<h2 class="u-fs18px-mt0">🎥 حصة مباشرة</h2><div class="muted u-fs125px" style="margin-bottom:8px;">حط لينك Zoom أو Google Meet والميعاد. الطلاب بيشوفوها في رئيستهم وفي الجرس. المنصة مبتعملش البث نفسه.</div>'
        + '<div id="lv-list">' + liveRowsHtml(list, Date.now()) + "</div>"
        + '<div class="grid2" style="margin-top:8px;"><input id="lv-title" class="inp" maxlength="80" placeholder="عنوان الحصة"><input id="lv-url" class="inp" dir="ltr" placeholder="https://zoom.us/j/..."></div>'
        + '<div class="grid2"><input id="lv-date" class="inp" type="date"><input id="lv-time" class="inp" type="time"></div>'
        + '<select id="lv-grade" class="inp"><option value="">كل صفوفي</option>' + grades.map((g) => '<option value="' + esc(g) + '">' + esc(g) + "</option>").join("") + "</select>"
        + '<button type="button" class="btn" id="lv-add" style="margin-top:8px;">إضافة الحصة</button><div class="msg" id="lv-msg" style="margin-top:6px;"></div>';
      const msg = (t, good) => { const m = box.querySelector("#lv-msg"); m.textContent = t; m.className = "msg " + (good ? "good" : "bad"); };
      box.querySelector("#lv-add").onclick = async (ev) => {
        const g = (id) => box.querySelector(id).value;
        const r = validateLive({ title: g("#lv-title"), url: g("#lv-url"), date: g("#lv-date"), time: g("#lv-time"), grade: g("#lv-grade") }, Date.now());
        if (r.error) return msg(r.error);
        ev.currentTarget.disabled = true;
        try {
          const d = r.doc;
          await addLiveClass({ teacherId: fbUser.uid, title: d.title, url: d.url, startsAt: toStoredTime(new Date(d.startsAtMs)), grade: d.grade });
          list = await listLiveOfTeacher(fbUser.uid); draw();
        } catch (e) { ev.currentTarget.disabled = false; msg("معرفتش أحفظ الحصة: " + ((e && e.message) || e)); }
      };
      box.querySelectorAll("[data-ld]").forEach((b) => b.onclick = async () => {
        if (!confirm("مسح الحصة؟")) return;
        try { await deleteLiveClass(b.dataset.ld); list = await listLiveOfTeacher(fbUser.uid); draw(); } catch (e) { msg("فشل المسح."); }
      });
    };
    list = await listLiveOfTeacher(fbUser.uid);
    draw();
  } catch (e) { console.warn("الحصص المباشرة مش شغالة", e); }
}
