/* علامات «شوفت الدرس»: دوال صافية. المصدر الأساسي مستند الطالب (watchedLessons)، والكاش المحلي خاص بكل حساب، ونسخة احتياطية في userState لو كتابة مستند الطالب فشلت. */
export const WATCHED_MAX = 1000;
export const watchedKey = (uid) => "stWatched_" + uid;
const idsOf = (x) => (Array.isArray(x) ? x : x && typeof x === "object" ? Object.keys(x) : []).filter((i) => typeof i === "string" && i);
/** كل الدروس اللي الطالب شافها من المصادر التلاتة. */
export function mergeWatched({ local, profile, backup }) {
  return new Set([...idsOf(local), ...idsOf(profile), ...idsOf(backup)]);
}
/** الدروس اللي موجودة محليًا أو في النسخة الاحتياطية ومش على مستند الطالب لسه (لازم تتبعت). */
export function pendingWatched({ local, profile, backup }) {
  const on = new Set(idsOf(profile));
  return [...new Set([...idsOf(local), ...idsOf(backup)])].filter((i) => !on.has(i)).slice(-WATCHED_MAX);
}
export const trimWatched = (arr) => idsOf(arr).slice(-WATCHED_MAX);
