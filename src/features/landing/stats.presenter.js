/* أرقام صفحة الهبوط: الافتراضي والدمج وتنسيق العداد. */
const STATS_DEFAULTS = { lessons: 200, students: 1000, quizzes: 100 };
export function statsWithDefaults(cfg) { return Object.assign({}, STATS_DEFAULTS, cfg || {}); }
export function countTarget(target) { return Math.max(0, Math.round(Number(target) || 0)); }
export function countText(value, done) { return Math.round(value).toLocaleString("en") + (done ? "+" : ""); }
