/* حالة المستخدم اللي بتمشي معاه من جهاز لجهاز (userState/{uid}): دمج آمن عند أول مزامنة. دوال صافية. */
export const STATE_KEYS = ["srs", "boardHidden", "secState", "recipientMode", "bulkDone", "backupLast", "backupSnooze", "parentCode"];
export const MAX_JSON = 28000;
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
/** بيرجّع {value, at}. a = المحلي، b = البعيد. */
export function mergeState(key, a, aAt, b, bAt) {
  aAt = Number(aAt) || 0; bAt = Number(bAt) || 0;
  if (a === undefined || a === null) return b === undefined ? { value: undefined, at: 0 } : { value: b, at: bAt };
  if (b === undefined || b === null) return { value: a, at: aAt };
  const at = Math.max(aAt, bAt);
  if (key === "backupLast" || key === "backupSnooze") return { value: Math.max(Number(a) || 0, Number(b) || 0), at };
  if (key === "srs" && isObj(a) && isObj(b)) {
    const out = { ...b };
    Object.keys(a).forEach((k) => { const x = a[k], y = b[k]; if (!y || ((x && x.at) || 0) > ((y && y.at) || 0) || ((((x && x.at) || 0) === ((y && y.at) || 0)) && (x.wrongAt || 0) > (y.wrongAt || 0))) out[k] = x; });
    return { value: out, at };
  }
  if (key === "bulkDone" && isObj(a) && isObj(b)) {
    const out = { ...b };
    Object.keys(a).forEach((k) => { out[k] = [...new Set([...(Array.isArray(b[k]) ? b[k] : []), ...(Array.isArray(a[k]) ? a[k] : [])])]; });
    const keys = Object.keys(out); while (keys.length > 30) delete out[keys.shift()];
    return { value: out, at };
  }
  if (key === "secState" && isObj(a) && isObj(b)) return { value: aAt >= bAt ? { ...b, ...a } : { ...a, ...b }, at };
  return aAt >= bAt ? { value: a, at } : { value: b, at };
}
/** بيصغّر حالة المراجعة المتباعدة لو كبرت: بيشيل الأقدم. */
export function srsTrim(state, maxChars) {
  let s = { ...(state || {}) };
  while (JSON.stringify(s).length > (maxChars || MAX_JSON)) {
    const ks = Object.keys(s); if (!ks.length) break;
    ks.sort((x, y) => ((s[x] && s[x].at) || 0) - ((s[y] && s[y].at) || 0));
    delete s[ks[0]];
  }
  return s;
}
