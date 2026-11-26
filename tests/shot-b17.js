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
await run("teacher", ["teacher.js"], mkDbSrc + `
fbUser = { uid: "t1", email: "t1@x.com" }; fbRole = "teacher"; fbProfile = { name: "مستر أحمد", stages: ["ثانوي"], subject: "برمجة" };
const NOW = new Date();
const ts = (d) => ({ toDate: () => new Date(NOW.getTime() - d * 86400000) });
const day = (d) => { const x = new Date(NOW.getTime() - d * 86400000); return x.getFullYear() + "-" + String(x.getMonth()+1).padStart(2,"0") + "-" + String(x.getDate()).padStart(2,"0"); };
const names = ["ليلى محمود","عمر خالد","نور إبراهيم","محمد علي","سارة أحمد","يوسف حسن","هدى سمير","كريم وائل","منى طارق","زياد أيمن","دينا عادل","رامي فؤاد"];
const G = "الصف الأول الثانوي";
teacherCache = names.map((n, i) => ({ id: "s" + i, name: n, grade: i % 4 === 3 ? "الصف الثاني الثانوي" : G, status: "approved", activityDays: i === 3 ? { [day(12)]: true } : i === 11 ? {} : { [day(i % 5)]: true } }));
const mkQz = (n) => Array.from({ length: n }, (_, i) => ({ type: "mcq", q: "سؤال رقم " + (i + 1) + " في البرمجة", options: ["أ","ب"], correct: 0 }));
lessonsState.lessons = [{ id: "L1", title: "المتغيرات", term: 1, grade: "", createdAt: ts(40) }, { id: "L2", title: "الدوال", term: 1, grade: "", createdAt: ts(10) }];
lessonsState.quizzes = [{ id: "Q1", title: "كويز المتغيرات", term: 1, questions: mkQz(4), createdAt: ts(30) }, { id: "Q2", title: "كويز الحلقات", term: 1, questions: mkQz(4), createdAt: ts(20) }, { id: "Q3", title: "كويز الدوال", term: 1, questions: mkQz(4), createdAt: ts(5) }];
lessonsState.exams = [{ id: "X1", title: "امتحان الوحدة 1", term: 1, questions: mkQz(4), createdAt: ts(15) }];
lessonsState.attempts = [];
const scores = { Q1: [4,4,3,4,4,3,4,3,4,4], Q2: [3,3,4,2,3,3,2,3,4,3], Q3: [2,1,2,3,1,2,2,1,2,2], X1: [3,4,3,3,4,3,3,2,4,3] };
const ages = { Q1: 25, Q2: 18, Q3: 3, X1: 12 };
Object.keys(scores).forEach((k) => scores[k].forEach((sc, i) => { if (i === 3 && k !== "Q1") return; lessonsState.attempts.push({ id: k + i, studentId: "s" + i, quizId: k[0] === "Q" ? k : null, examId: k[0] === "X" ? k : null, score: sc, total: 4, answers: Array.from({ length: 4 }, (_, j) => ({ correct: j < sc })), updatedAt: ts(ages[k] + (i % 3)) }); }));
lessonsState.ratings = [{ studentId: "s0", lessonId: "L1", stars: 5 }, { studentId: "s1", lessonId: "L1", stars: 4 }, { studentId: "s2", lessonId: "L2", stars: 4 }];
tanCache = []; teacherNames = 0;
names.forEach((n, i) => { if (i < 8) tanCache.push({ studentId: "s" + i, kind: "lesson", refId: "L1" }); if (i < 3) tanCache.push({ studentId: "s" + i, kind: "lesson", refId: "L2" }); });
const m = buildTeacherAnalytics({ grade: "", days: 30, term: 1 }, tanCache, NOW);
const chk = (c, msg) => { console.log((c ? "ok: " : "FAIL: ") + msg); if (!c) process.exitCode = 1; };
console.log(JSON.stringify({ total: m.total, activeNow: m.activeNow, avg: m.avg, delta: m.delta, completion: m.completion, rating: m.rating, bands: m.bands, risk: m.risk.map((r) => r.s.name + ":" + r.tag), hard: m.hard.map((h) => h.item + h.n + ":" + h.rate), top: m.top.map((t) => t.s.name + t.avg), notes: m.notes }));
chk(m.total === 12, "12 students");
chk(m.completion === Math.round(11 / 24 * 100), "completion = opened pairs / possible: " + m.completion);
chk(m.rating === 4.3, "rating 4.3");
chk(m.risk.some((r) => r.s.name === "رامي فؤاد" && r.tag.includes("ما بدأش")), "never-started flagged");
chk(m.risk.some((r) => r.s.name === "محمد علي" && r.tag.includes("12")), "12 days inactive flagged");
chk(m.hard.length && m.hard[0].item === "كويز الدوال", "hardest from Q3");
chk(m.top.length === 5 && m.top[0].n >= 2 && m.top[0].avg >= m.top[4].avg, "top students need 2+ attempts");
const m2 = buildTeacherAnalytics({ grade: "الصف الثاني الثانوي", days: 30, term: 1 }, tanCache, NOW);
chk(m2.total === 3, "grade filter -> 3 students (" + m2.total + ")");
const mE = buildTeacherAnalytics({ grade: "", days: 30, term: 2 }, tanCache, NOW);
chk(mE.avg === null && mE.bars.length === 0, "term 2 empty, no crash");
tanState = { grade: "", days: 30, term: 1 };
drawTeacherAnalytics(); shot("f-b17-analytics", "");
tanState = { grade: "", days: 30, term: 1 }; fbProfile.theme = "";
shot("f-b17-analytics-dark", "dark");
`);
})();
