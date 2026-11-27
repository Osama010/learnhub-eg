import { esc } from "../../core/utils.js";

/* عرض جرس الإشعارات (DOM فقط): بياخد دالة بترجع الإشعارات ودالة بتتنادى لما الطالب يفتح الجرس. */
export const NOTIF_KIND = { lesson: "📚 درس جديد", quiz: "📝 كويز جديد", exam: "🎯 امتحان جديد", ann: "📢 إعلان", live: "🎥 حصة مباشرة" };

export function renderBell(zone, getItems, onSeen) {
  const list = getItems();
  const fresh = list.filter((x) => x.isNew).length;
  const wrap = document.createElement("span");
  wrap.className = "nbell";
  wrap.innerHTML = '<button type="button" class="themebtn nbell-btn" aria-label="الإشعارات" aria-expanded="false">🔔' + (fresh ? '<i class="nbell-n">' + (fresh > 9 ? "9+" : fresh) + "</i>" : "") + '</button><div class="nbell-panel" style="display:none;"></div>';
  // جنب الاسم على طول (على شمال الاسم في الواجهة العربية)، قبل زرار الوضع الليلي
  const me = zone.querySelector(".mewrap");
  if (me) me.insertAdjacentElement("afterend", wrap); else zone.insertBefore(wrap, zone.firstChild);
  const btn = wrap.querySelector(".nbell-btn"), panel = wrap.querySelector(".nbell-panel");
  const close = () => { panel.style.display = "none"; btn.setAttribute("aria-expanded", "false"); };
  btn.onclick = (ev) => {
    ev.stopPropagation();
    if (panel.style.display !== "none") return close();
    const l = getItems();
    panel.innerHTML = '<div class="nbell-h">الإشعارات</div>' + (l.length
      ? l.map((x) => '<a class="nbell-i' + (x.isNew ? " new" : "") + '" href="' + esc(x.href) + '"><b>' + NOTIF_KIND[x.kind] + "</b><span>" + esc(String(x.title).slice(0, 80)) + "</span><small>" + esc(x.teacher) + "</small></a>").join("")
      : '<div class="nbell-e">مفيش إشعارات جديدة 👌</div>');
    panel.style.display = "block"; btn.setAttribute("aria-expanded", "true");
    const n = btn.querySelector(".nbell-n"); if (n) n.remove();
    try { onSeen(); } catch (_) {}
  };
  panel.onclick = (e) => { if (e.target.closest("a")) close(); };
  document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  return wrap;
}

/* كارت التقدم العام (HTML): p = {pct, watched, lessonsTotal, quizzesDone, quizzesTotal} */
export function progressCardHtml(p) {
  if (!p || (!p.lessonsTotal && !p.quizzesTotal)) return "";
  return '<div class="card lcard sprog"><div class="sprog-h"><b>📈 تقدمك في دروسك</b><span>' + p.pct + '%</span></div><div class="sprog-bar" role="progressbar" aria-valuenow="' + p.pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + p.pct + '%"></i></div><div class="muted u-fs13px">' + p.watched + " من " + p.lessonsTotal + " درس خلصتهم" + (p.quizzesTotal ? " · " + p.quizzesDone + " من " + p.quizzesTotal + " كويز اتحل" : "") + "</div></div>";
}
