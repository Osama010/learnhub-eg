/* ترجمة النصوص (دوال صافية): بتاخد قاموس عربي -> إنجليزي وبترجّع دالة tx.
   الترتيب: تطابق كامل أولًا، وبعده استبدال العبارات المعروفة جوه النص (الأطول الأول) عشان النصوص اللي فيها أرقام وأسماء متغيرة. اللي مش في القاموس بيفضل زي ما هو. */
export const LANGS = ["ar", "en"];
export const normLang = (l) => (l === "en" ? "en" : "ar");
export const dirOf = (l) => (normLang(l) === "en" ? "ltr" : "rtl");
export const localeOf = (l) => (normLang(l) === "en" ? "en-GB" : "ar-EG");
export const toggleLang = (l) => (normLang(l) === "en" ? "ar" : "en");
const AR = /[ء-ي]/;
const INDIC = /[٠-٩]/g;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const hasArabic = (s) => AR.test(String(s || ""));
export const westDigits = (s) => String(s).replace(INDIC, (c) => String(c.charCodeAt(0) - 1632));
export function makeTx(dict) {
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  const rx = keys.length ? new RegExp("(?<![ء-ي])(?:" + keys.map(esc).join("|") + ")(?![ء-ي])", "g") : null;
  const nkeys = keys.filter((k) => k.includes("#"));
  const rxN = nkeys.length ? new RegExp("(?<![ء-ي])(?:" + nkeys.map(esc).join("|") + ")(?![ء-ي])", "g") : null;
  const cache = new Map();
  return function tx(str) {
    if (str == null) return str;
    const s = String(str);
    if (!AR.test(s)) return westDigits(s);
    if (cache.has(s)) return cache.get(s);
    const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0];
    const core = westDigits(s.trim().replace(/\s+/g, " "));
    let out;
    const nums = core.match(/\d+/g);
    const hashed = nums ? core.replace(/\d+/g, "#") : null;
    if (dict[core] !== undefined) out = dict[core];
    else if (hashed && dict[hashed] !== undefined) { let i = 0; out = dict[hashed].replace(/#/g, () => nums[i++] || "#"); }
    else {
      // استبدال عبارات جوه النص: بنعمله بس لو العبارات المعروفة هي معظم النص، عشان عناوين المدرسين اللي فيها كلمة معروفة ماتتخلطش
      const base = hashed || core; let i = 0, hit = 0;
      const sub = (m) => { hit += m.replace(/[^ء-ي]/g, "").length; return dict[m]; };
      let r = base;
      if (hashed && rxN) r = r.replace(rxN, sub);
      if (rx) r = r.replace(rx, sub);
      const total = base.replace(/[^ء-ي]/g, "").length;
      out = total && hit / total >= 0.6 ? r : core;
      if (out !== core && hashed) out = out.replace(/#/g, () => nums[i++] || "#");
    }
    out = westDigits(lead + out + tail);
    if (cache.size > 3000) cache.clear();
    cache.set(s, out);
    return out;
  };
}
/** نسبة النصوص (عبارات عربي) اللي عليها ترجمة في القاموس. */
export function coverage(runs, dict) {
  const miss = runs.filter((r) => dict[r] === undefined);
  return { total: runs.length, missing: miss, pct: runs.length ? Math.round(((runs.length - miss.length) / runs.length) * 100) : 100 };
}
