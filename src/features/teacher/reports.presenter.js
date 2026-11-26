/* Presenter تقارير المدرس: بيبني نموذج التقرير (عنوان/أعمدة/صفوف) من البيانات المتحقنة. صافي: من غير DOM ولا Firebase. */
import { attemptPct, examStatus } from "../../domain/quiz.js";
import { fmtTs } from "../../domain/format.js";
import { lessonHasPdf, lessonHasVideo } from "../../domain/media.js";
import { stageOfGrade } from "../../domain/student.js";
import { STAGE_NAMES } from "./lessons.presenter.js";

export const TREP_TYPES = [
  ["students", "تقرير الطلاب"],
  ["stage", "تقرير مرحلة"],
  ["compare", "مقارنة المراحل"],
  ["lessons", "تقرير الدروس"],
  ["quiz", "نتائج الكويزات"],
  ["top", "أوائل المراحل 🏆"],
  ["exams", "تقرير الامتحانات"],
];

/** نص CSV (بـ BOM) من نموذج التقرير. */
export function reportCsv(rep) {
  const lines = [rep.columns].concat(rep.rows.map((r) => r.cells)).map((r) => r.map((cl) => `"${String(cl == null ? "" : cl).replace(/"/g, '""')}"`).join(","));
  return "\ufeff" + lines.join("\r\n");
}

