/* ---------- مشترك ---------- */
const app = document.getElementById("app");

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- نبذة عن المهندس وجملة أسفل الصفحات ----------
   بيتخزنوا في مستندين منفصلين تمامًا: settings/about للنبذة و settings/footer للجملة —
   تعديل أي واحد مبيلمسش التاني. القيم الافتراضية مأخوذة حرفيًا من سايت دروس البرمجة.
   settings/footer قراءته عامة عشان الجملة تظهر في صفحة الدخول قبل تسجيل الدخول. */
var footerText = "فكرة وإعداد: مهندس اسامه حسن عسس"; // الافتراضي لحد ما settings/footer يتقري

const ABOUT_DEFAULT_PHOTO = BASE + "photos/osama.jpg"; // صورته من سايت الدروس — افتراضي لو مفيش صورة مخصصة
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
  photo: "", // فاضي = الصورة الافتراضية photos/osama.jpg
};
var aboutCfg = null; // بيتملى من settings/about (null = لسه ما اتقريش)

// دمج المحفوظ فوق الافتراضي — أي حقل فاضي محفوظ بياخد قيمته (مسح مقصود)
function aboutGet() { return Object.assign({}, ABOUT_DEFAULTS, aboutCfg || {}); }

async function loadAboutSettings() {
  try {
    if (!fbDb) return;
    const d = await fbDb.collection("settings").doc("about").get();
    aboutCfg = d.exists ? (d.data() || {}) : (aboutCfg || {});
  } catch (_) { aboutCfg = aboutCfg || {}; }
}

async function loadFooterSettings() {
  try {
    if (!fbDb) return;
    const d = await fbDb.collection("settings").doc("footer").get();
    if (d.exists && typeof d.data().text === "string" && d.data().text.trim()) footerText = d.data().text.trim();
  } catch (_) {}
}

/* صورة المهندس: المخصصة (dataURL) أو الافتراضية، ووراها دايرة بأول حرف من الاسم
   لو الصورة فشلت في التحميل (onerror بيشيلها فيظهر الحرف) */
function aboutPhotoHtml(a, size) {
  const src = a.photo || ABOUT_DEFAULT_PHOTO;
  const init = esc(String(a.name || "م").replace(/^مهندس\s*:?\s*/, "").trim()[0] || "م");
  return `<span style="position:relative; display:inline-block; flex:none; width:${size}px; height:${size}px;">
    <span class="pavinit" style="width:${size}px; height:${size}px; font-size:${Math.round(size / 2.6)}px; border:3px solid #f59e0b;">${init}</span>
    <img src="${esc(src)}" alt="${esc(a.name)}" onerror="this.remove()" style="position:absolute; inset:0; width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; border:3px solid #f59e0b; background:var(--card, #fff);">
  </span>`;
}

/* نص النبذة: [النص](الرابط) بيتحوّل للينك يفتح في تاب جديد، والباقي نص مُهربى */
function aboutRich(text) {
  return String(text || "").split(/(\[[^\]]+\]\([^)]+\))/g).map((p) => {
    const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) return `<a href="${esc(m[2])}" target="_blank" rel="noopener" style="color:var(--primary-dark); font-weight:700;">${esc(m[1])}</a>`;
    return esc(p);
  }).join("");
}

/* صفحة «نبذة عن المهندس» الكاملة — نفس ترتيب سايت الدروس:
   صورة + اسم + لقب، مقدمة، شرائح المهارات، النبذة الطويلة (كل سطر فقرة)، أزرار التواصل */
