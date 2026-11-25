/* ---------- بوابة الطالب ----------
   أول دخول بعد القبول: إيميل + الرقم السري → يختار باسورده → دخول عادي.
   لو عنده حساب Auth من غير باسورد معروف، الرقم السري بيأكد هويته. */

async function renderStudentHome() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (fbRole === "blocked") {
    const st = fbProfile && fbProfile.status;
    const isSus = st === "suspended";
    app.innerHTML = `
      <div class="card center" style="max-width:520px; margin:60px auto;">
        <div style="font-size:44px;">${isSus ? "⛔" : "⏳"}</div>
        <h1 style="font-size:22px; margin:8px 0;">${isSus ? "تم إيقاف حسابك مؤقتًا" : st === "rejected" ? "طلبك اترفض" : "طلبك لسه تحت المراجعة"}</h1>
        <p class="muted">${isSus ? "حسابك متوقف مؤقتًا من إدارة المنصة. كلّم مدرسك أو إدارة المنصة." : st === "rejected" ? "للأسف طلبك ما اتقبلش. لو في خطأ كلّم مدرسك." : "المدرس لسه ما وافقش على طلبك. ارجع كمان شوية."}</p>
        <div class="btnrow" style="justify-content:center;"><button type="button" class="btn ghost" id="so">خروج</button></div>
      </div>
      ${closing()}`;
    document.getElementById("so").onclick = signOut;
    return;
  }
  if (fbRole === "unknown") {
    app.innerHTML = `
      <div class="card center" style="max-width:520px; margin:60px auto;">
        <h1 style="font-size:22px; margin:8px 0;">الحساب ده مش متسجل كطالب</h1>
        <p class="muted">لو انت طالب جديد سجّل من صفحة التسجيل الأول.</p>
        <div class="btnrow" style="justify-content:center;"><button type="button" class="btn ghost" id="so">خروج</button></div>
      </div>
      ${closing()}`;
    document.getElementById("so").onclick = signOut;
    return;
  }
  const s = fbProfile || {};
  // طالب قديم من غير رقم ولي أمر؟ شاشة إلزامية قبل أي صفحة تانية لحد ما يسجله
  if (!s.parentPhone) return renderParentPhoneGate();
  return renderStudentDash();
}

/* ---------- واجهة الطالب: التابات والتحميل ----------
   الطالب بيشوف محتوى مدرسيه اللي مسجل معاهم بس: المحتوى المخصص لصفه + محتوى "كل الصفوف" في مرحلته.
   الدروس المجدولة بتظهر بشارة وتتفتح في معادها. الامتحانات بتحترم الفتح والقفل والقفل اليدوي. */
let studentData = { teachers: [], lessons: [], quizzes: [], exams: [], ann: [], attempts: [] };

/* تاب الترم الحالي في صفحات الطالب — الافتراضي الترم الحالي اللي الأدمن محدده */
var sTermTab = null;
function sTerm() {
  if (sTermTab !== 1 && sTermTab !== 2) sTermTab = termCurrent();
  return sTermTab;
}
/* المدرسين الموقوف عنهم الطالب (قرار المدرس نفسه أو الأدمن) */
function sSuspendedSet() {
  const arr = (fbProfile && fbProfile.suspendedBy) || [];
  return new Set(Array.isArray(arr) ? arr : []);
}
/* هل العنصر ده لمدرس موقوف عن الطالب؟ */
function sTeacherLocked(item) {
  return !!(item && item.teacherId && sSuspendedSet().has(item.teacherId));
}
/* المدرسين الموقوفين من الأدمن (النسخة العامة active=false) — محتواهم مقفول على كل طلابهم */
function sAdminSuspendedSet() {
  return new Set((studentData.teachers || []).filter((t) => t.active === false).map((t) => t.id));
}

function studentTabs(active) {
  const t = (id, h, lbl) => `<button type="button" class="tab ${active === id ? "active" : ""}" data-sh="${h}">${lbl}</button>`;
  return platNavHtml((fbProfile && fbProfile.name) || "", (fbProfile && fbProfile.avatar) || "", "#/student/profile")
    + `<div class="tabs">${t("lessons", "#/student", "دروسي")}${t("quiz", "#/student/quizexams", "الكويزات والامتحانات")}${t("upcoming", "#/student/upcoming", "القادم")}${t("library", "#/student/library", "المكتبة")}${t("ann", "#/student/ann", "الإعلانات")}${t("grades", "#/student/grades", "درجاتي")}</div>`;
}

function bindStudentTabs() {
  document.querySelectorAll("[data-sh]").forEach((b) => b.onclick = () => { location.hash = b.dataset.sh; });
  bindPlatNav();
}

// اسم المدرس مع صورته الصغيرة (بتتعرض لطلابه من النسخة العامة)
function sTeacherChip(tid, nameFallback) {
  const t = (studentData.teachers || []).find((x) => x.id === tid) || {};
  const nm = nameFallback || t.name || "";
  const av = t.avatar
    ? `<img src="${t.avatar}" alt="" style="width:22px; height:22px; border-radius:50%; object-fit:cover; vertical-align:middle; margin-left:4px; border:1.5px solid var(--primary-soft);">`
    : "";
  return av + esc(nm);
}

