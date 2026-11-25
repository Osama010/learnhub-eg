/* ---------- بوابة الطالب ----------
   أول دخول بعد القبول: إيميل + الرقم السري → يختار باسورده → دخول عادي.
   لو عنده حساب Auth من غير باسورد معروف، الرقم السري بيأكد هويته. */

async function renderStudentHome() {
  if (fbRole === "blocked") {
    const st = fbProfile && fbProfile.status;
    app.innerHTML = `
      <div class="card center" style="max-width:520px; margin:60px auto;">
        <div style="font-size:44px;">⏳</div>
        <h1 style="font-size:22px; margin:8px 0;">${st === "rejected" ? "طلبك اترفض" : "طلبك لسه تحت المراجعة"}</h1>
        <p class="muted">${st === "rejected" ? "للأسف طلبك ما اتقبلش. لو في خطأ كلّم مدرسك." : "المدرس لسه ما وافقش على طلبك. ارجع كمان شوية."}</p>
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
  app.innerHTML = `
    <div class="hdr">
      <h1>أهلاً ${esc(s.name || "")} 🎓</h1>
      <div class="fact">${esc(fbUser.email)} · ${esc(s.grade || "")} · <a href="javascript:signOut()" style="color:var(--primary-dark);">خروج</a></div>
    </div>
    <div class="card center" style="max-width:560px; margin:20px auto;">
      <div style="font-size:44px;">📚</div>
      <h2 style="font-size:20px; margin:8px 0;">موادك ودروسك</h2>
      <p class="muted">صفحة دروس الطالب هتتفعل قريب، وهتبقى فيها دروس المدرسين اللي مسجل معاهم.</p>
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
  });
  if (l.studentId && l.studentId !== cred.user.uid) {
    await fbDb.collection("students").doc(l.studentId).delete();
  }
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
    m.textContent = "";
    if (!/^[0-9]{4,6}$/.test(pin)) return m.textContent = "اكتب الرقم السري صح.";
    if (p1.length < 6) return m.textContent = "الباسورد لازم يكون 6 أحرف على الأقل.";
    if (p1 !== p2) return m.textContent = "الباسوردين مش زي بعض.";
    try {
      await studentFirstLogin(email, pin, p1);
      await resolveRole(fbAuth.currentUser);
      route();
    } catch (e) {
      m.textContent = e.code ? authErrAr(e) : (e.message || "حصلت مشكلة.");
    }
  };
  window.scrollTo(0, 0);
}
