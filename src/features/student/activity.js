import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { sWatchedSet, studentData } from "./shell.js";
import { markStudentActiveDay, addActivity, listActivityOfTeachers } from "../../main/data.js";
import { subDateStr, weekStartFriday } from "../../domain/subscription.js";
import { badgesOf, passedCountOf, watchedCountOf } from "../../domain/progress.js";
import { serverNow } from "../../main/data.js";
import { weeklyRank } from "./activity.presenter.js";

/* ---------- نشاط الطالب: السلسلة اليومية + الأوسمة + لوحة الشرف ---------- */
/* تسجيل نشاط: يوم النهارده بيتعلم في خريطة activityDays على مستند الطالب (للسلسلة)،
   وبيتكتب سطر في activityLog (للوحة الشرف الأسبوعية عند المدرس وترتيب الطالب).
   فشل التسجيل ميوقفش حاجة — النقاط الأساسية شغالة من الجهاز زي ما هي. */
export function sPingActivity(kind, refId, teacherId, points) {
  try {
    const today = subDateStr(new Date());
    const upd = {};
    upd["activityDays." + today] = true;
    markStudentActiveDay(fbUser.uid, upd).catch(() => {});
    if (teacherId) {
      addActivity({
        studentId: fbUser.uid, teacherId, kind, refId: refId || "",
        grade: (fbProfile && fbProfile.grade) || "",
        points: Number(points) || 10,
        ts: serverNow(),
      }).catch(() => {});
    }
    if (!fbProfile.activityDays) fbProfile.activityDays = {};
    fbProfile.activityDays[today] = true;
  } catch (_) {}
}

/* السلسلة اليومية: عدد الأيام المتتالية اللي فيها نشاط. لو النهارده لسه مفيش نشاط بنعد من إمبارح عشان السلسلة ما تتكسرش قبل آخر اليوم */
export function sStreak() {
  const days = (fbProfile && fbProfile.activityDays) || {};
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (!days[subDateStr(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days[subDateStr(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* الأوسمة: بتتحسب من بيانات الطالب نفسها — مشاهدات وكويزات ناجحة وسلسلة الأيام */
function sBadges() {
  return badgesOf({
    watched: watchedCountOf(studentData.lessons, sWatchedSet()),
    passed: passedCountOf(studentData.attempts),
    streak: sStreak(),
  });
}
export function sBadgesCardHtml() {
  const badges = sBadges();
  const got = badges.filter((b) => b.got).length;
  return T("student.sBadgesCardHtml", { badges, got });
}

/* ترتيب الطالب الأسبوعي بين طلبة مدرسيه في نفس الصف — أرقام بس من غير أسماء (خصوصية الطلبة).
   النقاط من activityLog الأسبوعي مع إلغاء التكرار (نفس النشاط ميتحسبش مرتين). */
export async function sMyWeeklyRank() {
  try {
    const myGrade = fbProfile && fbProfile.grade;
    const tids = ((fbProfile && fbProfile.teacherIds) || []).slice(0, 10);
    if (!myGrade || !tids.length) return null;
    const ws = weekStartFriday();
    const snap = await listActivityOfTeachers(tids);
    return weeklyRank({ activity: snap, weekStart: ws, grade: myGrade, studentId: fbUser.uid });
  } catch (_) { return null; }
}
export function sRankCardHtml(r) {
  if (!r) return "";
  return T("student.sRankCardHtml", { r });
}