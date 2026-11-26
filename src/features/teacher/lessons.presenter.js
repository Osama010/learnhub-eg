/* Presenter الدروس والكويزات والامتحانات: ثوابت وقوائم وفورمات (دوال صافية، من غير DOM ولا Firebase). */
import { qFromStored } from "../../domain/quiz.js";
import { termOf } from "../../domain/term.js";

export const STAGE_NAMES = { "ابتدائي": "الابتدائية", "إعدادي": "الإعدادية", "ثانوي": "الثانوية" };
export const STAGE_ICONS = { "ابتدائي": "🎒", "إعدادي": "📗", "ثانوي": "🎓" };
export const QTYPES = [["mcq", "اختيار من متعدد"], ["multi", "اختيار متعدد (أكتر من إجابة)"], ["tf", "صح أو غلط"], ["text", "إجابة قصيرة"], ["fill", "أكمل الفراغ"], ["match", "توصيل"], ["num", "إجابة رقمية"]];

/* فورمات فاضية (الترم بيتحقن) */
export const blankExamForm = (term) => ({ id: null, title: "", desc: "", openAt: "", closeAt: "", closed: false, quiz: [], grade: "", term });
export const blankLessonForm = (term) => ({ id: null, unit: "", lessonNum: "", title: "", desc: "", videoUrl: "", pdfUrl: "", pdfMode: "file", pdfFile: null, pdfMeta: null, publishAt: "", grade: "", term });
export const blankQuizForm = (term) => ({ id: null, title: "", lessonId: "", quiz: [], grade: "", oneAttempt: false, term });

/* فورمات التعديل من المحتوى المتخزّن (toLocal = تحويل Timestamp لقيمة input) */
export function lessonFormFrom(l, med, toLocal) {
  return {
    id: l.id, unit: l.unit || "", lessonNum: l.lessonNum || "", title: l.title || "",
    videoUrl: med.videoUrl || "", pdfUrl: med.pdfUrl || "", pdfMode: med.pdfFile || !med.pdfUrl ? "file" : "link", pdfFile: null, pdfMeta: med.pdfFile || null, desc: l.desc || "",
    publishAt: toLocal(l.publishAt), grade: l.grade || "", term: termOf(l),
  };
}
export const quizFormFrom = (q) => ({ id: q.id, title: q.title || "", lessonId: q.lessonId || "", quiz: (q.questions || []).map(qFromStored), grade: q.grade || "", oneAttempt: q.maxAttempts === 1, term: termOf(q) });
export const examFormFrom = (e, toLocal) => ({ id: e.id, title: e.title || "", desc: e.desc || "", openAt: toLocal(e.openAt), closeAt: toLocal(e.closeAt), closed: !!e.closed, quiz: (e.quiz || []).map(qFromStored), grade: e.grade || "", term: termOf(e) });

/* فلاتر وترتيب القوائم */
export const byStage = (items, stage) => stage ? items.filter((x) => x.stage === stage) : items;
export const byGrade = (items, g) => g ? items.filter((x) => !x.grade || x.grade === g) : items;
export const byTerm = (items, t) => items.filter((x) => termOf(x) === t);
export const sortLessons = (l) => l.slice().sort((a, b) => (a.unit || 0) - (b.unit || 0) || (a.lessonNum || 0) - (b.lessonNum || 0));
export const sortQuizzes = (l) => l.slice().sort((a, b) => (a.title || "").localeCompare(b.title || "", "ar"));
/** عدد الدروس وعدد الكويزات+الامتحانات في المرحلة (للتابات). */
export const stageCounts = (lessons, quizzes, exams, stage) => ({ ln: byStage(lessons, stage).length, qn: byStage(quizzes, stage).length + byStage(exams, stage).length });
