import { BASE, fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { bindTeacherTabs, teacherCache, teacherLoad, teacherTabs } from "./dashboard.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { waLink } from "../../shared/transfer.js";
import { getRecipientMode, recipientPickHtml, setRecipientMode } from "./recipient.js";
import { phoneFor, phoneOk } from "./recipient.presenter.js";
import { CERT_FIELDS, CERT_REASONS, applyReason, certClean, certDefaults, certFileName, certShareText, jpegToPdf, signStyle, validateCertificate } from "./certificate.presenter.js";

/* ---------- شهادة طالب: نموذج كل جزء فيه بيتعدل + معاينة حية + طباعة/PDF من المتصفح ---------- */
let certForm = null;
let certFor = "";

/* ---------- خط التوقيع (Aref Ruqaa، رخصة OFL) متضمن في assets/fonts عشان يظهر زي بعض على كل جهاز ---------- */
let signFontP = null;
function loadSignFont() {
  if (!signFontP) {
    signFontP = (async () => {
      try {
        const f = new window.FontFace("T4KSign", "url(" + BASE + "assets/fonts/ArefRuqaa-Bold.woff)");
        await f.load();
        document.fonts.add(f);
        return true;
      } catch (e) { return false; }
    })();
  }
  return signFontP;
}

/* ---------- رسم الشهادة على canvas (A4 أفقي) وتحويلها PDF من غير مكتبة ---------- */
const CERT_FONT = '"Amiri","Noto Naskh Arabic","Traditional Arabic","Scheherazade New","Times New Roman",serif';
const CORNER = ["M2 58 V8 Q2 2 8 2 H58", "M9 58 V15 Q9 9 15 9 H58", "M15 36 Q15 15 36 15"];
const SEAL_RIB1 = "M30 84 L18 124 L36 116 L46 126 L52 88 Z";
const SEAL_RIB2 = "M70 84 L82 124 L64 116 L54 126 L48 88 Z";
function fitText(ctx, text, size, maxW, weight) {
  let z = size;
  ctx.font = weight + " " + z + "px " + CERT_FONT;
  while (z > size * 0.4 && ctx.measureText(text).width > maxW) { z *= 0.94; ctx.font = weight + " " + z + "px " + CERT_FONT; }
}
function wrapLines(ctx, text, maxW) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  words.forEach((w) => { const t = cur ? cur + " " + w : w; if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w; } else cur = t; });
  if (cur) lines.push(cur);
  return lines;
}
export async function drawCertCanvas(cert) {
  await loadSignFont();
  const W = 2339;
  const H = 1654;
  const u = W / 100;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.direction = "rtl"; x.textAlign = "center"; x.textBaseline = "middle";
  const bg = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
  bg.addColorStop(0, "#fffefa"); bg.addColorStop(0.7, "#fff8e6"); bg.addColorStop(1, "#f6ecce");
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = "#1b2f4b"; x.lineWidth = 1.1 * u; x.strokeRect(0.55 * u, 0.55 * u, W - 1.1 * u, H - 1.1 * u);
  x.strokeStyle = "#b8892b"; x.lineWidth = 0.3 * u; x.strokeRect(2.65 * u, 2.65 * u, W - 5.3 * u, H - 5.3 * u);
  x.strokeStyle = "#d9b45a"; x.lineWidth = 0.12 * u; x.strokeRect(3.36 * u, 3.36 * u, W - 6.72 * u, H - 6.72 * u);
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach((f) => {
    x.save();
    const m = 2.7 * u;
    const bs = 9 * u;
    x.translate(f[0] ? m : W - m - bs, f[1] ? H - m - bs : m);
    if (f[0]) { x.translate(bs, 0); x.scale(-1, 1); }
    if (f[1]) { x.translate(0, bs); x.scale(1, -1); }
    x.scale(bs / 60, bs / 60);
    x.lineCap = "butt";
    [["#b8892b", 1.6], ["#d9b45a", 0.8], ["#b8892b", 1.2]].forEach((st, i) => { x.strokeStyle = st[0]; x.lineWidth = st[1]; x.stroke(new window.Path2D(CORNER[i])); });
    x.fillStyle = "#b8892b"; x.beginPath(); x.arc(22, 22, 2.6, 0, 7); x.fill();
    x.fillStyle = "#1b2f4b"; x.fill(new window.Path2D("M2 2 L10 2 L2 10 Z"));
    x.restore();
  });
  const cx = W / 2;
  x.fillStyle = "#8a6417"; x.font = "700 " + 1.9 * u + "px " + CERT_FONT; x.fillText("منصة المستر التعليمية", cx, 6.5 * u);
  fitText(x, cert.title, 6.4 * u, 80 * u, 700);
  x.fillStyle = "#f3e2a9"; x.fillText(cert.title, cx + 0.1 * u, 13.9 * u);
  x.fillStyle = "#8a6417"; x.fillText(cert.title, cx, 13.8 * u);
  x.strokeStyle = "#b8892b"; x.lineWidth = 0.12 * u;
  x.beginPath(); x.moveTo(cx - 12 * u, 20.9 * u); x.lineTo(cx - 3.3 * u, 20.9 * u); x.moveTo(cx + 3.3 * u, 20.9 * u); x.lineTo(cx + 12 * u, 20.9 * u); x.stroke();
  x.fillStyle = "#b8892b"; x.beginPath(); x.moveTo(cx, 20 * u); x.lineTo(cx + 0.9 * u, 20.9 * u); x.lineTo(cx, 21.8 * u); x.lineTo(cx - 0.9 * u, 20.9 * u); x.fill();
  x.fillStyle = "#d9b45a"; [-2.4, 2.4].forEach((d) => { x.beginPath(); x.arc(cx + d * u, 20.9 * u, 0.25 * u, 0, 7); x.fill(); });
  if (cert.intro) { x.fillStyle = "#3b4d68"; fitText(x, cert.intro, 2.2 * u, 80 * u, 400); x.fillText(cert.intro, cx, 25.6 * u); }
  x.fillStyle = "#1b2f4b"; fitText(x, cert.name, 5.6 * u, 75 * u, 700);
  const nw = Math.max(30 * u, Math.min(80 * u, x.measureText(cert.name).width + 10 * u));
  x.fillText(cert.name, cx, 32.8 * u);
  x.fillStyle = "#b8892b"; x.fillRect(cx - nw / 2, 37.4 * u, nw, 0.25 * u);
  if (cert.grade) { x.fillStyle = "#6a7a92"; fitText(x, cert.grade, 2 * u, 80 * u, 400); x.fillText(cert.grade, cx, 41.4 * u); }
  x.fillStyle = "#26364f"; x.font = "400 " + 2.7 * u + "px " + CERT_FONT;
  const ls = wrapLines(x, cert.line, 68 * u).slice(0, 4);
  const lh = 4.4 * u;
  ls.forEach((t, i) => x.fillText(t, cx, 47.5 * u + (i - (ls.length - 1) / 2) * lh + ((ls.length - 1) / 2) * lh * 0.35));
  // الفوتر
  const col = (mid, top, bottom) => {
    x.fillStyle = "#1b2f4b"; x.fillRect(mid - 13 * u, 59.5 * u, 26 * u, 0.2 * u);
    x.fillStyle = "#1b2f4b"; x.font = "700 " + 1.9 * u + "px " + CERT_FONT; if (top) x.fillText(top, mid, 61.3 * u);
    x.fillStyle = "#6a7a92"; x.font = "400 " + 1.6 * u + "px " + CERT_FONT; x.fillText(bottom, mid, 63.7 * u);
  };
  col(71.5 * u, cert.teacher, cert.subject ? "مدرس " + cert.subject : "المدرس");
  col(28.5 * u, "", "التاريخ");
  x.fillStyle = "#1b2f4b"; x.font = "700 " + 1.9 * u + "px " + CERT_FONT; x.fillText(cert.date, 28.5 * u, 57.3 * u);
  if (cert.sign) {
    const st = signStyle(cert.sign);
    x.save();
    x.translate(71.5 * u, 59 * u); x.rotate((st.slant * Math.PI) / 180);
    x.fillStyle = "#14284b"; x.font = "700 " + 4.4 * u + "px T4KSign, Amiri, serif";
    let z = 4.4 * u; while (z > u && x.measureText(cert.sign).width > 24 * u) { z *= 0.94; x.font = "700 " + z + "px T4KSign, Amiri, serif"; }
    x.textBaseline = "alphabetic"; x.fillText(cert.sign, 0, -1.3 * u);
    x.restore();
    const fw = st.flourish * 0.26 * u * 0.55;
    x.strokeStyle = "#1b2f4b"; x.lineWidth = 0.18 * u; x.lineCap = "round"; x.beginPath();
    x.moveTo(71.5 * u - fw, 59 * u - 0.1 * u); x.quadraticCurveTo(71.5 * u - fw / 2, 58.2 * u, 71.5 * u, 58.6 * u); x.quadraticCurveTo(71.5 * u + fw / 2, 59 * u, 71.5 * u + fw, 58.3 * u); x.stroke();
  }
  // الختم
  x.save();
  x.translate(cx - 5.5 * u, 52.8 * u); x.scale(0.11 * u, 0.11 * u);
  x.fillStyle = "#1b2f4b"; x.fill(new window.Path2D(SEAL_RIB1));
  x.fillStyle = "#9c2f3a"; x.fill(new window.Path2D(SEAL_RIB2));
  const g1 = x.createLinearGradient(0, 0, 100, 100); g1.addColorStop(0, "#f3d77c"); g1.addColorStop(0.5, "#c99a2e"); g1.addColorStop(1, "#8a6417");
  x.fillStyle = g1; x.beginPath();
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? 41 : 43.5; x.lineTo(50 + r * Math.cos(a), 48 + r * Math.sin(a)); }
  x.closePath(); x.fill();
  const g2 = x.createLinearGradient(0, 100, 100, 0); g2.addColorStop(0, "#fbe9a6"); g2.addColorStop(1, "#b5832a");
  x.fillStyle = g2; x.strokeStyle = "#8a6417"; x.lineWidth = 1; x.beginPath(); x.arc(50, 48, 33, 0, 7); x.fill(); x.stroke();
  x.strokeStyle = "#fff6d6"; x.lineWidth = 0.8; x.setLineDash([1.6, 1.6]); x.beginPath(); x.arc(50, 48, 28, 0, 7); x.stroke(); x.setLineDash([]);
  x.fillStyle = "#1b2f4b"; x.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? 7 : 17; x.lineTo(50 + r * Math.cos(a), 48 + r * Math.sin(a)); }
  x.closePath(); x.fill();
  x.restore();
  return c;
}
export async function certPdfFile(cert) {
  const c = await drawCertCanvas(cert);
  const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.92));
  if (!blob) throw new Error("مقدرتش أجهز الصورة.");
  const jpeg = new Uint8Array(await blob.arrayBuffer());
  const pdf = jpegToPdf(jpeg, c.width, c.height);
  return new File([pdf], certFileName(cert.name), { type: "application/pdf" });
}
export function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function drawPreview() {
  if (!document.getElementById("ct-msg")) return;
  const bad = validateCertificate(certForm);
  document.getElementById("ct-msg").textContent = bad || "";
  document.getElementById("ct-preview").innerHTML = bad ? "" : T("teacher.certSheetHtml", { cert: certClean(certForm), esc, signStyle });
  ["ct-print", "ct-share", "ct-dl"].forEach((id) => { document.getElementById(id).disabled = !!bad; });
}