function aboutPageHtml() {
  const a = aboutGet();
  const skills = String(a.skills || "").split(/[،,]/).map((x) => x.trim()).filter(Boolean);
  const paras = String(a.longBio || "").split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const btns = [];
  if (a.whatsapp) btns.push(`<a class="btn sm" style="background:#16a34a; color:#fff;" target="_blank" rel="noopener" href="${waLink(a.whatsapp, "أهلاً مهندس أسامة، معاك من منصة المستر.")}">تواصل واتساب</a>`);
  if (a.facebook) btns.push(`<a class="btn sm" style="background:#2563eb; color:#fff;" target="_blank" rel="noopener" href="${esc(a.facebook)}">صفحة الفيسبوك</a>`);
  if (a.youtube) btns.push(`<a class="btn sm" style="background:#dc2626; color:#fff;" target="_blank" rel="noopener" href="${esc(a.youtube)}">قناة Tech for Kids على يوتيوب</a>`);
  if (a.telegram) btns.push(`<a class="btn sm" style="background:#0284c7; color:#fff;" target="_blank" rel="noopener" href="${esc(a.telegram)}">تيليجرام</a>`);
  if (a.linkedin) btns.push(`<a class="btn sm" style="background:#0a66c2; color:#fff;" target="_blank" rel="noopener" href="${esc(a.linkedin)}">لينكدإن</a>`);
  return `<div class="card" style="max-width:760px; margin:0 auto 14px;">
    <div style="display:flex; gap:18px; align-items:center; flex-wrap:wrap;">
      ${aboutPhotoHtml(a, 104)}
      <div style="flex:1; min-width:220px;">
        <h1 style="margin:0; font-size:23px; color:var(--primary-dark);">${esc(a.name)}</h1>
        <div style="color:#b45309; font-weight:700; font-size:13.5px; margin-top:4px;">${esc(a.title)}</div>
      </div>
    </div>
    ${a.shortBio ? `<p style="font-size:15px; line-height:2; margin:16px 0 0;">${aboutRich(a.shortBio)}</p>` : ""}
    ${skills.length ? `<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:14px;">${skills.map((x) => `<span class="chip gray">${esc(x)}</span>`).join("")}</div>` : ""}
    ${paras.length ? `<hr style="border:none; border-top:1px dashed var(--line, #cbd5e1); margin:18px 0;">${paras.map((p) => `<p style="font-size:14.5px; line-height:2; margin:0 0 12px;">${aboutRich(p)}</p>`).join("")}` : ""}
    ${btns.length ? `<div class="btnrow" style="margin-top:16px; flex-wrap:wrap;">${btns.join("")}</div>` : ""}
  </div>`;
}

/* الكارت الصغير (تيذر) في آخر لوحات الأدوار: صورة + اسم + لقب + زرار يفتح صفحة النبذة */
function aboutTeaserHtml() {
  const a = aboutGet();
  return `<div class="card lcard" style="border-right:4px solid #f59e0b; display:flex; gap:12px; align-items:center;">
    ${aboutPhotoHtml(a, 52)}
    <div style="flex:1; min-width:150px;">
      <b style="font-size:14.5px;">${esc(a.name)}</b>
      <div class="muted" style="font-size:12.5px; margin-top:2px;">${esc(a.title)}</div>
    </div>
    <button type="button" class="btn sm ghost" data-aboutmore>اقرأ المزيد</button>
  </div>`;
}
function bindAboutTeaser() {
  document.querySelectorAll("[data-aboutmore]").forEach((b) => b.onclick = () => { location.hash = "#/about"; });
}

/* ---------- أرقام صفحة الهبوط (settings/stats، بيكتبها الأدمن) + حركات ---------- */
const STATS_DEFAULTS = { teachers: 10, lessons: 200, students: 1000 };
var statsCfg = null;
function statsGet() { return Object.assign({}, STATS_DEFAULTS, statsCfg || {}); }
async function loadStatsSettings() {
  try {
    if (!fbDb) return;
    const d = await fbDb.collection("settings").doc("stats").get();
    statsCfg = d.exists ? (d.data() || {}) : {};
  } catch (_) { statsCfg = statsCfg || {}; }
}
function reducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (_) { return false; }
}
/* عدّاد: من صفر لحد الرقم الثابت ويقف. لو الجهاز طالب تقليل الحركة بيظهر الرقم النهائي علطول */
function t4kCountUp(el, target) {
  const n = Math.max(0, Math.round(Number(target) || 0));
  const fmt = (v) => Math.round(v).toLocaleString("en");
  if (reducedMotion() || typeof requestAnimationFrame !== "function") { el.textContent = fmt(n) + "+"; return; }
  const dur = 1600, t0 = Date.now();
  const step = () => {
    const k = Math.min(1, (Date.now() - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(n * e) + (k >= 1 ? "+" : "");
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
/* ظهور تدريجي للعناصر .rv لما توصل للشاشة + تشغيل العدادات [data-count] */
function t4kObserveReveal(root) {
  const scope = root || document;
  const items = Array.from(scope.querySelectorAll(".rv, [data-count]"));
  const show = (el) => {
    el.classList.add("rv-in");
    if (el.hasAttribute("data-count") && !el.dataset.done) { el.dataset.done = "1"; t4kCountUp(el, el.getAttribute("data-count")); }
  };
  if (typeof IntersectionObserver === "undefined" || reducedMotion()) { items.forEach(show); return; }
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } }), { threshold: 0.15 });
  items.forEach((el) => io.observe(el));
}
/* كونفيتي احتفالي (CSS بس) — بيتشال لوحده بعد ثواني */
function t4kConfetti() {
  if (reducedMotion() || typeof document === "undefined" || !document.body) return;
  const box = document.createElement("div");
  box.className = "confetti";
  const colors = ["#0d9488", "#f59e0b", "#3b82f6", "#ef4444", "#22c55e", "#a855f7"];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement("i");
    p.style.cssText = `left:${Math.random() * 100}%; background:${colors[i % colors.length]}; animation-delay:${(Math.random() * 0.6).toFixed(2)}s; animation-duration:${(1.8 + Math.random() * 1.4).toFixed(2)}s; transform:rotate(${Math.floor(Math.random() * 360)}deg);`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3600);
}

/* ---------- صفحة الهبوط (الرابط الرئيسي لو مفيش جلسة) ---------- */
const LANDING_FEATURES = [
  ["📚", "دروس منظمة", "شروحات مرتبة حسب السنة والمادة"],
  ["📝", "كويزات وامتحانات", "تدريب فوري ونتيجة على طول"],
  ["🏆", "نقاط وترتيب", "تحفيز أسبوعي لكل طالب"],
  ["📱", "على الموبايل", "ثبّتها كتطبيق وادخل بضغطة"],
];
async function renderLanding() {
  app.innerHTML = `<div class="spin">ثانية واحدة...</div>`;
  let teachers = [];
  await Promise.all([
    loadAboutSettings(), loadFooterSettings(), loadStatsSettings(),
    (async () => {
      try {
        const snap = await fbDb.collection("teachersPublic").where("active", "==", true).get();
        teachers = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((t) => (t.subType || "free") === "free" || !t.subEnd || !t.subEnd.toDate || t.subEnd.toDate() >= new Date());
      } catch (_) { teachers = []; }
    })(),
  ]);
  const a = aboutGet(), st = statsGet();
  const skills = String(a.skills || "").split(/[،,]/).map((x) => x.trim()).filter(Boolean);
  const paras = String(a.longBio || "").split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const initial = (n) => esc(String(n || "م").replace(/^(مستر|أ\.?|د\.?)\s*/, "").trim()[0] || "م");
  const tcard = (t, i) => `<div class="lp-t rv" style="transition-delay:${Math.min(i, 8) * 70}ms;">
      <div class="lp-av">${t.avatar ? `<img src="${esc(t.avatar)}" alt="" onerror="this.remove()">` : ""}<span>${initial(t.name)}</span></div>
      <div class="lp-tn">${esc(t.name)}</div>
      <div class="lp-ts">${esc(t.subject || "")}</div>
      <button type="button" class="btn sm" data-pickt="${esc(t.id)}">سجّل مع المدرس ده</button>
    </div>`;
  app.innerHTML = `<div class="landing">
    <button type="button" class="themebtn" data-themebtn title="الوضع: تلقائي ← نهاري ← ليلي" style="position:fixed; top:14px; left:14px; z-index:60;">${themeIcon()}</button>
    <section class="lp-hero">
      <i class="lp-b" style="width:140px; height:140px; top:18px; right:6%;"></i>
      <i class="lp-b" style="width:80px; height:80px; bottom:34px; left:9%; animation-delay:1.8s;"></i>
      <i class="lp-b" style="width:46px; height:46px; top:44%; left:30%; animation-delay:3.2s;"></i>
      <div class="lp-logo">🎓</div>
      <h1>منصة المستر</h1>
      <p>دروس وكويزات وامتحانات مع أفضل المدرسين، في مكان واحد</p>
      <div class="lp-btns">
        <a class="lp-btn" href="student/">دخول الطالب</a>
        <a class="lp-btn o" href="student/#/register">إنشاء حساب</a>
      </div>
    </section>
    <div class="lp-wrap">
      <section class="card lp-stats rv">
        <div><b data-count="${esc(st.teachers)}">0</b><span>مدرس</span></div>
        <div><b data-count="${esc(st.lessons)}">0</b><span>درس</span></div>
        <div><b data-count="${esc(st.students)}">0</b><span>طالب</span></div>
      </section>
      <section class="card rv">
        <h2 class="lp-h">مدرسينا</h2>
        ${teachers.length ? `<div class="lp-grid">${teachers.map(tcard).join("")}</div>` : `<p class="muted center">المدرسين هيظهروا هنا قريب.</p>`}
      </section>
      <section class="card rv">
        <h2 class="lp-h">ليه المنصة؟</h2>
        <div class="lp-feat">${LANDING_FEATURES.map((f, i) => `<div class="rv" style="transition-delay:${i * 80}ms;"><i>${f[0]}</i><b>${f[1]}</b><span>${f[2]}</span></div>`).join("")}</div>
      </section>
      <section class="card rv">
        <h2 class="lp-h">عن المهندس</h2>
        <div class="lp-eng">
          ${aboutPhotoHtml(a, 84)}
          <div style="flex:1; min-width:180px;">
            <b style="font-size:16px;">${esc(a.name)}</b>
            <div class="muted" style="font-size:13px; margin:2px 0 6px;">${esc(a.title)}</div>
            <div style="font-size:14px; line-height:1.7;">${esc(a.shortBio)}</div>
          </div>
        </div>
        ${skills.length ? `<div class="lp-chips">${skills.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
        ${paras.length ? `<div class="btnrow" style="margin-top:10px;"><button type="button" class="btn sm ghost" id="lp-more">اقرأ النبذة كاملة</button></div>
        <div id="lp-long" style="display:none; margin-top:10px; font-size:14px; line-height:1.85;">${paras.map((p) => `<p>${aboutRich(p)}</p>`).join("")}</div>` : ""}
      </section>
      <div class="center" style="margin:14px 0 4px;"><a href="teacher/" style="color:var(--primary-dark); font-weight:700; font-size:14px;">دخول المدرسين</a></div>
      ${closing()}
    </div>
  </div>`;
  document.querySelectorAll("[data-themebtn]").forEach((b) => b.onclick = () => themeCycle());
  document.querySelectorAll("[data-pickt]").forEach((b) => b.onclick = () => {
    try { localStorage.setItem("t4kPreTeacher", b.dataset.pickt); } catch (_) {}
    location.href = "student/#/register";
  });
  const more = document.getElementById("lp-more");
  if (more) more.onclick = () => {
    const l = document.getElementById("lp-long");
    const open = l.style.display === "none";
    l.style.display = open ? "block" : "none";
    more.textContent = open ? "إخفاء النبذة" : "اقرأ النبذة كاملة";
  };
  window.scrollTo(0, 0);
  t4kObserveReveal(app);
}

/* دوال مشتركة (كانت في admin.js) */
function fmtTs(ts) {
  try { return ts && ts.toDate ? ts.toDate().toLocaleString("ar-EG") : "—"; } catch (e) { return "—"; }
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function closing() {
  return `<div class="closing">${esc(footerText)}</div>`;
}

function statusChip(st) {
  if (st === "approved") return `<span class="chip green">مقبول</span>`;
  if (st === "rejected") return `<span class="chip red">مرفوض</span>`;
  if (st === "suspended") return `<span class="chip red">⛔ موقوف</span>`;
  return `<span class="chip amber">تحت المراجعة</span>`;
}

/* ---------- الترمين ----------
   الأدمن يحدد الترم الحالي في settings/app { currentTerm: 1|2 }.
   المحتوى القديم (من غير حقل term) بيتعامل كأنه ترم أول.
   لما الترم الحالي يبقى الثاني، محتوى الترم الأول يفضل ظاهر للقراءة بس. */
var appSettings = { currentTerm: 1 };
function termCurrent() { return appSettings.currentTerm === 2 ? 2 : 1; }
function termOf(item) { return item && item.term === 2 ? 2 : 1; }
function termWritable(item) { return termOf(item) === termCurrent(); }
function termName(t) { return t === 2 ? "الترم الثاني" : "الترم الأول"; }

async function loadAppSettings() {
  try {
    const d = await fbDb.collection("settings").doc("app").get();
    if (d.exists && d.data().currentTerm === 2) appSettings.currentTerm = 2;
    else appSettings.currentTerm = 1;
  } catch (_) { appSettings.currentTerm = 1; }
}

/* تابات فلتر الترم (طالب/مدرس): الافتراضي الترم الحالي */
function termTabsHtml(active) {
  return `<div class="tabs" style="margin-bottom:10px;">
    <button type="button" class="tab ${active === 1 ? "active" : ""}" data-term="1">📘 الترم الأول</button>
    <button type="button" class="tab ${active === 2 ? "active" : ""}" data-term="2">📗 الترم الثاني</button>
  </div>`;
}
function bindTermTabs(onPick) {
  document.querySelectorAll("[data-term]").forEach((b) => b.onclick = () => onPick(Number(b.dataset.term)));
}
/* شارة «للقراءة بس» على محتوى ترم قد خلص */
function termRoChip(item) {
  return termWritable(item) ? "" : `<span class="chip gray">🔒 ترم منتهي — قراءة بس</span>`;
}

/* مودال تأكيد عام (حذف نهائي / نقل جماعي): بيرجع عنصر الأوفرلاي بعد إضافته */
function openConfirmOverlay(innerHtml) {
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `<div class="detailcard">${innerHtml}</div>`;
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  return ov;
}

/* ---------- النقل الجماعي بين الصفوف ----------
   شاشة منفصلة مخصصة للنقل عشان محدش ينقل بالغلط: اختيار صف → تحديد طلبة → صف جديد → تأكيد بالعدد.
   بعد النقل الطالب يشوف محتوى صفه الجديد بس، ودرجاته القديمة بتفضل على السيرفر للتقارير.
   «متخرج» لطلاب الثالث الثانوي اللي خلصوا. */
var transferState = { from: "", to: "", picked: {}, teacher: "" };
const GRADUATED = "🎓 متخرج";

function renderTransferPage(cfg) {
  const all = (cfg.students || []).filter((s) => s.status === "approved");
  if (!transferState.from || !GRADES.includes(transferState.from)) transferState.from = (all[0] && all[0].grade) || GRADES[0];
  const teachers = cfg.teachers || null; // الأدمن بس اللي بيبعت قايمة المدرسين (فلتر + عمود)
  if (teachers && transferState.teacher && !teachers.some((t) => t.id === transferState.teacher)) transferState.teacher = "";
  let list = all.filter((s) => s.grade === transferState.from);
  if (teachers && transferState.teacher) list = list.filter((s) => (s.teacherIds || []).includes(transferState.teacher));
  const tNames = (s) => ((s.teacherIds || []).map((id) => ((teachers.find((t) => t.id === id) || {}).name || "")).filter(Boolean).join("، ") || "—");
  const filteredTeacherName = teachers && transferState.teacher ? ((teachers.find((t) => t.id === transferState.teacher) || {}).name || "") : "";
  const targets = GRADES.filter((g) => g !== transferState.from).concat([GRADUATED]);
  if (!transferState.to || transferState.to === transferState.from) transferState.to = targets[0] || "";
  const pickedCount = list.filter((s) => transferState.picked[s.id]).length;
  const allChecked = list.length > 0 && list.every((s) => transferState.picked[s.id]);
  const content = `
    <div class="btnrow" style="margin:4px 0 12px;"><button type="button" class="btn ghost small" id="tr-back">→ رجوع</button></div>
    <h1 style="margin:0 0 12px;">📦 نقل جماعي بين الصفوف</h1>
    <p class="muted" style="font-size:13px; margin:0 0 12px;">الشاشة دي مخصصة للنقل بس — مفيش هنا أي إجراء تاني. النقل بيحتاج تأكيد بعد الاختيار.</p>
    <div class="card" style="border-right:4px solid var(--blue); margin-bottom:12px;">
      <div class="btnrow" style="flex-wrap:wrap; align-items:center;">
        <span style="font-size:14px;">من: <select id="tr-from" class="inp" style="width:auto; display:inline-block; padding:6px 10px;">${GRADES.map((g) => `<option ${g === transferState.from ? "selected" : ""}>${g}</option>`).join("")}</select></span>
        ${teachers ? `<span style="font-size:14px;">المدرس: <select id="tr-teacher" class="inp" style="width:auto; display:inline-block; padding:6px 10px;"><option value="">كل المدرسين</option>${teachers.map((t) => `<option value="${t.id}" ${transferState.teacher === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select></span>` : ""}
        <span style="font-size:14px;">إلى: <select id="tr-to" class="inp" style="width:auto; display:inline-block; padding:6px 10px;">${targets.map((g) => `<option ${g === transferState.to ? "selected" : ""}>${g}</option>`).join("")}</select></span>
        <button type="button" class="btn sm blue" id="tr-go" ${pickedCount ? "" : "disabled"}>نقل المحدد (${pickedCount})</button>
      </div>
      <p class="muted" style="font-size:12.5px; margin-top:6px;">بعد النقل الطالب يشوف محتوى صفه الجديد بس، ومش هيقدر يوصل لمحتوى الصف القديم. درجاته القديمة بتفضل محفوظة على السيرفر للتقارير — مش بتظهر له. «متخرج» لطلاب الثالث الثانوي اللي خلصوا.</p>
    </div>
    <div class="card">
      <div class="btnrow" style="justify-content:space-between; align-items:center;">
        <h2 style="font-size:18px; margin:0;">طلاب «${esc(transferState.from)}»${filteredTeacherName ? ` لـ«${esc(filteredTeacherName)}»` : ""} (${list.length})</h2>
        ${list.length ? `<label style="font-size:13.5px; cursor:pointer;"><input type="checkbox" id="tr-all" ${allChecked ? "checked" : ""} style="accent-color:var(--primary);"> تحديد الكل</label>` : ""}
      </div>
      ${list.length ? `<div style="overflow-x:auto;"><table class="ttable">
        <thead><tr><th></th><th>الاسم</th><th>السنة</th>${teachers ? "<th>المدرس</th>" : ""}<th>ولي الأمر</th></tr></thead>
        <tbody>${list.map((s) => `<tr>
          <td><input type="checkbox" data-trp="${s.id}" ${transferState.picked[s.id] ? "checked" : ""} style="accent-color:var(--primary);"></td>
          <td>${esc(s.name)}</td><td>${esc(s.grade || "—")}</td>${teachers ? `<td>${esc(tNames(s))}</td>` : ""}<td class="ltr">${esc(s.parentPhone || "غير مسجل")}</td>
        </tr>`).join("")}</tbody></table></div>` : `<p class="muted center" style="margin-top:10px;">مفيش طلبة مقبولين في الصف ده.</p>`}
    </div>`;
  /* الصفحة بتتلف بغلاف اللوحة بتاع الدور (أدمن أو مدرس) عشان التنقل يفضل شغال */
  if (cfg.wrap) cfg.wrap(content);
  else app.innerHTML = cfg.headerHtml + content + closing();
  document.getElementById("tr-back").onclick = () => { transferState.picked = {}; location.hash = cfg.backHash; };
  document.getElementById("tr-from").onchange = (e) => { transferState.from = e.target.value; transferState.picked = {}; renderTransferPage(cfg); };
  const trTeacher = teachers ? document.getElementById("tr-teacher") : null;
  if (trTeacher) trTeacher.onchange = (e) => { transferState.teacher = e.target.value; renderTransferPage(cfg); };
  document.getElementById("tr-to").onchange = (e) => { transferState.to = e.target.value; renderTransferPage(cfg); };
  const allBox = document.getElementById("tr-all");
  if (allBox) allBox.onchange = () => {
    list.forEach((s) => { transferState.picked[s.id] = allBox.checked; });
    renderTransferPage(cfg);
  };
  document.querySelectorAll("[data-trp]").forEach((b) => b.onchange = () => {
    transferState.picked[b.dataset.trp] = b.checked;
    renderTransferPage(cfg);
  });
  document.getElementById("tr-go").onclick = () => {
    const chosen = list.filter((s) => transferState.picked[s.id]);
    if (!chosen.length) return;
    const to = transferState.to;
    const ov = openConfirmOverlay(`
      <b style="font-size:17px;">📦 تأكيد النقل الجماعي</b>
      <p style="font-size:14.5px; margin:10px 0;">هيتم نقل <b>${chosen.length} ${chosen.length === 1 ? "طالب" : "طالب"}</b> من «${esc(transferState.from)}» إلى «${esc(to)}».</p>
      <p class="muted" style="font-size:12.5px;">الطلبة هيشوفوا محتوى الصف الجديد بس بعد النقل. درجاتهم السابقة هتفضل محفوظة في التقارير.</p>
      <div class="btnrow" style="margin-top:12px;"><button type="button" class="btn blue" id="cf-ok">تأكيد النقل</button><button type="button" class="btn ghost" id="cf-no">إلغاء</button></div>
      <p class="msg" id="cf-msg"></p>`);
    ov.querySelector("#cf-no").onclick = () => ov.remove();
    ov.querySelector("#cf-ok").onclick = async () => {
      const btn = ov.querySelector("#cf-ok");
      const m = ov.querySelector("#cf-msg");
      btn.disabled = true;
      try {
        for (let i = 0; i < chosen.length; i += 400) {
          const batch = fbDb.batch();
          chosen.slice(i, i + 400).forEach((s) => batch.update(fbDb.collection("students").doc(s.id), { grade: to }));
          await batch.commit();
        }
        transferState.picked = {};
        ov.remove();
        showToast(`اتنقل ${chosen.length} طالب لـ«${to}» ✅`, "good");
        if (cfg.onTransfer) cfg.onTransfer(chosen.length, transferState.from, to);
        await cfg.onDone();
      } catch (e) { btn.disabled = false; m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
    };
  };
  window.scrollTo(0, 0);
}

/* حذف طالب نهائيًا مع كل بياناته: محاولاته وتقييماته وفهرس تسجيله ومستنده.
   الحذف على دفعات (حد 450 عملية في الباتش الواحد). حساب الدخول في Firebase Auth
   بيفضل يتيم (مفيش حذف لمستخدمين Auth من الكلاينت) لكن من غير مستند ميعملش حاجة. */
async function deleteStudentEverywhere(s) {
  const id = s.id || s;
  const email = String(s.email || "").toLowerCase();
  const wipeCol = async (col) => {
    const snap = await fbDb.collection(col).where("studentId", "==", id).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = fbDb.batch();
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    return snap.size;
  };
  const attCount = await wipeCol("quizAttempts");
  const rateCount = await wipeCol("lessonRatings");
  const batch = fbDb.batch();
  batch.delete(fbDb.collection("students").doc(id));
  if (email) batch.delete(fbDb.collection("registrationLookup").doc(email));
  await batch.commit();
  return { attCount, rateCount };
}

/* حذف مدرس من كل حتة: كل محتواه (دروس وكويزات وامتحانات وإعلانات وبنك أسئلة وملاحظات)
   ومحاولات وتقييمات طلابه على محتواه، وشيله من قوائم طلابه، وحذف ملفه ونسخته العامة.
   حسابه في Firebase Auth بيفضل يتيم (زي حذف الطالب) — مفيش حذف Auth من المتصفح. */
async function deleteTeacherEverywhere(t) {
  const id = t.id || t;
  const wipeCol = async (col) => {
    const snap = await fbDb.collection(col).where("teacherId", "==", id).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = fbDb.batch();
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    return snap.size;
  };
  const counts = {};
  for (const col of ["lessons", "quizzes", "exams", "announcements", "questionBank", "studentNotes", "quizAttempts", "lessonRatings"]) {
    counts[col] = await wipeCol(col);
  }
  // شيل المدرس من قوائم طلابه
  const studs = await fbDb.collection("students").where("teacherIds", "array-contains", id).get();
  for (let i = 0; i < studs.docs.length; i += 400) {
    const batch = fbDb.batch();
    studs.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { teacherIds: firebase.firestore.FieldValue.arrayRemove(id) }));
    await batch.commit();
  }
  const batch = fbDb.batch();
  batch.delete(fbDb.collection("teachers").doc(id));
  batch.delete(fbDb.collection("teachersPublic").doc(id));
  await batch.commit();
  counts.students = studs.size;
  return counts;
}

/* مودال تأكيد الحذف النهائي — نفس التصميم المتفق عليه: بيوضح إيه اللي هيتحذف قبل التنفيذ */
function confirmDeleteStudent(s, onDone) {
  const ov = openConfirmOverlay(`
    <b style="font-size:17px;">⚠️ حذف الطالب نهائيًا؟</b>
    <p style="font-size:14px; margin:10px 0;">هيتم حذف <b>${esc(s.name || "")}</b> وكل بياناته من المنصة بالكامل:</p>
    <div class="card card-sub" style="margin:0 0 12px; font-size:13.5px;">
      ✖️ بياناته وحسابه &nbsp;·&nbsp; ✖️ كل محاولاته ودرجاته في الكويزات والامتحانات &nbsp;·&nbsp; ✖️ تقييماته للدروس
    </div>
    <p class="muted" style="font-size:12.5px;">مفيش تراجع عن الخطوة دي.</p>
    <div class="btnrow" style="margin-top:12px;"><button type="button" class="btn red" id="cd-ok">نعم، حذف نهائي</button><button type="button" class="btn ghost" id="cd-no">إلغاء</button></div>
    <p class="msg" id="cd-msg"></p>`);
  ov.querySelector("#cd-no").onclick = () => ov.remove();
  ov.querySelector("#cd-ok").onclick = async () => {
    const btn = ov.querySelector("#cd-ok");
    const m = ov.querySelector("#cd-msg");
    btn.disabled = true;
    m.className = "msg"; m.textContent = "بنحذف...";
    try {
      const w = await deleteStudentEverywhere(s);
      ov.remove();
      showToast(`اتحذف ${s.name || "الطالب"} نهائيًا مع ${w.attCount} محاولة و${w.rateCount} تقييم.`, "good");
      await onDone();
    } catch (e) { btn.disabled = false; m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
  };
}

// توحيد رقم موبايل مصري: يقبل 01xxxxxxxxx أو 1xxxxxxxxx أو بكود الدولة 20/0020/+20
// ويرجع الصيغة القياسية 01xxxxxxxxx، أو null لو الرقم مش مصري صح
function normalizeEgPhone(p) {
  let d = String(p || "").replace(/[^\d]/g, "");
  if (d.startsWith("0020")) d = d.slice(4);
  else if (d.startsWith("20") && d.length >= 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  return /^01[0-9]{9}$/.test(d) ? d : null;
}

function waLink(phone, text) {
  let p = String(phone || "").replace(/[^\d]/g, "");
  // توحيد الرقم المصري: 00201... → 201... و 01xxxxxxxxx → 201xxxxxxxxx (كود البلد من غير + ولا صفر)
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "2" + p;
  const t = encodeURIComponent(text);
  // على الموبايل: wa.me بيفتح التطبيق على طول. على الكمبيوتر: web.whatsapp.com/send
  // بيفتح الشات في واتساب ويب مباشرة من غير صفحة وسيطة
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  return isMobile
    ? `https://wa.me/${p}?text=${t}`
    : `https://web.whatsapp.com/send?phone=${p}&text=${t}`;
}

// توحيد إجابة نصية للتصحيح الآلي: بيتجاهل الهمزات والتشكيل والمسافات والحالة
function normalizeAnswer(s) {
  return String(s || "").trim().toLowerCase()
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

// رابط تضمين يوتيوب من أي صيغة رابط (watch / youtu.be / shorts / embed)
function ytEmbed(url) {
  const m = String(url || "").match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? "https://www.youtube.com/embed/" + m[1] : null;
}

// تجهيز تضمين فيديو الدرس: يقبل رابط يوتيوب أو رابط ملف فيديو على جوجل درايف
// (file/d/<id> أو open?id=<id> أو uc?id=<id>) — ويرجع نوع المضيف ورابط التضمين
function videoEmbed(url) {
  const yt = ytEmbed(url);
  if (yt) return { kind: "youtube", src: yt };
  const m = String(url || "").match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
  if (m) return { kind: "drive", src: "https://drive.google.com/file/d/" + m[1] + "/preview" };
  return null;
}

/* ---------- رسائل التنبيه في منتصف الشاشة ----------
   كل التحذيرات والرسائل المهمة بتظهر في كارت في نص الشاشة:
   الأخطاء حمرا وبتفضل قدام المستخدم لحد ما يدوس تمام،
   ورسائل النجاح خضرا وبتختفي لوحدها بعد ثواني. */
function showToast(msg, type) {
  const old = document.querySelector(".toastwrap");
  if (old) old.remove();
  const w = document.createElement("div");
  w.className = "toastwrap";
  const icon = type === "good" ? "✅" : "⚠️";
  w.innerHTML = `<div class="toastcard ${type === "good" ? "good" : "bad"}">
    <div class="ticon">${icon}</div>
    <div class="tmsg"></div>
    <button type="button" class="btn" style="min-width:120px;">تمام</button>
  </div>`;
  w.querySelector(".tmsg").textContent = msg || "";
  const close = () => { if (w.parentNode) w.remove(); };
  w.querySelector("button").onclick = close;
  w.onclick = (e) => { if (e.target === w) close(); };
  document.body.appendChild(w);
  if (type === "good") setTimeout(close, 3500);
}

/* التقاط أي خطأ غير متوقع في الصفحة: يظهر كرسالة مفهومة في النص
   بدل ما الصفحة تضرب، والتفاصيل الفنية بتتسجل في الكونسول للمراجعة */
window.addEventListener("error", (e) => {
  console.error("خطأ غير متوقع:", e.error || e.message);
  if (!fbUser) return; // بعد الخروج: أي خطأ متأخر من جلسة قديمة يتجاهل بهدوء
  showToast("حصل خطأ غير متوقع في الصفحة. حدّث الصفحة وجرّب تاني.", "bad");
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("عملية فشلت من غير التقاط:", e.reason);
  if (!fbUser) return; // بعد الخروج: أي عملية متأخرة من جلسة قديمة تتجاهل بهدوء
  showToast("حصلت مشكلة في الاتصال أو التحميل. جرّب تاني.", "bad");
});

/* حارس الصفحات المحمية: أي رندر متأخر بعد تسجيل الخروج يرجع لصفحة الدخول
   بدل ما يضرب قراءة فايرستور من غير جلسة فيظهر خطأ صلاحيات */
function bailIfSignedOut() {
  if (fbUser) return false;
  renderLogin();
  return true;
}

/* ---------- الشريط العلوي الثابت ----------
   اسم المنصة يمين، وشمال صورة المستخدم واسمه — الدوس عليهم يفتح حسابي.
   بيتحط فوق صفحات كل الأدوار بنفس الشكل. */
// أيقونة كاب التخرج (لوجو المستر) — SVG مضمّن للشريط العلوي
var LOGO_ICON_SVG = `<svg width="26" height="17" viewBox="0 0 164 100" xmlns="http://www.w3.org/2000/svg" style="display:block;"><polygon points="82,4 160,42 82,80 4,42" fill="#f59e0b"/><line x1="160" y1="42" x2="160" y2="76" stroke="#f59e0b" stroke-width="7" stroke-linecap="round"/><circle cx="160" cy="84" r="9" fill="#f59e0b"/></svg>`;

// اللوجو الكامل (كاب + المستر + خط كهرمان) لصفحتي الدخول والتسجيل
var LOGO_FULL_SVG = `<svg width="240" height="150" viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg"><polygon points="352,10 434,52 352,94 270,52" fill="#f59e0b"/><line x1="434" y1="52" x2="434" y2="104" stroke="#f59e0b" stroke-width="7" stroke-linecap="round"/><circle cx="434" cy="113" r="10" fill="#f59e0b"/><text x="240" y="222" text-anchor="middle" font-family="Cairo, sans-serif" font-weight="900" font-size="118" fill="#0f766e">المستر</text><rect x="130" y="248" width="220" height="10" rx="5" fill="#f59e0b"/></svg>`;

/* ---------- الوضع النهاري/الليلي: تلقائي (حسب الجهاز) أو اختيار يدوي محفوظ على الجهاز ---------- */
const THEME_KEY = "stTheme"; // auto | light | dark
function themeGet() { try { return localStorage.getItem(THEME_KEY) || "auto"; } catch (e) { return "auto"; } }
function themeResolve() {
  const t = themeGet();
  if (t !== "auto") return t;
  return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
}
function themeApply() {
  if (document.documentElement && document.documentElement.setAttribute) document.documentElement.setAttribute("data-theme", themeResolve());
}
function themeIcon() { return themeGet() === "dark" ? "🌙" : themeGet() === "light" ? "☀️" : "🌓"; }
function themeCycle() {
  const order = ["auto", "light", "dark"];
  const next = order[(order.indexOf(themeGet()) + 1) % order.length];
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  themeApply();
  document.querySelectorAll("[data-themebtn]").forEach((b) => { b.textContent = themeIcon(); });
}
// أول تسجيل: طبّق الوضع واسمع لتغيّر إعداد الجهاز في الوضع التلقائي
(function themeInit() {
  themeApply();
  if (window.matchMedia) {
    try {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (themeGet() === "auto") themeApply(); });
    } catch (e) {}
  }
})();

function platNavHtml(name, avatarUrl, profileHash) {
  const nm = String(name || "").trim();
  const av = avatarUrl
    ? `<img class="av" src="${avatarUrl}" alt="">`
    : `<span class="avinit">${esc(nm ? nm[0] : "؟")}</span>`;
  return `<div class="pnav"><div class="pnav-in">
    <a class="brand" href="#/login" style="display:flex; align-items:center; gap:7px;">${LOGO_ICON_SVG}<span style="font-weight:900; font-size:19px; color:var(--primary-dark);">المستر</span></a>
    <span class="mezone">
      <span class="mewrap">
        <button type="button" class="me" data-medrop><span class="nm">${esc(nm)}</span>${av}<span class="mechev">▾</span></button>
        <span class="medrop" style="display:none;">
          <button type="button" class="md-item" data-prof="${profileHash}">👤 حسابي</button>
          <span class="md-sep"></span>
          <button type="button" class="md-item md-out" data-mesout>🚪 خروج</button>
        </span>
      </span>
      <button type="button" class="themebtn" data-themebtn title="الوضع: تلقائي ← نهاري ← ليلي">${themeIcon()}</button>
    </span>
  </div></div>`;
}

function bindPlatNav() {
  // زرار الاسم/الصورة يفتح ويقفل قايمة الحساب
  document.querySelectorAll(".pnav [data-medrop]").forEach((b) => b.onclick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const d = b.parentElement.querySelector(".medrop");
    const willOpen = d.style.display === "none";
    document.querySelectorAll(".medrop").forEach((x) => { x.style.display = "none"; });
    if (willOpen) d.style.display = "block";
  });
  document.querySelectorAll(".pnav [data-prof]").forEach((b) => b.onclick = () => { location.hash = b.dataset.prof; });
  document.querySelectorAll("[data-themebtn]").forEach((b) => b.onclick = () => themeCycle());
  document.querySelectorAll(".pnav [data-mesout]").forEach((b) => b.onclick = () => signOut());
  // أي دوس برا القايمة يقفلها — بتتسجل مرة واحدة على مستوى الصفحة
  if (!window.__meDropBound) {
    window.__meDropBound = true;
    document.addEventListener("click", (e) => {
      if (e && e.target && e.target.closest && e.target.closest(".mewrap")) return;
      document.querySelectorAll(".medrop").forEach((x) => { x.style.display = "none"; });
    });
  }
}

/* ---------- اشتراكات المدرسين ----------
   الأدمن بيحدد لكل مدرس نوع اشتراك (مجاني/شهري/بالترم/سنوي) ومبلغ وتاريخ بداية ونهاية.
   المدرسين القدامى (من غير subType) معتبرين مجانيين. المدرس المجاني أو اللي ميعملش
   subType تاريخ نهاية مالوش انتهاء. الانتهاء بيقفل حساب المدرس ومحتواه على طلابه. */
const SUB_TYPES = { free: "مجاني", monthly: "شهري", term: "بالترم", year: "سنوي" };
const SUB_WARN_DAYS = 15; // تحذير "قرب ينتهي" قبل الانتهاء بالأيام دي

// تاريخ نهاية الاشتراك من مستند المدرس (Timestamp أو نص تاريخ أو null)
function subEndOf(t) {
  const v = t && t.subEnd;
  if (!v) return null;
  if (v.toDate) return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// حالة اشتراك مدرس: free (مجاني) / active (نشط) / expiring (قرب ينتهي) / expired (منتهي)
function subInfo(t) {
  const type = SUB_TYPES[t && t.subType] ? t.subType : "free";
  if (type === "free") return { type, status: "free", label: SUB_TYPES.free, daysLeft: null, end: null };
  const end = subEndOf(t);
  if (!end) return { type, status: "active", label: SUB_TYPES[type], daysLeft: null, end: null }; // نوع بس من غير تاريخ = من غير انتهاء
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000);
  const status = daysLeft < 0 ? "expired" : daysLeft <= SUB_WARN_DAYS ? "expiring" : "active";
  return { type, status, label: SUB_TYPES[type], daysLeft, end, amount: Number((t && t.subAmount) || 0) };
}

// شرائح عرض حالة الاشتراك في الجداول والتقارير
function subChip(si) {
  if (si.status === "free") return '<span class="chip gray">مجاني</span>';
  if (si.status === "expired") return '<span class="chip red">منتهي</span>';
  if (si.status === "expiring") return `<span class="chip amber">فاضل ${si.daysLeft} يوم</span>`;
  return '<span class="chip green">نشط</span>';
}

// تاريخ بصيغة yyyy-mm-dd لمدخلات التاريخ، و dd/mm/yyyy للعرض
function subDateStr(d) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function subFmtDate(d) {
  if (!d) return "—";
  return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
}

// تاريخ النهاية الافتراضي حسب نوع الاشتراك من تاريخ بداية معين (شهري +شهر، ترم +4 شهور، سنوي +سنة)
function subEndDefault(type, startStr) {
  const d = startStr ? new Date(startStr + "T00:00:00") : new Date();
  if (type === "monthly") d.setMonth(d.getMonth() + 1);
  else if (type === "term") d.setMonth(d.getMonth() + 4);
  else if (type === "year") d.setFullYear(d.getFullYear() + 1);
  return subDateStr(d);
}

/* بداية أسبوع النشاط: الجمعة بتبدأ أسبوع لوحة الشرف والنقاط الأسبوعية */
function weekStartFriday() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() - 5 + 7) % 7; // 5 = الجمعة
  d.setDate(d.getDate() - diff);
  return d;
}

