const fs = require("fs");
const rules = fs.readFileSync("firestore.rules", "utf8");
const app = fs.readFileSync("app.js", "utf8"), st = fs.readFileSync("student.js", "utf8"), tc = fs.readFileSync("teacher.js", "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok: " : "FAIL: ") + m); if (!c) bad++; };
ok(/match \/lessonMedia\//.test(rules) && /match \/lessonFileChunks\//.test(rules), "rules: lessonMedia + chunks");
ok(!/l\.videoUrl|l\.pdfUrl/.test(st.slice(st.indexOf("async function renderStudentLesson"), st.indexOf("/* ---------- تاب الكويزات"))), "student lesson page: no raw links");
ok(/mountLessonMedia\(app, l, \{ student: true \}\)/.test(st), "student mounts player with watermark");
ok(/mountLessonMedia\(app, l, \{ student: false \}\)/.test(tc), "teacher view mounts");
ok(!/allowfullscreen/.test(app.slice(app.indexOf("function mountPlayer"))), "no iframe allowfullscreen");
ok(fs.existsSync("vendor/pdfjs/pdf.min.js") && fs.existsSync("vendor/pdfjs/pdf.worker.min.js"), "pdfjs vendored");
// base64 chunk roundtrip
const buf = require("crypto").randomBytes(2100000); const b64 = buf.toString("base64"); const parts = []; for (let i = 0; i < b64.length; i += 700000) parts.push(b64.slice(i, i + 700000));
ok(Buffer.concat(parts.map((p) => Buffer.from(p, "base64"))).equals(buf) && parts.every((p) => p.length <= 800000), "chunk roundtrip " + parts.length + " parts");
console.log(bad ? "B16 FAIL" : "ALL B16 PASS"); process.exit(bad ? 1 : 0);
