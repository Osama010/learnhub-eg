/* ---------- لوحة الأدمن ----------
   يضيف مدرسين (بإنشاء حسابهم في Firebase Auth) ويقدر يعطّلهم أو يشطبهم.
   تقرير الطلاب بعدد طلاب كل مدرس ومستوى كل طالب في كل مادة. */

let adminCache = { teachers: null, students: null };

async function adminLoad() {
  const [t, s] = await Promise.all([
    fbDb.collection("teachers").orderBy("createdAt", "desc").get(),
    fbDb.collection("students").orderBy("createdAt", "desc").get(),
  ]);
  adminCache.teachers = t.docs.map((d) => ({ id: d.id, ...d.data() }));
  adminCache.students = s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function adminLayout(content, tab) {
  app.innerHTML = `
    <div class="hdr">
      <h1>لوحة تحكم الأدمن</h1>
      <div class="fact">${esc(ADMIN_EMAIL)} · <a href="javascript:signOut()" style="color:var(--primary-dark);">خروج</a></div>
    </div>
    <div class="tabs">
      <button type="button" class="tab ${tab === "stats" ? "active" : ""}" data-g="#/admin">نظرة عامة</button>
      <button type="button" class="tab ${tab === "teachers" ? "active" : ""}" data-g="#/admin/teachers">المدرسين</button>
      <button type="button" class="tab ${tab === "students" ? "active" : ""}" data-g="#/admin/students">الطلاب</button>
    </div>
    ${content}
    ${closing()}`;
  document.querySelectorAll(".tab").forEach((b) => b.onclick = () => location.hash = b.dataset.g);
  window.scrollTo(0, 0);
}

async function renderAdmin(h) {
  app.innerHTML = `<div class="spin">بنحمل بيانات المنصة...</div>`;
  try { await adminLoad(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const tab = h === "#/admin/teachers" ? "teachers" : h === "#/admin/students" ? "students" : "stats";
  if (tab === "teachers") return adminTeachers();
  if (tab === "students") return adminStudents();
  return adminStats();
}

function adminStats() {
  const teachers = adminCache.teachers || [];
  const students = adminCache.students || [];
  const approved = students.filter((s) => s.status === "approved").length;
  const pending = students.filter((s) => s.status === "pending").length;
  const content = `
    <div class="statcards">
      <div class="statcard"><div class="num">${teachers.length}</div><div class="lbl">مدرس</div></div>
      <div class="statcard"><div class="num">${students.length}</div><div class="lbl">طالب</div></div>
      <div class="statcard"><div class="num">${approved}</div><div class="lbl">طالب مقبول</div></div>
      <div class="statcard"><div class="num">${pending}</div><div class="lbl">طلب تحت المراجعة</div></div>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">طلاب كل مدرس</h2>
      <table class="ttable">
        <thead><tr><th>المدرس</th><th>المادة</th><th>عدد طلابه</th><th>مقبول</th><th>طلبات جديدة</th></tr></thead>
        <tbody>
          ${teachers.length ? teachers.map((t) => {
            const mine = students.filter((s) => (s.teacherIds || []).includes(t.id));
            return `<tr>
              <td>${esc(t.name)}${t.active === false ? ' <span class="chip red">معطّل</span>' : ""}</td>
              <td>${esc(t.subject || "—")}</td>
              <td>${mine.length}</td>
              <td>${mine.filter((s) => s.status === "approved").length}</td>
              <td>${mine.filter((s) => s.status === "pending").length}</td>
            </tr>`;
          }).join("") : `<tr><td colspan="5" class="center muted">لسه مفيش مدرسين</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">مستوى الطلاب في المواد</h2>
      <table class="ttable">
        <thead><tr><th>الطالب</th><th>المدرس</th><th>السنة</th><th>الحالة</th><th>البرمجة والذكاء الاصطناعي</th></tr></thead>
        <tbody>
          ${students.length ? students.map((s) => {
            const tnames = (s.teacherIds || []).map((id) => (adminCache.teachers.find((t) => t.id === id) || {}).name || "—").join("، ");
            const prog = (s.progress && s.progress["programming-ai"] && s.progress["programming-ai"].percent) || 0;
            return `<tr>
              <td>${esc(s.name)}</td><td>${esc(tnames)}</td><td>${esc(s.grade || "—")}</td>
              <td>${statusChip(s.status)}</td><td>${prog}%</td>
            </tr>`;
          }).join("") : `<tr><td colspan="5" class="center muted">لسه مفيش طلاب</td></tr>`}
        </tbody>
      </table>
    </div>`;
  adminLayout(content, "stats");
}

function fmtTs(ts) {
  try { return ts && ts.toDate ? ts.toDate().toLocaleString("ar-EG") : "—"; } catch (e) { return "—"; }
}

function showDetail(title, rows) {
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `<div class="detailcard">
    <h3>${title}</h3>
    ${rows.map((r) => `<div class="drow"><span class="dl">${r[0]}</span><span class="dv">${r[1]}</span></div>`).join("")}
    <div class="btnrow" style="justify-content:center; margin-top:14px;"><button type="button" class="btn ghost" id="ov-close">إغلاق</button></div>
  </div>`;
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  ov.querySelector("#ov-close").onclick = () => ov.remove();
}

function adminShowTeacher(id) {
  const t = (adminCache.teachers || []).find((x) => x.id === id);
  if (!t) return;
  const mine = (adminCache.students || []).filter((s) => (s.teacherIds || []).includes(id));
  showDetail("بيانات المدرس كاملة", [
    ["الاسم", esc(t.name)],
    ["المادة", esc(t.subject || "—")],
    ["الإيميل", `<span class="ltr">${esc(t.email || "—")}</span>`],
    ["رقم الواتساب", `<span class="ltr">${esc(t.phone || "—")}</span>`],
    ["الحالة", t.active === false ? "معطّل" : "نشط"],
    ["تاريخ الإضافة", fmtTs(t.createdAt)],
    ["عدد الطلاب", String(mine.length)],
    ["أسماء الطلاب", mine.length ? mine.map((s) => esc(s.name)).join("، ") : "—"],
  ]);
}

function adminShowStudent(id) {
  const s = (adminCache.students || []).find((x) => x.id === id);
  if (!s) return;
  const teachers = adminCache.teachers || [];
  const tnames = (s.teacherIds || []).map((tid) => (teachers.find((t) => t.id === tid) || {}).name || "—").join("، ");
  const prog = (s.progress && s.progress["programming-ai"] && s.progress["programming-ai"].percent) || 0;
  showDetail("بيانات الطالب كاملة", [
    ["الاسم", esc(s.name)],
    ["الإيميل", `<span class="ltr">${esc(s.email || "—")}</span>`],
    ["الموبايل (واتساب)", `<span class="ltr">${esc(s.phone || "—")}</span>`],
    ["السنة الدراسية", esc(s.grade || "—")],
    ["المدرسين", esc(tnames || "—")],
    ["الحالة", s.status === "approved" ? "مقبول" : s.status === "rejected" ? "مرفوض" : "تحت المراجعة"],
    ["تقدمه في البرمجة والذكاء الاصطناعي", prog + "%"],
    ["حساب الدخول", s.authLinked ? "اتعمل (دخل وعمل باسورد)" : "لسه مدخلش"],
    ["تاريخ التسجيل", fmtTs(s.createdAt)],
  ]);
}

function adminTeachers() {
  const teachers = adminCache.teachers || [];
  const students = adminCache.students || [];
  const editing = editingTeacherId ? (adminCache.teachers || []).find((t) => t.id === editingTeacherId) : null;
  const content = `
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">${editing ? "تعديل بيانات: " + esc(editing.name) : "إضافة مدرس جديد"}</h2>
      <div class="grid2">
        <div><label class="flabel">اسم المدرس</label><input id="ta-name" type="text" class="inp" placeholder="اسم المدرس" value="${editing ? esc(editing.name) : ""}"></div>
        <div><label class="flabel">المادة</label><input id="ta-subject" type="text" class="inp" placeholder="مثال: البرمجة والذكاء الاصطناعي" value="${editing ? esc(editing.subject || "") : ""}"></div>
        <div><label class="flabel">الإيميل</label><input id="ta-email" type="email" class="inp ltr" placeholder="teacher@example.com" value="${editing ? esc(editing.email || "") : ""}"></div>
        <div><label class="flabel">رقم الواتساب</label><input id="ta-phone" type="tel" class="inp ltr" placeholder="201xxxxxxxxx" value="${editing ? esc(editing.phone || "") : ""}"></div>
        ${editing ? "" : `<div><label class="flabel">باسورد مؤقت</label><input id="ta-pass" type="text" class="inp ltr" placeholder="6 أحرف على الأقل"></div>`}
      </div>
      <div class="btnrow">
        <button type="button" class="btn" id="ta-add">${editing ? "حفظ التعديلات" : "إضافة المدرس"}</button>
        ${editing ? `<button type="button" class="btn ghost" id="ta-cancel">إلغاء التعديل</button>` : ""}
      </div>
      <p class="msg" id="ta-msg"></p>
      <p class="muted" style="font-size:13px;">${editing
        ? "ملحوظة: تغيير الإيميل هنا بيعدّل السجل بس. الدخول هيفضل بالإيميل الأصلي، ولو عايز تغيّر إيميل الدخول نفسه احذف المدرس وضيفه بالإيميل الجديد."
        : "المدرس هيدخل بإيميله والباسورد المؤقت، ويقدر يغيّره من لوحته."}</p>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">المدرسين (${teachers.length})</h2>
      <table class="ttable">
        <thead><tr><th>الاسم</th><th>المادة</th><th>الإيميل</th><th>طلابه</th><th>الحالة</th><th>إجراءات</th></tr></thead>
        <tbody>
          ${teachers.length ? teachers.map((t) => {
            const mine = students.filter((s) => (s.teacherIds || []).includes(t.id)).length;
            return `<tr>
              <td>${esc(t.name)}</td><td>${esc(t.subject || "—")}</td><td class="ltr">${esc(t.email)}</td><td>${mine}</td>
              <td>${t.active === false ? '<span class="chip red">معطّل</span>' : '<span class="chip green">نشط</span>'}</td>
              <td>
                <div class="btnrow">
                  <button type="button" class="btn sm ghost" data-tv="${t.id}">عرض</button>
                  <button type="button" class="btn sm ghost" data-te="${t.id}">تعديل</button>
                  <button type="button" class="btn sm ghost" data-tr="${t.id}">إعادة ضبط الباسورد</button>
                  <button type="button" class="btn sm ghost" data-tg="${t.id}">${t.active === false ? "تفعيل" : "تعطيل"}</button>
                  <button type="button" class="btn sm red" data-td="${t.id}">حذف</button>
                </div>
              </td>
            </tr>`;
          }).join("") : `<tr><td colspan="6" class="center muted">لسه مفيش مدرسين</td></tr>`}
        </tbody>
      </table>
    </div>`;
  adminLayout(content, "teachers");
  document.getElementById("ta-add").onclick = adminSaveTeacher;
  const cancelBtn = document.getElementById("ta-cancel");
  if (cancelBtn) cancelBtn.onclick = () => { editingTeacherId = null; adminTeachers(); };
  document.querySelectorAll("[data-tv]").forEach((b) => b.onclick = () => adminShowTeacher(b.dataset.tv));
  document.querySelectorAll("[data-te]").forEach((b) => b.onclick = () => { editingTeacherId = b.dataset.te; adminTeachers(); });
  document.querySelectorAll("[data-tr]").forEach((b) => b.onclick = () => adminResetTeacher(b.dataset.tr));
  document.querySelectorAll("[data-tg]").forEach((b) => b.onclick = () => adminToggleTeacher(b.dataset.tg));
  document.querySelectorAll("[data-td]").forEach((b) => b.onclick = () => adminDeleteTeacher(b.dataset.td));
}

let editingTeacherId = null;

async function adminResetTeacher(id) {
  const t = adminCache.teachers.find((x) => x.id === id);
  if (!t) return;
  if (!confirm(`هيتبعت إيميل إعادة ضبط الباسورد للمدرس "${t.name}" على ${t.email}. موافق؟`)) return;
  try {
    await fbAuth.sendPasswordResetEmail(t.email);
    taMsg("اتبعت إيميل إعادة الضبط لـ " + t.email + " ✅", true);
  } catch (e) { taMsg(authErrAr(e)); }
}

function taMsg(t, good) {
  const m = document.getElementById("ta-msg");
  if (m) { m.textContent = t || ""; m.className = "msg " + (good ? "good" : "bad"); }
}

async function adminSaveTeacher() {
  const name = document.getElementById("ta-name").value.trim();
  const subject = document.getElementById("ta-subject").value.trim();
  const email = document.getElementById("ta-email").value.trim().toLowerCase();
  const phone = document.getElementById("ta-phone").value.trim();
  if (!name) return taMsg("اكتب اسم المدرس.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return taMsg("اكتب إيميل صح.");
  if (editingTeacherId) {
    // تعديل بيانات مدرس موجود (السجل + النسخة العامة)
    try {
      const batch = fbDb.batch();
      batch.update(fbDb.collection("teachers").doc(editingTeacherId), { name, subject, email, phone });
      batch.update(fbDb.collection("teachersPublic").doc(editingTeacherId), { name, subject });
      await batch.commit();
      taMsg("اتحفظت التعديلات ✅", true);
      editingTeacherId = null;
      await adminLoad();
      adminTeachers();
    } catch (e) { taMsg("مشكلة: " + (e.message || e)); }
    return;
  }
  const pass = document.getElementById("ta-pass").value;
  if (pass.length < 6) return taMsg("الباسورد المؤقت 6 أحرف على الأقل.");
  taMsg("بننشئ حساب المدرس...");
  // تطبيق ثانوي مؤقت عشان إنشاء الحساب ميطلّعش الأدمن
  let secondary = null;
  try {
    secondary = firebase.initializeApp(FIREBASE_CONFIG, "tadmin" + Date.now());
    const cred = await secondary.auth().createUserWithEmailAndPassword(email, pass);
    const uid = cred.user.uid;
    await secondary.auth().signOut();
    const batch = fbDb.batch();
    batch.set(fbDb.collection("teachers").doc(uid), {
      name, email, subject, phone, active: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    // نسخة عامة بالاسم والمادة بس لصفحة التسجيل — من غير إيميل ولا تليفون
    batch.set(fbDb.collection("teachersPublic").doc(uid), { name, subject, active: true });
    await batch.commit();
    taMsg("اتضاف المدرس " + name + " ✅", true);
    adminCache.teachers = null;
    await adminLoad();
    adminTeachers();
  } catch (e) {
    taMsg(authErrAr(e) + " (لو الإيميل متسجل قبل كده في Firebase Auth لازم يتحذف من هناك الأول)");
  } finally {
    if (secondary) try { await secondary.delete(); } catch (_) {}
  }
}

async function adminToggleTeacher(id) {
  const t = adminCache.teachers.find((x) => x.id === id);
  if (!t) return;
  try {
    const batch = fbDb.batch();
    batch.update(fbDb.collection("teachers").doc(id), { active: t.active === false });
    batch.update(fbDb.collection("teachersPublic").doc(id), { active: t.active === false });
    await batch.commit();
    await adminLoad();
    adminTeachers();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

async function adminDeleteTeacher(id) {
  const t = adminCache.teachers.find((x) => x.id === id);
  if (!t) return;
  const mine = (adminCache.students || []).filter((s) => (s.teacherIds || []).includes(id)).length;
  const warn = mine
    ? `المدرس "${t.name}" عنده ${mine} طالب. حذفه هيشيله من قوائمهم لكن الطلاب نفسهم هيفضلوا. متأكد؟`
    : `متأكد إنك عايز تحذف المدرس "${t.name}"؟`;
  if (!confirm(warn)) return;
  try {
    const batch = fbDb.batch();
    (adminCache.students || []).forEach((s) => {
      if ((s.teacherIds || []).includes(id)) {
        batch.update(fbDb.collection("students").doc(s.id), { teacherIds: firebase.firestore.FieldValue.arrayRemove(id) });
      }
    });
    batch.delete(fbDb.collection("teachers").doc(id));
    batch.delete(fbDb.collection("teachersPublic").doc(id));
    await batch.commit();
    await adminLoad();
    adminTeachers();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

let adminFilter = { teacher: "", status: "", q: "" };

function adminStudents() {
  const teachers = adminCache.teachers || [];
  const all = adminCache.students || [];
  const students = all.filter((s) => {
    if (adminFilter.teacher && !(s.teacherIds || []).includes(adminFilter.teacher)) return false;
    if (adminFilter.status && s.status !== adminFilter.status) return false;
    if (adminFilter.q && !(s.name || "").includes(adminFilter.q)) return false;
    return true;
  });
  const content = `
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">الطلاب (${students.length} من ${all.length})</h2>
      <div class="filterrow">
        <select id="af-t" class="inp">
          <option value="">كل المدرسين</option>
          ${teachers.map((t) => `<option value="${t.id}" ${adminFilter.teacher === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}
        </select>
        <select id="af-s" class="inp">
          <option value="">كل الحالات</option>
          <option value="pending" ${adminFilter.status === "pending" ? "selected" : ""}>تحت المراجعة</option>
          <option value="approved" ${adminFilter.status === "approved" ? "selected" : ""}>مقبول</option>
          <option value="rejected" ${adminFilter.status === "rejected" ? "selected" : ""}>مرفوض</option>
        </select>
        <input id="af-q" type="text" class="inp" placeholder="بحث بالاسم..." value="${esc(adminFilter.q)}">
      </div>
      <table class="ttable">
        <thead><tr><th>الطالب</th><th>المدرس</th><th>السنة</th><th>الحالة</th><th>البرمجة</th><th>إجراءات</th></tr></thead>
        <tbody>
          ${students.length ? students.map((s) => {
            const tnames = (s.teacherIds || []).map((id) => (teachers.find((t) => t.id === id) || {}).name || "—").join("، ");
            const prog = (s.progress && s.progress["programming-ai"] && s.progress["programming-ai"].percent) || 0;
            return `<tr>
              <td>${esc(s.name)}</td><td>${esc(tnames)}</td><td>${esc(s.grade || "—")}</td>
              <td>${statusChip(s.status)}</td><td>${prog}%</td>
              <td>
                <div class="btnrow">
                  <button type="button" class="btn sm ghost" data-sv="${s.id}">عرض</button>
                  ${s.phone ? `<a class="btn sm green" target="_blank" href="${waLink(s.phone, "أهلاً " + s.name + "، معاك الأدمن من منصة الدروس.")}">واتساب</a>` : ""}
                  ${s.status !== "approved" ? `<button type="button" class="btn sm ghost" data-ap="${s.id}">قبول</button>` : ""}
                  <button type="button" class="btn sm red" data-sd="${s.id}">حذف</button>
                </div>
              </td>
            </tr>`;
          }).join("") : `<tr><td colspan="6" class="center muted">مفيش نتايج</td></tr>`}
        </tbody>
      </table>
    </div>`;
  adminLayout(content, "students");
  document.getElementById("af-t").onchange = (e) => { adminFilter.teacher = e.target.value; adminStudents(); };
  document.getElementById("af-s").onchange = (e) => { adminFilter.status = e.target.value; adminStudents(); };
  document.getElementById("af-q").oninput = (e) => { adminFilter.q = e.target.value.trim(); adminStudents(); };
  document.querySelectorAll("[data-sv]").forEach((b) => b.onclick = () => adminShowStudent(b.dataset.sv));
  document.querySelectorAll("[data-ap]").forEach((b) => b.onclick = () => adminApprove(b.dataset.ap));
  document.querySelectorAll("[data-sd]").forEach((b) => b.onclick = () => adminDeleteStudent(b.dataset.sd));
}

async function adminApprove(id) {
  try {
    const s = (adminCache.students || []).find((x) => x.id === id);
    const batch = fbDb.batch();
    batch.update(fbDb.collection("students").doc(id), { status: "approved" });
    if (s && s.email) {
      batch.update(fbDb.collection("registrationLookup").doc(String(s.email).toLowerCase()), { status: "approved" });
    }
    await batch.commit();
    await adminLoad();
    adminStudents();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

async function adminDeleteStudent(id) {
  const s = (adminCache.students || []).find((x) => x.id === id);
  if (!confirm(`متأكد إنك عايز تحذف الطالب "${s ? s.name : ""}" نهائياً؟`)) return;
  try {
    const batch = fbDb.batch();
    batch.delete(fbDb.collection("students").doc(id));
    if (s && s.email) {
      batch.delete(fbDb.collection("registrationLookup").doc(String(s.email).toLowerCase()));
    }
    await batch.commit();
    await adminLoad();
    adminStudents();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}