/* الإعلان العام (broadcast): بيرجع نص الإعلان لو ساري للدور ده، أو null.
   المستند الحالي بيتخزن في broadcasts/current وبيحمل نص + جمهور + تاريخ انتهاء. */
function activeBroadcastText(bc, role) {
  try {
    if (!bc || !bc.text) return null;
    const until = bc.until && bc.until.toDate ? bc.until.toDate() : null;
    if (until && until <= new Date()) return null;
    if (bc.audience === "teachers" && role !== "teacher" && role !== "admin") return null;
    if (bc.audience === "students" && role !== "student" && role !== "admin") return null;
    return String(bc.text);
  } catch (_) { return null; }
}
/* بانر الإعلان — نفس الشكل في لوحة المدرس والطالب */
function broadcastBannerHtml(bc, role) {
  const txt = activeBroadcastText(bc, role);
  if (!txt) return "";
  return `<div class="card" style="border-right:4px solid var(--amber, #f59e0b); background:linear-gradient(135deg, rgba(245,158,11,.12), transparent 60%);">
    <b style="font-size:15px;">📢 إعلان من إدارة المنصة</b>
    <p style="font-size:14px; margin:6px 0 0; white-space:pre-wrap;">${esc(txt)}</p>
  </div>`;
}

/* ---------- تثبيت المنصة كتطبيق (PWA) ----------
   بنلقط حدث التثبيت ونحفظه، وبنظهر كارت «ثبّت التطبيق» في صفحة الدخول.
   على الآيفون مفيش حدث تثبيت — بنظهر تعليمات الإضافة من قائمة المشاركة بداله. */
var deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstallPrompt = e; });
function isIOS() { return /iphone|ipad|ipod/i.test((typeof navigator !== "undefined" && navigator.userAgent) || ""); }
function isStandalone() { return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || ((window.navigator || {}).standalone === true); }
function pwaInstallCard() {
  if (isStandalone() || localStorage.getItem("pwaDismissed") === "1") return "";
  if (deferredInstallPrompt) {
    return `<div class="card" style="max-width:520px; margin:14px auto 0; border:2px solid var(--amber);">
      <b style="font-size:15px;">ثبّت «المستر» على موبايلك</b>
      <p class="muted" style="font-size:12.5px; margin:6px 0 10px;">أيقونة على الشاشة الرئيسية تفتح المنصة بضغطة واحدة — من غير متجر ومن غير تحميل.</p>
      <div class="btnrow"><button type="button" class="btn sm" id="pwa-install">تثبيت التطبيق</button>
      <button type="button" class="btn sm ghost" id="pwa-dismiss">ليس الآن</button></div>
    </div>`;
  }
  if (isIOS()) {
    return `<div class="card" style="max-width:520px; margin:14px auto 0; border:2px solid var(--amber);">
      <b style="font-size:15px;">ثبّت «المستر» على موبايلك</b>
      <p class="muted" style="font-size:12.5px; margin:6px 0 10px;">من متصفح سفاري: دوس زرار المشاركة (مربع طالع منه سهم لفوق) واختار «إضافة إلى الشاشة الرئيسية» — هتطلعلك أيقونة المستر جنب تطبيقاتك.</p>
      <div class="btnrow"><button type="button" class="btn sm ghost" id="pwa-dismiss">فهمت</button></div>
    </div>`;
  }
  return "";
}
function bindPwaCard() {
  const i = document.getElementById("pwa-install");
  if (i) i.onclick = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch (_) {}
    deferredInstallPrompt = null;
    renderLogin();
  };
  const d = document.getElementById("pwa-dismiss");
  if (d) d.onclick = () => { localStorage.setItem("pwaDismissed", "1"); renderLogin(); };
}

