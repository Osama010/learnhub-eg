import { fbProfile, fbUser } from "../../core/session.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { sCorrectText } from "../../domain/quiz.js";
import { sLessonOpen } from "../../domain/reporting.js";
import { weakAreas } from "../../domain/weak-points.js";
import { dueItems, examNightPlan, srsAnswer, srsItems, srsPrune, srsSchedule } from "../../domain/srs.js";
import { initUserState, usGet, usSet } from "../../shared/user-state.js";
import { qImgHtml } from "./quiz-runner.js";
import { bindStudentTabs, sVisible, studentData, studentLoadAll, studentTabs } from "./shell.js";

/* ---------- مراجعة متباعدة + ليلة الامتحان ----------
   الغلطة بترجع بعد يومين وبعدها بأسبوع. التقييم بيتحفظ على الجهاز (localStorage)، والأسئلة نفسها من نتايجه المحمّلة (من غير قراءات جديدة). */
const load = () => usGet("srs", {});
const save = (s) => usSet("srs", s);
const items = () => srsItems({ attempts: studentData.attempts, quizzes: studentData.quizzes, exams: studentData.exams });

export function srsCardHtml(dueN, totalN) {
  if (!totalN) return "";
  return '<div class="card tint-amber" id="sp-srs"><div class="btnrow" style="justify-content:space-between;align-items:center;"><b>🔁 المراجعة الذكية: ' + (dueN ? dueN + (dueN === 1 ? " سؤال" : " أسئلة") + " مستنياك النهارده" : "مفيش مراجعة مستحقة النهارده 👌") + '</b><span class="btnrow">' + (dueN ? '<a class="btn sm" href="#/student/review">ابدأ</a>' : "") + '<a class="btn sm ghost" href="#/student/examnight">🌙 ليلة الامتحان</a></span></div></div>';
}
export async function mountSrsCard(anchor) {
  try {
    if (!anchor) return;
    await initUserState();
    const all = items();
    const st = srsPrune(load(), all);
    const due = dueItems(srsSchedule(all, st, Date.now())).length;
    const html = srsCardHtml(due, all.length);
    if (!html) return;
    const box = document.createElement("div"); box.innerHTML = html;
    anchor.insertAdjacentElement("afterend", box.firstElementChild);
  } catch (e) { console.warn("المراجعة الذكية مش شغالة", e); }
}

export function cardHtml(it, i, n, shown) {
  return '<div class="card" id="rv-card"><div class="muted u-fs125px">سؤال ' + (i + 1) + " من " + n + " · " + esc(it.title) + "</div>"
    + '<h2 style="font-size:19px;line-height:1.8;margin:10px 0;">' + esc(it.q.q || "") + "</h2>" + qImgHtml(it.q)
    + (shown ? '<div style="margin:10px 0;color:var(--green);font-weight:700;">✅ الإجابة الصحيحة: ' + esc(sCorrectText(it.q)) + '</div><div class="btnrow"><button type="button" class="btn green" id="rv-yes">عرفتها ✅</button><button type="button" class="btn red" id="rv-no">لسه صعبة 🔁</button></div>'
      : '<button type="button" class="btn" id="rv-show">اعرض الإجابة</button>') + "</div>";
}
export async function renderStudentReview(mode) {
  if (bailIfSignedOut()) return;
  if (!fbUser) return renderLogin();
  app.innerHTML = '<div class="spin">بنجهز مراجعتك...</div>';
  try { await studentLoadAll(); } catch (e) { app.innerHTML = '<p class="msg bad">مشكلة في التحميل: ' + esc(e.message || e) + "</p>"; return; }
  await initUserState().catch(() => {});
  const all = items();
  let state = srsPrune(load(), all);
  const sched = srsSchedule(all, state, Date.now());
  const queue = (mode === "all" ? sched : dueItems(sched)).slice(0, 40);
  let i = 0, shown = false;
  const head = '<div class="hdr"><h1>المراجعة الذكية 🔁</h1><div class="fact">' + (mode === "all" ? "كل أسئلتك الغلط" : "أسئلة مستحقة النهارده") + "</div></div>" + studentTabs("quiz");
  const draw = () => {
    if (i >= queue.length) {
      const next = srsSchedule(all, state, Date.now()).filter((x) => !x.isDue).map((x) => x.due).sort((a, b) => a - b)[0];
      app.innerHTML = head + '<div class="card center u-p30px"><b class="u-fs17px">' + (queue.length ? "خلّصت مراجعة النهارده 🎉" : "مفيش حاجة مستحقة دلوقتي 👌") + "</b>"
        + (next ? '<p class="muted u-mt8px">أقرب مراجعة جاية: ' + esc(new Date(next).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })) + "</p>" : "") + '<a class="btn" href="#/student/quizexams">رجوع</a></div>' + closing();
      bindStudentTabs(); return;
    }
    app.innerHTML = head + cardHtml(queue[i], i, queue.length, shown) + closing();
    bindStudentTabs();
    const show = document.getElementById("rv-show"); if (show) show.onclick = () => { shown = true; draw(); };
    const ans = (knew) => () => { state = srsAnswer(state, queue[i], knew, Date.now()); save(state); i++; shown = false; draw(); };
    const y = document.getElementById("rv-yes"), n = document.getElementById("rv-no");
    if (y) y.onclick = ans(true); if (n) n.onclick = ans(false);
  };
  draw();
  window.scrollTo(0, 0);
}

