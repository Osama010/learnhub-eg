/* اختبار وضع الامتحان: المؤقت والمسودة (دوال صافية من domain/exam-mode.js). */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/domain/exam-mode.js"), "utf8").replace(/export /g, "");
const m = new Function(src + "; return { timerOf, cleanMinutes, remainingMs, fmtClock, draftKey, parseDraft, makeDraft, MAX_EXAM_MINUTES };")();
let n = 0; const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error("FAIL " + msg + ": " + JSON.stringify(a) + " != " + JSON.stringify(b)); process.exit(1); } n++; };
eq(m.timerOf({}), 0, "no timer"); eq(m.timerOf({ timerMin: 30 }), 30, "30"); eq(m.timerOf({ timerMin: "45" }), 45, "string"); eq(m.timerOf({ timerMin: -5 }), 0, "negative"); eq(m.timerOf({ timerMin: 9999 }), 300, "capped"); eq(m.timerOf(null), 0, "null");
eq([m.cleanMinutes(""), m.cleanMinutes("abc"), m.cleanMinutes("12.7"), m.cleanMinutes(0)], [0, 0, 12, 0], "clean");
eq(m.remainingMs(1000, 1000 + 59000, 1), 1000, "remaining"); eq(m.remainingMs(1000, 999999999, 1), 0, "expired never negative");
eq([m.fmtClock(0), m.fmtClock(1), m.fmtClock(61000), m.fmtClock(3600000)], ["00:00", "00:01", "01:01", "60:00"], "clock");
const d = m.makeDraft(5, 2, [1, null, "x"]);
eq(m.parseDraft(d, 3), { start: 5, idx: 2, given: [1, null, "x"] }, "draft roundtrip");
eq(m.parseDraft(d, 4), null, "draft for different question count rejected");
eq(m.parseDraft("{bad", 3), null, "corrupt draft"); eq(m.parseDraft(null, 3), null, "null draft");
eq(m.parseDraft(m.makeDraft(1, 99, [1, 2, 3]), 3).idx, 2, "idx clamped");
eq(m.draftKey("u", "x_e1"), "exm_u_x_e1", "key");
console.log("exam-mode:" + n + " passed");
