const fs = require("fs");
global.window = { addEventListener(){}, scrollTo(){} };
global.localStorage = { getItem: () => null, setItem(){}, removeItem(){} };
global.sessionStorage = global.localStorage;
global.document = {
  getElementById: () => ({ onclick: null, disabled: false, className: "", textContent: "", value: "", style: {}, click(){}, }),
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener(){},
  createElement: () => ({ style: {}, classList: { add(){} }, querySelector: () => null }),
  body: { appendChild(){} },
};
global.location = { hash: "" };
global.alert = () => {}; global.confirm = () => true;
// fbDb mock: كل الاستعلامات ترجع فاضي
const q = { where(){ return q; }, orderBy(){ return q; }, limit(){ return q; }, get: async () => ({ docs: [], empty: true }) };
const docRef = { get: async () => ({ exists: false, data: () => null }), set: async () => {}, update: async () => {}, delete: async () => {} };
global.fbDb = { collection: () => ({ where(){ return q; }, orderBy(){ return q; }, limit(){ return q; }, get: q.get, doc: () => docRef }) };
global.firebase = {
  firestore: {
    FieldPath: { documentId: () => "__id__" },
    FieldValue: { serverTimestamp: () => null, delete: () => null, arrayUnion: (x) => x, arrayRemove: (x) => x },
    Timestamp: { fromDate: (d) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000) }) },
  },
};
global.fbAuth = { currentUser: { uid: "u1" }, signOut: async () => {} };
global.app = { innerHTML: "" };
global.fbReady = true;
const src = ["auth.js", "admin.js", "teacher.js", "student.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n;\n")
  + "\n;try {\n" + fs.readFileSync("app.js", "utf8") + "\n} catch (e) { console.log('APPJS_ERR', e.message); }\n"
  + `
(async () => {
  const tries = [
    ["admin", { uid: "a1", email: "osamaas0@gmail.com" }, null, ["#/admin", "#/admin/teachers", "#/admin/students", "#/admin/subjects", "#/admin/reports", "#/admin/admins"]],
    ["teacher", { uid: "t1", email: "t@t.com" }, { id: "t1", name: "م", stages: ["إعدادي"], subject: "علوم" }, ["#/teacher", "#/teacher/reports", "#/teacher/announcements", "#/teacher/lessons", "#/teacher/lesson/x"]],
    ["student", { uid: "s1", email: "s@t.com" }, { id: "s1", name: "ط", grade: "الصف الأول الإعدادي", teacherIds: ["t1"], parentPhone: "0100", status: "approved" }, ["#/student", "#/student/quizexams", "#/student/ann", "#/student/grades", "#/student/profile", "#/student/lesson/l1", "#/student/quiz/q1", "#/student/exam/e1"]],
  ];
  for (const [role, user, prof, hashes] of tries) {
    fbUser = user; fbRole = role; fbProfile = prof;
    for (const h of hashes) {
      location.hash = h;
      try { await route(); await new Promise((r) => setTimeout(r, 50)); }
      catch (e) { console.log("THROW", role, h, "=>", e.message); continue; }
      const bad = (app.innerHTML || "").includes("مشكلة في التحميل");
      console.log(bad ? "LOADERR" : "ok     ", role, h, bad ? "=> " + app.innerHTML.replace(/<[^>]+>/g, "").trim().slice(0, 90) : "");
    }
  }
  
  // سيناريو المستخدم: جلسة منتهية/فاضية وصلت لصفحة محمية مباشرة — لازم تفتح صفحة الدخول مش خطأ أحمر
  fbUser = null; fbProfile = null;
  for (const [fn, role] of [[renderTeacherDash, "teacher"], [renderTeacherLessons, "teacher"], [renderTeacherReports, "teacher"], [renderTeacherAnnouncements, "teacher"], [renderStudentDash, "student"], [renderStudentProfile, "student"], [renderStudentGrades, "student"], [renderStudentAnn, "student"], [renderStudentQuizExams, "student"]]) {
    fbRole = role; app.innerHTML = "";
    try { await fn(); } catch (e) { console.log("THROW", fn.name, "=>", e.message); continue; }
    const bad = (app.innerHTML || "").includes("مشكلة في التحميل");
    const login = (app.innerHTML || "").includes("اختار نوع حسابك");
    console.log(bad ? "STILL_BROKEN" : login ? "GUARD_OK " : "ODD      ", fn.name);
  }
  console.log("REPRO_DONE");
})();
`;
eval.call(global, src);
