/* ---------- لوحة المدرس ----------
   طلبات الطلاب الجدد (قبول/رفض)، طلابه المقبولين، واتساب الطالب،
   إعادة ضبط الباسورد بإيميل، حذف طالب، وتغيير باسورده هو. */

let teacherCache = null;

function teacherTabs(active) {
  const myAv = (fbProfile && (fbProfile.avatar || fbProfile.photoData)) || "";
  return platNavHtml((fbProfile && fbProfile.name) || "", myAv, "#/teacher/profile") + `<div class="tabs">
    <button type="button" class="tab ${active === "students" ? "active" : ""}" data-g="#/teacher">طلابي</button>
    <button type="button" class="tab ${active === "lessons" ? "active" : ""}" data-g="#/teacher/lessons">الدروس والكويزات</button>
    <button type="button" class="tab ${active === "ann" ? "active" : ""}" data-g="#/teacher/announcements">الإعلانات</button>
    <button type="button" class="tab ${active === "reports" ? "active" : ""}" data-g="#/teacher/reports">التقارير</button>
  </div>`;
}

function bindTeacherTabs() {
  document.querySelectorAll(".tab[data-g]").forEach((b) => b.onclick = () => location.hash = b.dataset.g);
  bindPlatNav();
}

async function teacherLoad() {
  const [snap, at, rt] = await Promise.all([
    fbDb.collection("students").where("teacherIds", "array-contains", fbUser.uid).get(),
    fbDb.collection("quizAttempts").where("teacherId", "==", fbUser.uid).get(),
    fbDb.collection("lessonRatings").where("teacherId", "==", fbUser.uid).get(),
  ]);
  teacherCache = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));
  teacherAttempts = at.docs.map((d) => ({ id: d.id, ...d.data() }));
  teacherRatings = rt.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* لوحة الشرف الأسبوعية: أوائل كل صف من طلاب المدرس حسب نقاط الأسبوع (بتتصفر كل جمعة).
   الترتيب بين طلاب نفس المدرس ونفس الصف بس — زي ما اتفقنا. */
function honorBoardCard(students, weekActs) {
  const pts = {}; const seen = new Set(); // إلغاء التكرار: نفس الدرس/الكويز ميتحسبش مرتين لنفس الطالب
  (weekActs || []).forEach((a) => {
    if (!a || !a.studentId) return;
    const key = a.studentId + "|" + (a.kind || "") + "|" + (a.refId || "");
    if (seen.has(key)) return;
    seen.add(key);
    pts[a.studentId] = (pts[a.studentId] || 0) + (Number(a.points) || 0);
  });
  const withPts = (students || []).filter((s) => s.status === "approved" && (pts[s.id] || 0) > 0);
  if (!withPts.length) return "";
  const grades = [...new Set(withPts.map((s) => s.grade || "—"))];
  grades.sort((a, b) => GRADES.indexOf(a) - GRADES.indexOf(b));
  const medalStyle = (i) => i === 0 ? "background:#f59e0b;color:#fff;" : i === 1 ? "background:#94a3b8;color:#fff;" : i === 2 ? "background:#b45309;color:#fff;" : "background:var(--border, #d8dee9);";
  const sections = grades.map((g) => {
    const top = withPts.filter((s) => (s.grade || "—") === g).sort((a, b) => (pts[b.id] || 0) - (pts[a.id] || 0)).slice(0, 5);
    return `<h3 style="font-size:15px; margin:12px 0 4px;">${esc(g)}</h3>
      ${top.map((s, i) => `<div class="btnrow" style="justify-content:space-between; padding:6px 4px; border-bottom:1px solid var(--border, #e2e8f0);">
        <span style="font-size:14px;"><span style="display:inline-block; min-width:24px; height:24px; line-height:24px; border-radius:50%; text-align:center; font-size:13px; font-weight:700; margin-left:6px; ${medalStyle(i)}">${i + 1}</span>${tAvatarHtml(s)} ${esc(s.name)}</span>
        <b style="font-size:14px; color:var(--primary-dark);">${pts[s.id]} نقطة</b>
      </div>`).join("")}`;
  }).join("");
  return `<div class="card" style="border-right:4px solid var(--amber, #f59e0b);">
    <h2 style="font-size:18px; margin-top:0;">🏆 لوحة الشرف — أوائل الأسبوع</h2>
    <p class="muted" style="font-size:12.5px; margin-top:0;">النقاط بتتجمع من مشاهدة الدروس (10) ونجاح الكويزات (20)، وبتتصفر كل جمعة. الترتيب بين طلاب نفس الصف بس.</p>
    ${sections}
  </div>`;
}

/* متوسط تقييم درس بالنجوم وعدد المقيّمين — بيرجع null لو مفيش تقييمات لسه */
function tLessonRating(lid) {
  const rs = teacherRatings.filter((r) => r.lessonId === lid);
  if (!rs.length) return null;
  const avg = rs.reduce((s, r) => s + (r.stars || 0), 0) / rs.length;
  return { avg: Math.round(avg * 10) / 10, count: rs.length };
}
function tLessonRatingHtml(lid) {
  const r = tLessonRating(lid);
  return r ? `<div class="muted" style="font-size:12px; margin:4px 0;">⭐ ${r.avg} من 5 (${r.count} ${r.count === 1 ? "تقييم" : "تقييمات"})</div>` : "";
}

// متوسط درجات الطالب في الكويزات كنسبة مئوية
function studentQuizAvg(sid) {
  const att = teacherAttempts.filter((a) => a.studentId === sid && a.total > 0);
  if (!att.length) return null;
  return Math.round(att.reduce((sum, a) => sum + (a.score / a.total) * 100, 0) / att.length);
}

async function teacherLoadLessons() {
  // ترحيل لمرة واحدة: أي كويز قديم متخزن جوه درس بينقل لمجموعة quizzes مربوط بنفس الدرس،
  // ونتايج الطلبة القديمة بتفضل شغالة لأن الكويز الجديد بيحتفظ بـ lessonId الأصلي
  const legacy = await fbDb.collection("lessons").where("teacherId", "==", fbUser.uid).get();
  const withQuiz = legacy.docs.filter((d) => Array.isArray(d.data().quiz) && d.data().quiz.length);
  for (const d of withQuiz) {
    const l = d.data();
    await fbDb.collection("quizzes").add({
      teacherId: fbUser.uid,
      teacherName: l.teacherName || "",
      subject: l.subject || "",
      stage: l.stage || "",
      title: "كويز " + (l.title || "الدرس"),
      lessonId: d.id,
      questions: l.quiz,
      createdAt: l.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
    });
    await fbDb.collection("lessons").doc(d.id).update({ quiz: firebase.firestore.FieldValue.delete() });
  }
  const [ls, at, ex, qz, st] = await Promise.all([
    fbDb.collection("lessons").where("teacherId", "==", fbUser.uid).get(),
    fbDb.collection("quizAttempts").where("teacherId", "==", fbUser.uid).get(),
    fbDb.collection("exams").where("teacherId", "==", fbUser.uid).get(),
    fbDb.collection("quizzes").where("teacherId", "==", fbUser.uid).get(),
    fbDb.collection("students").where("teacherIds", "array-contains", fbUser.uid).get(),
  ]);
  teacherCache = st.docs.map((d) => ({ id: d.id, ...d.data() }));
  teacherLessons = ls.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));
  teacherAttempts = at.docs.map((d) => ({ id: d.id, ...d.data() }));
  teacherExams = ex.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));
  teacherQuizzes = qz.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));
}

// صورة الطالب الصغيرة في قوائم المدرس (أو أول حرف من اسمه لو مفيش صورة)
function tAvatarHtml(s) {
  const size = 30;
  if (s.avatar) return `<img src="${s.avatar}" alt="" style="width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; display:inline-block; vertical-align:middle; margin-left:6px; border:2px solid var(--primary-soft);">`;
  const nm = (s.name || "").trim();
  return `<span style="width:${size}px; height:${size}px; border-radius:50%; background:var(--primary); color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; vertical-align:middle; margin-left:6px;">${esc(nm ? nm[0] : "؟")}</span>`;
}

