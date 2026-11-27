import { fbProfile } from "../../core/session.js";
import { esc } from "../../core/utils.js";
import { sLessonOpen } from "../../domain/reporting.js";
import { studyPlan, streakInfo } from "../../domain/study-plan.js";
import { weakAreas } from "../../domain/weak-points.js";
import { sVisible, sWatchedSet, studentData } from "./shell.js";

/* ---------- خطة المذاكرة اليومية ---------- من الداتا المحمّلة بالفعل (من غير قراءات جديدة). */
const ICON = { lesson: "▶️", quiz: "📝", retry: "🔁", review: "🎯" };
export function planCardHtml(tasks, info) {
  const nudge = info.activeToday ? '<span class="chip green">✅ ذاكرت النهارده</span>' : '<span class="chip amber">لسه ماذاكرتش النهارده</span>';
  const body = tasks.length
    ? tasks.map((t, i) => '<div class="btnrow" style="justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding:8px 0;"><span>' + ICON[t.kind] + " <b>" + esc(t.title) + '</b><br><span class="muted u-fs12px">' + esc(t.why) + '</span></span><a class="btn sm' + (i ? " ghost" : "") + '" href="' + esc(t.href) + '">ابدأ</a></div>').join("")
    : '<div class="muted" style="padding:8px 0;">كل المتاح خلص. استنى دروس وكويزات جديدة من مدرسيك 👏</div>';
  return '<div class="card" id="sp-plan"><div class="btnrow" style="justify-content:space-between;"><h2 class="u-fs18px-mt0">📅 خطتك النهاردة</h2>' + nudge + '</div>' + body + "</div>";
}
export function mountStudyPlan(anchor) {
  try {
    if (!anchor) return;
    const d = studentData;
    const lessons = (d.lessons || []).filter((l) => sVisible(l) && sLessonOpen(l));
    const weak = weakAreas({ attempts: d.attempts, quizzes: (d.quizzes || []).filter(sVisible), exams: (d.exams || []).filter(sVisible), lessons });
    const tasks = studyPlan({ lessons: d.lessons, quizzes: d.quizzes, attempts: d.attempts, watchedIds: sWatchedSet(), weak, lessonOpen: sLessonOpen, visible: sVisible });
    const box = document.createElement("div");
    box.innerHTML = planCardHtml(tasks, streakInfo(fbProfile && fbProfile.activityDays, Date.now()));
    anchor.insertAdjacentElement("afterend", box.firstElementChild);
  } catch (e) { console.warn("الخطة اليومية مش شغالة", e); }
}
