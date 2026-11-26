// check-b11: فلتر المدرس في النقل الجماعي + إخفاء لينك التسجيل عن أدمن/مدرس + زرار الثيم في شاشات ما قبل الدخول
const fs = require("fs");
global.window = { innerWidth: 900, scrollTo: () => {}, addEventListener: () => {}, matchMedia: () => ({ matches: false, addEventListener: () => {} }) };
global.localStorage = { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; } };
global.location = { hash: "#/login" };
global.history = { replaceState: () => {} };
global.app = { innerHTML: "" };
const __els = {}; global.__els = __els;
const mkEl = (id) => ({ id, value: "", textContent: "", innerHTML: "", style: {}, dataset: {}, checked: false, disabled: false,
  classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, onclick: null, onchange: null, focus(){}, remove(){}, appendChild(){}, querySelector: () => mkEl("q"), querySelectorAll: () => [] });
global.mkEl = mkEl;
const __attrs = {}; global.__attrs = __attrs;
global.document = {
  documentElement: { setAttribute: (k, v) => { __attrs[k] = v; }, getAttribute: (k) => __attrs[k] || "" },
  body: { appendChild(){}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false } },
  addEventListener(){}, createElement: () => mkEl(),
  getElementById: (id) => id === "app" ? global.app : (__els[id] || (__els[id] = mkEl(id))),
  querySelector: () => null, querySelectorAll: () => [],
};
global.navigator = { onLine: true, language: "ar" };
global.showToast = () => {}; global.confirm = () => true; global.alert = () => {};
global.fetch = async () => ({ ok: false, json: async () => ({}) });
global.firebase = {
  initializeApp: () => ({}),
  auth: () => ({ languageCode: "", onAuthStateChanged(){} }),
  firestore: Object.assign(() => ({}), {
    FieldPath: { documentId: () => "__id__" },
    FieldValue: { serverTimestamp: () => null, arrayUnion: (x) => x, arrayRemove: (x) => x },
    Timestamp: { fromDate: (d) => d },
  }),
};
global.ADMIN_EMAIL = "osamaasas0@gmail.com";
global.FIREBASE_CONFIG = {};
if (typeof crypto === "undefined") global.crypto = require("crypto").webcrypto;

