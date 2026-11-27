import { fbUser } from "../../core/session.js";
import { esc } from "../../core/utils.js";
import { lessonReport } from "../../domain/lesson-report.js";
import { listLessonsOfTeacher, listStudentsOfTeacher, listVideoWatch } from "../../main/data.js";
import { teacherCache } from "./dashboard.js";

/* ---------- مين شاف الدرس (مدرس): تقرير لكل درس بيتحمّل لما يضغط «اعرض» بس ---------- */
const fmt = (ms) => { if (!ms) return ""; const d = new Date(ms); return d.getDate() + "/" + (d.getMonth() + 1) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
const yes = (ok, at, extra) => ok ? '<span class="chip green">✓' + (at ? " " + esc(fmt(at)) : "") + (extra || "") + "</span>" : '<span class="muted">—</span>';
export function reportHtml(rep, hasVideo, hasPdf) {
  const s = rep.sum;
  const head = '<div class="btnrow" style="gap:6px;margin:6px 0;"><span class="chip">فتحوا ' + s.opened + " من " + s.total + '</span>' + (hasVideo ? '<span class="chip">شغّلوا ' + s.played + '</span><span class="chip">خلّصوه ' + s.finished + "</span>" : "") + (hasPdf ? '<span class="chip">فتحوا الـ PDF ' + s.pdf + "</span>" : "") + '<span class="chip amber">لسه ' + s.missing + "</span></div>";
  const rows = rep.rows.map((r) => '<div style="border-top:1px solid var(--line);padding:6px 0;"><b>' + esc(r.name) + '</b> <span class="muted u-fs12px">' + esc(r.grade) + "</span>"
    + '<div class="btnrow u-fs125px" style="gap:6px;margin-top:2px;"><span>فتح: ' + (r.legacyOnly ? '<span class="chip green">✓ (سجل قديم)</span>' : yes(r.opened, r.openedAt)) + "</span>"
    + (hasVideo ? "<span>شغّل: " + yes(r.played, r.playedAt, r.pct ? " " + r.pct + "%" : "") + "</span><span>خلّص: " + yes(r.finished, r.finishedAt) + "</span>" : "")
    + (hasPdf ? "<span>PDF: " + yes(r.pdf, r.pdfAt) + "</span>" : "") + "</div></div>").join("");
  const miss = rep.missing.length ? '<h3 style="margin:12px 0 4px;font-size:15px;">لسه ما فتحوش (' + rep.missing.length + ')</h3><div class="u-fs14px" style="line-height:1.9;">' + rep.missing.map((r) => esc(r.name) + (r.grade ? ' <span class="muted u-fs12px">(' + esc(r.grade) + ")</span>" : "")).join("، ") + "</div>" : "";
  return head + (rows || '<div class="muted" style="padding:6px 0;">لسه محدش فتح الدرس.</div>') + miss;
}
export async function mountLessonReport(anchor) {
  try {
    if (!anchor || !fbUser) return;
    const box = document.createElement("div"); box.className = "card";
    box.innerHTML = '<h2 class="u-fs18px-mt0">👥 مين شاف الدرس</h2><div class="muted u-fs125px" style="margin-bottom:8px;">لكل درس: مين فتحه وشغّل الفيديو وخلّصه وفتح الـ PDF ومتى، ومين لسه. التشغيل والإنهاء بيتسجّلوا لفيديوهات يوتيوب بس. الأرقام من طلابك اللي فتحوا الدرس من المنصة.</div><button type="button" class="btn sm" id="lr-load">اختار الدرس</button><div id="lr-body"></div>';
    anchor.insertAdjacentElement("afterend", box);
    const body = box.querySelector("#lr-body"), btn = box.querySelector("#lr-load");
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        const ls = await listLessonsOfTeacher(fbUser.uid);
        btn.remove();
        if (!ls.length) { body.innerHTML = '<div class="muted">مفيش دروس.</div>'; return; }
        body.innerHTML = '<select class="inp" id="lr-sel">' + ls.map((l) => '<option value="' + esc(l.id) + '">' + esc(l.title || "درس") + (l.grade ? " · " + esc(l.grade) : "") + "</option>").join("") + '</select><button type="button" class="btn sm" id="lr-go" style="margin-top:6px;">اعرض</button><div id="lr-out" style="margin-top:8px;"></div>';
        body.querySelector("#lr-go").onclick = async (ev) => {
          const b = ev.currentTarget, out = body.querySelector("#lr-out"); b.disabled = true; out.textContent = "بنجمّع...";
          try {
            const l = ls.find((x) => x.id === body.querySelector("#lr-sel").value);
            const [docs, students] = await Promise.all([listVideoWatch(fbUser.uid, l.id), teacherCache ? Promise.resolve(teacherCache) : listStudentsOfTeacher(fbUser.uid)]);
            out.innerHTML = reportHtml(lessonReport({ students, docs, lessonId: l.id, grade: l.grade }), !!(l.hasVideo || l.videoUrl), !!(l.hasPdf || l.pdfUrl));
          } catch (e) { out.innerHTML = '<div class="msg bad">معرفتش أحمّل التقرير.</div>'; }
          b.disabled = false;
        };
      } catch (e) { btn.disabled = false; body.innerHTML = '<div class="msg bad">معرفتش أحمّل الدروس.</div>'; }
    };
  } catch (e) { console.warn("تقرير الدرس مش شغال", e); }
}