async function studentLoadAll() {
  const allTids = ((fbProfile && fbProfile.teacherIds) || []).slice(0, 30);
  // محتوى المدرس الموقوف عن الطالب محظور بقواعد الأمان — ما نطلبهوش أصلاً عشان الاستعلام ما يترفضش كله.
  // أسماء المدرسين (teachersPublic) بنجيبها لكل المدرسين عشان كارت القفل يظهر باسم المدرس.
  // أسماء المدرسين الأول (teachersPublic فيها active): نعرف منها المدرس الموقوف من الأدمن
  // ونستبعده من استعلامات المحتوى، لأن قواعد الأمان بترفض محتواه فالاستعلام كله كان هيترفض
  const tchunks = [];
  for (let i = 0; i < allTids.length; i += 10) tchunks.push(allTids.slice(i, i + 10));
  const teachers = tchunks.length
    ? await Promise.all(tchunks.map((c) => fbDb.collection("teachersPublic").where(firebase.firestore.FieldPath.documentId(), "in", c).get()))
        .then((ss) => ss.flatMap((sn) => sn.docs.map((d) => ({ id: d.id, ...d.data() }))))
    : [];
  const sus = sSuspendedSet();
  teachers.forEach((t) => { if (t.active === false) sus.add(t.id); });
  const tids = allTids.filter((t) => !sus.has(t));
  const chunks = [];
  for (let i = 0; i < tids.length; i += 10) chunks.push(tids.slice(i, i + 10));
  const inQuery = async (col) => {
    if (!chunks.length) return [];
    const snaps = await Promise.all(chunks.map((c) => fbDb.collection(col).where("teacherId", "in", c).get()));
    return snaps.flatMap((sn) => sn.docs.map((d) => ({ id: d.id, ...d.data() })));
  };
  const [lessons, quizzes, exams, ann, attSnap, rateSnap, libSnap] = await Promise.all([
    inQuery("lessons"), inQuery("quizzes"), inQuery("exams"), inQuery("announcements"),
    fbDb.collection("quizAttempts").where("studentId", "==", fbUser.uid).get(),
    fbDb.collection("lessonRatings").where("studentId", "==", fbUser.uid).get(),
    fbDb.collection("library").orderBy("createdAt", "desc").get(),
  ]);
  studentData = {
    teachers, lessons, quizzes, exams, ann,
    attempts: attSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    ratings: rateSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    library: libSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

function sTeacherName(tid) {
  const t = (studentData.teachers || []).find((x) => x.id === tid);
  return (t && t.name) || "";
}

/* أقسام المواد في صفحة دروسي: أيقونة ولون ثابتين لكل مادة، وحالة الفتح/القفل
   بتتحفظ على الجهاز فميفتحش كل الأقسام كل مرة */
const SUBJ_ICONS = [
  ["علوم", "🧪"], ["رياض", "📐"], ["حساب", "📐"], ["عرب", "📖"], ["انجليز", "🔤"], ["إنجليز", "🔤"],
  ["دراسات", "🌍"], ["فيزيا", "⚛️"], ["كيميا", "⚗️"], ["أحيا", "🧬"], ["حاسب", "💻"], ["دين", "🕌"],
];
const SUBJ_COLORS = [
  ["#0f766e", "#f0fdfa", "#ccfbf1"], ["#d97706", "#fffbeb", "#fef3c7"], ["#2563eb", "#eff6ff", "#dbeafe"],
  ["#7c3aed", "#f5f3ff", "#ede9fe"], ["#e11d48", "#fff1f2", "#ffe4e6"], ["#059669", "#ecfdf5", "#d1fae5"],
];
function sSubjIcon(subj) {
  const s = String(subj || "");
  for (const [k, ic] of SUBJ_ICONS) if (s.includes(k)) return ic;
  return "📚";
}
function sSubjColor(subj) {
  let h = 0;
  const s = String(subj || "عام");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return SUBJ_COLORS[h % SUBJ_COLORS.length];
}
function sSecStateGet(k) {
  try { const m = JSON.parse(localStorage.getItem("stSecState") || "{}"); return m[k] !== false; } catch (_) { return true; }
}
function sSecStateSet(k, open) {
  try { const m = JSON.parse(localStorage.getItem("stSecState") || "{}"); m[k] = open; localStorage.setItem("stSecState", JSON.stringify(m)); } catch (_) {}
}
function sLessonsCountText(n) {
  return n + " " + (n === 1 ? "درس" : n === 2 ? "درسين" : n <= 10 ? "دروس" : "درس");
}

/* علامات «شوفت الدرس» على الجهاز: بتتسجل أول ما الطالب يفتح صفحة الدرس،
   وبتغذي شريط التقدم والتذكير الذكي في صفحة دروسي */
function sWatchedSet() {
  try { return new Set(JSON.parse(localStorage.getItem("stWatched") || "[]")); } catch (_) { return new Set(); }
}
function sIsWatched(lid) { return sWatchedSet().has(lid); }
function sMarkWatched(lid) {
  try {
    const w = sWatchedSet();
    w.add(lid);
    localStorage.setItem("stWatched", JSON.stringify(Array.from(w).slice(-500)));
  } catch (_) {}
}

/* شريط تقدم المادة داخل قسمها: دروس مشاهدة من الإجمالي + كويزات مكتملة */
function sSubjProgressHtml(g, col) {
  const total = g.items.length;
  const watched = g.items.filter((x) => sIsWatched(x.id)).length;
  const lids = new Set(g.items.map((x) => x.id));
  const qz = (studentData.quizzes || []).filter((q) => q.lessonId && lids.has(q.lessonId) && sVisible(q));
  const qzDone = qz.filter((q) => sAttemptFor(q.id, null)).length;
  const pct = total ? Math.round((watched / total) * 100) : 0;
  return `<div class="sprog" style="grid-column:1/-1;">
    <span>شوفت ${watched} من ${sLessonsCountText(total)}</span>
    <span class="sprog-track"><span class="sprog-fill" style="width:${pct}%; background:${col[0]};"></span></span>
    ${qz.length ? `<span>· خلصت ${qzDone} من ${qz.length} كويز</span>` : ""}
  </div>`;
}

/* الكويزات بمحاولة واحدة: لو المدرس حددها والطالب حل، الزرار يتقفل */
function sQuizBlocked(q) {
  return q.maxAttempts === 1 && !!sAttemptFor(q.id, null);
}
function sQuizBtnHtml(q, att, btnCls) {
  if (sQuizBlocked(q)) return `<span class="chip">✅ اتحل — محاولة واحدة</span>`;
  return `<button type="button" class="btn ${btnCls || "sm"}" data-sq="${q.id}">${att ? "إعادة الكويز" : "ابدأ الكويز"}</button>`;
}

/* تقييم الدرس بالنجوم: الطالب يقيّم مرة ويقدر يغيّر، والمدرس يشوف المتوسط بس */
function sMyRating(lessonId) {
  const r = (studentData.ratings || []).find((x) => x.lessonId === lessonId);
  return r ? r.stars || 0 : 0;
}
async function sRate(lessonId, stars) {
  const l = (studentData.lessons || []).find((x) => x.id === lessonId);
  if (!l) return;
  try {
    await fbDb.collection("lessonRatings").doc(fbUser.uid + "_" + lessonId).set({
      lessonId,
      teacherId: l.teacherId || "",
      studentId: fbUser.uid,
      stars,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showToast("شكراً! تقييمك اتسجل.", "good");
    renderStudentLesson(lessonId);
  } catch (e) { showToast("مشكلة في حفظ التقييم، جرّب تاني.", "bad"); }
}

/* تذكير ذكي فوق الأقسام: دروس لسه مشفتاهاش + كويزات مستنياه + دروس بتنزل قريب.
   بيظهر بس لما في حاجة تفتكر، ومبيظهرش خالص لو كل حاجة مكتملة */
function sReminderHtml(lessons, quizzes) {
  const unseen = lessons.filter((l) => sLessonOpen(l) && !sIsWatched(l.id));
  const pendingQ = (quizzes || []).filter((q) => sVisible(q) && !sAttemptFor(q.id, null));
  const soon = lessons.filter((l) => !sLessonOpen(l) && l.publishAt && l.publishAt.seconds
    && (l.publishAt.seconds * 1000 - Date.now()) < 3 * 86400000);
  const lines = [];
  if (unseen.length) lines.push(`📚 عندك ${sLessonsCountText(unseen.length)} لسه مشفت${unseen.length === 1 ? "ه" : "هم"}ش`);
  if (pendingQ.length) lines.push(`📝 ${pendingQ.length === 1 ? "كويز واحد مستنيك" : pendingQ.length + " كويزات مستنياك"}`);
  if (soon.length) lines.push(`🕒 ${soon.length === 1 ? "درس جديد بينزل" : sLessonsCountText(soon.length) + " جداد بينزلوا"} قريب`);
  if (!lines.length) return "";
  return `<div class="card lcard" style="border-right:4px solid #d97706;"><b>⏰ تذكير سريع</b>
    <div class="muted" style="font-size:13px; margin-top:4px;">${lines.join("<br>")}</div>
  </div>`;
}

// المحتوى يظهر للطالب لو مخصص لصفه، أو عام على مرحلته كلها
function sVisible(item) {
  const g = item.grade || "";
  if (g) return g === ((fbProfile && fbProfile.grade) || "");
  return stageOfGrade((fbProfile && fbProfile.grade) || "") === item.stage;
}

// الدرس المجدول يظهر بشارة لكن مايتفتحش قبل معاده
function sLessonOpen(l) {
  return !(l.publishAt && l.publishAt.toDate && l.publishAt.toDate() > new Date());
}

function sAttemptFor(quizId, examId) {
  return (studentData.attempts || []).find((a) => (quizId && a.quizId === quizId) || (examId && a.examId === examId)) || null;
}

function sExamState(e) {
  const now = new Date();
  if (e.closed) return ["مقفول", "red"];
  if (e.openAt && e.openAt.toDate && e.openAt.toDate() > now) return ["يفتح " + fmtTs(e.openAt), "amber"];
  if (e.closeAt && e.closeAt.toDate && e.closeAt.toDate() <= now) return ["اتقفل", "red"];
  return ["مفتوح", "green"];
}

function sUnavailable(msg) {
  app.innerHTML = `
    <div class="card center" style="max-width:520px; margin:40px auto;">
      <h1 style="font-size:20px;">${esc(msg)}</h1>
      <div class="btnrow" style="justify-content:center;"><a class="btn ghost" href="#/student">رجوع لدروسي</a></div>
    </div>
    ${closing()}`;
  window.scrollTo(0, 0);
}

/* شاشة إلزامية: تسجيل رقم ولي الأمر للطلبة المسجلين قبل إضافة الحقل.
   بتظهر عند كل دخول لحد ما الرقم يتحفظ — مفيش تخطي. */
function renderParentPhoneGate() {
  app.innerHTML = `
    <div class="hdr" style="margin-top:32px;">
      <h1>رقم ولي الأمر مطلوب 👨‍👩‍👦</h1>
      <div class="fact">خطوة واحدة وتكمل — لازم نسجل رقم ولي أمرك قبل استخدام المنصة</div>
    </div>
    <div class="card" style="max-width:520px; margin:0 auto;">
      <p class="muted" style="font-size:14px;">عشان نقدر نوصّل لولي أمرك أي تحديث مهم عن حسابك، اكتب رقم موبايله (واتساب). مش هتقدر تكمل من غيره.</p>
      <label class="flabel">رقم موبايل ولي الأمر (واتساب)</label>
      <input id="pp-phone" type="tel" class="inp ltr" placeholder="01xxxxxxxxx">
      <button type="button" class="btn" id="pp-save" style="width:100%;">حفظ ودخول</button>
      <p class="msg bad" id="pp-msg"></p>
    </div>
    ${closing()}`;
  document.getElementById("pp-save").onclick = async () => {
    const v = normalizeEgPhone(document.getElementById("pp-phone").value);
    const m = document.getElementById("pp-msg");
    if (!v) { m.textContent = "اكتب رقم موبايل مصري صح (11 رقم يبدأ بـ 01)."; return; }
    const btn = document.getElementById("pp-save");
    btn.disabled = true;
    try {
      await fbDb.collection("students").doc(fbUser.uid).update({ parentPhone: v });
      if (fbProfile) fbProfile.parentPhone = v;
      renderStudentHome();
    } catch (e) {
      btn.disabled = false;
      m.textContent = "حصلت مشكلة: " + (e.message || e);
    }
  };
  window.scrollTo(0, 0);
}

/* أول دخول بالرقم السري: بعد تسجيل الدخول المؤقت بالإيميل فقط ما ينفعش
   من غير باسورد، فالحل: الطالب يكتب إيميله ورقمه السري، نتأكد من الرقم السري
   من Firestore، وبعدين نعمله حساب Auth بباسورد يختاره. لأن إنشاء حساب Auth
   من المتصفح بيعمل تسجيل دخول تلقائي، ننفذه بعد ما نتأكد من البيانات. */

async function studentFirstLogin(email, pin, newPass) {
  // الفهرس العام الآمن: بالإيميل نتأكد من الحالة والرقم السري من غير كشف بيانات الطالب
  const em = email.toLowerCase();
  const lk = await fbDb.collection("registrationLookup").doc(em).get();
  if (!lk.exists) throw new Error("الإيميل ده مش مسجل. سجّل حسابك الأول.");
  const l = lk.data();
  if (l.status !== "approved") throw new Error(l.status === "rejected" ? "طلبك اترفض، كلّم مدرسك." : "المدرس لسه ما وافق على طلبك.");
  const hash = await sha256Hex((l.saltEmail || em) + ":" + pin);
  if (hash !== l.pinHash) throw new Error("الرقم السري غلط.");
  // إنشاء حساب Auth بالباسورد اللي اختاره (بيدخل تلقائي بعد الإنشاء)
  const cred = await fbAuth.createUserWithEmailAndPassword(em, newPass);
  // بعد الدخول يقدر يقرا ملفه بس وننقل بياناته لمستند بنفس uid
  const old = await fbDb.collection("students").doc(l.studentId).get();
  const d = old.exists ? old.data() : {};
  await fbDb.collection("students").doc(cred.user.uid).set({
    ...d,
    email: em,
    status: d.status || "approved",
    teacherIds: d.teacherIds || [],
    pinHash: "",
    authLinked: true,
    emailVerifyRequired: true, // حساب جديد: لازم يفعّل إيميله قبل أول دخول
  });
  if (l.studentId && l.studentId !== cred.user.uid) {
    await fbDb.collection("students").doc(l.studentId).delete();
  }
  // لينك التفعيل بيتبعت دلوقتي، وبوابة التفعيل هتقابله عند الدخول لحد ما يدوسه.
  // لو الإرسال فشل مش بنوقف إنشاء الحساب — يقدر يطلب لينك تاني من البوابة
  try { await cred.user.sendEmailVerification(); } catch (_) {}
  return cred;
}

/* هل الطالب عنده حساب Auth أصلاً؟ نحاول تسجيل الدخول العادي، ولو فشل
   بسبب كلمة السر وعنده pinHash نعرض له شاشة اختيار باسورد. */
let firstLoginEmail = "";

function renderFirstLogin(email) {
  firstLoginEmail = email;
  app.innerHTML = `
    <div class="hdr" style="margin-top:32px;">
      <h1>أول دخول ليك</h1>
      <div class="fact">اكتب رقمك السري واختار باسوردك الجديد</div>
    </div>
    <div class="card" style="max-width:520px; margin:0 auto;">
      <label class="flabel">الإيميل</label>
      <input type="email" class="inp ltr" value="${esc(email)}" disabled>
      <label class="flabel">الرقم السري اللي سجلت بيه</label>
      <input id="fl-pin" type="password" inputmode="numeric" maxlength="6" class="inp ltr" placeholder="مثال: 2580">
      <label class="flabel">الباسورد الجديد (6 أحرف أو أرقام على الأقل)</label>
      <input id="fl-pass1" type="password" class="inp ltr">
      <label class="flabel">تأكيد الباسورد</label>
      <input id="fl-pass2" type="password" class="inp ltr">
      <button type="button" class="btn" id="fl-btn" style="width:100%;">تأكيد ودخول</button>
      <p class="msg bad" id="fl-msg"></p>
      <div class="center muted" style="margin-top:8px;"><a href="#/login" style="color:var(--primary-dark);">رجوع لصفحة الدخول</a></div>
    </div>
    ${closing()}`;
  document.getElementById("fl-btn").onclick = async () => {
    const pin = document.getElementById("fl-pin").value.trim();
    const p1 = document.getElementById("fl-pass1").value;
    const p2 = document.getElementById("fl-pass2").value;
    const m = document.getElementById("fl-msg");
    const flm = (t) => { m.textContent = t; showToast(t, "bad"); };
    m.textContent = "";
    if (!/^[0-9]{4,6}$/.test(pin)) return flm("اكتب الرقم السري صح.");
    if (p1.length < 6) return flm("الباسورد لازم يكون 6 أحرف على الأقل.");
    if (p1 !== p2) return flm("الباسوردين مش زي بعض.");
    try {
      await studentFirstLogin(email, pin, p1);
      await resolveRole(fbAuth.currentUser);
      route();
    } catch (e) {
      // عندها حساب Auth قديم بنفس الإيميل (من ربط سابق اتمسح ملفه): نبعت لينك إعادة ضبط
      // وبعد ما تدخل بالباسورد الجديد، صفحة الدخول بتربط ملفها بحسابها تلقائياً
      if (e && e.code === "auth/email-already-in-use") {
        try {
          await fbAuth.sendPasswordResetEmail(email.toLowerCase());
          flm("عندك حساب قديم بنفس الإيميل. بعتلنك لينك على إيميلك تعمل بيه باسورد جديد، وبعدين ادخل عادي من صفحة الدخول.");
        } catch (_) { flm(authErrAr(e)); }
        return;
      }
      flm(e.code ? authErrAr(e) : (e.message || "حصلت مشكلة."));
    }
  };
  window.scrollTo(0, 0);
}

/* ---------- تاب دروسي (الرئيسية) ---------- */
async function renderStudentDash() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل دروسك...</div>`;
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const s = fbProfile || {};
  // إعلانات المدرس الموقوف عن الطالب ما تظهرش له
  const annVisible = (studentData.ann || []).filter((a) => sVisible(a) && !sSuspendedSet().has(a.teacherId))
    .sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));
  // محتوى الترم المحدد بس، ومحتوى المدرس الموقوف ما يتعرضش (بيظهر ككارت مقفول بداله)
  const lessons = (studentData.lessons || []).filter((l) => sVisible(l) && termOf(l) === sTerm() && !sTeacherLocked(l))
    .slice().sort((a, b) => (a.unit || 0) - (b.unit || 0) || (a.lessonNum || 0) - (b.lessonNum || 0));
  const quizzesVis = (studentData.quizzes || []).filter((q) => sVisible(q) && termOf(q) === sTerm() && !sTeacherLocked(q));
  // المدرسين الموقوف عنهم الطالب — كل واحد ليه كارت قفل أحمر
  const lockedTeachers = (studentData.teachers || []).filter((t) => sSuspendedSet().has(t.id));
  // مدرس موقوف من الأدمن: محتواه مقفول على كل طلابه وبيظهر تاني لوحده أول ما يرجع
  const adminLockedTeachers = (studentData.teachers || []).filter((t) => t.active === false);
  // تجميع الدروس في أقسام: كل قسم مادة باسم مدرسها، مرتبة بعدد الدروس ثم أبجدي.
  // جوه القسم: الدرس المثبت من المدرس الأول، وبعدين بالوحدة ورقم الدرس
  const groups = {};
  lessons.forEach((l) => {
    const subj = l.subject || "عام";
    const tname = sTeacherName(l.teacherId) || "مدرسك";
    const k = subj + " · " + tname;
    (groups[k] = groups[k] || { subj, tname, items: [] }).items.push(l);
  });
  Object.values(groups).forEach((g) => g.items.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)));
  const gkeys = Object.keys(groups).sort((a, b) =>
    groups[b].items.length - groups[a].items.length || groups[a].subj.localeCompare(groups[b].subj, "ar"));
  app.innerHTML = `
    <div class="hdr">
      <h1 style="display:flex; align-items:center; gap:10px;">${sAvatarHtml(44)} أهلاً ${esc(s.name || "")} 🎓</h1>
      <div class="fact">${esc(s.grade || "")}</div>
    </div>
    ${studentTabs("lessons")}
    ${termTabsHtml(sTerm())}
    ${lockedTeachers.map((t) => `
    <div class="card lcard" style="border-right:4px solid var(--red); background:var(--redbg, #fef2f2);">
      <b>🔒 ${esc(t.subject ? t.subject + " · " : "")}${esc(t.name || "مدرس")}</b>
      <div class="muted" style="font-size:13px; margin-top:4px;">تم إيقاف وصولك لمحتوى هذا المدرس. محتوى باقي مدرسيك شغال عادي.</div>
    </div>`).join("")}
    ${adminLockedTeachers.map((t) => `
    <div class="card lcard" style="border-right:4px solid var(--red); background:var(--redbg, #fef2f2);">
      <b>⛔ ${esc(t.subject ? t.subject + " · " : "")}${esc(t.name || "مدرس")}</b>
      <div class="muted" style="font-size:13px; margin-top:4px;">المدرس ده متوقف مؤقتًا من إدارة المنصة — محتواه هيظهر تاني تلقائيًا أول ما يرجع. محتوى باقي مدرسيك شغال عادي.</div>
    </div>`).join("")}
    ${annVisible.slice(0, 2).map((a) => `
    <div class="card lcard" style="border-right:4px solid var(--primary);"><b>📢 ${esc(a.text || "")}</b>
      <div class="muted" style="font-size:12px;">${sTeacherChip(a.teacherId, a.teacherName)}${a.createdAt ? " · " + fmtTs(a.createdAt) : ""}</div>
    </div>`).join("")}
    ${sReminderHtml(lessons, quizzesVis)}
    ${gkeys.length ? gkeys.map((k) => {
      const g = groups[k];
      const col = sSubjColor(g.subj);
      const open = sSecStateGet(k);
      const tav = (g.tname || "").trim()[0] || "؟";
      return `
    <div class="sec" style="--sc:${col[0]}; --scbg:${col[1]}; --sic:${col[2]};">
      <div class="sec-h" data-sec="${esc(k)}">
        <span class="sic">${sSubjIcon(g.subj)}</span>
        <span class="st"><b>${esc(g.subj)}</b><span class="tt"><span class="tav">${esc(tav)}</span> ${esc(g.tname)}</span></span>
        <span class="cnt">${sLessonsCountText(g.items.length)}</span>
        <span class="arr">${open ? "▲" : "▼"}</span>
      </div>
      <div class="sec-b"${open ? "" : ` style="display:none;"`}>
        ${sSubjProgressHtml(g, col)}
        ${g.items.map((l) => {
          const open = sLessonOpen(l);
          const linked = quizzesVis.filter((q) => q.lessonId === l.id);
          const best = linked.map((q) => sAttemptFor(q.id, null)).filter(Boolean)
            .map((a) => (a.total > 0 ? Math.round((a.score / a.total) * 100) : 0)).sort((x, y) => y - x)[0];
          const isNew = (l.createdAt && l.createdAt.seconds && (Date.now() / 1000 - l.createdAt.seconds < 3 * 86400))
            || (l.publishAt && l.publishAt.seconds && (Date.now() / 1000 - l.publishAt.seconds < 3 * 86400));
          return `<div class="card lcard" style="margin:0;">
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
              ${l.pinned ? `<span class="bdg pin">📌 مثبت</span>` : ""}${isNew ? `<span class="bdg new">جديد</span>` : ""}${l.videoUrl ? `<span class="bdg vid">🎬 فيديو</span>` : ""}${l.pdfUrl ? `<span class="bdg pdf">📄 PDF</span>` : ""}${!open ? `<span class="chip amber">🕒 ينزل ${fmtTs(l.publishAt)}</span>` : ""}
            </div>
            <div style="font-size:12px; color:var(--primary-dark); font-weight:700;">الوحدة ${l.unit || "—"} · الدرس ${l.lessonNum || "—"}</div>
            <b style="font-size:15px;">${esc(l.title)}</b>
            ${l.desc ? `<div class="muted" style="font-size:13px; margin-top:4px;">${esc(l.desc)}</div>` : ""}
            ${best != null ? `<div class="muted" style="font-size:12px; margin:4px 0;">أفضل نتيجة في كويز الدرس: ${best}% ✅</div>` : ""}
            <div class="btnrow">${open ? `<button type="button" class="btn sm" data-sl="${l.id}">مشاهدة الدرس</button>` : `<button type="button" class="btn sm ghost" disabled>مجدول</button>`}</div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
    }).join("") : `
    <div class="card center">
      <div style="font-size:44px;">📚</div>
      <h2 style="font-size:20px; margin:8px 0;">لسه مفيش دروس ليك</h2>
      <p class="muted">أول ما مدرسك ينزل دروس لصفك هتظهر هنا.</p>
    </div>`}
    ${closing()}`;
  bindStudentTabs();
  bindTermTabs((t) => { sTermTab = t; renderStudentDash(); });
  // فتح/قفل قسم المادة بالدوس على رأسه، والحالة بتتحفظ
  document.querySelectorAll("[data-sec]").forEach((h) => h.onclick = () => {
    const body = h.parentElement.querySelector(".sec-b");
    const arr = h.querySelector(".arr");
    if (!body || !arr) return;
    const wasOpen = body.style.display !== "none";
    body.style.display = wasOpen ? "none" : "";
    arr.textContent = wasOpen ? "▼" : "▲";
    sSecStateSet(h.dataset.sec, !wasOpen);
  });
  document.querySelectorAll("[data-sl]").forEach((b) => b.onclick = () => { location.hash = "#/student/lesson/" + b.dataset.sl; });
  window.scrollTo(0, 0);
}

/* ---------- صفحة الدرس ---------- */
async function renderStudentLesson(id) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل الدرس...</div>`;
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const l = (studentData.lessons || []).find((x) => x.id === id);
  if (!l || !sVisible(l)) return sUnavailable("الدرس ده مش متاح ليك.");
  if (sTeacherLocked(l)) return sUnavailable("تم إيقاف وصولك لمحتوى هذا المدرس.");
  if (!sLessonOpen(l)) return sUnavailable("الدرس ده مجدول — هيتفتح " + fmtTs(l.publishAt) + ".");
  sMarkWatched(id); // علامة «شوفت الدرس» لشريط التقدم والتذكير
  const myStars = sMyRating(id);
  const emb = l.videoUrl ? videoEmbed(l.videoUrl) : null;
  const linked = (studentData.quizzes || []).filter((q) => q.lessonId === id && sVisible(q) && !sTeacherLocked(q));
  app.innerHTML = `
    <div class="hdr">
      <h1>${esc(l.title || "الدرس")}</h1>
      <div class="fact">الوحدة ${l.unit || "—"} · الدرس ${l.lessonNum || "—"}${l.subject ? " · " + esc(l.subject) : ""} · ${esc(sTeacherName(l.teacherId) || "")}</div>
    </div>
    ${studentTabs("lessons")}
    <div class="btnrow" style="margin-bottom:10px;"><a class="btn ghost" href="#/student">← رجوع لدروسي</a></div>
    <div class="card">
      ${emb ? `<div style="border-radius:14px; overflow:hidden; aspect-ratio:16/9; background:#0f172a;"><iframe src="${esc(emb.src)}" style="width:100%; height:100%; border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ""}
      ${l.desc ? `<p class="muted" style="font-size:13.5px; margin-top:10px;">${esc(l.desc)}</p>` : ""}
      ${l.pdfUrl ? `<div class="btnrow" style="margin-top:10px;"><a class="btn ghost" target="_blank" rel="noopener" href="${esc(l.pdfUrl)}">📄 فتح ملف الـ PDF</a></div>` : ""}
      ${!emb && !l.pdfUrl ? `<p class="muted center">الدرس ده من غير وسائط لسه.</p>` : ""}
    </div>
    <div class="card center">
      <b style="font-size:15px;">قيّم الدرس</b>
      <div class="btnrow" style="justify-content:center; margin-top:6px;">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="rate-star${myStars >= n ? " on" : ""}" data-star="${n}" aria-label="${n} نجوم">★</button>`).join("")}
      </div>
      <div class="muted" style="font-size:12px;">${myStars ? `تقييمك: ${myStars} من 5 — تقدر تغيّره` : "دوس على النجوم — تقييمك بيوصل للمدرس من غير اسمك"}</div>
    </div>
    ${linked.map((q) => {
      const att = sAttemptFor(q.id, null);
      const pct = att && att.total > 0 ? Math.round((att.score / att.total) * 100) : null;
      return `<div class="card">
        <h2 style="font-size:18px; margin-top:0;">${esc(q.title || "كويز الدرس")}</h2>
        <p class="muted" style="font-size:13.5px;">${(q.questions || []).length} سؤال${att ? ` · نتيجتك: ${att.score} من ${att.total} (${pct}%)${sQuizBlocked(q) ? "" : " — تقدر تعيد الكويز"}` : ""}</p>
        <div class="btnrow">${sQuizBtnHtml(q, att, "")}</div>
      </div>`;
    }).join("")}
    ${closing()}`;
  bindStudentTabs();
  document.querySelectorAll("[data-sq]").forEach((b) => b.onclick = () => { location.hash = "#/student/quiz/" + b.dataset.sq; });
  document.querySelectorAll("[data-star]").forEach((b) => b.onclick = () => sRate(id, Number(b.dataset.star)));
  window.scrollTo(0, 0);
}

/* ---------- تاب الكويزات والامتحانات ---------- */
async function renderStudentQuizExams() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل الكويزات والامتحانات...</div>`;
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const quizzes = (studentData.quizzes || []).filter((q) => sVisible(q) && termOf(q) === sTerm() && !sTeacherLocked(q))
    .slice().sort((a, b) => (a.title || "").localeCompare(b.title || "", "ar"));
  const exams = (studentData.exams || []).filter((e) => sVisible(e) && termOf(e) === sTerm() && !sTeacherLocked(e));
  app.innerHTML = `
    <div class="hdr">
      <h1>الكويزات والامتحانات 📝</h1>
      <div class="fact">${esc((fbProfile && fbProfile.grade) || "")}</div>
    </div>
    ${studentTabs("quiz")}
    ${termTabsHtml(sTerm())}
    ${sMistakesCardHtml()}
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">الكويزات (${quizzes.length})</h2>
      ${quizzes.length ? `<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-top:12px;">
        ${quizzes.map((q) => {
          const att = sAttemptFor(q.id, null);
          const pct = att && att.total > 0 ? Math.round((att.score / att.total) * 100) : null;
          const lesson = q.lessonId ? (studentData.lessons || []).find((l) => l.id === q.lessonId) : null;
          return `<div class="card" style="margin:0;">
            <b style="font-size:15px;">${esc(q.title || "")}</b>
            ${lesson ? `<div style="margin:4px 0;"><span class="chip">🔗 ${esc(lesson.title || "")}</span></div>` : `<div class="muted" style="font-size:12px; margin:4px 0;">كويز عام</div>`}
            <div class="muted" style="font-size:12px; margin:4px 0;">📝 ${(q.questions || []).length} سؤال · ${esc(q.subject || "")}</div>
            ${att ? `<div class="muted" style="font-size:12px; margin:4px 0;">نتيجتك: ${att.score} من ${att.total} (${pct}%)</div>` : ""}
            <div class="btnrow">${sQuizBtnHtml(q, att)}</div>
          </div>`;
        }).join("")}
      </div>` : `<p class="muted center" style="margin-top:12px;">لسه مفيش كويزات لصفك.</p>`}
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">الامتحانات (${exams.length})</h2>
      ${exams.length ? `<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-top:12px;">
        ${exams.map((e) => {
          const [stTxt, stCls] = sExamState(e);
          const att = sAttemptFor(null, e.id);
          const pct = att && att.total > 0 ? Math.round((att.score / att.total) * 100) : null;
          return `<div class="card" style="margin:0;">
            <div class="btnrow" style="justify-content:space-between;"><b style="font-size:15px;">${esc(e.title || "")}</b><span class="chip ${stCls}">${stTxt}</span></div>
            ${e.desc ? `<div class="muted" style="font-size:13px; margin-top:4px;">${esc(e.desc)}</div>` : ""}
            <div class="muted" style="font-size:12px; margin:4px 0;">📝 ${(e.quiz || []).length} سؤال${e.closeAt ? " · يقفل " + fmtTs(e.closeAt) : ""}</div>
            ${att ? `<div class="muted" style="font-size:12px; margin:4px 0;">نتيجتك: ${att.score} من ${att.total} (${pct}%)</div>` : ""}
            <div class="btnrow">${stTxt === "مفتوح" ? `<button type="button" class="btn sm" data-se="${e.id}">${att ? "إعادة الامتحان" : "ابدأ الامتحان"}</button>` : ""}</div>
          </div>`;
        }).join("")}
      </div>` : `<p class="muted center" style="margin-top:12px;">لسه مفيش امتحانات لصفك.</p>`}
    </div>
    ${closing()}`;
  bindStudentTabs();
  bindTermTabs((t) => { sTermTab = t; renderStudentQuizExams(); });
  document.querySelectorAll("[data-sq]").forEach((b) => b.onclick = () => { location.hash = "#/student/quiz/" + b.dataset.sq; });
  document.querySelectorAll("[data-se]").forEach((b) => b.onclick = () => { location.hash = "#/student/exam/" + b.dataset.se; });
  bindMistakesBtn();
  window.scrollTo(0, 0);
}

/* ---------- حل كويز/امتحان ---------- */
function sQuestionHtml(q, i) {
  let body = "";
  if (q.type === "mcq") {
    body = `<div style="display:grid; gap:8px;">${(q.options || []).map((o, oi) => `<label><input type="radio" name="sq${i}" value="${oi}"> ${esc(o)}</label>`).join("")}</div>`;
  } else if (q.type === "multi") {
    body = `<div style="display:grid; gap:8px;">${(q.options || []).map((o, oi) => `<label><input type="checkbox" name="sq${i}" value="${oi}"> ${esc(o)}</label>`).join("")}</div>
      <p class="muted" style="font-size:12.5px; margin:6px 0 0;">اختار كل الإجابات الصحيحة.</p>`;
  } else if (q.type === "tf") {
    body = `<div class="btnrow"><label class="btn sm ghost"><input type="radio" name="sq${i}" value="0"> صح</label><label class="btn sm ghost"><input type="radio" name="sq${i}" value="1"> غلط</label></div>`;
  } else if (q.type === "match") {
    const opts = (q.pairs || []).map((pr) => pr.b);
    body = `<div style="display:grid; gap:8px;">${(q.pairs || []).map((pr, pi) => `
      <div class="btnrow" style="align-items:center;"><b style="font-size:14px;">${esc(pr.a)}</b>
      <select class="inp" data-sqm="${i}:${pi}" style="flex:1;"><option value="">اختار المقابل</option>${opts.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join("")}</select>
      </div>`).join("")}</div>`;
  } else if (q.type === "num") {
    body = `<input type="number" class="inp ltr" data-sqt="${i}" placeholder="اكتب الرقم">`;
  } else {
    body = `<input type="text" class="inp" data-sqt="${i}" placeholder="اكتب إجابتك">`;
  }
  return `<div class="card"><h3 style="font-size:16px; margin-top:0;">س${i + 1}: ${esc(q.q || "")}</h3>${qImgHtml(q)}${body}</div>`;
}

async function renderStudentTake(id, isExam) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل الاختبار...</div>`;
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const item = isExam
    ? (studentData.exams || []).find((x) => x.id === id)
    : (studentData.quizzes || []).find((x) => x.id === id);
  if (!item || !sVisible(item)) return sUnavailable((isExam ? "الامتحان" : "الكويز") + " ده مش متاح ليك.");
  if (sTeacherLocked(item)) return sUnavailable("تم إيقاف وصولك لمحتوى هذا المدرس.");
  if (isExam && sExamState(item)[0] !== "مفتوح") return sUnavailable("الامتحان ده مش مفتوح دلوقتي.");
  if (!isExam && sQuizBlocked(item)) return sUnavailable("حليت الكويز ده قبل كده — الكويز ده بمحاولة واحدة بس.");
  const questions = (isExam ? item.quiz : item.questions) || [];
  if (!questions.length) return sUnavailable("مفيش أسئلة في " + (isExam ? "الامتحان" : "الكويز") + " ده لسه.");
  app.innerHTML = `
    <div class="hdr">
      <h1>${isExam ? "امتحان" : "كويز"}: ${esc(item.title || "")}</h1>
      <div class="fact">${esc(item.subject || "")} · ${esc(sTeacherName(item.teacherId) || "")}</div>
    </div>
    ${studentTabs("quiz")}
    <div class="btnrow" style="margin-bottom:10px;"><a class="btn ghost" href="#/student/quizexams">← رجوع للكويزات والامتحانات</a></div>
    ${questions.map((q, i) => sQuestionHtml(q, i)).join("")}
    <div class="card center">
      <button type="button" class="btn" id="sq-submit" style="min-width:220px;">تسليم ${isExam ? "الامتحان" : "الكويز"}</button>
      <p class="msg" id="sq-msg"></p>
      <p class="muted" style="font-size:12.5px; margin-top:8px;">بعد التسليم بتشوف درجتك على طول.</p>
    </div>
    ${closing()}`;
  bindStudentTabs();
  document.getElementById("sq-submit").onclick = () => sSubmit(item, questions, isExam);
  window.scrollTo(0, 0);
}

// تجميع إجابات الطالب من الشاشة — null معناها سؤال من غير إجابة
function sGather(questions) {
  const given = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (q.type === "mcq" || q.type === "tf") {
      const sel = document.querySelector(`input[name="sq${i}"]:checked`);
      given.push(sel == null ? null : Number(sel.value));
    } else if (q.type === "multi") {
      const picked = Array.from(document.querySelectorAll(`input[name="sq${i}"]:checked`)).map((c) => Number(c.value)).sort((a, b) => a - b);
      given.push(picked.length ? picked : null);
    } else if (q.type === "match") {
      const rows = Array.from(document.querySelectorAll(`[data-sqm^="${i}:"]`));
      const ans = rows.map((sel) => sel.value);
      given.push(ans.some((v) => !v) ? null : ans);
    } else {
      const inp = document.querySelector(`[data-sqt="${i}"]`);
      const v = inp ? inp.value.trim() : "";
      given.push(v === "" ? null : v);
    }
  }
  return given;
}

// التصحيح الآلي لسؤال واحد
function sGradeOne(q, g) {
  if (g == null) return false;
  if (q.type === "mcq" || q.type === "tf") return Number(g) === Number(q.correct);
  if (q.type === "multi") {
    const c = (q.correct || []).slice().sort((a, b) => a - b);
    return Array.isArray(g) && g.length === c.length && g.every((v, i) => v === c[i]);
  }
  if (q.type === "match") return Array.isArray(g) && (q.pairs || []).every((pr, i) => g[i] === pr.b);
  if (q.type === "num") {
    const n = Number(g);
    if (isNaN(n)) return false;
    return Math.abs(n - Number(q.answer)) <= (Number(q.tolerance) || 0);
  }
  if (q.type === "fill") {
    const acc = String(q.answer || "").split("/").map((x) => normalizeAnswer(x)).filter(Boolean);
    return acc.includes(normalizeAnswer(g));
  }
  return normalizeAnswer(g) === normalizeAnswer(q.answer); // text
}

/* صورة السؤال (اختيارية) — بتظهر في الحل والمراجعة */
function qImgHtml(q) {
  return q.img ? `<img src="${q.img}" alt="صورة السؤال" style="max-width:100%; border-radius:12px; margin:0 0 10px; display:block;">` : "";
}

function sGivenText(q, g) {
  if (g == null) return "—";
  if (q.type === "mcq") return (q.options || [])[g] || "—";
  if (q.type === "tf") return Number(g) === 0 ? "صح" : "غلط";
  if (q.type === "multi") return (g || []).map((i) => (q.options || [])[i]).filter(Boolean).join("، ") || "—";
  if (q.type === "match") return (q.pairs || []).map((pr, i) => pr.a + " ← " + (g[i] || "—")).join(" · ");
  return String(g);
}

function sCorrectText(q) {
  if (q.type === "mcq") return (q.options || [])[q.correct] || "";
  if (q.type === "multi") return (q.correct || []).map((i) => (q.options || [])[i]).filter(Boolean).join("، ");
  if (q.type === "tf") return Number(q.correct) === 0 ? "صح" : "غلط";
  if (q.type === "match") return (q.pairs || []).map((pr) => pr.a + " ← " + pr.b).join(" · ");
  if (q.type === "num") return String(q.answer) + (Number(q.tolerance) ? " (±" + q.tolerance + ")" : "");
  return q.answer || "";
}

async function sSubmit(item, questions, isExam) {
  const m = document.getElementById("sq-msg");
  const given = sGather(questions);
  const missing = given.findIndex((g) => g == null);
  if (missing >= 0) {
    m.className = "msg bad"; m.textContent = "جاوب على سؤال " + (missing + 1) + " الأول.";
    return;
  }
  const results = questions.map((q, i) => ({ correct: sGradeOne(q, given[i]) }));
  const score = results.filter((r) => r.correct).length;
  const btn = document.getElementById("sq-submit");
  btn.disabled = true;
  const docId = "att_" + fbUser.uid + "_" + (isExam ? "x_" : "") + item.id;
  const data = {
    studentId: fbUser.uid,
    studentName: (fbProfile && fbProfile.name) || "",
    teacherId: item.teacherId || "",
    quizId: isExam ? null : item.id,
    examId: isExam ? item.id : null,
    lessonId: (!isExam && item.lessonId) ? item.lessonId : null,
    score, total: questions.length,
    answers: results,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  try {
    await fbDb.collection("quizAttempts").doc(docId).set(data);
  } catch (e) {
    btn.disabled = false;
    m.className = "msg bad"; m.textContent = "مشكلة في الحفظ: " + (e.message || e);
    return;
  }
  sShowResult(item, questions, results, isExam, given);
}

function sShowResult(item, questions, results, isExam, given) {
  const score = results.filter((r) => r.correct).length;
  const pct = Math.round((score / questions.length) * 100);
  app.innerHTML = `
    <div class="hdr">
      <h1>نتيجتك: ${score} من ${questions.length} (${pct}%)</h1>
      <div class="fact">${esc(item.title || "")}</div>
    </div>
    ${studentTabs("quiz")}
    <div class="card center">
      <div style="font-size:44px;">${pct >= 85 ? "🏆" : pct >= 50 ? "💪" : "📖"}</div>
      <h2 style="margin:8px 0; font-size:19px;">${pct >= 85 ? "ممتاز! نتيجة رائعة 🎉" : pct >= 50 ? "كويس — راجع الغلط وجرّب تاني" : "راجع الدرس وحاول مرة تانية"}</h2>
      <div class="btnrow" style="justify-content:center;">
        ${!isExam ? `<button type="button" class="btn" id="sr-retry">إعادة الكويز</button>` : ""}
        <a class="btn ghost" href="#/student/quizexams">رجوع للكويزات والامتحانات</a>
      </div>
    </div>
    ${questions.map((q, i) => `
    <div class="card" style="border-right:4px solid ${results[i].correct ? "#16a34a" : "#dc2626"};">
      <h3 style="font-size:15.5px; margin-top:0;">س${i + 1}: ${esc(q.q || "")}</h3>
      ${qImgHtml(q)}
      <div style="font-size:14px;">إجابتك: ${esc(sGivenText(q, given[i]))} ${results[i].correct ? "✅" : "❌"}</div>
      ${results[i].correct ? "" : `<div class="muted" style="font-size:13px; margin-top:4px;">الإجابة الصحيحة: ${esc(sCorrectText(q))}</div>`}
    </div>`).join("")}
    ${closing()}`;
  bindStudentTabs();
  const r = document.getElementById("sr-retry");
  if (r) r.onclick = () => renderStudentTake(item.id, isExam);
  window.scrollTo(0, 0);
}

/* ---------- تاب القادم: أجندة الدروس المجدولة والامتحانات اللي ليها معاد ---------- */
/* الدروس المجدولة اللي لسه منزلتش، مرتبة بأقرب معاد */
function sUpcomingLessons() {
  return (studentData.lessons || []).filter((l) => sVisible(l) && termOf(l) === sTerm() && !sTeacherLocked(l))
    .filter((l) => l.publishAt && l.publishAt.toDate && l.publishAt.toDate() > new Date())
    .sort((a, b) => a.publishAt.seconds - b.publishAt.seconds);
}
/* الامتحانات القادمة: هتفتح قريب، أو مفتوحة دلوقتي وليها قفل جاي */
function sUpcomingExams() {
  const now = new Date();
  return (studentData.exams || []).filter((e) => sVisible(e) && termOf(e) === sTerm() && !sTeacherLocked(e))
    .filter((e) => !e.closed && ((e.openAt && e.openAt.toDate && e.openAt.toDate() > now)
      || ((!e.openAt || e.openAt.toDate() <= now) && e.closeAt && e.closeAt.toDate && e.closeAt.toDate() > now)))
    .sort((a, b) => sUpcomingExamTs(a) - sUpcomingExamTs(b));
}
/* مفتاح ترتيب الامتحان في الأجندة: معاد الفتح لو لسه جاي، وإلا معاد القفل */
function sUpcomingExamTs(e) {
  const now = new Date();
  if (e.openAt && e.openAt.toDate && e.openAt.toDate() > now) return e.openAt.seconds;
  return (e.closeAt && e.closeAt.seconds) || 0;
}
function sUpLessonCard(l) {
  const tchr = (studentData.teachers || []).find((t) => t.id === l.teacherId) || {};
  return `<div class="card" style="margin:0;">
    <div class="btnrow" style="justify-content:space-between;"><b style="font-size:15px;">${esc(l.title || "")}</b><span class="chip amber">🕒 ينزل ${fmtTs(l.publishAt)}</span></div>
    <div class="muted" style="font-size:13px; margin-top:4px;">${esc(l.subject || "")}${tchr.name ? " · " + esc(tchr.name) : ""}</div>
    <div class="muted" style="font-size:12px; margin:4px 0;">${l.videoUrl ? "🎬 فيديو" : ""}${l.videoUrl && l.pdfUrl ? " · " : ""}${l.pdfUrl ? "📄 PDF" : ""}</div>
  </div>`;
}
function sUpExamCard(e) {
  const opens = e.openAt && e.openAt.toDate && e.openAt.toDate() > new Date();
  return `<div class="card" style="margin:0;">
    <div class="btnrow" style="justify-content:space-between;"><b style="font-size:15px;">${esc(e.title || "")}</b><span class="chip ${opens ? "amber" : "green"}">${opens ? "يفتح " + fmtTs(e.openAt) : "مفتوح · يقفل " + fmtTs(e.closeAt)}</span></div>
    ${e.desc ? `<div class="muted" style="font-size:13px; margin-top:4px;">${esc(e.desc)}</div>` : ""}
    <div class="muted" style="font-size:12px; margin:4px 0;">📝 ${(e.quiz || []).length} سؤال</div>
  </div>`;
}
async function renderStudentUpcoming() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل الجدول...</div>`;
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const lessons = sUpcomingLessons();
  const exams = sUpcomingExams();
  app.innerHTML = `
    <div class="hdr"><h1>القادم 🗓️</h1><div class="fact">الدروس والامتحانات اللي ليها معاد قريب، مرتبة بأقرب معاد</div></div>
    ${studentTabs("upcoming")}
    ${termTabsHtml(sTerm())}
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">دروس هتنزل قريب (${lessons.length})</h2>
      ${lessons.length ? `<div style="display:grid; gap:12px; margin-top:12px;">${lessons.map(sUpLessonCard).join("")}</div>` : `<p class="muted center" style="margin-top:12px;">مفيش دروس مجدولة دلوقتي.</p>`}
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">امتحانات قادمة (${exams.length})</h2>
      ${exams.length ? `<div style="display:grid; gap:12px; margin-top:12px;">${exams.map(sUpExamCard).join("")}</div>` : `<p class="muted center" style="margin-top:12px;">مفيش امتحانات ليها معاد قريب.</p>`}
    </div>
    ${closing()}`;
  bindStudentTabs();
  bindTermTabs((t) => { sTermTab = t; renderStudentUpcoming(); });
  window.scrollTo(0, 0);
}

/* ---------- مستويات الطالب: نقاط تحفيزية خاصة، مفيش ترتيب بين الطلبة ---------- */
const S_LEVELS = [
  { min: 0, name: "مبتدئ", icon: "🌱" },
  { min: 100, name: "مجتهد", icon: "💪" },
  { min: 300, name: "متفوق", icon: "🏆" },
];
/* نقاط الطالب: 10 لكل درس اتشاف + 20 لكل اختبار ناجح (50% أو أكتر) */
function sPoints() {
  const lessonIds = new Set((studentData.lessons || []).map((l) => l.id));
  const watched = [...sWatchedSet()].filter((id) => lessonIds.has(id)).length;
  const passed = (studentData.attempts || []).filter((a) => a.total > 0 && a.score / a.total >= 0.5).length;
  return watched * 10 + passed * 20;
}
/* المستوى الحالي والمستوى الجاي من جدول S_LEVELS */
function sLevelFor(points) {
  let cur = S_LEVELS[0], next = null;
  for (const lv of S_LEVELS) { if (points >= lv.min) cur = lv; else { next = lv; break; } }
  return { cur, next };
}
function sLevelCardHtml() {
  const pts = sPoints();
  const lv = sLevelFor(pts);
  const pct = lv.next ? Math.round(((pts - lv.cur.min) / (lv.next.min - lv.cur.min)) * 100) : 100;
  return `<div class="card tint-amber">
    <div class="btnrow" style="justify-content:space-between;">
      <b style="font-size:16px;">${lv.cur.icon} مستواك: ${lv.cur.name}</b>
      <span class="chip amber">⭐ ${pts} نقطة</span>
    </div>
    <div class="sprog" style="margin-top:10px;">
      <span class="sprog-track"><span class="sprog-fill" style="width:${pct}%; background:#f59e0b;"></span></span>
    </div>
    <div class="muted" style="font-size:12px; margin-top:8px;">${lv.next ? `فاضل ${lv.next.min - pts} نقطة وتوصل مستوى «${lv.next.name}» ${lv.next.icon} — كل درس بتشوفه بـ 10 نقاط وكل اختبار ناجح بـ 20.` : "مبروك! وصلت أعلى مستوى 🏆 — كمّل بنفس الحماس."}</div>
  </div>`;
}

/* ---------- راجع غلطاتك: الأسئلة اللي الطالب غلط فيها من آخر محاولة لكل اختبار ---------- */
/* بيرجع كل سؤال غلط مع مصدره؛ محاولة إعادة الحل بتستبدل القديمة فالغلط دايماً من آخر محاولة */
function sMistakes() {
  const out = [];
  for (const att of (studentData.attempts || [])) {
    const isExam = !!att.examId;
    const item = isExam
      ? (studentData.exams || []).find((e) => e.id === att.examId)
      : (studentData.quizzes || []).find((q) => q.id === att.quizId);
    if (!item) continue;
    const qs = isExam ? (item.quiz || []) : (item.questions || []);
    (att.answers || []).forEach((a, i) => {
      if (a && a.correct === false && qs[i]) out.push({ q: qs[i], idx: i, item, isExam });
    });
  }
  return out;
}
/* كارت الدخول فوق تاب الكويزات — بيظهر بس لو في غلطات فعلاً */
function sMistakesCardHtml() {
  const n = sMistakes().length;
  if (!n) return "";
  return `<div class="card tint-red">
    <div class="btnrow" style="justify-content:space-between; flex-wrap:wrap;">
      <b style="font-size:15.5px;">🎯 عندك ${n === 1 ? "سؤال واحد غلط" : n + " أسئلة غلط"} من اختباراتك — راجعهم قبل الامتحان</b>
      <button type="button" class="btn sm" data-gomistakes>راجع غلطاتك</button>
    </div>
  </div>`;
}
function bindMistakesBtn() {
  document.querySelectorAll("[data-gomistakes]").forEach((b) => b.onclick = () => { location.hash = "#/student/mistakes"; });
}
/* صفحة المراجعة: الغلطات متجمعة حسب الاختبار، ومع كل سؤال إجابته الصحيحة */
async function renderStudentMistakes() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنجمع غلطاتك...</div>`;
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const groups = [];
  for (const m of sMistakes()) {
    const key = (m.isExam ? "x" : "q") + m.item.id;
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, item: m.item, isExam: m.isExam, list: [] }; groups.push(g); }
    g.list.push(m);
  }
  const total = groups.reduce((s, g) => s + g.list.length, 0);
  app.innerHTML = `
    <div class="hdr"><h1>راجع غلطاتك 🎯</h1><div class="fact">الأسئلة اللي غلطت فيها من آخر محاولة لكل اختبار، ومعاها الإجابة الصحيحة</div></div>
    ${studentTabs("quiz")}
    <div class="btnrow" style="margin-bottom:10px;"><a class="btn ghost" href="#/student/quizexams">← رجوع للكويزات والامتحانات</a></div>
    ${!total ? `<div class="card center" style="padding:30px;"><b style="font-size:17px;">مفيش غلطات 🎉</b><p class="muted" style="margin-top:8px;">كل إجاباتك في آخر محاولاتك صح — كمّل كده!</p></div>` : groups.map((g) => `
    <div class="card">
      <div class="btnrow" style="justify-content:space-between; flex-wrap:wrap;">
        <b style="font-size:16px;">${esc(g.item.title || "")}</b>
        <span class="chip ${g.isExam ? "amber" : ""}">${g.isExam ? "امتحان" : "كويز"} · ${g.list.length === 1 ? "سؤال غلط واحد" : g.list.length + " أسئلة غلط"}</span>
      </div>
      <div style="display:grid; gap:10px; margin-top:12px;">
        ${g.list.map((m) => `<div class="card card-sub" style="margin:0;">
          <b style="font-size:14.5px;">س${m.idx + 1}: ${esc(m.q.q || "")}</b>
          ${qImgHtml(m.q)}
          <div style="font-size:13.5px; margin-top:6px; color:var(--green); font-weight:700;">✅ الإجابة الصحيحة: ${esc(sCorrectText(m.q))}</div>
        </div>`).join("")}
      </div>
      <div class="btnrow" style="margin-top:12px;">
        <a class="btn sm ghost" href="#/student/${g.isExam ? "exam" : "quiz"}/${g.item.id}">افتح ${g.isExam ? "الامتحان" : "الكويز"} تاني</a>
      </div>
    </div>`).join("")}
    ${closing()}`;
  bindStudentTabs();
  window.scrollTo(0, 0);
}

