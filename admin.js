/* ---------- لوحة الأدمن ----------
   يضيف مدرسين (بإنشاء حسابهم في Firebase Auth) ويقدر يعطّلهم أو يشطبهم.
   تقرير الطلاب بعدد طلاب كل مدرس ومستوى كل طالب في كل مادة. */

let adminCache = { teachers: null, students: null, subjects: null, admins: null };

async function adminLoad() {
  const [t, s, sub, adm] = await Promise.all([
    fbDb.collection("teachers").orderBy("createdAt", "desc").get(),
    fbDb.collection("students").orderBy("createdAt", "desc").get(),
    fbDb.collection("subjects").get(),
    fbDb.collection("admins").get(),
  ]);
  adminCache.teachers = t.docs.map((d) => ({ id: d.id, ...d.data() }));
  adminCache.students = s.docs.map((d) => ({ id: d.id, ...d.data() }));
  const stageOrder = { "ابتدائي": 0, "إعدادي": 1, "ثانوي": 2 };
  adminCache.subjects = sub.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (stageOrder[a.stage] ?? 9) - (stageOrder[b.stage] ?? 9));
  adminCache.admins = adm.docs.map((d) => ({ id: d.id, ...d.data() }));
  // أول تشغيل: سجّل الأدمن الأساسي في المجموعة لو مش موجود
  if (fbUser && fbUser.email === ADMIN_EMAIL && !adminCache.admins.some((a) => a.id === ADMIN_EMAIL)) {
    const doc = { email: ADMIN_EMAIL, name: "الأدمن الأساسي", addedAt: firebase.firestore.FieldValue.serverTimestamp(), addedBy: "النظام" };
    await fbDb.collection("admins").doc(ADMIN_EMAIL).set(doc);
    adminCache.admins.unshift({ id: ADMIN_EMAIL, ...doc, addedAt: null });
  }
}

