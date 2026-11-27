/* اختبار أسئلة الدروس (دوال صافية من domain/comments.js). */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/domain/comments.js"), "utf8").replace(/export /g, "");
const m = new Function(src + "; return { firstName, cleanText, buildComment, sortThread, sortInbox, unansweredCount, canDeleteOwn, buildReply };")();
let n = 0; const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error("FAIL " + msg + ": " + JSON.stringify(a) + " != " + JSON.stringify(b)); process.exit(1); } n++; };
eq([m.firstName("سارة أحمد محمد"), m.firstName("  "), m.firstName(null), m.firstName("علي")], ["سارة", "طالب", "طالب", "علي"], "first name only");
eq(m.cleanText("  a \n\n b  ", 10), "a b", "whitespace");
eq(m.cleanText("x".repeat(600), 500).length, 500, "max length");
const c = m.buildComment({ lesson: { id: "L", teacherId: "t" }, student: { name: "سارة أحمد" }, uid: "u", text: " إزاي؟ ", now: 1 });
eq(c, { lessonId: "L", teacherId: "t", studentId: "u", studentName: "سارة", text: "إزاي؟", createdAt: 1 }, "built comment has first name only");
eq(m.buildComment({ lesson: { id: "L", teacherId: "t" }, student: {}, uid: "u", text: "   ", now: 1 }), null, "empty rejected");
eq(m.buildComment({ lesson: { id: "L" }, student: {}, uid: "u", text: "x", now: 1 }), null, "lesson without teacher rejected");
const s = (x) => ({ seconds: x });
eq(m.sortThread([{ id: "b", createdAt: s(2) }, { id: "a", createdAt: s(1) }]).map((x) => x.id), ["a", "b"], "thread oldest first");
eq(m.sortInbox([{ id: "d1", reply: "r", createdAt: s(1) }, { id: "o2", createdAt: s(5) }, { id: "o1", createdAt: s(3) }, { id: "d2", reply: "r", createdAt: s(9) }]).map((x) => x.id), ["o1", "o2", "d2", "d1"], "inbox: unanswered first");
eq(m.unansweredCount([{ reply: "x" }, {}, {}]), 2, "unanswered count");
eq([m.canDeleteOwn({ studentId: "u" }, "u"), m.canDeleteOwn({ studentId: "u" }, "v"), m.canDeleteOwn(null, "u")], [true, false, false], "delete own only");
eq([m.buildReply("  "), m.buildReply(" تمام ")], [null, "تمام"], "reply");
console.log("comments:" + n + " passed");
