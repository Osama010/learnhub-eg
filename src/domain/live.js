import { loc } from "./format.js";
/* الحصص المباشرة (Zoom/Meet...): دوال صافية. المدرس بيحط لينك وميعاد، والطالب بيشوف ويدخل. */
export const LIVE_HOSTS = ["zoom.us", "meet.google.com", "teams.microsoft.com", "teams.live.com", "whereby.com", "us02web.zoom.us"];
export const LIVE_DURATION_MIN = 120; // الحصة بتعتبر جارية لحد ساعتين من معادها
const hostOk = (h) => LIVE_HOSTS.some((x) => h === x || h.endsWith("." + x));

/** raw: {title,url,date:'YYYY-MM-DD',time:'HH:MM',grade}. {error} أو {doc:{title,url,startsAtMs,grade}}. */
export function validateLive(raw, nowMs) {
  const title = String((raw && raw.title) || "").trim();
  if (title.length < 3) return { error: "اكتب عنوان للحصة (3 حروف على الأقل)." };
  if (title.length > 80) return { error: "العنوان طويل زيادة." };
  let u;
  try { u = new URL(String((raw && raw.url) || "").trim()); } catch (_) { return { error: "اللينك مش صحيح." }; }
  if (u.protocol !== "https:" || !hostOk(u.hostname)) return { error: "اللينك لازم https من Zoom أو Google Meet أو Teams أو Whereby." };
  if (u.href.length > 300) return { error: "اللينك طويل زيادة." };
  const date = String((raw && raw.date) || ""), time = String((raw && raw.time) || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "اختار التاريخ والساعة." };
  const ms = new Date(date + "T" + time + ":00").getTime();
  if (!Number.isFinite(ms)) return { error: "التاريخ مش صحيح." };
  if (ms < nowMs - 30 * 60000) return { error: "معاد الحصة عدّى. اختار معاد جاي." };
  if (ms > nowMs + 180 * 86400000) return { error: "المعاد بعيد جدًا (أقصاه 6 شهور)." };
  return { doc: { title, url: u.href, startsAtMs: ms, grade: String((raw && raw.grade) || "").slice(0, 60) } };
}
/** live (جارية دلوقتي: من 10 دقايق قبل المعاد) | soon (خلال 24 ساعة) | upcoming | ended */
export function liveState(startMs, nowMs) {
  if (nowMs > startMs + LIVE_DURATION_MIN * 60000) return "ended";
  if (nowMs >= startMs - 10 * 60000) return "live";
  if (startMs - nowMs <= 86400000) return "soon";
  return "upcoming";
}
export const startMsOf = (c) => (c && c.startsAt && (c.startsAt.seconds ? c.startsAt.seconds * 1000 : c.startsAt.toMillis ? c.startsAt.toMillis() : 0)) || 0;
/** الحصص اللي لسه ما خلصتش بترتيب المعاد. */
export function upcomingLive(list, nowMs, visible) {
  return (list || []).filter((c) => (!visible || visible(c))).map((c) => ({ ...c, startMs: startMsOf(c) }))
    .filter((c) => c.startMs && liveState(c.startMs, nowMs) !== "ended").sort((a, b) => a.startMs - b.startMs);
}
export function fmtLive(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString(loc(), { weekday: "long", day: "numeric", month: "long" }) + (loc() === "ar-EG" ? " الساعة " : " at ") + d.toLocaleTimeString(loc(), { hour: "numeric", minute: "2-digit" });
}
