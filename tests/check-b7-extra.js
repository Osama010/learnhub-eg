const fs = require("fs");
global.window = { addEventListener(){}, scrollTo(){} };
global.sessionStorage = { getItem: () => null, setItem(){}, removeItem(){} };
global.localStorage = { getItem: () => null, setItem(){}, removeItem(){} };
global.app = { innerHTML: "" };
const mkEl = () => ({ style:{}, className:"", innerHTML:"", remove(){}, querySelector: () => ({ onclick:null, disabled:false }), onclick:null, disabled:false });
global.document = { getElementById: (id) => id === "app" ? global.app : mkEl(), querySelectorAll: () => [], querySelector: () => null, addEventListener(){}, createElement: () => mkEl(), body: { appendChild(){} }, documentElement: { setAttribute(){}, getAttribute: () => null } };
global.location = { hash: "" };
global.firebase = {};
global.alert = () => {}; global.confirm = () => true;
global.ADMIN_EMAIL = "osamaasas0@gmail.com";
const src = ["auth.js", "admin.js", "teacher.js", "student.js", "app.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n;\n") + `
const main = async () => {
  // درجات الطالب بعد النقل لصف جديد: محاولات الصف القديم بتتخبى
  fbUser = { uid: "stu1", email: "a@x.com" }; fbRole = "student";
  fbProfile = { name: "أحمد", grade: "الصف الثاني الإعدادي", teacherIds: ["t1"], parentPhone: "010" };
  studentLoadAll = async () => {};
  studentData = {
    teachers: [{ id: "t1", name: "أ/ محمد" }],
    lessons: [], exams: [], ann: [],
    quizzes: [
      { id: "qOld", title: "كويز قديم", teacherId: "t1", grade: "الصف الأول الإعدادي", questions: [{}] },
      { id: "qNew", title: "كويز جديد", teacherId: "t1", grade: "الصف الثاني الإعدادي", questions: [{}] },
      { id: "qAll", title: "كويز كل الصفوف", teacherId: "t1", questions: [{}] },
    ],
    attempts: [
      { studentId: "stu1", quizId: "qOld", score: 5, total: 5 },
      { studentId: "stu1", quizId: "qNew", score: 3, total: 5 },
      { studentId: "stu1", quizId: "qAll", score: 4, total: 5 },
      { studentId: "stu1", quizId: "qDeleted", score: 1, total: 5 },
    ],
  };
  await renderStudentGrades();
  const g = app.innerHTML;
  console.log((!g.includes("كويز قديم") ? "ok" : "FAIL") + ": grades hide old-grade attempt");
  console.log((g.includes("كويز جديد") ? "ok" : "FAIL") + ": grades show new-grade attempt");
  console.log((g.includes("كويز كل الصفوف") ? "ok" : "FAIL") + ": grades keep grade-less content attempt");
  console.log((g.includes("1 من 5") ? "ok" : "FAIL") + ": grades keep attempt with missing content");
  // أدمن: صفحة النقل بغلاف لوحة الأدمن
  fbUser = { uid: "adm", email: "osamaasas0@gmail.com" }; fbRole = "admin";
  adminPinOk = () => true;
  adminCache = { teachers: [], subjects: [], admins: [{ id: "osamaasas0@gmail.com", name: "أدمن" }], library: [],
    students: [{ id: "s1", name: "أحمد", grade: "الصف الأول الإعدادي", status: "approved", parentPhone: "0102" }] };
  transferState = { from: "", to: "", picked: {} };
  adminTransferPage();
  const tr = app.innerHTML;
  console.log((tr.includes("نقل جماعي بين الصفوف") && tr.includes("لوحة تحكم الأدمن") ? "ok" : "FAIL") + ": admin transfer page inside admin layout");
  console.log((tr.includes("🎓 متخرج") ? "ok" : "FAIL") + ": transfer targets include graduated");
  // أدمن: زرار الإيقاف الكلي بيكتب status
  let wrote = null;
  const writes = [];
  fbDb = {
    collection: (c) => ({ doc: (d) => ({ update: (data) => { wrote = { c, d, data }; return Promise.resolve(); } }) }),
    batch: () => { const ops = []; return { update: (ref, data) => ops.push(data), commit: async () => { wrote = ops[0] ? { data: ops[0] } : null; writes.push(...ops); } }; },
  };
  adminCache.students = [{ id: "s1", name: "أحمد", email: "a@x.com", status: "approved" }];
  adminLoad = async () => {};
  await adminSetSuspended("s1", true);
  console.log((wrote && wrote.data.status === "suspended" ? "ok" : "FAIL") + ": admin suspend writes status suspended");
  await adminSetSuspended("s1", false);
  console.log((wrote && wrote.data.status === "approved" ? "ok" : "FAIL") + ": admin unsuspend restores approved");
  // مدرس: توجل الإيقاف بيستخدم arrayUnion/arrayRemove
  let wrote2 = null;
  fbUser = { uid: "t1" }; fbRole = "teacher"; fbProfile = { name: "م" };
  firebase.firestore = { FieldValue: { arrayUnion: (x) => ({ u: x }), arrayRemove: (x) => ({ r: x }) } };
  fbDb = { collection: () => ({ doc: (d) => ({ update: (data) => { wrote2 = data; return Promise.resolve(); } }) }) };
  teacherCache = [{ id: "s1", name: "أحمد", status: "approved" }];
  teacherLoad = async () => {};
  renderTeacherDash = async () => {};
  await teacherSuspendToggle("s1", true);
  console.log((wrote2 && wrote2.suspendedBy && wrote2.suspendedBy.u === "t1" ? "ok" : "FAIL") + ": teacher suspend arrayUnion uid");
  await teacherSuspendToggle("s1", false);
  console.log((wrote2 && wrote2.suspendedBy && wrote2.suspendedBy.r === "t1" ? "ok" : "FAIL") + ": teacher unsuspend arrayRemove uid");
  // بوابة الطالب الموقوف كليًا
  fbRole = "blocked"; fbProfile = { status: "suspended" };
  renderStudentHome();
  console.log((app.innerHTML.includes("تم إيقاف حسابك مؤقتًا") ? "ok" : "FAIL") + ": platform-suspended gate screen");
  console.log("EXTRA_DONE");
};
main().catch((e) => { console.error("ERR", e); process.exit(1); });
`;
eval.call(global, src);
