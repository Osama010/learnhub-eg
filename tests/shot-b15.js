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
await run("", ["admin.js", "teacher.js", "student.js"], mkDbSrc + `
location.hash = ""; fbUser = null; fbRole = null;
await route(); await new Promise((r) => setTimeout(r, 30));
shot("f-b15-landing", ""); shot("f-b15-landing-dark", "dark");
`);
for (const [p, files, th] of [["student", ["student.js"], ""], ["teacher", ["teacher.js"], "dark"], ["admin", ["admin.js"], ""]]) {
  await run(p, files, mkDbSrc + `
location.hash = "#/login"; fbUser = null; fbRole = null;
renderLogin(); shot("f-b15-login-${p}", "${th}");
`);
}
await run("student", ["student.js"], mkDbSrc + `
fbUser = { uid: "u1", email: "s@x.com" }; fbRole = "teacher"; location.hash = "#/student";
await route(); shot("f-b15-wrong-portal", "");
// بروفايل الطالب مع كارت مدرسيني
fbRole = "student";
fbProfile = { id: "u1", name: "أحمد محمود", grade: "الصف الأول الثانوي", teacherIds: ["t1"], parentPhone: "01001234567", status: "approved" };
studentData = { teachers: [], lessons: [], quizzes: [], exams: [], ann: [], attempts: [] };
studentLoadAll = async () => {};
sMyWeeklyRank = async () => null;
const origColl = fbDb.collection;
fbDb.collection = (c) => c === "teacherRequests" ? { where: () => ({ get: async () => ({ docs: [
  { id: "u1_t2", data: () => ({ teacherId: "t2", status: "pending", studentId: "u1" }) },
  { id: "u1_t3", data: () => ({ teacherId: "t3", status: "rejected", studentId: "u1" }) } ] }) }) } : origColl(c);
location.hash = "#/student/profile"; await renderStudentProfile();
shot("f-b15-student-teachers", ""); shot("f-b15-student-teachers-dark", "dark");
sShowResult({ id: "q1", title: "كويز تجريبي" }, [{ q: "س؟", type: "mcq", options: ["أ", "ب"], answer: 0 }], [{ correct: true }], false, [0]);
shot("f-b15-student-result", "");
`);
await run("teacher", ["teacher.js"], mkDbSrc + `
fbUser = { uid: "t1", email: "t1@x.com" }; fbRole = "teacher"; fbProfile = { name: "مستر أحمد", stages: ["ثانوي"] };
teacherLoad = async () => { teacherCache = [{ id: "s9", name: "طالب قديم", grade: "الصف الأول الثانوي", status: "approved", email: "o@x.com" }]; };
const origColl = fbDb.collection;
fbDb.collection = (c) => c === "teacherRequests" ? { where: () => ({ where: () => ({ get: async () => ({ docs: [
  { id: "u1_t1", data: () => ({ studentId: "u1", teacherId: "t1", studentName: "أحمد محمود", grade: "الصف الأول الثانوي", email: "s@x.com", status: "pending" }) },
  { id: "u2_t1", data: () => ({ studentId: "u2", teacherId: "t1", studentName: "منى علي", grade: "الصف الثاني الثانوي", email: "m@x.com", status: "pending" }) } ] }) }) }) } : origColl(c);
location.hash = "#/teacher"; await renderTeacherDash();
shot("f-b15-teacher-requests", "");
`);
await run("admin", ["admin.js"], mkDbSrc + `
fbUser = { uid: "adm", email: "osamaasas0@gmail.com", providerData: [] }; fbRole = "admin"; fbProfile = { name: "أ/ أسامة" };
adminCache = { teachers: [], students: [], subjects: [], admins: [{ id: "osamaasas0@gmail.com", name: "أ/ أسامة" }], library: [], payments: [], log: [], broadcast: null };
location.hash = "#/admin/profile"; adminProfile();
shot("f-b15-admin-stats", "");
`);
console.log("rendered-b15");

})();
