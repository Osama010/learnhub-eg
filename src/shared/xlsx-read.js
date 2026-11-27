/* قراءة أول شيت من ملف Excel (.xlsx) في المتصفح من غير مكتبات: الملف أصلاً zip، وفك الضغط بـ DecompressionStream الجاهزة.
   بيرجّع مصفوفة صفوف (كل صف مصفوفة نصوص). لو الملف مش xlsx سليم بيرمي خطأ بعربي. */
const dec = new TextDecoder("utf-8");
const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === "undefined") throw new Error("المتصفح ده قديم ومش بيقرا Excel. احفظ الملف كـ CSV وارفعه.");
  const ds = new DecompressionStream("deflate-raw");
  const w = ds.writable.getWriter(); w.write(bytes); w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

/** فهرس ملفات الـ zip: {اسم: {method, csize, off}} من الـ central directory. */
export function zipEntries(b) {
  let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (u32(b, i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("الملف مش Excel (.xlsx) سليم.");
  const n = u16(b, e + 10); let p = u32(b, e + 16); const out = {};
  for (let i = 0; i < n; i++) {
    if (u32(b, p) !== 0x02014b50) break;
    const method = u16(b, p + 10), csize = u32(b, p + 20), nlen = u16(b, p + 28), xlen = u16(b, p + 30), clen = u16(b, p + 32), off = u32(b, p + 42);
    out[dec.decode(b.subarray(p + 46, p + 46 + nlen))] = { method, csize, off };
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

async function readEntry(b, ent) {
  const nlen = u16(b, ent.off + 26), xlen = u16(b, ent.off + 28), start = ent.off + 30 + nlen + xlen;
  const raw = b.subarray(start, start + ent.csize);
  if (ent.method === 0) return dec.decode(raw);
  if (ent.method === 8) return dec.decode(await inflateRaw(raw));
  throw new Error("نوع ضغط مش مدعوم في ملف Excel.");
}

const unxml = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, "&");
const colIdx = (ref) => { let n = 0; for (const ch of ref.replace(/[0-9]/g, "")) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
const textOf = (xml) => [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unxml(m[1])).join("");

/** bytes: Uint8Array لمحتوى ملف xlsx. */
export async function readXlsxRows(bytes) {
  const ents = zipEntries(bytes);
  const shared = [];
  if (ents["xl/sharedStrings.xml"]) {
    const xml = await readEntry(bytes, ents["xl/sharedStrings.xml"]);
    for (const m of xml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1]));
  }
  let sheetPath = "xl/worksheets/sheet1.xml";
  if (!ents[sheetPath]) sheetPath = Object.keys(ents).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];
  if (!sheetPath) throw new Error("مفيش شيت في ملف Excel.");
  const xml = await readEntry(bytes, ents[sheetPath]);
  const rows = [];
  for (const rm of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1], inner = cm[2] || "";
      const ref = (/\br="([A-Z]+\d+)"/.exec(attrs) || [])[1];
      const t = (/\bt="(\w+)"/.exec(attrs) || [])[1];
      let v = "";
      if (t === "s") { const m = /<v>([\s\S]*?)<\/v>/.exec(inner); v = m ? (shared[+m[1]] || "") : ""; }
      else if (t === "inlineStr") v = textOf(inner);
      else { const m = /<v>([\s\S]*?)<\/v>/.exec(inner); v = m ? unxml(m[1]) : ""; }
      const i = ref ? colIdx(ref) : row.length;
      while (row.length < i) row.push("");
      row[i] = v;
    }
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}
