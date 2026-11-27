/* نقطة التسرب في الفيديو: دوال صافية. الطالب بيسجّل الثواني اللي وقف أو رجّع عندها (في دلاء 15 ثانية)، والمدرس بيشوف أكتر دلو وقف أو رجّع عنده طلاب مختلفين. */
export const BUCKET = 15, MAX_BUCKETS = 240, MIN_STUDENTS = 3;
export const bucketOf = (sec) => Math.max(0, Math.min(MAX_BUCKETS - 1, Math.floor((Number(sec) || 0) / BUCKET)));
export function fmtSec(sec) { const s = Math.max(0, Math.floor(sec)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
/** state بنفس أرقام YouTube: 0 خلص، 1 شغال، 2 واقف، 3 بيحمّل */
export function createTracker() {
  let last = null, dur = 0, playing = false, dirty = false;
  const stops = {}, rewinds = {};
  const nearEnd = (t) => dur > 0 && t >= dur - 10;
  return {
    sample(t, state, duration) {
      if (typeof t !== "number" || !isFinite(t) || t < 0) return;
      if (duration > 0) dur = duration;
      if (last !== null && t < last - 2 && state !== 0) { rewinds[bucketOf(last)] = 1; dirty = true; }
      if (state === 2 && playing && !nearEnd(t)) { stops[bucketOf(t)] = 1; dirty = true; }
      playing = state === 1; last = t;
    },
    leave() { if (last !== null && playing && !nearEnd(last)) { stops[bucketOf(last)] = 1; dirty = true; } playing = false; },
    take() { if (!dirty) return null; dirty = false; return { stops: { ...stops }, rewinds: { ...rewinds } }; },
  };
}
export function dropoffSummary(docs) {
  const stopN = {}, rewN = {}; let students = 0;
  (docs || []).forEach((d) => {
    if (!d) return; students++;
    Object.keys(d.stops || {}).forEach((k) => { const b = Number(k); if (b >= 0 && b < MAX_BUCKETS) stopN[b] = (stopN[b] || 0) + 1; });
    Object.keys(d.rewinds || {}).forEach((k) => { const b = Number(k); if (b >= 0 && b < MAX_BUCKETS) rewN[b] = (rewN[b] || 0) + 1; });
  });
  const keys = new Set([...Object.keys(stopN), ...Object.keys(rewN)].map(Number));
  const list = [...keys].map((b) => ({ b, sec: b * BUCKET, stops: stopN[b] || 0, rewinds: rewN[b] || 0, score: (stopN[b] || 0) + (rewN[b] || 0) }))
    .sort((a, b) => b.score - a.score || a.b - b.b).slice(0, 5);
  return { students, enough: students >= MIN_STUDENTS, top: list[0] || null, list };
}
