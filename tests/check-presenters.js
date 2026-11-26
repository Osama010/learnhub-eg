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
  console.log("presenters:" + n + " passed");
})().catch((e) => { console.log("presenters FAIL", e.message); process.exit(1); });
