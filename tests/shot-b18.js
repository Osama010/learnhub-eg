const fs = require("fs");
global.window = { innerWidth: 900, scrollTo: () => {}, addEventListener: () => {}, matchMedia: () => ({ matches: false, addEventListener: () => {} }) };
global.localStorage = { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; } };
global.location = { hash: "#/login" };
global.history = { replaceState: () => {} };
global.app = { innerHTML: "", querySelectorAll: () => [] };
const __els = {}; global.__els = __els;
const mkEl = (id) => ({ id, value: "", textContent: "", innerHTML: "", style: {}, dataset: {}, checked: false, disabled: false, files: [],
  classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, onclick: null, onchange: null, oninput: null, focus(){}, remove(){}, appendChild(){}, querySelector: () => mkEl(), querySelectorAll: () => [], setAttribute(){} });
global.mkEl = mkEl;
global.__lastOv = null;
global.document = {
  documentElement: { setAttribute(){}, getAttribute: () => "" },
  body: { appendChild(ov){ global.__lastOv = ov; }, classList: { add(){}, remove(){}, toggle(){}, contains: () => false } },
  addEventListener(){}, createElement: () => mkEl(),
  getElementById: (id) => id === "app" ? global.app : (__els[id] || (__els[id] = mkEl(id))),
  querySelector: () => null, querySelectorAll: () => [],
};
global.navigator = { onLine: true, language: "ar", userAgent: "Mozilla/5.0" };
global.showToast = () => {}; global.confirm = () => true; global.alert = () => {};
global.fetch = async () => ({ ok: false, json: async () => ({}) });
global.firebase = { initializeApp: () => ({}), auth: () => ({ languageCode: "", onAuthStateChanged(){} }),
  firestore: Object.assign(() => ({}), { FieldPath: { documentId: () => "__id__" }, FieldValue: { serverTimestamp: () => null }, Timestamp: { fromDate: (d) => d } }) };
global.ADMIN_EMAIL = "osamaasas0@gmail.com";
global.FIREBASE_CONFIG = {};
if (typeof crypto === "undefined") global.crypto = require("crypto").webcrypto;


