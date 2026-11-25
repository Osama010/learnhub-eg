/* ---------- المصادقة والأدوار ----------
   الأدوار: admin (الأدمن - صاحب المنصة) | teacher (مدرس سجله الأدمن) | student (طالب)
   الطالب: يسجل بياناته من غير باسورد → المدرس يوافق → أول دخول بإيميله + رقمه السري
   ويختار باسورده بنفسه → بعدها دخول عادي إيميل + باسورد. */

const GRADES = [
  "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
  "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
  "الصف الأول الإعدادي", "الصف الثاني الإعدادي", "الصف الثالث الإعدادي",
  "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي",
];

let fbApp = null;
let fbAuth = null;
let fbDb = null;
let fbUser = null;
let fbReady = false;
let fbRole = null;      // admin | teacher | student | null
let fbProfile = null;   // بيانات المدرس أو الطالب

function initFirebase() {
  fbApp = firebase.initializeApp(FIREBASE_CONFIG);
  fbAuth = firebase.auth();
  fbDb = firebase.firestore();
  fbAuth.onAuthStateChanged(async (u) => {
    fbReady = true;
    fbUser = u;
    fbRole = null;
    fbProfile = null;
    if (u) await resolveRole(u);
    route();
  });
}

async function resolveRole(u) {
  try {
    if (u.email === ADMIN_EMAIL) { fbRole = "admin"; return; }
    // مشرف إضافي: إيميله مسجل في مجموعة admins
    try {
      const a = await fbDb.collection("admins").doc((u.email || "").toLowerCase()).get();
      if (a.exists) { fbRole = "admin"; fbProfile = { id: u.uid, ...a.data() }; return; }
    } catch (_) {}
    const t = await fbDb.collection("teachers").doc(u.uid).get();
    if (t.exists && t.data().active !== false) {
      fbRole = "teacher";
      fbProfile = { id: u.uid, ...t.data() };
      return;
    }
    const s = await fbDb.collection("students").doc(u.uid).get();
    if (s.exists) {
      const d = s.data();
      if (d.status === "approved") {
        fbRole = "student";
        fbProfile = { id: u.uid, ...d };
      } else {
        fbRole = "blocked";
        fbProfile = { id: u.uid, ...d };
      }
      return;
    }
    fbRole = "unknown";
  } catch (e) {
    console.warn("فشل تحديد الدور", e);
    fbRole = "unknown";
  }
}

function signOut() { fbAuth.signOut(); }

function authErrAr(e) {
  const c = (e && e.code) || "";
  if (c.includes("user-not-found") || c.includes("wrong-password") || c.includes("invalid-credential")) return "الإيميل أو الباسورد غلط.";
  if (c.includes("email-already-in-use")) return "الإيميل ده متسجل قبل كده.";
  if (c.includes("invalid-email")) return "الإيميل مش مكتوب صح.";
  if (c.includes("weak-password")) return "الباسورد ضعيف، خليه 6 حروف أو أرقام على الأقل.";
  if (c.includes("too-many-requests")) return "محاولات كتير، استنى شوية وجرّب تاني.";
  if (c.includes("network")) return "مشكلة في النت، اتأكد من الاتصال وجرّب تاني.";
  return "حصلت مشكلة، جرّب تاني.";
}

/* ---------- صفحة الدخول: كارت لكل دور ---------- */
let loginRole = "student";

function renderLogin() {
  const roles = [
    { id: "student", icon: "🎓", name: "طالب", desc: "دروسك واختباراتك" },
    { id: "teacher", icon: "📚", name: "مدرس", desc: "طلابك وتقاريرك" },
    { id: "admin", icon: "🛠️", name: "أدمن", desc: "إدارة المنصة" },
  ];
  app.innerHTML = `
    <div class="hdr" style="margin-top:32px;">
      <h1>منصة دروس البرمجة والذكاء الاصطناعي</h1>
      <div class="fact">اختار نوع حسابك وسجّل دخولك</div>
    </div>
    <div class="card" style="max-width:520px; margin:0 auto;">
      <div class="rolecards">
        ${roles.map((r) => `
          <button type="button" class="rolecard ${loginRole === r.id ? "active" : ""}" data-role="${r.id}">
            <div class="ric">${r.icon}</div>
            <div class="rname">${r.name}</div>
            <div class="rdesc">${r.desc}</div>
          </button>`).join("")}
      </div>
      <div id="login-form"></div>
      <p class="msg bad" id="login-msg"></p>
      <div class="center muted" style="margin-top:10px; border-top:1px solid var(--line); padding-top:12px;">
        طالب جديد؟ <a href="#/register" style="color:var(--primary-dark); font-weight:700;">سجّل حسابك من هنا</a>
      </div>
    </div>
    ${closing()}`;
  document.querySelectorAll(".rolecard").forEach((b) => {
    b.onclick = () => {
      loginRole = b.dataset.role;
      document.querySelectorAll(".rolecard").forEach((x) => x.classList.toggle("active", x === b));
      renderLoginForm();
    };
  });
  renderLoginForm();
  window.scrollTo(0, 0);
}

