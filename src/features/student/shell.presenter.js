/* واجهة الطالب: أيقونة ولون المادة، حالة الامتحان، التذكير، وتقييم الدرس. من غير DOM. */
const SUBJ_ICONS = [
  ["علوم", "🧪"], ["رياض", "📐"], ["حساب", "📐"], ["عرب", "📖"], ["انجليز", "🔤"], ["إنجليز", "🔤"],
  ["دراسات", "🌍"], ["فيزيا", "⚛️"], ["كيميا", "⚗️"], ["أحيا", "🧬"], ["حاسب", "💻"], ["دين", "🕌"],
];
const SUBJ_COLORS = [
  ["#0f766e", "#f0fdfa", "#ccfbf1"], ["#d97706", "#fffbeb", "#fef3c7"], ["#2563eb", "#eff6ff", "#dbeafe"],
  ["#7c3aed", "#f5f3ff", "#ede9fe"], ["#e11d48", "#fff1f2", "#ffe4e6"], ["#059669", "#ecfdf5", "#d1fae5"],
];
export function subjectIcon(subj) {
  const s = String(subj || "");
  for (const [k, ic] of SUBJ_ICONS) if (s.includes(k)) return ic;
  return "📚";
}
export function subjectColor(subj) {
  let h = 0;
  const s = String(subj || "عام");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return SUBJ_COLORS[h % SUBJ_COLORS.length];
}
export function chunksOf(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
export function examStateOf(e, now, fmtTs) {
  if (e.closed) return ["مقفول", "red"];
  if (e.openAt && e.openAt.toDate && e.openAt.toDate() > now) return ["يفتح " + fmtTs(e.openAt), "amber"];
  if (e.closeAt && e.closeAt.toDate && e.closeAt.toDate() <= now) return ["اتقفل", "red"];
  return ["مفتوح", "green"];
}
export function reminderLines({ lessons, quizzes, nowMs, rules: { lessonOpen, isWatched, visible, attemptFor, countText } }) {
  const unseen = lessons.filter((l) => lessonOpen(l) && !isWatched(l.id));
  const pendingQ = (quizzes || []).filter((q) => visible(q) && !attemptFor(q.id, null));
  const soon = lessons.filter((l) => !lessonOpen(l) && l.publishAt && l.publishAt.seconds
    && (l.publishAt.seconds * 1000 - nowMs) < 3 * 86400000);
  const lines = [];
  if (unseen.length) lines.push(`📚 عندك ${countText(unseen.length)} لسه مشفت${unseen.length === 1 ? "ه" : "هم"}ش`);
  if (pendingQ.length) lines.push(`📝 ${pendingQ.length === 1 ? "كويز واحد مستنيك" : pendingQ.length + " كويزات مستنياك"}`);
  if (soon.length) lines.push(`🕒 ${soon.length === 1 ? "درس جديد بينزل" : countText(soon.length) + " جداد بينزلوا"} قريب`);
  return lines;
}
export function newRating({ lessonId, lesson, studentId, stars, now }) {
  return { lessonId, teacherId: lesson.teacherId || "", studentId, stars, updatedAt: now };
}
