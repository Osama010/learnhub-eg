/* Presenter المواد الدراسية: دوال صافية (من غير DOM ولا Firebase). */
import { gradesOfStage, stageOfGrade } from "../../domain/student.js";

export const CORE_SUBJECTS = {
  "ابتدائي": ["اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الدراسات الاجتماعية", "التربية الدينية", "تكنولوجيا المعلومات"],
  "إعدادي": ["اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الدراسات الاجتماعية", "التربية الدينية", "تكنولوجيا المعلومات"],
  "ثانوي": ["اللغة العربية", "اللغة الإنجليزية", "اللغة الفرنسية", "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء", "الجيولوجيا", "التاريخ", "الجغرافيا", "الفلسفة والمنطق", "البرمجة والذكاء الاصطناعي"],
};
export const STAGES = ["ابتدائي", "إعدادي", "ثانوي"];

/** عدد طلاب المدرس في كل مرحلة. */
export function stageCountsOf(students, tid) {
  const counts = {};
  (students || []).forEach((s) => {
    if (!(s.teacherIds || []).includes(tid)) return;
    const st = stageOfGrade(s.grade);
    if (st) counts[st] = (counts[st] || 0) + 1;
  });
  return counts;
}

/** نص: كل مرحلة بيدرّسها المدرس وقد إيه طالب فيها. */
export function stagesTextOf(t, students) {
  const counts = stageCountsOf(students, t.id);
  const stages = (t.stages && t.stages.length) ? t.stages : Object.keys(counts);
  if (!stages.length) return "—";
  return stages.map((st) => `${st}: ${counts[st] || 0}`).join(" · ");
}

/** صفوف تقرير المواد: عدد المدرسين والطلاب ومتوسط التقدم. */
export function subjectRows(subjects, teachers, students) {
  return (subjects || []).map((s) => {
    const ts = (teachers || []).filter((t) => (t.subject || "").trim() === s.name.trim());
    const tids = ts.map((t) => t.id);
    const ss = (students || []).filter((st) => (st.teacherIds || []).some((id) => tids.includes(id)));
    let progSum = 0, progN = 0;
    ss.forEach((st) => {
      const p = st.progress || {};
      const vals = Object.keys(p).map((k) => p[k] && p[k].percent).filter((v) => typeof v === "number");
      if (vals.length) { progSum += vals.reduce((a, b) => a + b, 0) / vals.length; progN++; }
    });
    return { s, teachers: ts.length, students: ss.length, avg: progN ? Math.round(progSum / progN) + "%" : "—" };
  });
}

/** رسالة خطأ لإضافة مادة (فاضية الاسم أو مكررة) أو null. */
export function validateNewSubject(subjects, { name, stage, grade }) {
  if (!name) return "اكتب اسم المادة.";
  const dup = (subjects || []).find((s) => s.name === name && s.stage === stage && (s.grade || "") === grade);
  if (dup) return grade ? "المادة دي موجودة في الصف ده قبل كده." : "المادة دي موجودة كمادة عامة في المرحلة دي قبل كده.";
  return null;
}

/** المواد الأساسية الناقصة لكل مرحلة وصف. */
export function missingCoreSubjects(subjects) {
  const missing = [];
  Object.keys(CORE_SUBJECTS).forEach((stage) => {
    gradesOfStage(stage).forEach((grade) => {
      CORE_SUBJECTS[stage].forEach((name) => {
        const exists = (subjects || []).find((s) => s.name === name && s.stage === stage && (s.grade || "") === grade);
        if (!exists) missing.push({ name, stage, grade });
      });
    });
  });
  return missing;
}
