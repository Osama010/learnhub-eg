import { fbProfile, fbUser } from "../../core/session.js";
import { renderBell } from "./notifications.view.js";
import { sLessonOpen } from "../../domain/reporting.js";
import { notificationsOf } from "../../domain/progress.js";
import { markStudentActiveDay } from "../../main/data.js";
import { sTeacherName, sVisible, studentData } from "./shell.js";

/* ---------- جرس إشعارات الطالب ----------
   من غير سيرفر ولا إشعارات موبايل: بنقارن وقت كل درس/كويز/امتحان/إعلان جديد بآخر مرة الطالب فتح فيها الجرس
   (بتتحفظ على مستند الطالب notifSeenMs وعلى الجهاز). بتشتغل لما يفتح الموقع. */
const LS = "stNotifSeen";

function seenMs() {
  const a = Number(fbProfile && fbProfile.notifSeenMs) || 0;
  let b = 0;
  try { b = Number(localStorage.getItem(LS)) || 0; } catch (_) {}
  const m = Math.max(a, b);
  return m || (Date.now() - 3 * 86400000); // أول مرة: آخر 3 أيام بس
}
function items() {
  return notificationsOf({ lessons: studentData.lessons, quizzes: studentData.quizzes, exams: studentData.exams, ann: studentData.ann, live: studentData.live, sinceMs: seenMs(), nowMs: Date.now(), visible: sVisible, lessonOpen: sLessonOpen, teacherName: sTeacherName, limit: 15 });
}
function markSeen() {
  const now = Date.now();
  try { localStorage.setItem(LS, String(now)); } catch (_) {}
  try { if (fbProfile) fbProfile.notifSeenMs = now; if (fbUser) markStudentActiveDay(fbUser.uid, { notifSeenMs: now }).catch(() => {}); } catch (_) {}
}

export function mountBell() {
  try {
    const zone = document.querySelector(".pnav .mezone");
    if (!zone || zone.querySelector(".nbell")) return;
    renderBell(zone, items, markSeen);
  } catch (e) { console.warn("الجرس مش شغال", e); }
}