function renderLoginForm() {
  const el = document.getElementById("login-form");
  if (!el) return;
  if (loginRole === "student") {
    el.innerHTML = `
      <label class="flabel">الإيميل</label>
      <input id="li-email" type="email" class="inp ltr" placeholder="student@example.com">
      <label class="flabel">الباسورد</label>
      <input id="li-pass" type="password" class="inp ltr" placeholder="••••••••">
      <button type="button" class="btn" id="li-btn" style="width:100%;">دخول</button>
      <p class="muted" style="font-size:13px; margin-top:8px;">أول مرة تدخل بعد ما المدرس قبلك؟ اكتب إيميلك والرقم السري اللي سجلت بيه، وهنخليك تختار باسوردك.</p>`;
    document.getElementById("li-btn").onclick = () => doLogin("student");
  } else if (loginRole === "teacher") {
    el.innerHTML = `
      <label class="flabel">الإيميل</label>
      <input id="li-email" type="email" class="inp ltr" placeholder="teacher@example.com">
      <label class="flabel">الباسورد</label>
      <input id="li-pass" type="password" class="inp ltr" placeholder="••••••••">
      <button type="button" class="btn" id="li-btn" style="width:100%;">دخول</button>
      <p class="muted" style="font-size:13px; margin-top:8px;">حسابات المدرسين بيعملها الأدمن. لو نسيت الباسورد كلّم الأدمن يعملك إعادة ضبط.</p>`;
    document.getElementById("li-btn").onclick = () => doLogin("teacher");
  } else {
    el.innerHTML = `
      <label class="flabel">الإيميل</label>
      <input id="li-email" type="email" class="inp ltr" placeholder="admin@gmail.com">
      <label class="flabel">الباسورد</label>
      <input id="li-pass" type="password" class="inp ltr" placeholder="••••••••">
      <button type="button" class="btn" id="li-btn" style="width:100%;">دخول</button>
      <div class="center" style="margin:8px 0 4px;"><a href="javascript:void(0)" id="li-forgot" style="color:var(--primary-dark); font-size:13px;">نسيت الباسورد؟</a></div>
      <div class="center muted" style="font-size:13px; margin:6px 0;">— أو —</div>
      <button type="button" class="btn blue" id="li-google" style="width:100%;">الدخول بحساب جوجل</button>
      <p class="muted" style="font-size:12.5px; margin-top:8px;">الدخول بالباسورد بيشتغل لو الأدمن ربط باسورد بحسابه من تاب المشرفين بعد دخوله بجوجل. كده محدش يقدر يعمل حساب بإيميل أدمن من عنده.</p>`;
    document.getElementById("li-btn").onclick = () => doLogin("admin");
    document.getElementById("li-google").onclick = doGoogleLogin;
    document.getElementById("li-forgot").onclick = doAdminForgot;
  }
}

async function doAdminForgot() {
  const email = document.getElementById("li-email").value.trim().toLowerCase();
  if (!email) return loginMsg("اكتب الإيميل الأول وبعدين اضغط نسيت الباسورد.");
  try {
    await fbAuth.sendPasswordResetEmail(email);
    loginMsg("لو الإيميل ده مسجل مشرف ومرتبط بباسورد، هيوصله لينك إعادة الضبط على إيميله.");
  } catch (e) {
    loginMsg(authErrAr(e));
  }
}

function loginMsg(t) { const m = document.getElementById("login-msg"); if (m) m.textContent = t || ""; }

