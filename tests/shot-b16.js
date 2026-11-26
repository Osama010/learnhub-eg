const fs = require("fs");
global.window = { innerWidth: 900, scrollTo: () => {}, addEventListener: () => {}, matchMedia: () => ({ matches: false, addEventListener: () => {} }) };
global.localStorage = { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; } };
global.location = { hash: "#/login" };
global.history = { replaceState: () => {} };
global.app = { innerHTML: "", querySelectorAll: () => [] };
const __els = {}; global.__els = __els;
const mkEl = (id) => ({ id, value: "", textContent: "", innerHTML: "", style: {}, dataset: {}, checked: false, disabled: false, files: [],
  classList: { add(){}, remove(){}, toggle(){}, contains: () => false }, addEventListener(){}, onclick: null, onchange: null, oninput: null, focus(){}, remove(){}, appendChild(){}, querySelector: () => mkEl(), querySelectorAll: () => [], setAttribute(){} });
global.mkEl = mkEl;
global.__lastOv = null;
global.document = {
  documentElement: { setAttribute(){}, getAttribute: () => "" },
  body: { appendChild(ov){ global.__lastOv = ov; }, classList: { add(){}, remove(){}, toggle(){}, contains: () => false } },
  addEventListener(){}, createElement: () => mkEl(),
  getElementById: (id) => id === "app" ? global.app : (__els[id] || (__els[id] = mkEl(id))),
  querySelector: () => null, querySelectorAll: () => [],
};
global.navigator = { onLine: true, language: "ar", userAgent: "Mozilla/5.0" };
global.showToast = () => {}; global.confirm = () => true; global.alert = () => {};
global.fetch = async () => ({ ok: false, json: async () => ({}) });
global.firebase = { initializeApp: () => ({}), auth: () => ({ languageCode: "", onAuthStateChanged(){} }),
  firestore: Object.assign(() => ({}), { FieldPath: { documentId: () => "__id__" }, FieldValue: { serverTimestamp: () => null }, Timestamp: { fromDate: (d) => d } }) };
global.ADMIN_EMAIL = "osamaasas0@gmail.com";
global.FIREBASE_CONFIG = {};
if (typeof crypto === "undefined") global.crypto = require("crypto").webcrypto;


const WIN0 = global.window;
const css = fs.readFileSync("/tmp/t4k-mock/style.css", "utf8");
const wrap = (body, theme) => '<!DOCTYPE html><html lang="ar" dir="rtl"' + (theme ? ' data-theme="' + theme + '"' : "") + '><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + "\n*{animation:none!important;transition:none!important} .rv{opacity:1!important;transform:none!important}" + '</style></head><body><div id="app">' + body + "</div></body></html>";
global.__wrap = wrap; global.__fs = fs;
const run = (portal, files, scenario) => {
  global.window = Object.assign({}, WIN0, portal ? { T4K_PORTAL: portal, T4K_BASE: "" } : {});
  const code = ["auth.js", ...files, "app.js"].map((f) => fs.readFileSync("/tmp/t4k-mock/" + f, "utf8")).join("\n;\n");
  const fn = new Function("fs", "__wrap", "__els", code + "\n;return (async () => { fbReady = true;" +
    "const shot = (name, theme) => { let h = app.innerHTML; const lf = __els['login-form']; if (lf && lf.innerHTML) h = h.replace('<div id=\"login-form\"></div>', lf.innerHTML); h = h.replace(/data-count=\"(\\d+)\">0</g, (m, n) => 'data-count=\"' + n + '\">' + Number(n).toLocaleString('en') + '+<'); fs.writeFileSync('/tmp/t4k-mock/' + name + '.html', __wrap(h, theme || '')); };\n" + scenario + "\n})().catch((e) => { console.error('SCENARIO ERROR', e); process.exit(1); });");
  return fn(fs, wrap, __els);
};
const mkDbSrc = `
const lists = { teachersPublic: [
  { id: "t1", name: "مستر أحمد محمود", subject: "برمجة", avatar: "", active: true },
  { id: "t2", name: "مستر علي حسن", subject: "الذكاء الاصطناعي", avatar: "", active: true },
  { id: "t3", name: "مستر سعيد", subject: "رياضيات", avatar: "", active: true },
  { id: "t4", name: "مستر كريم", subject: "علوم", avatar: "", active: true } ] };
const stores = { "settings/stats": { teachers: 12, lessons: 340, students: 2500 } };
const mkQ = (c) => { const q = { get: async () => ({ docs: (lists[c] || []).map((x) => ({ id: x.id, data: () => { const { id, ...r } = x; return r; } })) }), where: () => q }; return q; };
fbDb = { collection: (c) => Object.assign(mkQ(c), { doc: (id) => ({ get: async () => (stores[c + "/" + id] ? { exists: true, data: () => stores[c + "/" + id] } : { exists: false, data: () => null }), set: async () => {}, update: async () => {} }), add: async () => {} }) };
`;
(async () => {
await run("teacher", ["teacher.js"], mkDbSrc + `
fbUser = { uid: "t1", email: "t1@x.com" }; fbRole = "teacher"; fbProfile = { name: "مستر أحمد", stages: ["ثانوي"], subject: "برمجة" };
lessonsState.lessonForm = emptyLessonForm(); lessonsState.lessonForm.unit = 1; lessonsState.lessonForm.lessonNum = 2; lessonsState.lessonForm.title = "البرمجة بلغة بايثون"; lessonsState.lessonForm.videoUrl = "https://youtu.be/dQw4w9WgXcQ";
renderLessonFormPage("ثانوي", "برمجة"); shot("f-b16-teacher-form", "");
`);
})();