/* شاشة المدرس الموقوف من الأدمن — لو دخل وهو موقوف يشوف الرسالة دي بدل لوحته */
function renderTeacherSuspended() {
  if (bailIfSignedOut()) return;
  app.innerHTML = `
    <div class="card center" style="max-width:520px; margin:60px auto;">
      <div style="font-size:44px;">⛔</div>
      <h1 style="font-size:22px; margin:8px 0;">تم إيقاف حسابك مؤقتًا</h1>
      <p class="muted">حسابك متوقف مؤقتًا من إدارة المنصة، ومحتواك مخفي عن طلابك دلوقتي. كلّم إدارة المنصة.</p>
      <div class="btnrow" style="justify-content:center;"><button type="button" class="btn ghost" id="so">خروج</button></div>
    </div>
    ${closing()}`;
  document.getElementById("so").onclick = signOut;
}

/* شاشة المدرس اللي اشتراكه انتهى — يشوف الرسالة دي بدل لوحته، ومحتواه بيتقفل على طلابه */
function renderTeacherSubExpired() {
  if (bailIfSignedOut()) return;
  const si = subInfo(fbProfile || {});
  app.innerHTML = `
    <div class="card center" style="max-width:520px; margin:60px auto;">
      <div style="font-size:44px;">⌛</div>
      <h1 style="font-size:22px; margin:8px 0;">اشتراكك في المنصة انتهى</h1>
      <p class="muted">اشتراكك ${si.end ? `(${si.label}) انتهى في <b class="ltr">${subFmtDate(si.end)}</b>` : "انتهى"}.
      حسابك متوقف دلوقتي ومحتواك مخفي عن طلابك لحد ما تجدد. كلّم إدارة المنصة عشان التجديد،
      وأول ما يتجدد كل حاجة هترجع زي ما هي.</p>
      <div class="btnrow" style="justify-content:center;"><button type="button" class="btn ghost" id="so">خروج</button></div>
    </div>
    ${closing()}`;
  document.getElementById("so").onclick = signOut;
}

