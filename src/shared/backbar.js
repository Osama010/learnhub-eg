/* زرار «رجوع» موحّد لكل صفحات المنصة (ماعدا صفحة الهبوط والصفحة الرئيسية لكل دور).
   بيرجع بسجل المتصفح لو في صفحة قبلها جوه المنصة، وإلا بيروح لمكان احتياطي مناسب (لوحة الدور أو صفحة الهبوط).
   الصفحة اللي فيها زرار رجوع أصلاً قريب من أولها بتفضل زي ما هي. */
const ROOTS = { admin: "#/admin/analytics", teacher: "#/teacher/analytics", student: "#/student/analytics" };
const AUTH_HASHES = ["", "#", "#/", "#/login"];
const BACK_RE = /^[→←\s]*(رجوع|عودة|الصفحة الرئيسية)/;

/** دوال صافية (متاحة للاختبار) */
export function isRootPage(ctx) {
  const h = ctx.hash || "";
  if (!ctx.user) return !ctx.portal && AUTH_HASHES.includes(h);
  const root = ROOTS[ctx.role];
  if (!root) return true; // شاشات الحجب (موقوف، تأكيد إيميل...): الخروج منها بزرار تسجيل الخروج
  return h === root;
}
export function fallbackFor(ctx) {
  if (ctx.user) return ROOTS[ctx.role] || "";
  return ctx.portal ? "../" : "#/";
}
export function acceptablePrev(prev, ctx) {
  if (prev === undefined || prev === (ctx.hash || "")) return false;
  if (ctx.user && AUTH_HASHES.includes(prev)) return false;
  return true;
}

export function initBackBar(app, getCtx) {
  try {
    const stack = [location.hash || ""];
    window.addEventListener("hashchange", () => {
      const h = location.hash || "";
      if (stack.length >= 2 && stack[stack.length - 2] === h) stack.pop();
      else if (stack[stack.length - 1] !== h) stack.push(h);
    });
    const goBack = () => {
      try {
        const ctx = getCtx();
        const prev = stack[stack.length - 2];
        if (acceptablePrev(prev, ctx)) { history.back(); return; }
        const fb = fallbackFor(ctx);
        if (fb.startsWith("#")) location.hash = fb; else location.href = fb;
      } catch (e) { console.warn("زرار الرجوع مش شغال", e); }
    };
    const hasOwnBack = () => [...app.querySelectorAll("a,button")].some((el) => {
      if (el.closest(".t4k-back") || !BACK_RE.test((el.textContent || "").trim()) || !el.offsetParent) return false;
      return el.getBoundingClientRect().top + window.scrollY < 380;
    });
    let queued = false;
    const refresh = () => {
      queued = false;
      try {
        const ctx = getCtx();
        const cur = app.querySelector(".t4k-back");
        if (isRootPage(ctx) || app.querySelector(".landing") || app.querySelector(".spin")) { if (cur) cur.remove(); return; }
        if (cur) { if (cur.dataset.hash === (ctx.hash || "")) return; cur.remove(); }
        if (hasOwnBack()) return;
        const bar = document.createElement("div");
        bar.className = "t4k-back";
        bar.dataset.hash = ctx.hash || "";
        bar.innerHTML = '<button type="button" class="btn ghost small t4k-back-btn">→ رجوع</button>';
        bar.firstChild.onclick = goBack;
        const nav = app.querySelector(".pnav");
        if (nav) nav.insertAdjacentElement("afterend", bar); else { bar.classList.add("float"); app.insertBefore(bar, app.firstChild); }
      } catch (e) { console.warn("زرار الرجوع مش شغال", e); }
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(refresh); } };
    new MutationObserver(queue).observe(app, { childList: true, subtree: true });
    window.addEventListener("hashchange", queue);
    queue();
  } catch (e) { console.warn("زرار الرجوع مش شغال", e); }
}
