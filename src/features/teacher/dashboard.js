import { authErrAr, fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { aboutTeaserHtml, bindAboutTeaser, loadAboutSettings } from "../about/about.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { dashGradeFilter, set_dashGradeFilter, lessonsState } from "./lessons.js";
import { openStudentNotes } from "./notes.js";
import { broadcastBannerHtml } from "../../shared/subscriptions.js";
import { bindPlatNav, platNavHtml } from "../../shared/theme.js";
import { bailIfSignedOut, showToast } from "../../shared/toast.js";
import { confirmDeleteStudent, renderTransferPage, waLink } from "../../shared/transfer.js";
import { getBroadcast, listLessonsOfTeacher, listExamsOfTeacher, listQuizzesOfTeacher, addQuizRaw, dropLessonQuizField } from "../../main/data.js";
import { listStudentsOfTeacher } from "../../main/data.js";
import { listAttemptsOfTeacher, listRatingsOfTeacher, listActivityOfTeacher } from "../../main/data.js";
import { listPendingRequestsOfTeacher } from "../../main/data.js";
import { GRADES, gradesOfStage, normalizeEgPhone, stageOfGrade } from "../../domain/student.js";
import { fmtTs } from "../../domain/format.js";
import { subFmtDate, subInfo, weekStartFriday } from "../../domain/subscription.js";
import { lessonRatingOf, studentQuizAvgOf } from "../../domain/progress.js";
import { useCases } from "../../main/compose.js";
import { activitiesSince, honorBoardModel, medalStyle, newestFirst, partitionStudents } from "./dashboard.presenter.js";
import { serverNow } from "../../main/data.js";

/* ---------- لوحة المدرس ----------
   طلبات الطلاب الجدد (قبول/رفض)، طلابه المقبولين، واتساب الطالب،
   إعادة ضبط الباسورد بإيميل، حذف طالب، وتغيير باسورده هو. */

export let teacherCache = null;

export function teacherTabs(active) {
  const myAv = (fbProfile && (fbProfile.avatar || fbProfile.photoData)) || "";
  return platNavHtml((fbProfile && fbProfile.name) || "", myAv, "#/teacher/profile") + T("teacher.teacherTabs", { active });
}

export function bindTeacherTabs() {
  document.querySelectorAll(".tab[data-g]").forEach((b) => b.onclick = () => location.hash = b.dataset.g);
  bindPlatNav();
}

export async function teacherLoad() {
  const [snap, at, rt] = await Promise.all([
    listStudentsOfTeacher(fbUser.uid),
    listAttemptsOfTeacher(fbUser.uid),
    listRatingsOfTeacher(fbUser.uid),
  ]);
  teacherCache = newestFirst(snap);
  lessonsState.attempts = at;
  lessonsState.ratings = rt;
}

/* لوحة الشرف الأسبوعية: أوائل كل صف من طلاب المدرس حسب نقاط الأسبوع (بتتصفر كل جمعة).
   الترتيب بين طلاب نفس المدرس ونفس الصف بس — زي ما اتفقنا. */
function honorBoardCard(students, weekActs) {
  const model = honorBoardModel(students, weekActs);
  if (!model) return "";
  const pts = model.pts;
  const sections = model.grades.map(({ grade: g, top }) => T("teacher.honorBoardCard", { esc, g, medalStyle, pts, tAvatarHtml, top })).join("");
  return T("teacher.honorBoardCard_2", { sections });
}

/* متوسط تقييم درس بالنجوم وعدد المقيّمين — بيرجع null لو مفيش تقييمات لسه */
function tLessonRating(lid) {
  return lessonRatingOf(lessonsState.ratings, lid);
}
export function tLessonRatingHtml(lid) {
  const r = tLessonRating(lid);
  return r ? T("teacher.tLessonRatingHtml", { r }) : "";
}

// متوسط درجات الطالب في الكويزات كنسبة مئوية
export function studentQuizAvg(sid) {
  return studentQuizAvgOf(lessonsState.attempts, sid);
}

export async function teacherLoadLessons() {
  // ترحيل لمرة واحدة: أي كويز قديم متخزن جوه درس بينقل لمجموعة quizzes مربوط بنفس الدرس،
  // ونتايج الطلبة القديمة بتفضل شغالة لأن الكويز الجديد بيحتفظ بـ lessonId الأصلي
  const legacy = await listLessonsOfTeacher(fbUser.uid);
  const withQuiz = legacy.filter((l) => Array.isArray(l.quiz) && l.quiz.length);
  for (const l of withQuiz) {
    await addQuizRaw({
      teacherId: fbUser.uid,
      teacherName: l.teacherName || "",
      subject: l.subject || "",
      stage: l.stage || "",
      title: "كويز " + (l.title || "الدرس"),
      lessonId: l.id,
      questions: l.quiz,
      createdAt: l.createdAt || serverNow(),
    });
    await dropLessonQuizField(l.id);
  }
  const [ls, at, ex, qz, st] = await Promise.all([
    listLessonsOfTeacher(fbUser.uid),
    listAttemptsOfTeacher(fbUser.uid),
    listExamsOfTeacher(fbUser.uid),
    listQuizzesOfTeacher(fbUser.uid),
    listStudentsOfTeacher(fbUser.uid),
  ]);
  teacherCache = st;
  lessonsState.lessons = newestFirst(ls);
  lessonsState.attempts = at;
  lessonsState.exams = newestFirst(ex);
  lessonsState.quizzes = newestFirst(qz);
}

// صورة الطالب الصغيرة في قوائم المدرس (أو أول حرف من اسمه لو مفيش صورة)
function tAvatarHtml(s) {
  const size = 30;
  if (s.avatar) return T("teacher.tAvatarHtml", { s, size });
  const nm = (s.name || "").trim();
  return T("teacher.tAvatarHtml_2", { esc, nm, size });
}

export async function renderTeacherDash() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("teacher.renderTeacherDash");
  try { await teacherLoad(); }
  catch (e) { app.innerHTML = T("teacher.renderTeacherDash_2", { e, esc }); return; }
  const { pending, approved } = partitionStudents(teacherCache);
  // إعلان المنصة + نشاط الأسبوع (لوحة الشرف) — فشلهم ميوقفش اللوحة
  let bcData = null, weekActs = [];
  try {
    const bcSnap = await getBroadcast();
    bcData = bcSnap;
  } catch (_) {}
  let addReqs = [];
  try {
    const rq = await listPendingRequestsOfTeacher(fbUser.uid);
    addReqs = rq;
  } catch (_) {}
  teacherAddReqs = addReqs;
  try { await loadAboutSettings(); } catch (_) {} // تيذر «عن المهندس» في آخر اللوحة
  try {
    const ws = weekStartFriday();
    const actSnap = await listActivityOfTeacher(fbUser.uid);
    weekActs = activitiesSince(actSnap, ws);
  } catch (_) {}
  app.innerHTML = T("teacher.renderTeacherDash_3", { aboutTeaserHtml, addReqs, approved, bcData, broadcastBannerHtml, closing, dashGradeFilter, esc, fbProfile, fbUser, gradesOfStage, honorBoardCard, pending, stageOfGrade, studentQuizAvg, subFmtDate, subInfo, tAvatarHtml, teacherTabs, waLink, weekActs });
  bindTeacherTabs();
  import("./backup-extras.js").then((m) => m.mountBackupReminder(document.querySelector(".tabs"))).catch(() => {});
  bindAboutTeaser();
  document.querySelectorAll("[data-glink]").forEach((el) => el.onclick = () => location.hash = el.dataset.glink);
  document.querySelectorAll("[data-req-ok]").forEach((b) => b.onclick = () => teacherAnswerAddReq(b.dataset.reqOk, true));
  document.querySelectorAll("[data-req-no]").forEach((b) => b.onclick = () => teacherAnswerAddReq(b.dataset.reqNo, false));
  document.querySelectorAll("[data-ok]").forEach((b) => b.onclick = () => teacherSetStatus(b.dataset.ok, "approved"));
  document.querySelectorAll("[data-no]").forEach((b) => b.onclick = () => teacherSetStatus(b.dataset.no, "rejected"));
  document.querySelectorAll("[data-rs]").forEach((b) => b.onclick = () => teacherResetStudent(b.dataset.rs));
  document.querySelectorAll("[data-dl]").forEach((b) => b.onclick = () => teacherDeleteStudent(b.dataset.dl));
  document.querySelectorAll("[data-ss]").forEach((b) => b.onclick = () => teacherSuspendToggle(b.dataset.ss, true));
  document.querySelectorAll("[data-us]").forEach((b) => b.onclick = () => teacherSuspendToggle(b.dataset.us, false));
  document.querySelectorAll("[data-spop]").forEach((b) => b.onclick = () => teacherShowStudent(b.dataset.spop));
  document.querySelectorAll("[data-snotes]").forEach((b) => b.onclick = () => openStudentNotes(b.dataset.snotes));
  document.querySelectorAll("[data-dgf]").forEach((b) => b.onclick = () => { set_dashGradeFilter(b.dataset.dgf); renderTeacherDash(); });
  window.scrollTo(0, 0);
}

