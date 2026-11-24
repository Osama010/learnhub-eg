/* ---------- لوحة المدرس ----------
   طلبات الطلاب الجدد (قبول/رفض)، طلابه المقبولين، واتساب الطالب،
   إعادة ضبط الباسورد بإيميل، حذف طالب، وتغيير باسورده هو. */

let teacherCache = null;

async function teacherLoad() {
  const snap = await fbDb.collection("students").where("teacherIds", "array-contains", fbUser.uid).get();
  teacherCache = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));
}

async function renderTeacherDash() {
  app.innerHTML = `<div class="spin">بنحمل طلابك...</div>`;
  try { await teacherLoad(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const pending = teacherCache.filter((s) => s.status === "pending");
  const approved = teacherCache.filter((s) => s.status === "approved");
  app.innerHTML = `
    <div class="hdr">
      <h1>أهلاً ${esc(fbProfile ? fbProfile.name : "بيك")} 👋</h1>
      <div class="fact">${esc(fbUser.email)} · <a href="javascript:signOut()" style="color:var(--primary-dark);">خروج</a></div>
    </div>
    <div class="statcards">
      <div class="statcard"><div class="num">${approved.length}</div><div class="lbl">طلابك</div></div>
      <div class="statcard"><div class="num">${pending.length}</div><div class="lbl">طلبات جديدة</div></div>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">حسابك</h2>
      <div class="btnrow">
        <button type="button" class="btn ghost" id="t-pass">تغيير الباسورد</button>
        <span class="muted" style="font-size:13px;">هيوصلك إيميل بلينك تغيير الباسورد.</span>
      </div>
      <p class="msg" id="t-msg"></p>
    </div>
    ${pending.length ? `
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">طلبات تسجيل جديدة (${pending.length})</h2>
      <table class="ttable">
        <thead><tr><th>الاسم</th><th>السنة</th><th>الموبايل</th><th>الإيميل</th><th>إجراءات</th></tr></thead>
        <tbody>
          ${pending.map((s) => `<tr>
            <td>${esc(s.name)}</td><td>${esc(s.grade || "—")}</td><td class="ltr">${esc(s.phone)}</td><td class="ltr">${esc(s.email)}</td>
            <td>
              <div class="btnrow">
                <button type="button" class="btn sm" data-ok="${s.id}">قبول</button>
                <button type="button" class="btn sm red" data-no="${s.id}">رفض</button>
              </div>
            </td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>` : ""}
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">طلابك (${approved.length})</h2>
      <table class="ttable">
        <thead><tr><th>الاسم</th><th>السنة</th><th>تقدمه</th><th>إجراءات</th></tr></thead>
        <tbody>
          ${approved.length ? approved.map((s) => {
            const prog = (s.progress && s.progress["programming-ai"] && s.progress["programming-ai"].percent) || 0;
            return `<tr>
              <td>${esc(s.name)}</td><td>${esc(s.grade || "—")}</td><td>${prog}%</td>
              <td>
                <div class="btnrow">
                  <a class="btn sm green" target="_blank" href="${waLink(s.phone, "أهلاً " + s.name + "، معاك مدرسك من منصة الدروس.")}">واتساب</a>
                  <button type="button" class="btn sm ghost" data-rs="${s.id}">إعادة ضبط الباسورد</button>
                  <button type="button" class="btn sm red" data-dl="${s.id}">حذف</button>
                </div>
              </td>
            </tr>`;
          }).join("") : `<tr><td colspan="4" class="center muted">لسه مفيش طلاب مقبولين</td></tr>`}
        </tbody>
      </table>
    </div>
    ${closing()}`;
  document.getElementById("t-pass").onclick = async () => {
    try {
      await fbAuth.sendPasswordResetEmail(fbUser.email);
      const m = document.getElementById("t-msg");
      m.textContent = "اتبعت إيميل تغيير الباسورد لـ " + fbUser.email + " ✅";
      m.className = "msg good";
    } catch (e) {
      const m = document.getElementById("t-msg");
      m.textContent = authErrAr(e);
      m.className = "msg bad";
    }
  };
  document.querySelectorAll("[data-ok]").forEach((b) => b.onclick = () => teacherSetStatus(b.dataset.ok, "approved"));
  document.querySelectorAll("[data-no]").forEach((b) => b.onclick = () => teacherSetStatus(b.dataset.no, "rejected"));
  document.querySelectorAll("[data-rs]").forEach((b) => b.onclick = () => teacherResetStudent(b.dataset.rs));
  document.querySelectorAll("[data-dl]").forEach((b) => b.onclick = () => teacherDeleteStudent(b.dataset.dl));
  window.scrollTo(0, 0);
}

async function teacherSetStatus(id, status) {
  try {
    const s = teacherCache.find((x) => x.id === id);
    const batch = fbDb.batch();
    batch.update(fbDb.collection("students").doc(id), { status });
    if (s && s.email) {
      batch.update(fbDb.collection("registrationLookup").doc(String(s.email).toLowerCase()), { status });
    }
    await batch.commit();
    await teacherLoad();
    renderTeacherDash();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

async function teacherResetStudent(id) {
  const s = teacherCache.find((x) => x.id === id);
  if (!s) return;
  if (!confirm(`هيتبعت إيميل إعادة ضبط الباسورد لـ ${s.email}. موافق؟`)) return;
  try {
    await fbAuth.sendPasswordResetEmail(s.email);
    alert("اتبعت الإيميل ✅ الطالب يفتحه ويعمل باسورد جديد.");
  } catch (e) { alert(authErrAr(e)); }
}

async function teacherDeleteStudent(id) {
  const s = teacherCache.find((x) => x.id === id);
  if (!confirm(`متأكد إنك عايز تحذف الطالب "${s ? s.name : ""}" نهائياً؟`)) return;
  try {
    const batch = fbDb.batch();
    batch.delete(fbDb.collection("students").doc(id));
    if (s && s.email) {
      batch.delete(fbDb.collection("registrationLookup").doc(String(s.email).toLowerCase()));
    }
    await batch.commit();
    await teacherLoad();
    renderTeacherDash();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}
