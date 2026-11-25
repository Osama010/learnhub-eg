/* ---------- لوحة الأدمن ----------
   يضيف مدرسين (بإنشاء حسابهم في Firebase Auth) ويقدر يعطّلهم أو يشطبهم.
   تقرير الطلاب بعدد طلاب كل مدرس ومستوى كل طالب في كل مادة. */

let adminCache = { teachers: null, students: null, subjects: null, admins: null, library: null };

async function adminLoad() {
  const [t, s, sub, adm, lib] = await Promise.all([
    fbDb.collection("teachers").orderBy("createdAt", "desc").get(),
    fbDb.collection("students").orderBy("createdAt", "desc").get(),
    fbDb.collection("subjects").get(),
    fbDb.collection("admins").get(),
    fbDb.collection("library").orderBy("createdAt", "desc").get(),
  ]);
  adminCache.teachers = t.docs.map((d) => ({ id: d.id, ...d.data() }));
  adminCache.students = s.docs.map((d) => ({ id: d.id, ...d.data() }));
  const stageOrder = { "ابتدائي": 0, "إعدادي": 1, "ثانوي": 2 };
  adminCache.subjects = sub.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (stageOrder[a.stage] ?? 9) - (stageOrder[b.stage] ?? 9));
  adminCache.admins = adm.docs.map((d) => ({ id: d.id, ...d.data() }));
  adminCache.library = lib.docs.map((d) => ({ id: d.id, ...d.data() }));
  // مزامنة النسخة العامة من بيانات المدرسين: الإيميل (لتحذير "مش مسجل" في صفحة الدخول)
  // والصورة (بتظهر لطلاب المدرس) — تعبئة تلقائية للمدرسين الموجودين من قبل الميزة
  try {
    const pubs = await fbDb.collection("teachersPublic").get();
    const pubMap = {};
    pubs.docs.forEach((d) => { pubMap[d.id] = d.data(); });
    const batch = fbDb.batch();
    let dirty = 0;
    (adminCache.teachers || []).forEach((t) => {
      const p = pubMap[t.id];
      const av = t.avatar || t.photoData || "";
      if (!p) {
        batch.set(fbDb.collection("teachersPublic").doc(t.id), {
          name: t.name || "", subject: t.subject || "", stages: t.stages || [],
          email: (t.email || "").toLowerCase(), avatar: av, active: t.active !== false,
        });
        dirty++;
      } else {
        const fix = {};
        if ((p.email || "") !== (t.email || "").toLowerCase()) fix.email = (t.email || "").toLowerCase();
        if ((p.avatar || "") !== av) fix.avatar = av;
        if (Object.keys(fix).length) { batch.update(fbDb.collection("teachersPublic").doc(t.id), fix); dirty++; }
      }
    });
    if (dirty) await batch.commit();
  } catch (e) { console.warn("مزامنة النسخة العامة للمدرسين فشلت", e); }
  // أول تشغيل: سجّل الأدمن الأساسي في المجموعة لو مش موجود
  if (fbUser && fbUser.email === ADMIN_EMAIL && !adminCache.admins.some((a) => a.id === ADMIN_EMAIL)) {
    const doc = { email: ADMIN_EMAIL, name: "الأدمن الأساسي", addedAt: firebase.firestore.FieldValue.serverTimestamp(), addedBy: "النظام" };
    await fbDb.collection("admins").doc(ADMIN_EMAIL).set(doc);
    adminCache.admins.unshift({ id: ADMIN_EMAIL, ...doc, addedAt: null });
  }
}

function adminLayout(content, tab) {
  const myEmail = ((fbUser && fbUser.email) || "").toLowerCase();
  const me = (adminCache.admins || []).find((a) => a.id === myEmail);
  const myName = (me && me.name) || (myEmail === ADMIN_EMAIL ? "الأدمن الأساسي" : "مشرف");
  app.innerHTML = `
    ${platNavHtml(myName, "", "#/admin/profile")}
    <div class="hdr">
      <h1>لوحة تحكم الأدمن</h1>
    </div>
    <div class="tabs">
      <button type="button" class="tab ${tab === "stats" ? "active" : ""}" data-g="#/admin">نظرة عامة</button>
      <button type="button" class="tab ${tab === "teachers" ? "active" : ""}" data-g="#/admin/teachers">المدرسين</button>
      <button type="button" class="tab ${tab === "students" ? "active" : ""}" data-g="#/admin/students">الطلاب</button>
      <button type="button" class="tab ${tab === "subjects" ? "active" : ""}" data-g="#/admin/subjects">المواد الدراسية</button>
      <button type="button" class="tab ${tab === "library" ? "active" : ""}" data-g="#/admin/library">المكتبة العامة</button>
      <button type="button" class="tab ${tab === "reports" ? "active" : ""}" data-g="#/admin/reports">التقارير</button>
      <button type="button" class="tab ${tab === "admins" ? "active" : ""}" data-g="#/admin/admins">المشرفين</button>
    </div>
    ${content}
    ${closing()}`;
  document.querySelectorAll(".tab[data-g]").forEach((b) => b.onclick = () => location.hash = b.dataset.g);
  bindPlatNav();
  window.scrollTo(0, 0);
}