/* صفحة «نبذة عن المهندس»: تاب مستقل متاح لكل الأدوار، محتواه من settings/about */
async function renderAboutPage() {
  if (bailIfSignedOut()) return;
  await Promise.all([loadAboutSettings(), loadFooterSettings()]);
  const profHash = fbRole === "admin" ? "#/admin/profile" : fbRole === "teacher" ? "#/teacher/profile" : "#/student/profile";
  const backHash = fbRole === "admin" ? "#/admin" : fbRole === "teacher" ? "#/teacher" : "#/student";
  const nm = (fbProfile && (fbProfile.name || "")) || "";
  const av = (fbProfile && (fbProfile.avatar || fbProfile.photoData)) || "";
  app.innerHTML = `
    ${platNavHtml(nm, av, profHash)}
    <div class="btnrow" style="margin:4px 0 12px;"><button type="button" class="btn ghost small" id="ab-back">→ رجوع</button></div>
    <h1 style="margin:0 0 12px;">👤 نبذة عن المهندس</h1>
    ${aboutPageHtml()}
    ${closing()}`;
  bindPlatNav();
  document.getElementById("ab-back").onclick = () => { location.hash = backHash; };
  window.scrollTo(0, 0);
}

/* ---------- الراوتر ---------- */
function renderWrongPortal() {
  const info = PORTAL_INFO[PORTAL] || {};
  const mine = rolePortal(fbRole);
  const where = { student: "student/", teacher: "teacher/", admin: "admin/" }[mine] || "./";
  app.innerHTML = `<div class="loginwrap"><div class="card center" style="max-width:520px; margin:60px auto;">
    <div style="font-size:42px;">${info.icon || "🔒"}</div>
    <h1 style="font-size:20px; margin:8px 0;">${esc(info.title || "")}</h1>
    <p class="muted">الحساب اللي داخل بيه مش حساب ${esc({ student: "طالب", teacher: "مدرس", admin: "أدمن" }[PORTAL] || "")}. اخرج وادخل من الرابط الخاص بحسابك.</p>
    <div class="btnrow" style="justify-content:center;"><button type="button" class="btn" id="wp-out">خروج</button></div>
  </div></div>`;
  document.getElementById("wp-out").onclick = signOut;
}

