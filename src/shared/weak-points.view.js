import { esc } from "../core/utils.js";
const LV = { weak: ["🔴", "محتاج مراجعة"], mid: ["🟡", "كويس بس ينفع تراجع"], strong: ["🟢", "قوي"] };
const bar = (pct, lv) => '<span class="wp-bar"><i class="wp-' + lv + '" style="width:' + pct + '%"></i></span>';

/** كارت الطالب: مواضيعه من الأضعف للأقوى. */
export function studentWeakHtml(areas) {
  if (!areas.length) return '<div class="card wp-card"><h2 class="u-fs18px-mt0">🎯 نقاط ضعفك</h2><div class="muted">حل كام كويز أو امتحان وهنقولك أنهي دروس محتاجة مراجعة.</div></div>';
  return '<div class="card wp-card"><h2 class="u-fs18px-mt0">🎯 نقاط ضعفك</h2><div class="muted u-fs13px" style="margin-bottom:8px;">مرتبة من الأضعف. بتتحسب من إجاباتك في الكويزات والامتحانات.</div>'
    + areas.map((a) => '<div class="wp-row"><div class="wp-h"><b>' + LV[a.level][0] + " " + esc(a.label) + '</b><span>' + a.pct + "%</span></div>" + bar(a.pct, a.level)
      + '<div class="muted u-fs12px">' + a.correct + " صح من " + a.total + " سؤال · " + LV[a.level][1]
      + (a.lessonId && a.level !== "strong" ? ' · <a href="#/student/lesson/' + esc(a.lessonId) + '">راجع الدرس ←</a>' : "") + "</div></div>").join("") + "</div>";
}

/** كارت المدرس: أضعف دروس + أضعف أسئلة عند الفصل. */
export function teacherWeakHtml(areas, questions) {
  if (!areas.length && !questions.length) return '<div class="card wp-card"><h2 class="u-fs18px-mt0">🎯 نقاط ضعف الفصل</h2><div class="muted">لسه مفيش نتايج كفاية. لما الطلاب يحلوا كويزات هتظهر هنا الدروس والأسئلة اللي أغلبهم بيغلط فيها.</div></div>';
  return '<div class="card wp-card"><h2 class="u-fs18px-mt0">🎯 نقاط ضعف الفصل</h2>'
    + (areas.length ? '<h3 class="u-fs15px">أضعف الدروس والاختبارات</h3>' + areas.map((a) => '<div class="wp-row"><div class="wp-h"><b>' + LV[a.level][0] + " " + esc(a.label) + '</b><span>' + a.pct + "%</span></div>" + bar(a.pct, a.level) + '<div class="muted u-fs12px">' + a.correct + " إجابة صح من " + a.total + " (" + a.attempts + " محاولة)</div></div>").join("") : "")
    + (questions.length ? '<h3 class="u-fs15px" style="margin-top:14px;">الأسئلة اللي أغلب الطلاب بيغلطوا فيها</h3>' + questions.map((q) => '<div class="wp-row"><div class="wp-h"><b>' + esc(String(q.q).slice(0, 120) || "سؤال") + '</b><span>' + q.pct + "%</span></div>" + bar(q.pct, q.pct < 50 ? "weak" : q.pct < 75 ? "mid" : "strong") + '<div class="muted u-fs12px">' + esc(q.itemTitle) + " · سؤال " + (q.idx + 1) + " · " + q.correct + " صح من " + q.total + "</div></div>").join("") : "")
    + '<div class="muted u-fs12px" style="margin-top:8px;">الأسئلة اللي جاوب عليها 3 طلاب أو أكتر بس هي اللي بتظهر.</div></div>';
}
