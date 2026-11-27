import { fbProfile, fbUser } from "../../core/session.js";
import { esc } from "../../core/utils.js";
import { parentLink, parentSnapshot, parentText, newParentCode } from "../../domain/parent.js";
import { sLessonOpen } from "../../domain/reporting.js";
import { streakInfo } from "../../domain/study-plan.js";
import { weakAreas } from "../../domain/weak-points.js";
import { deleteParentView, findParentViewOf, saveParentView } from "../../main/data.js";
import { initUserState, usGet, usSet } from "../../shared/user-state.js";
import { sVisible, sWatchedSet, studentData } from "./shell.js";

/* ---------- وضع ولي الأمر ----------
   الطالب بيعمل لينك سرّي (كود عشوائي طويل). ولي الأمر بيفتحه من غير حساب ويشوف ملخص تقدّم الطالب للقراءة بس.
   الملخص لقطة بيكتبها الطالب نفسه (الاسم الأول، الصف، الأرقام) ومفيهاش موبايل ولا إيميل ولا كلمات سر. بتتحدّث لما الطالب يفتح المنصة. الطالب يوقف اللينك في أي وقت. */
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
const base = () => location.href;
export function snapshotNow() {
  const d = studentData, lessons = (d.lessons || []).filter((l) => sVisible(l) && sLessonOpen(l));
  const weak = weakAreas({ attempts: d.attempts, quizzes: (d.quizzes || []).filter(sVisible), exams: (d.exams || []).filter(sVisible), lessons });
  const ws = sWatchedSet();
  return parentSnapshot({ uid: fbUser.uid, profile: fbProfile, watched: lessons.filter((l) => ws.has(l.id)).length, lessons: lessons.length, attempts: d.attempts, quizzes: d.quizzes, weak, streak: streakInfo(fbProfile && fbProfile.activityDays, Date.now()), now: Date.now() });
}
async function sync(code) {
  try {
    const snap = snapshotNow(), sig = JSON.stringify({ ...snap, updatedAt: 0 }), last = JSON.parse(lsGet("t4kParentSync_" + fbUser.uid) || "{}");
    if (last.sig === sig && Date.now() - last.at < 6 * 3600000) return;
    await saveParentView(code, snap);
    lsSet("t4kParentSync_" + fbUser.uid, JSON.stringify({ sig, at: Date.now() }));
  } catch (_) {}
}
export function cardHtml(code) {
  const link = code ? parentLink(base(), code) : "";
  return '<div class="card" id="sp-parent"><h2 class="u-fs18px-mt0">👨‍👩‍👦 وضع ولي الأمر</h2>'
    + (code ? '<div class="muted u-fs125px">ابعت اللينك ده لولي أمرك. بيشوف تقدّمك للقراءة بس، ومينفعش يغيّر حاجة.</div><input class="inp" id="pm-link" dir="ltr" readonly value="' + esc(link) + '" style="margin:6px 0;"><div class="btnrow"><button type="button" class="btn sm" id="pm-copy">نسخ اللينك</button><a class="btn sm ghost" id="pm-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(parentText(fbProfile && fbProfile.name, link)) + '">واتساب</a><button type="button" class="btn sm ghost" id="pm-off">إيقاف اللينك</button></div>'
      : '<div class="muted u-fs125px">اعمل لينك سرّي يخلّي ولي أمرك يتابع تقدّمك (دروسك ودرجاتك ونقط ضعفك) من غير ما يحتاج حساب.</div><button type="button" class="btn sm" id="pm-make" style="margin-top:6px;">إنشاء لينك ولي الأمر</button>')
    + '<div class="msg" id="pm-msg"></div></div>';
}
export async function mountParentCard(anchor) {
  try {
    if (!anchor || !fbUser) return;
    await initUserState();
    let code = usGet("parentCode", "");
    const box = document.createElement("div");
    anchor.insertAdjacentElement("afterend", box);
    const draw = () => {
      box.innerHTML = cardHtml(code);
      const msg = (t, good) => { const m = box.querySelector("#pm-msg"); m.textContent = t; m.className = "msg " + (good ? "good" : "bad"); };
      const mk = box.querySelector("#pm-make");
      if (mk) mk.onclick = async () => {
        mk.disabled = true;
        try {
          const old = await findParentViewOf(fbUser.uid); // لو اتعمل من جهاز تاني نستخدم نفس اللينك
          code = old ? old.id : newParentCode();
          await saveParentView(code, snapshotNow()); usSet("parentCode", code); draw();
        } catch (e) { mk.disabled = false; msg("معرفتش أعمل اللينك. جرّب تاني."); }
      };
      const cp = box.querySelector("#pm-copy");
      if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(parentLink(base(), code)); msg("اتنسخ ✅", true); } catch (_) { box.querySelector("#pm-link").select(); msg("انسخه من الخانة."); } };
      const off = box.querySelector("#pm-off");
      if (off) off.onclick = async () => { if (!confirm("إيقاف اللينك؟ ولي الأمر مش هيقدر يفتحه تاني.")) return; off.disabled = true; try { await deleteParentView(code); usSet("parentCode", ""); code = ""; draw(); } catch (e) { off.disabled = false; msg("معرفتش أوقفه. جرّب تاني."); } };
    };
    draw();
    if (code) sync(code);
  } catch (e) { console.warn("وضع ولي الأمر مش شغال", e); }
}
