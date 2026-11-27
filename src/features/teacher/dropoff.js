import { fbUser } from "../../core/session.js";
import { esc } from "../../core/utils.js";
import { BUCKET, dropoffSummary, fmtSec } from "../../domain/dropoff.js";
import { listLessonsOfTeacher, listVideoWatch } from "../../main/data.js";

/* ---------- نقطة التسرب في الفيديو (مدرس): بتتحمّل وتقرا لما يضغط «حلّل» بس ---------- */
export function summaryHtml(s) {
  if (!s.students) return '<div class="muted">لسه مفيش بيانات مشاهدة للدرس ده. التتبّع بيشتغل لفيديوهات يوتيوب بس، وبعد ما طلابك يشوفوه.</div>';
  if (!s.enough) return '<div class="muted">' + s.students + " طالب بس شافوه لحد دلوقتي. محتاج 3 طلاب على الأقل عشان النتيجة تبقى ليها معنى.</div>";
  if (!s.top) return '<div class="msg good">مفيش نقطة وقوف أو رجوع واضحة. الطلاب كملوا الفيديو من غير تسرب 👌</div>';
  return '<div class="card tint-amber" style="margin:6px 0;"><b>أكتر نقطة طلابك بيقفوا أو يرجّعوا عندها: الدقيقة ' + fmtSec(s.top.sec) + "</b><div class=\"muted u-fs125px\">" + s.top.stops + " طالب وقفوا و" + s.top.rewinds + " رجّعوا (من " + s.students + " طالب). راجع الشرح حوالين اللحظة دي.</div></div>"
    + s.list.map((x) => '<div class="btnrow" style="justify-content:space-between;border-top:1px solid var(--line);padding:6px 0;"><b dir="ltr">' + fmtSec(x.sec) + "–" + fmtSec(x.sec + BUCKET) + '</b><span class="muted u-fs125px">وقفوا ' + x.stops + " · رجّعوا " + x.rewinds + "</span></div>").join("");
}
export async function mountDropoff(anchor) {
  try {
    if (!anchor || !fbUser) return;
    const box = document.createElement("div"); box.className = "card";
    box.innerHTML = '<h2 class="u-fs18px-mt0">📉 نقطة التسرب في الفيديو</h2><div class="muted u-fs125px" style="margin-bottom:8px;">الثانية اللي أغلب الطلاب بيقفوا أو يرجّعوا عندها. بتشتغل لفيديوهات يوتيوب بس (جوجل درايف مبيدّيش المنصة وقت المشاهدة). الأرقام من الطلاب اللي فتحوا الدرس من المنصة.</div><button type="button" class="btn sm" id="do-load">اختار الدرس</button><div id="do-body"></div>';
    anchor.insertAdjacentElement("afterend", box);
    const body = box.querySelector("#do-body"), btn = box.querySelector("#do-load");
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        const ls = (await listLessonsOfTeacher(fbUser.uid)).filter((l) => l.hasVideo || l.videoUrl);
        btn.remove();
        if (!ls.length) { body.innerHTML = '<div class="muted">مفيش دروس بفيديو.</div>'; return; }
        body.innerHTML = '<select class="inp" id="do-sel">' + ls.map((l) => '<option value="' + esc(l.id) + '">' + esc(l.title || "درس") + "</option>").join("") + '</select><button type="button" class="btn sm" id="do-go" style="margin-top:6px;">حلّل</button><div id="do-out" style="margin-top:8px;"></div>';
        body.querySelector("#do-go").onclick = async (ev) => {
          const b = ev.currentTarget, out = body.querySelector("#do-out"); b.disabled = true; out.textContent = "بنحلّل...";
          try { out.innerHTML = summaryHtml(dropoffSummary(await listVideoWatch(fbUser.uid, body.querySelector("#do-sel").value))); } catch (e) { out.innerHTML = '<div class="msg bad">معرفتش أحمّل البيانات.</div>'; }
          b.disabled = false;
        };
      } catch (e) { btn.disabled = false; body.innerHTML = '<div class="msg bad">معرفتش أحمّل الدروس.</div>'; }
    };
  } catch (e) { console.warn("نقطة التسرب مش شغالة", e); }
}
