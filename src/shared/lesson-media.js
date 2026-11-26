import { fbProfile } from "../core/session.js";
import { T } from "../core/templates.js";
import { esc } from "../core/utils.js";
import { getLessonMedia, getLessonFileChunk } from "../main/data.js";
import { b64ToBytes, videoEmbed } from "../domain/media.js";

/* ======================= وسائط الدرس: فيديو + PDF جوه المنصة ======================= */
// الروابط الأصلية متخزنة في lessonMedia/{lessonId} (مش على وثيقة الدرس) والطالب مبيشوفش أي رابط.
export const PDF_MAX_BYTES = 10 * 1024 * 1024;
const PDF_CHUNK_CHARS = 700000; // لازم يتقسم على 4 (base64)

// بيرجع {videoUrl, pdfUrl, pdfFile} من lessonMedia، وللدروس القديمة من وثيقة الدرس نفسها
export async function loadLessonMedia(l) {
  const out = { videoUrl: l.videoUrl || "", pdfUrl: l.pdfUrl || "", pdfFile: null };
  if (l.hasVideo || l.hasPdf) {
    try {
      const d = await getLessonMedia(l.id);
      if (d) {
        const m = d;
        out.videoUrl = m.videoUrl || out.videoUrl;
        out.pdfUrl = m.pdfUrl || out.pdfUrl;
        out.pdfFile = m.pdfFile || null;
      }
    } catch (e) { out.error = e; }
  }
  return out;
}

function t4kStyleOnce() {
  if (document.getElementById("t4k-media-css")) return;
  const st = document.createElement("style");
  st.id = "t4k-media-css";
  st.textContent = `
  .mplayer{position:relative;border-radius:14px;overflow:hidden;aspect-ratio:16/9;background:#0f172a;user-select:none;-webkit-user-select:none;}
  .mplayer iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}
  .mplayer .mshield{position:absolute;top:0;left:0;right:0;height:16%;z-index:3;background:transparent;}
  .mplayer .mfs{position:absolute;bottom:6px;left:8px;z-index:5;border:0;border-radius:8px;background:rgba(15,23,42,.72);color:#fff;font:600 13px Cairo,sans-serif;padding:5px 10px;cursor:pointer;}
  .mplayer.t4k-fs{position:fixed;inset:0;z-index:99999;border-radius:0;aspect-ratio:auto;width:100vw;height:100vh;}
  .mplayer:fullscreen{border-radius:0;aspect-ratio:auto;}
  .mwm{position:absolute;z-index:4;pointer-events:none;color:rgba(255,255,255,.55);text-shadow:0 0 4px rgba(0,0,0,.8);font:700 15px Cairo,sans-serif;white-space:nowrap;animation:mwmdrift 26s linear infinite;}
  @keyframes mwmdrift{0%{top:10%;left:6%}25%{top:70%;left:55%}50%{top:35%;left:68%}75%{top:78%;left:12%}100%{top:10%;left:6%}}
  .pdfbox{border:1px solid var(--line,#e2e8f0);border-radius:14px;background:#f1f5f9;padding:8px;max-height:75vh;overflow:auto;position:relative;}
  .pdfpage{position:relative;margin:0 auto 10px;max-width:100%;box-shadow:0 1px 6px rgba(0,0,0,.18);background:#fff;}
  .pdfpage canvas{display:block;width:100%;height:auto;}
  .pdfpage .pwm{position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center;color:rgba(100,116,139,.22);font:800 clamp(22px,6vw,46px) Cairo,sans-serif;transform:rotate(-28deg);white-space:nowrap;}
  `;
  document.head.appendChild(st);
}

function t4kToggleFs(box, btn) {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl === box || box.classList.contains("t4k-fs")) {
    if (fsEl === box) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
    box.classList.remove("t4k-fs");
    btn.textContent = "⛶ ملء الشاشة";
    return;
  }
  const req = box.requestFullscreen || box.webkitRequestFullscreen;
  if (req) { try { const r = req.call(box); if (r && r.catch) r.catch(() => { box.classList.add("t4k-fs"); }); btn.textContent = "✕ خروج"; return; } catch (_) {} }
  box.classList.add("t4k-fs");
  btn.textContent = "✕ خروج";
}

// بيبني مشغل الفيديو (من غير رابط ظاهر) ويحطه جوه el
function mountPlayer(el, url, wmName) {
  t4kStyleOnce();
  const emb = videoEmbed(url);
  if (!emb) { el.innerHTML = T("app.mountPlayer"); return null; }
  let src = emb.src;
  if (emb.kind === "youtube") src = emb.src.replace("www.youtube.com", "www.youtube-nocookie.com") + "?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&fs=0&disablekb=0";
  const box = document.createElement("div");
  box.className = "mplayer";
  box.setAttribute("data-kind", emb.kind);
  const cover = emb.kind === "youtube";
  box.innerHTML = T("app.mountPlayer_2", { cover, esc, src, wmName });
  box.oncontextmenu = (e) => e.preventDefault();
  const cv = box.querySelector(".mcover");
  // غلاف تشغيل: بيمنع ظهور زرار "Watch on YouTube" قبل أول تشغيل
  if (cv) cv.onclick = () => { box.querySelector("iframe").src = src + "&autoplay=1"; cv.remove(); };
  const btn = box.querySelector(".mfs");
  btn.onclick = () => t4kToggleFs(box, btn);
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) { box.classList.remove("t4k-fs"); btn.textContent = "⛶ ملء الشاشة"; } });
  el.innerHTML = "";
  el.appendChild(box);
  return box;
}

