import { dirOf, localeOf, makeTx, normLang, toggleLang } from "../domain/i18n.js";
import { setLocale } from "../domain/format.js";

/* ---------- اللغة: عربي (الأصل) / English ----------
   الواجهة مكتوبة بالعربي. لما الإنجليزي يتفعّل بنترجم النصوص الظاهرة (نصوص + placeholder/title) من قاموس بيتحمّل عند الطلب بس.
   من غير ما نلمس القوالب: مراقب خفيف بيترجم أي حاجة تتحط في الصفحة، ولو رجع للعربي بيرجّع الأصل. محتوى المدرسين (عناوين، أسئلة، أسماء) بيفضل زي ما اتكتب. */
const KEY = "t4kLang";
const ATTRS = ["placeholder", "title", "aria-label", "alt", "data-h"];
let lang = "ar", tx = null, loading = null, obs = null, busy = false, started = false;

const readStored = () => { try { return normLang(localStorage.getItem(KEY)); } catch (_) { return "ar"; } };
export const getLang = () => lang;
export const isEn = () => lang === "en";

function skip(n) {
  const p = n.parentElement;
  if (!p) return true;
  const t = p.nodeName;
  return t === "SCRIPT" || t === "STYLE" || t === "TEXTAREA" || t === "NOSCRIPT" || !!(p.closest && p.closest("[data-noi18n]"));
}
function doText(n) {
  const cur = n.nodeValue;
  if (n.__en !== undefined && cur === n.__en) return;
  if (!/[ء-ي٠-٩]/.test(cur)) { if (n.__ar !== undefined) { n.__ar = undefined; n.__en = undefined; } return; }
  const out = tx(cur);
  n.__ar = cur; n.__en = out;
  if (out !== cur) n.nodeValue = out;
}
function doAttrs(el) {
  for (const a of ATTRS) {
    if (!el.hasAttribute || !el.hasAttribute(a)) continue;
    const cur = el.getAttribute(a);
    const st = el.__aa && el.__aa[a];
    if (st && st.en === cur) continue;
    const out = tx(cur);
    (el.__aa || (el.__aa = {}))[a] = { ar: cur, en: out };
    if (out !== cur) el.setAttribute(a, out);
  }
}
function walk(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (!skip(root)) doText(root); return; }
  if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  doAttrs(root);
  let n = w.nextNode();
  while (n) { if (n.nodeType === 3) { if (!skip(n)) doText(n); } else doAttrs(n); n = w.nextNode(); }
}
function restore(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n = w.currentNode;
  while (n) {
    if (n.nodeType === 3 && n.__ar !== undefined && n.nodeValue === n.__en) { n.nodeValue = n.__ar; n.__ar = undefined; n.__en = undefined; }
    else if (n.nodeType === 1 && n.__aa) { for (const a in n.__aa) if (n.getAttribute(a) === n.__aa[a].en) n.setAttribute(a, n.__aa[a].ar); n.__aa = undefined; }
    n = w.nextNode();
  }
}
function syncButtons() {
  document.querySelectorAll("[data-langbtn]").forEach((b) => {
    const t = lang === "en" ? "ع" : "EN";
    if (b.textContent !== t) b.textContent = t;
    b.setAttribute("title", lang === "en" ? "العربية" : "English");
    b.setAttribute("aria-label", lang === "en" ? "Arabic" : "English");
    b.__aa = undefined;
  });
  // زرار عايم لو مفيش شريط علوي (شاشة الدخول)
  const real = document.querySelector("[data-langbtn]:not(.langfloat)");
  let fl = document.querySelector(".langfloat");
  if (real) { if (fl) fl.remove(); }
  else if (!fl) {
    fl = document.createElement("button");
    fl.type = "button"; fl.className = "themebtn langbtn langfloat"; fl.setAttribute("data-langbtn", "");
    fl.textContent = lang === "en" ? "ع" : "EN";
    document.body.appendChild(fl);
  }
}
function onMut(recs) {
  if (busy) return;
  busy = true;
  try {
    if (lang === "en" && tx) {
      for (const r of recs) {
        if (r.type === "childList") r.addedNodes.forEach((n) => walk(n));
        else if (r.type === "characterData") { if (r.target.__en !== undefined && r.target.nodeValue !== r.target.__en) { r.target.__en = undefined; } if (!skip(r.target)) doText(r.target); }
        else if (r.type === "attributes") doAttrs(r.target);
      }
    }
    syncButtons();
    if (obs) obs.takeRecords();
  } catch (e) { console.warn("الترجمة وقفت", e); }
  busy = false;
}
function startObserver() {
  if (obs) return;
  obs = new MutationObserver(onMut);
  obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
async function load() {
  if (tx) return tx;
  if (!loading) loading = import("./i18n-en.js").then((m) => (tx = makeTx(m.EN))).catch((e) => { loading = null; console.warn("قاموس الإنجليزي مش متاح", e); return null; });
  return loading;
}
function applyDoc() {
  const h = document.documentElement;
  h.setAttribute("lang", lang); h.setAttribute("dir", dirOf(lang));
  setLocale(localeOf(lang));
}
async function apply() {
  applyDoc();
  if (lang === "en") {
    await load();
    if (!tx || lang !== "en") return;
    busy = true; try { walk(document.body); document.title = tx(document.title); if (obs) obs.takeRecords(); } finally { busy = false; }
  } else {
    busy = true;
    try { restore(document.body); if (document.__arTitle) document.title = document.__arTitle; if (obs) obs.takeRecords(); } finally { busy = false; }
  }
  syncButtons();
}

let persistHook = null;
export function onLangSave(fn) { persistHook = fn; }
/** تغيير اللغة: بيتحفظ على الجهاز وعلى حساب المستخدم (لو داخل). من غير reload. */
export function setLang(l, { save = true } = {}) {
  l = normLang(l);
  if (l === lang && started) return Promise.resolve();
  lang = l;
  if (save) { try { localStorage.setItem(KEY, l); } catch (_) {} try { persistHook && persistHook(l); } catch (_) {} }
  return apply();
}
export const flipLang = () => setLang(toggleLang(lang));

/** بيتنادى مرة واحدة من boot/utils: اللغة المحفوظة + الزرار + المراقب. */
export function initI18n() {
  if (started) return;
  started = true;
  try {
    document.__arTitle = document.title;
    lang = readStored();
    startObserver();
    document.addEventListener("click", (e) => {
      const b = e.target && e.target.closest && e.target.closest("[data-langbtn]");
      if (b) { e.preventDefault(); flipLang(); }
    });
    window.__t4kLang = () => lang;
    applyDoc();
    // alert/confirm/prompt مش جزء من الـ DOM
    ["alert", "confirm", "prompt"].forEach((fn) => {
      const raw = window[fn].bind(window);
      window[fn] = function (m, ...rest) { return raw(lang === "en" && tx && m != null ? tx(m) : m, ...rest); };
    });
    if (lang === "en") apply(); else syncButtons();
  } catch (e) { console.warn("اللغة مش شغالة", e); }
}
