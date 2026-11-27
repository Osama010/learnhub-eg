const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/domain/media.js"), "utf8").replace(/export /g, "");
const { watermarkText } = new Function(src + "; return { watermarkText };")();
let n = 0; const eq = (a, b, m) => { if (a !== b) { console.error("FAIL " + m + ": " + a + " != " + b); process.exit(1); } n++; };
eq(watermarkText({ name: "سارة أحمد محمد", phone: "01012345678" }), "سارة أحمد · 5678", "name + last 4");
eq(watermarkText({ name: "علي", phone: "" }), "علي", "no phone");
eq(watermarkText({ name: "", phone: "012" }), "", "short phone and no name");
eq(watermarkText(null), "", "null");
console.log("watermark:" + n + " passed");