/* ---------- ليلة الامتحان: خطة مضغوطة من أضعف نقاطك في الوقت اللي تختاره ---------- */
const KIND = { lesson: "▶️ راجع الدرس", flash: "🔁 بطاقات", quiz: "📝 حل الكويز" };
export function nightHtml(plan) {
  if (!plan.blocks.length) return '<div class="card center u-p30px"><b>مفيش نقاط ضعف أو غلطات واضحة 🎉</b><p class="muted u-mt8px">حل كام كويز الأول وهتطلعلك خطة بتناسبك.</p></div>';
  return '<div class="card"><b>خطتك: ' + plan.usedMin + " دقيقة من " + plan.budget + "</b>" + plan.blocks.map((b) => '<div class="btnrow" style="justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding:8px 0;margin-top:8px;"><span><span class="chip">' + b.from + "–" + b.to + ' د</span> <b>' + esc(b.title) + '</b><br><span class="muted u-fs12px">' + KIND[b.kind] + " · " + esc(b.why) + '</span></span><a class="btn sm ghost" href="' + esc(b.href) + '">افتح</a></div>').join("") + "</div>";
}
export async function renderExamNight() {
  if (bailIfSignedOut()) return;
  if (!fbUser) return renderLogin();
  app.innerHTML = '<div class="spin">بنجهز خطتك...</div>';
  try { await studentLoadAll(); } catch (e) { app.innerHTML = '<p class="msg bad">مشكلة في التحميل: ' + esc(e.message || e) + "</p>"; return; }
  const d = studentData;
  const lessons = (d.lessons || []).filter((l) => sVisible(l) && sLessonOpen(l));
  const weak = weakAreas({ attempts: d.attempts, quizzes: (d.quizzes || []).filter(sVisible), exams: (d.exams || []).filter(sVisible), lessons });
  const all = items();
  let budget = 60, tid = "";
  const teachers = (d.teachers || []).filter((t) => (fbProfile.teacherIds || []).includes(t.id));
  const draw = () => {
    const plan = examNightPlan({ budgetMin: budget, items: all, weak, quizzes: d.quizzes, attempts: d.attempts, lessons, teacherId: tid || null });
    app.innerHTML = '<div class="hdr"><h1>🌙 ليلة الامتحان</h1><div class="fact">خطة مراجعة سريعة من أضعف نقاطك</div></div>' + studentTabs("quiz")
      + '<div class="card"><div class="muted u-fs125px">معاك قد إيه؟</div><div class="btnrow" style="margin:6px 0;">' + [30, 60, 120, 180].map((m) => '<button type="button" class="btn sm' + (m === budget ? "" : " ghost") + '" data-bm="' + m + '">' + (m >= 60 ? m / 60 + " ساعة" : m + " دقيقة") + "</button>").join("") + "</div>"
      + (teachers.length > 1 ? '<select id="en-t" class="inp"><option value="">كل المواد</option>' + teachers.map((t) => '<option value="' + esc(t.id) + '"' + (t.id === tid ? " selected" : "") + ">" + esc(t.subject || t.name || "") + "</option>").join("") + "</select>" : "") + "</div>"
      + nightHtml(plan) + closing();
    bindStudentTabs();
    document.querySelectorAll("[data-bm]").forEach((b) => b.onclick = () => { budget = Number(b.dataset.bm); draw(); });
    const sel = document.getElementById("en-t"); if (sel) sel.onchange = () => { tid = sel.value; draw(); };
  };
  draw();
  window.scrollTo(0, 0);
}