/* ---------- تاب المكتبة: المحتوى العام اللي الأدمن بينزله لكل الطلبة ---------- */
function sLibraryCard(it) {
  const emb = it.videoUrl ? videoEmbed(it.videoUrl) : null;
  return `<div class="card" style="margin:0;">
    <div class="btnrow" style="justify-content:space-between; flex-wrap:wrap;">
      <b style="font-size:15.5px;">${esc(it.title || "")}</b>
      ${it.subject ? `<span class="chip">${esc(it.subject)}</span>` : ""}
    </div>
    ${it.desc ? `<p class="muted" style="font-size:13.5px; margin:6px 0;">${esc(it.desc)}</p>` : ""}
    ${emb ? `<div style="border-radius:14px; overflow:hidden; aspect-ratio:16/9; background:#0f172a; margin-top:8px;"><iframe src="${esc(emb.src)}" style="width:100%; height:100%; border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ""}
    ${it.pdfUrl ? `<div class="btnrow" style="margin-top:10px;"><a class="btn ghost" target="_blank" rel="noopener" href="${esc(it.pdfUrl)}">📄 فتح ملف الـ PDF</a></div>` : ""}
  </div>`;
}
async function renderStudentLibrary() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل المكتبة...</div>`;
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const items = studentData.library || [];
  app.innerHTML = `
    <div class="hdr"><h1>المكتبة 📚</h1><div class="fact">محتوى عام من إدارة المنصة لكل الطلبة — مراجعات ونماذج امتحانات وفيديوهات</div></div>
    ${studentTabs("library")}
    ${items.length ? `<div style="display:grid; gap:12px;">${items.map(sLibraryCard).join("")}</div>` : `<div class="card center" style="padding:30px;"><b style="font-size:16px;">المكتبة فاضية لسه</b><p class="muted" style="margin-top:8px;">أول ما الإدارة تنزل محتوى عام هيظهر هنا.</p></div>`}
    ${closing()}`;
  bindStudentTabs();
  window.scrollTo(0, 0);
}

