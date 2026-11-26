/* Presenter شهادات الطلاب: نموذج الشهادة القابل للتعديل بالكامل والتحقق منه. صافي. */
export const CERT_REASONS = [
  { id: "excel", label: "تفوق دراسي", line: "تقديراً لتفوقه الدراسي وتميزه" },
  { id: "complete", label: "إتمام المرحلة", line: "لإتمامه المرحلة الدراسية بنجاح" },
  { id: "honor", label: "لوحة الشرف", line: "لاختياره من أوائل طلاب لوحة الشرف" },
  { id: "effort", label: "شكر وتقدير", line: "شكراً وتقديراً لمجهوده والتزامه" },
];

/** حقول الشهادة (الاسم الداخلي، العنوان، الحد الأقصى للحروف، متعدد الأسطر؟). */
export const CERT_FIELDS = [
  { key: "title", label: "عنوان الشهادة", max: 60 },
  { key: "intro", label: "سطر المقدمة", max: 100 },
  { key: "name", label: "اسم الطالب", max: 60 },
  { key: "grade", label: "الصف", max: 60 },
  { key: "line", label: "نص الشهادة (السبب)", max: 200, multi: true },
  { key: "teacher", label: "اسم المدرس", max: 60 },
  { key: "sign", label: "التوقيع (بيتكتب بخط يد من الاسم)", max: 40 },
  { key: "subject", label: "المادة", max: 60 },
  { key: "date", label: "التاريخ", max: 40 },
];

/** القيم الابتدائية للنموذج من بيانات الطالب والمدرس. */
export function certDefaults({ student, teacherName, subject, dateStr }) {
  return { title: "شهادة تقدير", intro: "تشهد منصة المستر بأن الطالب", name: (student && student.name) || "", grade: (student && student.grade) || "", line: CERT_REASONS[0].line, teacher: teacherName || "", sign: teacherName || "", subject: subject || "", date: dateStr || "" };
}

/** النموذج بعد التنضيف: كل حقل متقص وبحده الأقصى. */
export function certClean(form) {
  const o = {};
  CERT_FIELDS.forEach((f) => { o[f.key] = String((form && form[f.key]) || "").trim().slice(0, f.max); });
  return o;
}

/** اختيار سبب جاهز بيحط نصه في حقل نص الشهادة (والباقي زي ما هو). */
export function applyReason(form, reasonId) {
  const r = CERT_REASONS.find((x) => x.id === reasonId);
  return r ? Object.assign({}, form, { line: r.line }) : Object.assign({}, form);
}

/** تحقق: رسالة الخطأ أو null. */
export function validateCertificate(form) {
  const c = certClean(form);
  if (!c.name) return "اكتب اسم الطالب.";
  if (!c.title) return "اكتب عنوان الشهادة.";
  if (!c.line) return "اكتب نص الشهادة.";
  return null;
}

/** PDF من صفحة واحدة A4 أفقي فيها صورة JPEG مالية الصفحة (من غير أي مكتبة). */
export function jpegToPdf(jpeg, w, h) {
  const PW = 841.89;
  const PH = 595.28;
  const enc = (s) => { const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; };
  const content = "q " + PW + " 0 0 " + PH + " 0 0 cm /Im0 Do Q";
  const objs = [
    [enc("<< /Type /Catalog /Pages 2 0 R >>")],
    [enc("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")],
    [enc("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PW + " " + PH + "] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>")],
    [enc("<< /Type /XObject /Subtype /Image /Width " + w + " /Height " + h + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpeg.length + " >>\nstream\n"), jpeg, enc("\nendstream")],
    [enc("<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream")],
  ];
  const parts = [enc("%PDF-1.4\n")];
  const offs = [];
  let pos = parts[0].length;
  objs.forEach((o, i) => {
    offs.push(pos);
    const head = enc((i + 1) + " 0 obj\n");
    const tail = enc("\nendobj\n");
    [head].concat(o, [tail]).forEach((p) => { parts.push(p); pos += p.length; });
  });
  let xref = "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n";
  offs.forEach((o) => { xref += String(o).padStart(10, "0") + " 00000 n \n"; });
  xref += "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + pos + "\n%%EOF\n";
  parts.push(enc(xref));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  parts.forEach((p) => { out.set(p, at); at += p.length; });
  return out;
}

/** اسم ملف PDF آمن من اسم الطالب. */
export const certFileName = (name) => "شهادة-" + String(name || "طالب").replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 40) + ".pdf";

/** نص رسالة الواتساب اللي بتتبعت مع الشهادة. */
export const certShareText = (name) => "شهادة تقدير للطالب " + String(name || "").trim() + " 🏅";

/** ميل التوقيع (درجات) وطول خط الزخرفة تحت الاسم، ثابتين من الاسم عشان الشكل يتكرر كل مرة. */
export function signStyle(text) {
  const n = String(text || "").length;
  let h = 0;
  String(text || "").split("").forEach((ch) => { h = (h * 31 + ch.charCodeAt(0)) % 7; });
  return { slant: -3 - (h % 3), flourish: Math.min(100, 55 + n * 4) };
}
