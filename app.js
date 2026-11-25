/* ---------- مشترك ---------- */
const app = document.getElementById("app");

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function closing() {
  return `<div class="closing">فكرة وإعداد: مهندس اسامه حسن عسس</div>`;
}

function statusChip(st) {
  if (st === "approved") return `<span class="chip green">مقبول</span>`;
  if (st === "rejected") return `<span class="chip red">مرفوض</span>`;
  return `<span class="chip amber">تحت المراجعة</span>`;
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
  showToast("حصل خطأ غير متوقع في الصفحة. حدّث الصفحة وجرّب تاني.", "bad");
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("عملية فشلت من غير التقاط:", e.reason);
  showToast("حصلت مشكلة في الاتصال أو التحميل. جرّب تاني.", "bad");
});

/* ---------- الشريط العلوي الثابت ----------
   اسم المنصة يمين، وشمال صورة المستخدم واسمه — الدوس عليهم يفتح حسابي.
   بيتحط فوق صفحات كل الأدوار بنفس الشكل. */
// أيقونة كاب التخرج (لوجو المستر) — SVG مضمّن للشريط العلوي
var LOGO_ICON_SVG = `<svg width="26" height="17" viewBox="0 0 164 100" xmlns="http://www.w3.org/2000/svg" style="display:block;"><polygon points="82,4 160,42 82,80 4,42" fill="#f59e0b"/><line x1="160" y1="42" x2="160" y2="76" stroke="#f59e0b" stroke-width="7" stroke-linecap="round"/><circle cx="160" cy="84" r="9" fill="#f59e0b"/></svg>`;

// اللوجو الكامل (كاب + المستر + خط كهرمان) لصفحتي الدخول والتسجيل
var LOGO_FULL_SVG = `<svg width="240" height="150" viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg"><polygon points="352,10 434,52 352,94 270,52" fill="#f59e0b"/><line x1="434" y1="52" x2="434" y2="104" stroke="#f59e0b" stroke-width="7" stroke-linecap="round"/><circle cx="434" cy="113" r="10" fill="#f59e0b"/><text x="240" y="222" text-anchor="middle" font-family="Cairo, sans-serif" font-weight="900" font-size="118" fill="#0f766e">المستر</text><rect x="130" y="248" width="220" height="10" rx="5" fill="#f59e0b"/></svg>`;

function platNavHtml(name, avatarUrl, profileHash) {
  const nm = String(name || "").trim();
  const av = avatarUrl
    ? `<img class="av" src="${avatarUrl}" alt="">`
    : `<span class="avinit">${esc(nm ? nm[0] : "؟")}</span>`;
  return `<div class="pnav"><div class="pnav-in">
    <a class="brand" href="#/login" style="display:flex; align-items:center; gap:7px;">${LOGO_ICON_SVG}<span style="font-weight:900; font-size:19px; color:#0f766e;">المستر</span></a>
    <button type="button" class="me" data-prof="${profileHash}"><span class="nm">${esc(nm)}</span>${av}</button>
  </div></div>`;
}

function bindPlatNav() {
  document.querySelectorAll(".pnav .me").forEach((b) => b.onclick = () => { location.hash = b.dataset.prof; });
}

/* ---------- الراوتر ---------- */
function route() {
  const h = location.hash || "#/login";
  if (!fbReady) { renderLoading(); return; }
  if (h === "#/register") return renderRegister();
  if (h === "#/login" || h === "#/" || h === "") return fbUser ? routeByRole() : renderLogin();
  if (!fbUser) return renderLogin();
  if (fbRole === "admin") {
    if (h.startsWith("#/admin")) return renderAdmin(h);
    return renderAdmin("#/admin");
  }
  if (fbRole === "teacher") {
    if (h === "#/teacher/profile") return renderTeacherProfile();
    if (h === "#/teacher/reports") return renderTeacherReports();
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
