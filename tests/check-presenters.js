/* اختبار presenters الشاشات الرفيعة (library / lesson / profile / landing). تشغيل: node tests/check-presenters.js */
const assert = require("assert"), path = require("path");
const root = path.resolve(__dirname, "..");
(async () => {
  let n = 0; const ok = (c, m) => { assert(c, m); n++; };
  const L = await import(root + "/src/features/student/library.presenter.js");
  ok(L.libraryItems(null).length === 0 && L.libraryItems({ library: [1] }).length === 1, "libraryItems");
  const P = await import(root + "/src/features/student/profile.presenter.js");
  ok(P.avatarModel(null).hasPhoto === false && P.avatarModel({ avatar: "x", name: " ب " }).nm === "ب", "avatarModel");
  const S = await import(root + "/src/features/student/lesson.presenter.js");
  const rules = { visible: () => true, teacherLocked: () => false, isOpen: () => true, fmtTs: () => "غدا" };
  ok(S.findLesson({ lessons: [{ id: "a" }] }, "a").id === "a" && S.findLesson({}, "a") === null, "findLesson");
  ok(S.lessonAccess(null, rules).message === "الدرس ده مش متاح ليك.", "lesson missing");
  ok(S.lessonAccess({}, { ...rules, visible: () => false }).ok === false, "lesson hidden");
  ok(S.lessonAccess({}, { ...rules, teacherLocked: () => true }).message.includes("إيقاف"), "teacher locked");
  ok(S.lessonAccess({ publishAt: 1 }, { ...rules, isOpen: () => false }).message.includes("غدا"), "scheduled");
  ok(S.lessonAccess({}, rules).ok === true, "lesson open");
  ok(S.linkedQuizzes({ quizzes: [{ lessonId: "a" }, { lessonId: "b" }] }, "a", rules).length === 1, "linkedQuizzes");
  const G = await import(root + "/src/features/landing/landing.presenter.js");
  const future = { toDate: () => new Date(2999, 0, 1) }, past = { toDate: () => new Date(2000, 0, 1) };
  const now = new Date(2026, 0, 1);
  ok(G.activeTeachers([{ subType: "free", subEnd: past }, { subType: "monthly", subEnd: past }, { subType: "monthly", subEnd: future }, { subType: "term" }], now).length === 3, "activeTeachers");
  ok(G.splitSkills("أ، ب, ,ج").join("|") === "أ|ب|ج" && G.splitParas("x\n\n y ").length === 2, "split");
  ok(G.initialOf("مستر أحمد") === "أ" && G.initialOf("") === "م", "initialOf");
  ok(G.readMoreLabel(true) === "إخفاء النبذة" && G.LANDING_FEATURES.length === 4, "labels");
  // طلب حساب مدرس
  const TS = await import(root + "/src/features/auth/teacher-signup.presenter.js");
  const good = { name: "أحمد علي", email: " T@X.com ", phone: "01012345678", subject: "رياضيات", grades: ["الصف الثاني الإعدادي", "الصف الأول الإعدادي", "غريب"], bio: "" };
  const r1 = TS.presentTeacherSignup(good);
  ok(r1.values && r1.values.email === "t@x.com" && r1.values.grades.join("|") === "الصف الأول الإعدادي|الصف الثاني الإعدادي" && r1.values.stages.join() === "إعدادي", "teacherSignup: قيم نضيفة وصفوف مرتبة والغريب بيتشال");
  ok(TS.presentTeacherSignup({ ...good, grades: [] }).error && TS.presentTeacherSignup({ ...good, grades: ["غريب"] }).error, "teacherSignup: لازم صف");
  ok(TS.presentTeacherSignup({ ...good, email: "x" }).error && TS.presentTeacherSignup({ ...good, phone: "123" }).error && TS.presentTeacherSignup({ ...good, name: "أ" }).error && TS.presentTeacherSignup({ ...good, subject: " " }).error, "teacherSignup: تحقق الحقول");
  ok(TS.presentTeacherSignup({ ...good, bio: "x".repeat(301) }).error && TS.presentTeacherSignup({ ...good, website: "spam" }).bot === true, "teacherSignup: النبذة الطويلة والبوت");
  const allMid = ["الصف الأول الإعدادي", "الصف الثاني الإعدادي", "الصف الثالث الإعدادي"];
  ok(TS.stageFullySelected("إعدادي", allMid) && !TS.stageFullySelected("ثانوي", allMid) && TS.gradesSummary([...allMid, "الصف الثالث الثانوي"]) === "كل صفوف الإعدادي، الثالث الثانوي" && TS.stagesOfGrades([...allMid, "الصف الثالث الثانوي"]).join() === "إعدادي,ثانوي", "teacherSignup: مرحلة كاملة وملخص الصفوف");
  const RG = await import(root + "/src/features/auth/register.presenter.js");
  ok(RG.teacherShownForGrade("إعدادي", "الصف الأول الإعدادي", "الصف الثاني الإعدادي") === false && RG.teacherShownForGrade("إعدادي", "الصف الثاني الإعدادي", "الصف الثاني الإعدادي") === true && RG.teacherShownForGrade("إعدادي", "الصف الأول الإعدادي", "") === true && RG.teacherShownForGrade("", "الصف الأول الإعدادي") === true, "register: مدرس بصفوف محددة بيظهر للصف ده بس");
  console.log("presenters:" + n + " passed");
})().catch((e) => { console.log("presenters FAIL", e.message); process.exit(1); });
