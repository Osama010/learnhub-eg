/* اختبار منطق زرار الرجوع الموحّد (الدوال الصافية). */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/shared/backbar.js"), "utf8").replace(/export /g, "");
const m = new Function(src + "; return { isRootPage, fallbackFor, acceptablePrev };")();
let n = 0; const eq = (a, b, msg) => { if (a !== b) { console.error("FAIL " + msg + ": " + a + " != " + b); process.exit(1); } n++; };
eq(m.isRootPage({ user: null, portal: "", hash: "" }), true, "landing root");
eq(m.isRootPage({ user: null, portal: "", hash: "#/register" }), false, "register not root");
eq(m.isRootPage({ user: null, portal: "student", hash: "#/login" }), false, "portal login not root");
eq(m.isRootPage({ user: {}, role: "admin", hash: "#/admin/analytics" }), true, "admin home");
eq(m.isRootPage({ user: {}, role: "teacher", hash: "#/teacher/lessons" }), false, "teacher sub");
eq(m.isRootPage({ user: {}, role: "blocked", hash: "#/x" }), true, "gate screens");
eq(m.fallbackFor({ user: {}, role: "student" }), "#/student/analytics", "student fallback");
eq(m.fallbackFor({ user: null, portal: "" }), "#/", "guest fallback");
eq(m.fallbackFor({ user: null, portal: "teacher" }), "../", "portal fallback");
eq(m.acceptablePrev("#/login", { user: {}, hash: "#/a" }), false, "no back to login when signed in");
eq(m.acceptablePrev("#/teacher/follow", { user: {}, hash: "#/teacher/bulk" }), true, "normal prev");
eq(m.acceptablePrev(undefined, { user: {}, hash: "#/a" }), false, "no prev");
console.log("backbar:" + n + " passed");
