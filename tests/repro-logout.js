/* Repro: بعد تسجيل الخروج، أي رندر متأخر لصفحة محمية لازم يرجع لصفحة الدخول
   بهدوء — ممنوع يظهر "Missing or insufficient permissions" أو توست خطأ.
   الدرايفر جوه نفس الـ eval عشان يشوف نفس متغيرات الجلسة (let bindings). */
const fs = require("fs");
global.window = { addEventListener(){}, scrollTo(){} };
global.sessionStorage = { getItem: () => null, setItem(){}, removeItem(){} };
global.localStorage = { getItem: () => null, setItem(){}, removeItem(){} }; // المتصفح دايماً فيه localStorage — الموج كان ناقصه
global.app = { innerHTML: "" };
global.document = { getElementById: (id) => id === "app" ? global.app : ({ onclick: null, disabled: false, className: "", textContent: "" }), querySelectorAll: () => [], querySelector: () => null, addEventListener(){}, createElement: () => ({ style:{}, classList:{add(){}}, querySelector: () => null }), body: { appendChild(){} } };
global.location = { hash: "#/x" };
global.firebase = {};
global.alert = () => {}; global.confirm = () => true;
global.ADMIN_EMAIL = "osamaasas0@gmail.com";

const driver = `
// --- موك فايرستور: لو مفيش جلسة يرمي نفس خطأ الإنتاج ---
function mkColl() {
  const res = { empty: true, docs: [], size: 0, forEach(){} };
  const chain = {
    where: () => chain, orderBy: () => chain, limit: () => chain,
    get: async () => { if (!fbUser || __tokenGone) throw new Error("Missing or insufficient permissions"); return res; },
    doc: () => ({ get: async () => { if (!fbUser || __tokenGone) throw new Error("Missing or insufficient permissions"); return { exists: false, data: () => ({}) }; } }),
  };
  return chain;
}
fbDb = { collection: () => mkColl(), batch: () => ({ set(){}, update(){}, delete(){}, commit: async () => {} }) };
fbAuth = { signOut: async () => {}, onAuthStateChanged(){} };
let __tokenGone = false;

const __toasts = [];
const __origToast = showToast;
showToast = (t, kind) => { __toasts.push({ t, kind }); };

let __fails = 0;
const ok = (cond, name) => { if (cond) console.log("ok:", name); else { __fails++; console.log("FAIL:", name); } };
const tick = () => new Promise((r) => setTimeout(r, 0));

async function expectCalmLogin(roleName) {
  await tick(); await tick();
  ok(app.innerHTML.includes("اختار نوع حسابك"), roleName + ": late render lands on login page");
  ok(!app.innerHTML.includes("Missing or insufficient"), roleName + ": no permissions error text");
  ok(!__toasts.some((x) => x.kind === "bad"), roleName + ": no error toast");
}

(async () => {
  // ---------- أدمن ----------
  fbUser = { uid: "a1", email: "osamaasas0@gmail.com" };
  fbRole = "admin"; fbProfile = null;
  adminCache = { students: [], teachers: [], lessons: [], quizzes: [], exams: [], attempts: [], subjects: [], announcements: [], admins: [{ id: "osamaasas0@gmail.com" }] };
  // positive control: الجلسة شغالة — البوابة تشتغل عادي (شاشة اختيار PIN أول مرة)
  await renderAdminPinGate("#/admin");
  await tick();
  ok(app.innerHTML.includes("اختار رقم الأدمن السري") || app.innerHTML.includes("اكتب رقم الأدمن السري"), "admin: gate works while signed in");
  ok(!app.innerHTML.includes("Missing or insufficient"), "admin: no error while signed in");
  // خروج ثم رندرز متأخرة (زي عملية تحميل كانت لسه شغالة)
  signOut(); __tokenGone = true;
  await renderAdminPinGate("#/admin");
  await expectCalmLogin("admin gate after logout");
  await adminStats();
  await expectCalmLogin("admin stats late render after logout");
  await adminStudents();
  await expectCalmLogin("admin students late render after logout");
  await adminReports();
  await expectCalmLogin("admin reports late render after logout");

  // ---------- مدرس ----------
  fbUser = { uid: "t1", email: "t1@x.com" };
  __tokenGone = false;
  fbRole = "teacher"; fbProfile = { name: "أ/ محمد", avatar: "", subject: "علوم", stages: ["إعدادي"] };
  await renderTeacherDash();
  await tick(); await tick();
  ok(!app.innerHTML.includes("اختار نوع حسابك"), "teacher: dashboard renders while signed in");
  signOut(); __tokenGone = true;
  await renderTeacherDash();
  await expectCalmLogin("teacher dash late render after logout");
  await renderTeacherLessons();
  await expectCalmLogin("teacher lessons late render after logout");
  await renderTeacherProfile();
  await expectCalmLogin("teacher profile late render after logout");
  await renderTeacherReports();
  await expectCalmLogin("teacher reports late render after logout");
  await renderTeacherAnnouncements();
  await expectCalmLogin("teacher announcements late render after logout");

  // ---------- طالب ----------
  fbUser = { uid: "u1", email: "a@x.com" };
  __tokenGone = false;
  fbRole = "student"; fbProfile = { name: "أحمد سامي", grade: "الصف الأول الإعدادي", teacherIds: ["t1"], parentPhone: "01009998887", avatar: "" };
  await renderStudentHome();
  await tick(); await tick();
  ok(!app.innerHTML.includes("اختار نوع حسابك"), "student: home renders while signed in");
  signOut(); __tokenGone = true;
  await renderStudentHome();
  await expectCalmLogin("student home late render after logout");
  await renderStudentDash();
  await expectCalmLogin("student lessons late render after logout");
  await renderStudentQuizExams();
  await expectCalmLogin("student quizzes late render after logout");
  await renderStudentGrades();
  await expectCalmLogin("student grades late render after logout");
  await renderStudentProfile();
  await expectCalmLogin("student profile late render after logout");
  await renderStudentAnn();
  await expectCalmLogin("student announcements late render after logout");

  console.log(__fails ? "LOGOUT_REPRO_FAILS " + __fails : "LOGOUT_REPRO_OK");
  process.exit(__fails ? 1 : 0);
})().catch((e) => { console.log("LOGOUT_REPRO_CRASH", e.message); process.exit(1); });
`;

const src = ["auth.js", "admin.js", "teacher.js", "student.js", "app.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n;\n") + "\n;\n" + driver;
eval.call(global, src);
