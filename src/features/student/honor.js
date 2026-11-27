import { fbProfile, fbUser } from "../../core/session.js";
import { esc } from "../../core/utils.js";
import { boardDoc, boardId, boardKey, quizStatsOf, topOfBoard } from "../../domain/honor.js";
import { listQuizBoard, saveQuizBoardEntry, serverNow } from "../../main/data.js";
import { studentData } from "./shell.js";

/* ---------- لوحة شرف الكويزات ----------
   أوائل صفّك حسب متوسط الكويزات والامتحانات، بالاسم الأول بس. كل طالب بيكتب مستنده هو بس (على الجهاز بيتحسب من نتايجه)،
   فالرقم مبني على حسابه من الجهاز مش مراجعة من السيرفر. وفيه زرار «اخفي اسمي». */
const HID = "t4kBoardHidden";
import { initUserState, usGet, usSet } from "../../shared/user-state.js";
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };

async function syncMine(hidden, force) {
  const tids = ((fbProfile && fbProfile.teacherIds) || []).slice(0, 10);
  for (const tid of tids) {
    const stats = quizStatsOf(studentData.attempts, tid);
    if (!stats.count) continue;
    const k = "t4kBoardSync_" + fbUser.uid + "_" + tid, key = boardKey(stats, hidden);
    if (!force && lsGet(k) === key) continue;
    try { await saveQuizBoardEntry(boardId(fbUser.uid, tid), boardDoc({ uid: fbUser.uid, teacherId: tid, profile: fbProfile, stats, hidden, now: serverNow() })); lsSet(k, key); } catch (_) {}
  }
}
const MEDAL = ["🥇", "🥈", "🥉"];
export function cardHtml(res, hidden) {
  const rows = res.top.map((g, i) => '<div class="hb-row' + (g.me ? " me" : "") + '"><span class="hb-n">' + (MEDAL[i] || (i + 1)) + "</span><b>" + esc(g.name) + (g.me ? " (إنت)" : "") + '</b><span class="hb-a">' + g.avg + '%</span><span class="muted u-fs12px">' + g.count + " اختبار</span></div>").join("");
  const mine = res.me && !res.top.some((g) => g.me) ? '<div class="hb-row me"><span class="hb-n">' + res.me.rank + "</span><b>إنت" + (res.me.hidden ? " (مخفي عن زمايلك)" : "") + '</b><span class="hb-a">' + res.me.avg + '%</span><span class="muted u-fs12px">' + res.me.count + " اختبار</span></div>" : "";
  return '<div class="card hb-card"><h2 class="u-fs18px-mt0">🏆 لوحة شرف الكويزات</h2><div class="muted u-fs125px" style="margin-bottom:6px;">أوائل صفّك حسب متوسط درجات الكويزات والامتحانات (بالاسم الأول بس، ومن حلّ اختبارين على الأقل).</div>'
    + (rows || '<div class="muted" style="padding:8px 0;">لسه مفيش ترتيب. حل اختبارين وهتظهر هنا.</div>') + mine
    + '<button type="button" class="btn sm ghost" id="hb-hide" style="margin-top:8px;">' + (hidden ? "أظهر اسمي في اللوحة" : "اخفي اسمي من اللوحة") + "</button></div>";
}
export async function mountHonorBoard(anchor) {
  try {
    if (!anchor || !fbUser || !fbProfile || !fbProfile.grade) return;
    const tids = (fbProfile.teacherIds || []).slice(0, 10);
    if (!tids.length) return;
    const holder = document.createElement("div");
    anchor.insertAdjacentElement("afterend", holder);
    const draw = async (force) => {
      const hidden = usGet("boardHidden", false) === true;
      await syncMine(hidden, force);
      const entries = await listQuizBoard(tids);
      holder.innerHTML = cardHtml(topOfBoard(entries, { grade: fbProfile.grade, uid: fbUser.uid }), hidden);
      const b = holder.querySelector("#hb-hide");
      if (b) b.onclick = async () => { b.disabled = true; usSet("boardHidden", !hidden); await draw(true).catch(() => {}); };
    };
    await initUserState();
    await draw(false);
  } catch (e) { console.warn("لوحة الشرف مش شغالة", e); }
}
