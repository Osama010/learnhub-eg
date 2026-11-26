import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { closing } from "../../shared/common.js";
import { renderStudentLesson } from "./lesson.js";
import { termCurrent } from "../../shared/terms.js";
import { bindPlatNav, platNavHtml } from "../../shared/theme.js";
import { showToast } from "../../shared/toast.js";
import { listTeachersPublicByIds } from "../../main/data.js";
import { listByTeacherIn, listLibraryNewestFirst } from "../../main/data.js";
import { listAttemptsOfStudent, listRatingsOfStudent, saveRating } from "../../main/data.js";
import { stageOfGrade } from "../../domain/student.js";
import { fmtTs } from "../../domain/format.js";
import { sLessonOpen, sLessonsCountText } from "../../domain/reporting.js";
import { findAttempt, myRatingOf } from "../../domain/progress.js";
import { serverNow } from "../../main/data.js";
import { chunksOf, examStateOf, newRating, reminderLines, subjectColor, subjectIcon } from "./shell.presenter.js";

/* ---------- واجهة الطالب: التابات والتحميل ----------
   الطالب بيشوف محتوى مدرسيه اللي مسجل معاهم بس: المحتوى المخصص لصفه + محتوى "كل الصفوف" في مرحلته.
   الدروس المجدولة بتظهر بشارة وتتفتح في معادها. الامتحانات بتحترم الفتح والقفل والقفل اليدوي. */
export let studentData = { teachers: [], lessons: [], quizzes: [], exams: [], ann: [], attempts: [] };

/* تاب الترم الحالي في صفحات الطالب — الافتراضي الترم الحالي اللي الأدمن محدده */
export var sTermTab = null;
export function sTerm() {
  if (sTermTab !== 1 && sTermTab !== 2) sTermTab = termCurrent();
  return sTermTab;
}
/* المدرسين الموقوف عنهم الطالب (قرار المدرس نفسه أو الأدمن) */
export function sSuspendedSet() {
  const arr = (fbProfile && fbProfile.suspendedBy) || [];
  return new Set(Array.isArray(arr) ? arr : []);
}
/* هل العنصر ده لمدرس موقوف عن الطالب؟ */
export function sTeacherLocked(item) {
  return !!(item && item.teacherId && sSuspendedSet().has(item.teacherId));
}
/* المدرسين الموقوفين من الأدمن (النسخة العامة active=false) — محتواهم مقفول على كل طلابهم */
function sAdminSuspendedSet() {
  return new Set((studentData.teachers || []).filter((t) => t.active === false).map((t) => t.id));
}

export function studentTabs(active) {
  const t = (id, h, lbl) => T("student.t", { active, h, id, lbl });
  return platNavHtml((fbProfile && fbProfile.name) || "", (fbProfile && fbProfile.avatar) || "", "#/student/profile")
    + T("student.studentTabs", { t });
}

export function bindStudentTabs() {
  document.querySelectorAll("[data-sh]").forEach((b) => b.onclick = () => { location.hash = b.dataset.sh; });
  bindPlatNav();
}

// اسم المدرس مع صورته الصغيرة (بتتعرض لطلابه من النسخة العامة)
export function sTeacherChip(tid, nameFallback) {
  const t = (studentData.teachers || []).find((x) => x.id === tid) || {};
  const nm = nameFallback || t.name || "";
  const av = t.avatar
    ? T("student.sTeacherChip", { t })
    : "";
  return av + esc(nm);
}

export async function studentLoadAll() {
  const allTids = ((fbProfile && fbProfile.teacherIds) || []).slice(0, 30);
  // محتوى المدرس الموقوف عن الطالب محظور بقواعد الأمان — ما نطلبهوش أصلاً عشان الاستعلام ما يترفضش كله.
  // أسماء المدرسين (teachersPublic) بنجيبها لكل المدرسين عشان كارت القفل يظهر باسم المدرس.
  // أسماء المدرسين الأول (teachersPublic فيها active): نعرف منها المدرس الموقوف من الأدمن
  // ونستبعده من استعلامات المحتوى، لأن قواعد الأمان بترفض محتواه فالاستعلام كله كان هيترفض
  const tchunks = chunksOf(allTids, 10);
  const teachers = tchunks.length
    ? await Promise.all(tchunks.map((c) => listTeachersPublicByIds(c)))
        .then((ss) => ss.flatMap((sn) => sn))
    : [];
  const sus = sSuspendedSet();
  teachers.forEach((t) => { if (t.active === false) sus.add(t.id); });
  const tids = allTids.filter((t) => !sus.has(t));
  const chunks = chunksOf(tids, 10);
  const inQuery = async (col) => {
    if (!chunks.length) return [];
    const snaps = await Promise.all(chunks.map((c) => listByTeacherIn(col, c)));
    return snaps.flatMap((sn) => sn);
  };
  const [lessons, quizzes, exams, ann, attSnap, rateSnap, libSnap] = await Promise.all([
    inQuery("lessons"), inQuery("quizzes"), inQuery("exams"), inQuery("announcements"),
    listAttemptsOfStudent(fbUser.uid),
    listRatingsOfStudent(fbUser.uid),
    listLibraryNewestFirst(),
  ]);
  studentData = {
    teachers, lessons, quizzes, exams, ann,
    attempts: attSnap,
    ratings: rateSnap,
    library: libSnap,
  };
}