function adminLayout(content, tab) {
  app.innerHTML = `
    <div class="hdr">
      <h1>لوحة تحكم الأدمن</h1>
      <div class="fact">${esc(fbUser && fbUser.email || ADMIN_EMAIL)} · <a href="javascript:signOut()" style="color:var(--primary-dark);">خروج</a></div>
    </div>
    <div class="tabs">
      <button type="button" class="tab ${tab === "stats" ? "active" : ""}" data-g="#/admin">نظرة عامة</button>
      <button type="button" class="tab ${tab === "teachers" ? "active" : ""}" data-g="#/admin/teachers">المدرسين</button>
      <button type="button" class="tab ${tab === "students" ? "active" : ""}" data-g="#/admin/students">الطلاب</button>
      <button type="button" class="tab ${tab === "subjects" ? "active" : ""}" data-g="#/admin/subjects">المواد الدراسية</button>
      <button type="button" class="tab ${tab === "reports" ? "active" : ""}" data-g="#/admin/reports">التقارير</button>
      <button type="button" class="tab ${tab === "admins" ? "active" : ""}" data-g="#/admin/admins">المشرفين</button>
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
  const tab = h === "#/admin/teachers" ? "teachers" : h === "#/admin/students" ? "students" : h === "#/admin/subjects" ? "subjects" : h === "#/admin/reports" ? "reports" : h === "#/admin/admins" ? "admins" : "stats";
  if (tab === "teachers") return adminTeachers();
  if (tab === "students") return adminStudents();
  if (tab === "subjects") return adminSubjects();
  if (tab === "reports") return adminReports();
  if (tab === "admins") return adminAdmins();
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
        <thead><tr><th>المدرس</th><th>المادة</th><th>المراحل (طلاب كل مرحلة)</th><th>عدد طلابه</th><th>مقبول</th><th>طلبات جديدة</th></tr></thead>
        <tbody>
          ${teachers.length ? teachers.map((t) => {
            const mine = students.filter((s) => (s.teacherIds || []).includes(t.id));
            return `<tr data-rv-t="${t.id}" style="cursor:pointer" title="اضغط لعرض البيانات كاملة">
              <td>${esc(t.name)}${t.active === false ? ' <span class="chip red">معطّل</span>' : ""}</td>
              <td>${esc(t.subject || "—")}</td>
              <td>${esc(teacherStagesText(t))}</td>
              <td>${mine.length}</td>
              <td>${mine.filter((s) => s.status === "approved").length}</td>
              <td>${mine.filter((s) => s.status === "pending").length}</td>
            </tr>`;
          }).join("") : `<tr><td colspan="6" class="center muted">لسه مفيش مدرسين</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">مستوى الطلاب في المواد</h2>
      <table class="ttable">
        <thead><tr><th>الطالب</th><th>الإيميل</th><th>المدرس</th><th>السنة</th><th>الحالة</th><th>البرمجة والذكاء الاصطناعي</th></tr></thead>
        <tbody>
          ${students.length ? students.map((s) => {
            const tnames = (s.teacherIds || []).map((id) => (adminCache.teachers.find((t) => t.id === id) || {}).name || "—").join("، ");
            const prog = (s.progress && s.progress["programming-ai"] && s.progress["programming-ai"].percent) || 0;
            return `<tr data-rv-s="${s.id}" style="cursor:pointer" title="اضغط لعرض البيانات كاملة">
              <td>${esc(s.name)}</td><td class="ltr">${esc(s.email || "—")}</td><td>${esc(tnames)}</td><td>${esc(s.grade || "—")}</td>
              <td>${statusChip(s.status)}</td><td>${prog}%</td>
            </tr>`;
          }).join("") : `<tr><td colspan="6" class="center muted">لسه مفيش طلاب</td></tr>`}
        </tbody>
      </table>
    </div>`;
  adminLayout(content, "stats");
  document.querySelectorAll("[data-rv-t]").forEach((tr) => tr.onclick = () => adminShowTeacher(tr.dataset.rvT));
  document.querySelectorAll("[data-rv-s]").forEach((tr) => tr.onclick = () => adminShowStudent(tr.dataset.rvS));
}

/* ---------- المواد الدراسية ---------- */
const CORE_SUBJECTS = {
  "ابتدائي": ["اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الدراسات الاجتماعية", "التربية الدينية", "تكنولوجيا المعلومات"],
  "إعدادي": ["اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الدراسات الاجتماعية", "التربية الدينية", "تكنولوجيا المعلومات"],
  "ثانوي": ["اللغة العربية", "اللغة الإنجليزية", "اللغة الفرنسية", "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء", "الجيولوجيا", "التاريخ", "الجغرافيا", "الفلسفة والمنطق", "البرمجة والذكاء الاصطناعي"],
};
const STAGES = ["ابتدائي", "إعدادي", "ثانوي"];

// مرحلة الطالب من سنة دراسته
function stageOfGrade(g) {
  if (!g) return "";
  if (g.includes("ابتدائي")) return "ابتدائي";
  if (g.includes("إعدادي")) return "إعدادي";
  return "ثانوي";
}

// عدد طلاب المدرس في كل مرحلة
function stageCountsFor(tid) {
  const counts = {};
  (adminCache.students || []).forEach((s) => {
    if (!(s.teacherIds || []).includes(tid)) return;
    const st = stageOfGrade(s.grade);
    if (st) counts[st] = (counts[st] || 0) + 1;
  });
  return counts;
}

// نص: كل مرحلة بيدرّسها المدرس وقد إيه طالب فيها
function teacherStagesText(t) {
  const counts = stageCountsFor(t.id);
  const stages = (t.stages && t.stages.length) ? t.stages : Object.keys(counts);
  if (!stages.length) return "—";
  return stages.map((st) => `${st}: ${counts[st] || 0}`).join(" · ");
}

function adminSubjects() {
  const subjects = adminCache.subjects || [];
  const content = `
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">إضافة مادة</h2>
      <div class="filterrow">
        <input id="sj-name" type="text" class="inp" placeholder="اسم المادة، مثال: اللغة الألمانية">
        <select id="sj-stage" class="inp">
          ${STAGES.map((s) => `<option>${s}</option>`).join("")}
        </select>
        <button type="button" class="btn" id="sj-add">إضافة</button>
      </div>
      <p class="msg" id="sj-msg"></p>
    </div>
    ${subjects.length ? `
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">تقرير المواد</h2>
      <table class="ttable">
        <thead><tr><th>المادة</th><th>المرحلة</th><th>عدد المدرسين</th><th>عدد الطلاب</th><th>متوسط تقدم الطلاب</th></tr></thead>
        <tbody>
          ${subjectReportRows().map((r) => `<tr>
            <td>${esc(r.s.name)}</td>
            <td>ال${esc(r.s.stage)}ة</td>
            <td>${r.teachers}</td>
            <td>${r.students}</td>
            <td>${r.avg}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <p class="muted" style="font-size:12.5px;">المدرس بيتربط بالمادة من خانة "المادة" في بياناته، فلازم اسم المادة عنده يكون نفس الاسم هنا بالظبط.</p>
    </div>` : ""}
    ${subjects.length === 0 ? `
    <div class="card center">
      <p class="muted">لسه مفيش مواد متسجلة. تقدر تضيف المواد الأساسية لكل المراحل بضغطة واحدة:</p>
      <button type="button" class="btn" id="sj-seed">إضافة المواد الأساسية لكل المراحل</button>
    </div>` : ""}
    ${STAGES.map((stage) => {
      const list = subjects.filter((s) => s.stage === stage);
      return `
      <div class="card">
        <h2 style="font-size:18px; margin-top:0;">المرحلة ال${stage}ة (${list.length})</h2>
        <table class="ttable">
          <thead><tr><th>المادة</th><th>النوع</th><th>إجراءات</th></tr></thead>
          <tbody>
            ${list.length ? list.map((s) => `<tr>
              <td>${esc(s.name)}</td>
              <td>${s.core ? '<span class="chip green">أساسية</span>' : '<span class="chip amber">إضافية</span>'}</td>
              <td>
                <div class="btnrow">
                  <button type="button" class="btn sm ghost" data-se-sub="${s.id}">تعديل</button>
                  <button type="button" class="btn sm red" data-sd-sub="${s.id}">حذف</button>
                </div>
              </td>
            </tr>`).join("") : `<tr><td colspan="3" class="center muted">مفيش مواد في المرحلة دي لسه</td></tr>`}
          </tbody>
        </table>
      </div>`;
    }).join("")}`;
  adminLayout(content, "subjects");
  document.getElementById("sj-add").onclick = adminAddSubject;
  const seedBtn = document.getElementById("sj-seed");
  if (seedBtn) seedBtn.onclick = adminSeedSubjects;
  document.querySelectorAll("[data-se-sub]").forEach((b) => b.onclick = () => adminEditSubject(b.dataset.seSub));
  document.querySelectorAll("[data-sd-sub]").forEach((b) => b.onclick = () => adminDeleteSubject(b.dataset.sdSub));
}

function subjectReportRows() {
  const teachers = adminCache.teachers || [];
  const students = adminCache.students || [];
  return (adminCache.subjects || []).map((s) => {
    const ts = teachers.filter((t) => (t.subject || "").trim() === s.name.trim());
    const tids = ts.map((t) => t.id);
    const ss = students.filter((st) => (st.teacherIds || []).some((id) => tids.includes(id)));
    let progSum = 0, progN = 0;
    ss.forEach((st) => {
      const p = st.progress || {};
      const vals = Object.keys(p).map((k) => p[k] && p[k].percent).filter((v) => typeof v === "number");
      if (vals.length) { progSum += vals.reduce((a, b) => a + b, 0) / vals.length; progN++; }
    });
    return { s, teachers: ts.length, students: ss.length, avg: progN ? Math.round(progSum / progN) + "%" : "—" };
  });
}

function adminEditSubject(id) {
  const s = (adminCache.subjects || []).find((x) => x.id === id);
  if (!s) return;
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `<div class="detailcard">
    <h3>تعديل المادة</h3>
    <label class="flabel">اسم المادة</label>
    <input id="ej-name" type="text" class="inp" value="${esc(s.name)}">
    <label class="flabel">المرحلة</label>
    <select id="ej-stage" class="inp">
      ${STAGES.map((st) => `<option ${s.stage === st ? "selected" : ""}>${st}</option>`).join("")}
    </select>
    <div class="btnrow" style="justify-content:center; margin-top:14px;">
      <button type="button" class="btn" id="ej-save">حفظ</button>
      <button type="button" class="btn ghost" id="ej-cancel">إلغاء</button>
    </div>
    <p class="msg" id="ej-msg"></p>
  </div>`;
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  ov.querySelector("#ej-cancel").onclick = () => ov.remove();
  ov.querySelector("#ej-save").onclick = async () => {
    const name = ov.querySelector("#ej-name").value.trim();
    const stage = ov.querySelector("#ej-stage").value;
    const m = ov.querySelector("#ej-msg");
    if (!name) { m.textContent = "اكتب اسم المادة."; m.className = "msg bad"; return; }
    try {
      await fbDb.collection("subjects").doc(id).update({ name, stage });
      ov.remove();
      await adminLoad();
      adminSubjects();
    } catch (e) {
      m.textContent = "مشكلة: " + (e.message || e);
      m.className = "msg bad";
    }
  };
}

function sjMsg(t, good) {
  const m = document.getElementById("sj-msg");
  if (m) { m.textContent = t || ""; m.className = "msg " + (good ? "good" : "bad"); }
}

async function adminAddSubject() {
  const name = document.getElementById("sj-name").value.trim();
  const stage = document.getElementById("sj-stage").value;
  if (!name) return sjMsg("اكتب اسم المادة.");
  const dup = (adminCache.subjects || []).find((s) => s.name === name && s.stage === stage);
  if (dup) return sjMsg("المادة دي موجودة في المرحلة دي قبل كده.");
  try {
    await fbDb.collection("subjects").add({
      name, stage, core: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    sjMsg("اتضافت المادة ✅", true);
    await adminLoad();
    adminSubjects();
  } catch (e) { sjMsg("مشكلة: " + (e.message || e)); }
}

async function adminSeedSubjects() {
  try {
    const batch = fbDb.batch();
    Object.keys(CORE_SUBJECTS).forEach((stage) => {
      CORE_SUBJECTS[stage].forEach((name) => {
        const exists = (adminCache.subjects || []).find((s) => s.name === name && s.stage === stage);
        if (!exists) {
          batch.set(fbDb.collection("subjects").doc(), {
            name, stage, core: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }
      });
    });
    await batch.commit();
    await adminLoad();
    adminSubjects();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

async function adminDeleteSubject(id) {
  const s = (adminCache.subjects || []).find((x) => x.id === id);
  if (!confirm(`متأكد إنك عايز تحذف مادة "${s ? s.name : ""}"؟`)) return;
  try {
    await fbDb.collection("subjects").doc(id).delete();
    await adminLoad();
    adminSubjects();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
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
    ["الصورة", t.photoData ? `<img src="${t.photoData}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;">` : "—"],
    ["الاسم", esc(t.name)],
    ["المادة", esc(t.subject || "—")],
    ["المراحل", esc((t.stages || []).join("، ") || "—")],
    ["الإيميل", `<span class="ltr">${esc(t.email || "—")}</span>`],
    ["رقم الواتساب", `<span class="ltr">${esc(t.phone || "—")}</span>`],
    ["الحالة", t.active === false ? "معطّل" : "نشط"],
    ["تاريخ الإضافة", fmtTs(t.createdAt)],
    ["عدد الطلاب", String(mine.length)],
    ["طلاب كل مرحلة", esc(teacherStagesText(t))],
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
  const subjects = adminCache.subjects || [];
  const subjectOptions = subjects.map((s) => `<option value="${esc(s.name)}" ${editing && (editing.subject || "") === s.name ? "selected" : ""}>${esc(s.name)} — ال${esc(s.stage)}ة</option>`).join("");
  const content = `
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">${editing ? "تعديل بيانات: " + esc(editing.name) : "إضافة مدرس جديد"}</h2>
      <div class="grid2">
        <div><label class="flabel">اسم المدرس</label><input id="ta-name" type="text" class="inp" placeholder="اسم المدرس" value="${editing ? esc(editing.name) : ""}"></div>
        <div><label class="flabel">المادة</label><select id="ta-subject" class="inp">
          <option value="">اختار المادة</option>
          ${subjectOptions}
        </select>
        ${subjects.length === 0 ? `<p class="muted" style="font-size:12.5px;">ضيف المواد الأول من تاب "المواد الدراسية" وبعدين ارجع هنا.</p>` : ""}</div>
        <div><label class="flabel">الإيميل</label><input id="ta-email" type="email" class="inp ltr" placeholder="teacher@example.com" value="${editing ? esc(editing.email || "") : ""}"></div>
        <div><label class="flabel">رقم الواتساب</label><input id="ta-phone" type="tel" class="inp ltr" placeholder="201xxxxxxxxx" value="${editing ? esc(editing.phone || "") : ""}"></div>
        ${editing ? "" : `<div><label class="flabel">باسورد مؤقت</label><input id="ta-pass" type="text" class="inp ltr" placeholder="6 أحرف على الأقل"></div>`}
      </div>
      <div style="margin-top:10px;">
        <label class="flabel">المراحل اللي بيدرّسها (من أولى ابتدائي لتالتة ثانوي — اختار واحدة على الأقل)</label>
        <div class="teachercheck">
          ${STAGES.map((st) => `<label><input type="checkbox" class="ta-stage" value="${st}" ${editing && (editing.stages || []).includes(st) ? "checked" : ""}> ${st}</label>`).join("")}
        </div>
      </div>
      <div>
        <label class="flabel">صورة المدرس (اختياري — بتتصغّر وتتحفظ مع بياناته)</label>
        <input id="ta-photo" type="file" accept="image/*" class="inp">
        <div id="ta-photo-prev" style="margin-top:8px;">${editing && editing.photoData ? `<img src="${editing.photoData}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;">` : ""}</div>
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
        <thead><tr><th>الاسم</th><th>المادة</th><th>المراحل (طلاب كل مرحلة)</th><th>الإيميل</th><th>طلابه</th><th>الحالة</th><th>إجراءات</th></tr></thead>
        <tbody>
          ${teachers.length ? teachers.map((t) => {
            const mine = students.filter((s) => (s.teacherIds || []).includes(t.id)).length;
            return `<tr data-rv-t="${t.id}" style="cursor:pointer" title="اضغط لعرض البيانات كاملة">
              <td>${t.photoData ? `<img src="${t.photoData}" alt="" style="width:34px;height:34px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-left:8px;">` : ""}${esc(t.name)}</td><td>${esc(t.subject || "—")}</td><td>${esc(teacherStagesText(t))}</td><td class="ltr">${esc(t.email)}</td><td>${mine}</td>
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
          }).join("") : `<tr><td colspan="7" class="center muted">لسه مفيش مدرسين</td></tr>`}
        </tbody>
      </table>
    </div>`;
  adminLayout(content, "teachers");
  taPhotoData = null;
  const photoInp = document.getElementById("ta-photo");
  if (photoInp) photoInp.onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) { taPhotoData = null; return; }
    try {
      taPhotoData = await resizePhoto(f);
      document.getElementById("ta-photo-prev").innerHTML = `<img src="${taPhotoData}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;">`;
    } catch (err) {
      taPhotoData = null;
      taMsg("الصورة دي مش مدعومة، جرّب صورة تانية (JPG أو PNG).");
    }
  };
  document.getElementById("ta-add").onclick = adminSaveTeacher;
  const cancelBtn = document.getElementById("ta-cancel");
  if (cancelBtn) cancelBtn.onclick = () => { editingTeacherId = null; adminTeachers(); };
  document.querySelectorAll("[data-tv]").forEach((b) => b.onclick = () => adminShowTeacher(b.dataset.tv));
  document.querySelectorAll("[data-rv-t]").forEach((tr) => tr.onclick = (e) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    adminShowTeacher(tr.dataset.rvT);
  });
  document.querySelectorAll("[data-te]").forEach((b) => b.onclick = () => { editingTeacherId = b.dataset.te; adminTeachers(); });
  document.querySelectorAll("[data-tr]").forEach((b) => b.onclick = () => adminResetTeacher(b.dataset.tr));
  document.querySelectorAll("[data-tg]").forEach((b) => b.onclick = () => adminToggleTeacher(b.dataset.tg));
  document.querySelectorAll("[data-td]").forEach((b) => b.onclick = () => adminDeleteTeacher(b.dataset.td));
}

let editingTeacherId = null;
let taPhotoData = null;

function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 256;
      let w = img.width, h = img.height;
      if (w > h) { if (w > max) { h = Math.round(h * max / w); w = max; } }
      else { if (h > max) { w = Math.round(w * max / h); h = max; } }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      const d = c.toDataURL("image/jpeg", 0.82);
      URL.revokeObjectURL(img.src);
      if (d.length > 700000) return reject(new Error("كبيرة"));
      resolve(d);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error("مش صورة")); };
    img.src = URL.createObjectURL(file);
  });
}

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
  const stages = Array.from(document.querySelectorAll(".ta-stage:checked")).map((c) => c.value);
  if (!name) return taMsg("اكتب اسم المدرس.");
  if (!subject) return taMsg("اختار المادة من القايمة.");
  if (!stages.length) return taMsg("اختار مرحلة واحدة على الأقل اللي المدرس بيدرّسها.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return taMsg("اكتب إيميل صح.");
  if (editingTeacherId) {
    // تعديل بيانات مدرس موجود (السجل + النسخة العامة)
    try {
      const newData = { name, subject, email, phone, stages };
      if (taPhotoData) newData.photoData = taPhotoData;
      const batch = fbDb.batch();
      batch.update(fbDb.collection("teachers").doc(editingTeacherId), newData);
      batch.update(fbDb.collection("teachersPublic").doc(editingTeacherId), { name, subject, stages });
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
      name, email, subject, phone, stages,
      photoData: taPhotoData || "",
      active: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    // نسخة عامة بالاسم والمادة والمراحل بس لصفحة التسجيل — من غير إيميل ولا تليفون ولا صورة
    batch.set(fbDb.collection("teachersPublic").doc(uid), { name, subject, stages, active: true });
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
        <thead><tr><th>الطالب</th><th>الإيميل</th><th>المدرس</th><th>السنة</th><th>الحالة</th><th>البرمجة</th><th>إجراءات</th></tr></thead>
        <tbody>
          ${students.length ? students.map((s) => {
            const tnames = (s.teacherIds || []).map((id) => (teachers.find((t) => t.id === id) || {}).name || "—").join("، ");
            const prog = (s.progress && s.progress["programming-ai"] && s.progress["programming-ai"].percent) || 0;
            return `<tr data-rv-s="${s.id}" style="cursor:pointer" title="اضغط لعرض البيانات كاملة">
              <td>${esc(s.name)}</td><td class="ltr">${esc(s.email || "—")}</td><td>${esc(tnames)}</td><td>${esc(s.grade || "—")}</td>
              <td>${statusChip(s.status)}</td><td>${prog}%</td>
              <td>
                <div class="btnrow">
                  <button type="button" class="btn sm ghost" data-sv="${s.id}">عرض</button>
                  <button type="button" class="btn sm ghost" data-se="${s.id}">تعديل</button>
                  ${s.phone ? `<a class="btn sm green" target="_blank" href="${waLink(s.phone, "أهلاً " + s.name + "، معاك الأدمن من منصة الدروس.")}">واتساب</a>` : ""}
                  ${s.status !== "approved" ? `<button type="button" class="btn sm ghost" data-ap="${s.id}">قبول</button>` : ""}
                  <button type="button" class="btn sm red" data-sd="${s.id}">حذف</button>
                </div>
              </td>
            </tr>`;
          }).join("") : `<tr><td colspan="7" class="center muted">مفيش نتايج</td></tr>`}
        </tbody>
      </table>
    </div>`;
  adminLayout(content, "students");
  document.getElementById("af-t").onchange = (e) => { adminFilter.teacher = e.target.value; adminStudents(); };
  document.getElementById("af-s").onchange = (e) => { adminFilter.status = e.target.value; adminStudents(); };
  document.getElementById("af-q").oninput = (e) => { adminFilter.q = e.target.value.trim(); adminStudents(); };
  document.querySelectorAll("[data-sv]").forEach((b) => b.onclick = () => adminShowStudent(b.dataset.sv));
  document.querySelectorAll("[data-se]").forEach((b) => b.onclick = () => adminEditStudent(b.dataset.se));
  document.querySelectorAll("[data-rv-s]").forEach((tr) => tr.onclick = (e) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    adminShowStudent(tr.dataset.rvS);
  });
  document.querySelectorAll("[data-ap]").forEach((b) => b.onclick = () => adminApprove(b.dataset.ap));
  document.querySelectorAll("[data-sd]").forEach((b) => b.onclick = () => adminDeleteStudent(b.dataset.sd));
}

function adminEditStudent(id) {
  const s = (adminCache.students || []).find((x) => x.id === id);
  if (!s) return;
  const linked = !!s.authLinked;
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `<div class="detailcard">
    <h3>تعديل بيانات: ${esc(s.name)}</h3>
    <label class="flabel">الاسم</label>
    <input id="es-name" type="text" class="inp" value="${esc(s.name)}">
    <label class="flabel">الإيميل</label>
    <input id="es-email" type="email" class="inp ltr" value="${esc(s.email || "")}" ${linked ? "disabled" : ""}>
    <p class="muted" style="font-size:12.5px;">${linked
      ? "الإيميل مش بيتغير بعد ما الطالب عمل حساب دخول."
      : "تغيير الإيميل بينقل تسجيله للإيميل الجديد، وهيدخل بيه برقمه السري عادي."}</p>
    <label class="flabel">السنة الدراسية</label>
    <select id="es-grade" class="inp">
      ${GRADES.map((g) => `<option ${s.grade === g ? "selected" : ""}>${g}</option>`).join("")}
    </select>
    <label class="flabel">الموبايل (واتساب)</label>
    <input id="es-phone" type="tel" class="inp ltr" value="${esc(s.phone || "")}">
    <div class="btnrow" style="justify-content:center; margin-top:14px;">
      <button type="button" class="btn" id="es-save">حفظ</button>
      <button type="button" class="btn ghost" id="es-cancel">إلغاء</button>
    </div>
    <p class="msg" id="es-msg"></p>
  </div>`;
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  ov.querySelector("#es-cancel").onclick = () => ov.remove();
  ov.querySelector("#es-save").onclick = async () => {
    const name = ov.querySelector("#es-name").value.trim();
    const email = ov.querySelector("#es-email").value.trim().toLowerCase();
    const grade = ov.querySelector("#es-grade").value;
    const phone = ov.querySelector("#es-phone").value.trim();
    const m = ov.querySelector("#es-msg");
    m.textContent = "";
    if (!name) return m.textContent = "اكتب اسم الطالب.", m.className = "msg bad";
    if (!linked && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return m.textContent = "اكتب إيميل صح.", m.className = "msg bad";
    if (!/^01[0-9]{9}$/.test(phone)) return m.textContent = "اكتب رقم موبايل مصري صح (11 رقم يبدأ بـ 01).", m.className = "msg bad";
    try {
      const oldEmail = String(s.email || "").toLowerCase();
      const newData = { name, grade, phone };
      if (!linked) newData.email = email;
      await fbDb.collection("students").doc(id).update(newData);
      if (!linked && email !== oldEmail) {
        // نقل فهرس التسجيل للإيميل الجديد مع الحفاظ على الرقم السري
        const oldLk = await fbDb.collection("registrationLookup").doc(oldEmail).get();
        const data = oldLk.exists ? oldLk.data() : { status: s.status || "pending", teacherIds: s.teacherIds || [] };
        const batch = fbDb.batch();
        batch.set(fbDb.collection("registrationLookup").doc(email), {
          ...data,
          studentId: id,
          saltEmail: data.saltEmail || oldEmail,
        });
        batch.delete(fbDb.collection("registrationLookup").doc(oldEmail));
        await batch.commit();
      }
      ov.remove();
      await adminLoad();
      adminStudents();
    } catch (e) {
      m.textContent = "مشكلة: " + (e.message || e);
      m.className = "msg bad";
    }
  };
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

/* ---------- التقارير ---------- */
let reportState = { type: "students", teacher: "", status: "", grade: "", stage: "", kind: "", q: "", from: "", to: "" };

function statusText(st) {
  return st === "approved" ? "مقبول" : st === "rejected" ? "مرفوض" : "تحت المراجعة";
}

function studentProgressAvg(st) {
  const p = st.progress || {};
  const vals = Object.keys(p).map((k) => p[k] && p[k].percent).filter((v) => typeof v === "number");
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

function tsToDate(ts) {
  try { return ts && ts.toDate ? ts.toDate() : null; } catch (e) { return null; }
}

// بترجع { title, columns, rows, filtersDesc }
function buildReport() {
  const teachers = adminCache.teachers || [];
  const students = adminCache.students || [];
  const subjects = adminCache.subjects || [];
  const tName = (id) => (teachers.find((t) => t.id === id) || {}).name || "—";
  const desc = [];

  if (reportState.type === "teachers") {
    let list = teachers.slice();
    if (reportState.subject) { list = list.filter((t) => (t.subject || "").trim() === reportState.subject); desc.push("المادة: " + reportState.subject); }
    if (reportState.status) { list = list.filter((t) => reportState.status === "active" ? t.active !== false : t.active === false); desc.push("الحالة: " + (reportState.status === "active" ? "نشط" : "معطّل")); }
    if (reportState.q) { list = list.filter((t) => (t.name || "").includes(reportState.q) || (t.email || "").includes(reportState.q)); desc.push("بحث: " + reportState.q); }
    const rows = list.map((t) => {
      const mine = students.filter((s) => (s.teacherIds || []).includes(t.id)).length;
      return [t.name || "", t.subject || "—", (t.stages || []).join("، ") || "—", teacherStagesText(t), t.email || "", t.phone || "", String(mine), t.active === false ? "معطّل" : "نشط", fmtTs(t.createdAt)];
    });
    return { title: "تقرير المدرسين", columns: ["الاسم", "المادة", "المراحل", "طلاب كل مرحلة", "الإيميل", "الواتساب", "عدد الطلاب", "الحالة", "تاريخ الإضافة"], rows, filtersDesc: desc };
  }

  if (reportState.type === "subjects") {
    let list = subjects.slice();
    if (reportState.stage) { list = list.filter((s) => s.stage === reportState.stage); desc.push("المرحلة: " + reportState.stage); }
    if (reportState.kind) { list = list.filter((s) => reportState.kind === "core" ? s.core : !s.core); desc.push("النوع: " + (reportState.kind === "core" ? "أساسية" : "إضافية")); }
    if (reportState.q) { list = list.filter((s) => (s.name || "").includes(reportState.q)); desc.push("بحث: " + reportState.q); }
    const rows = list.map((s) => {
      const ts = teachers.filter((t) => (t.subject || "").trim() === s.name.trim());
      const tids = ts.map((t) => t.id);
      const ss = students.filter((st) => (st.teacherIds || []).some((id) => tids.includes(id)));
      let sum = 0, n = 0;
      ss.forEach((st) => { const a = studentProgressAvg(st); if (a !== null) { sum += a; n++; } });
      return [s.name || "", "ال" + (s.stage || "") + "ة", s.core ? "أساسية" : "إضافية", String(ts.length), String(ss.length), n ? Math.round(sum / n) + "%" : "—"];
    });
    return { title: "تقرير المواد", columns: ["المادة", "المرحلة", "النوع", "عدد المدرسين", "عدد الطلاب", "متوسط التقدم"], rows, filtersDesc: desc };
  }

  // الطلاب (الافتراضي)
  let list = students.slice();
  if (reportState.teacher) { list = list.filter((s) => (s.teacherIds || []).includes(reportState.teacher)); desc.push("المدرس: " + tName(reportState.teacher)); }
  if (reportState.status) { list = list.filter((s) => s.status === reportState.status); desc.push("الحالة: " + statusText(reportState.status)); }
  if (reportState.grade) { list = list.filter((s) => s.grade === reportState.grade); desc.push("السنة: " + reportState.grade); }
  if (reportState.q) { list = list.filter((s) => (s.name || "").includes(reportState.q) || (s.email || "").includes(reportState.q)); desc.push("بحث: " + reportState.q); }
  if (reportState.from) { const d = new Date(reportState.from + "T00:00:00"); list = list.filter((s) => { const c = tsToDate(s.createdAt); return c && c >= d; }); desc.push("من: " + reportState.from); }
  if (reportState.to) { const d = new Date(reportState.to + "T23:59:59"); list = list.filter((s) => { const c = tsToDate(s.createdAt); return c && c <= d; }); desc.push("إلى: " + reportState.to); }
  const rows = list.map((s) => {
    const tnames = (s.teacherIds || []).map(tName).join("، ");
    const avg = studentProgressAvg(s);
    return [s.name || "", s.email || "", s.phone || "", s.grade || "—", tnames || "—", statusText(s.status), avg !== null ? avg + "%" : "—", fmtTs(s.createdAt)];
  });
  return { title: "تقرير الطلاب", columns: ["الاسم", "الإيميل", "الموبايل", "السنة الدراسية", "المدرسين", "الحالة", "التقدم", "تاريخ التسجيل"], rows, filtersDesc: desc };
}

function adminReports() {
  const rep = buildReport();
  const teachers = adminCache.teachers || [];
  const subjects = adminCache.subjects || [];
  const subjectNames = Array.from(new Set(subjects.map((s) => s.name)));
  const typeBtn = (id, label) => `<button type="button" class="tab ${reportState.type === id ? "active" : ""}" data-rt="${id}">${label}</button>`;
  let filtersHtml = `<input id="rf-q" type="text" class="inp" placeholder="بحث بالاسم أو الإيميل..." value="${esc(reportState.q)}">`;
  if (reportState.type === "students") {
    filtersHtml = `
      <select id="rf-teacher" class="inp"><option value="">كل المدرسين</option>
        ${teachers.map((t) => `<option value="${t.id}" ${reportState.teacher === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>
      <select id="rf-status" class="inp"><option value="">كل الحالات</option>
        <option value="pending" ${reportState.status === "pending" ? "selected" : ""}>تحت المراجعة</option>
        <option value="approved" ${reportState.status === "approved" ? "selected" : ""}>مقبول</option>
        <option value="rejected" ${reportState.status === "rejected" ? "selected" : ""}>مرفوض</option></select>
      <select id="rf-grade" class="inp"><option value="">كل السنوات</option>
        ${GRADES.map((g) => `<option ${reportState.grade === g ? "selected" : ""}>${g}</option>`).join("")}</select>
      <input id="rf-from" type="date" class="inp" value="${esc(reportState.from)}" title="من تاريخ">
      <input id="rf-to" type="date" class="inp" value="${esc(reportState.to)}" title="إلى تاريخ">
      ` + filtersHtml;
  } else if (reportState.type === "teachers") {
    filtersHtml = `
      <select id="rf-subject" class="inp"><option value="">كل المواد</option>
        ${subjectNames.map((n) => `<option ${reportState.subject === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>
      <select id="rf-status" class="inp"><option value="">كل الحالات</option>
        <option value="active" ${reportState.status === "active" ? "selected" : ""}>نشط</option>
        <option value="inactive" ${reportState.status === "inactive" ? "selected" : ""}>معطّل</option></select>
      ` + filtersHtml;
  } else {
    filtersHtml = `
      <select id="rf-stage" class="inp"><option value="">كل المراحل</option>
        ${STAGES.map((s) => `<option ${reportState.stage === s ? "selected" : ""}>${s}</option>`).join("")}</select>
      <select id="rf-kind" class="inp"><option value="">أساسية + إضافية</option>
        <option value="core" ${reportState.kind === "core" ? "selected" : ""}>أساسية بس</option>
        <option value="extra" ${reportState.kind === "extra" ? "selected" : ""}>إضافية بس</option></select>
      ` + filtersHtml;
  }
  const content = `
    <div class="tabs">${typeBtn("students", "تقرير الطلاب")}${typeBtn("teachers", "تقرير المدرسين")}${typeBtn("subjects", "تقرير المواد")}</div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">${rep.title} (${rep.rows.length})</h2>
      <div class="filterrow">${filtersHtml}</div>
      <div class="btnrow" style="margin-bottom:12px;">
        <button type="button" class="btn" id="rp-print">🖨️ طباعة / PDF</button>
        <button type="button" class="btn ghost" id="rp-csv">تصدير CSV</button>
        <button type="button" class="btn ghost" id="rp-xls">تصدير Excel</button>
        <button type="button" class="btn ghost" id="rp-clear">مسح الفلاتر</button>
      </div>
      <div style="overflow-x:auto;">
      <table class="ttable">
        <thead><tr>${rep.columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
        <tbody>
          ${rep.rows.length ? rep.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${rep.columns.length}" class="center muted">مفيش بيانات بالفلاتر دي</td></tr>`}
        </tbody>
      </table>
      </div>
      <p class="muted" style="font-size:12.5px;">الطباعة والتصدير بيطلعوا اللي قدامك بالفلاتر الحالية. امسح الفلاتر لو عايز التقرير الكامل.</p>
    </div>`;
  adminLayout(content, "reports");
  document.querySelectorAll("[data-rt]").forEach((b) => b.onclick = () => { reportState = { type: b.dataset.rt, teacher: "", status: "", grade: "", stage: "", kind: "", q: "", from: "", to: "" }; adminReports(); });
  const bind = (id, key, ev) => { const el = document.getElementById(id); if (el) el[ev] = (e) => { reportState[key] = e.target.value.trim ? e.target.value.trim() : e.target.value; adminReports(); }; };
  bind("rf-teacher", "teacher", "onchange");
  bind("rf-status", "status", "onchange");
  bind("rf-grade", "grade", "onchange");
  bind("rf-stage", "stage", "onchange");
  bind("rf-kind", "kind", "onchange");
  bind("rf-subject", "subject", "onchange");
  bind("rf-from", "from", "onchange");
  bind("rf-to", "to", "onchange");
  const q = document.getElementById("rf-q");
  if (q) q.onchange = (e) => { reportState.q = e.target.value.trim(); adminReports(); };
  document.getElementById("rp-clear").onclick = () => { const t = reportState.type; reportState = { type: t, teacher: "", status: "", grade: "", stage: "", kind: "", q: "", from: "", to: "" }; adminReports(); };
  document.getElementById("rp-print").onclick = printReport;
  document.getElementById("rp-csv").onclick = () => exportReport("csv");
  document.getElementById("rp-xls").onclick = () => exportReport("xls");
}

function printReport() {
  const rep = buildReport();
  const w = window.open("", "_blank");
  if (!w) { alert("المتصفح مانع النافذة المنبثقة. اسمح بيها وجرّب تاني."); return; }
  const escP = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>${escP(rep.title)}</title>
  <style>
    body { font-family: "Cairo", "Segoe UI", Tahoma, sans-serif; direction: rtl; padding: 24px; color: #1e293b; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #64748b; font-size: 12.5px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: right; }
    th { background: #f1f5f9; }
    .foot { margin-top: 18px; color: #64748b; font-size: 12px; text-align: center; }
    @media print { body { padding: 0; } }
  </style></head><body>
  <h1>${escP(rep.title)} — منصة learnhub-eg</h1>
  <div class="meta">تاريخ التقرير: ${escP(new Date().toLocaleString("ar-EG"))} · عدد السجلات: ${rep.rows.length}${rep.filtersDesc.length ? " · الفلاتر: " + escP(rep.filtersDesc.join(" | ")) : " · كل البيانات بدون فلاتر"}</div>
  <table><thead><tr>${rep.columns.map((c) => `<th>${escP(c)}</th>`).join("")}</tr></thead>
  <tbody>${rep.rows.map((r) => `<tr>${r.map((c) => `<td>${escP(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
  <div class="foot">فكرة وإعداد: مهندس اسامه حسن عسس</div>
  <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`);
  w.document.close();
}

function exportReport(kind) {
  const rep = buildReport();
  const stamp = new Date().toISOString().slice(0, 10);
  if (kind === "csv") {
    const lines = [rep.columns].concat(rep.rows).map((r) => r.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `${rep.title}-${stamp}.csv`);
  } else {
    const escP = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>
      <table border="1"><thead><tr>${rep.columns.map((c) => `<th>${escP(c)}</th>`).join("")}</tr></thead>
      <tbody>${rep.rows.map((r) => `<tr>${r.map((c) => `<td>${escP(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel" });
    downloadBlob(blob, `${rep.title}-${stamp}.xls`);
  }
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- المشرفين (أكتر من أدمن) ---------- */
function admMsg(t, good) {
  const m = document.getElementById("adm-msg");
  if (m) { m.className = "msg " + (good ? "good" : "bad"); m.textContent = t; }
}

function adminAdmins() {
  const admins = adminCache.admins || [];
  const myEmail = (fbUser && fbUser.email) || "";
  const content = `
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">إضافة مشرف جديد</h2>
      <div class="fgrid">
        <div><label class="flabel">اسم المشرف</label><input id="an-name" type="text" class="inp" placeholder="اسم المشرف"></div>
        <div><label class="flabel">الإيميل (جيميل)</label><input id="an-email" type="email" class="inp" dir="ltr" placeholder="admin@gmail.com"></div>
      </div>
      <button type="button" class="btn" id="an-add">إضافة المشرف</button>
      <p id="adm-msg" class="msg"></p>
      <p class="muted" style="font-size:12.5px;">المشرف الجديد بيدخل من زر "دخول الأدمن" بحساب جوجل بتاع الإيميل ده، وبيقدر يعمل كل حاجة في اللوحة زي الأدمن الأساسي. الإيميل بيتحفظ صغير (lowercase) عشان المطابقة تظبط.</p>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">المشرفين (${admins.length})</h2>
      <table class="ttable">
        <thead><tr><th>الاسم</th><th>الإيميل</th><th>أضافه</th><th>تاريخ الإضافة</th><th>إجراءات</th></tr></thead>
        <tbody>
          ${admins.length ? admins.map((a) => {
            const isSuper = a.id === ADMIN_EMAIL;
            const isMe = a.id === myEmail;
            return `<tr>
              <td>${esc(a.name || "—")}${isSuper ? ' <span class="chip green">أساسي</span>' : ""}${isMe && !isSuper ? ' <span class="chip">أنت</span>' : ""}</td>
              <td class="ltr">${esc(a.id)}</td>
              <td>${esc(a.addedBy || "—")}</td>
              <td>${a.addedAt ? fmtTs(a.addedAt) : "—"}</td>
              <td>${isSuper ? '<span class="muted" style="font-size:12.5px;">ميتحذفش</span>'
                : isMe ? '<span class="muted" style="font-size:12.5px;">متحذفش نفسك</span>'
                : `<button type="button" class="btn sm red" data-admdel="${esc(a.id)}">حذف</button>`}</td>
            </tr>`;
          }).join("") : `<tr><td colspan="5" class="center muted">مفيش مشرفين مسجلين</td></tr>`}
        </tbody>
      </table>
    </div>`;
  adminLayout(content, "admins");
  document.getElementById("an-add").onclick = adminAddAdmin;
  document.querySelectorAll("[data-admdel]").forEach((b) => b.onclick = () => adminDeleteAdmin(b.dataset.admdel));
}

async function adminAddAdmin() {
  const name = document.getElementById("an-name").value.trim();
  const email = document.getElementById("an-email").value.trim().toLowerCase();
  if (!name || !email || !email.includes("@")) return admMsg("اكتب اسم المشرف وإيميله صح.");
  const btn = document.getElementById("an-add");
  btn.disabled = true;
  try {
    if ((adminCache.admins || []).some((a) => a.id === email)) {
      btn.disabled = false;
      return admMsg("الإيميل ده مسجل مشرف أصلاً.");
    }
    const doc = { email, name, addedAt: firebase.firestore.FieldValue.serverTimestamp(), addedBy: (fbUser && fbUser.email) || "" };
    await fbDb.collection("admins").doc(email).set(doc);
    adminCache.admins.push({ id: email, ...doc, addedAt: null });
    adminAdmins();
  } catch (e) {
    btn.disabled = false;
    admMsg("حصلت مشكلة: " + (e.message || e));
  }
}

async function adminDeleteAdmin(email) {
  if (email === ADMIN_EMAIL) return;
  if (!confirm(`متأكد إنك عايز تحذف المشرف ${email}؟ مش هيقدر يدخل اللوحة تاني.`)) return;
  try {
    await fbDb.collection("admins").doc(email).delete();
    adminCache.admins = (adminCache.admins || []).filter((a) => a.id !== email);
    adminAdmins();
  } catch (e) {
    alert("حصلت مشكلة: " + (e.message || e));
  }
}
