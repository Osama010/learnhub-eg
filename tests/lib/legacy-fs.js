/* مهيّئ الاختبارات: الاختبارات القديمة كانت بتقرا auth.js و app.js و admin.js ... كأنها ملفات كاملة.
   هنا بنركّب نفس الأسماء من الموديولات الجديدة (من غير import/export)، وبنعرّف T() اللي بتقرا القوالب من الديسك،
   فالاختبارات بتفضل تتحقق من نفس السلوك من غير ما نعيد كتابتها. تشغيل من جذر المشروع:
   node -r ./tests/lib/legacy-fs.js tests/check-b8.js */
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const realRead = fs.readFileSync.bind(fs);
const modules = JSON.parse(realRead(path.join(__dirname, "modules.json"), "utf8"));
const tplText = {};
const tpl = {};
for (const f of JSON.parse(realRead(path.join(ROOT, "src/templates.json"), "utf8"))) {
  const text = realRead(path.join(ROOT, "src", f + ".html"), "utf8");
  tplText[f] = text;
  const marks = [...text.matchAll(/^<!-- @@ (\S+) \| ([^\n]*?) -->\n/gm)];
  marks.forEach((mk, i) => {
    const start = mk.index + mk[0].length, end = i + 1 < marks.length ? marks[i + 1].index - 1 : text.length - 1;
    tpl[mk[1]] = { args: mk[2] ? mk[2].split(",") : [], body: text.slice(start, end) };
  });
}
const compiled = {};
global.T = (name, data) => {
  let c = compiled[name];
  if (!c) { const t = tpl[name]; if (!t) throw new Error("template missing " + name); c = compiled[name] = { a: t.args, f: new Function(...t.args, "return `" + t.body + "`;") }; }
  return c.f(...c.a.map((a) => (data || {})[a]));
};
global.getText = (p) => realRead(path.join(ROOT, p), "utf8");
/* main/data.js و main/infra-data.js برّه الباندل: الشاشات بتشوف دوال الـ infrastructure كأسماء عامة */
global.bindData = () => {}; global.infraData = {};
const group = (m) => m === "core/session" || m.startsWith("infrastructure/") || m.startsWith("application/") || m.startsWith("main/") || m.startsWith("domain/") || m.startsWith("features/auth/") ? "auth.js" : m.startsWith("features/admin/") ? "admin.js" : m.startsWith("features/teacher/") ? "teacher.js" : m.startsWith("features/student/") ? "student.js" : "app.js";
function strip(src) {
  return src.replace(/^import [^;]*;\n/gm, "").replace(/^export \{[^}]*\} from "[^"]*";\n/gm, "").replace(/(^|\*\/)export (async function|function|const|let|var|class) /gm, "$1$2 ");
}
const cache = {};
function legacy(name) {
  if (cache[name]) return cache[name];
  let out = "", tpls = "";
  for (const m of modules.filter((x) => group(x) === name)) {
    out += "\n;\n" + strip(realRead(path.join(ROOT, "src", m + ".js"), "utf8"));
    if (tplText[m]) tpls += tplText[m].replace(/\*\//g, "*\\/");
  }
  return (cache[name] = out + "\n/* TEMPLATES\n" + tpls + "\n*/\n");
}
const CSS = ["core/base", "shared/components", "shared/topbar", "shared/brand", "features/student/student", "shared/theme", "features/landing/landing", "shared/analytics-kit"];
fs.readFileSync = function (p, ...rest) {
  if (typeof p === "string") {
    const b = path.basename(p);
    if (["auth.js", "app.js", "admin.js", "teacher.js", "student.js"].includes(b) && (p === b || p.endsWith("/tmp/t4k-mock/" + b))) return legacy(b);
    if (p === "firestore.rules" || p === "firestore-rules.txt") return realRead(path.join(ROOT, "docs", p), ...rest);
    if (p === "style.css" || p.endsWith("/t4k-mock/style.css")) return CSS.map((n) => realRead(path.join(ROOT, "src", n + ".css"), "utf8")).join("\n");
  }
  return realRead(p, ...rest);
};
