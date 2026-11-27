import { esc } from "../../core/utils.js";
import { fmtLive, liveState, upcomingLive } from "../../domain/live.js";
import { sVisible, studentData } from "./shell.js";

/* ---------- الحصص المباشرة (طالب) ---------- من الداتا المحمّلة بالفعل. الحصة بتتفتح في تاب جديد على Zoom/Meet. */
const LBL = { live: '<span class="chip red">🔴 شغالة دلوقتي</span>', soon: '<span class="chip amber">النهارده/بكرة</span>', upcoming: '<span class="chip">جاية</span>' };
export function liveCardHtml(list, nowMs, nameOf) {
  const up = upcomingLive(list, nowMs).slice(0, 4);
  if (!up.length) return "";
  return '<div class="card" id="sp-live"><h2 class="u-fs18px-mt0">🎥 الحصص المباشرة</h2>' + up.map((c) => {
    const st = liveState(c.startMs, nowMs);
    return '<div class="btnrow" style="justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding:8px 0;"><span><b>' + esc(c.title || "حصة") + "</b> " + LBL[st] + '<br><span class="muted u-fs12px">' + esc(fmtLive(c.startMs)) + (nameOf && nameOf(c.teacherId) ? " · " + esc(nameOf(c.teacherId)) : "") + '</span></span><a class="btn sm' + (st === "live" ? "" : " ghost") + '" target="_blank" rel="noopener noreferrer" href="' + esc(c.url) + '">ادخل الحصة</a></div>';
  }).join("") + "</div>";
}
export function mountLive(anchor) {
  try {
    if (!anchor) return;
    const live = (studentData.live || []).filter((c) => /^https:\/\//.test(String(c.url || "")));
    const vis = live.filter(sVisible);
    const nameOf = (tid) => { const t = (studentData.teachers || []).find((x) => x.id === tid); return t && t.name; };
    const html = liveCardHtml(vis, Date.now(), nameOf);
    if (!html) return;
    const box = document.createElement("div"); box.innerHTML = html;
    anchor.insertAdjacentElement("afterend", box.firstElementChild);
  } catch (e) { console.warn("الحصص المباشرة مش شغالة", e); }
}