/* ---------- تاب الإعلانات ---------- */
async function renderStudentAnn() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل الإعلانات...</div>`;
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  // إعلانات المدرس الموقوف عن الطالب ما تظهرش له
  const list = (studentData.ann || []).filter((a) => sVisible(a) && !sSuspendedSet().has(a.teacherId))
    .sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));
  app.innerHTML = `
    <div class="hdr">
      <h1>الإعلانات 📢</h1>
      <div class="fact">${esc((fbProfile && fbProfile.grade) || "")}</div>
    </div>
    ${studentTabs("ann")}
    ${list.length ? list.map((a) => `
    <div class="card">
      <div class="btnrow" style="justify-content:space-between;"><b style="font-size:15px;">📢 ${esc(a.text || "")}</b>${(a.grade || "") ? `<span class="chip">${esc(a.grade)}</span>` : `<span class="chip green">كل الصفوف</span>`}</div>
      <div class="muted" style="font-size:12px; margin-top:4px;">${sTeacherChip(a.teacherId, a.teacherName)}${a.createdAt ? " · " + fmtTs(a.createdAt) : ""}</div>
    </div>`).join("") : `
    <div class="card center">
      <div style="font-size:44px;">📢</div>
      <h2 style="font-size:20px; margin:8px 0;">مفيش إعلانات ليك لسه</h2>
      <p class="muted">إعلانات مدرسيك لصفك هتظهر هنا أول ما تتنشر.</p>
    </div>`}
    ${closing()}`;
  bindStudentTabs();
  window.scrollTo(0, 0);
}

/* ---------- تاب درجاتي ---------- */
async function renderStudentGrades() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل درجاتك...</div>`;
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const myGrade = (fbProfile && fbProfile.grade) || "";
  // بعد النقل لصف جديد الطالب يشوف درجات محتوى صفه الجديد بس؛ درجات الصف القديم محفوظة على السيرفر للتقارير
  const contentOf = (a) => a.examId
    ? (studentData.exams || []).find((e) => e.id === a.examId)
    : a.quizId
      ? (studentData.quizzes || []).find((q) => q.id === a.quizId)
      : (studentData.lessons || []).find((l) => l.id === a.lessonId);
  const atts = (studentData.attempts || []).slice()
    .filter((a) => { const c = contentOf(a); return !c || !c.grade || c.grade === myGrade; })
    .sort((a, b) => ((b.updatedAt && b.updatedAt.seconds) || 0) - ((a.updatedAt && a.updatedAt.seconds) || 0));
  const nameFor = (a) => {
    if (a.examId) return ((studentData.exams || []).find((e) => e.id === a.examId) || {}).title || "امتحان";
    if (a.quizId) return ((studentData.quizzes || []).find((q) => q.id === a.quizId) || {}).title || "كويز";
    return ((studentData.lessons || []).find((l) => l.id === a.lessonId) || {}).title || "كويز درس";
  };
  const pcts = atts.map((a) => (a.total > 0 ? (a.score / a.total) * 100 : 0));
  const avg = pcts.length ? Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length) : null;
  app.innerHTML = `
    <div class="hdr">
      <h1>درجاتي 📊</h1>
      <div class="fact">${esc((fbProfile && fbProfile.grade) || "")}</div>
    </div>
    ${studentTabs("grades")}
    <div class="statcards">
      <div class="statcard"><div class="num">${atts.length}</div><div class="lbl">اختبار حليته</div></div>
      <div class="statcard"><div class="num">${avg !== null ? avg + "%" : "—"}</div><div class="lbl">متوسط درجاتك</div></div>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">سجل الكويزات والامتحانات</h2>
      ${atts.length ? `<div style="overflow-x:auto;"><table class="ttable">
        <thead><tr><th>الاختبار</th><th>النوع</th><th>الدرجة</th><th>النسبة</th><th>آخر محاولة</th></tr></thead>
        <tbody>${atts.map((a) => {
          const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
          return `<tr>
            <td>${esc(nameFor(a))}</td>
            <td>${a.examId ? "امتحان" : "كويز"}</td>
            <td>${a.score} من ${a.total}</td>
            <td><span class="chip ${pct >= 85 ? "green" : pct >= 50 ? "amber" : "red"}">${pct}%</span></td>
            <td>${a.updatedAt ? fmtTs(a.updatedAt) : "—"}</td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>` : `<p class="muted center">لسه ما حليتش أي كويز أو امتحان. ابدأ من تاب "الكويزات والامتحانات".</p>`}
    </div>
    ${closing()}`;
  bindStudentTabs();
  window.scrollTo(0, 0);
}

/* ---------- تاب حسابي: الصورة والبروفايل ----------
   الصورة بتتصغّر في المتصفح لـ 256×256 JPEG وتتحفظ كنص في حقل avatar في مستند الطالب.
   مفيش Firebase Storage (الخطة المجانية)، ومفيش تغيير في القواعد:
   الطالب مسموح له يعدل مستنده طالما status/email/teacherIds زي ما هما. */
function sAvatarHtml(size) {
  const av = (fbProfile && fbProfile.avatar) || "";
  const nm = ((fbProfile && fbProfile.name) || "").trim();
  if (av) return `<img src="${av}" alt="" style="width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; display:inline-block; vertical-align:middle; border:2px solid var(--primary-soft);">`;
  return `<span style="width:${size}px; height:${size}px; border-radius:50%; background:var(--primary); color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:${Math.round(size * 0.45)}px; font-weight:800; vertical-align:middle;">${esc(nm ? nm[0] : "؟")}</span>`;
}

async function renderStudentProfile() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل حسابك...</div>`;
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const s = fbProfile || {};
  const atts = studentData.attempts || [];
  const pcts = atts.map((a) => (a.total > 0 ? Math.round((a.score / a.total) * 100) : 0));
  const avg = pcts.length ? Math.round(pcts.reduce((x, y) => x + y, 0) / pcts.length) : null;
  const best = pcts.length ? Math.max(...pcts) : null;
  const row = (lbl, val, ltr) => `<div class="btnrow" style="justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:8px;"><span class="muted">${lbl}</span><b ${ltr ? 'class="ltr"' : ""}>${esc(val)}</b></div>`;
  app.innerHTML = `
    <div class="hdr">
      <h1 style="display:flex; align-items:center; gap:10px;">${sAvatarHtml(44)} حسابي</h1>
      <div class="fact">${esc(s.grade || "")}</div>
    </div>
    ${studentTabs("profile")}
    <div class="card center" style="padding:28px;">
      ${sAvatarHtml(120)}
      <h2 style="margin:10px 0 2px; font-size:20px;">${esc(s.name || "")}</h2>
      <div class="muted">${esc(s.grade || "")}</div>
      <div class="btnrow" style="justify-content:center; margin-top:12px;">
        <button type="button" class="btn sm" id="sp-pick">📷 ${s.avatar ? "تغيير الصورة" : "إضافة صورة"}</button>
        ${s.avatar ? `<button type="button" class="btn sm ghost" id="sp-del">حذف الصورة</button>` : ""}
      </div>
      <input type="file" id="sp-file" accept="image/*" style="display:none;">
      <div class="muted" style="font-size:12px; margin-top:6px;">الصورة بتتصغّر لوحدها قبل الحفظ — أي صورة من موبايلك تنفع.</div>
      <p class="msg" id="sp-msg"></p>
    </div>
    ${sLevelCardHtml()}
    <div class="statcards">
      <div class="statcard"><div class="num">${atts.length}</div><div class="lbl">اختبار حليته</div></div>
      <div class="statcard"><div class="num">${avg !== null ? avg + "%" : "—"}</div><div class="lbl">متوسط درجاتك</div></div>
      <div class="statcard"><div class="num">${best !== null ? best + "%" : "—"}</div><div class="lbl">أعلى نتيجة ليك</div></div>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">بياناتك</h2>
      <div style="display:grid; gap:10px; margin-top:10px;">
        ${row("الاسم", s.name || "—")}
        ${row("الصف", s.grade || "—")}
        ${row("الإيميل", fbUser.email || "—", true)}
        <div class="btnrow" style="justify-content:space-between;"><span class="muted">رقم ولي الأمر</span><b class="ltr">${esc(s.parentPhone || "—")}</b></div>
      </div>
      <p class="muted" style="font-size:12.5px; margin-top:12px;">الاسم والصف ورقم ولي الأمر بيتحدثوا من مدرسك أو الأدمن — لو في حاجة غلط كلّم مدرسك.</p>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">🔒 الباسورد</h2>
      <div id="sp-pass-form" style="display:none; margin-top:10px;">
        <div style="display:grid; gap:10px; max-width:340px;">
          <input type="password" class="inp ltr" id="sp-p1" placeholder="الباسورد الجديد (٦ حروف على الأقل)">
          <input type="password" class="inp ltr" id="sp-p2" placeholder="تأكيد الباسورد الجديد">
          <div class="btnrow"><button type="button" class="btn sm" id="sp-pass-save">حفظ الباسورد</button></div>
        </div>
      </div>
      <div class="btnrow" id="sp-pass-open-row"><button type="button" class="btn ghost sm" id="sp-pass-open">تغيير الباسورد</button></div>
      <p class="msg" id="sp-pass-msg"></p>
    </div>
    ${closing()}`;
  bindStudentTabs();
  const msg = document.getElementById("sp-msg");
  document.getElementById("sp-pick").onclick = () => document.getElementById("sp-file").click();
  document.getElementById("sp-file").onchange = (e) => sAvatarSave(e.target.files && e.target.files[0], msg);
  const del = document.getElementById("sp-del");
  if (del) del.onclick = async () => {
    if (!confirm("متأكد إنك عايز تحذف صورتك؟")) return;
    try {
      await fbDb.collection("students").doc(fbUser.uid).update({ avatar: firebase.firestore.FieldValue.delete() });
      fbProfile.avatar = null;
      renderStudentProfile();
    } catch (e) { msg.className = "msg bad"; msg.textContent = "مشكلة في الحذف: " + (e.message || e); }
  };
  document.getElementById("sp-pass-open").onclick = () => {
    document.getElementById("sp-pass-form").style.display = "block";
    document.getElementById("sp-pass-open-row").style.display = "none";
  };
  document.getElementById("sp-pass-save").onclick = () => sChangePass();
  window.scrollTo(0, 0);
}

// تصغير الصورة في المتصفح وحفظها كنص في مستند الطالب
function sAvatarSave(file, msg) {
  if (!file) return;
  if (!file.type || !file.type.startsWith("image/")) {
    msg.className = "msg bad"; msg.textContent = "اختار ملف صورة.";
    return;
  }
  msg.className = "msg"; msg.textContent = "بنصغّر الصورة ونحفظها...";
  const reader = new FileReader();
  reader.onerror = () => { msg.className = "msg bad"; msg.textContent = "مشكلة في قراءة الصورة."; };
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => { msg.className = "msg bad"; msg.textContent = "الملف ده مش صورة صالحة."; };
    img.onload = async () => {
      try {
        const size = 256;
        const c = document.createElement("canvas");
        c.width = size; c.height = size;
        const ctx = c.getContext("2d");
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        const dataUrl = c.toDataURL("image/jpeg", 0.82);
        await fbDb.collection("students").doc(fbUser.uid).update({ avatar: dataUrl });
        fbProfile.avatar = dataUrl;
        renderStudentProfile();
      } catch (e) { msg.className = "msg bad"; msg.textContent = "مشكلة في الحفظ: " + (e.message || e); }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function sChangePass() {
  const m = document.getElementById("sp-pass-msg");
  const p1 = document.getElementById("sp-p1").value;
  const p2 = document.getElementById("sp-p2").value;
  if (p1.length < 6) { m.className = "msg bad"; m.textContent = "الباسورد لازم يكون ٦ حروف على الأقل."; return; }
  if (p1 !== p2) { m.className = "msg bad"; m.textContent = "الباسوردين مش متطابقين."; return; }
  m.className = "msg"; m.textContent = "بنحفظ...";
  try {
    await fbAuth.currentUser.updatePassword(p1);
    m.className = "msg good"; m.textContent = "تمام، الباسورد اتغير ✅";
  } catch (e) {
    m.className = "msg bad";
    m.textContent = (e && e.code === "auth/requires-recent-login")
      ? "لازم تسجل دخول من جديد الأول عشان تغير الباسورد. اخرج وادخل تاني وجرب."
      : "مشكلة: " + (e.message || e);
  }
}
