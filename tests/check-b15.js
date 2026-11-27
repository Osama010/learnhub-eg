const fs = require("fs");
global.window = { addEventListener(){}, scrollTo(){} };
const WIN0 = global.window;
const __store = {};
global.localStorage = { getItem: (k) => (k in __store ? __store[k] : null), setItem: (k, v) => { __store[k] = String(v); }, removeItem: (k) => { delete __store[k]; } };
global.sessionStorage = global.localStorage;
global.app = { innerHTML: "", querySelectorAll: () => [] };
global.__ov = null;
const __els = {};
const mkEl = (id) => ({ id: id || "", style: {}, dataset: {}, className: "", innerHTML: "", value: "", disabled: false, textContent: "", checked: false, files: [], onclick: null, onchange: null, oninput: null, remove(){}, click(){}, querySelector: () => mkEl(), querySelectorAll: () => [], setAttribute(){}, });
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
Object.defineProperty(globalThis, "navigator", { value: { userAgent: "Mozilla/5.0" }, configurable: true });
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

const mk = (portal, files) => {
  global.window = Object.assign({}, WIN0, portal ? { T4K_PORTAL: portal, T4K_BASE: "../" } : {});
  const code = ["auth.js", ...files, "app.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n;\n");
  return new Function("fs", code + `
    return { route, renderLanding, renderLogin, renderWrongPortal, t4kCountUp, studentTeachersCardHtml: typeof studentTeachersCardHtml === "function" ? studentTeachersCardHtml : null, bindStudentTeachers: typeof bindStudentTeachers === "function" ? bindStudentTeachers : null, teacherAnswerAddReq: typeof teacherAnswerAddReq === "function" ? teacherAnswerAddReq : null,
      setState: (o) => { if ("user" in o) fbUser = o.user; if ("role" in o) fbRole = o.role; if ("ready" in o) fbReady = o.ready; if ("db" in o) fbDb = o.db; if ("profile" in o) fbProfile = o.profile; },
      setReqs: (r) => { if (typeof teacherAddReqs !== "undefined") teacherAddReqs = r; } };`)(fs);
};
let fails = 0;
const ok = (c, n) => { if (c) console.log("ok:", n); else { fails++; console.log("FAIL:", n); } };
const mkDb = (store, lists, logs) => ({
  collection: (c) => ({
    doc: (id) => ({
      get: async () => (store[c + "/" + id] != null ? { exists: true, data: () => store[c + "/" + id] } : { exists: false, data: () => null }),
      set: async (d) => { logs.push({ op: "set", c, id, d }); },
      update: async (d) => { logs.push({ op: "update", c, id, d }); },
      delete: async () => { logs.push({ op: "delete", c, id }); },
    }),
    where: () => ({ get: async () => ({ docs: (lists[c] || []).map((x) => ({ id: x.id, data: () => { const { id, ...r } = x; return r; } })) }), where: () => ({ get: async () => ({ docs: [] }) }) }),
  }),
  batch: () => { const ops = []; return { update: (ref, d) => ops.push(["update", d]), commit: async () => { logs.push({ op: "batch", ops }); } }; },
});
(async () => {
  // ---- 1) كل حزمة بتتحمّل من غير ReferenceError ----
  let root, st, tc, ad;
  try { root = mk("", ["admin.js", "teacher.js", "student.js"]); ok(true, "الجذر بيتحمّل"); } catch (e) { ok(false, "الجذر: " + e.message); }
  try { st = mk("student", ["student.js"]); ok(true, "بوابة الطالب بتتحمّل (من غير admin/teacher)"); } catch (e) { ok(false, "student: " + e.message); }
  try { tc = mk("teacher", ["teacher.js"]); ok(true, "بوابة المدرس بتتحمّل"); } catch (e) { ok(false, "teacher: " + e.message); }
  try { ad = mk("admin", ["admin.js"]); ok(true, "بوابة الأدمن بتتحمّل"); } catch (e) { ok(false, "admin: " + e.message); }

  // ---- 2) صفحة الهبوط ----
  const logs = [];
  const db = mkDb({ "settings/stats": { quizzes: 7, lessons: 321, students: 1500 } }, { teachersPublic: [{ id: "t1", name: "مستر أحمد", subject: "برمجة", avatar: "", active: true, subType: "free" }, { id: "t2", name: "مستر علي", subject: "علوم", active: true }] }, logs);
  global.location = { hash: "" };
  root.setState({ ready: true, user: null, role: null, db });
  await root.route();
  await new Promise((r) => setTimeout(r, 20));
  const h = global.app.innerHTML;
  ok(h.includes("lp-hero") && h.includes("منصة المستر"), "الجذر من غير جلسة بيعرض صفحة الهبوط");
  ok(!h.includes("مستر أحمد") && !h.includes("data-pickt") && !h.includes("مدرسينا") && !h.includes("lp-t "), "مفيش قسم مدرسين في صفحة الهبوط");
  ok(h.includes('id="lp-vid"') && h.includes("muted") && h.includes("autoplay") && h.includes("loop") && h.includes("playsinline") && h.includes('id="lp-snd"') && h.includes("اضغط في أي مكان لتشغيل الصوت"), "الفيديو التعريفي: تشغيل تلقائي صامت + زرار الصوت + التلميح");
  ok(h.includes('href="#/login"') && h.includes("assets/intro.mp4"), "زرار الدخول بيودّي لصفحة الدخول ومصدر الفيديو");
  ok(h.includes('data-count="7"') && h.includes('data-count="321"') && h.includes('data-count="1500"'), "الأرقام من settings/stats");
  ok(h.includes('href="student/"') && h.includes('href="student/#/register"') && h.includes('href="teacher/"'), "روابط الطالب والتسجيل والمدرس");
  ok(!h.includes('href="admin/"') && !h.includes("admin/"), "مفيش لينك أدمن في صفحة الهبوط");
  ok(h.includes("عن المهندس") && h.includes("اسامه حسن عسس"), "قسم عن المهندس موجود");
  global.location = { hash: "#/login" };
  await root.route();
  ok(global.app.innerHTML.includes("rolecards") && !global.app.innerHTML.includes('rolecards" style="display:none'), "الدخول القديم #/login لسه بكروت الأدوار");

  // ---- 3) شاشات الدخول لكل بوابة ----
  const loginOf = async (b, portal) => { global.location = { hash: "" }; b.setState({ ready: true, user: null, role: null, db }); await b.route(); return global.app.innerHTML + (global.__els["login-form"] || {}).innerHTML; };
  const hs = await loginOf(st, "student");
  ok(hs.includes("بوابة الطلاب") && hs.includes("li-email") && hs.includes('href="#/register"') && hs.includes('rolecards" style="display:none;"'), "بوابة الطالب: دخول + إنشاء حساب وكروت الأدوار مخفية");
  const ht = await loginOf(tc, "teacher");
  ok(ht.includes("بوابة المدرسين") && !ht.includes('href="#/register"') && !ht.includes("li-google"), "بوابة المدرس: دخول بس");
  const ha = await loginOf(ad, "admin");
  ok(ha.includes("لوحة الإدارة") && ha.includes("li-google") && !ha.includes('href="#/register"'), "بوابة الأدمن: باسورد + جوجل");
  global.location = { hash: "#/register" };
  tc.setState({ ready: true, user: null });
  await tc.route();
  ok(!global.app.innerHTML.includes("rg-name") && global.app.innerHTML.includes("بوابة المدرسين"), "التسجيل مش متاح في بوابة المدرس");

  // ---- 4) حساب دور غلط ----
  global.location = { hash: "#/student" };
  st.setState({ ready: true, user: { uid: "x", email: "t@x.com" }, role: "teacher", db });
  await st.route();
  ok(global.app.innerHTML.includes("مش حساب طالب") && global.app.innerHTML.includes("wp-out"), "مدرس على بوابة الطلاب: رسالة وخروج");
  ad.setState({ ready: true, user: { uid: "x", email: "s@x.com" }, role: "student", db });
  global.location = { hash: "#/admin" };
  await ad.route();
  ok(global.app.innerHTML.includes("مش حساب أدمن"), "طالب على بوابة الأدمن: رسالة");

  // ---- 5) العدّاد ----
  global.window.matchMedia = () => ({ matches: true });
  const el = { textContent: "0" };
  root.t4kCountUp(el, 1500);
  ok(el.textContent === "1,500+", "تقليل الحركة: الرقم النهائي علطول");
  global.window.matchMedia = () => ({ matches: false });
  global.requestAnimationFrame = (f) => setTimeout(f, 5);
  const el2 = { textContent: "0" };
  root.t4kCountUp(el2, 321);
  await new Promise((r) => setTimeout(r, 2100));
  ok(el2.textContent === "321+", "العدّاد بيوصل للرقم الثابت ويقف");

  // ---- 6) طلب إضافة مدرس ----
  const tr = { pubs: [{ id: "t1", name: "مستر أحمد", stages: ["ثانوي"] }, { id: "t2", name: "مستر علي", subject: "علوم", stages: ["ثانوي"] }, { id: "t3", name: "مستر سعيد", stages: ["ثانوي"] }, { id: "t4", name: "مستر إعدادي", stages: ["إعدادي"] }], reqs: [{ id: "u1_t3", teacherId: "t3", status: "pending" }] };
  const slogs = [];
  st.setState({ ready: true, user: { uid: "u1", email: "s@x.com" }, role: "student", db: mkDb({}, {}, slogs), profile: { name: "طالب", grade: "الصف الأول الثانوي", teacherIds: ["t1"] } });
  const card = st.studentTeachersCardHtml(tr);
  ok(card.includes("مستر أحمد") && card.includes('data-treq="t2"'), "كارت مدرسيني: مدرسي الحاليين + زرار طلب لمدرس جديد");
  ok(card.includes("قيد الانتظار") && card.includes('data-tcancel="u1_t3"'), "طلب معلّق: حالة وزرار إلغاء");
  ok(!card.includes('data-treq="t1"') && !card.includes("مستر إعدادي"), "مدرسي الحالي ومدرس مرحلة تانية مش متاحين للطلب");
  const btn = { dataset: { treq: "t2" }, disabled: false };
  global.__qsa["[data-treq]"] = [btn]; global.__qsa["[data-tcancel]"] = [];
  global.app.innerHTML = "";
  st.bindStudentTeachers();
  await btn.onclick();
  const setLog = slogs.find((l) => l.op === "set");
  ok(setLog && setLog.id === "u1_t2" && setLog.d.status === "pending" && setLog.d.teacherId === "t2" && setLog.d.studentId === "u1" && setLog.d.email === "s@x.com", "الضغط بيبعت طلب بالمعرّف والحقول الصح");
  ok(setLog && Object.keys(setLog.d).sort().join() === "createdAt,email,grade,status,studentId,studentName,teacherId", "حقول الطلب مطابقة للقواعد");
  global.__qsa["[data-treq]"] = []; global.__qsa["[data-tcancel]"] = [];

  // المدرس يقبل
  const tlogs = [];
  tc.setState({ ready: true, user: { uid: "t2", email: "t2@x.com" }, role: "teacher", db: mkDb({}, { students: [] }, tlogs) });
  tc.setReqs([{ id: "u1_t2", studentId: "u1", teacherId: "t2", email: "S@X.com", status: "pending" }]);
  global.alert = (m) => { fails++; console.log("FAIL: alert", m); };
  await tc.teacherAnswerAddReq("u1_t2", true);
  const b = tlogs.find((l) => l.op === "batch");
  ok(b && b.ops.length === 2 && b.ops[0][1].teacherIds === "t2" && b.ops[1][1].status === "accepted", "القبول: arrayUnion للمدرس + الطلب accepted");
  ok(tlogs.some((l) => l.op === "update" && l.c === "registrationLookup" && l.id === "s@x.com" && l.d.teacherIds === "t2"), "القبول بيحدّث الفهرس العام بإيميل صغير");
  const tlogs2 = [];
  tc.setState({ db: mkDb({}, { students: [] }, tlogs2) });
  await tc.teacherAnswerAddReq("u1_t2", false);
  const b2 = tlogs2.find((l) => l.op === "batch");
  ok(b2 && b2.ops.length === 1 && b2.ops[0][1].status === "rejected" && !tlogs2.some((l) => l.c === "registrationLookup"), "الرفض: الطلب rejected بس");

  // ---- 7) ملفات الهبوط والبوابات ----
  for (const r of ["student", "teacher", "admin"]) {
    const ix = fs.readFileSync(r + "/index.html", "utf8");
    const mf = JSON.parse(fs.readFileSync(r + "/manifest.webmanifest", "utf8"));
    ok(ix.includes('src="portal.js"') && fs.readFileSync(r + "/portal.js", "utf8").includes('T4K_PORTAL="' + r + '"') && ix.includes('href="../src/core/base.css"') && ix.includes('type="module" src="../src/main.js"'), r + "/index.html بيحدد البوابة ومسارات الجذر");
    ok(mf.start_url === "./" && mf.scope === "./" && mf.icons.every((i) => i.src.startsWith("../assets/") && fs.existsSync(r + "/" + i.src)), r + "/manifest: نطاق الفولدر والأيقونات موجودة");
    const others = ["admin", "teacher", "student"].filter((x) => x !== r);
    ok(!ix.includes("<style") && !/<script>[^<]/.test(ix.replace(/<script>\s*<\/script>/g, "")), r + ": مفيش CSS ولا JS جوه الصفحة");
  }
  const sw = fs.readFileSync("sw.js", "utf8");
  ok(/"elmoster-v\d+"/.test(sw) && sw.includes("./student/") && sw.includes("./admin/manifest.webmanifest"), "عامل الخدمة: نسخة مرقّمة وفولدرات الأدوار");
  const rules = fs.readFileSync("firestore.rules", "utf8");
  ok(rules.includes("teacherRequests") && rules.includes('docId == "stats"'), "القواعد فيها teacherRequests و settings/stats");
  console.log(fails === 0 ? "ALL B15 PASS" : "B15 FAILS: " + fails);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("CRASH:", e); process.exit(2); });
