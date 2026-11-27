import { app, esc } from "../../core/utils.js";
import { publicPageModel } from "../../domain/teacher-page.js";
import { listApprovedReviews, getTeacherPublic } from "../../main/data.js";
import { reviewSummary, starsText } from "../../domain/reviews.js";
import { closing } from "../../shared/common.js";

/* ---------- صفحة المدرس العامة (#/t/ID) ولينك الدعوة (#/join/ID) ---------- مفتوحة من غير تسجيل دخول. */
export function pageHtml(m) {
  const stat = (n, l) => '<div><b style="display:block;font-size:24px;color:var(--primary-dark);">' + n + '</b><span class="muted u-fs125px">' + l + "</span></div>";
  return '<div style="max-width:560px;margin:0 auto;padding:16px;">'
    + '<div class="card center u-p28px">' + (m.avatar ? '<img src="' + esc(m.avatar) + '" alt="" style="width:110px;height:110px;border-radius:50%;object-fit:cover;border:3px solid var(--primary-soft);">' : '<div style="width:110px;height:110px;border-radius:50%;background:var(--primary);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:44px;font-weight:800;">' + esc((m.name || "؟").trim().charAt(0)) + "</div>")
    + '<h1 style="font-size:24px;margin:10px 0 2px;">' + esc(m.name) + "</h1>"
    + '<div class="muted">' + esc(m.subject) + (m.stages.length ? " · " + esc(m.stages.join("، ")) : "") + "</div>"
    + (m.bio ? '<p style="margin:12px 0 0;line-height:1.8;">' + esc(m.bio) + "</p>" : "") + "</div>"
    + '<div class="card" style="display:grid;grid-template-columns:repeat(3,1fr);text-align:center;gap:8px;">' + stat(m.stats.students, "طالب") + stat(m.stats.lessons, "درس") + stat(m.stats.quizzes, "كويز") + "</div>"
    + '<div class="card center"><a class="btn" href="#/join/' + encodeURIComponent(m.id) + '">سجّل عند ' + esc(m.name) + '</a><div class="muted u-fs125px" style="margin-top:8px;">عندك حساب؟ <a href="#/login">دخول</a></div></div>'
    + "</div>";
}
export function reviewsHtml(list) {
  const sm = reviewSummary(list);
  if (!sm.count) return "";
  return '<div class="card"><h2 class="u-fs18px-mt0">⭐ تقييمات الطلاب</h2><div style="font-size:22px;color:#f59e0b;direction:ltr;text-align:right;">' + starsText(sm.avg) + ' <span class="muted u-fs125px" style="direction:rtl;">' + sm.avg + " من 5 · " + sm.count + " تقييم</span></div>"
    + list.filter((r) => r.text).slice(0, 10).map((r) => '<div style="border-top:1px solid var(--line);padding:8px 0;"><b>' + esc(r.studentName || "طالب") + '</b> <span style="color:#f59e0b;">' + starsText(r.stars) + "</span><div>" + esc(r.text) + "</div></div>").join("") + "</div>";
}
export async function renderTeacherPage(id) {
  app.innerHTML = '<div class="spin">بنحمّل الصفحة...</div>';
  try {
    const m = publicPageModel(await getTeacherPublic(id));
    if (!m) { app.innerHTML = '<div style="max-width:520px;margin:40px auto;padding:16px;"><div class="card center"><h2>الصفحة دي مش متاحة</h2><p class="muted">ممكن المدرس لسه ما فعّلهاش.</p><a class="btn" href="#/login">الرئيسية</a></div></div>'; return; }
    app.innerHTML = pageHtml(m) + '<div id="tp-reviews"></div>' + closing();
    listApprovedReviews(id).then((l) => { const h = document.getElementById("tp-reviews"); if (h) h.innerHTML = reviewsHtml(l); }).catch(() => {});
    try { document.title = m.name + " | المستر"; } catch (_) {}
  } catch (e) { app.innerHTML = '<div style="max-width:520px;margin:40px auto;padding:16px;"><div class="card center"><p class="msg bad">معرفتش أفتح الصفحة. جرّب تاني.</p></div></div>'; }
  window.scrollTo(0, 0);
}
/** لينك الدعوة: بيختار المدرس مسبقًا في التسجيل (نفس آلية كارت المدرس في الهبوط). */
export function renderJoin(id, go) {
  try { localStorage.setItem("t4kPreTeacher", String(id)); } catch (_) {}
  go("#/register");
}
