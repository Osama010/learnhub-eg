/* بيتحمّل قبل الرسم عشان الثيم ميبانش فيه وميض: بيحط data-theme على الصفحة. */
try {
  var _t = localStorage.getItem("stTheme") || "auto";
  if (_t === "auto") _t = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", _t);
} catch (e) {}
