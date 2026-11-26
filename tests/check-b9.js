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
global.FIREBASE_CONFIG = {};
if (typeof crypto === "undefined") global.crypto = require("crypto").webcrypto;
const src = ["auth.js", "admin.js", "teacher.js", "student.js", "app.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n;\n") + `
const main = async () => {
  let fails = 0;
  const ok = (cond, name) => { if (cond) console.log("ok:", name); else { fails++; console.log("FAIL:", name); } };

  // سبايز للراوتر
  let routedTo = "";
  renderStudentHome = () => { routedTo = "studentHome"; };
  renderTeacherDash = () => { routedTo = "teacherDash"; };
  renderAdmin = () => { routedTo = "admin"; };
  renderLogin = () => { routedTo = "login"; };

  // 1) needsEmailVerify: طالب جديد (علامة + مش مفعّل) → محتاج بوابة
  fbReady = true;
  fbUser = { uid: "s1", email: "new@x.com", emailVerified: false, reload: async () => {}, sendEmailVerification: async () => {} };
  fbRole = "student"; fbProfile = { id: "s1", emailVerifyRequired: true };
  ok(needsEmailVerify() === true, "flagged unverified student needs gate");

  // 2) طالب قديم (مفيش علامة) ومش مفعّل → يدخل عادي
  fbProfile = { id: "s1" };
  ok(needsEmailVerify() === false, "old student (no flag) unverified passes");

  // 3) طالب جديد لكن مفعّل → يدخل
  fbProfile = { id: "s1", emailVerifyRequired: true };
  fbUser.emailVerified = true;
  ok(needsEmailVerify() === false, "flagged but verified student passes");
  fbUser.emailVerified = false;

  // 4) الأدمن أبداً مش محجوب
  fbRole = "admin"; fbProfile = { id: "a" };
  ok(needsEmailVerify() === false, "admin never gated");

  // 5) route(): طالب جديد غير مفعّل على #/student → البوابة تظهر بدل الهوم
  fbRole = "student"; fbProfile = { id: "s1", emailVerifyRequired: true };
  location.hash = "#/student"; routedTo = "";
  route();
  ok(routedTo === "" && app.innerHTML.includes("فعّل إيميلك الأول"), "gate blocks flagged student route");
  ok(app.innerHTML.includes("new@x.com"), "gate shows the account email");
  ok(app.innerHTML.includes("كلّم مدرسك"), "student gate points to teacher for wrong email");

  // 6) route(): طالب قديم غير مفعّل → هوم عادي
  fbProfile = { id: "s1" };
  route();
  ok(routedTo === "studentHome", "old unverified student routes home normally");

  // 7) route(): مدرس جديد غير مفعّل → بوابة بنص المدرس
  fbRole = "teacher"; fbProfile = { id: "t1", emailVerifyRequired: true };
  location.hash = "#/teacher"; routedTo = "";
  route();
  ok(routedTo === "" && app.innerHTML.includes("فعّل إيميلك الأول"), "gate blocks flagged teacher route");
  ok(app.innerHTML.includes("كلّم الأدمن"), "teacher gate points to admin for wrong email");

  // 8) مدرس قديم (مفيش علامة) → داشبورد عادي
  fbProfile = { id: "t1" };
  route();
  ok(routedTo === "teacherDash", "old unverified teacher routes to dashboard normally");

  // 9) زرار "عملت التفعيل" لسه مش مفعّل → رسالة تاني
  fbRole = "student"; fbProfile = { id: "s1", emailVerifyRequired: true };
  location.hash = "#/student";
  fbUser.reload = async () => {};
  renderVerifyGate();
  const doneBtn = document.getElementById("ev-done");
  ok(typeof doneBtn.onclick === "function", "done button wired");
  await doneBtn.onclick();
  ok(app.innerHTML.includes("لسه ما اتدوسش"), "still unverified shows retry message");

  // 10) بعد ما يتفعّل: reload → يدخل الهوم
  fbUser.reload = async () => { fbUser.emailVerified = true; };
  fbDb = { collection: (c) => ({ doc: (d) => ({ get: async () => c === "students" && d === "s1"
    ? { exists: true, data: () => ({ name: "طالب", email: "new@x.com", status: "approved", teacherIds: ["t1"], emailVerifyRequired: true }) }
    : { exists: false, data: () => null } }) }) };
  renderVerifyGate();
  routedTo = "";
  await document.getElementById("ev-done").onclick();
  ok(routedTo === "studentHome", "verified student enters home after done");

  // 11) إعادة الإرسال: بعت مرة + اتسجل العداد + الرسالة الخضرا ظهرت
  fbUser.emailVerified = false;
  let sentCount = 0;
  fbUser.sendEmailVerification = async () => { sentCount++; };
  renderVerifyGate();
  await document.getElementById("ev-resend").onclick();
  ok(sentCount === 1, "resend sends one verification email");
  ok(app.innerHTML.includes("اتبعت اللينك تاني"), "resend shows green confirmation");
  ok(evCooldownLeft("new@x.com") > 50, "60s cooldown recorded");

  // 12) دوسة تانية جوه العداد → مفيش إرسال إضافي
  await document.getElementById("ev-resend").onclick();
  ok(sentCount === 1, "cooldown blocks immediate second resend");
  if (evTimer) { clearInterval(evTimer); evTimer = null; }

  // 13) أول دخول طالب جديد: علامة التفعيل بتتكتب + الإيميل بيتبعت
  const docs = {};
  fbDb = {
    collection: (col) => ({
      doc: (id) => ({
        get: async () => { const d = docs[col + "/" + id]; return { exists: !!d, data: () => d }; },
        set: async (data) => { docs[col + "/" + id] = data; },
        delete: async () => { delete docs[col + "/" + id]; },
      }),
    }),
  };
  const pin = "123456";
  const pinHash = await sha256Hex("fresh@x.com:" + pin);
  docs["registrationLookup/fresh@x.com"] = { pinHash, saltEmail: "fresh@x.com", status: "approved", studentId: "oldDoc", teacherIds: ["t1"] };
  docs["students/oldDoc"] = { name: "طالب جديد", email: "fresh@x.com", status: "approved", teacherIds: ["t1"] };
  let stuVerifySent = 0;
  fbAuth = { createUserWithEmailAndPassword: async () => ({ user: { uid: "uidFresh", email: "fresh@x.com", sendEmailVerification: async () => { stuVerifySent++; } } }) };
  await studentFirstLogin("fresh@x.com", pin, "newpass123");
  ok(docs["students/uidFresh"] && docs["students/uidFresh"].emailVerifyRequired === true, "first-login writes emailVerifyRequired flag");
  ok(stuVerifySent === 1, "first-login sends verification email");

  // 14) فشل إرسال الإيميل ميعطلش إنشاء الحساب
  fbAuth = { createUserWithEmailAndPassword: async () => ({ user: { uid: "uidF2", email: "fresh@x.com", sendEmailVerification: async () => { throw new Error("quota"); } } }) };
  docs["students/oldDoc"] = { name: "طالب جديد", email: "fresh@x.com", status: "approved", teacherIds: ["t1"] };
  let okFlow = true;
  try { await studentFirstLogin("fresh@x.com", pin, "newpass123"); } catch (e) { okFlow = false; }
  ok(okFlow && docs["students/uidF2"] && docs["students/uidF2"].emailVerifyRequired === true, "email send failure does not break account creation");

  // 15) أول دخول طالب برقم سري غلط → مفيش إيميل بيتبعت
  stuVerifySent = 0;
  fbAuth = { createUserWithEmailAndPassword: async () => ({ user: { uid: "uidF3", sendEmailVerification: async () => { stuVerifySent++; } } }) };
  docs["students/oldDoc"] = { name: "طالب", email: "fresh@x.com", status: "approved", teacherIds: ["t1"] };
  try { await studentFirstLogin("fresh@x.com", "000000", "newpass123"); } catch (e) {}
  ok(stuVerifySent === 0, "wrong pin never sends verification email");

  // 16) الأدمن بيضيف مدرس: لينك التفعيل بيتبعت + العلامة بتتكتب
  __els["ta-name"] = mkEl("ta-name"); __els["ta-name"].value = "أ/ تجربة";
  __els["ta-subject"] = mkEl("ta-subject"); __els["ta-subject"].value = "علوم";
  __els["ta-email"] = mkEl("ta-email"); __els["ta-email"].value = "Teacher@X.com";
  __els["ta-phone"] = mkEl("ta-phone"); __els["ta-phone"].value = "0100";
  __els["ta-pass"] = mkEl("ta-pass"); __els["ta-pass"].value = "temp123";
  __qsa[".ta-stage:checked"] = [{ value: "إعدادي" }];
  let tchVerifySent = 0;
  const batchSets = {};
  global.firebase.initializeApp = () => ({
    auth: () => ({
      createUserWithEmailAndPassword: async () => ({ user: { uid: "uidT", sendEmailVerification: async () => { tchVerifySent++; } } }),
      signOut: async () => {},
    }),
    delete: async () => {},
  });
  fbDb = { batch: () => {
    const ops = [];
    return {
      set: (ref, data) => ops.push({ ref, data }),
      update: (ref, data) => ops.push({ ref, data, upd: true }),
      commit: async () => { ops.forEach((o) => { batchSets[o.ref.__k] = o.data; }); },
    };
  }, collection: (col) => ({ doc: (id) => ({ __k: col + "/" + id }) }) };
  editingTeacherId = null; taPhotoData = "";
  const realAdminTeachers = adminTeachers;
  adminLoad = async () => {}; adminTeachers = () => {};
  await adminSaveTeacher();
  ok(tchVerifySent === 1, "admin add-teacher sends verification email");
  ok(batchSets["teachers/uidT"] && batchSets["teachers/uidT"].emailVerifyRequired === true, "new teacher doc carries the flag");
  ok(!("emailVerifyRequired" in (batchSets["teachersPublic/uidT"] || {})), "public teacher copy does not carry the flag");
  ok(__els["ta-msg"].textContent.includes("لينك التفعيل"), "admin success message mentions the verification link");

  // 17) فشل إرسال إيميل المدرس ميعطلش الإضافة
  tchVerifySent = 0;
  global.firebase.initializeApp = () => ({
    auth: () => ({
      createUserWithEmailAndPassword: async () => ({ user: { uid: "uidT2", sendEmailVerification: async () => { throw new Error("quota"); } } }),
      signOut: async () => {},
    }),
    delete: async () => {},
  });
  await adminSaveTeacher();
  ok(batchSets["teachers/uidT2"] && batchSets["teachers/uidT2"].emailVerifyRequired === true, "teacher added even when verification email fails");

  // 18) فورم إضافة مدرس فيه ملحوظة لينك التفعيل (والتعديل مفيهاش)
  fbRole = "admin"; fbUser = { uid: "adm", email: "osamaasas0@gmail.com" };
  adminPinOk = () => true;
  adminCache = { teachers: [], subjects: [{ name: "علوم", stage: "إعدادي" }], students: [], admins: [], library: [] };
  editingTeacherId = null; taPhotoData = "";
  adminTeachers = realAdminTeachers;
  adminTeachers();
  ok(app.innerHTML.includes("لينك تفعيل على إيميله"), "add-teacher form shows the verification note");
  ok(app.innerHTML.includes("فيه إيميل تفعيل") === false, "form does not leak odd text");

  console.log(fails === 0 ? "ALL_B9_OK" : "B9_FAILS:" + fails);
  process.exit(fails === 0 ? 0 : 1);
};
main();
`;
eval.call(global, src);
