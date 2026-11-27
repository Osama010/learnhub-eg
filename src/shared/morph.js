/* تحديث جزئي للشاشة: بدل ما كل ضغطة تمسح الشاشة كلها وترسمها من الأول، بنقارن الـ HTML الجديد بالموجود ونغيّر الجزء اللي اتغير بس.
   الشريط العلوي والتابات والعناصر اللي ما اتغيرتش بتفضل هي هي نفس العقدة (من غير وميض ولا إعادة تحميل iframe/فيديو). */
const HANDLERS = ["onclick", "onchange", "oninput", "onsubmit", "onkeydown", "onkeyup", "onfocus", "onblur", "onmouseover", "onmouseout", "onscroll", "onload", "onerror"];
const PLACEHOLDER_MS = 250;
let pendingSpin = null;

const sig = (n) => (n.nodeType === 1 ? n.nodeName + "#" + (n.id || "") + "." + (n.getAttribute("class") || "") : "#" + n.nodeType);
const sameKind = (a, b) => a.nodeType === b.nodeType && a.nodeName === b.nodeName && (a.nodeType !== 1 || (a.id || "") === (b.id || ""));

function syncAttrs(a, b) {
  for (const at of Array.from(a.attributes)) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
  for (const at of Array.from(b.attributes)) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
}

function syncControl(a, b) {
  const tag = a.nodeName;
  const focused = a.ownerDocument.activeElement === a;
  if (tag === "INPUT") {
    if (a.type === "file") return;
    if (a.type === "checkbox" || a.type === "radio") { a.checked = b.hasAttribute("checked"); return; }
    if (!focused || a.getAttribute("value") !== b.getAttribute("value")) a.value = b.getAttribute("value") || "";
  } else if (tag === "TEXTAREA") {
    if (!focused || a.defaultValue !== b.textContent) a.value = b.textContent;
  }
}

function morphNode(a, b) {
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  syncAttrs(a, b);
  HANDLERS.forEach((h) => { if (a[h]) a[h] = null; });
  const tag = a.nodeName;
  if (tag === "TEXTAREA" || tag === "INPUT") { syncControl(a, b); return; }
  if (tag === "IFRAME" || tag === "VIDEO" || tag === "AUDIO" || tag === "CANVAS" || tag === "SCRIPT") return;
  morphChildren(a, b);
  if (tag === "SELECT") { const i = Array.from(b.options).findIndex((o) => o.hasAttribute("selected")); a.selectedIndex = i >= 0 ? i : 0; }
}

export function morphChildren(a, b) {
  const want = Array.from(b.childNodes);
  let i = 0;
  for (const nb of want) {
    let na = a.childNodes[i];
    if (na && !(sameKind(na, nb) && (nb.nodeType !== 1 || sig(na) === sig(nb)))) {
      // عنصر مضاف من برا (زي كروت اتحطت بعد الرسم) ممكن يكون قدام العنصر المطلوب: نتخطاه
      for (let k = 1, c = na.nextSibling; c && k <= 4; k++, c = c.nextSibling) {
        if (sameKind(c, nb) && sig(c) === sig(nb)) { while (a.childNodes[i] !== c) a.removeChild(a.childNodes[i]); na = c; break; }
      }
    }
    if (!na) { a.appendChild(nb); i++; continue; }
    if (sameKind(na, nb)) { morphNode(na, nb); i++; continue; }
    a.replaceChild(nb, na); i++;
  }
  while (a.childNodes.length > i) a.removeChild(a.lastChild);
}

/** بينقل تابات البوابة (الأزرار اللي فيها data-sh أو data-g) جوه الشريط العلوي. */
export function liftTabs(frag) {
  const kids = Array.from(frag.children);
  const nav = kids.find((k) => k.classList.contains("pnav"));
  const tabs = kids.find((k) => k.classList.contains("tabs") && k.querySelector("[data-sh],[data-g]"));
  if (!nav || !tabs) return false;
  const wrap = frag.ownerDocument.createElement("div");
  wrap.className = "ntabs";
  wrap.appendChild(tabs);
  nav.appendChild(wrap);
  return true;
}

const hasNav = (el) => !!Array.from(el.children).find((k) => k.classList && k.classList.contains("pnav"));

function finish(root) {
  try {
    const on = !!root.querySelector(".pnav .ntabs");
    root.ownerDocument.body.classList.toggle("has-ntabs", on);
    const act = root.querySelector(".ntabs .tab.active");
    if (act && act.scrollIntoView) act.scrollIntoView({ block: "nearest", inline: "center" });
  } catch (_) {}
}

/** setHtml = دالة بتكتب HTML بالطريقة العادية (innerHTML الأصلي). */
export function renderInto(root, html, setHtml) {
  const doc = root.ownerDocument;
  if (pendingSpin) { clearTimeout(pendingSpin); pendingSpin = null; }
  const tpl = doc.createElement("template");
  setHtml.call(tpl, html);
  const frag = tpl.content;
  liftTabs(frag);
  const newNav = hasNav(frag), oldNav = hasNav(root);
  if (!oldNav || !root.firstChild) { setHtml.call(root, ""); root.appendChild(frag); finish(root); return; }
  if (!newNav) {
    // شاشة تحميل: لو الشريط موجود بنسيبه وبنأخّر ظهور اللودر شوية عشان لو البيانات جت بسرعة ما يحصلش وميض
    if (frag.querySelector(".spin") && frag.children.length <= 2) {
      pendingSpin = setTimeout(() => {
        pendingSpin = null;
        Array.from(root.children).forEach((c) => { if (!c.classList.contains("pnav")) root.removeChild(c); });
        root.appendChild(frag);
      }, PLACEHOLDER_MS);
      return;
    }
    setHtml.call(root, ""); root.appendChild(frag); finish(root); return;
  }
  morphChildren(root, frag);
  finish(root);
}

/** بيركّب التحديث الجزئي على عنصر الصفحة الرئيسي: أي app.innerHTML = ... بقى تحديث جزئي. */
export function installPartialRender(root) {
  try {
    if (!root || root.__partial) return;
    const d = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
    const set = d.set;
    Object.defineProperty(root, "innerHTML", {
      configurable: true,
      get() { return d.get.call(this); },
      set(h) {
        try { renderInto(this, String(h == null ? "" : h), set); }
        catch (e) { console.warn("التحديث الجزئي فشل، رسم كامل", e); set.call(this, h); }
      },
    });
    root.__partial = true;
    // الصفحة بترجع لفوق لما نتنقل لشاشة تانية بس، مش لما نغيّر اختيار/فلتر جوه نفس الشاشة
    let navPending = true, navTimer = null;
    window.addEventListener("hashchange", () => { navPending = true; clearTimeout(navTimer); navTimer = setTimeout(() => { navPending = false; }, 3000); });
    navTimer = setTimeout(() => { navPending = false; }, 3000);
    const rawScrollTo = window.scrollTo.bind(window);
    window.scrollTo = function (a, b) {
      const top = (a === 0 && b === 0) || (a && typeof a === "object" && !a.left && !a.top);
      if (top && !navPending) return;
      if (top) { navPending = false; clearTimeout(navTimer); }
      return rawScrollTo.apply(null, arguments);
    };
    // التاب النشط بيتغير فورًا مع الضغطة
    document.addEventListener("click", (e) => {
      try {
        const t = e.target && e.target.closest && e.target.closest(".ntabs .tab[data-sh],.ntabs .tab[data-g]");
        if (!t) return;
        t.parentElement.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t));
      } catch (_) {}
    });
  } catch (e) { console.warn("التحديث الجزئي مش شغال", e); }
}
