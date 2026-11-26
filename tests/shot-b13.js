const fs = require("fs");
global.window = { innerWidth: 900, scrollTo: () => {}, addEventListener: () => {}, matchMedia: () => ({ matches: false, addEventListener: () => {} }) };
global.localStorage = { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; } };
global.location = { hash: "#/login" };
global.history = { replaceState: () => {} };
global.app = { innerHTML: "" };
const __els = {}; global.__els = __els;
const mkEl = (id) => ({ id, value: "", textContent: "", innerHTML: "", style: {}, dataset: {}, checked: false, disabled: false,
  classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, onclick: null, onchange: null, focus(){}, remove(){}, appendChild(){}, querySelector: () => mkEl(), querySelectorAll: () => [] });
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
const shotOv = (name, theme) => __fs.writeFileSync("/tmp/t4k-mock/" + name + ".html", __wrap(app.innerHTML + '<div class="overlay" style="display:flex; position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:60; align-items:center; justify-content:center;">' + (__lastOv ? __lastOv.innerHTML : "") + "</div>", theme || ""));

// ---------- 1) صفحة الدخول مع كارت التثبيت ----------
fbUser = null; fbRole = null; location.hash = "#/login";
deferredInstallPrompt = { prompt(){}, userChoice: Promise.resolve({}) };
renderLogin();
shot("f-b13-login-pwa", "");
shot("f-b13-login-pwa-dark", "dark");
deferredInstallPrompt = null;

// ---------- بيانات مشتركة ----------
const teachers = [
  { id: "t1", name: "محمد أحمد", email: "mohamed@x.com", phone: "01001112223", subject: "الرياضيات", stages: ["إعدادي", "ثانوي"], active: true, subType: "monthly", subAmount: 300, subStart: ts(days(-21)), subEnd: ts(days(9)) },
  { id: "t2", name: "سارة علي", email: "sara@x.com", phone: "01004445556", subject: "العلوم", stages: ["ابتدائي"], active: true, subType: "year", subAmount: 3000, subStart: ts(days(-200)), subEnd: ts(days(-5)) },
  { id: "t3", name: "خالد إبراهيم", email: "khaled@x.com", phone: "01007778889", subject: "اللغة العربية", stages: ["ابتدائي"], active: true },
];
const students = [
  { id: "s1", name: "أحمد محمود", status: "approved", grade: "الصف الأول الثانوي", teacherIds: ["t1"], parentPhone: "01001234567" },
  { id: "s2", name: "مريم سيد", status: "approved", grade: "الصف الأول الثانوي", teacherIds: ["t1"], parentPhone: "01007654321" },
  { id: "s3", name: "يوسف كريم", status: "approved", grade: "الصف الثاني الثانوي", teacherIds: ["t1"], parentPhone: "01001110000" },
  { id: "s4", name: "منة خالد", status: "approved", grade: "الصف الأول الثانوي", teacherIds: ["t1"], parentPhone: "01002220000" },
  { id: "s5", name: "عمر فاروق", status: "pending", grade: "الصف الثاني الثانوي", teacherIds: ["t1"] },
];
const acts = [
  { studentId: "s1", kind: "lesson", refId: "l1", points: 10, grade: "الصف الأول الثانوي", ts: ts(new Date()) },
  { studentId: "s1", kind: "quiz", refId: "q1", points: 20, grade: "الصف الأول الثانوي", ts: ts(new Date()) },
  { studentId: "s1", kind: "lesson", refId: "l2", points: 10, grade: "الصف الأول الثانوي", ts: ts(new Date()) },
  { studentId: "s2", kind: "quiz", refId: "q1", points: 20, grade: "الصف الأول الثانوي", ts: ts(new Date()) },
  { studentId: "s2", kind: "lesson", refId: "l1", points: 10, grade: "الصف الأول الثانوي", ts: ts(new Date()) },
  { studentId: "s4", kind: "lesson", refId: "l3", points: 10, grade: "الصف الأول الثانوي", ts: ts(new Date()) },
  { studentId: "s3", kind: "quiz", refId: "q2", points: 20, grade: "الصف الثاني الثانوي", ts: ts(new Date()) },
];
const bcActive = { text: "بالتوفيق في امتحانات آخر الأسبوع — راجعوا غلطاتكم من صفحة «راجع غلطاتك» قبل الامتحان", audience: "all", until: ts(days(2)) };

