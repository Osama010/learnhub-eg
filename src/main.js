/* نقطة الدخول: بنحمّل القوالب الأول (لأن بعض الموديولات بتستخدمها وقت التحميل)، وبعدين نشغّل التطبيق. */
import { loadTemplates } from "./core/templates.js";

try {
  await loadTemplates();
  await import("./boot.js");
} catch (e) {
  console.error(e);
  document.getElementById("app").innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif">تعذر تحميل المنصة. اتأكد من النت وجرب تحدّث الصفحة.</div>';
}