export function sTeacherName(tid) {
  const t = (studentData.teachers || []).find((x) => x.id === tid);
  return (t && t.name) || "";
}

/* أقسام المواد في صفحة دروسي: أيقونة ولون ثابتين لكل مادة، وحالة الفتح/القفل
   بتتحفظ على الجهاز فميفتحش كل الأقسام كل مرة */
export function sSubjIcon(subj) { return subjectIcon(subj); }
export function sSubjColor(subj) { return subjectColor(subj); }
export function sSecStateGet(k) {
  try { const m = JSON.parse(localStorage.getItem("stSecState") || "{}"); return m[k] !== false; } catch (_) { return true; }
}
export function sSecStateSet(k, open) {
  try { const m = JSON.parse(localStorage.getItem("stSecState") || "{}"); m[k] = open; localStorage.setItem("stSecState", JSON.stringify(m)); } catch (_) {}
}

/* علامات «شوفت الدرس» على الجهاز: بتتسجل أول ما الطالب يفتح صفحة الدرس،
   وبتغذي شريط التقدم والتذكير الذكي في صفحة دروسي */
export function sWatchedSet() {
  try { return new Set(JSON.parse(localStorage.getItem("stWatched") || "[]")); } catch (_) { return new Set(); }
}
export function sIsWatched(lid) { return sWatchedSet().has(lid); }
export function sMarkWatched(lid) {
  try {
    const w = sWatchedSet();
    w.add(lid);
    localStorage.setItem("stWatched", JSON.stringify(Array.from(w).slice(-500)));
  } catch (_) {}
}

/* شريط تقدم المادة داخل قسمها: دروس مشاهدة من الإجمالي + كويزات مكتملة */
export function sSubjProgressHtml(g, col) {
  const total = g.items.length;
  const watched = g.items.filter((x) => sIsWatched(x.id)).length;
  const lids = new Set(g.items.map((x) => x.id));
  const qz = (studentData.quizzes || []).filter((q) => q.lessonId && lids.has(q.lessonId) && sVisible(q));
  const qzDone = qz.filter((q) => sAttemptFor(q.id, null)).length;
  const pct = total ? Math.round((watched / total) * 100) : 0;
  return T("student.sSubjProgressHtml", { col, pct, qz, qzDone, sLessonsCountText, total, watched });
}

/* الكويزات بمحاولة واحدة: لو المدرس حددها والطالب حل، الزرار يتقفل */
export function sQuizBlocked(q) {
  return q.maxAttempts === 1 && !!sAttemptFor(q.id, null);
}
export function sQuizBtnHtml(q, att, btnCls) {
  if (sQuizBlocked(q)) return T("student.sQuizBtnHtml");
  return T("student.sQuizBtnHtml_2", { att, btnCls, q });
}

/* تقييم الدرس بالنجوم: الطالب يقيّم مرة ويقدر يغيّر، والمدرس يشوف المتوسط بس */
export function sMyRating(lessonId) {
  return myRatingOf(studentData.ratings, lessonId);
}
export async function sRate(lessonId, stars) {
  const l = (studentData.lessons || []).find((x) => x.id === lessonId);
  if (!l) return;
  try {
    await saveRating(fbUser.uid, lessonId, newRating({ lessonId, lesson: l, studentId: fbUser.uid, stars, now: serverNow() }));
    showToast("شكراً! تقييمك اتسجل.", "good");
    renderStudentLesson(lessonId);
  } catch (e) { showToast("مشكلة في حفظ التقييم، جرّب تاني.", "bad"); }
}

/* تذكير ذكي فوق الأقسام: دروس لسه مشفتاهاش + كويزات مستنياه + دروس بتنزل قريب.
   بيظهر بس لما في حاجة تفتكر، ومبيظهرش خالص لو كل حاجة مكتملة */
export function sReminderHtml(lessons, quizzes) {
  const lines = reminderLines({ lessons, quizzes, nowMs: Date.now(), rules: { lessonOpen: sLessonOpen, isWatched: sIsWatched, visible: sVisible, attemptFor: sAttemptFor, countText: sLessonsCountText } });
  if (!lines.length) return "";
  return T("student.sReminderHtml", { lines });
}

// المحتوى يظهر للطالب لو مخصص لصفه، أو عام على مرحلته كلها
export function sVisible(item) {
  const g = item.grade || "";
  if (g) return g === ((fbProfile && fbProfile.grade) || "");
  return stageOfGrade((fbProfile && fbProfile.grade) || "") === item.stage;
}


export function sAttemptFor(quizId, examId) {
  return findAttempt(studentData.attempts, quizId, examId);
}

export function sExamState(e) {
  return examStateOf(e, new Date(), fmtTs);
}

export function sUnavailable(msg) {
  app.innerHTML = T("student.sUnavailable", { closing, esc, msg });
  window.scrollTo(0, 0);
}

export function set_sTermTab(v) { return (sTermTab = v); }