function route() {
  const h = location.hash || "#/login";
  if (!fbReady) { renderLoading(); return; }
  if (!PORTAL && !fbUser && (location.hash === "" || location.hash === "#" || location.hash === "#/")) return renderLanding();
  if (h === "#/register") return (!PORTAL || PORTAL === "student") ? renderRegister() : renderLogin();
  if (h === "#/login" || h === "#/" || h === "") return fbUser ? routeByRole() : renderLogin();
  if (!fbUser) return renderLogin();
  // بوابة دور: حساب من دور تاني يوقف هنا برسالة واضحة (الحماية الحقيقية في القواعد)
  if (PORTAL && rolePortal(fbRole) && rolePortal(fbRole) !== PORTAL) return renderWrongPortal();
  if (fbRole === "teacherSuspended") return renderTeacherSuspended();
  if (fbRole === "teacherSubExpired") return renderTeacherSubExpired();
  // بوابة تأكيد الإيميل: حساب جديد لسه مفعّلش إيميله يقف هنا مهما كان الرابط
  if (needsEmailVerify()) return renderVerifyGate();
  if (h === "#/about") return renderAboutPage();
  if (fbRole === "admin") {
    if (h.startsWith("#/admin")) return renderAdmin(h);
    return renderAdmin("#/admin");
  }
  if (fbRole === "teacher") {
    if (h === "#/teacher/profile") return renderTeacherProfile();
    if (h === "#/teacher/reports") return renderTeacherReports();
    if (h === "#/teacher/transfer") return renderTeacherTransfer();
    if (h === "#/teacher/announcements") return renderTeacherAnnouncements();
    if (h.startsWith("#/teacher/lesson/")) {
      const lid = decodeURIComponent(h.slice("#/teacher/lesson/".length));
      return renderTeacherLessonView(lid);
    }
    if (h.startsWith("#/teacher/lessons")) {
      const st = decodeURIComponent(h.slice("#/teacher/lessons".length).replace(/^\//, "") || "");
      return renderTeacherLessons(st || null);
    }
    return renderTeacherDash();
  }
  if (fbRole === "student") {
    if (h === "#/student") return renderStudentHome();
    if (h === "#/student/quizexams") return renderStudentQuizExams();
    if (h === "#/student/upcoming") return renderStudentUpcoming();
    if (h === "#/student/mistakes") return renderStudentMistakes();
    if (h === "#/student/library") return renderStudentLibrary();
    if (h === "#/student/ann") return renderStudentAnn();
    if (h === "#/student/grades") return renderStudentGrades();
    if (h === "#/student/profile") return renderStudentProfile();
    if (h.startsWith("#/student/lesson/")) {
      const lid = decodeURIComponent(h.slice("#/student/lesson/".length));
      return renderStudentLesson(lid);
    }
    if (h.startsWith("#/student/quiz/")) {
      const qid = decodeURIComponent(h.slice("#/student/quiz/".length));
      return renderStudentTake(qid, false);
    }
    if (h.startsWith("#/student/exam/")) {
      const eid = decodeURIComponent(h.slice("#/student/exam/".length));
      return renderStudentTake(eid, true);
    }
    return renderStudentHome();
  }
  renderLogin();
}

function routeByRole() {
  if (fbRole === "admin") location.hash = "#/admin";
  else if (fbRole === "teacher") location.hash = "#/teacher";
  else if (fbRole === "student") location.hash = "#/student";
  else location.hash = "#/login";
}

function renderLoading() {
  app.innerHTML = `<div class="spin">ثانية واحدة...</div>`;
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();

/* ======================= وسائط الدرس: فيديو + PDF جوه المنصة ======================= */
// الروابط الأصلية متخزنة في lessonMedia/{lessonId} (مش على وثيقة الدرس) والطالب مبيشوفش أي رابط.
const PDF_MAX_BYTES = 10 * 1024 * 1024;
const PDF_CHUNK_CHARS = 700000; // لازم يتقسم على 4 (base64)
function lessonHasVideo(l) { return !!(l && (l.hasVideo || l.videoUrl)); }
function lessonHasPdf(l) { return !!(l && (l.hasPdf || l.pdfUrl)); }

// بيرجع {videoUrl, pdfUrl, pdfFile} من lessonMedia، وللدروس القديمة من وثيقة الدرس نفسها
async function loadLessonMedia(l) {
  const out = { videoUrl: l.videoUrl || "", pdfUrl: l.pdfUrl || "", pdfFile: null };
  if (l.hasVideo || l.hasPdf) {
    try {
      const d = await fbDb.collection("lessonMedia").doc(l.id).get();
      if (d.exists) {
        const m = d.data();
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
  if (!emb) { el.innerHTML = `<p class="muted center">الفيديو مش متاح.</p>`; return null; }
  let src = emb.src;
  if (emb.kind === "youtube") src = emb.src.replace("www.youtube.com", "www.youtube-nocookie.com") + "?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&fs=0&disablekb=0";
  const box = document.createElement("div");
  box.className = "mplayer";
  box.setAttribute("data-kind", emb.kind);
  const cover = emb.kind === "youtube";
  box.innerHTML = `<iframe ${cover ? "" : `src="${esc(src)}"`} title="فيديو الدرس" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
    ${cover ? `<button type="button" class="mcover" aria-label="تشغيل" style="position:absolute;inset:0;z-index:6;border:0;cursor:pointer;background:linear-gradient(135deg,#0f172a,#134e4a);color:#fff;font-size:54px;">▶</button>` : ""}
    <div class="mshield"></div>
    ${wmName ? `<span class="mwm">${esc(wmName)}</span>` : ""}
    <button type="button" class="mfs">⛶ ملء الشاشة</button>`;
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

function b64ToBytes(parts) {
  const arrs = parts.map((b) => { const bin = atob(b); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; });
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let o = 0; arrs.forEach((a) => { out.set(a, o); o += a.length; });
  return out;
}
async function fetchPdfBytes(lessonId, n) {
  const snaps = await Promise.all(Array.from({ length: n }, (_, i) => fbDb.collection("lessonFileChunks").doc(lessonId + "_" + i).get()));
  return b64ToBytes(snaps.map((s) => { if (!s.exists) throw new Error("الملف ناقص"); return s.data().data; }));
}
async function fileToChunks(file) {
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
    el.innerHTML = `<div class="mplayer" style="aspect-ratio:3/4;max-height:80vh;"><iframe src="https://drive.google.com/file/d/${drive[1]}/preview"></iframe><div class="mshield" style="height:56px;left:auto;width:64px;"></div></div>`;
    return;
  }
  if (!media.pdfFile) {
    el.innerHTML = media.pdfUrl ? `<a class="btn ghost" href="${esc(media.pdfUrl)}" target="_blank" rel="noopener">📄 فتح ملف الـ PDF</a>` : `<p class="muted center">الملف مش متاح.</p>`;
    return;
  }
  const f = media.pdfFile;
  el.innerHTML = `<div class="btnrow" style="margin-bottom:8px;justify-content:space-between;"><span class="muted" style="font-size:13px;">📄 ${esc(f.name || "ملف PDF")}</span><button type="button" class="btn ghost pdf-dl" disabled>⬇ تحميل الملف</button></div>
    <div class="pdfbox"><p class="muted center pdf-status">جاري تحميل الملف…</p></div>`;
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
      box.innerHTML = `<p class="msg bad">مشكلة في فتح الملف: ${esc(e.message || String(e))}</p>`;
    }
  })();
}

// بيعبّي حاويات data-media-video / data-media-pdf جوه root لدرس l
async function mountLessonMedia(root, l, opts) {
  const o = opts || {};
  const vEl = root.querySelector("[data-media-video]"), pEl = root.querySelector("[data-media-pdf]");
  if (!vEl && !pEl) return;
  const media = await loadLessonMedia(l);
  const wm = o.student ? ((typeof fbProfile !== "undefined" && fbProfile && fbProfile.name) || "") : "";
  if (vEl) { if (media.videoUrl) mountPlayer(vEl, media.videoUrl, wm); else vEl.innerHTML = media.error ? `<p class="msg bad">مش قادر أحمّل الفيديو.</p>` : ""; }
  if (pEl) { if (media.pdfUrl || media.pdfFile) mountPdf(pEl, l, media, wm); else pEl.innerHTML = media.error ? `<p class="msg bad">مش قادر أحمّل الملف.</p>` : ""; }
  if (o.adminOpen && vEl && media.videoUrl) {
    const a = document.createElement("a"); a.className = "btn ghost"; a.target = "_blank"; a.rel = "noopener"; a.href = media.videoUrl; a.textContent = "فتح الأصل"; vEl.appendChild(a);
  }
}
