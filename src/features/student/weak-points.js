import { sLessonOpen } from "../../domain/reporting.js";
import { weakAreas } from "../../domain/weak-points.js";
import { studentWeakHtml } from "../../shared/weak-points.view.js";
import { sVisible, studentData } from "./shell.js";

/* كارت «نقاط ضعفك» في تحليل الطالب. من الداتا المحمّلة بالفعل (من غير قراءات جديدة). */
export function mountStudentWeak(anchor) {
  try {
    const d = studentData;
    const areas = weakAreas({ attempts: d.attempts, quizzes: (d.quizzes || []).filter(sVisible), exams: (d.exams || []).filter(sVisible), lessons: (d.lessons || []).filter((l) => sVisible(l) && sLessonOpen(l)) });
    const box = document.createElement("div");
    box.innerHTML = studentWeakHtml(areas);
    (anchor || document.getElementById("app") || document.body).insertAdjacentElement(anchor ? "afterend" : "beforeend", box.firstElementChild);
  } catch (e) { console.warn("نقاط الضعف مش شغالة", e); }
}
