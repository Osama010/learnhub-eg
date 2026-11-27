/* اختبار نظام اللغة: المحرك (دوال صافية) + تغطية القاموس لملفات المرحلة 1. */
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } };
(async () => {
  const { makeTx, dirOf, localeOf, normLang, toggleLang, westDigits, coverage } = await import(path.join(root, "src/domain/i18n.js"));
  const { EN } = await import(path.join(root, "src/shared/i18n-en.js"));
  const tx = makeTx(EN);
  ok(tx("دروسي") === "My lessons", "exact");
  ok(tx("  دروسي ") === "  My lessons ", "whitespace kept");
  ok(tx("شوفت 3 من 10 درس") === "Watched 3 of 10 lesson", "number pattern");
  ok(tx("Unit 1") === "Unit 1", "latin untouched");
  ok(tx("اسم مدرس مجهول تمامًا") .includes("مجهول"), "unknown teacher text stays Arabic");
  ok(tx("٣ دروس") === "3 lessons", "indic digits");
  ok(tx(null) === null && tx("") === "", "null/empty");
  ok(dirOf("en") === "ltr" && dirOf("ar") === "rtl" && dirOf("xx") === "rtl", "dir");
  ok(localeOf("en") === "en-GB" && localeOf("ar") === "ar-EG", "locale");
  ok(normLang("en") === "en" && normLang("fr") === "ar" && toggleLang("ar") === "en" && toggleLang("en") === "ar", "lang helpers");
  ok(westDigits("٠١٢٣") === "0123", "digits");
  // لا مفتاح بقيمة فاضية، ولا قيمة فيها عربي (ترجمة ناقصة)
  const bad = Object.entries(EN).filter(([k, v]) => !v || /[ء-ي]/.test(v));
  ok(bad.length === 0, "no empty/Arabic values: " + bad.slice(0, 3).map((x) => x[0]).join(" | "));
  // تغطية: نفس استخراج العبارات اللي اتبنى منه القاموس، على ملفات المرحلة 1
  const files = [];
  const add = (d, ext) => { const p = path.join(root, d); if (!fs.existsSync(p)) return; fs.readdirSync(p).forEach((f) => { if (f.endsWith(ext)) files.push(path.join(p, f)); }); };
  ["src/shared", "src/features/auth", "src/features/landing", "src/features/student", "src/features/teacher", "src/features/admin", "src/features/public", "src/core"].forEach((d) => { add(d, ".html"); add(d, ".js"); });
  const RUN = /[ء-ي][ء-ي\s،؟?!.:\-—…«»()%\d·/+ـ\u064B-\u0652]*/g;
  const runs = new Set();
  files.forEach((f) => {
    if (/i18n-en\.js$/.test(f)) return;
    let t = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
    (t.match(RUN) || []).forEach((m) => { const s = m.replace(/\s+/g, " ").trim().replace(/^[ .:\-—·/+(]+|[ .:\-—·/+(]+$/g, ""); if (s.length >= 2) runs.add(s); });
  });
  const cov = coverage([...runs], EN);
  console.log("coverage: " + cov.pct + "% of " + cov.total + " Arabic phrases in phase-1 files; untranslated: " + cov.missing.length);
  ok(EN["المستر"] === "El-Mestar" && !JSON.stringify(EN).includes("Mostar"), "English brand name is El-Mestar");
  ok(cov.pct >= 88, "coverage >= 88%");
  // مفاتيح مجدولة لازم تتحمّل: كل ملفات i18n في sw
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  ["src/shared/i18n.js", "src/shared/i18n-en.js", "src/shared/lang-sync.js", "src/domain/i18n.js"].forEach((f) => ok(sw.includes("./" + f), "sw has " + f));
  const rules = fs.readFileSync(path.join(root, "docs/firestore.rules"), "utf8");
  ok(rules.includes("'lang'") && /get\('lang'/.test(rules), "rules allow lang");
  const us = await import(path.join(root, "src/domain/user-state.js"));
  ok(us.STATE_KEYS.includes("lang"), "userState key lang");
  console.log(fails ? "FAILED" : "i18n: all pass");
  process.exit(fails ? 1 : 0);
})();