async function renderTeacherDash() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل طلابك...</div>`;
  try { await teacherLoad(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const pending = teacherCache.filter((s) => s.status === "pending");
  const approved = teacherCache.filter((s) => s.status === "approved");
  // إعلان المنصة + نشاط الأسبوع (لوحة الشرف) — فشلهم ميوقفش اللوحة
  let bcData = null, weekActs = [];
  try {
    const bcSnap = await fbDb.collection("broadcasts").doc("current").get();
    bcData = bcSnap.exists ? bcSnap.data() : null;
  } catch (_) {}
  try { await loadAboutSettings(); } catch (_) {} // تيذر «عن المهندس» في آخر اللوحة
  try {
    const ws = weekStartFriday();
    const actSnap = await fbDb.collection("activityLog").where("teacherId", "==", fbUser.uid).get();
    weekActs = actSnap.docs.map((d) => d.data()).filter((a) => { const t = a && a.ts && a.ts.toDate ? a.ts.toDate() : null; return t && t >= ws; });
  } catch (_) {}
  app.innerHTML = `
    <div class="hdr">
      <h1>أهلاً ${esc(fbProfile ? fbProfile.name : "بيك")} 👋</h1>
    </div>
    ${broadcastBannerHtml(bcData, "teacher")}
    ${(() => {
      // تنبيه قرب انتهاء الاشتراك (آخر 15 يوم) — التجديد بيتم من الأدمن
      const si = subInfo(fbProfile || {});
      if (si.status !== "expiring") return "";
      return `<div class="card tint-amber" style="border-right:4px solid var(--amber);">
        <b>⏳ اشتراكك قرب ينتهي</b>
        <div style="font-size:14px; margin-top:4px;">اشتراكك (${si.label}) بينتهي في <b class="ltr">${subFmtDate(si.end)}</b> — فاضل <b>${si.daysLeft} يوم</b>. جدّد مع الأدمن قبل الانتهاء عشان حسابك ومحتواك ميفصلش.</div>
      </div>`;
    })()}
    ${teacherTabs("students")}
    ${(fbProfile && (fbProfile.stages || []).length) ? `
    <div class="statcards">
      ${(fbProfile.stages).map((st) => {
        const icons = { "ابتدائي": "🎒", "إعدادي": "📗", "ثانوي": "🎓" };
        const names = { "ابتدائي": "الابتدائية", "إعدادي": "الإعدادية", "ثانوي": "الثانوية" };
        const count = approved.filter((s) => stageOfGrade(s.grade) === st).length;
        const gradeCounts = gradesOfStage(st).map((g) => {
          const c = approved.filter((s) => s.grade === g).length;
          return c ? `${g.replace("الصف ", "")}: ${c}` : "";
        }).filter(Boolean).join(" · ");
        return `<div class="statcard" data-glink="#/teacher/lessons/${encodeURIComponent(st)}" style="cursor:pointer;" title="اضغط لعرض دروس المرحلة"><div style="font-size:26px;">${icons[st] || "📚"}</div><div class="lbl">المرحلة ${names[st] || st}</div><div class="num" style="font-size:20px;">${count} طالب</div><div class="muted" style="font-size:12px;">${gradeCounts || "—"}</div></div>`;
      }).join("")}
    </div>` : ""}
    <div class="statcards">
      <div class="statcard"><div class="num">${approved.length}</div><div class="lbl">طلابك</div></div>
      <div class="statcard"><div class="num">${pending.length}</div><div class="lbl">طلبات جديدة</div></div>
    </div>
    ${honorBoardCard(approved, weekActs)}
    ${pending.length ? `
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">طلبات تسجيل جديدة (${pending.length})</h2>
      <table class="ttable resp">
        <thead><tr><th>الاسم</th><th>السنة</th><th>الموبايل</th><th>ولي الأمر</th><th>الإيميل</th><th>إجراءات</th></tr></thead>
        <tbody>
          ${pending.map((s) => `<tr>
            <td data-h="الاسم">${tAvatarHtml(s)}<a href="javascript:void(0)" data-spop="${s.id}" style="color:var(--primary-dark); font-weight:700;">${esc(s.name)}</a></td><td data-h="السنة">${esc(s.grade || "—")}</td><td class="ltr" data-h="الموبايل">${esc(s.phone)}</td><td class="ltr" data-h="ولي الأمر">${esc(s.parentPhone || "غير مسجل")}</td><td class="ltr" data-h="الإيميل">${esc(s.email)}</td>
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
      <div class="btnrow" style="justify-content:space-between; align-items:center;">
        <h2 style="font-size:18px; margin-top:0;">طلابك${dashGradeFilter ? " — " + esc(dashGradeFilter) : ""} (${dashGradeFilter ? approved.filter((s) => s.grade === dashGradeFilter).length : approved.length})</h2>
        <a class="btn sm ghost" href="#/teacher/transfer" title="صفحة منفصلة لنقل دفعة من طلابك لصف تاني">📦 نقل جماعي بين الصفوف</a>
      </div>
      ${((fbProfile && fbProfile.stages) || []).length ? `<div class="btnrow" style="margin-bottom:10px;">
        <button type="button" class="btn sm ${!dashGradeFilter ? "" : "ghost"}" data-dgf="">كل الصفوف</button>
        ${[...new Set(((fbProfile && fbProfile.stages) || []).flatMap((st) => gradesOfStage(st)))].map((g) => `<button type="button" class="btn sm ${dashGradeFilter === g ? "" : "ghost"}" data-dgf="${esc(g)}">${esc(g.replace("الصف ", ""))}</button>`).join("")}
      </div>` : ""}
      <table class="ttable resp">
        <thead><tr><th>الاسم</th><th>السنة</th><th>ولي الأمر</th><th>تقدمه</th><th>إجراءات</th></tr></thead>
        <tbody>
          ${approved.length ? approved.filter((s) => !dashGradeFilter || s.grade === dashGradeFilter).map((s) => {
            const avg = studentQuizAvg(s.id);
            const prog = avg !== null ? avg + "%" : ((s.progress && s.progress["programming-ai"] && s.progress["programming-ai"].percent) || 0) + "%";
            const sus = ((s.suspendedBy || []).indexOf(fbUser.uid) !== -1);
            return `<tr>
              <td data-h="الاسم">${tAvatarHtml(s)}<a href="javascript:void(0)" data-spop="${s.id}" style="color:var(--primary-dark); font-weight:700;">${esc(s.name)}</a>${sus ? ` <span class="chip red">⛔ موقوف عن محتواك</span>` : ""}</td><td data-h="السنة">${esc(s.grade || "—")}</td><td class="ltr" data-h="ولي الأمر">${esc(s.parentPhone || "غير مسجل")}</td><td data-h="تقدمه">${prog}</td>
              <td>
                <div class="btnrow">
                  <a class="btn sm green" target="_blank" href="${waLink(s.phone, "أهلاً " + s.name + "، معاك مدرسك من منصة الدروس.")}">واتساب</a>
                  <button type="button" class="btn sm ghost" data-snotes="${s.id}">📝 ملاحظات</button>
                  <button type="button" class="btn sm ghost" data-rs="${s.id}">إعادة ضبط الباسورد</button>
                  ${sus ? `<button type="button" class="btn sm" data-us="${s.id}">▶️ إلغاء الإيقاف</button>` : `<button type="button" class="btn sm ghost" data-ss="${s.id}">⛔ إيقاف مؤقت</button>`}
                  <button type="button" class="btn sm red" data-dl="${s.id}">حذف نهائي</button>
                </div>
              </td>
            </tr>`;
          }).join("") : `<tr><td colspan="5" class="center muted">لسه مفيش طلاب مقبولين</td></tr>`}
        </tbody>
      </table>
    </div>
    ${aboutTeaserHtml()}
    ${closing()}`;
  bindTeacherTabs();
  bindAboutTeaser();
  document.querySelectorAll("[data-glink]").forEach((el) => el.onclick = () => location.hash = el.dataset.glink);
  document.querySelectorAll("[data-ok]").forEach((b) => b.onclick = () => teacherSetStatus(b.dataset.ok, "approved"));
  document.querySelectorAll("[data-no]").forEach((b) => b.onclick = () => teacherSetStatus(b.dataset.no, "rejected"));
  document.querySelectorAll("[data-rs]").forEach((b) => b.onclick = () => teacherResetStudent(b.dataset.rs));
  document.querySelectorAll("[data-dl]").forEach((b) => b.onclick = () => teacherDeleteStudent(b.dataset.dl));
  document.querySelectorAll("[data-ss]").forEach((b) => b.onclick = () => teacherSuspendToggle(b.dataset.ss, true));
  document.querySelectorAll("[data-us]").forEach((b) => b.onclick = () => teacherSuspendToggle(b.dataset.us, false));
  document.querySelectorAll("[data-spop]").forEach((b) => b.onclick = () => teacherShowStudent(b.dataset.spop));
  document.querySelectorAll("[data-snotes]").forEach((b) => b.onclick = () => openStudentNotes(b.dataset.snotes));
  document.querySelectorAll("[data-dgf]").forEach((b) => b.onclick = () => { dashGradeFilter = b.dataset.dgf; renderTeacherDash(); });
  window.scrollTo(0, 0);
}

// بوب-أب تفاصيل الطالب: بياناته + سجل كويزاته وامتحاناته + واتساب للطالب وولي أمره + تعديل رقم ولي الأمر
function teacherShowStudent(id) {
  const s = teacherCache.find((x) => x.id === id);
  if (!s) return;
  const attempts = teacherAttempts.filter((a) => a.studentId === id)
    .sort((a, b) => (b.updatedAt && a.updatedAt ? b.updatedAt.seconds - a.updatedAt.seconds : 0));
  const avg = studentQuizAvg(id);
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `<div class="detailcard" style="max-height:85vh; overflow-y:auto;">
    <h3>${esc(s.name)}</h3>
    <div class="drow"><span class="dl">الإيميل</span><span class="dv ltr">${esc(s.email || "—")}</span></div>
    <div class="drow"><span class="dl">الموبايل (واتساب)</span><span class="dv ltr">${esc(s.phone || "—")}</span></div>
    <div class="drow"><span class="dl">موبايل ولي الأمر</span><span class="dv ltr">${esc(s.parentPhone || "غير مسجل")}</span></div>
    <div class="drow"><span class="dl">السنة الدراسية</span><span class="dv">${esc(s.grade || "—")}</span></div>
    <div class="drow"><span class="dl">المرحلة</span><span class="dv">${esc(stageOfGrade(s.grade) || "—")}</span></div>
    <div class="drow"><span class="dl">الحالة</span><span class="dv">${s.status === "approved" ? "مقبول" : s.status === "rejected" ? "مرفوض" : "تحت المراجعة"}</span></div>
    <div class="drow"><span class="dl">حساب الدخول</span><span class="dv">${s.authLinked ? "اتعمل" : "لسه مدخلش"}</span></div>
    <div class="drow"><span class="dl">تاريخ التسجيل</span><span class="dv">${fmtTs(s.createdAt)}</span></div>
    <div class="drow"><span class="dl">متوسط الدرجات</span><span class="dv">${avg !== null ? avg + "%" : "—"}</span></div>
    <div class="btnrow" style="justify-content:center; margin-top:12px;">
      ${s.phone ? `<a class="btn sm green" target="_blank" href="${waLink(s.phone, "أهلاً " + s.name + "، معاك مدرسك من منصة الدروس.")}">واتساب الطالب</a>` : ""}
      ${s.parentPhone ? `<a class="btn sm green" target="_blank" href="${waLink(s.parentPhone, "أهلاً بحضرتك، معاك مدرس " + s.name + " من منصة الدروس.")}">واتساب ولي الأمر</a>` : ""}
    </div>
    <div style="margin-top:14px; border-top:1px solid var(--border); padding-top:10px;">
      <b style="font-size:14px;">تعديل رقم ولي الأمر</b>
      <div class="btnrow" style="margin-top:6px;">
        <input id="pp-edit" type="tel" class="inp ltr" style="flex:1;" placeholder="01xxxxxxxxx" value="${esc(s.parentPhone || "")}">
        <button type="button" class="btn sm" id="pp-save">حفظ</button>
      </div>
      <p class="msg" id="pp-msg" style="margin:4px 0 0;"></p>
    </div>
    <div style="margin-top:14px; border-top:1px solid var(--border); padding-top:10px;">
      <b style="font-size:14px;">تصحيح الصف الدراسي</b>
      <div class="btnrow" style="margin-top:6px;">
        <select id="gr-edit" class="inp" style="flex:1;">${GRADES.map((g) => `<option ${s.grade === g ? "selected" : ""}>${g}</option>`).join("")}</select>
        <button type="button" class="btn sm" id="gr-save">حفظ</button>
      </div>
      <p class="msg" id="gr-msg" style="margin:4px 0 0;"></p>
    </div>
    <div style="margin-top:14px; border-top:1px solid var(--border); padding-top:10px;">
      <b style="font-size:14px;">سجل الكويزات والامتحانات (${attempts.length})</b>
      ${attempts.length ? `<table class="ttable" style="margin-top:8px;">
        <thead><tr><th>الاختبار</th><th>النوع</th><th>الدرجة</th><th>النسبة</th><th>آخر محاولة</th></tr></thead>
        <tbody>${attempts.map((a) => {
          const kind = a.examId ? "امتحان" : "كويز";
          const name = a.examId
            ? ((teacherExams.find((e) => e.id === a.examId) || {}).title || "امتحان محذوف")
            : a.quizId
            ? ((teacherQuizzes.find((q) => q.id === a.quizId) || {}).title || "كويز محذوف")
            : ((teacherLessons.find((l) => l.id === a.lessonId) || {}).title || "كويز درس محذوف");
          const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) + "%" : "—";
          return `<tr><td>${esc(name)}</td><td>${kind}</td><td>${a.score} من ${a.total}</td><td>${pct}</td><td>${a.updatedAt ? fmtTs(a.updatedAt) : "—"}</td></tr>`;
        }).join("")}</tbody></table>` : `<p class="muted" style="font-size:13px; margin:6px 0 0;">لسه ما حلش أي اختبار.</p>`}
    </div>
    <div class="btnrow" style="justify-content:center; margin-top:14px;"><button type="button" class="btn ghost" id="ov-close">إغلاق</button></div>
  </div>`;
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  ov.querySelector("#ov-close").onclick = () => ov.remove();
  ov.querySelector("#gr-save").onclick = async () => {
    const v = ov.querySelector("#gr-edit").value;
    const m = ov.querySelector("#gr-msg");
    try {
      await fbDb.collection("students").doc(id).update({ grade: v });
      s.grade = v;
      m.className = "msg good"; m.textContent = "اتحفظ الصف الجديد ✅";
    } catch (e) { m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
  };
  ov.querySelector("#pp-save").onclick = async () => {
    const v = normalizeEgPhone(ov.querySelector("#pp-edit").value);
    const m = ov.querySelector("#pp-msg");
    if (!v) { m.className = "msg bad"; m.textContent = "اكتب رقم مصري صح (11 رقم يبدأ بـ 01)."; return; }
    try {
      await fbDb.collection("students").doc(id).update({ parentPhone: v });
      s.parentPhone = v;
      m.className = "msg good"; m.textContent = "اتحفظ الرقم ✅";
      setTimeout(() => { ov.remove(); renderTeacherDash(); }, 900);
    } catch (e) { m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e); }
  };
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

/* إيقاف طالب مؤقتًا عن محتوى المدرس ده بس (من غير ما يتأثر باقي مدرسيه): بنضيف/نشيل uid المدرس في suspendedBy */
async function teacherSuspendToggle(id, suspend) {
  const s = teacherCache.find((x) => x.id === id);
  if (!s) return;
  try {
    await fbDb.collection("students").doc(id).update({
      suspendedBy: suspend
        ? firebase.firestore.FieldValue.arrayUnion(fbUser.uid)
        : firebase.firestore.FieldValue.arrayRemove(fbUser.uid),
    });
    showToast(suspend ? `اتوقف ${s.name} عن محتواك مؤقتًا ⛔` : `رجع وصول ${s.name} لمحتواك ✅`, "good");
    await teacherLoad();
    renderTeacherDash();
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

/* حذف نهائي: مودال تأكيد بيوضح إن المحاولات والتقييمات والبيانات كلها هتتمسح */
function teacherDeleteStudent(id) {
  const s = teacherCache.find((x) => x.id === id);
  if (!s) return;
  confirmDeleteStudent(s, async () => { await teacherLoad(); renderTeacherDash(); });
}

/* صفحة النقل الجماعي للمدرس — طلابه المقبولين بس */
async function renderTeacherTransfer() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  if (!teacherCache) {
    app.innerHTML = `<div class="spin">بنحمل طلابك...</div>`;
    try { await teacherLoad(); }
    catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  }
  renderTransferPage({
    students: teacherCache || [],
    wrap: (content) => { app.innerHTML = teacherTabs("students") + content + closing(); bindTeacherTabs(); },
    backHash: "#/teacher",
    onDone: async () => { await teacherLoad(); renderTeacherTransfer(); },
  });
}

/* ---------- الدروس والكويزات ---------- */
let teacherLessons = [];
let teacherAttempts = [];
let teacherRatings = []; // تقييمات الطلبة لدروسي بالنجوم (متوسطات بس، من غير أسماء)
let teacherExams = [];
let teacherQuizzes = [];
let lessonForm = null; // {id, unit, lessonNum, title, desc, videoUrl, pdfUrl}
let examForm = null; // {id, title, desc, openAt, closeAt, closed, quiz:[question]}
let quizForm = null; // {id, title, lessonId, quiz:[question]}
let lessonFormOpen = false;
let examFormOpen = false;
let quizFormOpen = false;
let lessonsInnerTab = "lessons"; // lessons | quizexams
let quizResultsOpenFor = null;
let examResultsOpenFor = null;
let lessonsGradeFilter = ""; // فلتر الصف في قوائم المحتوى
let dashGradeFilter = "";    // فلتر الصف في تاب طلابي

function emptyExamForm() {
  return { id: null, title: "", desc: "", openAt: "", closeAt: "", closed: false, quiz: [], grade: "", term: termCurrent() };
}

function emptyLessonForm() {
  return { id: null, unit: "", lessonNum: "", title: "", desc: "", videoUrl: "", pdfUrl: "", publishAt: "", grade: "", term: termCurrent() };
}

function emptyQuizForm() {
  return { id: null, title: "", lessonId: "", quiz: [], grade: "", oneAttempt: false, term: termCurrent() };
}

/* تاب الترم الحالي في قوائم محتوى المدرس — الافتراضي الترم الحالي اللي الأدمن محدده */
var tTermTab = null;
function tTerm() {
  if (tTermTab !== 1 && tTermTab !== 2) tTermTab = termCurrent();
  return tTermTab;
}

/* اختيار الترم في فورم المحتوى: بيتقفل لو بتعدل محتوى ترم قديم (للقراءة بس) */
function termPickerHtml(form) {
  const ro = form.id && !termWritable(form);
  return `<div style="margin-bottom:10px;">
    <label style="font-size:13.5px; font-weight:700;">الترم</label>
    ${ro ? `<div class="card card-sub" style="margin:6px 0; font-size:13px;">🔒 ده محتوى ${termName(termOf(form))} المنتهي — للقراءة بس، مش هتقدر تحفظ تعديلات عليه.</div>` : ""}
    <div class="btnrow" style="margin-top:6px;">
      ${[1, 2].map((t) => `<button type="button" class="btn sm ${termOf(form) === t ? "" : "ghost"}" data-tterm="${t}" ${ro ? "disabled" : ""}>${t === 1 ? "📘 الترم الأول" : "📗 الترم الثاني"}${t === termCurrent() ? " (الحالي)" : ""}</button>`).join("")}
    </div>
  </div>`;
}
function bindTermPicker(form, rerender) {
  document.querySelectorAll("[data-tterm]").forEach((b) => b.onclick = () => {
    if (b.disabled) return;
    form.term = Number(b.dataset.tterm);
    rerender();
  });
}

function lsMsg(t, good) {
  const m = document.getElementById("ls-msg");
  if (m) { m.className = "msg " + (good ? "good" : "bad"); m.textContent = t; }
  if (t) showToast(t, good ? "good" : "bad");
}

const QTYPES = [["mcq", "اختيار من متعدد"], ["multi", "اختيار متعدد (أكتر من إجابة)"], ["tf", "صح أو غلط"], ["text", "إجابة قصيرة"], ["fill", "أكمل الفراغ"], ["match", "توصيل"], ["num", "إجابة رقمية"]];

function qNew(type, q) {
  q = q || "";
  if (type === "mcq") return { type, q, options: ["", "", "", ""], correct: 0 };
  if (type === "multi") return { type, q, options: ["", "", "", ""], correct: [] };
  if (type === "tf") return { type, q, correct: 0 };
  if (type === "match") return { type, q, pairs: [{ a: "", b: "" }, { a: "", b: "" }] };
  if (type === "num") return { type, q, answer: "", tolerance: "" };
  return { type, q, answer: "" }; // text / fill
}

// تحقق من سؤال قبل الحفظ — بيرجع رسالة الخطأ أو null
function qValidate(q, i) {
  if (!String(q.q || "").trim()) return `سؤال ${i + 1}: اكتب نص السؤال.`;
  if (q.type === "mcq" && (q.options || []).some((o) => !String(o).trim())) return `سؤال ${i + 1}: كمّل الاختيارات الأربعة.`;
  if (q.type === "multi") {
    if ((q.options || []).some((o) => !String(o).trim())) return `سؤال ${i + 1}: كمّل الاختيارات الأربعة.`;
    if (!Array.isArray(q.correct) || !q.correct.length) return `سؤال ${i + 1}: علّم على إجابة صحيحة واحدة على الأقل.`;
  }
  if ((q.type === "text" || q.type === "fill") && !String(q.answer || "").trim()) return `سؤال ${i + 1}: اكتب الإجابة الصحيحة.`;
  if (q.type === "match") {
    if (!Array.isArray(q.pairs) || q.pairs.length < 2) return `سؤال ${i + 1}: التوصيل يحتاج زوجين على الأقل.`;
    if (q.pairs.some((pr) => !String(pr.a || "").trim() || !String(pr.b || "").trim())) return `سؤال ${i + 1}: كمّل كل أزواج التوصيل.`;
  }
  if (q.type === "num") {
    if (String(q.answer).trim() === "" || isNaN(Number(q.answer))) return `سؤال ${i + 1}: اكتب الإجابة رقم صحيح.`;
    if (String(q.tolerance).trim() !== "" && (isNaN(Number(q.tolerance)) || Number(q.tolerance) < 0)) return `سؤال ${i + 1}: هامش الخطأ لازم يكون رقم صفر أو أكتر.`;
  }
  return null;
}

// تصغير صورة سؤال قبل الحفظ: بحد أقصى 800px وجودة مناسبة، ورفض لو عدّت 400KB
// (صور الأسئلة بتتخزن جوه مستند الكويز نفسه، ولازم المستند كله يفضل أقل من 1MB)
function resizeQuestionImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 800;
      let w = img.width, h = img.height;
      if (w > h) { if (w > max) { h = Math.round(h * max / w); w = max; } }
      else { if (h > max) { w = Math.round(w * max / h); h = max; } }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      const d = c.toDataURL("image/jpeg", 0.8);
      URL.revokeObjectURL(img.src);
      if (d.length > 400000) return reject(new Error("الصورة كبيرة حتى بعد التصغير — جرّب صورة أبسط أو أصغر."));
      resolve(d);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error("الملف ده مش صورة.")); };
    img.src = URL.createObjectURL(file);
  });
}

// تجهيز السؤال للحفظ في قاعدة البيانات
function qSerialize(q) {
  const base = { type: q.type, q: String(q.q || "").trim() };
  if (q.img) base.img = q.img; // صورة السؤال (اختيارية) — بتتخزن مضغوطة جوه المستند
  if (q.type === "mcq") return { ...base, options: q.options.map((o) => String(o).trim()), correct: q.correct ?? 0 };
  if (q.type === "multi") return { ...base, options: q.options.map((o) => String(o).trim()), correct: Array.from(new Set(q.correct)).sort((a, b) => a - b) };
  if (q.type === "tf") return { ...base, options: ["صح", "غلط"], correct: q.correct ?? 0 };
  if (q.type === "match") return { ...base, pairs: q.pairs.map((pr) => ({ a: String(pr.a).trim(), b: String(pr.b).trim() })) };
  if (q.type === "num") return { ...base, answer: Number(q.answer), tolerance: Number(q.tolerance) || 0 };
  return { ...base, answer: String(q.answer || "").trim() }; // text / fill
}

// قراءة سؤال محفوظ لفورم التعديل
function qFromStored(q) {
  const t = q.type || "mcq";
  const n = qNew(t, q.q || "");
  if (t === "mcq" || t === "multi") n.options = (q.options || ["", "", "", ""]).slice(0, 4);
  if (t === "mcq" || t === "tf") n.correct = q.correct ?? 0;
  if (t === "multi") n.correct = Array.isArray(q.correct) ? q.correct.slice() : [];
  if (t === "text" || t === "fill") n.answer = q.answer || "";
  if (t === "match") n.pairs = (q.pairs || [{ a: "", b: "" }, { a: "", b: "" }]).map((pr) => ({ a: pr.a || "", b: pr.b || "" }));
  if (t === "num") { n.answer = q.answer ?? ""; n.tolerance = q.tolerance || ""; }
  n.img = q.img || ""; // صورة السؤال لو موجودة
  return n;
}

const STAGE_NAMES = { "ابتدائي": "الابتدائية", "إعدادي": "الإعدادية", "ثانوي": "الثانوية" };
const STAGE_ICONS = { "ابتدائي": "🎒", "إعدادي": "📗", "ثانوي": "🎓" };

// شارة صف المحتوى: فاضي = كل صفوف المرحلة
function gradeChip(g) {
  return g ? `<span class="chip">${esc(g)}</span>` : `<span class="chip green">كل الصفوف</span>`;
}

// سيلكت الصف لفورمات المحتوى: "كل صفوف المرحلة" (الافتراضي) أو صف معين
function gradeSelectHtml(id, stage, val) {
  return `<select id="${id}" class="inp"><option value="">كل صفوف المرحلة ${esc(STAGE_NAMES[stage] || stage || "")}</option>${gradesOfStage(stage).map((g) => `<option value="${esc(g)}" ${val === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select>`;
}

// أزرار فلتر الصفوف فوق القوائم
function gradeFilterRowHtml(attr, stage, current) {
  return `<div class="btnrow" style="margin-bottom:10px;">
    <button type="button" class="btn sm ${!current ? "" : "ghost"}" data-${attr}="">كل الصفوف</button>
    ${gradesOfStage(stage).map((g) => `<button type="button" class="btn sm ${current === g ? "" : "ghost"}" data-${attr}="${esc(g)}">${esc(g.replace("الصف ", ""))}</button>`).join("")}
  </div>`;
}

function quizBuilderHtml(p, qs) {
  if (!qs.length) {
    return `<p class="muted" style="font-size:13px;">مفيش أسئلة لسه — دوس "+ إضافة سؤال" تحت عشان تضيف أول سؤال. تقدر تضيف أي عدد أسئلة وبأنواع مختلفة، والتصحيح آلي لكل الأنواع.</p>`;
  }
  return qs.map((q, i) => {
    let body = "";
    if (q.type === "tf") {
      body = ["صح", "غلط"].map((o, oi) => `
        <label style="display:flex; align-items:center; gap:8px; margin-top:6px; cursor:pointer;">
          <input type="radio" name="${p}z-c-${i}" ${q.correct === oi ? "checked" : ""} data-${p}qc="${i}-${oi}"> ${o}
        </label>`).join("")
        + `<p class="muted" style="font-size:12px; margin:6px 0 0;">علّم على الإجابة الصحيحة.</p>`;
    } else if (q.type === "text" || q.type === "fill") {
      body = `<input type="text" class="inp" placeholder="${q.type === "fill" ? "الإجابات المقبولة — افصل بين الصيغ بـ /" : "الإجابة الصحيحة"}" data-${p}qa="${i}" value="${esc(q.answer || "")}">
        <p class="muted" style="font-size:12px; margin:6px 0 0;">التصحيح آلي بمطابقة الإجابة — بيتجاهل الهمزات والمسافات الزيادة.${q.type === "fill" ? " تقدر تكتب أكتر من صيغة مقبولة مفصولة بشرطة مائلة /" : ""}</p>`;
    } else if (q.type === "match") {
      body = (q.pairs || []).map((pr, j) => `
        <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
          <input type="text" class="inp" placeholder="العنصر" data-${p}qpa="${i}-${j}" value="${esc(pr.a || "")}">
          <span class="muted">↔</span>
          <input type="text" class="inp" placeholder="ما يناسبه" data-${p}qpb="${i}-${j}" value="${esc(pr.b || "")}">
          ${(q.pairs || []).length > 2 ? `<button type="button" class="btn sm red" data-${p}qpd="${i}-${j}">×</button>` : ""}
        </div>`).join("")
        + `<div class="btnrow" style="margin-top:8px;"><button type="button" class="btn sm ghost" data-${p}qadd="${i}">+ زوج توصيل</button></div>
        <p class="muted" style="font-size:12px; margin:6px 0 0;">الطالب هيشوف العمودين مخلوطين ويوصّلهم. الدرجة الكاملة لو كل التوصيلات صح.</p>`;
    } else if (q.type === "num") {
      body = `<div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
          <input type="number" step="any" class="inp ltr" placeholder="الإجابة الصحيحة (رقم)" data-${p}qan="${i}" value="${esc(String(q.answer ?? ""))}">
          <input type="number" step="any" min="0" class="inp ltr" placeholder="هامش الخطأ ± (اختياري)" data-${p}qto="${i}" value="${esc(String(q.tolerance ?? ""))}">
        </div>
        <p class="muted" style="font-size:12px; margin:6px 0 0;">التصحيح آلي بالمقارنة الرقمية. هامش الخطأ بيسمح بإجابات تقريبية (مثال: 3.14 ± 0.01).</p>`;
    } else if (q.type === "multi") {
      body = [0, 1, 2, 3].map((o) => `
        <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
          <input type="checkbox" ${Array.isArray(q.correct) && q.correct.includes(o) ? "checked" : ""} data-${p}qcm="${i}-${o}" title="دي إجابة صحيحة">
          <input type="text" class="inp" placeholder="الاختيار ${o + 1}" data-${p}qo="${i}-${o}" value="${esc((q.options || [])[o] || "")}">
        </div>`).join("")
        + `<p class="muted" style="font-size:12px; margin:6px 0 0;">علّم على كل الإجابات الصحيحة (واحدة على الأقل). الدرجة الكاملة لو الطالب اختار نفس المجموعة بالظبط.</p>`;
    } else {
      body = [0, 1, 2, 3].map((o) => `
        <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
          <input type="radio" name="${p}z-c-${i}" ${q.correct === o ? "checked" : ""} data-${p}qc="${i}-${o}" title="دي الإجابة الصحيحة">
          <input type="text" class="inp" placeholder="الاختيار ${o + 1}" data-${p}qo="${i}-${o}" value="${esc((q.options || [])[o] || "")}">
        </div>`).join("")
        + `<p class="muted" style="font-size:12px; margin:6px 0 0;">علّم على الدائرة جنب الإجابة الصحيحة.</p>`;
    }
    return `
    <div class="card" style="background:var(--bg); padding:14px; margin-bottom:10px;">
      <div class="btnrow" style="justify-content:space-between; margin-bottom:8px;">
        <b style="font-size:14.5px;">سؤال ${i + 1}</b>
        <button type="button" class="btn sm red" data-${p}qdel="${i}">حذف السؤال</button>
      </div>
      <select class="inp" data-${p}qtype="${i}" style="margin-bottom:8px;">
        ${QTYPES.map(([v, lbl]) => `<option value="${v}" ${q.type === v ? "selected" : ""}>${lbl}</option>`).join("")}
      </select>
      <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--muted); margin-bottom:8px; cursor:pointer;">
        <input type="checkbox" data-${p}qbank="${i}" ${q.saveToBank ? "checked" : ""}> احفظ السؤال ده في بنك الأسئلة
      </label>
      <input type="text" class="inp" placeholder="نص السؤال" data-${p}qt="${i}" value="${esc(q.q)}">
      <div class="btnrow" style="align-items:center; margin-top:8px;">
        ${q.img ? `<img src="${q.img}" alt="صورة السؤال" style="max-width:110px; max-height:80px; border-radius:10px; border:1px solid var(--line);">` : ""}
        <button type="button" class="btn sm ghost" data-${p}qimg="${i}">🖼️ ${q.img ? "تغيير الصورة" : "إضافة صورة للسؤال"}</button>
        ${q.img ? `<button type="button" class="btn sm red" data-${p}qimgd="${i}">حذف الصورة</button>` : ""}
        <input type="file" accept="image/*" style="display:none;" data-${p}qimgf="${i}">
      </div>
      ${q.img ? "" : `<p class="muted" style="font-size:12px; margin:6px 0 0;">تقدر تضيف صورة للسؤال (رسم هندسي، شكل خلية...) — بتتصغّر لوحدها قبل الحفظ.</p>`}
      ${body}
    </div>`;
  }).join("");
}

function bindQuizEditor(p, qs, rerender) {
  document.querySelectorAll(`[data-${p}qdel]`).forEach((b) => b.onclick = () => { qs.splice(Number(b.dataset[p + "qdel"]), 1); rerender(); });
  document.querySelectorAll(`[data-${p}qtype]`).forEach((el) => el.onchange = () => {
    const i = Number(el.dataset[p + "qtype"]);
    const keepImg = qs[i].img; // صورة السؤال تفضل موجودة عند تغيير نوعه
    qs[i] = qNew(el.value, qs[i].q);
    qs[i].img = keepImg || "";
    rerender();
  });
  document.querySelectorAll(`[data-${p}qt]`).forEach((el) => el.oninput = () => qs[Number(el.dataset[p + "qt"])].q = el.value);
  document.querySelectorAll(`[data-${p}qa]`).forEach((el) => el.oninput = () => qs[Number(el.dataset[p + "qa"])].answer = el.value);
  document.querySelectorAll(`[data-${p}qo]`).forEach((el) => {
    const [i, o] = el.dataset[p + "qo"].split("-").map(Number);
    el.oninput = () => qs[i].options[o] = el.value;
  });
  document.querySelectorAll(`[data-${p}qc]`).forEach((el) => {
    const [i, o] = el.dataset[p + "qc"].split("-").map(Number);
    el.onchange = () => qs[i].correct = o;
  });
  document.querySelectorAll(`[data-${p}qcm]`).forEach((el) => {
    const [i, o] = el.dataset[p + "qcm"].split("-").map(Number);
    el.onchange = () => {
      const arr = Array.isArray(qs[i].correct) ? qs[i].correct : [];
      qs[i].correct = el.checked ? arr.concat(o) : arr.filter((x) => x !== o);
    };
  });
  document.querySelectorAll(`[data-${p}qan]`).forEach((el) => el.oninput = () => qs[Number(el.dataset[p + "qan"])].answer = el.value);
  document.querySelectorAll(`[data-${p}qto]`).forEach((el) => el.oninput = () => qs[Number(el.dataset[p + "qto"])].tolerance = el.value);
  document.querySelectorAll(`[data-${p}qpa]`).forEach((el) => {
    const [i, j] = el.dataset[p + "qpa"].split("-").map(Number);
    el.oninput = () => qs[i].pairs[j].a = el.value;
  });
  document.querySelectorAll(`[data-${p}qpb]`).forEach((el) => {
    const [i, j] = el.dataset[p + "qpb"].split("-").map(Number);
    el.oninput = () => qs[i].pairs[j].b = el.value;
  });
  document.querySelectorAll(`[data-${p}qadd]`).forEach((b) => b.onclick = () => { qs[Number(b.dataset[p + "qadd"])].pairs.push({ a: "", b: "" }); rerender(); });
  document.querySelectorAll(`[data-${p}qbank]`).forEach((el) => el.onchange = () => qs[Number(el.dataset[p + "qbank"])].saveToBank = el.checked);
  document.querySelectorAll(`[data-${p}qimg]`).forEach((b) => b.onclick = () => {
    const f = document.querySelector(`[data-${p}qimgf="${b.dataset[p + "qimg"]}"]`);
    if (f) f.click();
  });
  document.querySelectorAll(`[data-${p}qimgf]`).forEach((el) => el.onchange = async () => {
    const i = Number(el.dataset[p + "qimgf"]);
    const file = el.files && el.files[0];
    if (!file) return;
    try { qs[i].img = await resizeQuestionImage(file); rerender(); }
    catch (err) { alert(err.message || "مشكلة في الصورة."); }
  });
  document.querySelectorAll(`[data-${p}qimgd]`).forEach((b) => b.onclick = () => { qs[Number(b.dataset[p + "qimgd"])].img = ""; rerender(); });
  document.querySelectorAll(`[data-${p}qpd]`).forEach((b) => b.onclick = () => {
    const [i, j] = b.dataset[p + "qpd"].split("-").map(Number);
    qs[i].pairs.splice(j, 1); rerender();
  });
}

async function renderTeacherLessons(stageArg) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل دروسك...</div>`;
  try { await teacherLoadLessons(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  if (!lessonForm) lessonForm = emptyLessonForm();
  if (!examForm) examForm = emptyExamForm();
  if (!quizForm) quizForm = emptyQuizForm();
  const subject = (fbProfile && fbProfile.subject) || "";
  const myStages = (fbProfile && fbProfile.stages) || [];
  let stage = stageArg || null;
  if (!stage && myStages.length === 1) stage = myStages[0];

  // اختيار المرحلة: لو المدرس مسجل في أكتر من مرحلة ومش مختر واحدة
  if (myStages.length && !stage) {
    app.innerHTML = `
      <div class="hdr">
        <h1>الدروس والكويزات 📚</h1>
        </div>
      ${teacherTabs("lessons")}
      <div class="card">
        <h2 style="font-size:18px; margin-top:0;">اختار المرحلة الأول</h2>
        <div class="statcards">
          ${myStages.map((st) => {
            const lc = teacherLessons.filter((l) => l.stage === st).length;
            const qc = teacherQuizzes.filter((q) => q.stage === st).length;
            const ec = teacherExams.filter((e) => e.stage === st).length;
            return `<div class="statcard" data-gstage="${esc(st)}" style="cursor:pointer;">
              <div style="font-size:26px;">${STAGE_ICONS[st] || "📚"}</div>
              <div class="lbl">المرحلة ${STAGE_NAMES[st] || st}</div>
              <div class="num" style="font-size:20px;">${lc} درس</div>
              <div class="muted" style="font-size:12.5px;">${qc} كويز · ${ec} امتحان</div>
            </div>`;
          }).join("")}
        </div>
        <p class="muted" style="font-size:12.5px; margin-top:10px;">كل مرحلة جواها تابين: الدروس لوحدهم، والكويزات والامتحانات مع بعض — وزرار إضافة كبير لكل نوع.</p>
      </div>
      ${closing()}`;
    bindTeacherTabs();
    document.querySelectorAll("[data-gstage]").forEach((el) => el.onclick = () => {
      lessonsInnerTab = "lessons";
      location.hash = "#/teacher/lessons/" + encodeURIComponent(el.dataset.gstage);
    });
    window.scrollTo(0, 0);
    return;
  }

  // الفورم المفتوح ليه أولوية على العرض
  if (lessonFormOpen) return renderLessonFormPage(stage, subject);
  if (quizFormOpen) return renderQuizFormPage(stage, subject);
  if (examFormOpen) return renderExamFormPage(stage);
  return renderStageLists(stage, myStages);
}

function bigAddBtn(id, txt) {
  return `<button type="button" id="${id}" style="width:100%; border:2px dashed var(--line); background:var(--card); padding:20px; font-family:inherit; font-size:17px; font-weight:800; color:var(--primary-dark); border-radius:14px; cursor:pointer;">${txt}</button>`;
}

function innerTabsHtml(stage) {
  const ln = teacherLessons.filter((l) => !stage || l.stage === stage).length;
  const qn = teacherQuizzes.filter((q) => !stage || q.stage === stage).length
    + teacherExams.filter((e) => !stage || e.stage === stage).length;
  return `<div class="tabs" style="margin-bottom:12px;">
    <button type="button" class="tab ${lessonsInnerTab === "lessons" ? "active" : ""}" id="it-lessons">الدروس (${ln})</button>
    <button type="button" class="tab ${lessonsInnerTab === "quizexams" ? "active" : ""}" id="it-quizexams">الكويزات والامتحانات (${qn})</button>
  </div>`;
}

// محاولات الكويز: المحاولات الجديدة بـ quizId + القديمة بـ lessonId لو الكويز مرتبط بدرس
function quizAttemptsFor(q) {
  return teacherAttempts.filter((a) => a.quizId === q.id || (q.lessonId && a.lessonId === q.lessonId));
}

function renderStageLists(stage, myStages) {
  // فلتر الصف: "الصف الأول" بيوري محتوى الصف ده + محتوى "كل الصفوف"
  const gf = (items) => lessonsGradeFilter ? items.filter((x) => !x.grade || x.grade === lessonsGradeFilter) : items;
  // فلتر الترم: كل تاب بيوري محتوى ترمه بس
  const tf = (items) => items.filter((x) => termOf(x) === tTerm());
  const list = tf(gf(stage ? teacherLessons.filter((l) => l.stage === stage) : teacherLessons))
    .slice().sort((a, b) => (a.unit || 0) - (b.unit || 0) || (a.lessonNum || 0) - (b.lessonNum || 0));
  const quizList = tf(gf(stage ? teacherQuizzes.filter((q) => q.stage === stage) : teacherQuizzes))
    .slice().sort((a, b) => (a.title || "").localeCompare(b.title || "", "ar"));
  const examList = tf(gf(stage ? teacherExams.filter((e) => e.stage === stage) : teacherExams));
  const gradeRow = stage ? gradeFilterRowHtml("gf", stage, lessonsGradeFilter) : "";
  let content = "";

  if (lessonsInnerTab === "lessons") {
    content = `
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">دروسك — المرحلة ${esc(STAGE_NAMES[stage] || stage || "")}${lessonsGradeFilter ? " — " + esc(lessonsGradeFilter) : ""} (${list.length})</h2>
      ${gradeRow}
      ${tTerm() === termCurrent() ? bigAddBtn("ls-addbig", "＋ إضافة درس جديد") : `<p class="muted" style="font-size:13px;">🔒 ${termName(tTerm())} منتهي — محتواه للقراءة بس. إضافة محتوى جديد بتكون على ${termName(termCurrent())} من تابه فوق.</p>`}
      ${list.length ? `<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-top:12px;">
        ${list.map((l) => `
          <div class="card" style="margin:0;">
              <div style="font-size:12px; color:var(--primary-dark); font-weight:700;">الوحدة ${l.unit || "—"} · الدرس ${l.lessonNum || "—"}</div>
              <div style="margin:2px 0;">${gradeChip(l.grade)}</div>
              <div class="btnrow" style="justify-content:space-between;"><b style="font-size:15px;">${esc(l.title)}</b>${termRoChip(l)}${l.pinned ? `<span class="chip">📌 مثبت</span>` : ""}${l.publishAt && l.publishAt.toDate && l.publishAt.toDate() > new Date() ? `<span class="chip amber">🕒 مجدول: ${fmtTs(l.publishAt)}</span>` : ""}</div>
              ${l.desc ? `<div class="muted" style="font-size:13px; margin-top:4px;">${esc(l.desc)}</div>` : ""}
              <div class="muted" style="font-size:12px; margin:4px 0;">${l.videoUrl ? "🎬 فيديو" : ""}${l.videoUrl && l.pdfUrl ? " · " : ""}${l.pdfUrl ? "📄 PDF" : ""}${!l.videoUrl && !l.pdfUrl ? "من غير وسائط" : ""}</div>
              ${tLessonRatingHtml(l.id)}
              <div class="btnrow">
                <button type="button" class="btn sm" data-lview="${l.id}">عرض</button>
                ${termWritable(l) ? `<button type="button" class="btn sm ghost" data-ledit="${l.id}">تعديل</button>
                <button type="button" class="btn sm ghost" data-lpin="${l.id}">${l.pinned ? "📌 إلغاء التثبيت" : "📌 تثبيت"}</button>
                <button type="button" class="btn sm red" data-ldel="${l.id}">حذف</button>` : ""}
              </div>
          </div>`).join("")}
      </div>` : `<p class="muted center" style="margin-top:12px;">لسه مفيش دروس في المرحلة دي — دوس "＋ إضافة درس جديد" فوق عشان تضيف أول درس.</p>`}
    </div>`;
  } else {
    content = `
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">الكويزات${lessonsGradeFilter ? " — " + esc(lessonsGradeFilter) : ""} (${quizList.length})</h2>
      ${gradeRow}
      ${tTerm() === termCurrent() ? bigAddBtn("qz-addbig", "＋ إضافة كويز جديد") : `<p class="muted" style="font-size:13px;">🔒 ${termName(tTerm())} منتهي — محتواه للقراءة بس.</p>`}
      ${quizList.length ? `<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-top:12px;">
        ${quizList.map((q) => {
          const linked = q.lessonId ? teacherLessons.find((l) => l.id === q.lessonId) : null;
          const at = quizAttemptsFor(q);
          const avg = at.length ? Math.round(at.reduce((s, a) => s + attemptPct(a), 0) / at.length) : null;
          return `
          <div class="card" style="margin:0;">
              <b style="font-size:15px;">${esc(q.title)}</b>
              ${q.lessonId
                ? `<div style="margin:4px 0;"><span class="chip">🔗 مرتبط بالدرس: ${esc(linked ? linked.title : "درس محذوف")}</span></div>`
                : `<div class="muted" style="font-size:12px; margin:4px 0;">كويز عام — مش مرتبط بدرس</div>`}
              <div style="margin:4px 0;">${gradeChip(q.grade)}</div>
              <div class="muted" style="font-size:12px; margin:4px 0;">📝 ${(q.questions || []).length} سؤال${q.maxAttempts === 1 ? " · 🔁 محاولة واحدة" : ""}</div>
              <div class="muted" style="font-size:12px; margin:4px 0;">${at.length ? `${at.length} محاولة · المتوسط ${avg}%` : "مفيش محاولات لسه"}</div>
              <div class="btnrow">
                <button type="button" class="btn sm ghost" data-qres="${q.id}">النتائج</button>
                ${termWritable(q) ? `<button type="button" class="btn sm ghost" data-qedit="${q.id}">تعديل</button>
                <button type="button" class="btn sm red" data-qdel="${q.id}">حذف</button>` : termRoChip(q)}
              </div>
              ${quizResultsOpenFor === q.id ? quizResultsHtml(q) : ""}
          </div>`;
        }).join("")}
      </div>` : `<p class="muted center" style="margin-top:12px;">لسه مفيش كويزات في المرحلة دي — دوس "＋ إضافة كويز جديد" فوق.</p>`}
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">الامتحانات (${examList.length})</h2>
      ${tTerm() === termCurrent() ? bigAddBtn("ex-addbig", "＋ إضافة امتحان جديد") : `<p class="muted" style="font-size:13px;">🔒 ${termName(tTerm())} منتهي — محتواه للقراءة بس.</p>`}
      ${examList.length ? `<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-top:12px;">
        ${examList.map((e) => {
          const [stTxt, stCls] = examStatus(e);
          const at = teacherAttempts.filter((a) => a.examId === e.id);
          const avg = at.length ? Math.round(at.reduce((s, a) => s + attemptPct(a), 0) / at.length) : null;
          return `
          <div class="card" style="margin:0;">
              <div class="btnrow" style="justify-content:space-between;"><b style="font-size:15px;">${esc(e.title)}</b><span class="chip ${stCls}">${stTxt}</span></div>
              ${e.desc ? `<div class="muted" style="font-size:13px; margin-top:4px;">${esc(e.desc)}</div>` : ""}
              <div style="margin:4px 0;">${gradeChip(e.grade)}</div>
              <div class="muted" style="font-size:12px; margin:4px 0;">📝 ${(e.quiz || []).length} سؤال${e.openAt ? " · يفتح " + fmtTs(e.openAt) : ""}${e.closeAt ? " · يقفل " + fmtTs(e.closeAt) : ""}</div>
              <div class="muted" style="font-size:12px; margin:4px 0;">${at.length ? `${at.length} محاولة · المتوسط ${avg}%` : "مفيش محاولات لسه"}</div>
              <div class="btnrow">
                <button type="button" class="btn sm ghost" data-xres="${e.id}">النتائج</button>
                ${termWritable(e) ? `<button type="button" class="btn sm ghost" data-xedit="${e.id}">تعديل</button>
                <button type="button" class="btn sm ${e.closed ? "" : "amber"}" data-xtgl="${e.id}">${e.closed ? "فتح" : "قفل"}</button>
                <button type="button" class="btn sm red" data-xdel="${e.id}">حذف</button>` : termRoChip(e)}
              </div>
              ${examResultsOpenFor === e.id ? examResultsHtml(e) : ""}
          </div>`;
        }).join("")}
      </div>` : `<p class="muted center" style="margin-top:12px;">لسه مفيش امتحانات في المرحلة دي — دوس "＋ إضافة امتحان جديد" فوق.</p>`}
    </div>`;
  }

  app.innerHTML = `
    <div class="hdr">
      <h1>المرحلة ${esc(STAGE_NAMES[stage] || stage || "")} ${STAGE_ICONS[stage] || "📚"}</h1>
    </div>
    ${teacherTabs("lessons")}
    ${myStages.length > 1 ? `<div class="btnrow" style="margin-bottom:10px;"><button type="button" class="btn ghost" id="ls-backst">← رجوع لاختيار المرحلة</button></div>` : ""}
    ${innerTabsHtml(stage)}
    ${termTabsHtml(tTerm())}
    ${content}
    ${closing()}`;
  bindTeacherTabs();
  bindTermTabs((t) => { tTermTab = t; renderTeacherLessons(stage); });
  const backBtn = document.getElementById("ls-backst");
  if (backBtn) backBtn.onclick = () => location.hash = "#/teacher/lessons";
  document.getElementById("it-lessons").onclick = () => { lessonsInnerTab = "lessons"; renderTeacherLessons(stage); };
  document.getElementById("it-quizexams").onclick = () => { lessonsInnerTab = "quizexams"; renderTeacherLessons(stage); };
  document.querySelectorAll("[data-gf]").forEach((b) => b.onclick = () => { lessonsGradeFilter = b.dataset.gf; renderTeacherLessons(stage); });
  const addL = document.getElementById("ls-addbig");
  if (addL) addL.onclick = () => { lessonForm = emptyLessonForm(); lessonFormOpen = true; renderTeacherLessons(stage); };
  const addQ = document.getElementById("qz-addbig");
  if (addQ) addQ.onclick = () => { quizForm = emptyQuizForm(); quizFormOpen = true; renderTeacherLessons(stage); };
  const addX = document.getElementById("ex-addbig");
  if (addX) addX.onclick = () => { examForm = emptyExamForm(); examFormOpen = true; renderTeacherLessons(stage); };
  document.querySelectorAll("[data-lview]").forEach((b) => b.onclick = () => { location.hash = "#/teacher/lesson/" + b.dataset.lview; });
  document.querySelectorAll("[data-ledit]").forEach((b) => b.onclick = () => {
    const l = teacherLessons.find((x) => x.id === b.dataset.ledit);
    if (!l) return;
    lessonForm = {
      id: l.id, unit: l.unit || "", lessonNum: l.lessonNum || "", title: l.title || "",
      videoUrl: l.videoUrl || "", pdfUrl: l.pdfUrl || "", desc: l.desc || "",
      publishAt: tsToLocalInput(l.publishAt), grade: l.grade || "", term: termOf(l),
    };
    lessonFormOpen = true;
    renderTeacherLessons(stage);
  });
  document.querySelectorAll("[data-ldel]").forEach((b) => b.onclick = () => teacherDeleteLesson(b.dataset.ldel, stage));
  document.querySelectorAll("[data-lpin]").forEach((b) => b.onclick = () => teacherTogglePin(b.dataset.lpin, stage));
  document.querySelectorAll("[data-qedit]").forEach((b) => b.onclick = () => {
    const q = teacherQuizzes.find((x) => x.id === b.dataset.qedit);
    if (!q) return;
    quizForm = { id: q.id, title: q.title || "", lessonId: q.lessonId || "", quiz: (q.questions || []).map(qFromStored), grade: q.grade || "", oneAttempt: q.maxAttempts === 1, term: termOf(q) };
    quizFormOpen = true;
    renderTeacherLessons(stage);
  });
  document.querySelectorAll("[data-qdel]").forEach((b) => b.onclick = () => teacherDeleteQuiz(b.dataset.qdel, stage));
  document.querySelectorAll("[data-qres]").forEach((b) => b.onclick = () => {
    quizResultsOpenFor = quizResultsOpenFor === b.dataset.qres ? null : b.dataset.qres;
    renderTeacherLessons(stage);
  });
  document.querySelectorAll("[data-xedit]").forEach((b) => b.onclick = () => {
    const e = teacherExams.find((x) => x.id === b.dataset.xedit);
    if (!e) return;
    examForm = {
      id: e.id, title: e.title || "", desc: e.desc || "",
      openAt: tsToLocalInput(e.openAt), closeAt: tsToLocalInput(e.closeAt),
      closed: !!e.closed, quiz: (e.quiz || []).map(qFromStored), grade: e.grade || "", term: termOf(e),
    };
    examFormOpen = true;
    renderTeacherLessons(stage);
  });
  document.querySelectorAll("[data-xtgl]").forEach((b) => b.onclick = () => teacherToggleExam(b.dataset.xtgl, stage));
  document.querySelectorAll("[data-xdel]").forEach((b) => b.onclick = () => teacherDeleteExam(b.dataset.xdel, stage));
  document.querySelectorAll("[data-xres]").forEach((b) => b.onclick = () => {
    examResultsOpenFor = examResultsOpenFor === b.dataset.xres ? null : b.dataset.xres;
    renderTeacherLessons(stage);
  });
  window.scrollTo(0, 0);
}

/* ---------- صفحة فورم الدرس (محتوى بس — الكويز بقى لوحده) ---------- */
function renderLessonFormPage(stage, subject) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const editing = !!lessonForm.id;
  app.innerHTML = `
    <div class="hdr">
      <h1>${editing ? "تعديل الدرس" : "إضافة درس جديد"} — المرحلة ${esc(STAGE_NAMES[stage] || stage || "")}</h1>
      <div class="fact">مادة ${esc(subject || "—")}</div>
    </div>
    ${teacherTabs("lessons")}
    <div class="btnrow" style="margin-bottom:10px;"><button type="button" class="btn ghost" id="lf-back">← رجوع للدروس</button></div>
    <div class="card">
      ${termPickerHtml(lessonForm)}
      <div class="fgrid">
        <div><label class="flabel">الوحدة رقم</label><input id="ls-unit" type="number" min="1" step="1" class="inp" placeholder="مثال: 1" value="${esc(String(lessonForm.unit))}"></div>
        <div><label class="flabel">الدرس رقم</label><input id="ls-num" type="number" min="1" step="1" class="inp" placeholder="مثال: 2" value="${esc(String(lessonForm.lessonNum))}"></div>
      </div>
      <label class="flabel">عنوان الدرس</label>
      <input id="ls-title" type="text" class="inp" placeholder="مثال: البرمجة بلغة بايثون" value="${esc(lessonForm.title)}">
      <label class="flabel">الصف (اختياري)</label>
      ${gradeSelectHtml("ls-grade", stage, lessonForm.grade || "")}
      <p class="muted" style="font-size:12.5px; margin-top:2px;">سيبه "كل صفوف المرحلة" لو الدرس لكل طلاب المرحلة، أو اختار صف معين لو الدرس موجه ليه بس.</p>
      <div class="fgrid">
        <div><label class="flabel">رابط الفيديو (يوتيوب أو جوجل درايف)</label><input id="ls-video" type="url" class="inp ltr" placeholder="https://youtube.com/watch?v=... أو https://drive.google.com/file/d/..." value="${esc(lessonForm.videoUrl)}"></div>
        <div><label class="flabel">رابط ملف PDF (جوجل درايف)</label><input id="ls-pdf" type="url" class="inp ltr" placeholder="https://drive.google.com/..." value="${esc(lessonForm.pdfUrl)}"></div>
      </div>
      <p class="muted" style="font-size:12.5px; margin-top:2px;">فيديو درايف لازم يكون متشارك: من جوجل درايف ← كليك يمين على الملف ← مشاركة ← "أي شخص لديه الرابط". فيديو يوتيوب بيشتغل على طول.</p>
      <div><label class="flabel">🕒 موعد النشر (اختياري)</label><input id="ls-pub" type="datetime-local" class="inp ltr" value="${esc(lessonForm.publishAt || "")}"></div>
      <p class="muted" style="font-size:12.5px; margin-top:2px;">سيبه فاضي عشان الدرس ينشر فورا. لو حددت معاد، الدرس يتسجل كـ"مجدول" وتظهر عليه شارة — إظهاره للطالب في المعاد هيتفعل مع واجهة الطالب لما تجهز.</p>
      <label class="flabel">وصف الدرس (اختياري — يظهر على كارت الدرس)</label>
      <textarea id="ls-desc" class="inp" rows="2" placeholder="مثال: في الدرس ده هنتعلم أساسيات لغة بايثون ونكتب أول برنامج">${esc(lessonForm.desc)}</textarea>
      <div class="btnrow">
        <button type="button" class="btn" id="ls-save">${editing ? "حفظ التعديلات" : "إضافة الدرس"}</button>
        <button type="button" class="btn ghost" id="ls-cancel">إلغاء</button>
      </div>
      <p id="ls-msg" class="msg"></p>
      <p class="muted" style="font-size:12.5px;">الكويزات بقت لوحدها في تاب "الكويزات والامتحانات" — من هناك تقدر تضيف كويز وترابطه بالدرس ده. الدرس بيظهر لطلابك المقبولين بس. الفيديو يفضل على يوتيوب أو درايف والـPDF على درايف — المنصة بتعرضهم بس.</p>
    </div>
    ${closing()}`;
  bindTeacherTabs();
  bindTermPicker(lessonForm, () => renderLessonFormPage(stage, subject));
  document.getElementById("ls-unit").oninput = (e) => lessonForm.unit = e.target.value;
  document.getElementById("ls-num").oninput = (e) => lessonForm.lessonNum = e.target.value;
  document.getElementById("ls-title").oninput = (e) => lessonForm.title = e.target.value;
  document.getElementById("ls-video").oninput = (e) => lessonForm.videoUrl = e.target.value;
  document.getElementById("ls-pdf").oninput = (e) => lessonForm.pdfUrl = e.target.value;
  document.getElementById("ls-desc").oninput = (e) => lessonForm.desc = e.target.value;
  document.getElementById("ls-pub").onchange = (e) => lessonForm.publishAt = e.target.value;
  document.getElementById("ls-grade").onchange = (e) => lessonForm.grade = e.target.value;
  document.getElementById("ls-save").onclick = () => teacherSaveLesson(stage);
  const goBack = () => { lessonForm = emptyLessonForm(); lessonFormOpen = false; renderTeacherLessons(stage); };
  document.getElementById("ls-cancel").onclick = goBack;
  document.getElementById("lf-back").onclick = goBack;
  window.scrollTo(0, 0);
}

/* ---------- صفحة فورم الكويز ---------- */
function qzMsg(t, good) {
  const m = document.getElementById("qz-msg");
  if (m) { m.className = "msg " + (good ? "good" : "bad"); m.textContent = t; }
  if (t) showToast(t, good ? "good" : "bad");
}

function renderQuizFormPage(stage, subject) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const editing = !!quizForm.id;
  const stageLessons = (stage ? teacherLessons.filter((l) => l.stage === stage) : teacherLessons)
    .slice().sort((a, b) => (a.unit || 0) - (b.unit || 0) || (a.lessonNum || 0) - (b.lessonNum || 0));
  app.innerHTML = `
    <div class="hdr">
      <h1>${editing ? "تعديل الكويز" : "إضافة كويز جديد"} — المرحلة ${esc(STAGE_NAMES[stage] || stage || "")}</h1>
      <div class="fact">مادة ${esc(subject || "—")}</div>
    </div>
    ${teacherTabs("lessons")}
    <div class="btnrow" style="margin-bottom:10px;"><button type="button" class="btn ghost" id="qf-back">← رجوع للكويزات والامتحانات</button></div>
    <div class="card">
      ${termPickerHtml(quizForm)}
      <label class="flabel">عنوان الكويز</label>
      <input id="qz-title" type="text" class="inp" placeholder="مثال: كويز الوحدة الأولى" value="${esc(quizForm.title)}">
      <label class="flabel">الصف (اختياري)</label>
      ${gradeSelectHtml("qz-grade", stage, quizForm.grade || "")}
      <label class="flabel">ربط بدرس (اختياري)</label>
      <select id="qz-lesson" class="inp">
        <option value="">كويز عام — مش مرتبط بدرس</option>
        ${stageLessons.map((l) => `<option value="${l.id}" ${quizForm.lessonId === l.id ? "selected" : ""}>الوحدة ${l.unit || "؟"} · الدرس ${l.lessonNum || "؟"} — ${esc(l.title)}</option>`).join("")}
      </select>
      <label style="display:flex; align-items:center; gap:8px; margin-top:10px; font-size:14px; font-weight:700; cursor:pointer;">
        <input type="checkbox" id="qz-oneattempt" ${quizForm.oneAttempt ? "checked" : ""} style="width:18px; height:18px;">
        محاولة واحدة بس للطالب — ميعرفش يعيد الكويز بعد ما يحله
      </label>
      <h3 style="font-size:16px; margin:14px 0 8px;">أسئلة الكويز</h3>
      <div id="qz-quiz">${quizBuilderHtml("q", quizForm.quiz)}</div>
      <div class="btnrow">
        <button type="button" class="btn ghost" id="qz-addq">+ إضافة سؤال</button>
        <button type="button" class="btn ghost" id="qz-bank">📚 إضافة من بنك الأسئلة</button>
        <button type="button" class="btn" id="qz-save">${editing ? "حفظ التعديلات" : "إضافة الكويز"}</button>
        <button type="button" class="btn ghost" id="qz-cancel">إلغاء</button>
      </div>
      <p id="qz-msg" class="msg"></p>
      <p class="muted" style="font-size:12.5px;">الكويز مفتوح للطالب على طول — لو عايز مواعيد فتح وقفل وقفل يدوي استخدم "إضافة امتحان". بنفس أنواع الأسئلة السبعة بتاعة الكويزات العادية.</p>
    </div>
    ${closing()}`;
  bindTeacherTabs();
  bindTermPicker(quizForm, () => renderQuizFormPage(stage, subject));
  document.getElementById("qz-title").oninput = (e) => quizForm.title = e.target.value;
  document.getElementById("qz-grade").onchange = (e) => quizForm.grade = e.target.value;
  document.getElementById("qz-lesson").onchange = (e) => quizForm.lessonId = e.target.value;
  document.getElementById("qz-oneattempt").onchange = (e) => quizForm.oneAttempt = e.target.checked;
  document.getElementById("qz-addq").onclick = () => {
    quizForm.quiz.push(qNew("mcq"));
    renderTeacherLessons(stage);
  };
  document.getElementById("qz-bank").onclick = () => openBankPicker(quizForm.quiz, stage);
  bindQuizEditor("q", quizForm.quiz, () => renderTeacherLessons(stage));
  document.getElementById("qz-save").onclick = () => teacherSaveQuiz(stage);
  const goBack = () => { quizForm = emptyQuizForm(); quizFormOpen = false; renderTeacherLessons(stage); };
  document.getElementById("qz-cancel").onclick = goBack;
  document.getElementById("qf-back").onclick = goBack;
  window.scrollTo(0, 0);
}

/* ---------- صفحة فورم الامتحان ---------- */
function renderExamFormPage(stage) {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  app.innerHTML = `
    <div class="hdr">
      <h1>${examForm.id ? "تعديل الامتحان" : "إضافة امتحان جديد"} — المرحلة ${esc(STAGE_NAMES[stage] || stage || "")}</h1>
    </div>
    ${teacherTabs("lessons")}
    <div class="btnrow" style="margin-bottom:10px;"><button type="button" class="btn ghost" id="xf-back">← رجوع للكويزات والامتحانات</button></div>
    <div class="card">
      ${termPickerHtml(examForm)}
      <p class="muted" style="font-size:13px;">امتحان رسمي لكل طلاب المرحلة — بنفس أنواع الأسئلة السبعة. ممكن تحدد موعد فتح وقفل أو تسيبه مفتوح على طول، وتقدر تقفله يدوي في أي وقت.</p>
      <label class="flabel">عنوان الامتحان</label>
      <input id="ex-title" type="text" class="inp" placeholder="مثال: امتحان شهر نوفمبر" value="${esc(examForm.title)}">
      <label class="flabel">وصف الامتحان (اختياري)</label>
      <textarea id="ex-desc" class="inp" rows="2" placeholder="تعليمات أو وصف قصير للطلاب">${esc(examForm.desc)}</textarea>
      <label class="flabel">الصف (اختياري)</label>
      ${gradeSelectHtml("ex-grade", stage, examForm.grade || "")}
      <div class="fgrid">
        <div><label class="flabel">موعد الفتح (اختياري)</label><input id="ex-open" type="datetime-local" class="inp ltr" value="${esc(examForm.openAt)}"></div>
        <div><label class="flabel">موعد القفل (اختياري)</label><input id="ex-close" type="datetime-local" class="inp ltr" value="${esc(examForm.closeAt)}"></div>
      </div>
      <h3 style="font-size:16px; margin:14px 0 8px;">أسئلة الامتحان</h3>
      <div id="ex-quiz">${quizBuilderHtml("x", examForm.quiz)}</div>
      <div class="btnrow">
        <button type="button" class="btn ghost" id="ex-addq">+ إضافة سؤال</button>
      <button type="button" class="btn ghost" id="ex-bank">📚 إضافة من بنك الأسئلة</button>
        <button type="button" class="btn" id="ex-save">${examForm.id ? "حفظ التعديلات" : "إضافة الامتحان"}</button>
        <button type="button" class="btn ghost" id="ex-cancel">إلغاء</button>
      </div>
      <p id="ex-msg" class="msg"></p>
    </div>
    ${closing()}`;
  bindTeacherTabs();
  bindTermPicker(examForm, () => renderExamFormPage(stage));
  document.getElementById("ex-title").oninput = (e) => examForm.title = e.target.value;
  document.getElementById("ex-desc").oninput = (e) => examForm.desc = e.target.value;
  document.getElementById("ex-open").onchange = (e) => examForm.openAt = e.target.value;
  document.getElementById("ex-close").onchange = (e) => examForm.closeAt = e.target.value;
  document.getElementById("ex-grade").onchange = (e) => examForm.grade = e.target.value;
  document.getElementById("ex-addq").onclick = () => { examForm.quiz.push(qNew("mcq")); renderTeacherLessons(stage); };
  document.getElementById("ex-bank").onclick = () => openBankPicker(examForm.quiz, stage);
  bindQuizEditor("x", examForm.quiz, () => renderTeacherLessons(stage));
  document.getElementById("ex-save").onclick = () => teacherSaveExam(stage);
  const goBack = () => { examForm = emptyExamForm(); examFormOpen = false; renderTeacherLessons(stage); };
  document.getElementById("ex-cancel").onclick = goBack;
  document.getElementById("xf-back").onclick = goBack;
  window.scrollTo(0, 0);
}

/* ---------- معاينة الدرس: صفحة عرض محتوى الدرس للمدرس ---------- */async function renderTeacherLessonView(id) {
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل الدرس...</div>`;
  let l = null;
  try {
    const d = await fbDb.collection("lessons").doc(id).get();
    if (d.exists) l = { id: d.id, ...d.data() };
  } catch (e) {
    app.innerHTML = `<p class="msg bad">مشكلة في تحميل الدرس: ${esc(e.message || e)}</p>${closing()}`;
    return;
  }
  const backHash = l && l.stage ? "#/teacher/lessons/" + encodeURIComponent(l.stage) : "#/teacher";
  if (!l) {
    app.innerHTML = `<div class="card center" style="max-width:520px; margin:60px auto;">
      <p class="msg bad">الدرس ده مش موجود (ممكن يكون اتحذف).</p>
      <div class="btnrow" style="justify-content:center;"><a class="btn ghost" href="#/teacher">رجوع</a></div>
    </div>${closing()}`;
    return;
  }
  const embed = l.videoUrl ? videoEmbed(l.videoUrl) : null;
  // الكويزات المرتبطة بالدرس (بتتدار من تاب الكويزات والامتحانات)
  let linkedQuizzes = [];
  try {
    const qsnap = await fbDb.collection("quizzes").where("lessonId", "==", id).get();
    linkedQuizzes = qsnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (_) {}
  app.innerHTML = `
    <div class="hdr">
      <h1>${esc(l.title || "درس")}</h1>
      <div class="fact">الوحدة ${esc(String(l.unit || "—"))} · الدرس ${esc(String(l.lessonNum || "—"))}${l.subject ? " · " + esc(l.subject) : ""} · المرحلة ${esc(STAGE_NAMES[l.stage] || l.stage || "")}</div>
    </div>
    ${teacherTabs("lessons")}
    <div class="btnrow"><button type="button" class="btn ghost" id="lv-back">← رجوع للدروس</button></div>
    ${l.desc ? `<div class="card"><h2 style="font-size:17px; margin-top:0;">وصف الدرس</h2><p style="white-space:pre-wrap; margin:0;">${esc(l.desc)}</p></div>` : ""}
    ${embed ? `<div class="card"><h2 style="font-size:17px; margin-top:0;">الفيديو 🎬</h2>
      <div style="position:relative; padding-top:56.25%; border-radius:12px; overflow:hidden; background:#0f172a;">
        <iframe src="${esc(embed.src)}" title="فيديو الدرس" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>
      </div>
      <p class="muted" style="font-size:12.5px;">${embed.kind === "youtube"
        ? "مشغل يوتيوب كامل: تشغيل وإيقاف وتقديم وصوت وملء الشاشة وسرعة التشغيل وجودة العرض من إعدادات المشغل."
        : "مشغل جوجل درايف: تشغيل وإيقاف وتقديم وصوت وملء الشاشة. لو الفيديو لسه مترفع على درايف ممكن ياخد دقايق للمعالجة قبل ما يشتغل."}</p></div>`
      : l.videoUrl ? `<div class="card"><h2 style="font-size:17px; margin-top:0;">الفيديو 🎬</h2><a class="btn ghost" href="${esc(l.videoUrl)}" target="_blank" rel="noopener">فتح رابط الفيديو في تاب جديد</a></div>` : ""}
    ${l.pdfUrl ? `<div class="card"><h2 style="font-size:17px; margin-top:0;">ملف PDF 📄</h2><a class="btn ghost" href="${esc(l.pdfUrl)}" target="_blank" rel="noopener">فتح الملف في تاب جديد</a></div>` : ""}
    ${linkedQuizzes.length ? `<div class="card">
      <h2 style="font-size:17px; margin-top:0;">الكويزات المرتبطة بالدرس 📝 (${linkedQuizzes.length})</h2>
      ${linkedQuizzes.map((q) => `<div style="border-top:1px solid var(--line); padding:8px 0;"><b>${esc(q.title)}</b> <span class="muted" style="font-size:12.5px;">(${(q.questions || []).length} سؤال)</span></div>`).join("")}
      <p class="muted" style="font-size:12.5px;">إضافة وتعديل ونتايج الكويزات من تاب "الكويزات والامتحانات" في صفحة المرحلة.</p>
    </div>` : ""}
    ${closing()}`;
  bindTeacherTabs();
  document.getElementById("lv-back").onclick = () => location.hash = backHash;
  window.scrollTo(0, 0);
}

function quizResultsHtml(q) {
  const attempts = quizAttemptsFor(q);
  const table = attempts.length ? `<table class="ttable" style="margin-top:10px;">
    <thead><tr><th>الطالب</th><th>الدرجة</th><th>آخر محاولة</th></tr></thead>
    <tbody>${attempts.map((a) => `<tr><td>${esc(a.studentName || "—")}</td><td>${a.score} من ${a.total}</td><td>${a.updatedAt ? fmtTs(a.updatedAt) : "—"}</td></tr>`).join("")}</tbody>
  </table>` : `<p class="muted" style="font-size:13px; margin:10px 0 0;">لسه مفيش طالب حل الكويز ده.</p>`;
  return table + lateStudentsHtml(q.stage, attempts, "الكويز", q.title, q.grade);
}

async function teacherSaveLesson(stage) {
  if (!termWritable(lessonForm)) return lsMsg("ده محتوى ترم منتهي — للقراءة بس، مش ممكن تعديله.");
  const subject = (fbProfile && fbProfile.subject) || "";
  const unit = Number(lessonForm.unit);
  const lessonNum = Number(lessonForm.lessonNum);
  if (!unit || unit < 1) return lsMsg("اكتب رقم الوحدة.");
  if (!lessonNum || lessonNum < 1) return lsMsg("اكتب رقم الدرس.");
  if (!lessonForm.title.trim()) return lsMsg("اكتب عنوان الدرس.");
  if (!lessonForm.videoUrl.trim() && !lessonForm.pdfUrl.trim()) return lsMsg("ضيف على الأقل رابط فيديو أو PDF.");
  if (lessonForm.videoUrl.trim() && !videoEmbed(lessonForm.videoUrl)) return lsMsg("رابط الفيديو مش واضح. انسخ رابط يوتيوب أو رابط ملف فيديو من جوجل درايف وهو مفتوح في المتصفح.");
  const btn = document.getElementById("ls-save");
  btn.disabled = true;
  const data = {
    teacherId: fbUser.uid,
    teacherName: (fbProfile && fbProfile.name) || "",
    subject,
    stage: stage || "",
    unit,
    lessonNum,
    title: lessonForm.title.trim(),
    videoUrl: lessonForm.videoUrl.trim(),
    pdfUrl: lessonForm.pdfUrl.trim(),
    desc: lessonForm.desc.trim(),
    publishAt: lessonForm.publishAt ? firebase.firestore.Timestamp.fromDate(new Date(lessonForm.publishAt)) : null,
    grade: lessonForm.grade || "",
    term: termOf(lessonForm),
  };
  try {
    if (lessonForm.id) {
      await fbDb.collection("lessons").doc(lessonForm.id).update(data);
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await fbDb.collection("lessons").add(data);
    }
    lessonForm = emptyLessonForm();
    lessonFormOpen = false;
    await renderTeacherLessons(stage);
  } catch (e) {
    btn.disabled = false;
    lsMsg("حصلت مشكلة: " + (e.message || e));
  }
}

// حفظ الكويز المستقل (مع ربط اختياري بدرس)
async function teacherSaveQuiz(stage) {
  if (!termWritable(quizForm)) return qzMsg("ده محتوى ترم منتهي — للقراءة بس، مش ممكن تعديله.");
  if (!quizForm.title.trim()) return qzMsg("اكتب عنوان الكويز.");
  if (!quizForm.quiz.length) return qzMsg("ضيف سؤال واحد على الأقل من زرار \"+ إضافة سؤال\".");
  for (let i = 0; i < quizForm.quiz.length; i++) {
    const err = qValidate(quizForm.quiz[i], i);
    if (err) return qzMsg(err);
  }
  const btn = document.getElementById("qz-save");
  btn.disabled = true;
  const data = {
    teacherId: fbUser.uid,
    teacherName: (fbProfile && fbProfile.name) || "",
    subject: (fbProfile && fbProfile.subject) || "",
    stage: stage || "",
    title: quizForm.title.trim(),
    lessonId: quizForm.lessonId || null,
    questions: quizForm.quiz.map(qSerialize),
    grade: quizForm.grade || "",
    maxAttempts: quizForm.oneAttempt ? 1 : 0, // 1 = محاولة واحدة بس للطالب، غير كده إعادة مفتوحة
    term: termOf(quizForm),
  };
  try {
    if (quizForm.id) {
      await fbDb.collection("quizzes").doc(quizForm.id).update(data);
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await fbDb.collection("quizzes").add(data);
    }
    const toBank = quizForm.quiz.filter((q) => q.saveToBank);
    quizForm = emptyQuizForm();
    quizFormOpen = false;
    lessonsInnerTab = "quizexams";
    try { await saveToBank(toBank); } catch (_) {}
    await renderTeacherLessons(stage);
  } catch (e) {
    btn.disabled = false;
    qzMsg("حصلت مشكلة: " + (e.message || e));
  }
}

async function teacherDeleteQuiz(id, stage) {
  const q = teacherQuizzes.find((x) => x.id === id);
  if (q && !termWritable(q)) return showToast("ده محتوى ترم منتهي — للقراءة بس.", "bad");
  if (!confirm(`متأكد إنك عايز تحذف الكويز "${q ? q.title : ""}"؟`)) return;
  try {
    await fbDb.collection("quizzes").doc(id).delete();
    if (quizForm && quizForm.id === id) { quizForm = emptyQuizForm(); quizFormOpen = false; }
    if (quizResultsOpenFor === id) quizResultsOpenFor = null;
    await renderTeacherLessons(stage);
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

/* تثبيت/إلغاء تثبيت درس: المثبت يطلع فوق قسم مادته عند الطلاب (مراجعة قبل الامتحان مثلاً) */
async function teacherTogglePin(id, stage) {
  const l = teacherLessons.find((x) => x.id === id);
  if (!l) return;
  if (!termWritable(l)) return showToast("ده محتوى ترم منتهي — للقراءة بس.", "bad");
  try {
    await fbDb.collection("lessons").doc(id).update({ pinned: !l.pinned });
    showToast(l.pinned ? "اتلغى تثبيت الدرس." : "الدرس اتثبت — هيظهر الأول عند طلابك في قسم المادة.", "good");
    await renderTeacherLessons(stage);
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

async function teacherDeleteLesson(id, stage) {
  const l = teacherLessons.find((x) => x.id === id);
  if (l && !termWritable(l)) return showToast("ده محتوى ترم منتهي — للقراءة بس.", "bad");
  const linked = teacherQuizzes.filter((q) => q.lessonId === id);
  const extra = linked.length ? `\nتنبيه: فيه ${linked.length} كويز مرتبط بالدرس ده هيتحذف معاه.` : "";
  if (!confirm(`متأكد إنك عايز تحذف الدرس "${l ? l.title : ""}"؟${extra}`)) return;
  try {
    await fbDb.collection("lessons").doc(id).delete();
    for (const q of linked) await fbDb.collection("quizzes").doc(q.id).delete();
    if (lessonForm && lessonForm.id === id) { lessonForm = emptyLessonForm(); lessonFormOpen = false; }
    await renderTeacherLessons(stage);
  } catch (e) { alert("مشكلة: " + (e.message || e)); }
}

/* ---------- الامتحانات المستقلة ---------- */
function tsToLocalInput(ts) {
  try {
    if (!ts || !ts.toDate) return "";
    const d = ts.toDate();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch (e) { return ""; }
}

function examStatus(e) {
  if (e.closed) return ["مقفول", "red"];
  const now = new Date();
  const o = e.openAt && e.openAt.toDate ? e.openAt.toDate() : null;
  const cl = e.closeAt && e.closeAt.toDate ? e.closeAt.toDate() : null;
  if (o && now < o) return ["مجدول", "amber"];
  if (cl && now > cl) return ["انتهى", "red"];
  return ["مفتوح", "green"];
}

function exMsg(t, good) {
  const m = document.getElementById("ex-msg");
  if (m) { m.className = "msg " + (good ? "good" : "bad"); m.textContent = t; }
  if (t) showToast(t, good ? "good" : "bad");
}

function examResultsHtml(e) {
  const attempts = teacherAttempts.filter((a) => a.examId === e.id);
  if (!attempts.length) return `<p class="muted" style="font-size:13px; margin:10px 0 0;">لسه مفيش طالب حل الامتحان ده.</p>`;
  const pcts = attempts.map((a) => (a.total > 0 ? (a.score / a.total) * 100 : 0));
  const avg = Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length);
  return `<div style="margin-top:10px;">
    <p class="muted" style="font-size:12.5px; margin:0 0 6px;">المحاولات: ${attempts.length} · أعلى ${Math.round(Math.max(...pcts))}% · أقل ${Math.round(Math.min(...pcts))}% · المتوسط ${avg}%</p>
    <table class="ttable">
    <thead><tr><th>الطالب</th><th>الدرجة</th><th>النسبة</th><th>آخر محاولة</th></tr></thead>
    <tbody>${attempts.map((a) => `<tr><td>${esc(a.studentName || "—")}</td><td>${a.score} من ${a.total}</td><td>${a.total > 0 ? Math.round((a.score / a.total) * 100) + "%" : "—"}</td><td>${a.updatedAt ? fmtTs(a.updatedAt) : "—"}</td></tr>`).join("")}</tbody>
  </table>${lateStudentsHtml(e.stage, attempts, "الامتحان", e.title, e.grade)}</div>`;
}

async function teacherSaveExam(stage) {
  if (!termWritable(examForm)) return exMsg("ده محتوى ترم منتهي — للقراءة بس، مش ممكن تعديله.");
  const subject = (fbProfile && fbProfile.subject) || "";
  if (!examForm.title.trim()) return exMsg("اكتب عنوان الامتحان.");
  if (!examForm.quiz.length) return exMsg("ضيف سؤال واحد على الأقل للامتحان.");
  for (let i = 0; i < examForm.quiz.length; i++) {
    const err = qValidate(examForm.quiz[i], i);
    if (err) return exMsg(err);
  }
  if (examForm.openAt && examForm.closeAt && new Date(examForm.closeAt) <= new Date(examForm.openAt)) return exMsg("موعد القفل لازم يكون بعد موعد الفتح.");
  const btn = document.getElementById("ex-save");
  btn.disabled = true;
  const data = {
    teacherId: fbUser.uid,
    teacherName: (fbProfile && fbProfile.name) || "",
    subject,
    stage: stage || "",
    title: examForm.title.trim(),
    desc: examForm.desc.trim(),
    openAt: examForm.openAt ? firebase.firestore.Timestamp.fromDate(new Date(examForm.openAt)) : null,
    closeAt: examForm.closeAt ? firebase.firestore.Timestamp.fromDate(new Date(examForm.closeAt)) : null,
    closed: !!examForm.closed,
    quiz: examForm.quiz.map(qSerialize),
    grade: examForm.grade || "",
    term: termOf(examForm),
  };
  try {
    if (examForm.id) {
      await fbDb.collection("exams").doc(examForm.id).update(data);
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await fbDb.collection("exams").add(data);
    }
    const toBank = examForm.quiz.filter((q) => q.saveToBank);
    examForm = emptyExamForm();
    examFormOpen = false;
    lessonsInnerTab = "quizexams";
    try { await saveToBank(toBank); } catch (_) {}
    await renderTeacherLessons(stage);
  } catch (e) {
    btn.disabled = false;
    exMsg("حصلت مشكلة: " + (e.message || e));
  }
}

async function teacherToggleExam(id, stage) {
  const e = teacherExams.find((x) => x.id === id);
  if (!e) return;
  if (!termWritable(e)) return showToast("ده محتوى ترم منتهي — للقراءة بس.", "bad");
  try {
    await fbDb.collection("exams").doc(id).update({ closed: !e.closed });
    await renderTeacherLessons(stage);
  } catch (err) { alert("مشكلة: " + (err.message || err)); }
}

async function teacherDeleteExam(id, stage) {
  const e = teacherExams.find((x) => x.id === id);
  if (e && !termWritable(e)) return showToast("ده محتوى ترم منتهي — للقراءة بس.", "bad");
  if (!confirm(`متأكد إنك عايز تحذف الامتحان "${e ? e.title : ""}"؟`)) return;
  try {
    await fbDb.collection("exams").doc(id).delete();
    if (examForm && examForm.id === id) examForm = emptyExamForm();
    if (examResultsOpenFor === id) examResultsOpenFor = null;
    await renderTeacherLessons(stage);
  } catch (err) { alert("مشكلة: " + (err.message || err)); }
}

/* ---------- تقارير المدرس ---------- */
let trepState = { type: "students", stage: "", grade: "", quizId: "", examId: "" };

const TREP_TYPES = [
  ["students", "تقرير الطلاب"],
  ["stage", "تقرير مرحلة"],
  ["compare", "مقارنة المراحل"],
  ["lessons", "تقرير الدروس"],
  ["quiz", "نتائج الكويزات"],
  ["top", "أوائل المراحل 🏆"],
  ["exams", "تقرير الامتحانات"],
];

function attemptPct(a) { return a.total > 0 ? Math.round((a.score / a.total) * 100) : 0; }

// بيبني التقرير الحالي: {title, columns, rows (نصوص للتصدير), view (صفوف الشاشة فيها لينكات الطلبة), summary}
function buildTeacherReport() {
  const students = (teacherCache || []).slice();
  const t = trepState.type;
  const pp = (s) => s.parentPhone || "غير مسجل";
  const stName = (g) => stageOfGrade(g) || "—";

  if (t === "stage") {
    const st = trepState.stage || ((fbProfile && fbProfile.stages) || [])[0] || "";
    let list = students.filter((s) => stageOfGrade(s.grade) === st);
    if (trepState.grade) list = list.filter((s) => s.grade === trepState.grade);
    const withAtt = list.filter((s) => studentQuizAvg(s.id) !== null);
    const avgAll = withAtt.length ? Math.round(withAtt.reduce((sum, s) => sum + studentQuizAvg(s.id), 0) / withAtt.length) : null;
    const lessonsN = teacherLessons.filter((l) => l.stage === st).length;
    const examsN = teacherExams.filter((e) => e.stage === st).length;
    const mkRow = (s) => ({
      cells: [s.name || "", stName(s.grade), s.grade || "—", s.phone || "", pp(s), s.status === "approved" ? "مقبول" : s.status === "rejected" ? "مرفوض" : "تحت المراجعة", studentQuizAvg(s.id) !== null ? studentQuizAvg(s.id) + "%" : "—", fmtTs(s.createdAt)],
      sid: s.id,
    });
    const rows = list.map(mkRow);
    return {
      title: "تقرير مرحلة " + (STAGE_NAMES[st] || st || "—"),
      summary: `الطلاب: ${list.length} · الدروس: ${lessonsN} · الامتحانات: ${examsN} · متوسط درجات المرحلة: ${avgAll !== null ? avgAll + "%" : "—"}`,
      columns: ["الاسم", "المرحلة", "السنة", "الموبايل", "ولي الأمر", "الحالة", "متوسط الدرجات", "تاريخ التسجيل"],
      rows, filtersDesc: ["المرحلة: " + (STAGE_NAMES[st] || st)].concat(trepState.grade ? ["الصف: " + trepState.grade] : []),
    };
  }

  if (t === "compare") {
    const stages = ((fbProfile && fbProfile.stages) || []);
    const cmpRows = stages.map((st) => {
      const lsn = teacherLessons.filter((l) => l.stage === st).length;
      const qzn = teacherQuizzes.filter((q) => q.stage === st).length + teacherExams.filter((e) => e.stage === st).length;
      const qids = new Set(teacherQuizzes.filter((q) => q.stage === st).map((q) => q.id));
      const eids = new Set(teacherExams.filter((e) => e.stage === st).map((e) => e.id));
      const lids = new Set(teacherLessons.filter((l) => l.stage === st).map((l) => l.id));
      const at = teacherAttempts.filter((a) => qids.has(a.quizId) || eids.has(a.examId) || lids.has(a.lessonId));
      const avg = at.length ? Math.round(at.reduce((sum, a) => sum + attemptPct(a), 0) / at.length) : null;
      return { cells: [STAGE_NAMES[st] || st, String(lsn), String(qzn), String(at.length), avg !== null ? avg + "%" : "—"] };
    });
    // أصعب الأسئلة: من إجابات الطلبة المتخزنة في المحاولات (answers)
    const sources = teacherQuizzes.map((q) => ({ kind: "كويز", title: q.title, stage: q.stage, questions: q.questions || [], id: q.id, lessonId: q.lessonId }))
      .concat(teacherExams.map((e) => ({ kind: "امتحان", title: e.title, stage: e.stage, questions: e.quiz || [], id: e.id, lessonId: null })));
    const hard = [];
    sources.forEach((src) => {
      const at = src.kind === "كويز"
        ? teacherAttempts.filter((a) => a.quizId === src.id || (src.lessonId && a.lessonId === src.lessonId))
        : teacherAttempts.filter((a) => a.examId === src.id);
      const withAns = at.filter((a) => Array.isArray(a.answers) && a.answers.length);
      if (!withAns.length) return;
      src.questions.forEach((qq, qi) => {
        let wrong = 0, tot = 0;
        withAns.forEach((a) => {
          const an = a.answers[qi];
          if (an == null) return;
          tot++;
          if (an === false || (an && an.correct === false)) wrong++;
        });
        if (tot) hard.push({ wrongPct: Math.round((wrong / tot) * 100), text: qq.q || "", place: src.title, stage: STAGE_NAMES[src.stage] || src.stage || "—" });
      });
    });
    hard.sort((a, b) => b.wrongPct - a.wrongPct);
    const hardRows = hard.slice(0, 10).map((hh) => ({ cells: [hh.text, hh.place, hh.stage, hh.wrongPct + "%"] }));
    return {
      title: "مقارنة المراحل",
      summary: "متوسط الدرجات محسوب على كل محاولات الكويزات والامتحانات في المرحلة.",
      columns: ["المرحلة", "الدروس", "الكويزات والامتحانات", "المحاولات", "متوسط الدرجات"],
      rows: cmpRows, filtersDesc: [],
      extraTitle: "أصعب الأسئلة (تحليل على مستوى السؤال)",
      extraColumns: ["السؤال", "في", "المرحلة", "نسبة الغلط"],
      extraRows: hardRows,
      extraEmpty: "لسه مفيش بيانات إجابات — التحليل ده بيتملى أول ما الطلبة يحلوا كويزات وامتحانات (مع واجهة الطالب).",
      extraNote: "نسبة الغلط = عدد الطلبة اللي غلطوا في السؤال من اللي جاوبوه. بيتحسب من إجابات كل سؤال المتخزنة في المحاولات.",
    };
  }

  if (t === "lessons") {
    const rows = teacherLessons.map((l) => {
      const linked = teacherQuizzes.filter((q) => q.lessonId === l.id);
      const linkedIds = linked.map((q) => q.id);
      const at = teacherAttempts.filter((a) => a.lessonId === l.id || linkedIds.includes(a.quizId));
      const avg = at.length ? Math.round(at.reduce((s, a) => s + attemptPct(a), 0) / at.length) : null;
      const content = [l.videoUrl ? "فيديو" : "", l.pdfUrl ? "PDF" : ""].filter(Boolean).join(" + ") || "—";
      return { cells: [STAGE_NAMES[l.stage] || l.stage || "—", l.grade || "كل الصفوف", String(l.unit || "—"), String(l.lessonNum || "—"), l.title || "", content, String(linked.length), String(at.length), avg !== null ? avg + "%" : "—"] };
    });
    return { title: "تقرير الدروس", columns: ["المرحلة", "الصف", "الوحدة", "الدرس", "العنوان", "المحتوى", "كويزات مرتبطة", "المحاولات", "متوسط الدرجة"], rows, filtersDesc: [] };
  }

  if (t === "quiz") {
    const q = teacherQuizzes.find((x) => x.id === trepState.quizId) || teacherQuizzes[0];
    const at = q ? quizAttemptsFor(q) : [];
    const pcts = at.map(attemptPct);
    const summary = q && at.length
      ? `المحاولات: ${at.length} · أعلى ${Math.round(Math.max(...pcts))}% · أقل ${Math.round(Math.min(...pcts))}% · المتوسط ${Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length)}%`
      : q ? "مفيش محاولات على الكويز ده لسه" : "مفيش كويزات لسه";
    const rows = at.map((a) => {
      const s = students.find((x) => x.id === a.studentId);
      return { cells: [a.studentName || "—", `${a.score} من ${a.total}`, attemptPct(a) + "%", a.updatedAt ? fmtTs(a.updatedAt) : "—"], sid: a.studentId || null };
    });
    return {
      title: "نتائج كويز: " + (q ? q.title : "—"), summary,
      columns: ["الطالب", "الدرجة", "النسبة", "آخر محاولة"], rows,
      filtersDesc: q ? ["الكويز: " + q.title] : [],
    };
  }

  if (t === "top") {
    const stages = ((fbProfile && fbProfile.stages) || []);
    const rows = [];
    stages.forEach((st) => {
      const ranked = students
        .filter((s) => stageOfGrade(s.grade) === st && s.status === "approved")
        .map((s) => ({ s, avg: studentQuizAvg(s.id), n: teacherAttempts.filter((a) => a.studentId === s.id).length }))
        .filter((r) => r.avg !== null)
        .sort((a, b) => b.avg - a.avg);
      if (!ranked.length) {
        rows.push({ cells: [STAGE_NAMES[st] || st, "—", "لا توجد نتائج كويزات بعد", "—", "—"] });
        return;
      }
      // الترتيب بالمراكز مع التعادل: نفس المتوسط = نفس المركز، وأول 3 مراكز
      let rank = 0, prevAvg = null, idx = 0;
      ranked.forEach((r) => {
        idx++;
        if (r.avg !== prevAvg) { rank = idx; prevAvg = r.avg; }
        if (rank <= 3) rows.push({ cells: [STAGE_NAMES[st] || st, String(rank), r.s.name || "", r.avg + "%", String(r.n)], sid: r.s.id });
      });
    });
    return { title: "أوائل المراحل (أفضل 3)", columns: ["المرحلة", "المركز", "الطالب", "متوسط الدرجات", "عدد الاختبارات"], rows, filtersDesc: [] };
  }

  if (t === "exams") {
    const rows = teacherExams.map((e) => {
      const at = teacherAttempts.filter((a) => a.examId === e.id);
      const avg = at.length ? Math.round(at.reduce((s, a) => s + attemptPct(a), 0) / at.length) : null;
      const [stTxt] = examStatus(e);
      return { cells: [STAGE_NAMES[e.stage] || e.stage || "—", e.grade || "كل الصفوف", e.title || "", String((e.quiz || []).length), e.openAt ? fmtTs(e.openAt) : "مفتوح دائماً", e.closeAt ? fmtTs(e.closeAt) : "—", stTxt, String(at.length), avg !== null ? avg + "%" : "—"] };
    });
    return { title: "تقرير الامتحانات", columns: ["المرحلة", "الصف", "العنوان", "الأسئلة", "الفتح", "القفل", "الحالة", "المحاولات", "المتوسط"], rows, filtersDesc: [] };
  }

  // students (الافتراضي)
  let list = students;
  if (trepState.stage) list = list.filter((s) => stageOfGrade(s.grade) === trepState.stage);
  if (trepState.grade) list = list.filter((s) => s.grade === trepState.grade);
  const rows = list.map((s) => ({
    cells: [s.name || "", stName(s.grade), s.grade || "—", s.phone || "", pp(s), s.email || "", s.status === "approved" ? "مقبول" : s.status === "rejected" ? "مرفوض" : "تحت المراجعة", studentQuizAvg(s.id) !== null ? studentQuizAvg(s.id) + "%" : "—", String(teacherAttempts.filter((a) => a.studentId === s.id).length), fmtTs(s.createdAt)],
    sid: s.id,
  }));
  return {
    title: "تقرير الطلاب",
    columns: ["الاسم", "المرحلة", "السنة", "الموبايل", "ولي الأمر", "الإيميل", "الحالة", "متوسط الدرجات", "عدد الاختبارات", "تاريخ التسجيل"],
    rows, filtersDesc: (trepState.stage ? ["المرحلة: " + (STAGE_NAMES[trepState.stage] || trepState.stage)] : []).concat(trepState.grade ? ["الصف: " + trepState.grade] : []),
  };
}

function teacherPrintReport() {
  const rep = buildTeacherReport();
  const w = window.open("", "_blank");
  if (!w) { alert("المتصفح مانع النافذة المنبثقة. اسمح بيها وجرّب تاني."); return; }
  const escP = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
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
  <div class="meta">المدرس: ${escP((fbProfile && fbProfile.name) || "")} · تاريخ التقرير: ${escP(new Date().toLocaleString("ar-EG"))} · عدد السجلات: ${rep.rows.length}${rep.summary ? " · " + escP(rep.summary) : ""}</div>
  <table><thead><tr>${rep.columns.map((cl) => `<th>${escP(cl)}</th>`).join("")}</tr></thead>
  <tbody>${rep.rows.map((r) => `<tr>${r.cells.map((cl) => `<td>${escP(cl)}</td>`).join("")}</tr>`).join("")}</tbody></table>
  <div class="foot">فكرة وإعداد: مهندس اسامه حسن عسس</div>
  <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`);
  w.document.close();
}

function teacherExportReport(kind) {
  const rep = buildTeacherReport();
  const stamp = new Date().toISOString().slice(0, 10);
  const rows = rep.rows.map((r) => r.cells);
  if (kind === "csv") {
    const lines = [rep.columns].concat(rows).map((r) => r.map((cl) => `"${String(cl == null ? "" : cl).replace(/"/g, '""')}"`).join(","));
    downloadBlob(new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${rep.title}-${stamp}.csv`);
  } else {
    const escP = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>
      <table border="1"><thead><tr>${rep.columns.map((cl) => `<th>${escP(cl)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((cl) => `<td>${escP(cl)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    downloadBlob(new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel" }), `${rep.title}-${stamp}.xls`);
  }
}

async function renderTeacherReports() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنجهز تقاريرك...</div>`;
  try { await Promise.all([teacherLoad(), teacherLoadLessons()]); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const rep = buildTeacherReport();
  const myStages = (fbProfile && fbProfile.stages) || [];
  let filtersHtml = "";
  if (trepState.type === "students") {
    const gradeOpts = trepState.stage ? gradesOfStage(trepState.stage) : GRADES;
    filtersHtml = `<select id="trf-stage" class="inp"><option value="">كل المراحل</option>
      ${myStages.map((s) => `<option value="${esc(s)}" ${trepState.stage === s ? "selected" : ""}>${esc(STAGE_NAMES[s] || s)}</option>`).join("")}</select>
      <select id="trf-grade" class="inp"><option value="">كل الصفوف</option>
      ${gradeOpts.map((g) => `<option value="${esc(g)}" ${trepState.grade === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select>`;
  } else if (trepState.type === "stage") {
    const stSel = trepState.stage || myStages[0] || "";
    filtersHtml = `<select id="trf-stage" class="inp">
      ${myStages.map((s) => `<option value="${esc(s)}" ${stSel === s ? "selected" : ""}>${esc(STAGE_NAMES[s] || s)}</option>`).join("")}</select>
      <select id="trf-grade" class="inp"><option value="">كل صفوف المرحلة</option>
      ${gradesOfStage(stSel).map((g) => `<option value="${esc(g)}" ${trepState.grade === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select>`;
  } else if (trepState.type === "quiz") {
    const sel = trepState.quizId || (teacherQuizzes[0] && teacherQuizzes[0].id) || "";
    filtersHtml = `<select id="trf-quiz" class="inp">
      ${teacherQuizzes.map((q) => `<option value="${q.id}" ${sel === q.id ? "selected" : ""}>${esc(STAGE_NAMES[q.stage] || q.stage || "")} — ${esc(q.title)}</option>`).join("")}</select>`;
  }
  app.innerHTML = `
    <div class="hdr">
      <h1>التقارير 📊</h1>
    </div>
    ${teacherTabs("reports")}
    <div class="tabs">${TREP_TYPES.map(([v, lbl]) => `<button type="button" class="tab ${trepState.type === v ? "active" : ""}" data-trt="${v}">${lbl}</button>`).join("")}</div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">${rep.title} (${rep.rows.length})</h2>
      ${rep.summary ? `<p class="muted" style="font-size:13.5px;">${esc(rep.summary)}</p>` : ""}
      ${filtersHtml ? `<div class="filterrow">${filtersHtml}</div>` : ""}
      <div class="btnrow" style="margin-bottom:12px;">
        <button type="button" class="btn" id="trp-print">🖨️ طباعة / PDF</button>
        <button type="button" class="btn ghost" id="trp-csv">تصدير CSV</button>
        <button type="button" class="btn ghost" id="trp-xls">تصدير Excel</button>
      </div>
      <div style="overflow-x:auto;">
      <table class="ttable">
        <thead><tr>${rep.columns.map((cl) => `<th>${cl}</th>`).join("")}</tr></thead>
        <tbody>
          ${rep.rows.length ? rep.rows.map((r) => `<tr>${r.cells.map((cl, ci) => `<td>${ci === 0 && r.sid ? `<a href="javascript:void(0)" data-spop="${r.sid}" style="color:var(--primary-dark); font-weight:700;">${esc(cl)}</a>` : esc(cl)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${rep.columns.length}" class="center muted">مفيش بيانات لسه</td></tr>`}
        </tbody>
      </table>
      </div>
      ${rep.extraColumns ? `
      <h2 style="font-size:17px; margin:18px 0 6px;">🧩 ${esc(rep.extraTitle || "")}</h2>
      ${rep.extraNote ? `<p class="muted" style="font-size:12.5px; margin-top:0;">${esc(rep.extraNote)}</p>` : ""}
      <div style="overflow-x:auto;">
      <table class="ttable">
        <thead><tr>${rep.extraColumns.map((cl) => `<th>${cl}</th>`).join("")}</tr></thead>
        <tbody>
          ${(rep.extraRows || []).length ? rep.extraRows.map((r) => `<tr>${r.cells.map((cl) => `<td>${esc(cl)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${rep.extraColumns.length}" class="center muted">${esc(rep.extraEmpty || "مفيش بيانات لسه")}</td></tr>`}
        </tbody>
      </table>
      </div>` : ""}
      <p class="muted" style="font-size:12.5px;">الطباعة والتصدير بيطلعوا اللي قدامك بالفلاتر الحالية. اضغط على اسم أي طالب لعرض بياناته كاملة.</p>
    </div>
    ${closing()}`;
  bindTeacherTabs();
  document.querySelectorAll("[data-trt]").forEach((b) => b.onclick = () => { trepState = { type: b.dataset.trt, stage: "", grade: "", quizId: "", examId: "" }; renderTeacherReports(); });
  const stSel = document.getElementById("trf-stage");
  if (stSel) stSel.onchange = (e) => { trepState.stage = e.target.value; trepState.grade = ""; renderTeacherReports(); };
  const grSel = document.getElementById("trf-grade");
  if (grSel) grSel.onchange = (e) => { trepState.grade = e.target.value; renderTeacherReports(); };
  const qzSel = document.getElementById("trf-quiz");
  if (qzSel) qzSel.onchange = (e) => { trepState.quizId = e.target.value; renderTeacherReports(); };
  document.getElementById("trp-print").onclick = teacherPrintReport;
  document.getElementById("trp-csv").onclick = () => teacherExportReport("csv");
  document.getElementById("trp-xls").onclick = () => teacherExportReport("xls");
  document.querySelectorAll("[data-spop]").forEach((b) => b.onclick = () => teacherShowStudent(b.dataset.spop));
  window.scrollTo(0, 0);
}

/* ---------- المتأخرين عن كويز/امتحان + تذكير واتساب ---------- */
function lateStudentsHtml(stage, attempts, kindLabel, title, grade) {
  // grade فاضي = المحتوى لكل صفوف المرحلة، غير كده للصف المحدد بس
  const students = (teacherCache || []).filter((x) => x.status === "approved" && stageOfGrade(x.grade) === stage && (!grade || x.grade === grade));
  if (!students.length) return "";
  const done = new Set(attempts.map((a) => a.studentId));
  const late = students.filter((x) => !done.has(x.id));
  if (!late.length) return `<p class="muted" style="font-size:13px; margin:12px 0 0;">✅ كل الطلاب المستهدفين حلوا ${kindLabel} — مفيش متأخرين.</p>`;
  const rows = late.map((x) => {
    const to = x.parentPhone || x.phone || "";
    const parent = !!x.parentPhone;
    const text = parent
      ? "أهلاً بحضرتك، معاك مدرس " + (x.name || "نجلكم") + ". بنفكركم إن " + (x.name || "الطالب") + " لسه ما حلش " + kindLabel + ": " + (title || "") + ". لو سمحتوا فكروه يحله."
      : "أهلاً " + (x.name || "") + "، معاك مدرسك. فكرك إنك لسه ما حليتش " + kindLabel + ": " + (title || "") + ". متنساش تحله.";
    return `<tr><td>${esc(x.name || "—")}</td><td class="ltr">${esc(to || "غير مسجل")}</td>
      <td>${to ? `<a class="btn sm green" target="_blank" rel="noopener" href="${waLink(to, text)}">إرسال تذكير واتساب${parent ? " لولي الأمر" : " للطالب"}</a>` : `<span class="muted" style="font-size:12.5px;">مفيش رقم</span>`}</td></tr>`;
  }).join("");
  return `<h3 style="font-size:15.5px; margin:16px 0 4px;">⏰ المتأخرين عن ${kindLabel} (${late.length})</h3>
  <p class="muted" style="font-size:12.5px; margin:0 0 6px;">طلابك المقبولين اللي ${kindLabel} ده موجه لهم${grade ? " (" + esc(grade) + ")" : ""} ولسه ماحلوش. الزرار بيفتح واتساب برسالة تذكير جاهزة بتبعتها بنفسك — لولي الأمر أولاً، وللطالب لو مفيش رقم ولي أمر.</p>
  <table class="ttable">
    <thead><tr><th>الطالب</th><th>الرقم</th><th>تذكير</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/* ---------- بنك الأسئلة ---------- */
async function saveToBank(questions) {
  if (!questions.length) return;
  const batch = fbDb.batch();
  const col = fbDb.collection("questionBank");
  questions.forEach((q) => {
    batch.set(col.doc(), {
      teacherId: fbUser.uid,
      subject: (fbProfile && fbProfile.subject) || "",
      q: qSerialize(q),
      useCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
}

async function openBankPicker(qs, stage) {
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `<div class="detailcard" style="max-height:85vh; overflow-y:auto; max-width:640px;">
    <h3>📚 بنك الأسئلة — اختار اللي يتحط</h3>
    <p class="muted" style="font-size:13px;">بنكك الخاص — أي سؤال بتحفظه من أي كويز أو امتحان بيظهر هنا.</p>
    <p class="muted">بنحمل البنك...</p>
  </div>`;
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  let bank = [];
  try {
    const snap = await fbDb.collection("questionBank").where("teacherId", "==", fbUser.uid).get();
    bank = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));
  } catch (e) {
    ov.querySelector(".muted").textContent = "مشكلة في تحميل البنك: " + (e.message || e);
    return;
  }
  const typeLbl = { mcq: "اختيارات", multi: "اختيار متعدد", tf: "صح/خطأ", text: "إجابة قصيرة", fill: "أكمل", match: "توصيل", num: "رقمية" };
  const card = ov.querySelector(".detailcard");
  const listHtml = bank.length ? bank.map((bq) => `
    <div style="border:1px solid var(--line); border-radius:12px; padding:10px; margin-bottom:8px; display:flex; gap:8px; align-items:flex-start;" data-brow="${bq.id}">
      <input type="checkbox" data-bsel="${bq.id}" style="margin-top:4px;">
      <div style="flex:1;" data-btxt="${bq.id}"><b style="font-size:14px;">${esc((bq.q && bq.q.q) || "")}</b>
        <div class="muted" style="font-size:12px;">${typeLbl[(bq.q && bq.q.type)] || "سؤال"} · استُخدم ${bq.useCount || 0} مرة</div></div>
      <button type="button" class="btn sm red" data-bdel="${bq.id}">حذف</button>
    </div>`).join("")
    : `<p class="muted center">البنك فاضي لسه — احفظ أسئلة من فورم الكويز أو الامتحان وهتظهر هنا.</p>`;
  card.innerHTML = `
    <h3>📚 بنك الأسئلة — اختار اللي يتحط (${bank.length})</h3>
    <input type="text" class="inp" id="bk-search" placeholder="بحث في البنك..." style="margin-bottom:10px;">
    <div id="bk-list">${listHtml}</div>
    <div class="btnrow" style="margin-top:10px;">
      <button type="button" class="btn" id="bk-add" ${bank.length ? "" : "disabled"}>إضافة المحدد</button>
      <button type="button" class="btn ghost" id="bk-cancel">إلغاء</button>
    </div>
    <p class="muted" style="font-size:12.5px;">أي سؤال بتكتبه في كويز أو امتحان تقدر تحفظه هنا بعلامة "احفظ في البنك" — والحذف من البنك مبيأثرش على الكويزات اللي استخدمته قبل كده.</p>`;
  card.querySelector("#bk-cancel").onclick = () => ov.remove();
  card.querySelector("#bk-search").oninput = (e) => {
    const t = e.target.value.trim();
    card.querySelectorAll("[data-brow]").forEach((row) => {
      const txt = row.querySelector("[data-btxt]").textContent;
      row.style.display = !t || txt.includes(t) ? "" : "none";
    });
  };
  card.querySelectorAll("[data-bdel]").forEach((b) => b.onclick = async () => {
    if (!confirm("تحذف السؤال ده من البنك؟ (الكويزات اللي استخدمته مش هتتأثر)")) return;
    try {
      await fbDb.collection("questionBank").doc(b.dataset.bdel).delete();
      const row = card.querySelector(`[data-brow="${b.dataset.bdel}"]`);
      if (row) row.remove();
      bank = bank.filter((x) => x.id !== b.dataset.bdel);
      if (!bank.length) card.querySelector("#bk-add").disabled = true;
    } catch (e) { alert("مشكلة: " + (e.message || e)); }
  });
  const addBtn = card.querySelector("#bk-add");
  if (addBtn) addBtn.onclick = async () => {
    const picked = Array.from(card.querySelectorAll("[data-bsel]:checked")).map((c) => bank.find((x) => x.id === c.dataset.bsel)).filter(Boolean);
    if (!picked.length) { alert("علّم على سؤال واحد على الأقل."); return; }
    picked.forEach((bq) => { if (bq.q) qs.push(qFromStored(bq.q)); });
    try {
      const batch = fbDb.batch();
      picked.forEach((bq) => batch.update(fbDb.collection("questionBank").doc(bq.id), { useCount: (bq.useCount || 0) + 1 }));
      await batch.commit();
    } catch (_) {}
    ov.remove();
    renderTeacherLessons(stage);
  };
}

/* ---------- الإعلانات لطلاب مرحلة ---------- */
let teacherAnn = [];
let annStageSel = "";
let annGradeSel = "";

async function renderTeacherAnnouncements() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل الإعلانات...</div>`;
  try {
    const snap = await fbDb.collection("announcements").where("teacherId", "==", fbUser.uid).get();
    teacherAnn = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));
  } catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const myStages = (fbProfile && fbProfile.stages) || [];
  if (!annStageSel || !myStages.includes(annStageSel)) annStageSel = myStages[0] || "";
  app.innerHTML = `
    <div class="hdr">
      <h1>الإعلانات 📢</h1>
    </div>
    ${teacherTabs("ann")}
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">إعلان جديد</h2>
      <div class="fgrid">
        <div><label class="flabel">المرحلة</label><select id="an-stage" class="inp">
          ${myStages.map((st) => `<option value="${esc(st)}" ${annStageSel === st ? "selected" : ""}>المرحلة ${esc(STAGE_NAMES[st] || st)}</option>`).join("")}
        </select></div>
        <div><label class="flabel">الصف (اختياري)</label>${gradeSelectHtml("an-grade", annStageSel, annGradeSel)}</div>
      </div>
      <label class="flabel">نص الإعلان</label>
      <textarea id="an-text" class="inp" rows="3" placeholder="مثال: مراجعة الوحدة الأولى يوم الخميس الساعة 5"></textarea>
      <button type="button" class="btn" id="an-send">نشر الإعلان</button>
      <p id="an-msg" class="msg"></p>
      <p class="muted" style="font-size:12.5px; margin-top:6px;">الإعلان بيوصل لكل طلابك المقبولين في المرحلة المختارة — ولو اخترت صف، للصف ده بس. عرض الإعلان عند الطالب هيتفعل مع واجهة الطالب لما تجهز — دلوقتي بيتحفظ وبيطلع في قائمتك تحت.</p>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">الإعلانات السابقة (${teacherAnn.length})</h2>
      ${teacherAnn.length ? teacherAnn.map((a) => `
      <div class="card" style="margin:0 0 10px;">
        <div class="btnrow" style="justify-content:space-between;"><b style="font-size:15px;">${esc(a.text || "")}</b><span class="btnrow" style="margin:0;"><span class="chip">المرحلة ${esc(STAGE_NAMES[a.stage] || a.stage || "")}</span>${gradeChip(a.grade)}</span></div>
        <div class="muted" style="font-size:12px; margin:4px 0;">${a.createdAt ? fmtTs(a.createdAt) : ""}</div>
        <div class="btnrow"><button type="button" class="btn sm red" data-adel="${a.id}">حذف</button></div>
      </div>`).join("") : `<p class="muted center">لسه مفيش إعلانات — اكتب أول إعلان فوق.</p>`}
    </div>
    ${closing()}`;
  bindTeacherTabs();
  document.getElementById("an-stage").onchange = (e) => { annStageSel = e.target.value; annGradeSel = ""; renderTeacherAnnouncements(); };
  document.getElementById("an-grade").onchange = (e) => annGradeSel = e.target.value;
  document.getElementById("an-send").onclick = async () => {
    const text = document.getElementById("an-text").value.trim();
    const m = document.getElementById("an-msg");
    if (!text) { m.className = "msg bad"; m.textContent = "اكتب نص الإعلان الأول."; return; }
    if (!annStageSel) { m.className = "msg bad"; m.textContent = "مفيش مرحلة مسجل فيها — راجع الأدمن."; return; }
    const btn = document.getElementById("an-send");
    btn.disabled = true;
    try {
      await fbDb.collection("announcements").add({
        teacherId: fbUser.uid,
        teacherName: (fbProfile && fbProfile.name) || "",
        subject: (fbProfile && fbProfile.subject) || "",
        stage: annStageSel,
        grade: annGradeSel || "",
        text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await renderTeacherAnnouncements();
    } catch (e) {
      btn.disabled = false;
      m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e);
    }
  };
  document.querySelectorAll("[data-adel]").forEach((b) => b.onclick = async () => {
    if (!confirm("تحذف الإعلان ده؟")) return;
    try { await fbDb.collection("announcements").doc(b.dataset.adel).delete(); await renderTeacherAnnouncements(); }
    catch (e) { alert("مشكلة: " + (e.message || e)); }
  });
  window.scrollTo(0, 0);
}

/* ---------- ملاحظات المعلم الخاصة على كل طالب ---------- */
async function openStudentNotes(sid) {
  const s = (teacherCache || []).find((x) => x.id === sid);
  if (!s) return;
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `<div class="detailcard" style="max-height:85vh; overflow-y:auto; max-width:520px;">
    <h3>📝 ملاحظات عن: ${esc(s.name || "")}</h3>
    <p class="muted">بنحمل الملاحظات...</p>
  </div>`;
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  let notes = [];
  try {
    const snap = await fbDb.collection("studentNotes").where("teacherId", "==", fbUser.uid).where("studentId", "==", sid).get();
    notes = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));
  } catch (e) {
    ov.querySelector(".muted").textContent = "مشكلة في التحميل: " + (e.message || e);
    return;
  }
  const card = ov.querySelector(".detailcard");
  card.innerHTML = `
    <h3>📝 ملاحظات عن: ${esc(s.name || "")}</h3>
    <p class="muted" style="font-size:12.5px; margin-top:0;">الملاحظات دي خاصة بيك انت بس — الطالب ولا أي معلم تاني يقدر يشوفها.</p>
    <div id="nt-list">
    ${notes.length ? notes.map((n) => `
      <div style="border:1px solid var(--line); border-radius:12px; padding:10px; margin-bottom:8px;">
        <div style="font-size:14px; white-space:pre-wrap;">${esc(n.text || "")}</div>
        <div class="muted" style="font-size:12px;">${n.createdAt ? fmtTs(n.createdAt) : ""} · <a href="javascript:void(0)" data-ndel="${n.id}" style="color:#dc2626;">حذف</a></div>
      </div>`).join("") : `<p class="muted center">مفيش ملاحظات على الطالب ده لسه.</p>`}
    </div>
    <label class="flabel">ملاحظة جديدة</label>
    <textarea id="nt-text" class="inp" rows="2" placeholder="اكتب ملاحظة..."></textarea>
    <p class="msg" id="nt-msg" style="margin:4px 0;"></p>
    <div class="btnrow" style="margin-top:8px;">
      <button type="button" class="btn" id="nt-save">حفظ الملاحظة</button>
      <button type="button" class="btn ghost" id="nt-close">قفل</button>
    </div>`;
  card.querySelector("#nt-close").onclick = () => ov.remove();
  card.querySelectorAll("[data-ndel]").forEach((b) => b.onclick = async () => {
    try {
      await fbDb.collection("studentNotes").doc(b.dataset.ndel).delete();
      ov.remove();
      openStudentNotes(sid);
    } catch (e) { alert("مشكلة: " + (e.message || e)); }
  });
  card.querySelector("#nt-save").onclick = async () => {
    const text = card.querySelector("#nt-text").value.trim();
    const m = card.querySelector("#nt-msg");
    if (!text) { m.className = "msg bad"; m.textContent = "اكتب الملاحظة الأول."; return; }
    const btn = card.querySelector("#nt-save");
    btn.disabled = true;
    try {
      await fbDb.collection("studentNotes").add({
        teacherId: fbUser.uid,
        studentId: sid,
        text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      ov.remove();
      openStudentNotes(sid);
    } catch (e) {
      btn.disabled = false;
      m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e);
    }
  };
}

/* ---------- تاب حسابي (المدرس) ----------
   صورته (بتظهر لطلابه جنب اسمه)، إحصائياته، بياناته للقراءة، وتغيير الباسورد.
   الصورة بتتصغّر في المتصفح وتتحفظ في ملفه (teachers) والنسخة العامة (teachersPublic)
   عشان تظهر للطلاب — زي صورة الطالب بالظبط. */
function tMyAvatar(size) {
  const av = (fbProfile && (fbProfile.avatar || fbProfile.photoData)) || "";
  const nm = ((fbProfile && fbProfile.name) || "").trim();
  if (av) return `<img src="${av}" alt="" style="width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; display:inline-block; vertical-align:middle; border:2px solid var(--primary-soft);">`;
  return `<span style="width:${size}px; height:${size}px; border-radius:50%; background:var(--primary); color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:${Math.round(size * 0.45)}px; font-weight:800; vertical-align:middle;">${esc(nm ? nm[0] : "؟")}</span>`;
}

async function renderTeacherProfile() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = `<div class="spin">بنحمل حسابك...</div>`;
  try { await teacherLoadLessons(); }
  catch (e) { app.innerHTML = `<p class="msg bad">مشكلة في التحميل: ${esc(e.message || e)}</p>`; return; }
  const t = fbProfile || {};
  const approved = (teacherCache || []).filter((s) => s.status === "approved");
  const row = (lbl, val, ltr) => `<div class="btnrow" style="justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:8px;"><span class="muted">${lbl}</span><b ${ltr ? 'class="ltr"' : ""}>${esc(val)}</b></div>`;
  app.innerHTML = `
    <div class="hdr">
      <h1 style="display:flex; align-items:center; gap:10px;">${tMyAvatar(44)} حسابي</h1>
    </div>
    ${teacherTabs("profile")}
    <div class="card center" style="padding:28px;">
      ${tMyAvatar(120)}
      <h2 style="margin:10px 0 2px; font-size:20px;">${esc(t.name || "")}</h2>
      <div class="muted">${esc(t.subject || "")}${(t.stages || []).length ? " · " + esc(t.stages.join("، ")) : ""}</div>
      <div class="btnrow" style="justify-content:center; margin-top:12px;">
        <button type="button" class="btn sm" id="tp-pick">📷 ${(t.avatar || t.photoData) ? "تغيير الصورة" : "إضافة صورة"}</button>
        ${(t.avatar || t.photoData) ? `<button type="button" class="btn sm ghost" id="tp-del">حذف الصورة</button>` : ""}
      </div>
      <input type="file" id="tp-file" accept="image/*" style="display:none;">
      <div class="muted" style="font-size:12px; margin-top:6px;">صورتك بتظهر لطلابك جنب اسمك — أي صورة من موبايلك تنفع، بتتصغّر لوحدها.</div>
      <p class="msg" id="tp-msg"></p>
    </div>
    <div class="statcards">
      <div class="statcard"><div class="num">${approved.length}</div><div class="lbl">طالب مقبول</div></div>
      <div class="statcard"><div class="num">${(teacherLessons || []).length}</div><div class="lbl">درس</div></div>
      <div class="statcard"><div class="num">${(teacherQuizzes || []).length}</div><div class="lbl">كويز</div></div>
      <div class="statcard"><div class="num">${(teacherExams || []).length}</div><div class="lbl">امتحان</div></div>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">بياناتك</h2>
      <div style="display:grid; gap:10px; margin-top:10px;">
        ${row("الاسم", t.name || "—")}
        ${row("المادة", t.subject || "—")}
        ${row("المراحل", (t.stages || []).join("، ") || "—")}
        ${row("الإيميل", fbUser.email || "—", true)}
        ${row("الموبايل", t.phone || "—", true)}
      </div>
      <p class="muted" style="font-size:12.5px; margin-top:12px;">الاسم والمادة والمراحل بيتحدثوا من الأدمن — لو في حاجة غلط كلّمه.</p>
    </div>
    <div class="card">
      <h2 style="font-size:18px; margin-top:0;">🔒 الباسورد</h2>
      <div class="btnrow">
        <button type="button" class="btn ghost sm" id="tp-pass">تغيير الباسورد</button>
        <span class="muted" style="font-size:13px;">هيوصلك إيميل بلينك تغيير الباسورد.</span>
      </div>
      <p class="msg" id="tp-pass-msg"></p>
    </div>
    ${closing()}`;
  bindTeacherTabs();
  const msg = document.getElementById("tp-msg");
  document.getElementById("tp-pick").onclick = () => document.getElementById("tp-file").click();
  document.getElementById("tp-file").onchange = (e) => tAvatarSave(e.target.files && e.target.files[0], msg);
  const del = document.getElementById("tp-del");
  if (del) del.onclick = async () => {
    if (!confirm("متأكد إنك عايز تحذف صورتك؟")) return;
    try {
      const batch = fbDb.batch();
      batch.update(fbDb.collection("teachers").doc(fbUser.uid), {
        avatar: firebase.firestore.FieldValue.delete(),
        photoData: firebase.firestore.FieldValue.delete(),
      });
      batch.update(fbDb.collection("teachersPublic").doc(fbUser.uid), { avatar: firebase.firestore.FieldValue.delete() });
      await batch.commit();
      fbProfile.avatar = null;
      fbProfile.photoData = null;
      renderTeacherProfile();
    } catch (e) { msg.className = "msg bad"; msg.textContent = "مشكلة في الحذف: " + (e.message || e); showToast("مشكلة في الحذف: " + (e.message || e), "bad"); }
  };
  document.getElementById("tp-pass").onclick = async () => {
    const m = document.getElementById("tp-pass-msg");
    try {
      await fbAuth.sendPasswordResetEmail(fbUser.email);
      m.className = "msg good";
      m.textContent = "اتبعت إيميل تغيير الباسورد لـ " + fbUser.email + " ✅";
      showToast("اتبعت إيميل تغيير الباسورد لـ " + fbUser.email, "good");
    } catch (e) {
      m.className = "msg bad";
      m.textContent = authErrAr(e);
      showToast(authErrAr(e), "bad");
    }
  };
  window.scrollTo(0, 0);
}

// تصغير صورة المدرس وحفظها في ملفه وفي النسخة العامة (بتظهر لطلابه)
function tAvatarSave(file, msg) {
  if (!file) return;
  if (!file.type || !file.type.startsWith("image/")) {
    msg.className = "msg bad"; msg.textContent = "اختار ملف صورة.";
    showToast("اختار ملف صورة.", "bad");
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
        const batch = fbDb.batch();
        batch.update(fbDb.collection("teachers").doc(fbUser.uid), { avatar: dataUrl });
        batch.update(fbDb.collection("teachersPublic").doc(fbUser.uid), { avatar: dataUrl });
        await batch.commit();
        fbProfile.avatar = dataUrl;
        showToast("اتحفظت صورتك ✅", "good");
        renderTeacherProfile();
      } catch (e) { msg.className = "msg bad"; msg.textContent = "مشكلة في الحفظ: " + (e.message || e); showToast("مشكلة في الحفظ: " + (e.message || e), "bad"); }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
