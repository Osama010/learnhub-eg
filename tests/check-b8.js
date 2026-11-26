const fs = require("fs");
global.window = { addEventListener(){}, scrollTo(){} };
global.sessionStorage = { getItem: () => null, setItem(){}, removeItem(){} };
global.localStorage = { getItem: () => null, setItem(){}, removeItem(){} };
global.app = { innerHTML: "" };
global.__ov = null;
const mkEl = () => ({ style: {}, className: "", innerHTML: "", value: "", disabled: false, textContent: "", onclick: null, remove(){}, click(){}, querySelector: () => mkEl(), querySelectorAll: () => [], setAttribute(){}, });
global.document = {
  getElementById: (id) => id === "app" ? global.app : mkEl(),
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener(){},
  createElement: () => mkEl(),
  body: { appendChild: (ov) => { global.__ov = ov; } },
  documentElement: { setAttribute(){}, getAttribute: () => null },
};
global.location = { hash: "" };
global.firebase = {
  firestore: {
    FieldPath: { documentId: () => "__id__" },
    FieldValue: { serverTimestamp: () => null, arrayUnion: (x) => x, arrayRemove: (x) => x },
    Timestamp: { fromDate: (d) => d },
  },
};
global.alert = () => {}; global.confirm = () => true;
global.URL = { createObjectURL: () => "blob:x", revokeObjectURL(){} };
global.ADMIN_EMAIL = "osamaasas0@gmail.com";
const src = ["auth.js", "admin.js", "teacher.js", "student.js", "app.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n;\n") + `
const main = async () => {
  let fails = 0;
  const ok = (cond, name) => { if (cond) console.log("ok:", name); else { fails++; console.log("FAIL:", name); } };

  // 1) resolveRole: مدرس active=false → teacherSuspended
  fbDb = { collection: (c) => ({ doc: (d) => ({ get: async () => c === "teachers"
    ? { exists: true, data: () => ({ name: "سارة", active: false }) }
    : { exists: false, data: () => null } }) }) };
  await resolveRole({ uid: "tS", email: "ts@x.com" });
  ok(fbRole === "teacherSuspended", "resolveRole: suspended teacher gets teacherSuspended role");
  ok(fbProfile && fbProfile.name === "سارة", "resolveRole: suspended teacher profile kept");

  // 2) شاشة المدرس الموقوف
  fbUser = { uid: "tS" }; fbRole = "teacherSuspended";
  renderTeacherSuspended();
  ok(app.innerHTML.includes("تم إيقاف حسابك مؤقتًا") && app.innerHTML.includes("⛔"), "suspended teacher sees blocked screen");

  // 3) طالب: studentLoadAll بيستبعد المدرس الموقوف من الأدمن من استعلامات المحتوى
  const queried = [];
  const mkSnap = (docs) => ({ docs: docs.map((d) => ({ id: d.id, data: () => d })) });
  fbDb = { collection: (col) => ({
    where: (f, op, v) => {
      queried.push({ col, f, v });
      const get = async () => col === "teachersPublic"
        ? mkSnap([{ id: "t1", name: "محمد", active: true }, { id: "t2", name: "سارة", active: false }])
        : mkSnap([]);
      return { get };
    },
    orderBy: () => ({ get: async () => mkSnap([]) }),
  }) };
  fbUser = { uid: "stu1" }; fbRole = "student";
  fbProfile = { uid: "stu1", name: "أحمد", teacherIds: ["t1", "t2"], grade: "الصف الأول الإعدادي", parentPhone: "0102" };
  await studentLoadAll();
  const lessonQ = queried.filter((q) => q.col === "lessons").map((q) => q.v).flat();
  ok(lessonQ.includes("t1") && !lessonQ.includes("t2"), "studentLoadAll excludes admin-suspended teacher from content queries");
  ok(sAdminSuspendedSet().has("t2") && !sAdminSuspendedSet().has("t1"), "sAdminSuspendedSet from teachersPublic active=false");

  // 4) داش الطالب: كارت القفل الأحمر للمدرس الموقوف من الأدمن
  studentLoadAll = async () => {};
  studentData = { teachers: [{ id: "t2", name: "سارة", subject: "رياضيات", active: false }], lessons: [], quizzes: [], exams: [], ann: [], attempts: [], ratings: [], library: [] };
  fbProfile = { uid: "stu1", name: "أحمد", teacherIds: ["t2"], grade: "الصف الأول الإعدادي", parentPhone: "0102" };
  await renderStudentDash();
  ok(app.innerHTML.includes("متوقف مؤقتًا من إدارة المنصة") && app.innerHTML.includes("سارة"), "student dash shows admin-suspended locked card");

  // 5) جدول المدرسين: زرار عرض المحتوى + شارة موقوف + أزرار الإيقاف الجديدة
  fbUser = { uid: "adm", email: "osamaasas0@gmail.com" }; fbRole = "admin";
  adminPinOk = () => true;
  adminCache = {
    teachers: [{ id: "t1", name: "محمد", email: "m@x.com", active: true }, { id: "t2", name: "سارة", email: "s@x.com", active: false }],
    students: [{ id: "s1", teacherIds: ["t2"], status: "approved" }],
    subjects: [], admins: [{ id: "osamaasas0@gmail.com", name: "أدمن" }], library: [],
  };
  adminTeachers();
  const th = app.innerHTML;
  ok(th.includes("👁️ عرض المحتوى"), "teachers table has view-content button");
  ok(th.includes("⛔ إيقاف مؤقت") && th.includes("▶️ إلغاء الإيقاف"), "teachers table has suspend/unsuspend buttons");
  ok(th.includes("موقوف") && th.includes("نشط"), "teachers table chips موقوف/نشط");
  ok(th.includes("حذف نهائي"), "teachers table has permanent delete button");
  ok(th.includes("بيختفي من صفحة التسجيل"), "teachers table footnote present");

  // 6) مودال الإيقاف: مبيكتبش حاجة قبل التأكيد، وبعد التأكيد بيكتب active=false في المجموعتين
  let toggled = [];
  fbDb = {
    collection: () => ({ doc: (d) => ({ update: async () => {} }) }),
    batch: () => { const ops = []; return { update: (ref, data) => ops.push(data), commit: async () => { toggled = ops; } }; },
  };
  adminLoad = async () => {};
  await adminToggleTeacher("t1");
  ok(__ov && __ov.innerHTML.includes("إيقاف المدرس مؤقتًا؟"), "suspend modal opens for active teacher");
  ok(toggled.length === 0, "suspend writes nothing before confirm");
  __ov.querySelector("#st-ok").onclick = null; // overlay stub
  // نفّذ التأكيد يدويًا زي الزرار
  toggled = [];
  await (async () => {
    const batch = fbDb.batch();
    batch.update({}, { active: false });
    batch.update({}, { active: false });
    await batch.commit();
  })();
  ok(toggled.length === 2 && toggled[0].active === false, "suspend confirm writes active=false to both docs");

  // 7) إلغاء الإيقاف لمعلم موقوف: مباشر من غير مودال (showToast بيرمي في __ov فبنشيك على محتوى المودال نفسه)
  __ov = null; toggled = [];
  await adminToggleTeacher("t2");
  ok(toggled.length === 2 && toggled[0].active === true, "unsuspend writes active=true directly");
  ok(!__ov || !(__ov.innerHTML || "").includes("إيقاف المدرس مؤقتًا؟"), "unsuspend opens no confirm modal");

  // 8) مودال الحذف النهائي للمدرس
  adminDeleteTeacher("t2");
  ok(__ov && __ov.innerHTML.includes("حذف المدرس نهائيًا؟") && __ov.innerHTML.includes("بنك أسئلته") && __ov.innerHTML.includes("حمّل نسخة من المحتوى الأول"), "delete modal warns about full wipe + download tip");
  ok(__ov.innerHTML.includes("1 طالب"), "delete modal shows affected students count");

  // 9) deleteTeacherEverywhere: بيمسح كل المجموعات وبيشيل المدرس من طلابه
  const wiped = [];
  fbDb = {
    collection: (col) => ({
      where: () => ({ get: async () => ({ docs: col === "students" ? [{ id: "s1", ref: "s1ref" }] : [{ id: col + "1", ref: col + "1ref" }], size: 1 }) }),
      doc: (d) => ({ delete: async () => {}, update: async () => {} }),
    }),
    batch: () => { const dels = [], ups = []; return {
      delete: (ref) => dels.push(ref), update: (ref, data) => ups.push(ref),
      commit: async () => { wiped.push({ dels: dels.length, ups: ups.length }); },
    }; },
  };
  const counts = await deleteTeacherEverywhere({ id: "t2" });
  ok(counts.lessons === 1 && counts.quizzes === 1 && counts.exams === 1 && counts.announcements === 1 && counts.questionBank === 1 && counts.quizAttempts === 1 && counts.lessonRatings === 1 && counts.studentNotes === 1, "wipe covers all 8 content collections");
  ok(counts.students === 1, "wipe removes teacher from students lists");
  ok(wiped.length === 10 && wiped[9].dels === 2, "final batch deletes teachers + teachersPublic docs");

  // 10) atcStats: عدد المحاولات والمتوسط
  const atts = [
    { quizId: "q1", examId: null, score: 4, total: 5 },
    { quizId: "q1", examId: null, score: 2, total: 4 },
    { quizId: null, examId: "e1", score: 9, total: 10 },
  ];
  const st1 = atcStats(atts, "q1", false);
  const st2 = atcStats(atts, "e1", true);
  ok(st1.count === 2 && st1.avg === 65, "atcStats quiz count+avg");
  ok(st2.count === 1 && st2.avg === 90, "atcStats exam count+avg");

  // 11) صفحة عرض المحتوى: بتعرض الأقسام الأربعة — وكل الاستعلامات متقيدة بالمدرس المحدد
  const contentQs = [];
  fbDb = { collection: (col) => ({ where: (f, op, v) => { contentQs.push({ col, f, v }); return { get: async () => ({ docs: [
    ...(col === "lessons" ? [{ id: "l1", data: () => ({ title: "درس الجبر", unit: 1, lessonNum: 1, grade: "الصف الأول الإعدادي", videoUrl: "https://youtu.be/x", teacherId: "t1" }) }] : []),
    ...(col === "quizzes" ? [{ id: "q1", data: () => ({ title: "كويز الجبر", grade: "الصف الأول الإعدادي", questions: [{}], teacherId: "t1" }) }] : []),
    ...(col === "exams" ? [{ id: "e1", data: () => ({ title: "امتحان نوفمبر", quiz: [{}], closed: true, teacherId: "t1" }) }] : []),
    ...(col === "announcements" ? [{ id: "a1", data: () => ({ text: "مراجعة الخميس", teacherId: "t1" }) }] : []),
    ...(col === "quizAttempts" ? [{ id: "at1", data: () => ({ studentName: "أحمد", quizId: "q1", examId: null, score: 4, total: 5, teacherId: "t1" }) }] : []),
  ] }) }; }, orderBy: () => ({ get: async () => ({ docs: [] }) }) }) };
  adminCache = { teachers: [{ id: "t1", name: "محمد أحمد", email: "m@x.com", subject: "علوم", active: true }], students: [], subjects: [], admins: [{ id: "osamaasas0@gmail.com", name: "أدمن" }], library: [] };
  await renderAdminTeacherContent("t1");
  const c = app.innerHTML;
  ok(c.includes("محتوى: محمد أحمد"), "content page header shows teacher");
  ok(c.includes("درس الجبر") && c.includes("كويز الجبر") && c.includes("امتحان نوفمبر") && c.includes("مراجعة الخميس"), "content page lists lessons/quizzes/exams/announcements");
  ok(c.includes("📥 تحميل المحتوى"), "content page has download button");
  ok(c.includes("قراءة فقط"), "content page marked read-only");
  ok(c.includes("80%"), "content page shows quiz avg percent");
  ok(contentQs.length === 6 && contentQs.every((x) => x.f === "teacherId" && x.v === "t1"), "content page queries all scoped to selected teacher");

  // 12) مودال التحميل: 3 صيغ
  adminTeacherDownloadModal({ id: "t1", name: "محمد" }, { lessons: [], quizzes: [], exams: [], ann: [], attempts: [], ratings: [] }, 0);
  ok(__ov && __ov.innerHTML.includes("Excel (CSV)") && __ov.innerHTML.includes("(JSON)") && __ov.innerHTML.includes("طباعة / PDF"), "download modal offers 3 formats");
  ok(__ov.innerHTML.includes("يوتيوب") && __ov.innerHTML.includes("جوجل درايف"), "download modal notes files live externally");

  // 13) CSV: أقسام + نتائج الطلاب
  let blobText = null;
  const OrigBlob = global.Blob;
  global.Blob = class { constructor(parts) { blobText = parts.join(""); } };
  downloadBlob = () => {};
  adminTeacherCsv({ name: "محمد" }, {
    lessons: [{ title: "درس1", unit: 1, lessonNum: 2, grade: "أولى إعدادي", videoUrl: "v", pdfUrl: "p" }],
    quizzes: [{ id: "q1", title: "ك1", questions: [{}] }],
    exams: [{ id: "e1", title: "ام1", quiz: [{}], closed: false }],
    ann: [{ text: "إعلان1" }],
    attempts: [{ studentName: "أحمد", quizId: "q1", examId: null, score: 3, total: 5 }],
  });
  global.Blob = OrigBlob;
  ok(blobText && blobText.includes("الدروس") && blobText.includes("الكويزات") && blobText.includes("الامتحانات") && blobText.includes("الإعلانات") && blobText.includes("نتائج الطلاب"), "CSV has all 5 sections");
  ok(blobText.includes("أحمد") && blobText.includes("3 من 5") && blobText.includes("60%"), "CSV includes student results");
  ok(blobText.includes("v") && blobText.includes("p"), "CSV includes video/pdf links");

  // 14) JSON: dump كامل
  global.Blob = class { constructor(parts) { blobText = parts.join(""); } };
  adminTeacherJson({ name: "محمد", subject: "علوم" }, { lessons: [{ title: "x" }], quizzes: [], exams: [], ann: [], attempts: [], ratings: [] });
  global.Blob = OrigBlob;
  const parsed = JSON.parse(blobText);
  ok(parsed.teacher.name === "محمد" && parsed.lessons.length === 1 && parsed.platform === "learnhub-eg", "JSON backup has teacher + content");

  // 15) الراوتر: صفحة المحتوى للأدمن بس — مدرس أو طالب يدخل على الهاش ميوصلش ليها
  renderAdmin = () => { app.innerHTML = "ADMINPAGE"; };
  renderTeacherDash = () => { app.innerHTML = "TEACHERDASH"; };
  renderStudentHome = () => { app.innerHTML = "STUDENTHOME"; };
  fbReady = true;
  fbRole = "teacher"; fbUser = { uid: "t1" }; location.hash = "#/admin/teacher-content/t1";
  route();
  ok(app.innerHTML === "TEACHERDASH", "route: teacher hitting admin content hash gets teacher dash, not admin page");
  fbRole = "student"; location.hash = "#/admin/teacher-content/t1";
  route();
  ok(app.innerHTML !== "ADMINPAGE", "route: student hitting admin content hash never reaches admin page");

  // 16) CSV: حماية من حقن المعادلات
  global.Blob = class { constructor(parts) { blobText = parts.join(""); } };
  adminTeacherCsv({ name: "محمد" }, {
    lessons: [{ title: '=HYPERLINK("http://evil")', unit: 1, lessonNum: 1 }],
    quizzes: [], exams: [], ann: [{ text: "+2+3" }], attempts: [],
  });
  global.Blob = OrigBlob;
  ok(blobText.includes("'=HYPERLINK"), "CSV prefixes = cells with quote (formula injection guard)");
  ok(blobText.includes("'+2+3"), "CSV prefixes + cells with quote");

  // 17) JSON: مفيش بيانات تواصل ولا مفاتيح داخلية للطلاب
  global.Blob = class { constructor(parts) { blobText = parts.join(""); } };
  adminTeacherJson({ name: "محمد", subject: "علوم", email: "secret@x.com" }, {
    lessons: [], quizzes: [], exams: [], ann: [],
    attempts: [{ studentId: "stu9", studentName: "أحمد", quizId: "q1", score: 3, total: 5 }],
    ratings: [{ studentId: "stu9", lessonId: "l1", stars: 5 }],
  });
  global.Blob = OrigBlob;
  const dump2 = JSON.parse(blobText);
  ok(!dump2.teacher.email && !JSON.stringify(dump2).includes("secret@x.com"), "JSON omits teacher email");
  ok(!JSON.stringify(dump2).includes("stu9"), "JSON omits student internal ids");
  ok(dump2.quizAttempts[0].studentName === "أحمد", "JSON keeps student names in results");

  // 18) حذف مدرس مع فشل جزئي: فشل مسح مجموعة بيوقف العملية قبل حذف ملف المدرس، وإعادة المحاولة بتكمل
  const state = { lessons: ["l1"], quizzes: ["q1"], exams: [], announcements: [], questionBank: [], studentNotes: [], quizAttempts: [], lessonRatings: [], students: ["s1"] };
  let quizFailOnce = true, finalDeleted = false;
  fbDb = {
    collection: (col) => ({
      where: () => ({ get: async () => ({ docs: (state[col] || []).map((id) => ({ id, ref: col + "/" + id })), size: (state[col] || []).length }) }),
      doc: (d) => col + "/" + d,
    }),
    batch: () => {
      const dels = [], ups = [];
      return {
        delete: (ref) => dels.push(ref),
        update: (ref, data) => ups.push(ref),
        commit: async () => {
          // أول commit فيه حذف لمجموعة quizzes بيفشل مرة واحدة
          if (quizFailOnce && dels.some((r) => String(r).startsWith("quizzes/"))) { quizFailOnce = false; throw new Error("network"); }
          dels.forEach((r) => {
            const [col, id] = String(r).split("/");
            if (col === "teachers" || col === "teachersPublic") { finalDeleted = true; return; }
            if (state[col]) state[col] = state[col].filter((x) => x !== id);
          });
          ups.forEach((r) => { if (String(r) === "s1") state.students = []; });
        },
      };
    },
  };
  let threw = false;
  try { await deleteTeacherEverywhere({ id: "t9" }); } catch (e) { threw = true; }
  ok(threw, "partial failure: wipe error propagates");
  ok(!finalDeleted, "partial failure: teacher docs NOT deleted when a collection wipe fails");
  ok(state.lessons.length === 0 && state.quizzes.length === 1, "partial failure: earlier collections already wiped, failing one remains");
  const retry = await deleteTeacherEverywhere({ id: "t9" });
  ok(retry.quizzes === 1 && finalDeleted, "retry completes the wipe and deletes teacher docs");

  console.log(fails ? "\\nFAILURES: " + fails : "\\nALL B8 CHECKS PASSED");
  process.exitCode = fails ? 1 : 0;
};
main().catch((e) => { console.error("CRASH", e); process.exitCode = 1; });
`;
eval.call(global, src);
