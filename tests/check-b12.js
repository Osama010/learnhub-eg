const fs = require("fs");
global.window = { addEventListener(){}, scrollTo(){} };
const __store = {};
global.localStorage = { getItem: (k) => (k in __store ? __store[k] : null), setItem: (k, v) => { __store[k] = String(v); }, removeItem: (k) => { delete __store[k]; } };
global.sessionStorage = global.localStorage;
global.app = { innerHTML: "" };
global.__ov = null;
const __els = {};
const mkEl = (id) => ({ id: id || "", style: {}, className: "", innerHTML: "", value: "", disabled: false, textContent: "", checked: false, onclick: null, remove(){}, click(){}, querySelector: () => mkEl(), querySelectorAll: () => [], setAttribute(){}, });
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
    FieldValue: { serverTimestamp: () => null, arrayUnion: (x) => x, arrayRemove: (x) => x },
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

  fbReady = true;

  // ---------- 1) subInfo: منطق حالات الاشتراك ----------
  ok(subInfo({}).status === "free", "subInfo: مدرس قديم من غير subType = مجاني");
  ok(subInfo({ subType: "free" }).status === "free", "subInfo: مجاني صراحة");
  ok(subInfo({ subType: "weird" }).status === "free", "subInfo: نوع غير معروف = مجاني");
  const active = subInfo({ subType: "monthly", subEnd: ts(daysFromNow(100)), subAmount: 200 });
  ok(active.status === "active" && active.daysLeft >= 99 && active.amount === 200, "subInfo: شهري بعيد = نشط + المبلغ");
  ok(active.label === "شهري", "subInfo: تسمية النوع شهري");
  const exp15 = subInfo({ subType: "term", subEnd: ts(daysFromNow(15)) });
  ok(exp15.status === "expiring" && exp15.label === "بالترم", "subInfo: فاضل 15 يوم بالظبط = قرب ينتهي");
  ok(subInfo({ subType: "year", subEnd: ts(daysFromNow(16)) }).status === "active", "subInfo: فاضل 16 يوم = نشط");
  const exp10 = subInfo({ subType: "monthly", subEnd: ts(daysFromNow(10)) });
  ok(exp10.status === "expiring" && exp10.daysLeft === 10, "subInfo: فاضل 10 أيام = قرب ينتهي + العدد");
  ok(subInfo({ subType: "monthly", subEnd: ts(daysFromNow(-1)) }).status === "expired", "subInfo: تاريخ فات = منتهي");
  ok(subInfo({ subType: "monthly" }).status === "active", "subInfo: نوع من غير تاريخ نهاية = من غير انتهاء");
  ok(subInfo({ subType: "monthly", subEnd: "تاريخ بايظ" }).status === "active", "subInfo: تاريخ بايظ = من غير انتهاء");
  ok(subInfo({ subType: "year", subEnd: daysFromNow(30) }).status === "active", "subInfo: subEnd كـ Date عادي يتقبل");
  ok(subInfo({ subType: "term" }).label === "بالترم" && subInfo({ subType: "year" }).label === "سنوي", "subInfo: تسميات بالترم وسنوي");

  // ---------- 2) subChip ----------
  ok(subChip(subInfo({})).includes("مجاني"), "subChip: مجاني");
  ok(subChip(subInfo({ subType: "monthly", subEnd: ts(daysFromNow(-2)) })).includes("منتهي"), "subChip: منتهي");
  ok(subChip(subInfo({ subType: "monthly", subEnd: ts(daysFromNow(10)) })).includes("فاضل 10 يوم"), "subChip: فاضل N يوم");
  ok(subChip(subInfo({ subType: "monthly", subEnd: ts(daysFromNow(90)) })).includes("نشط"), "subChip: نشط");

  // ---------- 3) subEndDefault: الحساب التلقائي ----------
  ok(subEndDefault("monthly", "2026-06-15") === "2026-07-15", "subEndDefault: شهري +شهر");
  ok(subEndDefault("term", "2026-06-15") === "2026-10-15", "subEndDefault: ترم +4 شهور");
  ok(subEndDefault("year", "2026-06-15") === "2027-06-15", "subEndDefault: سنوي +سنة");
  ok(subEndDefault("term", "2026-11-15") === "2027-03-15", "subEndDefault: ترم بيعدي السنة");
  ok(subFmtDate(new Date(2026, 11, 10)) === "10/12/2026", "subFmtDate: تنسيق العرض");

  // ---------- 4) resolveRole: المدرس المنتهي ----------
  let teacherDoc = null;
  fbDb = {
    collection: (col) => ({
      doc: (id) => ({
        get: async () => col === "teachers" && id === "te" && teacherDoc
          ? { exists: true, data: () => teacherDoc }
          : { exists: false, data: () => null },
      }),
    }),
  };
  fbUser = { uid: "te", email: "te@x.com" };
  teacherDoc = { name: "أ/ محمد", active: true, subType: "monthly", subEnd: ts(daysFromNow(-3)) };
  await resolveRole(fbUser);
  ok(fbRole === "teacherSubExpired", "resolveRole: مدرس منتهي الاشتراك = teacherSubExpired");
  ok(fbProfile.name === "أ/ محمد", "resolveRole: الملف بيتحمل حتى مع الانتهاء");
  teacherDoc = { name: "أ/ محمد", active: true, subType: "monthly", subEnd: ts(daysFromNow(60)) };
  await resolveRole(fbUser);
  ok(fbRole === "teacher", "resolveRole: اشتراك ساري = teacher");
  teacherDoc = { name: "أ/ محمد", active: true };
  await resolveRole(fbUser);
  ok(fbRole === "teacher", "resolveRole: مدرس قديم من غير اشتراك = teacher");
  teacherDoc = { name: "أ/ محمد", active: true, subType: "term", subEnd: ts(daysFromNow(10)) };
  await resolveRole(fbUser);
  ok(fbRole === "teacher", "resolveRole: قرب ينتهي لسه يدخل = teacher");

  // ---------- 5) شاشة انتهاء الاشتراك ----------
  fbRole = "teacherSubExpired";
  fbProfile = { name: "أ/ محمد", subType: "monthly", subEnd: ts(new Date(2026, 10, 20)) };
  location.hash = "#/teacher";
  route();
  ok(app.innerHTML.includes("اشتراكك في المنصة انتهى"), "route: شاشة انتهاء الاشتراك بتظهر");
  ok(app.innerHTML.includes("20/11/2026"), "الشاشة فيها تاريخ الانتهاء");
  ok(app.innerHTML.includes("إدارة المنصة"), "الشاشة بتوجه للأدمن");
  ok(typeof document.getElementById("so").onclick === "function", "زرار الخروج متوصل");

  // ---------- 6) فورم المدرس: قسم الاشتراك ----------
  fbRole = "admin"; fbProfile = null;
  location.hash = "#/admin/teachers";
  adminCache = { teachers: [
    { id: "t1", name: "أ/ محمد", email: "m@x.com", subject: "رياضيات", stages: ["ابتدائي"], active: true, subType: "term", subAmount: 500, subStart: ts(new Date(2026, 8, 1)), subEnd: ts(daysFromNow(100)) },
    { id: "t2", name: "أ/ سارة", email: "s@x.com", subject: "علوم", stages: ["إعدادي"], active: true },
  ], students: [], subjects: [{ name: "رياضيات", stage: "ابتدائي" }], admins: [], library: [] };
  editingTeacherId = null;
  document.getElementById("ta-subtype").value = "free"; // في المتصفح الحقيقي الـ selected بيخلي القيمة free
  adminTeachers();
  ok(app.innerHTML.includes('id="ta-subtype"') && app.innerHTML.includes('id="ta-subamount"') && app.innerHTML.includes('id="ta-substart"') && app.innerHTML.includes('id="ta-subend"'), "الفورم فيه حقول الاشتراك الأربعة");
  ok(document.getElementById("ta-substart").disabled === true, "إضافة جديدة: تواريخ الاشتراك معطلة والنوع مجاني");
  ok(app.innerHTML.includes("الاشتراك</th>") || app.innerHTML.includes("الاشتراك"), "جدول المدرسين فيه عمود الاشتراك");
  ok(app.innerHTML.includes("مجاني"), "مدرس قديم يظهر مجاني في الجدول");
  ok(app.innerHTML.includes("بالترم") && app.innerHTML.includes("لحد"), "اشتراك المدرس يظهر بنوعه وتاريخه في الجدول");

  // وضع التعديل: القيم بتتملى
  editingTeacherId = "t1";
  document.getElementById("ta-subtype").value = "term";
  adminTeachers();
  ok(document.getElementById("ta-subtype").disabled !== true, "تعديل مدرس مشترك: الحقول مفعّلة");
  ok(app.innerHTML.includes('value="500"'), "تعديل: المبلغ بيتملى في الفورم");
  ok(app.innerHTML.includes('value="' + subDateStr(subInfo(adminCache.teachers[0]).end) + '"'), "تعديل: تاريخ النهاية بيتملى صح في الفورم");
  document.getElementById("ta-substart").value = "2026-09-01";
  document.getElementById("ta-subend").value = "2027-01-01";

  // الحساب التلقائي عند تغيير النوع أو البداية
  const typeSel = document.getElementById("ta-subtype");
  typeSel.value = "monthly";
  typeSel.onchange();
  ok(document.getElementById("ta-subend").value === subEndDefault("monthly", document.getElementById("ta-substart").value), "تغيير النوع لشهري يحسب النهاية +شهر");
  const startInp = document.getElementById("ta-substart");
  startInp.value = "2026-01-10";
  startInp.onchange();
  ok(document.getElementById("ta-subend").value === "2026-02-10", "تغيير البداية يعيد حساب النهاية");
  typeSel.value = "free";
  typeSel.onchange();
  ok(document.getElementById("ta-substart").disabled === true && document.getElementById("ta-subend").value === "", "الرجوع لمجاني يعطّل ويفضّي التواريخ");

  // ---------- 7) الحفظ: التحقق + كتابة الحقول ----------
  const fillForm = () => {
    document.getElementById("ta-name").value = "أ/ محمد"; document.getElementById("ta-subject").value = "رياضيات";
    document.getElementById("ta-email").value = "m@x.com"; document.getElementById("ta-phone").value = "0100";
    __qsa[".ta-stage:checked"] = [{ value: "ابتدائي" }];
  };
  fillForm();
  document.getElementById("ta-subtype").value = "term"; document.getElementById("ta-subamount").value = "500";
  document.getElementById("ta-substart").value = "2026-09-01"; document.getElementById("ta-subend").value = "";
  document.getElementById("ta-msg").textContent = "";
  await adminSaveTeacher();
  ok(document.getElementById("ta-msg").textContent.includes("بداية ونهاية"), "الحفظ يرفض نوع مدفوع من غير تواريخ");
  document.getElementById("ta-substart").value = "2026-09-01"; document.getElementById("ta-subend").value = "2026-08-01";
  document.getElementById("ta-msg").textContent = "";
  await adminSaveTeacher();
  ok(document.getElementById("ta-msg").textContent.includes("بعد البداية"), "الحفظ يرفض نهاية قبل البداية");

  // حفظ ناجح في وضع التعديل: الحقول بتتكتب كـ Timestamp وبتتعكس للنسخة العامة
  const ops = [];
  fbDb = {
    collection: (c) => ({ doc: (id) => c + "/" + id }),
    batch: () => ({ update(r, d) { ops.push({ op: "u", r, d }); }, set(r, d) { ops.push({ op: "s", r, d }); }, async commit() {} }),
  };
  const realLoad = adminLoad;
  adminLoad = async () => {};
  document.getElementById("ta-subtype").value = "term"; document.getElementById("ta-subamount").value = "500";
  document.getElementById("ta-substart").value = "2026-09-01"; document.getElementById("ta-subend").value = "2027-01-01";
  await adminSaveTeacher();
  const tUpd = ops.find((o) => o.r === "teachers/t1");
  const pUpd = ops.find((o) => o.r === "teachersPublic/t1");
  ok(tUpd && tUpd.d.subType === "term" && tUpd.d.subAmount === 500, "الحفظ: النوع والمبلغ في سجل المدرس");
  ok(tUpd && tUpd.d.subEnd instanceof Date && tUpd.d.subEnd.getHours() === 23, "الحفظ: النهاية Timestamp لآخر اليوم");
  ok(pUpd && pUpd.d.subType === "term" && pUpd.d.subEnd instanceof Date && !("subAmount" in pUpd.d), "الحفظ: النسخة العامة فيها النوع والنهاية من غير المبلغ");
  adminLoad = realLoad;
  editingTeacherId = null;

  // ---------- 8) لوحة الأدمن: كارت الاشتراكات ----------
  adminCache.teachers = [
    { id: "t1", name: "أ/ محمد", subType: "monthly", subAmount: 200, subEnd: ts(daysFromNow(10)) },
    { id: "t2", name: "أ/ سارة", subType: "year", subAmount: 2000, subEnd: ts(daysFromNow(-5)) },
    { id: "t3", name: "أ/ خالد" },
    { id: "t4", name: "أ/ منى", subType: "term", subAmount: 600, subEnd: ts(daysFromNow(90)) },
  ];
  adminStats();
  ok(app.innerHTML.includes("اشتراكات المدرسين"), "اللوحة فيها كارت الاشتراكات");
  ok((app.innerHTML.match(/data-subren=/g) || []).length === 2, "زرار تجديد للقريب والمنتهي بس");
  ok(app.innerHTML.includes("أ/ محمد") && app.innerHTML.includes("أ/ سارة"), "جدول المتابعة فيه الاتنين");
  ok(!app.innerHTML.includes('data-subren="t3"') && !app.innerHTML.includes('data-subren="t4"'), "المجاني والنشط البعيد مش في جدول المتابعة");
  const renBtn = mkEl(); renBtn.dataset = { subren: "t2" };
  let navHash = null;
  const realHash = Object.getOwnPropertyDescriptor(global.location, "hash");
  Object.defineProperty(global.location, "hash", { get: () => "#/admin", set: (v) => { navHash = v; }, configurable: true });
  __qsa["[data-subren]"] = [renBtn];
  adminStats();
  renBtn.onclick();
  ok(editingTeacherId === "t2" && navHash === "#/admin/teachers", "زرار التجديد يفتح فورم المدرس في تاب المدرسين");
  Object.defineProperty(global.location, "hash", realHash);
  editingTeacherId = null;

  // ---------- 9) تقرير المدرسين: أعمدة وفلتر الاشتراك ----------
  reportState = { type: "teachers", teacher: "", status: "", grade: "", stage: "", kind: "", q: "", from: "", to: "", sub: "" };
  let rep = buildReport();
  ok(rep.columns.includes("الاشتراك") && rep.columns.includes("مبلغ الاشتراك") && rep.columns.includes("نهاية الاشتراك") && rep.columns.includes("حالة الاشتراك"), "التقرير فيه أعمدة الاشتراك الأربعة");
  const rowKhaled = rep.rows.find((r) => r[0] === "أ/ خالد");
  ok(rowKhaled && rowKhaled[8] === "مجاني" && rowKhaled[9] === "—", "تقرير: المجاني بدون مبلغ");
  const rowSara = rep.rows.find((r) => r[0] === "أ/ سارة");
  ok(rowSara && rowSara[8] === "سنوي" && rowSara[9] === "2000" && rowSara[11] === "منتهي", "تقرير: النوع والمبلغ وحالة منتهي");
  reportState.sub = "expired";
  rep = buildReport();
  ok(rep.rows.length === 1 && rep.rows[0][0] === "أ/ سارة", "فلتر الاشتراك المنتهي بيجيب المنتهي بس");
  ok(rep.filtersDesc.some((d) => d.includes("الاشتراك")), "وصف الفلاتر فيه حالة الاشتراك");
  reportState.sub = "free";
  rep = buildReport();
  ok(rep.rows.length === 1 && rep.rows[0][0] === "أ/ خالد", "فلتر المجاني");
  reportState.sub = "expiring";
  rep = buildReport();
  ok(rep.rows.length === 1 && rep.rows[0][0] === "أ/ محمد", "فلتر قرب ينتهي");

  // ---------- 10) بانر المدرس في لوحته ----------
  teacherLoad = async () => {};
  teacherCache = [];
  fbRole = "teacher";
  fbProfile = { id: "t1", name: "أ/ محمد", subType: "monthly", subEnd: ts(daysFromNow(10)) };
  location.hash = "#/teacher";
  await renderTeacherDash();
  ok(app.innerHTML.includes("اشتراكك قرب ينتهي") && app.innerHTML.includes("فاضل"), "بانر قرب الانتهاء يظهر للمدرس");
  fbProfile = { id: "t1", name: "أ/ محمد" };
  await renderTeacherDash();
  ok(!app.innerHTML.includes("اشتراكك قرب ينتهي"), "المدرس المجاني من غير بانر");
  fbProfile = { id: "t1", name: "أ/ محمد", subType: "year", subEnd: ts(daysFromNow(200)) };
  await renderTeacherDash();
  ok(!app.innerHTML.includes("اشتراكك قرب ينتهي"), "الاشتراك البعيد من غير بانر");

  console.log(fails ? "FAILURES: " + fails : "ALL PASS");
  process.exit(fails ? 1 : 0);
};
main().catch((e) => { console.error(e); process.exit(1); });
`;
eval(src);