// ---------- 2) لوحة الأدمن: كارت الإعلان ----------
fbUser = { uid: "adm", email: "osamaasas0@gmail.com" };
fbRole = "admin"; fbProfile = { name: "أ/ أسامة" };
location.hash = "#/admin";
adminCache = {
  teachers, students,
  subjects: [{ name: "الرياضيات", stage: "ثانوي" }], admins: [], library: [],
  payments: [
    { id: "p1", teacherId: "t1", teacherName: "محمد أحمد", subType: "monthly", amount: 300, from: ts(days(-21)), to: ts(days(9)), note: "فودافون كاش", paidAt: ts(days(-21)), recordedBy: "أ/ أسامة" },
    { id: "p2", teacherId: "t2", teacherName: "سارة علي", subType: "year", amount: 3000, from: ts(days(-200)), to: ts(days(-5)), note: "", paidAt: ts(days(-30)), recordedBy: "أ/ أسامة" },
    { id: "p3", teacherId: "t1", teacherName: "محمد أحمد", subType: "monthly", amount: 300, from: ts(days(-51)), to: ts(days(-21)), note: "كاش", paidAt: ts(days(-51)), recordedBy: "أ/ أسامة" },
  ],
  log: [
    { id: "l1", action: "تسجيل دفعة", targetType: "teacher", targetId: "t1", targetName: "محمد أحمد", details: "شهري — 300 ج — فودافون كاش", by: "أ/ أسامة", at: ts(new Date(Date.now() - 3600000)) },
    { id: "l2", action: "إيقاف مدرس مؤقتًا", targetType: "teacher", targetId: "t2", targetName: "سارة علي", details: "", by: "أ/ أسامة", at: ts(days(-1)) },
    { id: "l3", action: "نقل جماعي", targetType: "students", targetId: "", targetName: "5 طالب", details: "من «الصف الأول الثانوي» إلى «الصف الثاني الثانوي»", by: "أ/ أسامة", at: ts(days(-2)) },
    { id: "l4", action: "قبول طالب", targetType: "student", targetId: "s4", targetName: "منة خالد", details: "", by: "أ/ أسامة", at: ts(days(-3)) },
    { id: "l5", action: "نشر إعلان", targetType: "broadcast", targetId: "current", targetName: "", details: "بالتوفيق في امتحانات آخر الأسبوع", by: "أ/ أسامة", at: ts(days(-4)) },
  ],
  broadcast: bcActive,
};
adminLoad = async () => {};
adminStats();
shot("f-b13-admin-broadcast", "");

// ---------- 3) مودال تسجيل الدفعة ----------
__lastOv = null;
adminPaymentModal(teachers[0]);
shotOv("f-b13-paymodal", "");

// ---------- 4) صفحة السجل ----------
logFilter = { action: "", from: "", to: "" };
adminLogPage();
shot("f-b13-log", "");
shot("f-b13-log-dark", "dark");

// ---------- 5) تقرير المدفوعات ----------
reportState = { type: "payments", teacher: "", status: "", grade: "", stage: "", kind: "", q: "", from: "", to: "", sub: "", month: "" };
adminReports();
shot("f-b13-report-payments", "");

// ---------- 6) لوحة المدرس: البانر + لوحة الشرف ----------
fbRole = "teacher";
fbUser = { uid: "t1", email: "mohamed@x.com" };
fbProfile = { id: "t1", name: "محمد أحمد", subject: "الرياضيات", stages: ["ثانوي"], subType: "monthly", subAmount: 300, subEnd: ts(days(9)) };
teacherLoad = async () => { teacherCache = students.map((s) => ({ ...s })); };
lessonsState.attempts = []; lessonsState.ratings = [];
fbDb = {
  collection: (c) => ({
    doc: () => ({ get: async () => ({ exists: true, data: () => bcActive }) }),
    where: () => ({ get: async () => ({ docs: acts.map((a) => ({ data: () => a })) }) }),
  }),
};
location.hash = "#/teacher";
await renderTeacherDash();
shot("f-b13-teacher-honor", "");
shot("f-b13-teacher-honor-dark", "dark");

// ---------- 7) صفحة الطالب: البانر + الترتيب + الأوسمة ----------
fbRole = "student";
fbUser = { uid: "s1", email: "ahmed@x.com" };
const dstr = (n) => { const d = days(-n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const actDays = {}; [0, 1, 2, 3].forEach((n) => { actDays[dstr(n)] = true; });
fbProfile = { id: "s1", name: "أحمد محمود", grade: "الصف الأول الثانوي", teacherIds: ["t1"], parentPhone: "01001234567", status: "approved", activityDays: actDays };
studentData = {
  teachers: [{ id: "t1", name: "محمد أحمد", subject: "الرياضيات", active: true }],
  lessons: [
    { id: "l1", teacherId: "t1", title: "الدوال والمتباينات", subject: "الرياضيات", grade: "الصف الأول الثانوي", unit: 1, lessonNum: 1, term: 1, videoUrl: "https://youtu.be/x" },
    { id: "l2", teacherId: "t1", title: "الهندسة التحليلية", subject: "الرياضيات", grade: "الصف الأول الثانوي", unit: 1, lessonNum: 2, term: 1 },
  ],
  quizzes: [{ id: "q1", teacherId: "t1", title: "كويز الدرس الأول", grade: "الصف الأول الثانوي", term: 1, lessonId: "l1", questions: [{}] }],
  exams: [], ann: [],
  attempts: [{ quizId: "q1", score: 8, total: 10 }],
};
localStorage.setItem("stWatched", JSON.stringify(["l1"]));
studentLoadAll = async () => {};
location.hash = "#/student";
await renderStudentDash();
shot("f-b13-student", "");
shot("f-b13-student-dark", "dark");

console.log("rendered-b13");
})().catch((e) => { console.error(e); process.exit(1); });
`;
global.__wrap = wrap; global.__fs = fs;
(0, eval)(src);
