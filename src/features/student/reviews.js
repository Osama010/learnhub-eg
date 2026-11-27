import { fbProfile, fbUser } from "../../core/session.js";
import { esc } from "../../core/utils.js";
import { courseCompletion } from "../../domain/progress.js";
import { sLessonOpen } from "../../domain/reporting.js";
import { TEXT_MAX, reviewDoc, reviewId, starsText, validateReview } from "../../domain/reviews.js";
import { getTeacherReview, saveTeacherReview } from "../../main/data.js";
import { sVisible, sWatchedSet, studentData } from "./shell.js";

/* ---------- تقييم المدرس بعد إنهاء الكورس ----------
   بيظهر بس لمدرس خلّصت كورسه (نفس شرط الشهادة). التقييم بيستنى موافقة الأدمن قبل ما يظهر في صفحة المدرس العامة. القراءة بتحصل لما الطالب يفتح الفورم بس. */
export function formHtml(t, mine, stars) {
  const status = mine ? (mine.status === "approved" ? '<span class="chip green">ظاهر في صفحة المدرس</span>' : '<span class="chip amber">مستني موافقة الأدمن</span>') : "";
  return '<div style="border-top:1px solid var(--line);padding:8px 0;"><b>' + esc(t.name || "") + "</b> " + status
    + '<div id="rv-st-' + esc(t.id) + '" style="font-size:28px;color:#f59e0b;cursor:pointer;direction:ltr;text-align:right;">' + [1, 2, 3, 4, 5].map((n) => '<span data-s="' + n + '">' + (n <= stars ? "★" : "☆") + "</span>").join("") + "</div>"
    + '<textarea class="inp" maxlength="' + TEXT_MAX + '" rows="2" placeholder="رأيك في المدرس (اختياري)" data-tx="' + esc(t.id) + '">' + esc((mine && mine.text) || "") + "</textarea>"
    + '<button type="button" class="btn sm" data-sv="' + esc(t.id) + '" style="margin-top:6px;">' + (mine ? "تعديل تقييمي" : "ابعت التقييم") + "</button></div>";
}
export function mountReviews(anchor) {
  try {
    if (!anchor || !fbUser) return;
    const tids = (fbProfile && fbProfile.teacherIds) || [], watchedIds = sWatchedSet();
    const done = tids.map((tid) => (studentData.teachers || []).find((x) => x.id === tid)).filter((t) => t && courseCompletion({ lessons: studentData.lessons, quizzes: studentData.quizzes, attempts: studentData.attempts, watchedIds, teacherId: t.id, lessonOpen: sLessonOpen, visible: sVisible, marked: t.courseComplete === true }).done);
    if (!done.length) return;
    const box = document.createElement("div"); box.className = "card";
    box.innerHTML = '<h2 class="u-fs18px-mt0">⭐ قيّم مدرسك</h2><div class="muted u-fs125px">خلّصت الكورس، فتقدر تقيّم المدرس. تقييمك بيظهر في صفحته بعد موافقة الإدارة، وباسمك الأول بس.</div><div id="rv-body"></div><div class="msg" id="rv-msg"></div>';
    const body = box.querySelector("#rv-body");
    body.innerHTML = done.map((t) => '<div style="padding:6px 0;"><b>' + esc(t.name || "") + '</b> <button type="button" class="btn sm ghost" data-open="' + esc(t.id) + '">قيّم</button></div>').join("");
    (document.getElementById("sp-teachers") || anchor).insertAdjacentElement("afterend", box);
    const msg = (t, good) => { const m = box.querySelector("#rv-msg"); m.textContent = t; m.className = "msg " + (good ? "good" : "bad"); };
    body.querySelectorAll("[data-open]").forEach((b) => b.onclick = async () => {
      const t = done.find((x) => x.id === b.dataset.open); b.disabled = true;
      try {
        const mine = await getTeacherReview(reviewId(fbUser.uid, t.id));
        let stars = mine ? mine.stars : 0;
        const holder = document.createElement("div"); holder.innerHTML = formHtml(t, mine, stars);
        b.closest("div").replaceWith(holder);
        const paint = () => holder.querySelectorAll("[data-s]").forEach((s) => { s.textContent = Number(s.dataset.s) <= stars ? "★" : "☆"; });
        holder.querySelectorAll("[data-s]").forEach((s) => s.onclick = () => { stars = Number(s.dataset.s); paint(); });
        holder.querySelector("[data-sv]").onclick = async (ev) => {
          const r = validateReview({ stars, text: holder.querySelector("[data-tx]").value });
          if (r.error) return msg(r.error);
          ev.currentTarget.disabled = true;
          try { await saveTeacherReview(reviewId(fbUser.uid, t.id), reviewDoc({ uid: fbUser.uid, teacherId: t.id, profile: fbProfile, stars: r.stars, text: r.text, now: Date.now() })); msg("وصل تقييمك ✅ هيظهر بعد موافقة الإدارة.", true); }
          catch (e) { ev.currentTarget.disabled = false; msg("معرفتش أحفظ التقييم. تأكد إن المدرس أعلن اكتمال الكورس وجرّب تاني."); }
        };
      } catch (e) { b.disabled = false; msg("معرفتش أفتح التقييم، جرّب تاني."); }
    });
  } catch (e) { console.warn("التقييم مش شغال", e); }
}
export const _stars = starsText;