const WIN0 = global.window;
const css = fs.readFileSync("/tmp/t4k-mock/style.css", "utf8");
const wrap = (body, theme) => '<!DOCTYPE html><html lang="ar" dir="rtl"' + (theme ? ' data-theme="' + theme + '"' : "") + '><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + "\n*{animation:none!important;transition:none!important} .rv{opacity:1!important;transform:none!important}" + '</style></head><body><div id="app">' + body + "</div></body></html>";
global.__wrap = wrap; global.__fs = fs;
const run = (portal, files, scenario) => {
  global.window = Object.assign({}, WIN0, portal ? { T4K_PORTAL: portal, T4K_BASE: "" } : {});
  const code = ["auth.js", ...files, "app.js"].map((f) => fs.readFileSync("/tmp/t4k-mock/" + f, "utf8")).join("\n;\n");
  const fn = new Function("fs", "__wrap", "__els", code + "\n;return (async () => { fbReady = true;" +
    "const shot = (name, theme) => { let h = app.innerHTML; const lf = __els['login-form']; if (lf && lf.innerHTML) h = h.replace('<div id=\"login-form\"></div>', lf.innerHTML); h = h.replace(/data-count=\"(\\d+)\">0</g, (m, n) => 'data-count=\"' + n + '\">' + Number(n).toLocaleString('en') + '+<'); fs.writeFileSync('/tmp/t4k-mock/' + name + '.html', __wrap(h, theme || '')); };\n" + scenario + "\n})().catch((e) => { console.error('SCENARIO ERROR', e); process.exit(1); });");
  return fn(fs, wrap, __els);
};
const mkDbSrc = `
const lists = { teachersPublic: [
  { id: "t1", name: "مستر أحمد محمود", subject: "برمجة", avatar: "", active: true },
  { id: "t2", name: "مستر علي حسن", subject: "الذكاء الاصطناعي", avatar: "", active: true },
  { id: "t3", name: "مستر سعيد", subject: "رياضيات", avatar: "", active: true },
  { id: "t4", name: "مستر كريم", subject: "علوم", avatar: "", active: true } ] };
const stores = { "settings/stats": { teachers: 12, lessons: 340, students: 2500 } };
const mkQ = (c) => { const q = { get: async () => ({ docs: (lists[c] || []).map((x) => ({ id: x.id, data: () => { const { id, ...r } = x; return r; } })) }), where: () => q }; return q; };
fbDb = { collection: (c) => Object.assign(mkQ(c), { doc: (id) => ({ get: async () => (stores[c + "/" + id] ? { exists: true, data: () => stores[c + "/" + id] } : { exists: false, data: () => null }), set: async () => {}, update: async () => {} }), add: async () => {} }) };
`;
(async () => {
await run("student", ["student.js"], mkDbSrc + `
const NOW = new Date();
const ts = (d) => ({ toDate: () => new Date(NOW.getTime() - d * 86400000) });
const day = (d) => { const x = new Date(NOW.getTime() - d * 86400000); return x.getFullYear() + "-" + String(x.getMonth()+1).padStart(2,"0") + "-" + String(x.getDate()).padStart(2,"0"); };
const G = "الصف الأول الثانوي";
fbUser = { uid: "u1", email: "s@x.com" }; fbRole = "student";
fbProfile = { id: "u1", name: "أحمد محمود", grade: G, teacherIds: ["t1", "t2"], status: "approved", activityDays: { [day(0)]: true, [day(1)]: true, [day(2)]: true, [day(4)]: true, [day(5)]: true, [day(6)]: true, [day(9)]: true, [day(10)]: true } };
const mkQz = (n) => Array.from({ length: n }, (_, i) => ({ type: "mcq", q: "س" + i }));
const lessons = []; for (let i = 0; i < 12; i++) lessons.push({ id: "L" + i, teacherId: i < 8 ? "t1" : "t2", title: "درس " + i, grade: G, stage: "ثانوي" });
studentData = { teachers: [{ id: "t1", name: "مستر أحمد", subject: "برمجة" }, { id: "t2", name: "مستر علي", subject: "علوم" }],
  lessons, quizzes: [{ id: "Q1", teacherId: "t1", title: "كويز المتغيرات", grade: G, stage: "ثانوي", subject: "برمجة" }, { id: "Q2", teacherId: "t1", title: "كويز الدوال", grade: G, stage: "ثانوي", subject: "برمجة" }, { id: "Q3", teacherId: "t2", title: "كويز الخلايا", grade: G, stage: "ثانوي", subject: "علوم" }],
  exams: [], ann: [], library: [], ratings: [],
  attempts: [ { quizId: "Q1", score: 3, total: 4, updatedAt: ts(20) }, { quizId: "Q3", score: 2, total: 4, updatedAt: ts(14) }, { quizId: "Q1", examId: null, score: 4, total: 4, updatedAt: ts(8), id: "z" }, { quizId: "Q2", score: 1, total: 4, updatedAt: ts(3) } ] };
// quizId duplicates are fine for display
localStorage.setItem("stWatched", JSON.stringify(["L0","L1","L2","L3","L4","L8","L9"]));
studentLoadAll = async () => {}; sMyWeeklyRank = async () => ({ rank: 3, rivals: 18, mine: 120 });
const chk = (c, msg) => { console.log((c ? "ok: " : "FAIL: ") + msg); if (!c) process.exitCode = 1; };
const m = buildStudentAnalytics({ tid: "", days: 30 }, NOW);
console.log(JSON.stringify({ avg: m.avg, delta: m.delta, done: m.done, total: m.total, teachers: m.teachers, subjects: m.subjects, streak: m.streak, longest: m.longest, recos: m.recos.map((r) => r.t) }));
chk(m.done === 7 && m.total === 12, "lessons 7/12");
chk(m.avg === Math.round((75 + 50 + 100 + 25) / 4), "avg " + m.avg);
chk(m.streak === 3 && m.longest === 3, "streak 3 (longest " + m.longest + ")");
chk(m.recos.some((r) => r.act && r.act.hash === "#/student/quiz/Q2"), "weakest quiz recommended");
const m1 = buildStudentAnalytics({ tid: "t2", days: 30 }, NOW);
chk(m1.total === 4 && m1.done === 2, "teacher filter");
const mE = buildStudentAnalytics({ tid: "", days: 7 }, NOW);
chk(mE.attempts === 1, "7-day window");
sanState = { tid: "", days: 30 }; sanRank = { rank: 3, rivals: 18, mine: 120 };
drawStudentAnalytics(); shot("f-b18-student", "");
shot("f-b18-student-dark", "dark");
`);
await run("admin", ["admin.js"], mkDbSrc + `
const NOW = new Date();
const ts = (d) => ({ toDate: () => new Date(NOW.getTime() - d * 86400000) });
const day = (d) => { const x = new Date(NOW.getTime() - d * 86400000); return x.getFullYear() + "-" + String(x.getMonth()+1).padStart(2,"0") + "-" + String(x.getDate()).padStart(2,"0"); };
fbUser = { uid: "a1", email: "osamaasas0@gmail.com" }; fbRole = "admin";
const T = [["t1","مستر أحمد","برمجة",0],["t2","مستر علي","علوم",1],["t3","مستر سعيد","رياضيات",0],["t4","مستر كريم","لغة",0]];
const teachers = T.map(([id, name, subject, sub]) => ({ id, name, subject, active: true, subType: sub ? "monthly" : "free", subEnd: sub ? { toDate: () => new Date(NOW.getTime() + 9 * 86400000), seconds: Math.floor((NOW.getTime() + 9 * 86400000) / 1000) } : null }));
const students = [];
for (let i = 0; i < 120; i++) { const tid = i < 60 ? "t1" : i < 95 ? "t2" : i < 112 ? "t3" : "t4"; const ad = {}; if (i % 2 === 0) ad[day(i % 6)] = true; if (i % 3 === 0) ad[day(8 + (i % 10))] = true;
  students.push({ id: "s" + i, name: "طالب " + i, status: i > 112 ? "pending" : "approved", teacherIds: [tid], createdAt: ts(i < 20 ? i : 5 + (i % 80)), activityDays: ad }); }
adminCache = Object.assign({}, adminCache, { teachers, students, admins: [], log: [] });
const atts = []; for (let i = 0; i < 80; i++) atts.push({ teacherId: i % 3 === 0 ? "t3" : i % 3 === 1 ? "t2" : "t1", score: i % 3 === 0 ? 2 : 3, total: 4 });
aanExtra = { days: 30, atts, lessons: [{ teacherId: "t1", createdAt: ts(3) }, { teacherId: "t2", createdAt: ts(12) }, { teacherId: "t3", createdAt: ts(20) }], quizzes: [{ teacherId: "t4", createdAt: ts(45) }], counts: [{ stage: "ابتدائي", lessons: 48, quizzes: 20 }, { stage: "إعدادي", lessons: 91, quizzes: 55 }, { stage: "ثانوي", lessons: 201, quizzes: 130 }] };
const chk = (c, msg) => { console.log((c ? "ok: " : "FAIL: ") + msg); if (!c) process.exitCode = 1; };
const m = buildAdminAnalytics({ days: 30 }, aanExtra, NOW);
console.log(JSON.stringify({ total: m.total, approved: m.approved, active7: m.active7, newRegs: m.newRegs, regWeeks: m.regWeeks.map((x) => x.v), att: m.attention.map((a) => a.txt) }));
chk(m.total === 120 && m.approved === 113, "counts");
chk(m.newRegs === students.filter((s) => s.createdAt.toDate() >= new Date(NOW.getTime() - 30 * 86400000)).length, "new regs in 30d");
chk(m.attention.some((a) => a.tag === "اشتراك"), "subscription expiring flagged");
chk(m.attention.some((a) => a.txt.includes("مستر كريم") && a.tag === "محتوى"), "stale-content teacher flagged");
chk(m.attention.some((a) => a.tag === "طلبات"), "late pending flagged");
chk(m.perTeacher[0].t.id === "t1" && m.perTeacher[0].n === 60, "students per teacher");
const m0 = buildAdminAnalytics({ days: 7 }, null, NOW); chk(m0.attention.every((a) => a.tag !== "محتوى"), "no content flags without extra");
aanState = { days: 30 };
await adminAnalytics(); shot("f-b18-admin", "");
`);
})();