// بيبني التقرير الحالي: {title, columns, rows (نصوص للتصدير), view, summary}
export function buildReportModel({ students: studentList, state: trepState, profile, data: lessonsState, studentQuizAvg, quizAttemptsFor }) {
  const students = (studentList || []).slice();
  const t = trepState.type;
  const pp = (s) => s.parentPhone || "غير مسجل";
  const stName = (g) => stageOfGrade(g) || "—";

  if (t === "stage") {
    const st = trepState.stage || ((profile && profile.stages) || [])[0] || "";
    let list = students.filter((s) => stageOfGrade(s.grade) === st);
    if (trepState.grade) list = list.filter((s) => s.grade === trepState.grade);
    const withAtt = list.filter((s) => studentQuizAvg(s.id) !== null);
    const avgAll = withAtt.length ? Math.round(withAtt.reduce((sum, s) => sum + studentQuizAvg(s.id), 0) / withAtt.length) : null;
    const lessonsN = lessonsState.lessons.filter((l) => l.stage === st).length;
    const examsN = lessonsState.exams.filter((e) => e.stage === st).length;
    const mkRow = (s) => ({
      cells: [s.name || "", stName(s.grade), s.grade || "—", s.phone || "", pp(s), s.status === "approved" ? "مقبول" : s.status === "rejected" ? "مرفوض" : "تحت المراجعة", studentQuizAvg(s.id) !== null ? studentQuizAvg(s.id) + "%" : "—", fmtTs(s.createdAt)],
      sid: s.id,
    });
    const rows = list.map(mkRow);
    return {
      title: "تقرير مرحلة " + (STAGE_NAMES[st] || st || "—"),
      summary: `الطلاب: ${list.length} · الدروس: ${lessonsN} · الامتحانات: ${examsN} · متوسط درجات المرحلة: ${avgAll !== null ? avgAll + "%" : "—"}`,
      columns: ["الاسم", "المرحلة", "السنة", "الموبايل", "ولي الأمر", "الحالة", "متوسط الدرجات", "تاريخ التسجيل"],
      rows, filtersDesc: ["المرحلة: " + (STAGE_NAMES[st] || st)].concat(trepState.grade ? ["الصف: " + trepState.grade] : []),
    };
  }

  if (t === "compare") {
    const stages = ((profile && profile.stages) || []);
    const cmpRows = stages.map((st) => {
      const lsn = lessonsState.lessons.filter((l) => l.stage === st).length;
      const qzn = lessonsState.quizzes.filter((q) => q.stage === st).length + lessonsState.exams.filter((e) => e.stage === st).length;
      const qids = new Set(lessonsState.quizzes.filter((q) => q.stage === st).map((q) => q.id));
      const eids = new Set(lessonsState.exams.filter((e) => e.stage === st).map((e) => e.id));
      const lids = new Set(lessonsState.lessons.filter((l) => l.stage === st).map((l) => l.id));
      const at = lessonsState.attempts.filter((a) => qids.has(a.quizId) || eids.has(a.examId) || lids.has(a.lessonId));
      const avg = at.length ? Math.round(at.reduce((sum, a) => sum + attemptPct(a), 0) / at.length) : null;
      return { cells: [STAGE_NAMES[st] || st, String(lsn), String(qzn), String(at.length), avg !== null ? avg + "%" : "—"] };
    });
    // أصعب الأسئلة: من إجابات الطلبة المتخزنة في المحاولات (answers)
    const sources = lessonsState.quizzes.map((q) => ({ kind: "كويز", title: q.title, stage: q.stage, questions: q.questions || [], id: q.id, lessonId: q.lessonId }))
      .concat(lessonsState.exams.map((e) => ({ kind: "امتحان", title: e.title, stage: e.stage, questions: e.quiz || [], id: e.id, lessonId: null })));
    const hard = [];
    sources.forEach((src) => {
      const at = src.kind === "كويز"
        ? lessonsState.attempts.filter((a) => a.quizId === src.id || (src.lessonId && a.lessonId === src.lessonId))
        : lessonsState.attempts.filter((a) => a.examId === src.id);
      const withAns = at.filter((a) => Array.isArray(a.answers) && a.answers.length);
      if (!withAns.length) return;
      src.questions.forEach((qq, qi) => {
        let wrong = 0, tot = 0;
        withAns.forEach((a) => {
          const an = a.answers[qi];
          if (an == null) return;
          tot++;
          if (an === false || (an && an.correct === false)) wrong++;
        });
        if (tot) hard.push({ wrongPct: Math.round((wrong / tot) * 100), text: qq.q || "", place: src.title, stage: STAGE_NAMES[src.stage] || src.stage || "—" });
      });
    });
    hard.sort((a, b) => b.wrongPct - a.wrongPct);
    const hardRows = hard.slice(0, 10).map((hh) => ({ cells: [hh.text, hh.place, hh.stage, hh.wrongPct + "%"] }));
    return {
      title: "مقارنة المراحل",
      summary: "متوسط الدرجات محسوب على كل محاولات الكويزات والامتحانات في المرحلة.",
      columns: ["المرحلة", "الدروس", "الكويزات والامتحانات", "المحاولات", "متوسط الدرجات"],
      rows: cmpRows, filtersDesc: [],
      extraTitle: "أصعب الأسئلة (تحليل على مستوى السؤال)",
      extraColumns: ["السؤال", "في", "المرحلة", "نسبة الغلط"],
      extraRows: hardRows,
      extraEmpty: "لسه مفيش بيانات إجابات — التحليل ده بيتملى أول ما الطلبة يحلوا كويزات وامتحانات (مع واجهة الطالب).",
      extraNote: "نسبة الغلط = عدد الطلبة اللي غلطوا في السؤال من اللي جاوبوه. بيتحسب من إجابات كل سؤال المتخزنة في المحاولات.",
    };
  }

  if (t === "lessons") {
    const rows = lessonsState.lessons.map((l) => {
      const linked = lessonsState.quizzes.filter((q) => q.lessonId === l.id);
      const linkedIds = linked.map((q) => q.id);
      const at = lessonsState.attempts.filter((a) => a.lessonId === l.id || linkedIds.includes(a.quizId));
      const avg = at.length ? Math.round(at.reduce((s, a) => s + attemptPct(a), 0) / at.length) : null;
      const content = [lessonHasVideo(l) ? "فيديو" : "", lessonHasPdf(l) ? "PDF" : ""].filter(Boolean).join(" + ") || "—";
      return { cells: [STAGE_NAMES[l.stage] || l.stage || "—", l.grade || "كل الصفوف", String(l.unit || "—"), String(l.lessonNum || "—"), l.title || "", content, String(linked.length), String(at.length), avg !== null ? avg + "%" : "—"] };
    });
    return { title: "تقرير الدروس", columns: ["المرحلة", "الصف", "الوحدة", "الدرس", "العنوان", "المحتوى", "كويزات مرتبطة", "المحاولات", "متوسط الدرجة"], rows, filtersDesc: [] };
  }

  if (t === "quiz") {
    const q = lessonsState.quizzes.find((x) => x.id === trepState.quizId) || lessonsState.quizzes[0];
    const at = q ? quizAttemptsFor(q) : [];
    const pcts = at.map(attemptPct);
    const summary = q && at.length
      ? `المحاولات: ${at.length} · أعلى ${Math.round(Math.max(...pcts))}% · أقل ${Math.round(Math.min(...pcts))}% · المتوسط ${Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length)}%`
      : q ? "مفيش محاولات على الكويز ده لسه" : "مفيش كويزات لسه";
    const rows = at.map((a) => {
      const s = students.find((x) => x.id === a.studentId);
      return { cells: [a.studentName || "—", `${a.score} من ${a.total}`, attemptPct(a) + "%", a.updatedAt ? fmtTs(a.updatedAt) : "—"], sid: a.studentId || null };
    });
    return {
      title: "نتائج كويز: " + (q ? q.title : "—"), summary,
      columns: ["الطالب", "الدرجة", "النسبة", "آخر محاولة"], rows,
      filtersDesc: q ? ["الكويز: " + q.title] : [],
    };
  }

  if (t === "top") {
    const stages = ((profile && profile.stages) || []);
    const rows = [];
    stages.forEach((st) => {
      const ranked = students
        .filter((s) => stageOfGrade(s.grade) === st && s.status === "approved")
        .map((s) => ({ s, avg: studentQuizAvg(s.id), n: lessonsState.attempts.filter((a) => a.studentId === s.id).length }))
        .filter((r) => r.avg !== null)
        .sort((a, b) => b.avg - a.avg);
      if (!ranked.length) {
        rows.push({ cells: [STAGE_NAMES[st] || st, "—", "لا توجد نتائج كويزات بعد", "—", "—"] });
        return;
      }
      // الترتيب بالمراكز مع التعادل: نفس المتوسط = نفس المركز، وأول 3 مراكز
      let rank = 0, prevAvg = null, idx = 0;
      ranked.forEach((r) => {
        idx++;
        if (r.avg !== prevAvg) { rank = idx; prevAvg = r.avg; }
        if (rank <= 3) rows.push({ cells: [STAGE_NAMES[st] || st, String(rank), r.s.name || "", r.avg + "%", String(r.n)], sid: r.s.id });
      });
    });
    return { title: "أوائل المراحل (أفضل 3)", columns: ["المرحلة", "المركز", "الطالب", "متوسط الدرجات", "عدد الاختبارات"], rows, filtersDesc: [] };
  }

  if (t === "exams") {
    const rows = lessonsState.exams.map((e) => {
      const at = lessonsState.attempts.filter((a) => a.examId === e.id);
      const avg = at.length ? Math.round(at.reduce((s, a) => s + attemptPct(a), 0) / at.length) : null;
      const [stTxt] = examStatus(e);
      return { cells: [STAGE_NAMES[e.stage] || e.stage || "—", e.grade || "كل الصفوف", e.title || "", String((e.quiz || []).length), e.openAt ? fmtTs(e.openAt) : "مفتوح دائماً", e.closeAt ? fmtTs(e.closeAt) : "—", stTxt, String(at.length), avg !== null ? avg + "%" : "—"] };
    });
    return { title: "تقرير الامتحانات", columns: ["المرحلة", "الصف", "العنوان", "الأسئلة", "الفتح", "القفل", "الحالة", "المحاولات", "المتوسط"], rows, filtersDesc: [] };
  }

  // students (الافتراضي)
  let list = students;
  if (trepState.stage) list = list.filter((s) => stageOfGrade(s.grade) === trepState.stage);
  if (trepState.grade) list = list.filter((s) => s.grade === trepState.grade);
  const rows = list.map((s) => ({
    cells: [s.name || "", stName(s.grade), s.grade || "—", s.phone || "", pp(s), s.email || "", s.status === "approved" ? "مقبول" : s.status === "rejected" ? "مرفوض" : "تحت المراجعة", studentQuizAvg(s.id) !== null ? studentQuizAvg(s.id) + "%" : "—", String(lessonsState.attempts.filter((a) => a.studentId === s.id).length), fmtTs(s.createdAt)],
    sid: s.id,
  }));
  return {
    title: "تقرير الطلاب",
    columns: ["الاسم", "المرحلة", "السنة", "الموبايل", "ولي الأمر", "الإيميل", "الحالة", "متوسط الدرجات", "عدد الاختبارات", "تاريخ التسجيل"],
    rows, filtersDesc: (trepState.stage ? ["المرحلة: " + (STAGE_NAMES[trepState.stage] || trepState.stage)] : []).concat(trepState.grade ? ["الصف: " + trepState.grade] : []),
  };
}
