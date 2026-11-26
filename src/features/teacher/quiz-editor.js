import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { qNew } from "../../domain/quiz.js";
import { QTYPES } from "./lessons.presenter.js";

/* ---------- محرر أسئلة الكويز/الامتحان (HTML + ربط الأحداث + تصغير صور الأسئلة) ---------- */
// تصغير صورة سؤال قبل الحفظ: بحد أقصى 800px وجودة مناسبة، ورفض لو عدّت 400KB
// (صور الأسئلة بتتخزن جوه مستند الكويز نفسه، ولازم المستند كله يفضل أقل من 1MB)
function resizeQuestionImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 800;
      let w = img.width, h = img.height;
      if (w > h) { if (w > max) { h = Math.round(h * max / w); w = max; } }
      else { if (h > max) { w = Math.round(w * max / h); h = max; } }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      const d = c.toDataURL("image/jpeg", 0.8);
      URL.revokeObjectURL(img.src);
      if (d.length > 400000) return reject(new Error("الصورة كبيرة حتى بعد التصغير — جرّب صورة أبسط أو أصغر."));
      resolve(d);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error("الملف ده مش صورة.")); };
    img.src = URL.createObjectURL(file);
  });
}

export function quizBuilderHtml(p, qs) {
  if (!qs.length) {
    return T("teacher.quizBuilderHtml");
  }
  return qs.map((q, i) => {
    let body = "";
    if (q.type === "tf") {
      body = ["صح", "غلط"].map((o, oi) => T("teacher.quizBuilderHtml_2", { i, o, oi, p, q })).join("")
        + T("teacher.quizBuilderHtml_3");
    } else if (q.type === "text" || q.type === "fill") {
      body = T("teacher.quizBuilderHtml_4", { esc, i, p, q });
    } else if (q.type === "match") {
      body = (q.pairs || []).map((pr, j) => T("teacher.quizBuilderHtml_5", { esc, i, j, p, pr, q })).join("")
        + T("teacher.quizBuilderHtml_6", { i, p });
    } else if (q.type === "num") {
      body = T("teacher.quizBuilderHtml_7", { esc, i, p, q });
    } else if (q.type === "multi") {
      body = [0, 1, 2, 3].map((o) => T("teacher.quizBuilderHtml_8", { esc, i, o, p, q })).join("")
        + T("teacher.quizBuilderHtml_9");
    } else {
      body = [0, 1, 2, 3].map((o) => T("teacher.quizBuilderHtml_10", { esc, i, o, p, q })).join("")
        + T("teacher.quizBuilderHtml_11");
    }
    return T("teacher.quizBuilderHtml_12", { QTYPES, body, esc, i, p, q });
  }).join("");
}

export function bindQuizEditor(p, qs, rerender) {
  document.querySelectorAll(`[data-${p}qdel]`).forEach((b) => b.onclick = () => { qs.splice(Number(b.dataset[p + "qdel"]), 1); rerender(); });
  document.querySelectorAll(`[data-${p}qtype]`).forEach((el) => el.onchange = () => {
    const i = Number(el.dataset[p + "qtype"]);
    const keepImg = qs[i].img; // صورة السؤال تفضل موجودة عند تغيير نوعه
    qs[i] = qNew(el.value, qs[i].q);
    qs[i].img = keepImg || "";
    rerender();
  });
  document.querySelectorAll(`[data-${p}qt]`).forEach((el) => el.oninput = () => qs[Number(el.dataset[p + "qt"])].q = el.value);
  document.querySelectorAll(`[data-${p}qa]`).forEach((el) => el.oninput = () => qs[Number(el.dataset[p + "qa"])].answer = el.value);
  document.querySelectorAll(`[data-${p}qo]`).forEach((el) => {
    const [i, o] = el.dataset[p + "qo"].split("-").map(Number);
    el.oninput = () => qs[i].options[o] = el.value;
  });
  document.querySelectorAll(`[data-${p}qc]`).forEach((el) => {
    const [i, o] = el.dataset[p + "qc"].split("-").map(Number);
    el.onchange = () => qs[i].correct = o;
  });
  document.querySelectorAll(`[data-${p}qcm]`).forEach((el) => {
    const [i, o] = el.dataset[p + "qcm"].split("-").map(Number);
    el.onchange = () => {
      const arr = Array.isArray(qs[i].correct) ? qs[i].correct : [];
      qs[i].correct = el.checked ? arr.concat(o) : arr.filter((x) => x !== o);
    };
  });
  document.querySelectorAll(`[data-${p}qan]`).forEach((el) => el.oninput = () => qs[Number(el.dataset[p + "qan"])].answer = el.value);
  document.querySelectorAll(`[data-${p}qto]`).forEach((el) => el.oninput = () => qs[Number(el.dataset[p + "qto"])].tolerance = el.value);
  document.querySelectorAll(`[data-${p}qpa]`).forEach((el) => {
    const [i, j] = el.dataset[p + "qpa"].split("-").map(Number);
    el.oninput = () => qs[i].pairs[j].a = el.value;
  });
  document.querySelectorAll(`[data-${p}qpb]`).forEach((el) => {
    const [i, j] = el.dataset[p + "qpb"].split("-").map(Number);
    el.oninput = () => qs[i].pairs[j].b = el.value;
  });
  document.querySelectorAll(`[data-${p}qadd]`).forEach((b) => b.onclick = () => { qs[Number(b.dataset[p + "qadd"])].pairs.push({ a: "", b: "" }); rerender(); });
  document.querySelectorAll(`[data-${p}qbank]`).forEach((el) => el.onchange = () => qs[Number(el.dataset[p + "qbank"])].saveToBank = el.checked);
  document.querySelectorAll(`[data-${p}qimg]`).forEach((b) => b.onclick = () => {
    const f = document.querySelector(`[data-${p}qimgf="${b.dataset[p + "qimg"]}"]`);
    if (f) f.click();
  });
  document.querySelectorAll(`[data-${p}qimgf]`).forEach((el) => el.onchange = async () => {
    const i = Number(el.dataset[p + "qimgf"]);
    const file = el.files && el.files[0];
    if (!file) return;
    try { qs[i].img = await resizeQuestionImage(file); rerender(); }
    catch (err) { alert(err.message || "مشكلة في الصورة."); }
  });
  document.querySelectorAll(`[data-${p}qimgd]`).forEach((b) => b.onclick = () => { qs[Number(b.dataset[p + "qimgd"])].img = ""; rerender(); });
  document.querySelectorAll(`[data-${p}qpd]`).forEach((b) => b.onclick = () => {
    const [i, j] = b.dataset[p + "qpd"].split("-").map(Number);
    qs[i].pairs.splice(j, 1); rerender();
  });
}
