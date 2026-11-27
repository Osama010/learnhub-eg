/* وضع الامتحان: دوال صافية للمؤقت والمسودة (من غير DOM). */
export const MAX_EXAM_MINUTES = 300;

/** عدد دقايق وضع الامتحان للعنصر (0 = مقفول). */
export function timerOf(item) {
  const m = Math.floor(Number(item && item.timerMin));
  return m > 0 ? Math.min(m, MAX_EXAM_MINUTES) : 0;
}
/** تنظيف قيمة الدقايق من الفورم: رقم صحيح 0..300. */
export function cleanMinutes(v) {
  const m = Math.floor(Number(v));
  return m > 0 ? Math.min(m, MAX_EXAM_MINUTES) : 0;
}
export const remainingMs = (startMs, nowMs, minutes) => Math.max(0, startMs + minutes * 60000 - nowMs);
export function fmtClock(ms) {
  const s = Math.ceil(ms / 1000), m = Math.floor(s / 60), r = s % 60;
  return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}
export const draftKey = (uid, id) => "exm_" + uid + "_" + id;
/** قراءة مسودة محفوظة بأمان: بترجع null لو بايظة أو مش لنفس عدد الأسئلة. */
export function parseDraft(raw, total) {
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d.start !== "number" || !Array.isArray(d.given) || d.given.length !== total) return null;
    return { start: d.start, idx: Math.min(Math.max(0, Number(d.idx) || 0), total - 1), given: d.given };
  } catch (_) { return null; }
}
export const makeDraft = (start, idx, given) => JSON.stringify({ start, idx, given });
