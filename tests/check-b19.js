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

if (typeof crypto === "undefined") global.crypto = require("crypto").webcrypto;
const src = ["auth.js", "teacher.js", "app.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n;\n") + `
const main = async () => {
  let fails = 0;
  const ok = (cond, name) => { if (cond) console.log("ok:", name); else { fails++; console.log("FAIL:", name); } };
  const D = (iso) => ({ toDate: () => new Date(iso) });
  const G = "الصف الأول الابتدائي";
  fbReady = true;
  fbUser = { uid: "t1" }; fbRole = "teacher"; fbProfile = { name: "علي", subject: "برمجة", stages: ["ابتدائي"] };
  const nowD = new Date();
  const dayStr = (n) => new Date(nowD.getTime() - n * 86400000).toISOString().slice(0, 10);
  teacherLoad = async () => { teacherCache = [
    { id: "a", name: "أحمد", status: "approved", grade: G, parentPhone: "01012345678", phone: "01111111111", activityDays: { [dayStr(1)]: true } },
    { id: "b", name: "منى", status: "approved", grade: G, parentPhone: "01022222222", phone: "", activityDays: { [dayStr(20)]: true } },
    { id: "c", name: "كريم", status: "approved", grade: G, parentPhone: "", phone: "01233333333" },
  ]; lessonsState.attempts = [{ id: "1", studentId: "a", quizId: "q1", score: 5, total: 10, ts: D(nowD.toISOString()) }]; lessonsState.ratings = []; };
  teacherLoadLessons = async () => { lessonsState.lessons = [{ id: "l1", title: "درس" }]; lessonsState.quizzes = [{ id: "q1", title: "كويز ١", stage: "ابتدائي", grade: G }, { id: "q2", title: "كويز ٢", stage: "ابتدائي", grade: G }]; lessonsState.exams = []; };
  localStorage.removeItem("t4k_wa_recipient");

  // ---- متابعة الطلاب ----
  await renderTeacherFollow();
  ok(app.innerHTML.includes("متابعة الطلاب") && app.innerHTML.includes('data-g="#/teacher/follow"') && app.innerHTML.includes("نسخة احتياطية لبياناتك") && app.innerHTML.includes("fl-stage"), "متابعة: الشاشة بتترسم بالتاب والفلاتر وكارت النسخة الاحتياطية");
  const fl = () => __els["fl-list"].innerHTML;
  ok(fl().includes("المتأخرين (2 من 3)") && fl().includes("phone=201022222222") && fl().includes("#/teacher/preport/b") && fl().includes("#/teacher/cert/c") && fl().includes("مفيش رقم") && !fl().includes("phone=201012345678"), "متابعة: القايمة الافتراضية (7 أيام، ولي الأمر): منى وكريم بس، وكريم من غير رقم ولي أمر");
  __els["fl-days"].onchange({ target: { value: "30" } });
  ok(fl().includes("المتأخرين (1 من 3)") && fl().includes("كريم") && !fl().includes("منى"), "متابعة: عتبة 30 يوم");
  __els["fl-days"].onchange({ target: { value: "7" } });
  __els["fl-mode"].onchange({ target: { value: "student" } });
  ok(localStorage.getItem("t4k_wa_recipient") === "student" && fl().includes("phone=201233333333") && fl().includes('title="للطالب"') && !fl().includes("phone=201022222222"), "متابعة: اختيار الطالب بيغير الأرقام ويتحفظ");
  await renderTeacherFollow();
  ok(app.innerHTML.includes('value="student" selected'), "متابعة: الاختيار بيفضل بعد إعادة الفتح");
  // ---- النسخة الاحتياطية ----
  let blobs = 0; const oldCE = document.createElement; document.createElement = () => { const e = mkEl(); e.click = () => { blobs++; }; return e; };
  await __els["bk-json"].onclick(); await __els["bk-csv"].onclick();
  document.createElement = oldCE;
  ok(blobs === 2, "نسخة احتياطية: الزرارين بيحمّلوا ملفين");
  // ---- تقرير ولي الأمر ----
  localStorage.setItem("t4k_wa_recipient", "parent");
  await renderTeacherParentReport("a");
  ok(app.innerHTML.includes("تقرير متابعة: أحمد") && app.innerHTML.includes("المتوسط 50%") && app.innerHTML.includes("كويز ٢") && app.innerHTML.includes("phone=201012345678"), "تقرير ولي الأمر: الشاشة (أرقام + اللي لسه + واتساب لولي الأمر)");
  let printed = 0; window.print = () => { printed++; }; __els["pr-print"].onclick(); ok(printed === 1, "تقرير ولي الأمر: زرار الطباعة");
  __els["pr-mode"].onchange({ target: { value: "student" } });
  ok(app.innerHTML.includes("phone=201111111111") && app.innerHTML.includes("ده تقرير متابعتك") === false, "تقرير ولي الأمر: التبديل للطالب (النص جوه الرابط)");
  await renderTeacherParentReport("zzz");
  ok(app.innerHTML.includes("الطالب مش موجود"), "تقرير ولي الأمر: طالب مش موجود");
  // ---- الشهادة ----
  await renderTeacherCertificate("a");
  const pv = () => __els["ct-preview"].innerHTML;
  ok(["title", "intro", "name", "grade", "line", "teacher", "sign", "subject", "date"].every((k) => app.innerHTML.includes('id="ct-' + k + '"')) && pv().includes("شهادة تقدير") && pv().includes("أحمد") && pv().includes('cert-sign">علي<') && pv().includes("مدرس برمجة") && pv().includes("cert-sigtxt") && app.innerHTML.includes('id="ct-share"') && app.innerHTML.includes('id="ct-dl"') && app.innerHTML.includes('id="ct-mode"'), "شهادة: النموذج والمعاينة الابتدائية وزراير الـ PDF");
  __els["ct-name"].oninput({ target: { value: "أحمد علي" } });
  __els["ct-title"].oninput({ target: { value: "شهادة شكر" } });
  __els["ct-teacher"].oninput({ target: { value: "" } });
  ok(pv().includes("أحمد علي") && pv().includes("شهادة شكر") && pv().includes('cert-sign"></div>'), "شهادة: المعاينة الحية بتتغير مع كل حقل");
  __els["ct-line"].oninput({ target: { value: "" } });
  ok(__els["ct-msg"].textContent === "اكتب نص الشهادة." && pv() === "" && __els["ct-print"].disabled === true, "شهادة: من غير نص الطباعة بتتقفل والرسالة بتظهر");
  __els["ct-reason"].onchange({ target: { value: "honor", } });
  ok(__els["ct-line"].value.includes("لوحة الشرف") && pv().includes("لوحة الشرف") && __els["ct-print"].disabled === false && __els["ct-msg"].textContent === "", "شهادة: السبب الجاهز بيملا النص ويفتح الطباعة");
  await renderTeacherCertificate("a");
  ok(pv().includes("أحمد علي") && pv().includes("شهادة شكر"), "شهادة: التعديلات بتفضل لنفس الطالب");
  __els["ct-sign"].oninput({ target: { value: "توقيع جديد" } });
  ok(pv().includes("توقيع جديد") && pv().includes("cert-flour"), "شهادة: التوقيع بيتغير مع الحقل");
  __els["ct-sign"].oninput({ target: { value: "" } });
  ok(!pv().includes("cert-sigtxt"), "شهادة: من غير توقيع مفيش خط توقيع");
  ok(typeof __els["ct-who"].textContent === "string" && __els["ct-who"].textContent.length > 0, "شهادة: سطر المستلم بيتعرض");
  __els["ct-reset"].onclick(); await new Promise((r) => setTimeout(r, 20));
  ok(pv().includes("شهادة تقدير") && pv().includes("أحمد") && !pv().includes("شكر"), "شهادة: الرجوع للقيم الأصلية");
  await renderTeacherCertificate("b");
  ok(pv().includes("منى"), "شهادة: طالب تاني بيبدأ من بياناته");
  await renderTeacherCertificate("zzz");
  ok(app.innerHTML.includes("الطالب مش موجود"), "شهادة: طالب مش موجود");
  // ---- رسالة لصف ----
  localStorage.setItem("t4k_wa_recipient", "parent");
  await renderTeacherBulk();
  ok(app.innerHTML.includes("رسالة لصف") && app.innerHTML.includes("bk-mode") && app.innerHTML.includes("bk-tpl") && __els["bk-list"].innerHTML.includes("الطلاب (3 من 3)"), "رسالة لصف: الشاشة والاختيارات");
  document.getElementById("bk-text").value = "";
  __els["bk-tpl"].onchange({ target: { value: "exam" } });
  ok(__els["bk-text"].value.includes("بنفكركم"), "رسالة لصف: قالب لولي الأمر");
  __els["bk-mode"].onchange({ target: { value: "student" } });
  __els["bk-tpl"].onchange({ target: { value: "exam" } });
  ok(__els["bk-text"].value.includes("فكرك") && __els["bk-list"].innerHTML.includes("phone=201111111111") && __els["bk-list"].innerHTML.includes("مفيش رقم"), "رسالة لصف: التبديل للطالب بيغير القالب والأرقام");
  console.log(fails === 0 ? "ALL B19 PASS" : "B19 FAILS: " + fails);
  process.exit(fails ? 1 : 0);
};
main().catch((e) => { console.error("CRASH:", e); process.exit(2); });
`;
eval(src);
