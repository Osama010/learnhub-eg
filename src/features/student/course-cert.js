import { fbProfile } from "../../core/session.js";
import { esc } from "../../core/utils.js";
import { courseCompletion } from "../../domain/progress.js";
import { sLessonOpen } from "../../domain/reporting.js";
import { sVisible, sWatchedSet, studentData } from "./shell.js";

/* ---------- شهادة إتمام الكورس ----------
   بتظهر لكل مدرس الطالب خلّص دروسه كلها واجتاز كويزاته. الـ PDF بيتعمل على جهاز الطالب وقت الضغط.
   شهادة ذاتية الإصدار: التوقيع اسم المدرس مكتوب بخط توقيع (مش توقيع بخط اليد) ومن غير رقم تحقق. */
const pad = (n) => String(n).padStart(2, "0");
export function certForCourse({ student, teacher, now }) {
  const d = new Date(now);
  return { title: "شهادة إتمام كورس", intro: "تشهد منصة المستر بأن الطالب", name: (student && student.name) || "", grade: (student && student.grade) || "",
    line: ("أتمّ بنجاح كورس " + (teacher.subject || "المادة") + " مع " + (teacher.name || "المدرس") + " بعد مشاهدة كل الدروس واجتياز كل الاختبارات").slice(0, 200),
    teacher: teacher.name || "", sign: teacher.name || "", subject: teacher.subject || "", date: d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear() };
}
export function mountCourseCerts(anchor) {
  try {
    if (!anchor) return;
    const tids = (fbProfile && fbProfile.teacherIds) || [];
    const watchedIds = sWatchedSet();
    const done = [], waiting = [];
    tids.forEach((tid) => {
      const t = (studentData.teachers || []).find((x) => x.id === tid);
      if (!t) return;
      const c = courseCompletion({ lessons: studentData.lessons, quizzes: studentData.quizzes, attempts: studentData.attempts, watchedIds, teacherId: tid, lessonOpen: sLessonOpen, visible: sVisible, marked: t.courseComplete === true });
      if (c.done) done.push({ t, c }); else if (c.finished) waiting.push(t);
    });
    if (!done.length && !waiting.length) return;
    const box = document.createElement("div");
    box.className = "card";
    box.innerHTML = '<h2 class="u-fs18px-mt0">🎓 شهاداتي</h2><div class="muted u-fs125px" style="margin-bottom:6px;">الشهادة بتفتح لما تخلّص كل الدروس وتعدّي كل الكويزات والمدرس يعلن إن الكورس اكتمل.</div>'
      + done.map((x) => '<div class="btnrow" style="justify-content:space-between;border-top:1px solid var(--line);padding:8px 0;"><span><b>' + esc(x.t.name || "") + "</b>" + (x.t.subject ? ' <span class="muted u-fs125px">· ' + esc(x.t.subject) + "</span>" : "")
        + ' <span class="muted u-fs12px">(' + x.c.watched + " درس · " + x.c.passed + ' اختبار)</span></span><button type="button" class="btn sm" data-cc="' + esc(x.t.id) + '">🎓 شهادة إتمام</button></div>').join("")
      + waiting.map((t) => '<div class="muted u-fs125px" style="padding:6px 0;">خلّصت كل المتاح عند ' + esc(t.name || "") + ". الشهادة هتفتح لما المدرس يعلن إن الكورس اكتمل.</div>").join("")
      + '<div class="msg" id="cc-msg"></div>';
    anchor.insertAdjacentElement("afterend", box);
    box.querySelectorAll("[data-cc]").forEach((b) => b.onclick = async () => {
      const m = box.querySelector("#cc-msg"); b.disabled = true; m.className = "msg"; m.textContent = "بنجهز الشهادة...";
      try {
        const { certPdfFile, downloadFile } = await import("../teacher/certificate.js");
        const t = done.find((x) => x.t.id === b.dataset.cc).t;
        downloadFile(await certPdfFile(certForCourse({ student: fbProfile, teacher: t, now: Date.now() })));
        m.className = "msg good"; m.textContent = "الشهادة نزلت ✅";
      } catch (e) { m.className = "msg bad"; m.textContent = "معرفتش أجهز الشهادة، جرّب تاني."; console.warn(e); }
      b.disabled = false;
    });
  } catch (e) { console.warn("الشهادات مش شغالة", e); }
}