// بوب-أب تفاصيل الطالب: بياناته + سجل كويزاته وامتحاناته + واتساب للطالب وولي أمره + تعديل رقم ولي الأمر
export function teacherShowStudent(id) {
  const s = teacherCache.find((x) => x.id === id);
  if (!s) return;
  const attempts = lessonsState.attempts.filter((a) => a.studentId === id)
    .sort((a, b) => (b.updatedAt && a.updatedAt ? b.updatedAt.seconds - a.updatedAt.seconds : 0));
  const avg = studentQuizAvg(id);
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = T("teacher.teacherShowStudent", { GRADES, attempts, avg, esc, fmtTs, s, stageOfGrade, teacherExams: lessonsState.exams, teacherLessons: lessonsState.lessons, teacherQuizzes: lessonsState.quizzes, waLink });
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  ov.querySelector("#ov-close").onclick = () => ov.remove();
  ov.querySelectorAll("#ov-preport, #ov-cert").forEach((a) => a.addEventListener("click", () => ov.remove()));
  ov.querySelector("#gr-save").onclick = async () => {
    const v = ov.querySelector("#gr-edit").value;
    const m = ov.querySelector("#gr-msg");
    try {
      await useCases.changeStudentGrade(id, v);
      s.grade = v;
      m.className = "msg good"; m.textContent = "اتحفظ الصف الجديد ✅";
    } catch (e) { m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
  };
  ov.querySelector("#pp-save").onclick = async () => {
    const v = normalizeEgPhone(ov.querySelector("#pp-edit").value);
    const m = ov.querySelector("#pp-msg");
    if (!v) { m.className = "msg bad"; m.textContent = "اكتب رقم مصري صح (11 رقم يبدأ بـ 01)."; return; }
    try {
      await useCases.saveParentPhone(id, v);
      s.parentPhone = v;
      m.className = "msg good"; m.textContent = "اتحفظ الرقم ✅";
      setTimeout(() => { ov.remove(); renderTeacherDash(); }, 900);
    } catch (e) { m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
  };
}

var teacherAddReqs = [];
/* قبول/رفض طلب طالب عاوز يضيف المدرس ده: القبول بيضيفه لـ teacherIds بتاعة الطالب
   (القواعد بتسمح بده بس لو الطلب موجود ومعلّق وموجّه لنفس المدرس) */
async function teacherAnswerAddReq(id, accept) {
  const r = teacherAddReqs.find((x) => x.id === id);
  if (!r) return;
  try {
    await useCases.answerJoinRequest(r, accept, fbUser.uid);
    renderTeacherDash();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

async function teacherSetStatus(id, status) {
  try {
    const s = teacherCache.find((x) => x.id === id);
    await useCases.changeStudentStatus(s || { id }, status);
    await teacherLoad();
    renderTeacherDash();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

async function teacherResetStudent(id) {
  const s = teacherCache.find((x) => x.id === id);
  if (!s) return;
  if (!confirm(`هيتبعت إيميل إعادة ضبط الباسورد لـ ${s.email}. موافق؟`)) return;
  try {
    await useCases.sendPasswordReset(s.email);
    alert("اتبعت الإيميل ✅ الطالب يفتحه ويعمل باسورد جديد.");
  } catch (e) { alert(authErrAr(e)); }
}

/* إيقاف طالب مؤقتًا عن محتوى المدرس ده بس (من غير ما يتأثر باقي مدرسيه): بنضيف/نشيل uid المدرس في suspendedBy */
async function teacherSuspendToggle(id, suspend) {
  const s = teacherCache.find((x) => x.id === id);
  if (!s) return;
  try {
    await useCases.suspendStudentForTeacher(id, fbUser.uid, suspend);
    showToast(suspend ? `اتوقف ${s.name} عن محتواك مؤقتًا ⛔` : `رجع وصول ${s.name} لمحتواك ✅`, "good");
    await teacherLoad();
    renderTeacherDash();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

/* حذف نهائي: مودال تأكيد بيوضح إن المحاولات والتقييمات والبيانات كلها هتتمسح */
function teacherDeleteStudent(id) {
  const s = teacherCache.find((x) => x.id === id);
  if (!s) return;
  confirmDeleteStudent(s, async () => { await teacherLoad(); renderTeacherDash(); });
}

/* صفحة النقل الجماعي للمدرس — طلابه المقبولين بس */
export async function renderTeacherTransfer() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  if (!teacherCache) {
    app.innerHTML = T("teacher.renderTeacherTransfer");
    try { await teacherLoad(); }
    catch (e) { app.innerHTML = T("teacher.renderTeacherTransfer_2", { e, esc }); return; }
  }
  renderTransferPage({
    students: teacherCache || [],
    wrap: (content) => { app.innerHTML = teacherTabs("students") + content + closing(); bindTeacherTabs(); },
    backHash: "#/teacher",
    onDone: async () => { await teacherLoad(); renderTeacherTransfer(); },
  });
}