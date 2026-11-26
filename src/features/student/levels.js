import { T } from "../../core/templates.js";
import { sStreak } from "./activity.js";
import { sWatchedSet, studentData } from "./shell.js";
import { sLevelFor } from "../../domain/student.js";
import { pointsOf } from "../../domain/progress.js";
import { levelProgressPct } from "./levels.presenter.js";

/* نقاط الطالب: 10 لكل درس اتشاف + 20 لكل اختبار ناجح (50% أو أكتر) */
function sPoints() {
  return pointsOf({ lessons: studentData.lessons, attempts: studentData.attempts, watchedIds: sWatchedSet() });
}
export function sLevelCardHtml() {
  const pts = sPoints();
  const lv = sLevelFor(pts);
  const pct = levelProgressPct(pts, lv);
  const streak = sStreak();
  return T("student.sLevelCardHtml", { lv, pct, pts, streak });
}