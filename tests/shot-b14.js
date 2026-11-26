const fs = require("fs");
global.window = { innerWidth: 900, scrollTo: () => {}, addEventListener: () => {}, matchMedia: () => ({ matches: false, addEventListener: () => {} }) };
global.localStorage = { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; } };
global.location = { hash: "#/login" };
global.history = { replaceState: () => {} };
global.app = { innerHTML: "" };
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

const css = fs.readFileSync("/tmp/t4k-mock/style.css", "utf8");
const wrap = (body, theme) => '<!DOCTYPE html><html lang="ar" dir="rtl"' + (theme ? ' data-theme="' + theme + '"' : "") + '><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + "\n* { animation: none !important; transition: none !important; }</style></head><body>" + body + "</body></html>";

const src = ["auth.js", "admin.js", "teacher.js", "student.js", "app.js"].map((f) => fs.readFileSync("/tmp/t4k-mock/" + f, "utf8")).join("\n;\n") + `
(async () => {
fbReady = true;
const days = (n) => new Date(Date.now() + n * 86400000);
const ts = (d) => ({ toDate: () => d, toMillis: () => d.getTime() });
const shot = (name, theme) => __fs.writeFileSync("/tmp/t4k-mock/" + name + ".html", __wrap(app.innerHTML, theme || ""));
fbDb = { collection: () => ({ doc: () => ({ get: async () => ({ exists: false, data: () => null }), set: async () => {} }), where: () => ({ get: async () => ({ docs: [] }) }), add: async () => {} }) };

// ---------- 1) تاب «نبذة عن المهندس» (طالب) ----------
fbUser = { uid: "s1", email: "ahmed@x.com" };
fbRole = "student"; fbProfile = { name: "أحمد محمود" };
location.hash = "#/about";
await renderAboutPage();
shot("f-b14-about", "");
shot("f-b14-about-dark", "dark");

// ---------- 2) فورم الأدمن (النبذة + جملة الأسفل) ----------
fbUser = { uid: "adm", email: "osamaasas0@gmail.com", providerData: [] };
fbRole = "admin"; fbProfile = { name: "أ/ أسامة" };
adminCache = { teachers: [], students: [], subjects: [], admins: [{ id: "osamaasas0@gmail.com", name: "أ/ أسامة" }], library: [], payments: [], log: [], broadcast: null };
location.hash = "#/admin/profile";
adminProfile();
shot("f-b14-admin-form", "");
shot("f-b14-admin-form-dark", "dark");

// ---------- 3) لوحة الطالب مع التيذر في الآخر ----------
fbRole = "student";
fbUser = { uid: "s1", email: "ahmed@x.com" };
const dstr = (n) => { const d = days(-n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const actDays = {}; [0, 1, 2, 3].forEach((n) => { actDays[dstr(n)] = true; });
fbProfile = { id: "s1", name: "أحمد محمود", grade: "الصف الأول الثانوي", teacherIds: ["t1"], parentPhone: "01001234567", status: "approved", activityDays: actDays };
studentData = {
  teachers: [{ id: "t1", name: "محمد أحمد", subject: "الرياضيات", active: true }],
  lessons: [
    { id: "l1", teacherId: "t1", title: "الدوال والمتباينات", subject: "الرياضيات", grade: "الصف الأول الثانوي", unit: 1, lessonNum: 1, term: 1, videoUrl: "https://youtu.be/x" },
  ],
  quizzes: [], exams: [], ann: [], attempts: [],
};
localStorage.setItem("stWatched", JSON.stringify(["l1"]));
studentLoadAll = async () => {};
sMyWeeklyRank = async () => null;
location.hash = "#/student";
await renderStudentDash();
shot("f-b14-student-teaser", "");

// ---------- 4) صفحة الدخول: جملة معدلة من الأدمن ----------
fbUser = null; fbRole = null;
footerText = "فكرة وإعداد: مهندس اسامه حسن عسس — صُنع بحب في مصر";
renderLogin();
shot("f-b14-login-footer", "");

console.log("rendered-b14");
})().catch((e) => { console.error(e); process.exit(1); });
`;
global.__wrap = wrap; global.__fs = fs;
(0, eval)(src);
