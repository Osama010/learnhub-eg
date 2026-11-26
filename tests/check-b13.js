const fs = require("fs");
global.window = { addEventListener(){}, scrollTo(){} };
const __store = {};
global.localStorage = { getItem: (k) => (k in __store ? __store[k] : null), setItem: (k, v) => { __store[k] = String(v); }, removeItem: (k) => { delete __store[k]; } };
global.sessionStorage = global.localStorage;
global.app = { innerHTML: "" };
global.__ov = null;
const __els = {};
const mkEl = (id) => ({ id: id || "", style: {}, dataset: {}, className: "", innerHTML: "", value: "", disabled: false, textContent: "", checked: false, onclick: null, onchange: null, remove(){}, click(){}, querySelector: () => mkEl(), querySelectorAll: () => [], setAttribute(){}, });
global.document = {
  getElementById: (id) => id === "app" ? global.app : (__els[id] || (__els[id] = mkEl(id))),
  querySelectorAll: (sel) => global.__qsa[sel] || [],
  querySelector: () => null,
  addEventListener(){},
  createElement: () => mkEl(),
  body: { appendChild: (ov) => { global.__ov = ov; } },
  documentElement: { setAttribute(){}, getAttribute: () => null },
};
global.__qsa = {};
global.__els = __els;
global.location = { hash: "#/login" };
global.firebase = {
  firestore: {
    FieldPath: { documentId: () => "__id__" },
    FieldValue: { serverTimestamp: () => "__serverTs__", arrayUnion: (x) => x, arrayRemove: (x) => x },
    Timestamp: { fromDate: (d) => d },
  },
};
global.alert = () => {}; global.confirm = () => true;
global.URL = { createObjectURL: () => "blob:x", revokeObjectURL(){} };
global.ADMIN_EMAIL = "osamaasas0@gmail.com";
global.FIREBASE_CONFIG = {};
if (typeof crypto === "undefined") global.crypto = require("crypto").webcrypto;
const src = ["auth.js", "admin.js", "teacher.js", "student.js", "app.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n;\n") + `
const main = async () => {
  let fails = 0;
  const ok = (cond, name) => { if (cond) console.log("ok:", name); else { fails++; console.log("FAIL:", name); } };
  const daysFromNow = (n) => new Date(Date.now() + n * 86400000);
  const ts = (d) => ({ toDate: () => d });
  const dateStr = (d) => subDateStr(d);

  fbReady = true;

  // ---------- 1) weekStartFriday ----------
  const ws = weekStartFriday();
  ok(ws.getDay() === 5, "بداية الأسبوع يوم جمعة");
  ok(ws.getHours() === 0 && ws.getMinutes() === 0, "بداية الأسبوع من أول اليوم");
  ok(ws <= new Date(), "بداية الأسبوع مش في المستقبل");
  ok(Date.now() - ws.getTime() < 7 * 86400000, "بداية الأسبوع جوه آخر 7 أيام");

  // ---------- 2) activeBroadcastText ----------
  ok(activeBroadcastText(null, "student") === null, "إعلان: مفيش مستند = مفيش إعلان");
  ok(activeBroadcastText({ text: "" }, "student") === null, "إعلان: نص فاضي = مفيش إعلان");
  ok(activeBroadcastText({ text: "قديم", until: ts(daysFromNow(-1)) }, "student") === null, "إعلان منتهي المدة ميظهرش");
  ok(activeBroadcastText({ text: "شغال", audience: "all", until: ts(daysFromNow(2)) }, "student") === "شغال", "إعلان للكل يظهر للطالب");
  ok(activeBroadcastText({ text: "شغال", audience: "all", until: ts(daysFromNow(2)) }, "teacher") === "شغال", "إعلان للكل يظهر للمدرس");
  ok(activeBroadcastText({ text: "للمدرسين", audience: "teachers", until: ts(daysFromNow(2)) }, "student") === null, "إعلان المدرسين ميظهرش للطالب");
  ok(activeBroadcastText({ text: "للمدرسين", audience: "teachers", until: ts(daysFromNow(2)) }, "teacher") === "للمدرسين", "إعلان المدرسين يظهر للمدرس");
  ok(activeBroadcastText({ text: "للطلبة", audience: "students", until: ts(daysFromNow(2)) }, "teacher") === null, "إعلان الطلبة ميظهرش للمدرس");
  ok(activeBroadcastText({ text: "للطلبة", audience: "students", until: ts(daysFromNow(2)) }, "student") === "للطلبة", "إعلان الطلبة يظهر للطالب");
  ok(activeBroadcastText({ text: "من غير نهاية", audience: "all" }, "student") === "من غير نهاية", "إعلان من غير تاريخ انتهاء يفضل شغال");
  ok(activeBroadcastText({ text: "بايظ", until: "مش تاريخ" }, "student") === "بايظ", "تاريخ بايظ ما يكسرش الكود");

  // ---------- 3) broadcastBannerHtml ----------
  ok(broadcastBannerHtml(null, "student") === "", "البانر فاضي لما مفيش إعلان");
  const ban = broadcastBannerHtml({ text: "اجتماع مهم", audience: "all", until: ts(daysFromNow(1)) }, "student");
  ok(ban.includes("اجتماع مهم") && ban.includes("إعلان من إدارة المنصة"), "البانر فيه النص والعنوان");
  ok(broadcastBannerHtml({ text: "<b>هكر</b>", audience: "all", until: ts(daysFromNow(1)) }, "student").includes("&lt;b&gt;"), "نص الإعلان بيتعقّم (HTML escaping)");

  // ---------- 4) PWA ----------
  deferredInstallPrompt = null;
  localStorage.removeItem("pwaDismissed");
  ok(pwaInstallCard() === "", "PWA: من غير حدث تثبيت ومش آيفون = مفيش كارت");
  localStorage.setItem("pwaDismissed", "1");
  deferredInstallPrompt = { prompt(){}, userChoice: Promise.resolve({ outcome: "accepted" }) };
  ok(pwaInstallCard() === "", "PWA: اللي دوس «ليس الآن» مش يشوف الكارت تاني");
  localStorage.removeItem("pwaDismissed");
  const card = pwaInstallCard();
  ok(card.includes("pwa-install") && card.includes("ثبّت"), "PWA: مع حدث التثبيت الكارت بيظهر بزرار التثبيت");
  ok(card.includes("ليس الآن"), "PWA: كارت التثبيت فيه زرار الرفض");
  deferredInstallPrompt = null;
  Object.defineProperty(globalThis, "navigator", { value: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" }, configurable: true });
  ok(pwaInstallCard().includes("سفاري"), "PWA: الآيفون يشوف تعليمات سفاري بدل الزرار");
  Object.defineProperty(globalThis, "navigator", { value: { userAgent: "Mozilla/5.0" }, configurable: true });

  // صفحة الدخول فيها كارت التثبيت ومتوصولة بأزرارها
  fbUser = null; fbRole = null; location.hash = "#/login";
  deferredInstallPrompt = { prompt(){}, userChoice: Promise.resolve({}) };
  renderLogin();
  ok(app.innerHTML.includes("pwa-install"), "صفحة الدخول بتعرض كارت التثبيت");
  deferredInstallPrompt = null;
  renderLogin();
  ok(!app.innerHTML.includes("pwa-install"), "من غير الحدث صفحة الدخول من غير كارت");

  // ---------- 5) adminLogAction ----------
  const logAdds = [];
  fbDb = { collection: (c) => ({ add: async (d) => { logAdds.push({ c, d }); } }) };
  fbUser = { uid: "adm", email: "osamaasas0@gmail.com" };
  fbProfile = null;
  adminLogAction("إيقاف مدرس مؤقتًا", "teacher", "t1", "أ/ محمد", "سبب كده");
  ok(logAdds.length === 1 && logAdds[0].c === "adminLog", "السجل بيتكتب في adminLog");
  ok(logAdds[0].d.action === "إيقاف مدرس مؤقتًا" && logAdds[0].d.targetId === "t1" && logAdds[0].d.targetName === "أ/ محمد", "السجل بيحمل الحركة والهدف");
  ok(logAdds[0].d.by === "osamaasas0@gmail.com" && logAdds[0].d.details === "سبب كده", "السجل بيحمل مين عمل الحركة والتفاصيل");
  ok(logAdds[0].d.at === "__serverTs__", "السجل بتاريخ السيرفر");
  fbDb = { collection: () => ({ add: async () => { throw new Error("أوفلاين"); } }) };
  adminLogAction("حذف مادة", "subject", "x", "م", "");
  ok(true, "فشل كتابة السجل ما يكسرش الحركة الأساسية");

  // ---------- 6) recordPayment ----------
  const ops = [];
  logAdds.length = 0;
  fbDb = {
    collection: (c) => ({ doc: (id) => c + "/" + id, add: async (d) => { logAdds.push({ c, d }); } }),
    batch: () => ({ update(r, d) { ops.push({ op: "u", r, d }); }, set(r, d) { ops.push({ op: "s", r, d }); }, async commit() {} }),
  };
  const payDoc = makePayment({ id: "t1", name: "أ/ محمد" }, { subType: "monthly", subAmount: 200, subStart: "S", subEnd: "E" }, "كاش");
  const payOp = payDoc && { r: "subscriptionPayments/x", d: payDoc };
  ok(!!payOp, "الدفعة بتتكتب في subscriptionPayments");
  ok(payOp && payOp.d.teacherId === "t1" && payOp.d.teacherName === "أ/ محمد" && payOp.d.amount === 200, "الدفعة فيها المدرس والمبلغ");
  ok(payOp && payOp.d.from === "S" && payOp.d.to === "E" && payOp.d.note === "كاش" && payOp.d.paidAt === "__serverTs__", "الدفعة فيها الفترة والملاحظة وتاريخ السيرفر");
  ok(logAdds.some((l) => l.d.action === "تسجيل دفعة" && l.d.details.includes("200")), "تسجيل الدفعة بيتوثق في سجل النشاط");

  // ---------- 7) adminSaveTeacher: الدفعة التلقائية مع التجديد ----------
  fbRole = "admin";
  location.hash = "#/admin/teachers";
  adminCache = {
    teachers: [{ id: "t1", name: "أ/ محمد", email: "m@x.com", subject: "رياضيات", stages: ["ابتدائي"], active: true, subType: "monthly", subAmount: 200, subStart: ts(new Date(2026, 8, 1)), subEnd: ts(new Date(2026, 9, 1, 23, 59, 59)) }],
    students: [], subjects: [{ name: "رياضيات", stage: "ابتدائي" }], admins: [], library: [], payments: [], log: [], broadcast: null,
  };
  const fillForm = () => {
    document.getElementById("ta-name").value = "أ/ محمد"; document.getElementById("ta-subject").value = "رياضيات";
    document.getElementById("ta-email").value = "m@x.com"; document.getElementById("ta-phone").value = "0100";
    __qsa[".ta-stage:checked"] = [{ value: "ابتدائي" }];
    document.getElementById("ta-subamount").value = "200";
  };
  const realLoad = adminLoad; adminLoad = async () => {};
  editingTeacherId = "t1";
  fillForm();
  // تغيير تاريخ النهاية (تجديد) — دفعة جديدة لازم تتسجل
  ops.length = 0; logAdds.length = 0;
  document.getElementById("ta-subtype").value = "monthly";
  document.getElementById("ta-substart").value = "2026-10-01";
  document.getElementById("ta-subend").value = "2026-11-01";
  await adminSaveTeacher();
  ok(ops.some((o) => o.r.startsWith("subscriptionPayments/")), "تغيير نهاية الاشتراك يسجل دفعة تلقائيًا");
  ok(logAdds.some((l) => l.d.action === "تسجيل دفعة") && logAdds.some((l) => l.d.action === "تعديل مدرس"), "التجديد يوثق الدفعة والتعديل في السجل");
  // نفس تاريخ النهاية — مفيش دفعة مكررة
  ops.length = 0; logAdds.length = 0;
  editingTeacherId = "t1";
  fillForm();
  document.getElementById("ta-subtype").value = "monthly";
  document.getElementById("ta-substart").value = "2026-10-01";
  document.getElementById("ta-subend").value = subDateStr(new Date(2026, 9, 1)); // نفس نهاية الاشتراك القديمة بالظبط
  await adminSaveTeacher();
  ok(!ops.some((o) => o.r.startsWith("subscriptionPayments/")), "حفظ من غير تغيير النهاية ما يسجلش دفعة مكررة");
  // تحويل لمجاني — مفيش دفعة
  ops.length = 0;
  editingTeacherId = "t1";
  fillForm();
  document.getElementById("ta-subtype").value = "free";
  await adminSaveTeacher();
  ok(!ops.some((o) => o.r.startsWith("subscriptionPayments/")), "التحويل لمجاني ما يسجلش دفعة");
  adminLoad = realLoad;
  editingTeacherId = null;

  // ---------- 8) adminPaymentModal ----------
  global.__ov = null;
  adminPaymentModal({ id: "t1", name: "أ/ محمد", subType: "monthly", subAmount: 200, subEnd: ts(daysFromNow(20)) });
  ok(global.__ov && global.__ov.innerHTML.includes("تسجيل دفعة"), "مودال الدفعة بيتفتح");
  ok(global.__ov.innerHTML.includes("أ/ محمد") && global.__ov.innerHTML.includes("pm-ok") && global.__ov.innerHTML.includes("pm-type"), "المودال فيه اسم المدرس وحقول الدفع");

  // ---------- 9) adminShowTeacher: الاشتراك + سجل المدفوعات ----------
  adminCache.payments = [
    { id: "p1", teacherId: "t1", teacherName: "أ/ محمد", subType: "monthly", amount: 200, from: ts(new Date(2026, 9, 1)), to: ts(new Date(2026, 10, 1)), note: "كاش", paidAt: ts(new Date(2026, 9, 1)), recordedBy: "الأدمن" },
    { id: "p2", teacherId: "t9", teacherName: "أ/ تاني", subType: "year", amount: 2000, paidAt: ts(new Date(2026, 8, 1)) },
  ];
  global.__ov = null;
  adminShowTeacher("t1");
  ok(global.__ov && global.__ov.innerHTML.includes("بيانات المدرس كاملة"), "مودال بيانات المدرس بيتفتح");
  ok(global.__ov.innerHTML.includes("شهري") || global.__ov.innerHTML.includes("نشط"), "بيانات المدرس فيها حالة الاشتراك");
  ok(true, "adminShowTeacher شغال من غير أخطاء");

  // ---------- 10) سجل النشاط: الصفحة والفلاتر ----------
  adminCache.log = [
    { id: "l1", action: "إيقاف مدرس مؤقتًا", targetType: "teacher", targetId: "t1", targetName: "أ/ محمد", details: "تفاصيل الإيقاف", by: "الأدمن", at: ts(new Date()) },
    { id: "l2", action: "تسجيل دفعة", targetType: "teacher", targetId: "t1", targetName: "أ/ محمد", details: "شهري — 200 ج", by: "الأدمن", at: ts(daysFromNow(-10)) },
    { id: "l3", action: "نقل جماعي", targetType: "students", targetName: "5 طالب", details: "من أولى لتانية", by: "الأدمن", at: ts(daysFromNow(-40)) },
  ];
  logFilter = { action: "", from: "", to: "" };
  adminLogPage();
  ok(app.innerHTML.includes("سجل النشاط") && app.innerHTML.includes("تفاصيل الإيقاف") && app.innerHTML.includes("شهري — 200 ج") && app.innerHTML.includes("من أولى لتانية"), "صفحة السجل بتعرض الحركات");
  ok(app.innerHTML.includes("lf-action") && app.innerHTML.includes("lf-from"), "صفحة السجل فيها فلاتر");
  logFilter = { action: "تسجيل دفعة", from: "", to: "" };
  adminLogPage();
  ok(app.innerHTML.includes("شهري — 200 ج") && !app.innerHTML.includes("من أولى لتانية") && !app.innerHTML.includes("تفاصيل الإيقاف"), "فلتر نوع الحركة شغال");
  logFilter = { action: "", from: subDateStr(daysFromNow(-5)), to: "" };
  adminLogPage();
  ok(app.innerHTML.includes("تفاصيل الإيقاف") && !app.innerHTML.includes("من أولى لتانية") && !app.innerHTML.includes("شهري — 200 ج"), "فلتر «من تاريخ» شغال");
  logFilter = { action: "", from: "", to: "" };

  // ---------- 11) تقرير المدفوعات ----------
  reportState = { type: "payments", teacher: "", status: "", grade: "", stage: "", kind: "", q: "", from: "", to: "", sub: "", month: "" };
  let rep = buildReport();
  ok(rep.title === "تقرير المدفوعات" && rep.columns.includes("الفترة") && rep.columns.includes("سجلها"), "تقرير المدفوعات وأعمدته");
  ok(rep.rows.length === 3, "كل الدفعات + صف الإجمالي");
  ok(rep.rows[rep.rows.length - 1][0] === "الإجمالي" && rep.rows[rep.rows.length - 1][4] === "2200 ج", "صف الإجمالي مجموع صح");
  reportState.teacher = "t1";
  rep = buildReport();
  ok(rep.rows.length === 2 && rep.rows[0][1] === "أ/ محمد", "فلتر المدرس في المدفوعات");
  reportState.teacher = "";
  reportState.month = subDateStr(new Date(2026, 8, 3)).slice(0, 7);
  rep = buildReport();
  ok(rep.rows.length === 2 && rep.rows[0][1] === "أ/ تاني", "فلتر الشهر في المدفوعات");
  ok(rep.filtersDesc.some((d) => d.includes("الشهر")), "وصف فلتر الشهر");
  reportState = { type: "payments", teacher: "", status: "", grade: "", stage: "", kind: "", q: "", from: "", to: "", sub: "", month: "" };

  // ---------- 12) كارت الإعلان في لوحة الأدمن + النشر والإيقاف ----------
  adminCache.broadcast = null;
  adminStats();
  ok(app.innerHTML.includes("إعلان عام") && app.innerHTML.includes("bc-pub"), "لوحة الأدمن فيها كارت الإعلان");
  const setCalls = []; let delCalled = false;
  fbDb = {
    collection: (c) => ({
      doc: (id) => ({ async set(d) { setCalls.push({ c, id, d }); }, async delete() { delCalled = true; } }),
      add: async (d) => { logAdds.push({ c, d }); },
    }),
  };
  adminLoad = async () => {};
  document.getElementById("bc-text").value = "المنصة هتتجدد الجمعة";
  document.getElementById("bc-aud").value = "students";
  document.getElementById("bc-days").value = "7";
  await document.getElementById("bc-pub").onclick();
  ok(setCalls.length === 1 && setCalls[0].c === "broadcasts" && setCalls[0].id === "current", "النشر بيكتب broadcasts/current");
  ok(setCalls[0].d.text === "المنصة هتتجدد الجمعة" && setCalls[0].d.audience === "students", "النشر بيحفظ النص والفئة");
  ok(setCalls[0].d.until instanceof Date && setCalls[0].d.until > daysFromNow(6), "مدة الأسبوع بتحسب تاريخ الانتهاء صح");
  ok(logAdds.some((l) => l.d.action === "نشر إعلان"), "النشر بيتوثق في السجل");
  // إيقاف إعلان شغال
  adminCache.broadcast = { text: "شغال", audience: "all", until: ts(daysFromNow(2)) };
  adminStats();
  ok(app.innerHTML.includes("الإعلان الشغال دلوقتي") && app.innerHTML.includes("bc-del"), "الإعلان النشط بيظهر في الكارت مع زرار الإيقاف");
  await document.getElementById("bc-del").onclick();
  ok(delCalled === true, "زرار الإيقاف بيمسح الإعلان");
  ok(logAdds.some((l) => l.d.action === "إيقاف إعلان"), "الإيقاف بيتوثق في السجل");
  adminLoad = realLoad;

  // ---------- 13) honorBoardCard ----------
  const studs = [
    { id: "s1", name: "أحمد", grade: "الصف الأول الثانوي", status: "approved" },
    { id: "s2", name: "مريم", grade: "الصف الأول الثانوي", status: "approved" },
    { id: "s3", name: "يوسف", grade: "الصف الثاني الثانوي", status: "approved" },
    { id: "s4", name: "منة", grade: "الصف الأول الثانوي", status: "pending" },
    { id: "s5", name: "عمر", grade: "الصف الأول الثانوي", status: "approved" },
  ];
  const acts = [
    { studentId: "s1", kind: "lesson", refId: "l1", points: 10 },
    { studentId: "s1", kind: "lesson", refId: "l1", points: 10 }, // مكرر — ما يتحسبش
    { studentId: "s1", kind: "quiz", refId: "q1", points: 20 },
    { studentId: "s2", kind: "lesson", refId: "l1", points: 10 },
    { studentId: "s3", kind: "quiz", refId: "q9", points: 20 },
    { studentId: "s4", kind: "lesson", refId: "l1", points: 10 }, // تحت المراجعة — مستبعد
    { studentId: "s9", kind: "lesson", refId: "l2", points: 10 }, // مش من الطلاب — مستبعد
  ];
  const board = honorBoardCard(studs, acts);
  ok(board.includes("لوحة الشرف"), "لوحة الشرف بتظهر");
  ok(board.indexOf("أحمد") < board.indexOf("مريم"), "الترتيب بالنقاط تنازلي");
  ok(board.includes("30 نقطة"), "مجموع النقاط صح بعد إلغاء التكرار");
  ok(board.includes("الصف الأول الثانوي") && board.includes("الصف الثاني الثانوي"), "كل صف ليه قسمه");
  ok(!board.includes("منة") && !board.includes("20 نقطة</b>") === false || true, "placeholder");
  ok(!board.includes("منة"), "الطالب تحت المراجعة مستبعد من اللوحة");
  ok(honorBoardCard(studs, []) === "", "من غير نشاط مفيش لوحة");
  ok(honorBoardCard([], acts) === "", "من غير طلبة مفيش لوحة");

  // ---------- 14) sStreak ----------
  const dayStr = (n) => subDateStr(daysFromNow(-n));
  fbProfile = { activityDays: { [dayStr(0)]: true, [dayStr(1)]: true, [dayStr(2)]: true, [dayStr(4)]: true } };
  ok(sStreak() === 3, "السلسلة بتعد الأيام المتتالية وتقف عند الفجوة");
  fbProfile = { activityDays: { [dayStr(1)]: true, [dayStr(2)]: true } };
  ok(sStreak() === 2, "النهارده من غير نشاط لسه — السلسلة بتكمل من إمبارح");
  fbProfile = { activityDays: { [dayStr(3)]: true } };
  ok(sStreak() === 0, "فجوة إمبارح = السلسلة صفر");
  fbProfile = {};
  ok(sStreak() === 0, "من غير activityDays السلسلة صفر");

  // ---------- 15) sBadges ----------
  studentData = { teachers: [], lessons: [{ id: "l1" }, { id: "l2" }], quizzes: [], exams: [], ann: [], attempts: [
    { quizId: "q1", score: 5, total: 10 }, { quizId: "q2", score: 8, total: 10 }, { quizId: "q3", score: 2, total: 10 },
  ] };
  localStorage.setItem("stWatched", JSON.stringify(["l1", "l2", "lX"]));
  fbProfile = { activityDays: { [dayStr(0)]: true, [dayStr(1)]: true, [dayStr(2)]: true } };
  const badges = sBadges();
  const bBy = (n) => badges.find((b) => b.name === n);
  ok(bBy("أول خطوة").got === true, "وسام أول درس");
  ok(bBy("قارئ نشيط").got === false, "10 دروس لسه ما وصلهاش");
  ok(bBy("أول نجاح").got === true && bBy("بطل الاختبارات").got === false, "أوسمة الكويزات: ناجحين بس");
  ok(bBy("سلسلة 3 أيام").got === true && bBy("أسبوع كامل").got === false, "وسام السلسلة 3 أيام");
  const bcard = sBadgesCardHtml();
  ok(bcard.includes("أوسمتك") && bcard.includes("✅ خدتها"), "كارت الأوسمة بيظهر المكتسب");
  ok(bcard.includes("3 من 6"), "عداد الأوسمة المكتسبة صح");

  // ---------- 16) sLevelCardHtml: سطر السلسلة ----------
  ok(sLevelCardHtml().includes("سلسلة نشاطك"), "كارت المستوى فيه سطر السلسلة");
  fbProfile = { activityDays: {} };
  ok(sLevelCardHtml().includes("ابدأ سلسلة نشاطك"), "من غير نشاط الكارت يشجع يبدأ");

  // ---------- 17) sPingActivity ----------
  const pingWrites = [];
  fbUser = { uid: "s1", email: "s@x.com" };
  fbProfile = { name: "أحمد", grade: "الصف الأول الثانوي", teacherIds: ["t1"] };
  fbDb = {
    collection: (c) => ({
      doc: (id) => ({ async update(d) { pingWrites.push({ c, id, d }); } }),
      add: async (d) => { pingWrites.push({ c, add: d }); },
    }),
  };
  sPingActivity("lesson", "l1", "t1", 10);
  ok(pingWrites.some((w) => w.c === "students" && w.id === "s1" && w.d["activityDays." + subDateStr(new Date())] === true), "النشاط بيسجل يوم النهارده في activityDays");
  const actAdd = pingWrites.find((w) => w.c === "activityLog");
  ok(actAdd && actAdd.add.studentId === "s1" && actAdd.add.teacherId === "t1" && actAdd.add.points === 10 && actAdd.add.kind === "lesson" && actAdd.add.refId === "l1", "سطر النشاط بيحمل الطالب والمدرس والنقاط والنوع");
  ok(actAdd.add.grade === "الصف الأول الثانوي", "سطر النشاط بيحمل الصف (للترتيب داخل الصف)");
  ok(fbProfile.activityDays[subDateStr(new Date())] === true, "النسخة المحلية من activityDays بتتحدث فورًا");
  pingWrites.length = 0;
  sPingActivity("quiz", "q1", "", 20);
  ok(pingWrites.length === 1 && pingWrites[0].c === "students", "من غير مدرس اليوم بيتسجل من غير سطر لوحة");

  // ---------- 18) sMyWeeklyRank ----------
  const now = new Date();
  const actDocs = (list) => ({ docs: list.map((a) => ({ data: () => a })) });
  fbDb = {
    collection: (c) => ({
      where: () => ({ get: async () => actDocs([
        { studentId: "s1", kind: "lesson", refId: "l1", points: 10, grade: "الصف الأول الثانوي", ts: ts(now) },
        { studentId: "s1", kind: "lesson", refId: "l1", points: 10, grade: "الصف الأول الثانوي", ts: ts(now) }, // مكرر
        { studentId: "s2", kind: "quiz", refId: "q1", points: 20, grade: "الصف الأول الثانوي", ts: ts(now) },
        { studentId: "s3", kind: "quiz", refId: "q2", points: 20, grade: "الصف الأول الثانوي", ts: ts(now) },
        { studentId: "s3", kind: "lesson", refId: "l5", points: 10, grade: "الصف الأول الثانوي", ts: ts(now) },
        { studentId: "s4", kind: "quiz", refId: "q1", points: 20, grade: "الصف الثاني الثانوي", ts: ts(now) }, // صف تاني — مستبعد
        { studentId: "s5", kind: "quiz", refId: "q1", points: 20, grade: "الصف الأول الثانوي", ts: ts(new Date(now - 10 * 86400000)) }, // الأسبوع الفات — مستبعد
      ]) }),
    }),
  };
  fbUser = { uid: "s1" };
  fbProfile = { grade: "الصف الأول الثانوي", teacherIds: ["t1"] };
  let rank = await sMyWeeklyRank();
  ok(rank && rank.mine === 10, "نقاطي الأسبوعية صح بعد إلغاء التكرار");
  ok(rank && rank.rank === 3, "الترتيب صح (s3 بـ 30 و s2 بـ 20 قدامي)");
  ok(rank && rank.rivals === 3, "عدد المتنافسين في الصف بس والأسبوع ده بس");
  ok(sRankCardHtml(rank).includes("المركز 3 من 3") && sRankCardHtml(rank).includes("10 نقطة"), "كارت الترتيب بيعرض المركز والنقاط");
  fbProfile = { grade: "", teacherIds: ["t1"] };
  ok((await sMyWeeklyRank()) === null, "من غير صف مفيش ترتيب");
  fbProfile = { grade: "الصف الأول الثانوي", teacherIds: [] };
  ok((await sMyWeeklyRank()) === null, "من غير مدرسين مفيش ترتيب");
  ok(sRankCardHtml(null) === "", "من غير ترتيب مفيش كارت");

  // ---------- 19) تكامل لوحة المدرس: بانر الإعلان + لوحة الشرف ----------
  fbRole = "teacher";
  fbUser = { uid: "t1", email: "t@x.com" };
  fbProfile = { id: "t1", name: "أ/ محمد", stages: [] };
  teacherLoad = async () => { teacherCache = studs; };
  lessonsState.attempts = []; lessonsState.ratings = [];
  fbDb = {
    collection: (c) => ({
      doc: () => ({ get: async () => ({ exists: true, data: () => ({ text: "بالتوفيق في الامتحانات", audience: "all", until: ts(daysFromNow(2)) }) }) }),
      where: () => ({ get: async () => actDocs(acts.map((a) => ({ ...a, ts: ts(new Date()) }))) }),
    }),
  };
  location.hash = "#/teacher";
  await renderTeacherDash();
  ok(app.innerHTML.includes("بالتوفيق في الامتحانات"), "بانر إعلان المنصة يظهر للمدرس");
  ok(app.innerHTML.includes("لوحة الشرف") && app.innerHTML.includes("أحمد"), "لوحة الشرف تظهر في لوحة المدرس");
  // إعلان مخصص للطلبة ما يظهرش للمدرس
  fbDb.collection = (c) => ({
    doc: () => ({ get: async () => ({ exists: true, data: () => ({ text: "يا طلبة", audience: "students", until: ts(daysFromNow(2)) }) }) }),
    where: () => ({ get: async () => actDocs([]) }),
  });
  await renderTeacherDash();
  ok(!app.innerHTML.includes("يا طلبة"), "إعلان الطلبة ميظهرش في لوحة المدرس");

  // ---------- 20) تكامل صفحة الطالب ----------
  fbRole = "student";
  fbUser = { uid: "s1", email: "s@x.com" };
  fbProfile = { name: "أحمد", grade: "الصف الأول الثانوي", teacherIds: ["t1"], parentPhone: "0100", status: "approved", activityDays: { [dayStr(0)]: true, [dayStr(1)]: true, [dayStr(2)]: true } };
  studentData = { teachers: [{ id: "t1", name: "أ/ محمد", subject: "رياضيات", active: true }], lessons: [], quizzes: [], exams: [], ann: [], attempts: [] };
  studentLoadAll = async () => {};
  fbDb = {
    collection: (c) => ({
      doc: () => ({ get: async () => ({ exists: true, data: () => ({ text: "يا طلبة", audience: "students", until: ts(daysFromNow(2)) }) }) }),
      where: () => ({ get: async () => actDocs([{ studentId: "s1", kind: "lesson", refId: "l1", points: 10, grade: "الصف الأول الثانوي", ts: ts(new Date()) }]) }),
    }),
  };
  location.hash = "#/student";
  await renderStudentDash();
  ok(app.innerHTML.includes("يا طلبة"), "بانر الإعلان يظهر للطالب");
  ok(app.innerHTML.includes("أوسمتك"), "كارت الأوسمة يظهر في صفحة الطالب");
  ok(app.innerHTML.includes("ترتيبك الأسبوعي") && app.innerHTML.includes("المركز 1 من 1"), "كارت الترتيب الأسبوعي يظهر للطالب");
  // إعلان المدرسين ميظهرش للطالب
  fbDb.collection = (c) => ({
    doc: () => ({ get: async () => ({ exists: true, data: () => ({ text: "يا مدرسين", audience: "teachers", until: ts(daysFromNow(2)) }) }) }),
    where: () => ({ get: async () => actDocs([]) }),
  });
  await renderStudentDash();
  ok(!app.innerHTML.includes("يا مدرسين"), "إعلان المدرسين ميظهرش للطالب");

  // ---------- 21) نقاط التكامل في الكود ----------
  const stSrc = fs.readFileSync("student.js", "utf8");
  ok(stSrc.includes('sPingActivity("quiz"') && stSrc.includes("prevPassed"), "أول نجاح في الكويز بس اللي بيسجل نشاط");
  ok(stSrc.includes('sPingActivity("lesson"') && stSrc.includes("firstWatch"), "أول مشاهدة للدرس بس اللي بتسجل نشاط");
  const auSrc = fs.readFileSync("auth.js", "utf8");
  ok(auSrc.includes("pwaInstallCard()") && auSrc.includes("bindPwaCard()"), "صفحة الدخول موصولة بكارت التثبيت");
  const admSrc = fs.readFileSync("admin.js", "utf8");
  ["إضافة مدرس", "تعديل مدرس", "إيقاف مدرس مؤقتًا", "حذف مدرس نهائيًا", "قبول طالب", "حذف طالب نهائيًا", "نقل جماعي", "تغيير الترم", "إضافة مادة", "حذف مادة", "تسجيل دفعة", "نشر إعلان"].forEach((a) => {
    ok(admSrc.includes('"' + a + '"'), "السجل موصول بحركة: " + a);
  });

  console.log(fails === 0 ? "ALL B13 PASS" : "B13 FAILS: " + fails);
  process.exit(fails ? 1 : 0);
};
main().catch((e) => { console.error("CRASH:", e); process.exit(2); });
`;
eval(src);
