/* طبقة الدومين (entities + business rules): دوال وثوابت صافية من غير DOM ولا Firebase ولا حالة عامة.
   الطبقة دي ماتستوردش أي حاجة من برّه domain/. */

export function qNew(type, q) {
  q = q || "";
  if (type === "mcq") return { type, q, options: ["", "", "", ""], correct: 0 };
  if (type === "multi") return { type, q, options: ["", "", "", ""], correct: [] };
  if (type === "tf") return { type, q, correct: 0 };
  if (type === "match") return { type, q, pairs: [{ a: "", b: "" }, { a: "", b: "" }] };
  if (type === "num") return { type, q, answer: "", tolerance: "" };
  return { type, q, answer: "" }; // text / fill
}

// تحقق من سؤال قبل الحفظ — بيرجع رسالة الخطأ أو null
export function qValidate(q, i) {
  if (!String(q.q || "").trim()) return `سؤال ${i + 1}: اكتب نص السؤال.`;
  if (q.type === "mcq" && (q.options || []).some((o) => !String(o).trim())) return `سؤال ${i + 1}: كمّل الاختيارات الأربعة.`;
  if (q.type === "multi") {
    if ((q.options || []).some((o) => !String(o).trim())) return `سؤال ${i + 1}: كمّل الاختيارات الأربعة.`;
    if (!Array.isArray(q.correct) || !q.correct.length) return `سؤال ${i + 1}: علّم على إجابة صحيحة واحدة على الأقل.`;
  }
  if ((q.type === "text" || q.type === "fill") && !String(q.answer || "").trim()) return `سؤال ${i + 1}: اكتب الإجابة الصحيحة.`;
  if (q.type === "match") {
    if (!Array.isArray(q.pairs) || q.pairs.length < 2) return `سؤال ${i + 1}: التوصيل يحتاج زوجين على الأقل.`;
    if (q.pairs.some((pr) => !String(pr.a || "").trim() || !String(pr.b || "").trim())) return `سؤال ${i + 1}: كمّل كل أزواج التوصيل.`;
  }
  if (q.type === "num") {
    if (String(q.answer).trim() === "" || isNaN(Number(q.answer))) return `سؤال ${i + 1}: اكتب الإجابة رقم صحيح.`;
    if (String(q.tolerance).trim() !== "" && (isNaN(Number(q.tolerance)) || Number(q.tolerance) < 0)) return `سؤال ${i + 1}: هامش الخطأ لازم يكون رقم صفر أو أكتر.`;
  }
  return null;
}

// تجهيز السؤال للحفظ في قاعدة البيانات
export function qSerialize(q) {
  const base = { type: q.type, q: String(q.q || "").trim() };
  if (q.img) base.img = q.img; // صورة السؤال (اختيارية) — بتتخزن مضغوطة جوه المستند
  if (q.type === "mcq") return { ...base, options: q.options.map((o) => String(o).trim()), correct: q.correct ?? 0 };
  if (q.type === "multi") return { ...base, options: q.options.map((o) => String(o).trim()), correct: Array.from(new Set(q.correct)).sort((a, b) => a - b) };
  if (q.type === "tf") return { ...base, options: ["صح", "غلط"], correct: q.correct ?? 0 };
  if (q.type === "match") return { ...base, pairs: q.pairs.map((pr) => ({ a: String(pr.a).trim(), b: String(pr.b).trim() })) };
  if (q.type === "num") return { ...base, answer: Number(q.answer), tolerance: Number(q.tolerance) || 0 };
  return { ...base, answer: String(q.answer || "").trim() }; // text / fill
}

// قراءة سؤال محفوظ لفورم التعديل
export function qFromStored(q) {
  const t = q.type || "mcq";
  const n = qNew(t, q.q || "");
  if (t === "mcq" || t === "multi") n.options = (q.options || ["", "", "", ""]).slice(0, 4);
  if (t === "mcq" || t === "tf") n.correct = q.correct ?? 0;
  if (t === "multi") n.correct = Array.isArray(q.correct) ? q.correct.slice() : [];
  if (t === "text" || t === "fill") n.answer = q.answer || "";
  if (t === "match") n.pairs = (q.pairs || [{ a: "", b: "" }, { a: "", b: "" }]).map((pr) => ({ a: pr.a || "", b: pr.b || "" }));
  if (t === "num") { n.answer = q.answer ?? ""; n.tolerance = q.tolerance || ""; }
  n.img = q.img || ""; // صورة السؤال لو موجودة
  return n;
}

// توحيد إجابة نصية للتصحيح الآلي: بيتجاهل الهمزات والتشكيل والمسافات والحالة
export function normalizeAnswer(s) {
  return String(s || "").trim().toLowerCase()
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

// التصحيح الآلي لسؤال واحد
export function sGradeOne(q, g) {
  if (g == null) return false;
  if (q.type === "mcq" || q.type === "tf") return Number(g) === Number(q.correct);
  if (q.type === "multi") {
    const c = (q.correct || []).slice().sort((a, b) => a - b);
    return Array.isArray(g) && g.length === c.length && g.every((v, i) => v === c[i]);
  }
  if (q.type === "match") return Array.isArray(g) && (q.pairs || []).every((pr, i) => g[i] === pr.b);
  if (q.type === "num") {
    const n = Number(g);
    if (isNaN(n)) return false;
    return Math.abs(n - Number(q.answer)) <= (Number(q.tolerance) || 0);
  }
  if (q.type === "fill") {
    const acc = String(q.answer || "").split("/").map((x) => normalizeAnswer(x)).filter(Boolean);
    return acc.includes(normalizeAnswer(g));
  }
  return normalizeAnswer(g) === normalizeAnswer(q.answer); // text
}

export function sGivenText(q, g) {
  if (g == null) return "—";
  if (q.type === "mcq") return (q.options || [])[g] || "—";
  if (q.type === "tf") return Number(g) === 0 ? "صح" : "غلط";
  if (q.type === "multi") return (g || []).map((i) => (q.options || [])[i]).filter(Boolean).join("، ") || "—";
  if (q.type === "match") return (q.pairs || []).map((pr, i) => pr.a + " ← " + (g[i] || "—")).join(" · ");
  return String(g);
}

export function sCorrectText(q) {
  if (q.type === "mcq") return (q.options || [])[q.correct] || "";
  if (q.type === "multi") return (q.correct || []).map((i) => (q.options || [])[i]).filter(Boolean).join("، ");
  if (q.type === "tf") return Number(q.correct) === 0 ? "صح" : "غلط";
  if (q.type === "match") return (q.pairs || []).map((pr) => pr.a + " ← " + pr.b).join(" · ");
  if (q.type === "num") return String(q.answer) + (Number(q.tolerance) ? " (±" + q.tolerance + ")" : "");
  return q.answer || "";
}

export function attemptPct(a) { return a.total > 0 ? Math.round((a.score / a.total) * 100) : 0; }

export function examStatus(e) {
  if (e.closed) return ["مقفول", "red"];
  const now = new Date();
  const o = e.openAt && e.openAt.toDate ? e.openAt.toDate() : null;
  const cl = e.closeAt && e.closeAt.toDate ? e.closeAt.toDate() : null;
  if (o && now < o) return ["مجدول", "amber"];
  if (cl && now > cl) return ["انتهى", "red"];
  return ["مفتوح", "green"];
}