async function doLogin(expectedRole) {
  const email = document.getElementById("li-email").value.trim();
  const pass = document.getElementById("li-pass").value;
  if (!email || !pass) return loginMsg("اكتب الإيميل والباسورد.");
  loginMsg("");
  try {
    const cred = await fbAuth.signInWithEmailAndPassword(email, pass);
    await resolveRole(cred.user);
    if (fbRole !== expectedRole) {
      await fbAuth.signOut();
      return loginMsg(expectedRole === "student"
        ? "الحساب ده مش حساب طالب. لو انت مدرس اختار كارت مدرس."
        : expectedRole === "teacher"
        ? "الحساب ده مش حساب مدرس."
        : "الحساب ده مش مسجل كمشرف. لو انت أدمن جديد، ادخل الأول بجوجل واربط باسورد من تاب المشرفين.");
    }
    route();
  } catch (e) {
    // طالب جديد بعد القبول؟ لو لسه معملش باسورد، نوديه يختاره بالرقم السري
    if (expectedRole === "student") {
      try {
        const lk = await fbDb.collection("registrationLookup").doc(email.toLowerCase()).get();
        if (lk.exists && lk.data().status === "approved" && lk.data().pinHash) {
          return renderFirstLogin(email.toLowerCase());
        }
      } catch (_) {}
    }
    loginMsg(authErrAr(e));
  }
}

async function doGoogleLogin() {
  loginMsg("");
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const cred = await fbAuth.signInWithPopup(provider);
    let isAdm = cred.user.email === ADMIN_EMAIL;
    if (!isAdm) {
      try {
        isAdm = (await fbDb.collection("admins").doc((cred.user.email || "").toLowerCase()).get()).exists;
      } catch (_) {}
    }
    if (!isAdm) {
      await fbAuth.signOut();
      return loginMsg("الحساب ده مش مسجل كمشرف. اطلب من الأدمن الأساسي يضيف إيميلك من تاب المشرفين.");
    }
    fbRole = "admin";
    route();
  } catch (e) {
    if (e && e.code !== "auth/popup-closed-by-user") loginMsg(authErrAr(e));
  }
}

/* ---------- تسجيل طالب جديد (من غير باسورد) ---------- */
let regTeachersCache = null;

async function renderRegister() {
  if (fbUser) return routeByRole();
  app.innerHTML = `<div class="spin">بنجهز فورم التسجيل...</div>`;
  if (!regTeachersCache) {
    try {
      const snap = await fbDb.collection("teachersPublic").where("active", "==", true).get();
      regTeachersCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) { regTeachersCache = []; }
  }
  app.innerHTML = `
    <div class="hdr" style="margin-top:32px;">
      <h1>تسجيل طالب جديد</h1>
      <div class="fact">بعد التسجيل طلبك يروح للمدرس يوافق عليه</div>
    </div>
    <div class="card" style="max-width:520px; margin:0 auto;">
      <label class="flabel">الاسم بالكامل</label>
      <input id="rg-name" type="text" class="inp" placeholder="اكتب اسمك">
      <label class="flabel">الإيميل</label>
      <input id="rg-email" type="email" class="inp ltr" placeholder="student@example.com">
      <label class="flabel">السنة الدراسية</label>
      <select id="rg-grade" class="inp">
        <option value="">اختار السنة الدراسية</option>
        ${GRADES.map((g) => `<option>${g}</option>`).join("")}
      </select>
      <label class="flabel">رقم الموبايل (واتساب)</label>
      <input id="rg-phone" type="tel" class="inp ltr" placeholder="01xxxxxxxxx">
      <label class="flabel">رقم موبايل ولي الأمر (واتساب) — إجباري</label>
      <input id="rg-parent-phone" type="tel" class="inp ltr" placeholder="01xxxxxxxxx">
      <label class="flabel">رقم سري (4 أرقام) — هتحتاجه أول مرة تدخل</label>
      <input id="rg-pin" type="password" inputmode="numeric" maxlength="6" class="inp ltr" placeholder="مثال: 2580">
      <label class="flabel">اختار مدرس واحد على الأقل</label>
      <div class="teachercheck" id="rg-teachers">
        ${regTeachersCache.length
          ? regTeachersCache.map((t) => `<label class="rg-t-row" data-stages="${(t.stages || []).join(",")}"><input type="checkbox" class="rg-t" value="${t.id}"> ${esc(t.name)}${t.subject ? " — " + esc(t.subject) : ""}</label>`).join("")
          : `<span class="muted">لسه مفيش مدرسين على المنصة</span>`}
      </div>
      <p class="muted" id="rg-t-note" style="font-size:12.5px; display:none;">مفيش مدرسين للمرحلة دي لسه، جرّب مرحلة تانية أو كلّم الأدمن.</p>
      <button type="button" class="btn" id="rg-btn" style="width:100%;">سجّل الطلب</button>
      <p class="msg bad" id="rg-msg"></p>
      <p class="muted" style="font-size:13px;">بعد ما المدرس يوافق، هتدخل بإيميلك ورقمك السري وتختار باسوردك بنفسك.</p>
      <div class="center muted" style="margin-top:8px;">عندك حساب؟ <a href="#/login" style="color:var(--primary-dark); font-weight:700;">سجّل دخولك</a></div>
    </div>
    ${closing()}`;
  document.getElementById("rg-btn").onclick = doRegister;
  document.getElementById("rg-grade").onchange = filterRegTeachers;
  window.scrollTo(0, 0);
}

