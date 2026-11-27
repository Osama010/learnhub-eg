import { weakAreasOfClass, weakQuestions } from "../../domain/weak-points.js";
import { teacherWeakHtml } from "../../shared/weak-points.view.js";
import { lessonsState } from "./lessons.js";

/* كارت «نقاط ضعف الفصل» في تحليل المدرس. من الداتا المحمّلة بالفعل (من غير قراءات جديدة). */
export function mountTeacherWeak(anchor) {
  try {
    const s = lessonsState, a = { attempts: s.attempts, quizzes: s.quizzes, exams: s.exams, lessons: s.lessons };
    const box = document.createElement("div");
    box.innerHTML = teacherWeakHtml(weakAreasOfClass(a), weakQuestions(a));
    (anchor || document.getElementById("app") || document.body).insertAdjacentElement(anchor ? "afterend" : "beforeend", box.firstElementChild);
  } catch (e) { console.warn("نقاط الضعف مش شغالة", e); }
}