const src = ["auth.js", "admin.js", "teacher.js", "student.js", "app.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n;\n") + `
const main = async () => {
  let fails = 0;
  const ok = (cond, name) => { if (cond) console.log("ok:", name); else { fails++; console.log("FAIL:", name); } };
  fbReady = true;

  // ==== ١) لينك تسجيل الطالب: طالب بس ====
  loginRole = "admin";
  renderLogin();
  let html = app.innerHTML + __els["login-form"].innerHTML;
  ok(!html.includes("سجّل حسابك من هنا"), "admin role: no student signup link");
  ok(app.innerHTML.includes("data-themebtn"), "login screen has a theme button (admin)");

  loginRole = "teacher";
  renderLogin();
  html = app.innerHTML + __els["login-form"].innerHTML;
  ok(!html.includes("سجّل حسابك من هنا"), "teacher role: no student signup link");

  loginRole = "student";
  renderLogin();
  html = app.innerHTML + __els["login-form"].innerHTML;
  ok(html.includes("سجّل حسابك من هنا"), "student role: signup link present");
  ok(__els["login-form"].innerHTML.includes("سجّل حسابك من هنا"), "signup link lives inside the per-role form");
  ok(app.innerHTML.includes('u-posifixed-top14px-left14px'), "theme button is fixed top-left");

  // ==== ٢) زرار الثيم في شاشات ما قبل الدخول ====
  renderVerifyGate("", false);
  ok(app.innerHTML.includes("data-themebtn"), "verify-email screen has a theme button");
  await renderRegister();
  ok(app.innerHTML.includes("data-themebtn"), "register screen has a theme button");

  // themeCycle بيلف: auto → light → dark → auto وبيطبّق على الصفحة
  localStorage.removeItem("stTheme");
  ok(themeIcon() === "🌓", "theme starts auto");
  themeCycle();
  ok(localStorage.getItem("stTheme") === "light" && __attrs["data-theme"] === "light", "cycle 1 → light applied");
  themeCycle();
  ok(localStorage.getItem("stTheme") === "dark" && __attrs["data-theme"] === "dark", "cycle 2 → dark applied");
  themeCycle();
  ok(localStorage.getItem("stTheme") === "auto", "cycle 3 → back to auto");

  // ==== ٣) فلتر المدرس في النقل الجماعي (أدمن) ====
  const T1 = { id: "t1", name: "محمد أحمد" }, T2 = { id: "t2", name: "سارة علي" };
  const S = [
    { id: "s1", name: "طالب ١", status: "approved", grade: GRADES[0], teacherIds: ["t1"], parentPhone: "0101" },
    { id: "s2", name: "طالب ٢", status: "approved", grade: GRADES[0], teacherIds: ["t2"], parentPhone: "0102" },
    { id: "s3", name: "طالب مشترك", status: "approved", grade: GRADES[0], teacherIds: ["t1", "t2"], parentPhone: "0103" },
    { id: "s4", name: "طالب صف تاني", status: "approved", grade: GRADES[1], teacherIds: ["t1"], parentPhone: "0104" },
    { id: "s5", name: "طالب تحت المراجعة", status: "pending", grade: GRADES[0], teacherIds: ["t1"], parentPhone: "0105" },
  ];
  const cfgAdmin = { students: S, teachers: [T1, T2], wrap: (c) => { app.innerHTML = c; }, backHash: "#/admin/students", onDone: async () => {} };
  transferState.from = GRADES[0]; transferState.to = GRADES[1]; transferState.picked = {}; transferState.teacher = "";
  renderTransferPage(cfgAdmin);
  ok(app.innerHTML.includes('id="tr-teacher"'), "admin transfer: teacher filter select rendered");
  ok(app.innerHTML.includes("<th>المدرس</th>"), "admin transfer: teacher column rendered");
  ok(app.innerHTML.includes("محمد أحمد، سارة علي"), "shared student shows both teacher names");
  ok(app.innerHTML.includes("طالب ١") && app.innerHTML.includes("طالب ٢") && app.innerHTML.includes("طالب مشترك"), "no filter: all grade students listed");
  ok(!app.innerHTML.includes("طالب صف تاني"), "other grade hidden");
  ok(!app.innerHTML.includes("طالب تحت المراجعة"), "pending student hidden");

  // فلترة بمدرس t1
  transferState.teacher = "t1";
  renderTransferPage(cfgAdmin);
  ok(app.innerHTML.includes("طالب ١") && app.innerHTML.includes("طالب مشترك"), "t1 filter: his students shown");
  ok(!app.innerHTML.includes("طالب ٢"), "t1 filter: other teacher's student hidden");
  ok(app.innerHTML.includes("لـ«محمد أحمد»"), "title names the filtered teacher");

  // تحديد الكل يحدد المعروضين بس
  __els["tr-all"].checked = true;
  __els["tr-all"].onchange();
  ok(transferState.picked["s1"] === true && transferState.picked["s3"] === true, "select-all picks filtered students");
  ok(!transferState.picked["s2"], "select-all does not touch hidden students");

  // فلترة بمدرس t2: الطالب المشترك يظهر برضه
  transferState.picked = {}; transferState.teacher = "t2";
  renderTransferPage(cfgAdmin);
  ok(app.innerHTML.includes("طالب مشترك") && app.innerHTML.includes("طالب ٢") && !app.innerHTML.includes("طالب ١"), "t2 filter: shared student appears, t1-only hidden");

  // مدرس اتشال من القايمة → الفلتر بيترست
  transferState.teacher = "ghost";
  renderTransferPage(cfgAdmin);
  ok(transferState.teacher === "", "stale teacher filter resets");

  // صفحة المدرس: من غير teachers — مفيش فلتر ولا عمود
  const cfgTeacher = { students: S.filter((s) => (s.teacherIds || []).includes("t1")), wrap: (c) => { app.innerHTML = c; }, backHash: "#/teacher", onDone: async () => {} };
  transferState.teacher = "";
  renderTransferPage(cfgTeacher);
  ok(!app.innerHTML.includes('id="tr-teacher"'), "teacher transfer: no teacher filter");
  ok(!app.innerHTML.includes("<th>المدرس</th>"), "teacher transfer: no teacher column");

  console.log(fails === 0 ? "ALL PASS" : fails + " FAILURES");
  process.exit(fails === 0 ? 0 : 1);
};
main();
`;
(0, eval)(src);
