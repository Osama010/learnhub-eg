const fs = require("fs");
global.window = { addEventListener(){}, scrollTo(){} };
const __store = {};
global.localStorage = { getItem: (k) => (k in __store ? __store[k] : null), setItem: (k, v) => { __store[k] = String(v); }, removeItem: (k) => { delete __store[k]; } };
global.sessionStorage = global.localStorage;
global.app = { innerHTML: "" };
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
const src = ["auth.js", "admin.js", "teacher.js", "student.js", "app.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n;\n") + `
const main = async () => {
  let fails = 0;
  const ok = (cond, name) => { if (cond) console.log("ok:", name); else { fails++; console.log("FAIL:", name); } };

  // ---------- 1) جملة الأسفل: الافتراضي والتعقيم ----------
  ok(closing().includes("فكرة وإعداد: مهندس اسامه حسن عسس"), "الجملة الافتراضية تظهر");
  aboutState.footerText = "<b>هكر</b>";
  ok(closing().includes("&lt;b&gt;") && !closing().includes("<b>هكر</b>"), "الجملة بتتعقّم (HTML escaping)");
  aboutState.footerText = "فكرة وإعداد: مهندس اسامه حسن عسس";

  // ---------- 2) loadFooterSettings ----------
  const sets = [], adds = [];
  const resetLogs = () => { sets.length = 0; adds.length = 0; };
  const mkDb = (store) => ({
    collection: (c) => ({
      doc: (id) => ({
        get: async () => (store[c + "/" + id] != null ? { exists: true, data: () => store[c + "/" + id] } : { exists: false, data: () => null }),
        set: async (d, o) => { sets.push({ c, id, d, o }); },
      }),
      add: async (d) => { adds.push({ c, d }); },
    }),
  });
  aboutState.footerText = "قديم";
  fbDb = mkDb({ "settings/footer": { text: "  جملة جديدة من الأدمن  " } });
  await loadFooterSettings();
  ok(aboutState.footerText === "جملة جديدة من الأدمن", "الجملة بتتقري من settings/footer (مع trim)");
  fbDb = mkDb({ "settings/footer": { text: "   " } });
  aboutState.footerText = "ثابتة";
  await loadFooterSettings();
  ok(aboutState.footerText === "ثابتة", "النص الفاضي في القاعدة مبيعوّرش الجملة");
  fbDb = mkDb({});
  aboutState.footerText = "ثابتة";
  await loadFooterSettings();
  ok(aboutState.footerText === "ثابتة", "من غير مستند الجملة بتفضل زي ما هي");
  fbDb = { collection: () => ({ doc: () => ({ get: async () => { throw new Error("أوفلاين"); } }) }) };
  await loadFooterSettings();
  ok(aboutState.footerText === "ثابتة", "فشل القراءة ميكسرش الجملة");
  fbDb = null;
  await loadFooterSettings();
  await loadAboutSettings();
  ok(true, "fbDb = null ما يضربش التحميل");

  // ---------- 3) loadAboutSettings + aboutGet ----------
  aboutState.cfg = null;
  resetLogs();
  fbDb = mkDb({});
  await loadAboutSettings();
  const d0 = aboutGet();
  ok(d0.name === "مهندس : اسامه حسن عسس" && d0.title.includes("MTI"), "الافتراضيات من سايت الدروس (الاسم واللقب)");
  ok(d0.longBio.includes("SOIC") && d0.longBio.includes("[ECG Image Classification"), "النبذة الطويلة الافتراضية فيها البحث ولينكه");
  ok(d0.skills.split("،").length === 8, "المهارات الافتراضية 8");
  ok(d0.whatsapp === "201556655614" && d0.facebook.includes("OsamaAsass") && d0.youtube.includes("TechForKidsArabic"), "لينكات التواصل الافتراضية");
  const stored = { name: "م. أسامة", shortBio: "نبذة معدلة", telegram: "@osama" };
  fbDb = mkDb({ "settings/about": stored });
  await loadAboutSettings();
  const d1 = aboutGet();
  ok(d1.name === "م. أسامة" && d1.shortBio === "نبذة معدلة" && d1.telegram === "@osama", "المحفوظ بيغطي الافتراضي");
  ok(d1.title.includes("MTI") && d1.youtube.includes("TechForKidsArabic"), "اللي مش محفوظ بيفضل افتراضي");
  fbDb = mkDb({ "settings/about": { title: "" } });
  await loadAboutSettings();
  ok(aboutGet().title === "", "المسح المقصود (نص فاضي محفوظ) بيحترم");

  // ---------- 4) aboutRich: اللينكات والتعقيم ----------
  ok(aboutRich("شوف [البحث](https://x.com/ab) هنا").includes('<a href="https://x.com/ab" target="_blank"') && aboutRich("شوف [البحث](https://x.com/ab) هنا").includes(">البحث</a>"), "[نص](رابط) بيتحوّل للينك");
  ok(aboutRich("<script>bad</script>").includes("&lt;script&gt;"), "النبذة بتتعقّم");
  ok(aboutRich("[<b>](javascript:x)").indexOf("<b>") === -1 || aboutRich("[<b>](javascript:x)").includes("&lt;b&gt;"), "محتوى اللينك بيتعقّم برضه");

  // ---------- 5) aboutPhotoHtml ----------
  aboutState.cfg = null;
  let ph = aboutPhotoHtml(aboutGet(), 100);
  ok(ph.includes("assets/photos/osama.jpg"), "الافتراضي صورة سايت الدروس");
  ok(ph.includes("onerror"), "في fallback لو الصورة ما حملتش");
  ok(ph.includes(">ا</span>"), "الحرف الاحتياطي «ا» (بعد شيل «مهندس :»)");
  aboutState.cfg = { photo: "data:image/jpeg;base64,XYZ" };
  ph = aboutPhotoHtml(aboutGet(), 52);
  ok(ph.includes("data:image/jpeg;base64,XYZ") && !ph.includes("assets/photos/osama.jpg"), "الصورة المخصصة بتغطي الافتراضية");
  aboutState.cfg = { name: "دكتور محمد" };
  ok(aboutPhotoHtml(aboutGet(), 52).includes(">د</span>"), "الحرف الاحتياطي من أول الاسم لما مفيش «مهندس»");
  aboutState.cfg = null;

  // ---------- 6) aboutPageHtml ----------
  const page = aboutPageHtml();
  ok(page.includes("مهندس : اسامه حسن عسس") && page.includes("جامعة MTI"), "الصفحة فيها الاسم واللقب");
  ok(page.includes("صاحب قناة Tech for Kids"), "الصفحة فيها المقدمة");
  ok((page.match(/chip gray/g) || []).length === 8, "شرائح المهارات الثمانية");
  ok(page.includes("ECG Image Classification") && page.includes("iapress.org"), "البحث ولينكه في النبذة الطويلة");
  ok(page.split(/<p style="font-size:14.5px/).length - 1 === 4, "النبذة الطويلة 4 فقرات");
  ok(page.includes("تواصل واتساب") && page.includes("صفحة الفيسبوك") && page.includes("قناة Tech for Kids على يوتيوب"), "أزرار واتساب وفيسبوك ويوتيوب");
  ok(!page.includes(">تيليجرام</a>") && !page.includes(">لينكدإن</a>"), "الأزرار الفاضية مش بتظهر");
  aboutState.cfg = { telegram: "https://t.me/osama", linkedin: "https://linkedin.com/in/osama" };
  const page2 = aboutPageHtml();
  ok(page2.includes(">تيليجرام</a>") && page2.includes(">لينكدإن</a>"), "تيليجرام ولينكدإن يظهروا لو متسجلين");
  aboutState.cfg = { shortBio: "", longBio: "", skills: "" };
  const page3 = aboutPageHtml();
  ok(!page3.includes("chip gray") && page3.indexOf("<hr") === -1, "الأقسام الفاضية بتتخفي");
  aboutState.cfg = null;

  // ---------- 7) التيذر ----------
  const tz = aboutTeaserHtml();
  ok(tz.includes("data-aboutmore") && tz.includes("اقرأ المزيد") && tz.includes("مهندس : اسامه حسن عسس"), "التيذر فيه الاسم وزرار اقرأ المزيد");
  ok(tz.includes("assets/photos/osama.jpg") && tz.includes("#f59e0b"), "التيذر فيه الصورة بالإطار الذهبي");

  // ---------- 8) renderAboutPage لكل الأدوار ----------
  resetLogs();
  fbDb = mkDb({});
  fbReady = true;
  fbUser = { uid: "s1", email: "s@x.com", emailVerified: true };
  fbRole = "student"; fbProfile = { name: "طالب تجربة" };
  location.hash = "#/about";
  await route();
  ok(app.innerHTML.includes("نبذة عن المهندس") && app.innerHTML.includes("مهندس : اسامه حسن عسس"), "الراوتر بيفتح صفحة النبذة للطالب");
  ok(app.innerHTML.includes("ab-back") && app.innerHTML.includes("pnav"), "الصفحة فيها الشريط العلوي وزرار رجوع");
  document.getElementById("ab-back").onclick();
  ok(location.hash === "#/student", "زرار الرجوع للطالب يرجع للوحته");
  fbRole = "teacher"; fbProfile = { name: "أ/ محمد", avatar: "" };
  await renderAboutPage();
  document.getElementById("ab-back").onclick();
  ok(location.hash === "#/teacher", "زرار الرجوع للمدرس يرجع للوحته");
  fbRole = "admin"; fbProfile = { name: "الأدمن" };
  await renderAboutPage();
  document.getElementById("ab-back").onclick();
  ok(location.hash === "#/admin", "زرار الرجوع للأدمن يرجع للوحته");
  // الصفحة بتعكس آخر تعديل محفوظ
  resetLogs();
  fbDb = mkDb({ "settings/about": { shortBio: "نبذة لحظية" } });
  await renderAboutPage();
  ok(app.innerHTML.includes("نبذة لحظية"), "الصفحة بتقري أحدث نبذة من القاعدة");

  // ---------- 9) فورم الأدمن: حفظ النبذة (مستقل) ----------
  resetLogs();
  fbDb = mkDb({});
  fbUser = { uid: "adm", email: "osamaasas0@gmail.com", providerData: [] };
  fbRole = "admin"; fbProfile = { name: "الأدمن الأساسي" };
  adminCache.admins = [{ id: "osamaasas0@gmail.com", name: "الأدمن الأساسي" }];
  aboutState.cfg = null; aboutState.footerText = "جملة ثابتة للاختبار";
  adminProfile();
  ok(app.innerHTML.includes("👤 نبذة عن المهندس") && app.innerHTML.includes("📝 جملة أسفل الصفحات"), "صفحة حساب الأدمن فيها الفورمين");
  ok(app.innerHTML.includes("ab-save") && app.innerHTML.includes("ft-save"), "كل فورم ليه زرار حفظ منفصل");
  ok(app.innerHTML.includes('value="' + ABOUT_DEFAULTS.name + '"') && app.innerHTML.includes("TechForKidsArabic"), "الفورم متملي بالقيم الافتراضية");
  document.getElementById("ab-name").value = "م. أسامة حسن عسس";
  document.getElementById("ab-title").value = "مهندس المنصة";
  document.getElementById("ab-short").value = "نبذة قصيرة جديدة";
  document.getElementById("ab-long").value = "سطر1\\nسطر2";
  document.getElementById("ab-skills").value = "مهارة1، مهارة2";
  document.getElementById("ab-wa").value = "0100-000-0000";
  document.getElementById("ab-fb").value = "";
  document.getElementById("ab-yt").value = "";
  document.getElementById("ab-tg").value = "";
  document.getElementById("ab-li").value = "";
  await document.getElementById("ab-save").onclick();
  const abSet = sets.find((x) => x.c === "settings" && x.id === "about");
  ok(!!abSet && abSet.o && abSet.o.merge === true, "حفظ النبذة بيعمل set merge على settings/about");
  ok(abSet.d.name === "م. أسامة حسن عسس" && abSet.d.title === "مهندس المنصة" && abSet.d.shortBio === "نبذة قصيرة جديدة", "بيانات النبذة اتحفظت صح");
  ok(abSet.d.whatsapp === "01000000000", "رقم الواتساب بيتنضف من غير الأرقام");
  ok(abSet.d.longBio === "سطر1\\nسطر2", "النبذة الطويلة بأسطرها");
  ok(aboutState.cfg.name === "م. أسامة حسن عسس" && aboutGet().title === "مهندس المنصة", "الكاش بيتحدث فورًا بعد الحفظ");
  ok(aboutState.footerText === "جملة ثابتة للاختبار" && !sets.some((x) => x.id === "footer"), "حفظ النبذة مبيلمسش جملة الأسفل إطلاقًا");
  ok(adds.some((x) => x.c === "adminLog" && x.d.action === "تعديل نبذة المهندس"), "تعديل النبذة بيتسجل في السجل");
  ok(document.getElementById("ab-msg").textContent.includes("اتحفظت"), "رسالة نجاح حفظ النبذة");

  // الاسم الفاضي ممنوع
  resetLogs();
  document.getElementById("ab-name").value = "   ";
  await document.getElementById("ab-save").onclick();
  ok(!sets.length, "اسم فاضي = مفيش حفظ");

  // ---------- 10) فورم جملة الأسفل (مستقل) ----------
  resetLogs();
  document.getElementById("ft-text").value = "صنع بحب في مصر 🇪🇬";
  document.getElementById("ft-text").oninput();
  ok(document.getElementById("ft-prev").textContent === "صنع بحب في مصر 🇪🇬", "المعاينة الحية بتتحدث مع الكتابة");
  await document.getElementById("ft-save").onclick();
  const ftSet = sets.find((x) => x.c === "settings" && x.id === "footer");
  ok(!!ftSet && ftSet.d.text === "صنع بحب في مصر 🇪🇬" && ftSet.o.merge === true, "حفظ الجملة بيعمل set merge على settings/footer");
  ok(aboutState.footerText === "صنع بحب في مصر 🇪🇬" && closing().includes("صنع بحب في مصر"), "الجملة بتتغير فورًا في كل الصفحات");
  ok(!sets.some((x) => x.id === "about"), "حفظ الجملة مبيلمسش النبذة إطلاقًا");
  ok(adds.some((x) => x.c === "adminLog" && x.d.action === "تعديل جملة أسفل الصفحات"), "تعديل الجملة بيتسجل في السجل");
  resetLogs();
  document.getElementById("ft-text").value = "   ";
  await document.getElementById("ft-save").onclick();
  ok(!sets.length && document.getElementById("ft-msg").textContent.includes("اكتب نص"), "جملة فاضية = مفيش حفظ وبرسالة واضحة");

  // ---------- 11) صفحة الدخول بتقري الجملة ----------
  fbUser = null; fbRole = null; fbProfile = null;
  resetLogs();
  fbDb = mkDb({ "settings/footer": { text: "جملة صفحة الدخول" } });
  location.hash = "#/login";
  renderLogin();
  await new Promise((r) => setImmediate(r));
  ok(aboutState.footerText === "جملة صفحة الدخول", "صفحة الدخول بتقري الجملة (قراءة عامة)");

  // ---------- 12) تكامل الكود ----------
  const appSrc = fs.readFileSync("app.js", "utf8");
  ok(appSrc.includes('h === "#/about"'), "الراوتر موصول بـ #/about");
  ok(appSrc.includes('getSettings("about")') && appSrc.includes('getSettings("footer")'), "مستندين منفصلين: about و footer");
  const stSrc2 = fs.readFileSync("student.js", "utf8");
  const tSrc2 = fs.readFileSync("teacher.js", "utf8");
  const aSrc2 = fs.readFileSync("admin.js", "utf8");
  ok(stSrc2.includes("aboutTeaserHtml()") && stSrc2.includes("bindAboutTeaser()"), "لوحة الطالب موصولة بالتيذر");
  ok(tSrc2.includes("aboutTeaserHtml()") && tSrc2.includes("bindAboutTeaser()"), "لوحة المدرس موصولة بالتيذر");
  ok(aSrc2.includes("aboutTeaserHtml()") && aSrc2.includes("bindAboutTeaser()"), "صفحات الأدمن موصولة بالتيذر");
  ok(aSrc2.includes('"تعديل نبذة المهندس"') && aSrc2.includes('"تعديل جملة أسفل الصفحات"'), "حركتا السجل الجديدتين موصولتين");
  const authSrc2 = fs.readFileSync("auth.js", "utf8");
  ok(authSrc2.includes("loadFooterSettings()"), "صفحة الدخول موصولة بقراءة الجملة");
  const rulesSrc = fs.readFileSync("firestore-rules.txt", "utf8");
  ok(rulesSrc.includes('docId == "footer"'), "القواعد بتسمح بقراءة عامة لجملة الأسفل بس");
  ok(fs.existsSync("assets/photos/osama.jpg"), "الصورة الافتراضية موجودة في المشروع");

  console.log(fails === 0 ? "ALL B14 PASS" : "B14 FAILS: " + fails);
  process.exit(fails ? 1 : 0);
};
main().catch((e) => { console.error("CRASH:", e); process.exit(2); });
`;
eval(src);
