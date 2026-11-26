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
global.mkEl = mkEl;
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

  fbReady = true;

  // ---- باغ 1: زرار "رجوع لصفحة الدخول" في شاشة أول دخول ----
  let loginRendered = 0;
  const realRenderLogin = renderLogin;
  renderLogin = () => { loginRendered++; };
  renderFirstLogin("stud@x.com");
  const backBtn = document.getElementById("fl-back");
  ok(app.innerHTML.includes('id="fl-back"'), "first-login back link has an id");
  ok(typeof backBtn.onclick === "function", "back link is wired");
  let prevented = false;
  backBtn.onclick({ preventDefault: () => { prevented = true; } });
  ok(prevented, "back link prevents the dead hash navigation");
  ok(loginRendered === 1, "back link renders the login screen directly");
  renderLogin = realRenderLogin;

  // ---- باغ 2: فهرس التسجيل بيتنضّف بعد الربط ----
  // 2أ) أول دخول ناجح → الفهرس يتنضّف
  const docs = {};
  const updates = [];
  fbDb = {
    collection: (col) => ({
      doc: (id) => ({
        get: async () => { const d = docs[col + "/" + id]; return { exists: !!d, data: () => d }; },
        set: async (data) => { docs[col + "/" + id] = data; },
        update: async (data) => { updates.push({ k: col + "/" + id, data }); docs[col + "/" + id] = { ...(docs[col + "/" + id] || {}), ...data }; },
        delete: async () => { delete docs[col + "/" + id]; },
      }),
    }),
  };
  const pin = "123456";
  const pinHash = await sha256Hex("fresh@x.com:" + pin);
  docs["registrationLookup/fresh@x.com"] = { pinHash, saltEmail: "fresh@x.com", status: "approved", studentId: "oldDoc", teacherIds: ["t1"] };
  docs["students/oldDoc"] = { name: "طالب", email: "fresh@x.com", status: "approved", teacherIds: ["t1"] };
  fbAuth = { createUserWithEmailAndPassword: async () => ({ user: { uid: "uidF", email: "fresh@x.com", sendEmailVerification: async () => {} } }) };
  updates.length = 0;
  await studentFirstLogin("fresh@x.com", pin, "newpass123");
  ok(updates.some((u) => u.k === "registrationLookup/fresh@x.com" && u.data.pinHash === "" && u.data.authLinked === true), "first login clears lookup pinHash + marks authLinked");

  // 2ب) الربط الذاتي الناجح → الفهرس يتنضّف
  docs["registrationLookup/re@x.com"] = { pinHash, saltEmail: "re@x.com", status: "approved", studentId: "oldRe", teacherIds: ["t1"] };
  docs["students/oldRe"] = { name: "طالب", email: "re@x.com", status: "approved", teacherIds: ["t1"] };
  updates.length = 0;
  const rel = await tryRelinkStudent("re@x.com", { uid: "uidRe", email: "re@x.com" });
  ok(rel.ok === true, "relink still succeeds");
  ok(updates.some((u) => u.k === "registrationLookup/re@x.com" && u.data.pinHash === ""), "relink clears lookup pinHash");

  // 2ب2) فشل تنضيف الفهرس ميعطلش الربط
  const fbDbBroken = fbDb;
  fbDb = {
    collection: (col) => ({
      doc: (id) => ({
        get: async () => { const d = docs[col + "/" + id]; return { exists: !!d, data: () => d }; },
        set: async (data) => { docs[col + "/" + id] = data; },
        update: async () => { throw new Error("permission-denied"); },
        delete: async () => { delete docs[col + "/" + id]; },
      }),
    }),
  };
  docs["registrationLookup/re2@x.com"] = { pinHash, saltEmail: "re2@x.com", status: "approved", studentId: "oldRe2", teacherIds: ["t1"] };
  docs["students/oldRe2"] = { name: "طالب", email: "re2@x.com", status: "approved", teacherIds: ["t1"] };
  const rel2 = await tryRelinkStudent("re2@x.com", { uid: "uidRe2", email: "re2@x.com" });
  ok(rel2.ok === true, "lookup cleanup failure does not break relink");
  fbDb = fbDbBroken;

  // 2ج) دخول ناجح لطالب قديم فهرسه لسه متسخ → بيتنضّف (إصلاح ذاتي)
  let signOutCount = 0;
  fbAuth = {
    signInWithEmailAndPassword: async () => { fbUser = { uid: "uOld", email: "old@x.com", emailVerified: true }; return { user: fbUser }; },
    signOut: async () => { signOutCount++; },
  };
  docs["registrationLookup/old@x.com"] = { pinHash, saltEmail: "old@x.com", status: "approved", studentId: "uOld", teacherIds: ["t1"] };
  docs["students/uOld"] = { name: "قديم", email: "old@x.com", status: "approved", teacherIds: ["t1"] };
  __els["li-email"] = mkEl("li-email"); __els["li-email"].value = "old@x.com";
  __els["li-pass"] = mkEl("li-pass"); __els["li-pass"].value = "correct-pass";
  __els["login-msg"] = mkEl("login-msg");
  updates.length = 0;
  let homeRendered = 0;
  renderStudentHome = () => { homeRendered++; };
  await doLogin("student");
  ok(updates.some((u) => u.k === "registrationLookup/old@x.com" && u.data.pinHash === ""), "successful student login self-heals a dirty lookup");
  route(); // في المتصفح hashchange بيعمل ده تلقائياً بعد ما routeByRole يغير الهاش
  ok(location.hash === "#/student/analytics", "successful student login lands on analytics");
  ok(signOutCount === 0, "no signOut on successful student login");

  // 2د) طالب مربوط (فهرس نضيف) كتب باسورد غلط → رسالة غلط عادية، مش شاشة تسجيل
  let firstLoginShown = 0;
  const realFirst = renderFirstLogin;
  renderFirstLogin = () => { firstLoginShown++; };
  fbAuth = { signInWithEmailAndPassword: async () => { const e = new Error("wrong"); e.code = "auth/invalid-credential"; throw e; }, signOut: async () => {} };
  docs["registrationLookup/old@x.com"] = { pinHash: "", saltEmail: "old@x.com", status: "approved", studentId: "uOld", teacherIds: ["t1"], authLinked: true };
  await doLogin("student");
  ok(firstLoginShown === 0, "linked student with wrong password never sees the registration screen");
  ok(__els["login-msg"].textContent.length > 0, "wrong password shows a normal error message");

  // 2هـ) طالب جديد فعلاً (فهرس فيه رقم سري) → شاشة أول دخول تظهر عادي
  docs["registrationLookup/new@x.com"] = { pinHash, saltEmail: "new@x.com", status: "approved", studentId: "sNew", teacherIds: ["t1"] };
  __els["li-email"].value = "new@x.com";
  await doLogin("student");
  ok(firstLoginShown === 1, "genuinely new approved student still gets the first-login screen");

  // 2و) طالب موقوف بالباسورد الصح → رسالة الإيقاف، مش شاشة تسجيل ولا دخول
  firstLoginShown = 0;
  homeRendered = 0;
  signOutCount = 0;
  fbAuth = {
    signInWithEmailAndPassword: async () => ({ user: { uid: "uSus", email: "sus@x.com" } }),
    signOut: async () => { signOutCount++; },
  };
  docs["registrationLookup/sus@x.com"] = { pinHash: "", saltEmail: "sus@x.com", status: "suspended", studentId: "uSus", teacherIds: ["t1"] };
  docs["students/uSus"] = { name: "موقوف", email: "sus@x.com", status: "suspended", teacherIds: ["t1"] };
  __els["li-email"].value = "sus@x.com";
  await doLogin("student");
  ok(firstLoginShown === 0, "suspended student never sees the registration screen");
  ok(homeRendered === 0, "suspended student does not enter");
  ok(signOutCount === 1, "suspended student session is closed");
  ok(__els["login-msg"].textContent.includes("متوقف"), "suspended student sees the suspended notice");

  // 2ز) طالب موقوف كتب باسورد غلط → رسالة غلط عادية، مش شاشة تسجيل
  fbAuth = { signInWithEmailAndPassword: async () => { const e = new Error("wrong"); e.code = "auth/invalid-credential"; throw e; }, signOut: async () => {} };
  __els["login-msg"].textContent = "";
  await doLogin("student");
  ok(firstLoginShown === 0, "suspended student with wrong password never sees registration");
  ok(__els["login-msg"].textContent.length > 0 && !__els["login-msg"].textContent.includes("متوقف"), "suspended + wrong password shows generic error");
  renderFirstLogin = realFirst;

  console.log(fails === 0 ? "ALL_B10_OK" : "B10_FAILS:" + fails);
  process.exit(fails === 0 ? 0 : 1);
};
main();
`;
eval.call(global, src);
