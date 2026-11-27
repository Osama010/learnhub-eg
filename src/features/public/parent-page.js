import { app, esc } from "../../core/utils.js";
import { CODE_RE, parentView } from "../../domain/parent.js";
import { getParentView } from "../../main/data.js";
import { closing } from "../../shared/common.js";

/* ---------- صفحة ولي الأمر (#/p/الكود): للقراءة بس، من غير تسجيل دخول. اللقطة بيحدّثها الطالب لما يفتح المنصة ---------- */
const fmtAt = (ms) => { if (!ms) return ""; const d = new Date(ms); return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear(); };
export function parentHtml(v) {
  const s = v.stats, pct = s.lessons ? Math.round((s.watched / s.lessons) * 100) : 0;
  const stat = (n, l) => '<div><b style="display:block;font-size:24px;color:var(--primary-dark);">' + n + '</b><span class="muted u-fs125px">' + l + "</span></div>";
  return '<div style="max-width:560px;margin:0 auto;padding:16px;">'
    + '<div class="card center"><h1 style="font-size:22px;margin:0 0 4px;">تقدّم ' + esc(v.name || "الطالب") + "</h1><div class=\"muted\">" + esc(v.grade) + (v.updatedAt ? " · آخر تحديث " + esc(fmtAt(v.updatedAt)) : "") + "</div></div>"
    + '<div class="card" style="display:grid;grid-template-columns:repeat(3,1fr);text-align:center;gap:8px;">' + stat(s.watched + "/" + s.lessons, "درس اتشاف") + stat(s.avg == null ? "-" : s.avg + "%", "متوسط الدرجات") + stat(s.streak, "أيام متتالية") + "</div>"
    + '<div class="card"><div style="background:var(--line);border-radius:99px;height:10px;overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:var(--primary);"></div></div><div class="muted u-fs125px" style="margin-top:6px;">' + pct + "% من الدروس المتاحة · " + (s.activeToday ? "ذاكر النهارده ✅" : "لسه ماذاكرش النهارده") + " · أفضل تتابع " + s.best + " يوم</div></div>"
    + (v.weak.length ? '<div class="card"><h2 class="u-fs18px-mt0">🎯 محتاج مراجعة</h2>' + v.weak.map((w) => '<div class="btnrow" style="justify-content:space-between;border-top:1px solid var(--line);padding:6px 0;"><span>' + esc(w.label) + '</span><b>' + w.pct + "%</b></div>").join("") + "</div>" : "")
    + (v.recent.length ? '<div class="card"><h2 class="u-fs18px-mt0">📝 آخر النتايج</h2>' + v.recent.map((r) => '<div class="btnrow" style="justify-content:space-between;border-top:1px solid var(--line);padding:6px 0;"><span>' + esc(r.title) + ' <span class="muted u-fs12px">' + esc(r.day) + "</span></span><b>" + r.pct + "%</b></div>").join("") + "</div>" : "")
    + '<div class="muted u-fs125px center" style="padding:8px;">الصفحة دي للقراءة بس. الأرقام بتتحدّث لما يفتح الطالب المنصة.</div></div>';
}
export async function renderParentPage(code) {
  app.innerHTML = '<div class="spin">بنحمّل...</div>';
  const none = '<div style="max-width:520px;margin:40px auto;padding:16px;"><div class="card center"><h2>اللينك ده مش متاح</h2><p class="muted">ممكن الطالب يكون أوقفه أو اللينك غلط.</p></div></div>';
  try {
    if (!CODE_RE.test(code)) { app.innerHTML = none; return; }
    const v = parentView(await getParentView(code));
    app.innerHTML = v ? parentHtml(v) + closing() : none;
    try { document.title = "تقدّم الطالب | المستر"; } catch (_) {}
  } catch (e) { app.innerHTML = '<div style="max-width:520px;margin:40px auto;padding:16px;"><div class="card center"><p class="msg bad">معرفتش أفتح الصفحة. جرّب تاني.</p></div></div>'; }
  window.scrollTo(0, 0);
}
