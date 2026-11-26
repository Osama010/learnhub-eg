/* فحص قاعدة الاعتمادية (Dependency Rule): الطبقات الداخلية ماتعرفش الخارجية.
   تشغيل من جذر المشروع: node tests/check-arch.js */
const fs = require("fs"), path = require("path");
const SRC = path.resolve(__dirname, "../src");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".js") ? [path.join(d, e.name)] : []);
const layerOf = (f) => { const r = path.relative(SRC, f).split(path.sep); return r[0] === "domain" ? "domain" : r[0] === "infrastructure" ? "infrastructure" : r[0]; };
// كل طبقة تقدر تستورد من الطبقات دي بس
const ALLOWED = { domain: ["domain"], application: ["application", "domain"], infrastructure: ["infrastructure", "application", "domain"], main: ["main", "application", "infrastructure", "domain"] };
const FORBIDDEN_IN_DOMAIN = /\b(document|window|localStorage|sessionStorage|firebase|fbDb|fbAuth|fbUser|fbProfile|navigator|fetch|alert|confirm)\b/;
let bad = 0;
for (const f of walk(SRC)) {
  const src = fs.readFileSync(f, "utf8"), L = layerOf(f);
  if (!ALLOWED[L]) continue;
  for (const m of src.matchAll(/^import [^;]*? from "([^"]+)";/gm)) {
    const target = layerOf(path.resolve(path.dirname(f), m[1]));
    if (!ALLOWED[L].includes(target)) { console.log("FAIL: " + path.relative(SRC, f) + " (" + L + ") imports " + m[1] + " (" + target + ")"); bad++; }
  }
  if (L === "domain" && FORBIDDEN_IN_DOMAIN.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/"[^"\n]*"/g, '""'))) { console.log("FAIL: domain file touches the browser/Firebase: " + path.relative(SRC, f)); bad++; }
}
// مفيش وصول مباشر لـ Firestore/Auth برّه services و core/session
for (const f of walk(SRC)) {
  const r = path.relative(SRC, f);
  if (r.startsWith("infrastructure") || r === "core/session.js") continue;
  if (/\b(fbDb|fbAuth)\./.test(fs.readFileSync(f, "utf8"))) { console.log("FAIL: direct Firebase access outside infrastructure/firebase: " + r); bad++; }
}
// الشاشات والـ shared مبتستوردش infrastructure خالص (بتاخد البيانات من main/data.js والـ use cases من main/compose.js)
for (const f of walk(SRC)) {
  const r = path.relative(SRC, f);
  if (!(r.startsWith("features/") || r.startsWith("shared/"))) continue;
  for (const m of fs.readFileSync(f, "utf8").matchAll(/^import [^;]*? from "([^"]+)";/gm)) if (/\/infrastructure\//.test(m[1])) { console.log("FAIL: " + r + " imports infrastructure directly: " + m[1]); bad++; }
}
// الشاشات والـ shared مبتلمسش كائن firebase العام (وقت السيرفر/التواريخ/الحقول بتيجي من main/data.js)
for (const f of walk(SRC)) {
  const r = path.relative(SRC, f);
  if (!(r.startsWith("features/") || r.startsWith("shared/"))) continue;
  const t = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/"[^"\n]*"/g, '""');
  if (/\bfirebase\./.test(t)) { console.log("FAIL: " + r + " uses the global firebase object"); bad++; }
}
// الجلسة والشاشات مبتستوردش عميل Firestore (fbDb) خالص: القراءة بتعدّي من main/data.js (الدور بيتحدد في domain/role.js)
for (const f of walk(SRC)) {
  const r = path.relative(SRC, f);
  if (r.startsWith("infrastructure")) continue;
  if (/\bfbDb\b/.test(fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""))) { console.log("FAIL: fbDb used outside infrastructure/firebase: " + r); bad++; }
}
// الجلسة (core/session.js) مبتستوردش infrastructure خالص: Firebase Auth بيتكلم من خلال main/data.js (port) والتنفيذ بيتحقن
{
  const t = fs.readFileSync(path.join(SRC, "core/session.js"), "utf8");
  for (const m of t.matchAll(/^import [^;]*? from "([^"]+)";/gm)) if (/infrastructure/.test(m[1])) { console.log("FAIL: core/session.js imports infrastructure: " + m[1]); bad++; }
  if (/\bfbAuth\b/.test(t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""))) { console.log("FAIL: core/session.js uses fbAuth"); bad++; }
}
// fbAuth مفيش حد يستورده برّه infrastructure
for (const f of walk(SRC)) {
  const r = path.relative(SRC, f);
  if (r.startsWith("infrastructure")) continue;
  if (/\bfbAuth\b/.test(fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""))) { console.log("FAIL: fbAuth referenced outside infrastructure/firebase: " + r); bad++; }
}
// العناصر المشتركة (closing/downloadBlob/statusChip) في shared/common.js: مفيش شاشة تستوردها من شاشة تانية
for (const f of walk(SRC)) {
  const r = path.relative(SRC, f);
  for (const m of fs.readFileSync(f, "utf8").matchAll(/^import \{([^}]*)\} from "([^"]*landing\/landing\.js)";/gm)) if (/\b(closing|downloadBlob|statusChip)\b/.test(m[1])) { console.log("FAIL: " + r + " imports shared UI from landing.js; use shared/common.js"); bad++; }
}
// shared/ مبتستوردش من features/ حاجة غير الشاشات المعروفة (pwa/toast بيفتحوا شاشة الدخول والنبذة)
{
  const okShared = new Set(["shared/pwa.js", "shared/toast.js"]);
  for (const f of walk(path.join(SRC, "shared"))) {
    const r = path.relative(SRC, f);
    for (const m of fs.readFileSync(f, "utf8").matchAll(/^import [^;]*? from "(\.\.\/features\/[^"]+)";/gm)) if (!okShared.has(r)) { console.log("FAIL: " + r + " imports a feature: " + m[1]); bad++; }
  }
}
// كل شاشة (feature) ليها presenter أو مبررة في القايمة دي (شاشات رفيعة من غير منطق)
{
  const thin = new Set(["features/teacher/forms.js", "features/admin/backup.js"]); // ربط DOM بس، من غير منطق
  let missing = [];
  for (const f of walk(path.join(SRC, "features"))) {
    const r = path.relative(SRC, f);
    if (!r.endsWith(".js") || /\.(presenter|view)\.js$/.test(r) || thin.has(r)) continue;
    if (!fs.existsSync(f.replace(/\.js$/, ".presenter.js"))) missing.push(r);
  }
  console.log("screens without presenter (info): " + missing.join(", "));
}
// حارس: نص اتبدّل غلط جوه اسم (مثلاً db.subjecfirebase...) بيكسر الكود وقت التشغيل بس
for (const f of walk(SRC)) if (/[A-Za-z_$]firebase\.firestore\./.test(fs.readFileSync(f, "utf8").replace(/"[^"\n]*"/g, '""'))) { console.log("FAIL: corrupted identifier near firebase.firestore in " + path.relative(SRC, f)); bad++; }
// كل db.xxx() مستخدمة لازم تكون معرّفة في db.js
{
  const names = new Set([...fs.readFileSync(path.join(SRC, "infrastructure/firebase/db.js"), "utf8").matchAll(/^\s+(\w+): \(\)/gm)].map((m) => m[1]).concat("batch"));
  for (const f of walk(SRC)) for (const m of fs.readFileSync(f, "utf8").matchAll(/\bdb\.(\w+)\(/g)) if (!names.has(m[1])) { console.log("FAIL: db." + m[1] + "() is not defined in db.js (" + path.relative(SRC, f) + ")"); bad++; }
}
// presenters: صافية (من غير DOM/Firebase) وبتستورد من الدومين وبريزنترز تانية بس
for (const f of walk(SRC)) {
  if (!f.endsWith(".presenter.js")) continue;
  const t = fs.readFileSync(f, "utf8"), r = path.relative(SRC, f);
  if (FORBIDDEN_IN_DOMAIN.test(t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/"[^"\n]*"/g, '""'))) { console.log("FAIL: presenter touches the browser/Firebase: " + r); bad++; }
  for (const m of t.matchAll(/^import [^;]*? from "([^"]+)";/gm)) { const tg = path.relative(SRC, path.resolve(path.dirname(f), m[1])); if (!/^domain\//.test(tg) && !/\.presenter\.js$/.test(tg)) { console.log("FAIL: presenter " + r + " imports " + m[1]); bad++; } }
}
// كل import بأسماء لازم يشاور على ملف موجود وبيصدّر الاسم ده
{
  const files = walk(SRC), ex = {};
  for (const f of files) { const t = fs.readFileSync(f, "utf8"), n = new Set();
    for (const m of t.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) n.add(m[1]);
    for (const m of t.matchAll(/export\s*\{([^}]*)\}/g)) m[1].split(",").forEach((x) => { x = x.trim().split(/\s+as\s+/).pop(); if (x) n.add(x); });
    ex[path.resolve(f)] = n; }
  for (const f of files) for (const m of fs.readFileSync(f, "utf8").matchAll(/import\s*\{([^}]*)\}\s*from\s*"(\.[^"]+)"/g)) {
    const t = path.resolve(path.dirname(f), m[2]);
    if (!ex[t]) { console.log("FAIL: import of a missing file: " + path.relative(SRC, f) + " -> " + m[2]); bad++; continue; }
    for (let x of m[1].split(",")) { x = x.trim().split(/\s+as\s+/)[0]; if (x && !ex[t].has(x)) { console.log("FAIL: " + path.relative(SRC, f) + " imports missing export " + x + " from " + m[2]); bad++; } }
  }
}
// sw.js: كل ملف في SHELL لازم يكون موجود (ملف ناقص بيكسر تثبيت الـ service worker) وكل ملفات src لازم تكون فيه
const root = path.resolve(SRC, "..");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1]);
for (const p of shell) if (p !== "./" && !p.endsWith("/") && !fs.existsSync(path.join(root, p))) { console.log("FAIL: sw.js lists a missing file: " + p); bad++; }
for (const f of walk(SRC)) { const r = "./" + path.relative(root, f).replace(/\\/g, "/"); if (!shell.includes(r)) { console.log("FAIL: sw.js SHELL is missing " + r); bad++; } }
console.log(bad ? "ARCH FAILS: " + bad : "ARCH OK: domain is pure, infrastructure only depends inward, no direct Firebase outside infrastructure/firebase");
process.exit(bad ? 1 : 0);
