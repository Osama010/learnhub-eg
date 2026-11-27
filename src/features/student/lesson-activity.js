import { fbUser } from "../../core/session.js";
import { saveVideoWatch } from "../../main/data.js";

/* ---------- نشاط الطالب في الدرس (للمدرس) ----------
   مستند واحد لكل (طالب، درس) في videoWatch: آخر فتح، بداية التشغيل، الإنهاء، فتح الـ PDF، ونسبة المشاهدة، وأماكن الوقوف/الرجوع.
   الكتابة مجمّعة: مرة عند فتح الدرس، وبعدها مرة كل دقيقة بحد أقصى أثناء التشغيل، وعند الخروج. */
const sessions = new Map();
export function lessonActivity(lesson) {
  if (!lesson || !lesson.id || !lesson.teacherId) return { note() { return this; }, flush() {} };
  let s = sessions.get(lesson.id);
  if (s) return s;
  const data = {}; let dirty = false, lastFlush = 0;
  s = {
    note(p) {
      Object.keys(p).forEach((k) => {
        if (k === "pct") { if (p.pct > (data.pct || 0)) { data.pct = Math.min(100, Math.round(p.pct)); dirty = true; } }
        else if (k === "stops" || k === "rewinds") { data[k] = { ...(data[k] || {}), ...p[k] }; dirty = true; }
        else if (k === "openedAt" || k === "playedAt" || k === "finishedAt" || k === "pdfAt") { if (!data[k]) { data[k] = p[k]; dirty = true; } }
      });
      return s;
    },
    async flush(force) {
      if (!dirty || !fbUser) return;
      if (!force && Date.now() - lastFlush < 60000) return;
      dirty = false; lastFlush = Date.now();
      const body = { ...data, lessonId: lesson.id, teacherId: lesson.teacherId, studentId: fbUser.uid, updatedAt: Date.now() };
      try { await saveVideoWatch(fbUser.uid + "_" + lesson.id, body); } catch (_) { dirty = true; }
    },
  };
  sessions.set(lesson.id, s);
  return s;
}
/** فتح الـ PDF = ضغط على رابط/تحميل، أو سكرول جوه العارض، أو ظهور العارض على الشاشة 3 ثواني. */
export function trackPdfOpen(el, lesson) {
  try {
    const act = lessonActivity(lesson);
    let done = false, timer = null;
    const hit = () => { if (done) return; done = true; clearTimeout(timer); act.note({ pdfAt: Date.now() }).flush(); };
    el.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("a,button")) hit(); }, true);
    el.addEventListener("scroll", hit, true);
    if (typeof IntersectionObserver === "function") {
      const io = new IntersectionObserver((es) => { const v = es.some((x) => x.isIntersecting && x.intersectionRatio >= 0.3); clearTimeout(timer); if (v && !done) timer = setTimeout(hit, 3000); }, { threshold: [0.3] });
      io.observe(el);
    }
  } catch (_) {}
}