let _pdfjsP = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (_pdfjsP) return _pdfjsP;
  const base = (window.T4K_BASE || "./") + "vendor/pdfjs/";
  _pdfjsP = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = base + "pdf.min.js";
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.js"; res(window.pdfjsLib); };
    s.onerror = () => { _pdfjsP = null; rej(new Error("تعذر تحميل عارض الـ PDF")); };
    document.head.appendChild(s);
  });
  return _pdfjsP;
}

async function fetchPdfBytes(lessonId, n) {
  const chunks = await Promise.all(Array.from({ length: n }, (_, i) => getLessonFileChunk(lessonId, i)));
  return b64ToBytes(chunks.map((c) => { if (!c) throw new Error("الملف ناقص"); return c.data; }));
}
export async function fileToChunks(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  const step = 0x8000;
  for (let i = 0; i < buf.length; i += step) bin += String.fromCharCode.apply(null, buf.subarray(i, i + step));
  const b64 = btoa(bin);
  const out = [];
  for (let i = 0; i < b64.length; i += PDF_CHUNK_CHARS) out.push(b64.slice(i, i + PDF_CHUNK_CHARS));
  return out;
}

// عارض PDF جوه الصفحة: بيرسم الصفحات على canvas، وزرار تحميل، وعلامة مائية باسم الطالب
function mountPdf(el, l, media, wmName) {
  t4kStyleOnce();
  const drive = media.pdfUrl && String(media.pdfUrl).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
  if (!media.pdfFile && drive) {
    el.innerHTML = T("app.mountPdf", { drive });
    return;
  }
  if (!media.pdfFile) {
    el.innerHTML = media.pdfUrl ? T("app.mountPdf_2", { esc, media }) : T("app.mountPdf_3");
    return;
  }
  const f = media.pdfFile;
  el.innerHTML = T("app.mountPdf_4", { esc, f });
  const box = el.querySelector(".pdfbox"), status = el.querySelector(".pdf-status"), dl = el.querySelector(".pdf-dl");
  (async () => {
    try {
      const [bytes, lib] = await Promise.all([fetchPdfBytes(l.id, f.chunks), loadPdfJs()]);
      dl.disabled = false;
      dl.onclick = () => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        a.download = f.name || "lesson.pdf";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      };
      const pdf = await lib.getDocument({ data: bytes.slice() }).promise;
      status.remove();
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const vp0 = page.getViewport({ scale: 1 });
        const w = Math.max(320, Math.min(box.clientWidth - 16 || 700, 1000));
        const scale = (w / vp0.width) * Math.min(window.devicePixelRatio || 1, 2);
        const vp = page.getViewport({ scale });
        const wrap = document.createElement("div");
        wrap.className = "pdfpage";
        const cv = document.createElement("canvas");
        cv.width = vp.width; cv.height = vp.height;
        wrap.appendChild(cv);
        if (wmName) { const w2 = document.createElement("div"); w2.className = "pwm"; w2.textContent = wmName; wrap.appendChild(w2); }
        box.appendChild(wrap);
        await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      }
    } catch (e) {
      box.innerHTML = T("app.mountPdf_5", { e, esc });
    }
  })();
}

// بيعبّي حاويات data-media-video / data-media-pdf جوه root لدرس l
export async function mountLessonMedia(root, l, opts) {
  const o = opts || {};
  const vEl = root.querySelector("[data-media-video]"), pEl = root.querySelector("[data-media-pdf]");
  if (!vEl && !pEl) return;
  const media = await loadLessonMedia(l);
  const wm = o.student ? ((typeof fbProfile !== "undefined" && fbProfile && fbProfile.name) || "") : "";
  if (vEl) { if (media.videoUrl) mountPlayer(vEl, media.videoUrl, wm); else vEl.innerHTML = media.error ? T("app.mountLessonMedia") : ""; }
  if (pEl) { if (media.pdfUrl || media.pdfFile) mountPdf(pEl, l, media, wm); else pEl.innerHTML = media.error ? T("app.mountLessonMedia_2") : ""; }
  if (o.adminOpen && vEl && media.videoUrl) {
    const a = document.createElement("a"); a.className = "btn ghost"; a.target = "_blank"; a.rel = "noopener"; a.href = media.videoUrl; a.textContent = "فتح الأصل"; vEl.appendChild(a);
  }
}