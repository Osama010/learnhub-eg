/* نبذة عن المهندس: القيم الافتراضية ودمجها وتقسيم النصوص. من غير DOM. */
const ABOUT_DEFAULTS = {
  name: "مهندس : اسامه حسن عسس",
  title: "معيد وباحث أكاديمي في علوم الحاسب والذكاء الاصطناعي — جامعة MTI",
  shortBio: "صاحب قناة Tech for Kids. بشرح البرمجة والذكاء الاصطناعي بأسلوب مبسط، وبشتغل على حلول تقنية بتحل مشاكل حقيقية، وعندي بحث علمي منشور في تصنيف صور تخطيط القلب بالذكاء الاصطناعي.",
  skills: "الذكاء الاصطناعي، تعلم الآلة، التعلم العميق، الرؤية الحاسوبية، تحليل الصور الطبية، البرمجة، Excel، التدريس الجامعي",
  longBio: "أسامة حسن عسس، معيد وباحث أكاديمي في مجال علوم الحاسب والذكاء الاصطناعي، أهتم بالبحث العلمي وتطوير الحلول التقنية التي تسهم في معالجة المشكلات الواقعية باستخدام التقنيات الحديثة.\nتتركز اهتماماتي البحثية في مجالات الذكاء الاصطناعي، وتعلم الآلة، والتعلم العميق، والرؤية الحاسوبية، وتحليل الصور الطبية، مع اهتمام خاص بتوظيف هذه التقنيات في التطبيقات الطبية وتحسين دقة الأنظمة الذكية.\nشاركت في إعداد ونشر بحث علمي بعنوان [ECG Image Classification Using Hybrid Machine Learning and Deep Learning Techniques](https://iapress.org/index.php/soic/article/view/4003/2032) في مجلة Statistics, Optimization & Information Computing (SOIC)، والذي تناول استخدام تقنيات تعلم الآلة والتعلم العميق في تصنيف صور تخطيط القلب الكهربائي.\nوعلى الصعيد الأكاديمي، أهتم بالتدريس الجامعي ونقل المعرفة، ومساعدة الطلاب على تطوير مهاراتهم العلمية والعملية في مجالات البرمجة وتكنولوجيا المعلومات.",
  whatsapp: "201556655614",
  facebook: "https://www.facebook.com/OsamaAsass",
  youtube: "https://www.youtube.com/@TechForKidsArabic",
  telegram: "",
  linkedin: "",
  photo: "", // فاضي = الصورة الافتراضية assets/photos/osama.jpg
};

export function aboutWithDefaults(cfg) { return Object.assign({}, ABOUT_DEFAULTS, cfg || {}); }
export function aboutSkillsOf(a) { return String(a.skills || "").split(/[،,]/).map((x) => x.trim()).filter(Boolean); }
export function aboutParasOf(a) { return String(a.longBio || "").split(/\n+/).map((p) => p.trim()).filter(Boolean); }
export function aboutInitialOf(a) { return String(a.name || "م").replace(/^مهندس\s*:?\s*/, "").trim()[0] || "م"; }
export function aboutRichParts(text) {
  return String(text || "").split(/(\[[^\]]+\]\([^)]+\))/g).map((p) => ({ p, m: p.match(/^\[([^\]]+)\]\(([^)]+)\)$/) }));
}
export function footerTextFrom(doc, current) { return doc && typeof doc.text === "string" && doc.text.trim() ? doc.text.trim() : current; }
