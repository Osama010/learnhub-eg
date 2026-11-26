import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { teacherCache } from "./dashboard.js";
import { waLink } from "../../shared/transfer.js";
import { eligibleStudents, lateOf, reminderFor } from "./late-students.presenter.js";

/* ---------- المتأخرين عن كويز/امتحان + تذكير واتساب ---------- */
export function lateStudentsHtml(stage, attempts, kindLabel, title, grade) {
  // grade فاضي = المحتوى لكل صفوف المرحلة، غير كده للصف المحدد بس
  const students = eligibleStudents(teacherCache, stage, grade);
  if (!students.length) return "";
  const late = lateOf(students, attempts);
  if (!late.length) return T("teacher.lateStudentsHtml", { kindLabel });
  const rows = late.map((x) => {
    const { parent, to, text } = reminderFor(x, kindLabel, title);
    return T("teacher.lateStudentsHtml_2", { esc, parent, text, to, waLink, x });
  }).join("");
  return T("teacher.lateStudentsHtml_3", { esc, grade, kindLabel, late, rows });
}