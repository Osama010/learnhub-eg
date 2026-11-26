/* محرك القوالب: القوالب ملفات .html جوه /src (جنب كل ملف JS) بتتحمّل مرة واحدة قبل ما التطبيق يشتغل،
   وبعدها T("اسم", بيانات) بيرجّع النص (متزامن، فمفيش حاجة في العرض بتبقى async).
   صيغة الملف: سطر  <!-- @@ الاسم | متغير1,متغير2 -->  وبعده جسم القالب، والـ ${...} بتتحسب وقت العرض. */
const ROOT = new URL("../../", import.meta.url);
const sources = new Map();   // اسم القالب -> { args, body }
const compiled = new Map();  // اسم القالب -> دالة
const texts = new Map();     // مسار ملف نصي (css) -> محتواه

async function fetchText(rel) {
  const res = await fetch(new URL(rel, ROOT));
  if (!res.ok) throw new Error("تعذر تحميل " + rel + " (" + res.status + ")");
  return res.text();
}

export function parseTemplates(text) {
  const re = /^<!-- @@ (\S+) \| ([^\n]*?) -->\n/gm;
  const marks = [...text.matchAll(re)];
  marks.forEach((mk, i) => {
    const start = mk.index + mk[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index - 1 : text.length - 1;
    sources.set(mk[1], { args: mk[2] ? mk[2].split(",") : [], body: text.slice(start, end) });
  });
}

export async function loadTemplates() {
  const files = await (await fetch(new URL("src/templates.json", ROOT))).json();
  const [css, ...tpls] = await Promise.all([fetchText("src/shared/analytics-kit.css"), ...files.map((f) => fetchText("src/" + f + ".html"))]);
  texts.set("src/shared/analytics-kit.css", css);
  tpls.forEach(parseTemplates);
}

export function getText(path) { return texts.get(path) || ""; }

export function T(name, data) {
  let fn = compiled.get(name);
  if (!fn) {
    const t = sources.get(name);
    if (!t) throw new Error("القالب مش موجود: " + name);
    fn = { args: t.args, run: new Function(...t.args, "return `" + t.body + "`;\n//# sourceURL=template/" + name) };
    compiled.set(name, fn);
  }
  const d = data || {};
  return fn.run(...fn.args.map((a) => d[a]));
}
