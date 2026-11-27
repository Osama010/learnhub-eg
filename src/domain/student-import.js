/* استيراد طلاب من ملف (CSV / Excel) أو إضافة طالب واحد: دوال صافية من غير DOM ولا Firebase.
   بتقرا النص، بتفهم عناوين الأعمدة (عربي/إنجليزي)، بتنضف كل صف، وبتقول الصف صالح ولا فيه مشكلة وليه. */
import { GRADES, normalizeEgPhone } from "./student.js";

export const MAX_IMPORT_ROWS = 100;
export const TEMPLATE_HEADERS = ["الاسم", "الإيميل", "الصف", "رقم الطالب", "رقم ولي الأمر"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** توحيد نص عربي/إنجليزي للمقارنة: حروف صغيرة، من غير تشكيل ولا مسافات ولا علامات، وأ/إ/آ=ا وى=ي وة=ه. */
export function normKey(s) {
  return String(s == null ? "" : s).toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/[\s_\-.:()/\\]+/g, "");
}

/** تحويل أرقام عربية/هندية لغربية (ملفات إكسل العربية). */
export function westDigits(s) {
  return String(s == null ? "" : s).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

/** قراءة CSV: بيدعم علامات الاقتباس، الفاصلة أو الفاصلة المنقوطة أو التاب، وBOM. بيرجّع مصفوفة صفوف (كل صف مصفوفة خلايا). */
export function parseCsv(text) {
  let t = String(text == null ? "" : text).replace(/^\uFEFF/, "");
  const first = t.split(/\r?\n/, 1)[0] || "";
  const counts = { ",": 0, ";": 0, "\t": 0 };
  let q = false;
  for (const ch of first) { if (ch === '"') q = !q; else if (!q && counts[ch] !== undefined) counts[ch]++; }
  const delim = counts["\t"] > 0 && counts["\t"] >= counts[","] && counts["\t"] >= counts[";"] ? "\t" : counts[";"] > counts[","] ? ";" : ",";
  const rows = [];
  let row = [], cell = "", inQ = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQ) {
      if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

/** نص قالب CSV (بـ BOM عشان إكسل يقرا العربي صح). الصف التاني مثال بيتجاهله الاستيراد. */
export function templateCsv() {
  const ex = ["(مثال) أحمد محمد علي", "ahmed@example.com", "الصف الأول الثانوي", "01012345678", "01098765432"];
  return "\uFEFF" + [TEMPLATE_HEADERS, ex].map((r) => r.map((c) => '"' + c.replace(/"/g, '""') + '"').join(",")).join("\r\n") + "\r\n";
}

const ALIASES = {
  name: ["الاسم", "اسم", "اسمالطالب", "اسمالطالبه", "name", "studentname", "student", "fullname"],
  email: ["الايميل", "ايميل", "الايميلالالكتروني", "البريد", "البريدالالكتروني", "بريد", "email", "e-mail", "mail", "emailaddress"],
  grade: ["الصف", "الصفالدراسي", "السنه", "السنهالدراسيه", "الفرقه", "grade", "class", "year", "level"],
  phone: ["رقمالطالب", "موبايلالطالب", "هاتفالطالب", "تليفونالطالب", "الموبايل", "موبايل", "الهاتف", "تليفون", "الرقم", "phone", "mobile", "studentphone", "studentmobile"],
  parentPhone: ["رقمولياالامر", "رقمولياامر", "رقمولياالامر", "موبايلولياالامر", "موبايلوليامر", "ولياالامر", "وليامر", "تليفونولياالامر", "رقمالاب", "parentphone", "parentmobile", "parent", "guardian", "guardianphone"],
};
const ALIAS_SET = Object.fromEntries(Object.entries(ALIASES).map(([k, v]) => [k, new Set(v.map(normKey))]));
// ولي الأمر بكل صيغه (ولي/ولى الأمر): بعد normKey الياء/الألف المقصورة موحّدة
["رقم ولي الأمر", "موبايل ولي الأمر", "ولي الأمر", "تليفون ولي الأمر", "هاتف ولي الأمر", "رقم الأب", "رقم والد الطالب"].forEach((x) => ALIAS_SET.parentPhone.add(normKey(x)));

/** بيحدد عمود كل حقل من صف العناوين. بيرجّع {map, hasHeader}. لو الصف الأول فيه إيميل صريح ده صف بيانات مش عناوين. */
export function detectColumns(firstRow) {
  const cells = (firstRow || []).map((c) => String(c == null ? "" : c));
  if (cells.some((c) => EMAIL_RE.test(c.trim()))) return { hasHeader: false, map: { name: 0, email: 1, grade: 2, phone: 3, parentPhone: 4 } };
  const map = {};
  cells.forEach((c, i) => {
    const k = normKey(c);
    for (const f of ["email", "parentPhone", "phone", "grade", "name"]) if (map[f] === undefined && ALIAS_SET[f].has(k)) { map[f] = i; break; }
  });
  if (map.email === undefined) return { hasHeader: true, map, error: "مش لاقي عمود الإيميل في الملف. استخدم النموذج المرفق." };
  if (map.name === undefined) return { hasHeader: true, map, error: "مش لاقي عمود الاسم في الملف. استخدم النموذج المرفق." };
  return { hasHeader: true, map };
}

/** مطابقة اسم الصف المكتوب بأي صيغة لاسم صف من قايمة الصفوف الرسمية، أو null. */
export function matchGrade(raw) {
  let k = normKey(westDigits(raw));
  if (!k) return null;
  const exact = GRADES.find((g) => normKey(g) === k);
  if (exact) return exact;
  k = k.replace(/^الصف/, "");
  const stage = /ابتدايي|ابتدائي|ابتداءي/.test(k) ? "الابتدائي" : /اعدادي/.test(k) ? "الإعدادي" : /ثانوي|ثانويه/.test(k) ? "الثانوي" : "";
  if (!stage) return null;
  const ord = [
    ["الاول", "اول", "الاولي", "اولي", "1", "الاولى"], ["الثاني", "ثاني", "الثانيه", "ثانيه", "2", "التاني", "تاني", "تانيه", "التانيه"],
    ["الثالث", "ثالث", "الثالثه", "ثالثه", "3", "التالت", "تالت", "تالته", "التالته"], ["الرابع", "رابع", "4", "رابعه", "الرابعه"], ["الخامس", "خامس", "5", "خامسه", "الخامسه"], ["السادس", "سادس", "6", "سادسه", "السادسه"],
  ];
  let idx = -1;
  const body = k.replace(/(ال)?(ابتدايي|ابتدائي|ابتداءي|اعدادي|ثانويه|ثانوي)/g, "").replace(/^(ال)?صف/, "");
  for (let i = 0; i < ord.length; i++) if (ord[i].map(normKey).includes(body) || ord[i].map(normKey).includes("ال" + body)) { idx = i; break; }
  if (idx < 0) return null;
  return GRADES.find((g) => g.endsWith(stage) && normKey(g).includes(normKey(["الاول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"][idx]))) || null;
}

/* هل الصف ده مسموح للمدرس؟ (مراحله وصفوفه المحددة لو فيه) */
function gradeAllowed(grade, allowed) {
  if (!allowed || !allowed.length) return true;
  return allowed.includes(grade);
}

/**
 * يحوّل صفوف الملف لصفوف مرتبة وجاهزة.
 * opts: { defaultGrade, allowedGrades[] }
 * بيرجّع { error?, rows:[{line, name, email, grade, phone, parentPhone, error?}], validCount, badCount, tooMany }
 * line = رقم السطر في الملف (بنحسب صف العناوين) عشان المدرس يلاقي الصف.
 */
export function prepareImport(table, opts = {}) {
  const { defaultGrade = "", allowedGrades = [] } = opts;
  if (!table || !table.length) return { error: "الملف فاضي.", rows: [], validCount: 0, badCount: 0, tooMany: false };
  const cols = detectColumns(table[0]);
  if (cols.error) return { error: cols.error, rows: [], validCount: 0, badCount: 0, tooMany: false };
  const body = cols.hasHeader ? table.slice(1) : table;
  const off = cols.hasHeader ? 2 : 1;
  const seen = new Map();
  const rows = [];
  body.forEach((r, i) => {
    const get = (f) => (cols.map[f] === undefined ? "" : String(r[cols.map[f]] == null ? "" : r[cols.map[f]]).trim());
    const name = get("name").replace(/\s+/g, " ");
    if (/^\(?\s*مثال/.test(name) || /^example/i.test(name)) return; // صف المثال في النموذج
    const email = westDigits(get("email")).toLowerCase().replace(/\s+/g, "");
    const rawGrade = get("grade");
    const line = i + off;
    const row = { line, name, email, grade: "", phone: "", parentPhone: "" };
    if (!name && !email && !rawGrade) return; // صف فاضي فعليًا
    const fail = (msg) => { row.error = msg; rows.push(row); };
    if (!name) return fail("مفيش اسم");
    if (name.length < 3) return fail("الاسم قصير جدًا");
    if (name.length > 80) return fail("الاسم طويل جدًا (أكتر من 80 حرف)");
    if (!email) return fail("مفيش إيميل");
    if (!EMAIL_RE.test(email) || email.length > 120) return fail("الإيميل شكله غلط (" + email + ")");
    let grade = rawGrade ? matchGrade(rawGrade) : (defaultGrade || "");
    if (!rawGrade && !grade) return fail("مفيش صف (اكتبه في الملف أو اختار صف افتراضي فوق)");
    if (!grade) return fail("الصف مش معروف (\"" + rawGrade + "\"). اكتبه زي: الصف الأول الثانوي");
    if (!gradeAllowed(grade, allowedGrades)) return fail("الصف ده (" + grade + ") مش من صفوفك");
    const ph = get("phone"), pp = get("parentPhone");
    const phone = ph ? normalizeEgPhone(westDigits(ph)) : "";
    const parentPhone = pp ? normalizeEgPhone(westDigits(pp)) : "";
    if (ph && !phone) return fail("رقم الطالب مش مصري صح (11 رقم يبدأ بـ 01)");
    if (pp && !parentPhone) return fail("رقم ولي الأمر مش مصري صح (11 رقم يبدأ بـ 01)");
    if (phone && parentPhone && phone === parentPhone) return fail("رقم ولي الأمر نفس رقم الطالب");
    if (seen.has(email)) return fail("الإيميل مكرر في الملف (السطر " + seen.get(email) + ")");
    seen.set(email, line);
    Object.assign(row, { grade, phone: phone || "", parentPhone: parentPhone || "" });
    rows.push(row);
  });
  const validCount = rows.filter((r) => !r.error).length;
  return { rows, validCount, badCount: rows.length - validCount, tooMany: validCount > MAX_IMPORT_ROWS };
}

/** صف واحد من فورم الإضافة اليدوية: نفس قواعد الملف. بيرجّع {error} أو {values}. */
export function presentSingleStudent(raw, opts = {}) {
  const r = prepareImport([TEMPLATE_HEADERS, [raw.name, raw.email, raw.grade, raw.phone, raw.parentPhone]], { ...opts, defaultGrade: "" });
  if (!r.rows.length) return { error: "اكتب بيانات الطالب." };
  const row = r.rows[0];
  if (row.error) return { error: row.error };
  return { values: { name: row.name, email: row.email, grade: row.grade, phone: row.phone, parentPhone: row.parentPhone } };
}

/** رسالة عربية مفهومة لخطأ الإضافة (أكواد Firebase Auth أو Firestore أو أخطاء التطبيق). */
export function importErrorReason(e) {
  const code = String((e && e.code) || "");
  const msg = String((e && e.message) || e || "");
  if (code === "auth/email-already-in-use") return "الإيميل ده عنده حساب بالفعل على المنصة";
  if (code === "auth/invalid-email") return "الإيميل شكله غلط";
  if (code === "auth/too-many-requests" || code === "auth/quota-exceeded") return "Firebase وقّف الإضافة مؤقتًا (طلبات كتير). استنى 10 دقايق وكمّل الباقي";
  if (code === "auth/network-request-failed" || /network|offline|unavailable/i.test(msg)) return "مشكلة في الإنترنت أثناء الإضافة";
  if (code === "permission-denied" || /permission/i.test(msg)) return "مفيش صلاحية. اتأكد إن الـrules الجديدة اتنشرت وإن اشتراكك شغال";
  if (code === "auth/operation-not-allowed") return "تسجيل الدخول بالإيميل والباسورد مقفول في إعدادات Firebase";
  return "حصلت مشكلة: " + (msg || code || "غير معروف");
}

/** هل الخطأ ده معناه نوقف الباقي (حد Firebase/إنترنت) بدل ما نكمل نفشل كل الصفوف؟ */
export function isStopError(e) {
  const code = String((e && e.code) || "");
  return code === "auth/too-many-requests" || code === "auth/quota-exceeded" || code === "auth/network-request-failed";
}

/** ملف CSV بالصفوف اللي فشلت/اتخطت (بسببها) عشان المدرس يصلحها ويرفعها تاني. */
export function failedRowsCsv(results) {
  const head = [...TEMPLATE_HEADERS, "السبب"];
  const lines = results.filter((r) => r.status !== "created").map((r) => [r.name, r.email, r.grade, r.phone, r.parentPhone, r.reason || ""]);
  return "\uFEFF" + [head, ...lines].map((r) => r.map((c) => '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"').join(",")).join("\r\n") + "\r\n";
}