function stageOfGrade(g) {
  if (!g) return "";
  if (g.includes("ابتدائي")) return "ابتدائي";
  if (g.includes("إعدادي")) return "إعدادي";
  return "ثانوي";
}

function filterRegTeachers() {
  const st = stageOfGrade(document.getElementById("rg-grade").value);
  let visible = 0;
  document.querySelectorAll(".rg-t-row").forEach((row) => {
    const stages = (row.dataset.stages || "").split(",").filter(Boolean);
    // المدرس اللي معملوله قبل ميزة المراحل (مفيش stages) يظهر لكل المراحل
    const show = !st || !stages.length || stages.includes(st);
    row.style.display = show ? "" : "none";
    if (show) visible++;
  });
  const note = document.getElementById("rg-t-note");
  if (note) note.style.display = visible === 0 && document.querySelectorAll(".rg-t-row").length ? "" : "none";
}

function regMsg(t, good) {
  const m = document.getElementById("rg-msg");
  if (m) { m.textContent = t || ""; m.className = "msg " + (good ? "good" : "bad"); }
}

async function sha256Hex(t) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function doRegister() {
  const name = document.getElementById("rg-name").value.trim();
  const email = document.getElementById("rg-email").value.trim().toLowerCase();
  const grade = document.getElementById("rg-grade").value;
  const phone = normalizeEgPhone(document.getElementById("rg-phone").value) || "";
  const parentPhone = normalizeEgPhone(document.getElementById("rg-parent-phone").value) || "";
  const pin = document.getElementById("rg-pin").value.trim();
  const teacherIds = Array.from(document.querySelectorAll(".rg-t:checked"))
    .filter((c) => { const row = c.closest(".rg-t-row"); return !row || row.style.display !== "none"; })
    .map((c) => c.value);
  if (!name) return regMsg("اكتب اسمك.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return regMsg("اكتب إيميل صح.");
  if (!grade) return regMsg("اختار السنة الدراسية.");
  if (!phone) return regMsg("اكتب رقم موبايل مصري صح (11 رقم يبدأ بـ 01).");
  if (!parentPhone) return regMsg("اكتب رقم موبايل ولي الأمر مصري صح (11 رقم يبدأ بـ 01).");
  if (parentPhone === phone) return regMsg("رقم ولي الأمر لازم يكون مختلف عن رقم الطالب.");
  if (!/^[0-9]{4,6}$/.test(pin)) return regMsg("الرقم السري من 4 لـ 6 أرقام.");
  if (!teacherIds.length) return regMsg("اختار مدرس واحد على الأقل.");
  regMsg("");
  try {
    // هل الإيميل مسجل قبل كده؟ (فهرس عام آمن، من غير كشف بيانات حد)
    const dup = await fbDb.collection("registrationLookup").doc(email).get();
    if (dup.exists) return regMsg("الإيميل ده مسجل قبل كده. لو نسيت بياناتك كلّم مدرسك.");
    const pinHash = await sha256Hex(email + ":" + pin);
    const ref = await fbDb.collection("students").add({
      name, email, grade, phone, parentPhone,
      pinHash,
      teacherIds,
      status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await fbDb.collection("registrationLookup").doc(email).set({
      pinHash,
      saltEmail: email,
      status: "pending",
      studentId: ref.id,
      teacherIds,
    });
    app.innerHTML = `
      <div class="card center" style="max-width:520px; margin:60px auto;">
        <div style="font-size:44px;">✅</div>
        <h1 style="font-size:22px; margin:8px 0;">طلبك اتسجل</h1>
        <p class="muted">طلبك وصل للمدرس. أول ما يوافق، ارجع لصفحة الدخول وادخل بإيميلك ورقمك السري، وهتختار باسوردك بنفسك.</p>
        <div class="btnrow" style="justify-content:center; margin-top:12px;"><a class="btn" href="#/login">صفحة الدخول</a></div>
      </div>
      ${closing()}`;
  } catch (e) {
    regMsg("حصلت مشكلة في التسجيل: " + (e.message || e));
  }
}
