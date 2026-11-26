import { aboutState } from "../../shared/about-state.js";
import { BASE } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { waLink } from "../../shared/transfer.js";
import { getSettings } from "../../main/data.js";
import { aboutInitialOf, aboutParasOf, aboutRichParts, aboutSkillsOf, aboutWithDefaults, footerTextFrom } from "./about.presenter.js";
import { isDataReady } from "../../main/data.js";

/* ---------- نبذة عن المهندس وجملة أسفل الصفحات ----------
   بيتخزنوا في مستندين منفصلين تمامًا: settings/about للنبذة و settings/footer للجملة —
   تعديل أي واحد مبيلمسش التاني. القيم الافتراضية مأخوذة حرفيًا من سايت دروس البرمجة.
   settings/footer قراءته عامة عشان الجملة تظهر في صفحة الدخول قبل تسجيل الدخول. */

const aboutDefaultPhoto = () => BASE + "assets/photos/osama.jpg"; /* دالة عشان BASE يتقري وقت الاستخدام مش وقت التحميل */ // صورته من سايت الدروس — افتراضي لو مفيش صورة مخصصة


// دمج المحفوظ فوق الافتراضي — أي حقل فاضي محفوظ بياخد قيمته (مسح مقصود)
export function aboutGet() { return aboutWithDefaults(aboutState.cfg); }

export async function loadAboutSettings() {
  try {
    if (!isDataReady()) return;
    const d = await getSettings("about");
    aboutState.cfg = d ? (d || {}) : (aboutState.cfg || {});
  } catch (_) { aboutState.cfg = aboutState.cfg || {}; }
}

export async function loadFooterSettings() {
  try {
    if (!isDataReady()) return;
    const d = await getSettings("footer");
    aboutState.footerText = footerTextFrom(d, aboutState.footerText);
  } catch (_) {}
}

/* صورة المهندس: المخصصة (dataURL) أو الافتراضية، ووراها دايرة بأول حرف من الاسم
   لو الصورة فشلت في التحميل (onerror بيشيلها فيظهر الحرف) */
export function aboutPhotoHtml(a, size) {
  const src = a.photo || aboutDefaultPhoto();
  const init = esc(aboutInitialOf(a));
  return T("app.aboutPhotoHtml", { a, esc, init, size, src });
}

/* نص النبذة: [النص](الرابط) بيتحوّل للينك يفتح في تاب جديد، والباقي نص مُهربى */
export function aboutRich(text) {
  return aboutRichParts(text).map(({ p, m }) => {
    if (m) return T("app.aboutRich", { esc, m });
    return esc(p);
  }).join("");
}

/* صفحة «نبذة عن المهندس» الكاملة — نفس ترتيب سايت الدروس:
   صورة + اسم + لقب، مقدمة، شرائح المهارات، النبذة الطويلة (كل سطر فقرة)، أزرار التواصل */
export function aboutPageHtml() {
  const a = aboutGet();
  const skills = aboutSkillsOf(a);
  const paras = aboutParasOf(a);
  const btns = [];
  if (a.whatsapp) btns.push(T("app.aboutPageHtml", { a, waLink }));
  if (a.facebook) btns.push(T("app.aboutPageHtml_2", { a, esc }));
  if (a.youtube) btns.push(T("app.aboutPageHtml_3", { a, esc }));
  if (a.telegram) btns.push(T("app.aboutPageHtml_4", { a, esc }));
  if (a.linkedin) btns.push(T("app.aboutPageHtml_5", { a, esc }));
  return T("app.aboutPageHtml_6", { a, aboutPhotoHtml, aboutRich, btns, esc, paras, skills });
}

/* الكارت الصغير (تيذر) في آخر لوحات الأدوار: صورة + اسم + لقب + زرار يفتح صفحة النبذة */
export function aboutTeaserHtml() {
  const a = aboutGet();
  return T("app.aboutTeaserHtml", { a, aboutPhotoHtml, esc });
}
export function bindAboutTeaser() {
  document.querySelectorAll("[data-aboutmore]").forEach((b) => b.onclick = () => { location.hash = "#/about"; });
}