async function renderAdmin(h) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  // بوابة الرقم السري قبل أي تحميل لبيانات اللوحة
  if (!adminPinOk()) return renderAdminPinGate(h);
  app.innerHTML = `<div class="spin">بنحمل بيانات المنصة...</div>`;
  try { await adminLoad(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  if (h.startsWith("#/admin/teacher-content/")) {
    const tid = decodeURIComponent(h.slice("#/admin/teacher-content/".length));
    return renderAdminTeacherContent(tid);
  }
  const tab = h === "#/admin/teachers" ? "teachers" : h === "#/admin/students" ? "students" : h === "#/admin/subjects" ? "subjects" : h === "#/admin/library" ? "library" : h === "#/admin/reports" ? "reports" : h === "#/admin/admins" ? "admins" : h === "#/admin/profile" ? "profile" : h === "#/admin/transfer" ? "transfer" : "stats";
  if (tab === "profile") return adminProfile();
  if (tab === "transfer") return adminTransferPage();
  if (tab === "teachers") return adminTeachers();
  if (tab === "students") return adminStudents();
  if (tab === "subjects") return adminSubjects();
  if (tab === "library") return adminLibrary();
  if (tab === "reports") return adminReports();
  if (tab === "admins") return adminAdmins();
  return adminStats();
}

function adminStats() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const teachers = adminCache.teachers || [];
  const students = adminCache.students || [];
  const approved = students.filter((s) => s.status === "approved").length;
  const pending = students.filter((s) => s.status === "pending").length;
  const content = `
    <div class="card" style="border-right:4px solid var(--primary);">
      <div class="btnrow" style="justify-content:space-between; flex-wrap:wrap;">
        <b style="font-size:16px;">🗓️ الترم الحالي</b>
        <span class="chip green">${termName(termCurrent())} نشط</span>
      </div>
      <p class="muted" style="font-size:13px; margin:6px 0 10px;">أي محتوى جديد (درس / كويز / امتحان) بيتسجل على الترم الحالي افتراضيًا. لما تبدل للترم الثاني، محتوى الترم الأول يفضل ظاهر للطلبة لكن يبقى للقراءة بس — ميقدرش مدرس يعدله أو يحذفه. المكتبة العامة شغالة للترمين، ونقاط الطالب بتتجمع طول السنة.</p>
      <div class="btnrow" style="align-items:center;">
        <label class="chip" style="cursor:pointer; font-size:14px; ${termCurrent() === 1 ? "border:2px solid var(--primary);" : ""}"><input type="radio" name="cur-term" value="1" ${termCurrent() === 1 ? "checked" : ""} style="accent-color:var(--primary);"> الترم الأول</label>
        <label class="chip" style="cursor:pointer; font-size:14px; ${termCurrent() === 2 ? "border:2px solid var(--primary);" : ""}"><input type="radio" name="cur-term" value="2" ${termCurrent() === 2 ? "checked" : ""} style="accent-color:var(--primary);"> الترم الثاني</label>
        <button type="button" class="btn small" id="term-save">حفظ الترم الحالي</button>
      </div>
      <p class="msg" id="term-msg"></p>
    </div>
    <div class="statcards">
      <div class="statcard"><div class="num">${teachers.length}</div><div class="lbl">مدرس</div></div>
      <div class="statcard"><div class="num">${students.length}</div><div class="lbl">طالب</div></div>
      <div class="statcard"><div class="num">${approved}</div><div class="lbl">طالب مقبول</div></div>
      <div class="statcard"><div class="num">${pending}</div><div class="lbl">طلب تحت المراجعة</div></div>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">المراحل والصفوف</h2>
      <p class="muted" style="font-size:13px; margin-top:0;">كل مرحلة بصفوفها، وعدد الطلاب في كل صف.</p>
      ${STAGES.map((st) => {
        const stu = students.filter((s) => stageOfGrade(s.grade) === st).length;
        return `<h3 style="margin:14px 0 8px; font-size:15px;">المرحلة ال${esc(st)}ة <span class="muted" style="font-weight:400;">(${stu} طالب)</span></h3>
        <table class="ttable"><thead><tr><th>الصف</th><th>عدد الطلاب</th></tr></thead><tbody>
          ${gradesOfStage(st).map((g) => `<tr><td>${esc(g)}</td><td>${students.filter((s) => s.grade === g).length}</td></tr>`).join("")}
        </tbody></table>`;
      }).join("")}
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">طلاب كل مدرس</h2>
      <table class="ttable resp">
        <thead><tr><th>المدرس</th><th>المادة</th><th>المراحل (طلاب كل مرحلة)</th><th>عدد طلابه</th><th>مقبول</th><th>طلبات جديدة</th></tr></thead>
        <tbody>
          ${teachers.length ? teachers.map((t) => {
            const mine = students.filter((s) => (s.teacherIds || []).includes(t.id));
            return `<tr data-rv-t="${t.id}" style="cursor:pointer" title="اضغط لعرض البيانات كاملة">
              <td data-h="المدرس">${esc(t.name)}${t.active === false ? ' <span class="chip red">معطّل</span>' : ""}</td>
              <td data-h="المادة">${esc(t.subject || "—")}</td>
              <td data-h="المراحل">${esc(teacherStagesText(t))}</td>
              <td data-h="عدد طلابه">${mine.length}</td>
              <td data-h="مقبول">${mine.filter((s) => s.status === "approved").length}</td>
              <td data-h="طلبات جديدة">${mine.filter((s) => s.status === "pending").length}</td>
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
              <td data-h="الطالب">${esc(s.name)}</td><td class="ltr" data-h="الإيميل">${esc(s.email || "—")}</td><td data-h="المدرس">${esc(tnames)}</td><td data-h="السنة">${esc(s.grade || "—")}</td><td class="ltr" data-h="ولي الأمر">${esc(s.parentPhone || "غير مسجل")}</td>
              <td data-h="الحالة">${statusChip(s.status)}</td><td data-h="البرمجة">${prog}%</td>
            </tr>`;
          }).join("") : `<tr><td colspan="6" class="center muted">لسه مفيش طلاب</td></tr>`}
        </tbody>
      </table>
    </div>`;
  adminLayout(content, "stats");
  document.getElementById("term-save").onclick = async () => {
    const v = Number((document.querySelector('input[name="cur-term"]:checked') || {}).value || 1);
    const m = document.getElementById("term-msg");
    try {
      await fbDb.collection("settings").doc("app").set({ currentTerm: v }, { merge: true });
      appSettings.currentTerm = v;
      showToast("الترم الحالي بقى: " + termName(v) + " ✅", "good");
      adminStats();
    } catch (e) { m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
  };
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

// اختيارات الصف حسب المرحلة المختارة في فورم المادة
function sjGradeOptions(stage, val) {
  return `<option value="">كل صفوف المرحلة</option>` + gradesOfStage(stage).map((g) => `<option value="${esc(g)}" ${val === g ? "selected" : ""}>${esc(g)}</option>`).join("");
}

function adminSubjects() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const subjects = adminCache.subjects || [];
  const content = `
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">إضافة مادة</h2>
      <div class="filterrow">
        <input id="sj-name" type="text" class="inp" placeholder="اسم المادة، مثال: اللغة الألمانية">
        <select id="sj-stage" class="inp">
          ${STAGES.map((s) => `<option>${s}</option>`).join("")}
        </select>
        <select id="sj-grade" class="inp">${sjGradeOptions(STAGES[0], "")}</select>
        <button type="button" class="btn" id="sj-add">إضافة</button>
      </div>
      <p class="muted" style="font-size:12.5px;">قايمة الصفوف بتتغير حسب المرحلة المختارة. "كل صفوف المرحلة" للمادة العامة على المرحلة كلها.</p>
      <p class="msg" id="sj-msg"></p>
    </div>
    ${subjects.length ? `
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">تقرير المواد</h2>
      <table class="ttable">
        <thead><tr><th>المادة</th><th>المرحلة</th><th>الصف</th><th>عدد المدرسين</th><th>عدد الطلاب</th><th>متوسط تقدم الطلاب</th></tr></thead>
        <tbody>
          ${subjectReportRows().map((r) => `<tr>
            <td>${esc(r.s.name)}</td>
            <td>ال${esc(r.s.stage)}ة</td>
            <td>${esc(r.s.grade || "كل الصفوف")}</td>
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
      const stageSubs = subjects.filter((s) => s.stage === stage);
      const subTable = (list, emptyTxt) => `
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
            </tr>`).join("") : `<tr><td colspan="3" class="center muted">${emptyTxt}</td></tr>`}
          </tbody>
        </table>`;
      return `
      <div class="card">
        <h2 style="font-size:18px; margin-top:0;">المرحلة ال${stage}ة (${stageSubs.length})</h2>
        ${gradesOfStage(stage).map((g) => {
          const list = stageSubs.filter((s) => (s.grade || "") === g);
          return `<h3 style="margin:14px 0 8px; font-size:15px;">${esc(g)} <span class="muted" style="font-weight:400;">(${list.length} مواد)</span></h3>
          ${subTable(list, "مفيش مواد متسجلة للصف ده لسه")}`;
        }).join("")}
        <h3 style="margin:14px 0 8px; font-size:15px;">كل صفوف المرحلة <span class="muted" style="font-weight:400;">(مادة عامة)</span></h3>
        ${subTable(stageSubs.filter((s) => !s.grade), "مفيش مواد عامة على المرحلة كلها")}
      </div>`;
    }).join("")}`;
  adminLayout(content, "subjects");
  document.getElementById("sj-stage").onchange = (e) => { document.getElementById("sj-grade").innerHTML = sjGradeOptions(e.target.value, ""); };
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
    <label class="flabel">الصف</label>
    <select id="ej-grade" class="inp">${sjGradeOptions(s.stage, s.grade || "")}</select>
    <div class="btnrow" style="justify-content:center; margin-top:14px;">
      <button type="button" class="btn" id="ej-save">حفظ</button>
      <button type="button" class="btn ghost" id="ej-cancel">إلغاء</button>
    </div>
    <p class="msg" id="ej-msg"></p>
  </div>`;
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  ov.querySelector("#ej-cancel").onclick = () => ov.remove();
  ov.querySelector("#ej-stage").onchange = (e) => { ov.querySelector("#ej-grade").innerHTML = sjGradeOptions(e.target.value, ""); };
  ov.querySelector("#ej-save").onclick = async () => {
    const name = ov.querySelector("#ej-name").value.trim();
    const stage = ov.querySelector("#ej-stage").value;
    const grade = ov.querySelector("#ej-grade").value;
    const m = ov.querySelector("#ej-msg");
    if (!name) { m.textContent = "اكتب اسم المادة."; m.className = "msg bad"; return; }
    try {
      await fbDb.collection("subjects").doc(id).update({ name, stage, grade });
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
  if (t) showToast(t, good ? "good" : "bad");
}

async function adminAddSubject() {
  const name = document.getElementById("sj-name").value.trim();
  const stage = document.getElementById("sj-stage").value;
  if (!name) return sjMsg("اكتب اسم المادة.");
  const grade = document.getElementById("sj-grade").value;
  const dup = (adminCache.subjects || []).find((s) => s.name === name && s.stage === stage && (s.grade || "") === grade);
  if (dup) return sjMsg(grade ? "المادة دي موجودة في الصف ده قبل كده." : "المادة دي موجودة كمادة عامة في المرحلة دي قبل كده.");
  try {
    await fbDb.collection("subjects").add({
      name, stage, grade, core: false,
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
      gradesOfStage(stage).forEach((grade) => {
        CORE_SUBJECTS[stage].forEach((name) => {
          const exists = (adminCache.subjects || []).find((s) => s.name === name && s.stage === stage && (s.grade || "") === grade);
          if (!exists) {
            batch.set(fbDb.collection("subjects").doc(), {
              name, stage, grade, core: true,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
          }
        });
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
    ["موبايل ولي الأمر", s.parentPhone ? `<span class="ltr">${esc(s.parentPhone)}</span> <a class="btn sm green" target="_blank" href="${waLink(s.parentPhone, "أهلاً بحضرتك، معاك الأدمن من منصة الدروس بخصوص " + s.name + ".")}">واتساب</a>` : "غير مسجل"],
    ["السنة الدراسية", esc(s.grade || "—")],
    ["المدرسين", esc(tnames || "—")],
    ["الحالة", s.status === "approved" ? "مقبول" : s.status === "rejected" ? "مرفوض" : "تحت المراجعة"],
    ["تقدمه في البرمجة والذكاء الاصطناعي", prog + "%"],
    ["حساب الدخول", s.authLinked ? "اتعمل (دخل وعمل باسورد)" : "لسه مدخلش"],
    ["تاريخ التسجيل", fmtTs(s.createdAt)],
  ]);
}

function adminTeachers() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const teachers = adminCache.teachers || [];
  const students = adminCache.students || [];
  const editing = editingTeacherId ? (adminCache.teachers || []).find((t) => t.id === editingTeacherId) : null;
  const subjects = adminCache.subjects || [];
  // المدرس بيتربط بالمادة بالاسم في المرحلة، فبنعرض كل اسم مادة مرة واحدة مهما اتكررت على الصفوف
  const seenSub = new Set();
  const subjectOptions = subjects.filter((s) => { const k = (s.name || "") + "|" + (s.stage || ""); if (seenSub.has(k)) return false; seenSub.add(k); return true; })
    .map((s) => `<option value="${esc(s.name)}" ${editing && (editing.subject || "") === s.name ? "selected" : ""}>${esc(s.name)} — ال${esc(s.stage)}ة</option>`).join("");
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
        <div><label class="flabel">رقم الواتساب</label><input id="ta-phone" type="tel" class="inp ltr" placeholder="01xxxxxxxxx" value="${editing ? esc(editing.phone || "") : ""}"></div>
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
      ${editing ? "" : `<div style="background:#f0fdfa; border:1px solid #99f6e4; color:#0f766e; border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:700;">بعد الإضافة هيوصل للمدرس لينك تفعيل على إيميله — لازم يدوس عليه قبل أول دخول</div>`}
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
      <table class="ttable resp">
        <thead><tr><th>الاسم</th><th>المادة</th><th>المراحل (طلاب كل مرحلة)</th><th>الإيميل</th><th>طلابه</th><th>الحالة</th><th>إجراءات</th></tr></thead>
        <tbody>
          ${teachers.length ? teachers.map((t) => {
            const mine = students.filter((s) => (s.teacherIds || []).includes(t.id)).length;
            return `<tr data-rv-t="${t.id}" style="cursor:pointer" title="اضغط لعرض البيانات كاملة">
              <td data-h="الاسم">${t.photoData ? `<img src="${t.photoData}" alt="" style="width:34px;height:34px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-left:8px;">` : ""}${esc(t.name)}</td><td data-h="المادة">${esc(t.subject || "—")}</td><td data-h="المراحل">${esc(teacherStagesText(t))}</td><td class="ltr" data-h="الإيميل">${esc(t.email)}</td><td data-h="طلابه">${mine}</td>
              <td data-h="الحالة">${t.active === false ? '<span class="chip red">موقوف</span>' : '<span class="chip green">نشط</span>'}</td>
              <td>
                <div class="btnrow">
                  <button type="button" class="btn sm" data-tc="${t.id}">👁️ عرض المحتوى</button>
                  <button type="button" class="btn sm ghost" data-tv="${t.id}">عرض</button>
                  <button type="button" class="btn sm ghost" data-te="${t.id}">تعديل</button>
                  <button type="button" class="btn sm ghost" data-tr="${t.id}">إعادة ضبط الباسورد</button>
                  <button type="button" class="btn sm ${t.active === false ? "" : "ghost"}" data-tg="${t.id}">${t.active === false ? "▶️ إلغاء الإيقاف" : "⛔ إيقاف مؤقت"}</button>
                  <button type="button" class="btn sm red" data-td="${t.id}">حذف نهائي</button>
                </div>
              </td>
            </tr>`;
          }).join("") : `<tr><td colspan="7" class="center muted">لسه مفيش مدرسين</td></tr>`}
        </tbody>
      </table>
      <p class="muted" style="font-size:12.5px; margin:10px 4px 0;">المدرس الموقوف بيختفي من صفحة التسجيل للطلبة الجداد ومحتواه بيتقفل على طلابه الحاليين لحد ما يرجع.</p>
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
  document.querySelectorAll("[data-tc]").forEach((b) => b.onclick = () => { location.hash = "#/admin/teacher-content/" + b.dataset.tc; });
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
  if (t) showToast(t, good ? "good" : "bad");
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
      const pubUpd = { name, subject, stages, email };
      if (taPhotoData) pubUpd.avatar = taPhotoData;
      batch.update(fbDb.collection("teachersPublic").doc(editingTeacherId), pubUpd);
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
    // لينك التفعيل بيتبعت فوراً — المدرس الجديد لازم يدوسه قبل أول دخول.
    // لو الإرسال فشل مش بنوقف الإضافة — يقدر يطلب لينك تاني من بوابة التفعيل
    try { await cred.user.sendEmailVerification(); } catch (_) {}
    await secondary.auth().signOut();
    const batch = fbDb.batch();
    batch.set(fbDb.collection("teachers").doc(uid), {
      name, email, subject, phone, stages,
      photoData: taPhotoData || "",
      active: true,
      emailVerifyRequired: true, // حساب جديد: لازم يفعّل إيميله قبل أول دخول
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    // نسخة عامة لصفحة التسجيل وتحذير "الإيميل مش مسجل" وصورة المدرس عند طلابه — من غير تليفون
    batch.set(fbDb.collection("teachersPublic").doc(uid), { name, subject, stages, email, avatar: taPhotoData || "", active: true });
    await batch.commit();
    taMsg("اتضاف المدرس " + name + " ✅ واتبعت لينك التفعيل على إيميله", true);
    adminCache.teachers = null;
    await adminLoad();
    adminTeachers();
  } catch (e) {
    taMsg(authErrAr(e) + " (لو الإيميل متسجل قبل كده في Firebase Auth لازم يتحذف من هناك الأول)");
  } finally {
    if (secondary) try { await secondary.delete(); } catch (_) {}
  }
}

/* إيقاف مدرس مؤقتًا: مودال بيوضح الأثر (مش هيدخل، محتواه بيتقفل على طلابه، بيختفي من التسجيل)
   والإيقاف مبيمسحش حاجة — كل حاجة بترجع زي ما هي عند إلغاء الإيقاف */
async function adminToggleTeacher(id) {
  const t = adminCache.teachers.find((x) => x.id === id);
  if (!t) return;
  const doToggle = async () => {
    try {
      const batch = fbDb.batch();
      batch.update(fbDb.collection("teachers").doc(id), { active: t.active === false });
      batch.update(fbDb.collection("teachersPublic").doc(id), { active: t.active === false });
      await batch.commit();
      showToast(t.active === false ? `رجع ${t.name} للمنصة ✅` : `اتوقف ${t.name} مؤقتًا.`, "good");
      await adminLoad();
      adminTeachers();
    } catch (e) { alert("مشكلة: " + (e.message || e)); }
  };
  // إلغاء الإيقاف على طول من غير مودال — مفيش فيه خطر
  if (t.active === false) return doToggle();
  const mine = (adminCache.students || []).filter((s) => (s.teacherIds || []).includes(id)).length;
  const ov = openConfirmOverlay(`
    <b style="font-size:17px;">⛔ إيقاف المدرس مؤقتًا؟</b>
    <p style="font-size:14px; margin:10px 0;">هيتم إيقاف <b>${esc(t.name || "")}</b> مؤقتًا عن المنصة:</p>
    <div class="card card-sub" style="margin:0 0 12px; font-size:13.5px;">
      🚫 مش هيقدر يسجل دخول &nbsp;·&nbsp; 🚫 محتواه هيتقفل على طلابه${mine ? ` (${mine} طالب)` : ""} &nbsp;·&nbsp; 🚫 هيختفي من صفحة التسجيل للطلبة الجداد
    </div>
    <p class="muted" style="font-size:12.5px;">الإيقاف مبيمسحش أي حاجة — كل المحتوى والبيانات بتفضل موجودة وترجع زي ما هي لما تلغي الإيقاف.</p>
    <div class="btnrow" style="margin-top:12px;"><button type="button" class="btn red" id="st-ok">نعم، إيقاف مؤقت</button><button type="button" class="btn ghost" id="st-no">إلغاء</button></div>`);
  ov.querySelector("#st-no").onclick = () => ov.remove();
  ov.querySelector("#st-ok").onclick = async () => { ov.remove(); await doToggle(); };
}

/* حذف مدرس نهائيًا: مودال تحذير كامل (بياناته + كل محتواه + محاولات وتقييمات طلابه عليه)
   مع نصيحة تحميل نسخة من المحتوى الأول، وبعدين مسح شامل بـ deleteTeacherEverywhere */
function adminDeleteTeacher(id) {
  const t = adminCache.teachers.find((x) => x.id === id);
  if (!t) return;
  const mine = (adminCache.students || []).filter((s) => (s.teacherIds || []).includes(id)).length;
  const ov = openConfirmOverlay(`
    <b style="font-size:17px;">⚠️ حذف المدرس نهائيًا؟</b>
    <p style="font-size:14px; margin:10px 0;">هيتم حذف <b>${esc(t.name || "")}</b> وكل ما يخصه من المنصة بالكامل:</p>
    <div class="card card-sub" style="margin:0 0 12px; font-size:13.5px;">
      ✖️ بياناته وحسابه &nbsp;·&nbsp; ✖️ كل دروسه وكويزاته وامتحاناته وإعلاناته وبنك أسئلته &nbsp;·&nbsp; ✖️ محاولات ودرجات وتقييمات طلابه عليه &nbsp;·&nbsp; ✖️ هيتشال من قوائم طلابه${mine ? ` (${mine} طالب — الطلاب نفسهم هيفضلوا)` : ""}
    </div>
    <p class="muted" style="font-size:12.5px;">مفيش تراجع عن الخطوة دي. نصيحة: حمّل نسخة من المحتوى الأول من زرار "👁️ عرض المحتوى".</p>
    <div class="btnrow" style="margin-top:12px;"><button type="button" class="btn red" id="td-ok">نعم، حذف نهائي</button><button type="button" class="btn ghost" id="td-no">إلغاء</button></div>
    <p class="msg" id="td-msg"></p>`);
  ov.querySelector("#td-no").onclick = () => ov.remove();
  ov.querySelector("#td-ok").onclick = async () => {
    const btn = ov.querySelector("#td-ok");
    const m = ov.querySelector("#td-msg");
    btn.disabled = true;
    m.className = "msg"; m.textContent = "بنحذف...";
    try {
      const c = await deleteTeacherEverywhere(t);
      ov.remove();
      showToast(`اتحذف ${t.name || "المدرس"} نهائيًا: ${c.lessons} درس و${c.quizzes} كويز و${c.exams} امتحان و${c.quizAttempts} محاولة، واتشال من قوائم ${c.students} طالب.`, "good");
      await adminLoad();
      adminTeachers();
    } catch (e) { btn.disabled = false; m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
  };
}

/* ---------- صفحة محتوى مدرس (قراءة فقط للأدمن) ----------
   الأدمن يشوف دروس وكويزات وامتحانات وإعلانات أي مدرس مع محاولات ومتوسطات طلابه،
   ويحمّل نسخة من المحتوى (CSV / JSON / طباعة) — مفيش أي تعديل من الصفحة دي. */
async function adminTeacherContentData(tid) {
  const byT = (col) => fbDb.collection(col).where("teacherId", "==", tid).get()
    .then((sn) => sn.docs.map((d) => ({ id: d.id, ...d.data() })));
  const [lessons, quizzes, exams, ann, attempts, ratings] = await Promise.all([
    byT("lessons"), byT("quizzes"), byT("exams"), byT("announcements"), byT("quizAttempts"), byT("lessonRatings"),
  ]);
  return { lessons, quizzes, exams, ann, attempts, ratings };
}

/* عدد المحاولات ومتوسط النسبة لعنصر (كويز أو امتحان) */
function atcStats(attempts, id, isExam) {
  const at = attempts.filter((a) => isExam ? a.examId === id : a.quizId === id);
  const pcts = at.filter((a) => a.total > 0).map((a) => Math.round((a.score / a.total) * 100));
  const avg = pcts.length ? Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length) : null;
  return { count: at.length, avg };
}

async function renderAdminTeacherContent(tid) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const t = (adminCache.teachers || []).find((x) => x.id === tid);
  if (!t) { location.hash = "#/admin/teachers"; return; }
  app.innerHTML = `<div class="spin">بنحمل محتوى المدرس...</div>`;
  let data;
  try { data = await adminTeacherContentData(tid); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const { lessons, quizzes, exams, ann, attempts, ratings } = data;
  const mine = (adminCache.students || []).filter((s) => (s.teacherIds || []).includes(tid)).length;
  const sortedLessons = lessons.slice().sort((a, b) => (a.unit || 0) - (b.unit || 0) || (a.lessonNum || 0) - (b.lessonNum || 0));
  const lessonStats = (l) => {
    const rs = ratings.filter((r) => r.lessonId === l.id);
    const avg = rs.length ? (rs.reduce((s, r) => s + (r.stars || 0), 0) / rs.length).toFixed(1) : null;
    return { count: rs.length, avg };
  };
  const content = `
    <div style="margin-bottom:10px;"><button type="button" class="btn ghost sm" id="atc-back">→ رجوع للمدرسين</button></div>
    <div class="card" style="border-right:4px solid var(--primary);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
        <div>
          <h2 style="font-size:18px; margin:0 0 4px;">👁️ محتوى: ${esc(t.name || "")}</h2>
          <div class="muted" style="font-size:13px;">${esc(t.subject || "—")} — ${esc(teacherStagesText(t))} · ${mine} طالب ${t.active === false ? '<span class="chip red">موقوف</span>' : '<span class="chip green">نشط</span>'}</div>
          <div class="muted" style="font-size:12.5px; margin-top:4px;">صفحة قراءة فقط — مفيش تعديل من هنا.</div>
        </div>
        <button type="button" class="btn" id="atc-dl">📥 تحميل المحتوى</button>
      </div>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">الدروس (${sortedLessons.length})</h2>
      ${sortedLessons.length ? `<div class="grid3" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px;">${sortedLessons.map((l) => {
        const st = lessonStats(l);
        return `<div class="card card-sub" style="margin:0;">
          <div style="font-size:12px; color:var(--primary-dark); font-weight:700;">الوحدة ${l.unit || "—"} · الدرس ${l.lessonNum || "—"} · ${l.term === 2 ? "الترم الثاني" : "الترم الأول"}</div>
          <b style="font-size:14.5px;">${esc(l.title || "")}</b>
          <div class="muted" style="font-size:12px; margin-top:4px;">${l.videoUrl ? "🎬 فيديو " : ""}${l.pdfUrl ? "📄 PDF " : ""}${st.avg ? `· ⭐ ${st.avg} (${st.count} تقييم)` : ""}</div>
        </div>`;
      }).join("")}</div>` : `<p class="muted center">مفيش دروس</p>`}
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">الكويزات (${quizzes.length})</h2>
      ${quizzes.length ? `<table class="ttable resp"><thead><tr><th>العنوان</th><th>الصف</th><th>الأسئلة</th><th>المحاولات</th><th>المتوسط</th></tr></thead><tbody>
        ${quizzes.map((q) => { const st = atcStats(attempts, q.id, false); return `<tr>
          <td data-h="العنوان">${esc(q.title || "")}</td><td data-h="الصف">${esc(q.grade || "كل الصفوف")}</td>
          <td data-h="الأسئلة">${(q.questions || []).length}</td><td data-h="المحاولات">${st.count}</td>
          <td data-h="المتوسط">${st.avg != null ? `<span class="chip ${st.avg >= 60 ? "green" : "amber"}">${st.avg}%</span>` : "—"}</td></tr>`; }).join("")}
      </tbody></table>` : `<p class="muted center">مفيش كويزات</p>`}
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">الامتحانات (${exams.length})</h2>
      ${exams.length ? `<table class="ttable resp"><thead><tr><th>العنوان</th><th>الحالة</th><th>المحاولات</th><th>المتوسط</th></tr></thead><tbody>
        ${exams.map((e) => { const st = atcStats(attempts, e.id, true); return `<tr>
          <td data-h="العنوان">${esc(e.title || "")}</td><td data-h="الحالة">${e.closed ? '<span class="chip red">مقفول</span>' : '<span class="chip green">مفتوح</span>'}</td>
          <td data-h="المحاولات">${st.count}</td>
          <td data-h="المتوسط">${st.avg != null ? `<span class="chip ${st.avg >= 60 ? "green" : "amber"}">${st.avg}%</span>` : "—"}</td></tr>`; }).join("")}
      </tbody></table>` : `<p class="muted center">مفيش امتحانات</p>`}
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">الإعلانات (${ann.length})</h2>
      ${ann.length ? ann.slice().sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0)).map((a) => `
        <div class="card card-sub" style="margin:0 0 8px;"><b>📢 ${esc(a.text || "")}</b>
        <div class="muted" style="font-size:12px;">${a.createdAt ? fmtTs(a.createdAt) : ""}</div></div>`).join("") : `<p class="muted center">مفيش إعلانات</p>`}
    </div>`;
  adminLayout(content, "teachers");
  document.getElementById("atc-back").onclick = () => { location.hash = "#/admin/teachers"; };
  document.getElementById("atc-dl").onclick = () => adminTeacherDownloadModal(t, data, mine);
}

/* مودال تحميل محتوى مدرس: 3 صيغ. الفيديوهات على يوتيوب والـ PDF على جوجل درايف،
   فالتحميل بيشمل الروابط والبيانات والأسئلة ونتائج الطلاب — مش الملفات نفسها */
function adminTeacherDownloadModal(t, data, studentCount) {
  const ov = openConfirmOverlay(`
    <b style="font-size:17px;">📥 تحميل محتوى ${esc(t.name || "")}</b>
    <p class="muted" style="font-size:13px; margin:8px 0 12px;">اختار صيغة التحميل:</p>
    <div style="display:grid; gap:10px;">
      <button type="button" class="card card-sub" id="dl-csv" style="margin:0; text-align:right; cursor:pointer; border-right:4px solid var(--green, #16a34a);">
        <b>📊 ملف Excel (CSV)</b>
        <div class="muted" style="font-size:12.5px; margin-top:3px;">قائمة بكل الدروس والكويزات والامتحانات مع روابط الفيديو والـ PDF ونتائج الطلاب — بتتفتح في Excel أو جوجل شيتس.</div>
      </button>
      <button type="button" class="card card-sub" id="dl-json" style="margin:0; text-align:right; cursor:pointer; border-right:4px solid var(--primary);">
        <b>🗄️ نسخة احتياطية كاملة (JSON)</b>
        <div class="muted" style="font-size:12.5px; margin-top:3px;">كل البيانات بالأسئلة والإجابات والإعلانات ونتائج الطلاب — تصلح كأرشيف كامل أو لنقل المحتوى.</div>
      </button>
      <button type="button" class="card card-sub" id="dl-print" style="margin:0; text-align:right; cursor:pointer; border-right:4px solid var(--amber, #d97706);">
        <b>🖨️ صفحة طباعة / PDF</b>
        <div class="muted" style="font-size:12.5px; margin-top:3px;">نسخة منسقة للطباعة أو الحفظ كـ PDF من المتصفح.</div>
      </button>
    </div>
    <p class="muted" style="font-size:12px; margin-top:10px;">ملحوظة: الفيديوهات على يوتيوب والـ PDF على جوجل درايف — التحميل بيشمل الروابط والبيانات، مش الملفات نفسها.</p>
    <div class="btnrow" style="margin-top:12px;"><button type="button" class="btn ghost" id="dl-no">إلغاء</button></div>`);
  ov.querySelector("#dl-no").onclick = () => ov.remove();
  ov.querySelector("#dl-csv").onclick = () => { adminTeacherCsv(t, data); ov.remove(); showToast("اتحمّل ملف Excel (CSV) ✅", "good"); };
  ov.querySelector("#dl-json").onclick = () => { adminTeacherJson(t, data); ov.remove(); showToast("اتحمّلت النسخة الاحتياطية (JSON) ✅", "good"); };
  ov.querySelector("#dl-print").onclick = () => { adminTeacherPrint(t, data, studentCount); ov.remove(); };
}

function adminTeacherStamp() { return new Date().toISOString().slice(0, 10); }

/* CSV بأقسام: دروس / كويزات / امتحانات / إعلانات / نتائج الطلاب — مع BOM عشان العربي يظهر صح في Excel */
function adminTeacherCsv(t, data) {
  const { lessons, quizzes, exams, ann, attempts } = data;
  // حماية من حقن المعادلات في Excel: أي خلية بتبدأ بـ = + - @ أو مسافة/تاب بتتسبق بعلامة تنصيص
  const q = (c) => {
    let s = String(c == null ? "" : c);
    if (/^[=+\-@\t\r ]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const row = (cells) => cells.map(q).join(",");
  const lines = [];
  lines.push(row(["محتوى المدرس", t.name || "", "", "", "", "", ""]));
  lines.push(row(["المادة", t.subject || "", "تاريخ التحميل", adminTeacherStamp()]));
  lines.push("");
  lines.push(row(["الدروس"]));
  lines.push(row(["الوحدة", "الدرس", "العنوان", "الصف", "الترم", "رابط الفيديو", "رابط PDF"]));
  lessons.slice().sort((a, b) => (a.unit || 0) - (b.unit || 0) || (a.lessonNum || 0) - (b.lessonNum || 0))
    .forEach((l) => lines.push(row([l.unit || "", l.lessonNum || "", l.title || "", l.grade || "كل الصفوف", l.term === 2 ? "الثاني" : "الأول", l.videoUrl || "", l.pdfUrl || ""])));
  lines.push("");
  lines.push(row(["الكويزات"]));
  lines.push(row(["العنوان", "الصف", "عدد الأسئلة", "المحاولات", "متوسط الدرجة"]));
  quizzes.forEach((x) => { const st = atcStats(attempts, x.id, false); lines.push(row([x.title || "", x.grade || "كل الصفوف", (x.questions || []).length, st.count, st.avg != null ? st.avg + "%" : ""])); });
  lines.push("");
  lines.push(row(["الامتحانات"]));
  lines.push(row(["العنوان", "الحالة", "عدد الأسئلة", "المحاولات", "متوسط الدرجة"]));
  exams.forEach((x) => { const st = atcStats(attempts, x.id, true); lines.push(row([x.title || "", x.closed ? "مقفول" : "مفتوح", (x.quiz || []).length, st.count, st.avg != null ? st.avg + "%" : ""])); });
  lines.push("");
  lines.push(row(["الإعلانات"]));
  lines.push(row(["الإعلان", "التاريخ"]));
  ann.forEach((a) => lines.push(row([a.text || "", a.createdAt ? fmtTs(a.createdAt) : ""])));
  lines.push("");
  lines.push(row(["نتائج الطلاب"]));
  lines.push(row(["الطالب", "العنصر", "الدرجة", "النسبة", "التاريخ"]));
  const itemName = (a) => {
    if (a.examId) { const e = exams.find((x) => x.id === a.examId); return "امتحان: " + ((e && e.title) || ""); }
    const qz = quizzes.find((x) => x.id === a.quizId);
    return "كويز: " + ((qz && qz.title) || "");
  };
  attempts.forEach((a) => lines.push(row([a.studentName || "", itemName(a), `${a.score} من ${a.total}`, a.total > 0 ? Math.round((a.score / a.total) * 100) + "%" : "", a.updatedAt ? fmtTs(a.updatedAt) : ""])));
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `محتوى-${t.name || "مدرس"}-${adminTeacherStamp()}.csv`);
}

/* نسخة JSON كاملة: بيانات المدرس + المحتوى بالأسئلة + نتائج الطلاب والتقييمات.
   من غير بيانات تواصل (إيميل/تليفون) أو مفاتيح داخلية للطلاب — اسم المدرس والطالب ودرجاته بس */
function adminTeacherJson(t, data) {
  const stripIds = (a) => { const { studentId, ...rest } = a; return rest; };
  const dump = {
    exportedAt: new Date().toISOString(),
    platform: "learnhub-eg",
    teacher: { name: t.name || "", subject: t.subject || "", stages: t.stages || [] },
    lessons: data.lessons, quizzes: data.quizzes, exams: data.exams,
    announcements: data.ann,
    quizAttempts: (data.attempts || []).map(stripIds),
    lessonRatings: (data.ratings || []).map(stripIds),
  };
  const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v && typeof v === "object" && typeof v.toDate === "function" ? v.toDate().toISOString() : v)));
  const blob = new Blob([JSON.stringify(clean(dump), null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, `نسخة-احتياطية-${t.name || "مدرس"}-${adminTeacherStamp()}.json`);
}

/* صفحة طباعة منسقة لمحتوى المدرس — تتطبع أو تتحفظ PDF من المتصفح */
function adminTeacherPrint(t, data, studentCount) {
  const { lessons, quizzes, exams, ann, attempts } = data;
  const w = window.open("", "_blank");
  if (!w) { alert("المتصفح مانع النافذة المنبثقة. اسمح بيها وجرّب تاني."); return; }
  const escP = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tbl = (cols, rows) => `<table><thead><tr>${cols.map((c) => `<th>${escP(c)}</th>`).join("")}</tr></thead>
    <tbody>${rows.length ? rows.map((r) => `<tr>${r.map((c) => `<td>${escP(c)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${cols.length}" style="text-align:center; color:#64748b;">مفيش بيانات</td></tr>`}</tbody></table>`;
  w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>محتوى ${escP(t.name || "")}</title>
  <style>
    body { font-family: "Cairo", "Segoe UI", Tahoma, sans-serif; direction: rtl; padding: 24px; color: #1e293b; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 18px 0 6px; }
    .meta { color: #64748b; font-size: 12.5px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: right; }
    th { background: #f1f5f9; }
    .foot { margin-top: 18px; color: #64748b; font-size: 12px; text-align: center; }
    @media print { body { padding: 0; } }
  </style></head><body>
  <h1>محتوى المدرس: ${escP(t.name || "")} — منصة learnhub-eg</h1>
  <div class="meta">${escP(t.subject || "")} · ${studentCount} طالب · تاريخ التحميل: ${escP(new Date().toLocaleString("ar-EG"))}</div>
  <h2>الدروس (${lessons.length})</h2>
  ${tbl(["الوحدة", "الدرس", "العنوان", "الصف", "رابط الفيديو", "رابط PDF"], lessons.slice().sort((a, b) => (a.unit || 0) - (b.unit || 0) || (a.lessonNum || 0) - (b.lessonNum || 0)).map((l) => [l.unit || "", l.lessonNum || "", l.title || "", l.grade || "كل الصفوف", l.videoUrl || "—", l.pdfUrl || "—"]))}
  <h2>الكويزات (${quizzes.length})</h2>
  ${tbl(["العنوان", "الصف", "الأسئلة", "المحاولات", "المتوسط"], quizzes.map((x) => { const st = atcStats(attempts, x.id, false); return [x.title || "", x.grade || "كل الصفوف", String((x.questions || []).length), String(st.count), st.avg != null ? st.avg + "%" : "—"]; }))}
  <h2>الامتحانات (${exams.length})</h2>
  ${tbl(["العنوان", "الحالة", "الأسئلة", "المحاولات", "المتوسط"], exams.map((x) => { const st = atcStats(attempts, x.id, true); return [x.title || "", x.closed ? "مقفول" : "مفتوح", String((x.quiz || []).length), String(st.count), st.avg != null ? st.avg + "%" : "—"]; }))}
  <h2>الإعلانات (${ann.length})</h2>
  ${tbl(["الإعلان", "التاريخ"], ann.map((a) => [a.text || "", a.createdAt ? fmtTs(a.createdAt) : ""]))}
  <h2>نتائج الطلاب (${attempts.length})</h2>
  ${tbl(["الطالب", "الدرجة", "النسبة", "التاريخ"], attempts.map((a) => [a.studentName || "", `${a.score} من ${a.total}`, a.total > 0 ? Math.round((a.score / a.total) * 100) + "%" : "—", a.updatedAt ? fmtTs(a.updatedAt) : "—"]))}
  <div class="foot">فكرة وإعداد: مهندس اسامه حسن عسس</div>
  <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`);
  w.document.close();
}

let adminFilter = { teacher: "", status: "", q: "" };

function adminStudents() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
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
      <div class="btnrow" style="justify-content:space-between; align-items:center; flex-wrap:wrap;">
        <h2 style="font-size:18px; margin:0;">الطلاب (${students.length} من ${all.length})</h2>
        <button type="button" class="btn ghost small" id="st-transfer">📦 نقل جماعي بين الصفوف</button>
      </div>
      <div class="filterrow" style="margin-top:10px;">
        <select id="af-t" class="inp">
          <option value="">كل المدرسين</option>
          ${teachers.map((t) => `<option value="${t.id}" ${adminFilter.teacher === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}
        </select>
        <select id="af-s" class="inp">
          <option value="">كل الحالات</option>
          <option value="pending" ${adminFilter.status === "pending" ? "selected" : ""}>تحت المراجعة</option>
          <option value="approved" ${adminFilter.status === "approved" ? "selected" : ""}>مقبول</option>
          <option value="rejected" ${adminFilter.status === "rejected" ? "selected" : ""}>مرفوض</option>
          <option value="suspended" ${adminFilter.status === "suspended" ? "selected" : ""}>موقوف</option>
        </select>
        <input id="af-q" type="text" class="inp" placeholder="بحث بالاسم..." value="${esc(adminFilter.q)}">
      </div>
      <table class="ttable resp">
        <thead><tr><th>الطالب</th><th>الإيميل</th><th>المدرس</th><th>السنة</th><th>ولي الأمر</th><th>الحالة</th><th>البرمجة</th><th>إجراءات</th></tr></thead>
        <tbody>
          ${students.length ? students.map((s) => {
            const tnames = (s.teacherIds || []).map((id) => (teachers.find((t) => t.id === id) || {}).name || "—").join("، ");
            const prog = (s.progress && s.progress["programming-ai"] && s.progress["programming-ai"].percent) || 0;
            return `<tr data-rv-s="${s.id}" style="cursor:pointer" title="اضغط لعرض البيانات كاملة">
              <td data-h="الطالب">${esc(s.name)}</td><td class="ltr" data-h="الإيميل">${esc(s.email || "—")}</td><td data-h="المدرس">${esc(tnames)}</td><td data-h="السنة">${esc(s.grade || "—")}</td><td class="ltr" data-h="ولي الأمر">${esc(s.parentPhone || "غير مسجل")}</td>
              <td data-h="الحالة">${statusChip(s.status)}</td><td data-h="البرمجة">${prog}%</td>
              <td>
                <div class="btnrow">
                  <button type="button" class="btn sm ghost" data-sv="${s.id}">عرض</button>
                  <button type="button" class="btn sm ghost" data-se="${s.id}">تعديل</button>
                  ${s.phone ? `<a class="btn sm green" target="_blank" href="${waLink(s.phone, "أهلاً " + s.name + "، معاك الأدمن من منصة الدروس.")}">واتساب</a>` : ""}
                  ${s.status !== "approved" && s.status !== "suspended" ? `<button type="button" class="btn sm ghost" data-ap="${s.id}">قبول</button>` : ""}
                  ${s.status === "approved" ? `<button type="button" class="btn sm" style="background:var(--amber);" data-ss="${s.id}">⛔ إيقاف</button>` : ""}
                  ${s.status === "suspended" ? `<button type="button" class="btn sm" style="background:var(--green);" data-us="${s.id}">▶️ إلغاء الإيقاف</button>` : ""}
                  <button type="button" class="btn sm red" data-sd="${s.id}">حذف نهائي</button>
                </div>
              </td>
            </tr>`;
          }).join("") : `<tr><td colspan="8" class="center muted">مفيش نتايج</td></tr>`}
        </tbody>
      </table>
    </div>`;
  adminLayout(content, "students");
  document.getElementById("st-transfer").onclick = () => { location.hash = "#/admin/transfer"; };
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
  document.querySelectorAll("[data-ss]").forEach((b) => b.onclick = () => adminSetSuspended(b.dataset.ss, true));
  document.querySelectorAll("[data-us]").forEach((b) => b.onclick = () => adminSetSuspended(b.dataset.us, false));
  document.querySelectorAll("[data-sd]").forEach((b) => b.onclick = () => adminDeleteStudent(b.dataset.sd));
}

/* إيقاف/إلغاء إيقاف طالب من المنصة كلها (الأدمن بس) */
async function adminSetSuspended(id, suspend) {
  const s = (adminCache.students || []).find((x) => x.id === id);
  if (!s) return;
  try {
    const batch = fbDb.batch();
    batch.update(fbDb.collection("students").doc(id), { status: suspend ? "suspended" : "approved" });
    if (s.email) batch.update(fbDb.collection("registrationLookup").doc(String(s.email).toLowerCase()), { status: suspend ? "suspended" : "approved" });
    await batch.commit();
    showToast(suspend ? `اتوقف ${s.name} من المنصة.` : `رجع ${s.name} للمنصة ✅`, "good");
    await adminLoad();
    adminStudents();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
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
    <label class="flabel">موبايل ولي الأمر (واتساب)</label>
    <input id="es-parent-phone" type="tel" class="inp ltr" value="${esc(s.parentPhone || "")}" placeholder="01xxxxxxxxx">
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
    const phone = normalizeEgPhone(ov.querySelector("#es-phone").value) || "";
    const parentPhone = normalizeEgPhone(ov.querySelector("#es-parent-phone").value) || "";
    const m = ov.querySelector("#es-msg");
    m.textContent = "";
    if (!name) return m.textContent = "اكتب اسم الطالب.", m.className = "msg bad";
    if (!linked && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return m.textContent = "اكتب إيميل صح.", m.className = "msg bad";
    if (!phone) return m.textContent = "اكتب رقم موبايل مصري صح (11 رقم يبدأ بـ 01).", m.className = "msg bad";
    if (ov.querySelector("#es-parent-phone").value.trim() && !parentPhone) return m.textContent = "رقم ولي الأمر مش صح (11 رقم يبدأ بـ 01)، أو سيبه فاضي.", m.className = "msg bad";
    try {
      const oldEmail = String(s.email || "").toLowerCase();
      const newData = { name, grade, phone, parentPhone };
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

/* حذف نهائي: مودال تأكيد بيوضح إن المحاولات والتقييمات والبيانات كلها هتتمسح */
function adminDeleteStudent(id) {
  const s = (adminCache.students || []).find((x) => x.id === id);
  if (!s) return;
  confirmDeleteStudent(s, async () => { await adminLoad(); adminStudents(); });
}

/* صفحة النقل الجماعي للأدمن — أي طلبة */
function adminTransferPage() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  renderTransferPage({
    students: adminCache.students || [],
    teachers: adminCache.teachers || [],
    wrap: (content) => adminLayout(content, "students"),
    backHash: "#/admin/students",
    onDone: async () => { await adminLoad(); adminTransferPage(); },
  });
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
    return [s.name || "", s.email || "", s.phone || "", s.parentPhone || "غير مسجل", s.grade || "—", tnames || "—", statusText(s.status), avg !== null ? avg + "%" : "—", fmtTs(s.createdAt)];
  });
  return { title: "تقرير الطلاب", columns: ["الاسم", "الإيميل", "الموبايل", "ولي الأمر", "السنة الدراسية", "المدرسين", "الحالة", "التقدم", "تاريخ التسجيل"], rows, filtersDesc: desc };
}

function adminReports() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
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
  if (t) showToast(t, good ? "good" : "bad");
}

function adminAdmins() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
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
      <h2 style="font-size:18px; margin-top:0;">رقم الأدمن السري (PIN)</h2>
      <p class="muted" style="font-size:13px;">ده الرقم اللي اللوحة بتطلبه منك كل مرة تدخل فيها بعد تسجيل الدخول — حماية إضافية لو الجهاز في إيد حد تاني. بيتحفظ مشفّر ومحدش يقدر يقرأه، ولو نسيته تقدر تغيّره من هنا في أي وقت.</p>
      <div class="fgrid">
        <div><label class="flabel">الرقم السري الجديد (من 4 لـ 6 أرقام)</label><input id="apc-pin1" type="password" inputmode="numeric" maxlength="6" class="inp ltr" autocomplete="off"></div>
        <div><label class="flabel">تأكيد الرقم السري</label><input id="apc-pin2" type="password" inputmode="numeric" maxlength="6" class="inp ltr" autocomplete="off"></div>
      </div>
      <button type="button" class="btn" id="apc-btn">تغيير الرقم السري</button>
      <p id="apc-msg" class="msg"></p>
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
  document.getElementById("apc-btn").onclick = adminChangePin;
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


function apcMsg(t, good) {
  const m = document.getElementById("apc-msg");
  if (m) { m.className = "msg " + (good ? "good" : "bad"); m.textContent = t; }
  if (t) showToast(t, good ? "good" : "bad");
}

// تغيير رقم الأدمن السري (PIN) من تاب المشرفين
async function adminChangePin() {
  const p1 = document.getElementById("apc-pin1").value.trim();
  const p2 = document.getElementById("apc-pin2").value.trim();
  if (!/^[0-9]{4,6}$/.test(p1)) return apcMsg("الرقم السري من 4 لـ 6 أرقام.");
  if (p1 !== p2) return apcMsg("الرقمين مش زي بعض.");
  const btn = document.getElementById("apc-btn");
  btn.disabled = true;
  try {
    const email = (fbUser.email || "").toLowerCase();
    const pinHash = await sha256Hex(email + ":" + p1);
    await fbDb.collection("admins").doc(email).update({ pinHash });
    document.getElementById("apc-pin1").value = "";
    document.getElementById("apc-pin2").value = "";
    apcMsg("اتغيّر الرقم السري. هتستخدمه من أول مرة دخول جاية.", true);
  } catch (e) {
    apcMsg("حصلت مشكلة: " + (e.message || e));
  }
  btn.disabled = false;
}

/* ---------- تاب حسابي (الأدمن) ----------
   بيانات المشرف + تغيير الباسورد + تغيير رقم الأدمن السري من مكان واحد */
function adminProfile() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const myEmail = ((fbUser && fbUser.email) || "").toLowerCase();
  const me = (adminCache.admins || []).find((a) => a.id === myEmail) || {};
  const isSuper = myEmail === ADMIN_EMAIL;
  const hasPasswordProvider = (fbUser && fbUser.providerData || []).some((p) => p.providerId === "password");
  const content = `
    <div class="card center" style="padding:28px;">
      <span class="pavinit" style="width:84px; height:84px; font-size:38px;">${esc(((me.name || "م").trim() || "م")[0])}</span>
      <h2 style="margin:10px 0 2px; font-size:20px;">${esc(me.name || "مشرف")}</h2>
      <div class="muted ltr">${esc(myEmail)}</div>
      <div style="margin-top:8px;">${isSuper ? '<span class="chip green">الأدمن الأساسي</span>' : '<span class="chip">مشرف</span>'}</div>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">🔒 الباسورد</h2>
      ${hasPasswordProvider ? `
        <div style="display:grid; gap:10px; max-width:340px;">
          <input type="password" class="inp ltr" id="apr-p1" placeholder="الباسورد الجديد (٦ حروف على الأقل)">
          <input type="password" class="inp ltr" id="apr-p2" placeholder="تأكيد الباسورد الجديد">
          <div class="btnrow"><button type="button" class="btn sm" id="apr-pass-save">حفظ الباسورد</button></div>
        </div>
      ` : `
        <p class="muted" style="font-size:13.5px;">حسابك بيدخل بجوجل من غير باسورد. تقدر تربط باسورد بالحساب عن طريق إيميل إعادة الضبط، وبعدها تقدر تدخل بالإيميل والباسورد برضه.</p>
        <div class="btnrow"><button type="button" class="btn ghost sm" id="apr-pass-link">إرسال إيميل ربط باسورد</button></div>
      `}
      <p class="msg" id="apr-pass-msg"></p>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">🔐 رقم الأدمن السري (PIN)</h2>
      <p class="muted" style="font-size:13px;">الرقم اللي اللوحة بتطلبه كل مرة دخول. بيتحفظ مشفّر ومحدش يقدر يقرأه.</p>
      <div class="fgrid">
        <div><label class="flabel">الرقم السري الجديد (من 4 لـ 6 أرقام)</label><input id="apr-pin1" type="password" inputmode="numeric" maxlength="6" class="inp ltr" autocomplete="off"></div>
        <div><label class="flabel">تأكيد الرقم السري</label><input id="apr-pin2" type="password" inputmode="numeric" maxlength="6" class="inp ltr" autocomplete="off"></div>
      </div>
      <button type="button" class="btn sm" id="apr-pin-save">تغيير الرقم السري</button>
      <p class="msg" id="apr-pin-msg"></p>
    </div>`;
  adminLayout(content, "profile");

  const passMsg = document.getElementById("apr-pass-msg");
  const setPassMsg = (t, good) => { passMsg.className = "msg " + (good ? "good" : "bad"); passMsg.textContent = t; if (t) showToast(t, good ? "good" : "bad"); };
  const saveBtn = document.getElementById("apr-pass-save");
  if (saveBtn) saveBtn.onclick = async () => {
    const p1 = document.getElementById("apr-p1").value;
    const p2 = document.getElementById("apr-p2").value;
    if (p1.length < 6) return setPassMsg("الباسورد لازم يكون ٦ حروف على الأقل.");
    if (p1 !== p2) return setPassMsg("الباسوردين مش متطابقين.");
    try {
      await fbAuth.currentUser.updatePassword(p1);
      setPassMsg("تمام، الباسورد اتغير ✅", true);
    } catch (e) {
      setPassMsg((e && e.code === "auth/requires-recent-login")
        ? "لازم تسجل دخول من جديد الأول عشان تغير الباسورد. اخرج وادخل تاني وجرب."
        : "مشكلة: " + (e.message || e));
    }
  };
  const linkBtn = document.getElementById("apr-pass-link");
  if (linkBtn) linkBtn.onclick = async () => {
    try {
      await fbAuth.sendPasswordResetEmail(myEmail);
      setPassMsg("اتبعت إيميل إعادة الضبط لـ " + myEmail + " — افتحه واختار باسوردك ✅", true);
    } catch (e) { setPassMsg(authErrAr(e)); }
  };

  const pinMsg = document.getElementById("apr-pin-msg");
  const setPinMsg = (t, good) => { pinMsg.className = "msg " + (good ? "good" : "bad"); pinMsg.textContent = t; if (t) showToast(t, good ? "good" : "bad"); };
  document.getElementById("apr-pin-save").onclick = async () => {
    const p1 = document.getElementById("apr-pin1").value.trim();
    const p2 = document.getElementById("apr-pin2").value.trim();
    if (!/^[0-9]{4,6}$/.test(p1)) return setPinMsg("الرقم السري من 4 لـ 6 أرقام.");
    if (p1 !== p2) return setPinMsg("الرقمين مش زي بعض.");
    try {
      const pinHash = await sha256Hex(myEmail + ":" + p1);
      await fbDb.collection("admins").doc(myEmail).update({ pinHash });
      setPinMsg("تمام، الرقم السري اتغير ✅", true);
    } catch (e) { setPinMsg("مشكلة: " + (e.message || e)); }
  };
}

/* ---------- المكتبة العامة: محتوى من الأدمن يظهر لكل الطلبة ---------- */
let libForm = null; // {id, title, subject, desc, videoUrl, pdfUrl}
function emptyLibForm() { return { id: null, title: "", subject: "", desc: "", videoUrl: "", pdfUrl: "" }; }

function libMsg(txt, ok) {
  const m = document.getElementById("lb-msg");
  m.className = "msg " + (ok ? "good" : "bad"); m.textContent = txt;
}

function adminLibrary() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!libForm) libForm = emptyLibForm();
  const items = adminCache.library || [];
  const content = `
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">${libForm.id ? "تعديل محتوى" : "إضافة محتوى للمكتبة"}</h2>
      <p class="muted" style="font-size:13px; margin-top:0;">أي حاجة بتضيفها هنا بتظهر لكل الطلبة في تاب «المكتبة» — نماذج امتحانات، مراجعات عامة، فيديوهات.</p>
      <div style="display:grid; gap:10px; margin-top:10px;">
        <input type="text" class="inp" id="lb-title" placeholder="العنوان (مثال: نموذج امتحان الوزارة 2025)" value="${esc(libForm.title)}">
        <input type="text" class="inp" id="lb-subject" placeholder="المادة أو التصنيف (اختياري)" value="${esc(libForm.subject)}">
        <textarea class="inp" id="lb-desc" rows="2" placeholder="وصف قصير (اختياري)">${esc(libForm.desc)}</textarea>
        <input type="text" class="inp ltr" id="lb-video" placeholder="لينك فيديو (اختياري)" value="${esc(libForm.videoUrl)}">
        <input type="text" class="inp ltr" id="lb-pdf" placeholder="لينك ملف PDF (اختياري)" value="${esc(libForm.pdfUrl)}">
      </div>
      <p class="msg" id="lb-msg"></p>
      <div class="btnrow">
        <button type="button" class="btn" id="lb-save">${libForm.id ? "حفظ التعديل" : "إضافة للمكتبة"}</button>
        ${libForm.id ? `<button type="button" class="btn ghost" id="lb-cancel">إلغاء التعديل</button>` : ""}
      </div>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">محتوى المكتبة (${items.length})</h2>
      ${items.length ? `<div style="display:grid; gap:12px; margin-top:12px;">
        ${items.map((it) => `<div class="card" style="margin:0;">
          <div class="btnrow" style="justify-content:space-between; flex-wrap:wrap;">
            <b style="font-size:15px;">${esc(it.title || "")}</b>
            ${it.subject ? `<span class="chip">${esc(it.subject)}</span>` : ""}
          </div>
          ${it.desc ? `<div class="muted" style="font-size:13px; margin-top:4px;">${esc(it.desc)}</div>` : ""}
          <div class="muted" style="font-size:12px; margin:4px 0;">${it.videoUrl ? "🎬 فيديو" : ""}${it.videoUrl && it.pdfUrl ? " · " : ""}${it.pdfUrl ? "📄 PDF" : ""}</div>
          <div class="btnrow">
            <button type="button" class="btn sm ghost" data-lbe="${it.id}">تعديل</button>
            <button type="button" class="btn sm red" data-lbd="${it.id}">حذف</button>
          </div>
        </div>`).join("")}
      </div>` : `<p class="muted center" style="margin-top:12px;">المكتبة فاضية لسه — أضف أول محتوى من الفورم فوق.</p>`}
    </div>`;
  adminLayout(content, "library");
  const bind = (id, key) => { document.getElementById(id).oninput = (e) => libForm[key] = e.target.value; };
  bind("lb-title", "title"); bind("lb-subject", "subject"); bind("lb-desc", "desc");
  bind("lb-video", "videoUrl"); bind("lb-pdf", "pdfUrl");
  document.getElementById("lb-save").onclick = adminSaveLibrary;
  const cancel = document.getElementById("lb-cancel");
  if (cancel) cancel.onclick = () => { libForm = emptyLibForm(); adminLibrary(); };
  document.querySelectorAll("[data-lbe]").forEach((b) => b.onclick = () => {
    const it = (adminCache.library || []).find((x) => x.id === b.dataset.lbe);
    if (!it) return;
    libForm = { id: it.id, title: it.title || "", subject: it.subject || "", desc: it.desc || "", videoUrl: it.videoUrl || "", pdfUrl: it.pdfUrl || "" };
    adminLibrary();
  });
  document.querySelectorAll("[data-lbd]").forEach((b) => b.onclick = () => adminDeleteLibrary(b.dataset.lbd));
}

async function adminSaveLibrary() {
  if (!libForm.title.trim()) return libMsg("اكتب العنوان الأول.");
  if (!libForm.videoUrl.trim() && !libForm.pdfUrl.trim()) return libMsg("أضف لينك فيديو أو ملف PDF على الأقل.");
  const data = {
    title: libForm.title.trim(),
    subject: libForm.subject.trim(),
    desc: libForm.desc.trim(),
    videoUrl: libForm.videoUrl.trim(),
    pdfUrl: libForm.pdfUrl.trim(),
  };
  const btn = document.getElementById("lb-save");
  btn.disabled = true;
  try {
    if (libForm.id) {
      await fbDb.collection("library").doc(libForm.id).update(data);
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.createdBy = (fbUser && fbUser.email) || ADMIN_EMAIL;
      await fbDb.collection("library").add(data);
    }
    libForm = emptyLibForm();
    await adminLoad();
    adminLibrary();
  } catch (e) {
    btn.disabled = false;
    libMsg("مشكلة في الحفظ: " + (e.message || e));
  }
}

async function adminDeleteLibrary(id) {
  const it = (adminCache.library || []).find((x) => x.id === id);
  if (!confirm(`حذف "${(it && it.title) || "المحتوى"}" من المكتبة؟`)) return;
  try {
    await fbDb.collection("library").doc(id).delete();
    if (libForm && libForm.id === id) libForm = emptyLibForm();
    await adminLoad();
    adminLibrary();
  } catch (e) { alert("مشكلة في الحذف: " + (e.message || e)); }
}