export async function renderTeacherCertificate(studentId) {
  if (bailIfSignedOut()) return;
  if (!fbUser) return renderLogin();
  app.innerHTML = T("teacher.renderCert");
  try { await teacherLoad(); } catch (e) { app.innerHTML = T("teacher.renderCert_2", { e, esc }); return; }
  const student = (teacherCache || []).find((s) => s.id === studentId);
  if (!student) { app.innerHTML = T("teacher.renderCert_4", { closing, teacherTabs }); bindTeacherTabs(); return; }
  if (!certForm || certFor !== studentId) {
    certFor = studentId;
    certForm = certDefaults({ student, teacherName: (fbProfile && fbProfile.name) || "", subject: (fbProfile && fbProfile.subject) || "", dateStr: new Date().toLocaleDateString("ar-EG") });
  }
  app.innerHTML = T("teacher.renderCert_3", { CERT_FIELDS, CERT_REASONS, certForm, closing, esc, mode: getRecipientMode(), recipientPickHtml, student, teacherTabs });
  bindTeacherTabs();
  CERT_FIELDS.forEach((f) => {
    const el = document.getElementById("ct-" + f.key);
    if (el) el.oninput = (e) => { certForm[f.key] = e.target.value; drawPreview(); };
  });
  document.getElementById("ct-reason").onchange = (e) => {
    certForm = applyReason(certForm, e.target.value);
    document.getElementById("ct-line").value = certForm.line;
    e.target.value = "";
    drawPreview();
  };
  document.getElementById("ct-reset").onclick = () => { certForm = null; renderTeacherCertificate(studentId); };
  document.getElementById("ct-print").onclick = () => window.print();
  const msg = (t, good) => { const m = document.getElementById("ct-msg"); m.textContent = t; m.className = "msg " + (good ? "ok" : "bad"); };
  const who = () => {
    const mode = getRecipientMode();
    const ph = phoneFor(student, mode);
    document.getElementById("ct-who").textContent = (mode === "student" ? "الطالب: " : "ولي الأمر: ") + (phoneOk(ph) ? ph : "مفيش رقم مسجل");
    const a = document.getElementById("ct-chat");
    a.style.display = phoneOk(ph) ? "" : "none";
    a.href = phoneOk(ph) ? waLink(ph, certShareText(certClean(certForm).name)) : "#";
  };
  document.getElementById("ct-mode").onchange = (e) => { setRecipientMode(e.target.value); who(); };
  const make = async () => { const bad = validateCertificate(certForm); if (bad) { msg(bad, false); return null; } try { return await certPdfFile(certClean(certForm)); } catch (err) { msg(err.message || "فشل تجهيز الـ PDF.", false); return null; } };
  document.getElementById("ct-dl").onclick = async () => { const f = await make(); if (f) { downloadFile(f); msg("اتحمل الـ PDF.", true); } };
  document.getElementById("ct-share").onclick = async () => {
    const f = await make();
    if (!f) return;
    const text = certShareText(certClean(certForm).name);
    if (navigator.canShare && navigator.canShare({ files: [f] }) && navigator.share) {
      try { await navigator.share({ files: [f], text }); msg("اتفتحت المشاركة. اختار واتساب والمحادثة وابعت.", true); } catch (err) { if (!err || err.name !== "AbortError") msg("المشاركة فشلت. استخدم تحميل PDF.", false); }
    } else { downloadFile(f); msg("جهازك مش بيدعم مشاركة الملفات. الـ PDF اتحمل: افتح المحادثة وارفقه.", true); }
  };
  who();
  loadSignFont().then(() => drawPreview());
  drawPreview();
}
