import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { aboutTeaserHtml, bindAboutTeaser, loadAboutSettings } from "../about/about.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../landing/landing.js";
import { sBadgesCardHtml, sMyWeeklyRank, sRankCardHtml } from "./activity.js";
import { sAvatarHtml } from "./profile.js";
import { bindStudentTabs, sAttemptFor, sReminderHtml, sSecStateGet, sSecStateSet, sSubjColor, sSubjIcon, sSubjProgressHtml, sSuspendedSet, sTeacherChip, sTeacherLocked, sTeacherName, sTerm, sTermTab, sVisible, set_sTermTab, studentData, studentLoadAll, studentTabs } from "./shell.js";
import { broadcastBannerHtml } from "../../shared/subscriptions.js";
import { bindTermTabs, termTabsHtml } from "../../shared/terms.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { getBroadcast } from "../../main/data.js";
import { fmtTs } from "../../domain/format.js";
import { sLessonOpen, sLessonsCountText } from "../../domain/reporting.js";
import { lessonHasPdf, lessonHasVideo } from "../../domain/media.js";
import { termOf } from "../../domain/term.js";
import { buildDashModel } from "./home.presenter.js";

/* ---------- تاب دروسي (الرئيسية) ---------- */
export async function renderStudentDash() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("student.renderStudentDash");
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = T("student.renderStudentDash_2", { e, esc }); return; }
  // إعلان المنصة وترتيب الأسبوع — فشلهم ميوقفش الصفحة
  let bcData = null, myRank = null;
  try {
    const bcSnap = await getBroadcast();
    bcData = bcSnap;
  } catch (_) {}
  myRank = await sMyWeeklyRank();
  await loadAboutSettings(); // تيذر «عن المهندس» في آخر اللوحة
  const s = fbProfile || {};
  const { annVisible, lessons, quizzesVis, lockedTeachers, adminLockedTeachers, groups, gkeys } = buildDashModel({ data: studentData, rules: { visible: sVisible, suspended: sSuspendedSet, term: sTerm(), termOf, locked: sTeacherLocked, teacherName: sTeacherName } });
  app.innerHTML = T("student.renderStudentDash_3", { aboutTeaserHtml, adminLockedTeachers, annVisible, bcData, broadcastBannerHtml, closing, esc, fmtTs, gkeys, groups, lessonHasPdf, lessonHasVideo, lessons, lockedTeachers, myRank, quizzesVis, s, sAttemptFor, sAvatarHtml, sBadgesCardHtml, sLessonOpen, sLessonsCountText, sRankCardHtml, sReminderHtml, sSecStateGet, sSubjColor, sSubjIcon, sSubjProgressHtml, sTeacherChip, sTerm, studentTabs, termTabsHtml });
  bindStudentTabs();
  bindAboutTeaser();
  bindTermTabs((t) => { set_sTermTab(t); renderStudentDash(); });
  // فتح/قفل قسم المادة بالدوس على رأسه، والحالة بتتحفظ
  document.querySelectorAll("[data-sec]").forEach((h) => h.onclick = () => {
    const body = h.parentElement.querySelector(".sec-b");
    const arr = h.querySelector(".arr");
    if (!body || !arr) return;
    const wasOpen = body.style.display !== "none";
    body.style.display = wasOpen ? "none" : "";
    arr.textContent = wasOpen ? "▼" : "▲";
    sSecStateSet(h.dataset.sec, !wasOpen);
  });
  document.querySelectorAll("[data-sl]").forEach((b) => b.onclick = () => { location.hash = "#/student/lesson/" + b.dataset.sl; });
  window.scrollTo(0, 0);
}