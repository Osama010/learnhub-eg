/* اختبار طلبات تسجيل المدرسين: قالب كارت الأدمن + نص القواعد. تشغيل: node tests/check-teacher-signup.js */
const assert = require("assert"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
(async () => {
  let n = 0; const ok = (c, m) => { assert(c, m); n++; };
  const TP = await import(root + "/src/core/templates.js");
  TP.parseTemplates(fs.readFileSync(root + "/src/features/admin/teachers.html", "utf8"));
  TP.parseTemplates(fs.readFileSync(root + "/src/features/auth/teacher-signup.html", "utf8"));
  const { gradesSummary } = await import(root + "/src/features/auth/teacher-signup.presenter.js");
  const esc = (s) => String(s).replace(/</g, "&lt;");
  const g = { id: "a@b.com", name: "أحمد <b>", subject: "رياضيات", email: "a@b.com", phone: "01012345678", bio: "خبرة", grades: ["الصف الأول الإعدادي", "الصف الثاني الإعدادي", "الصف الثالث الإعدادي", "الصف الثالث الثانوي"] };
  const html = TP.T("admin.signupsCard", { esc, gradesSummary, signups: [g], signupsError: "" });
  ok(html.includes('data-sg-ok="a@b.com"') && html.includes('data-sg-no="a@b.com"') && html.includes("كل صفوف الإعدادي، الثالث الثانوي") && html.includes("&lt;b>") && !html.includes("<b>أحمد <b>"), "كارت الطلب: أزرار وصفوف ومنع HTML");
  ok(TP.T("admin.signupsCard", { esc, gradesSummary, signups: [], signupsError: "" }).trim() === "", "مفيش طلبات = مفيش كارت");
  ok(TP.T("admin.signupsCard", { esc, gradesSummary, signups: [], signupsError: "permission-denied" }).includes("permission-denied"), "خطأ التحميل بيظهر للأدمن");
  const GR = (await import(root + "/src/domain/student.js")).GRADES, SG = await import(root + "/src/features/auth/teacher-signup.presenter.js");
  const form = TP.T("auth.renderTeacherSignup", { GRADES: GR, LOGO_FULL_SVG: "", SIGNUP_STAGES: SG.SIGNUP_STAGES, closing: () => "", gradesOfStage: (await import(root + "/src/domain/student.js")).gradesOfStage, themeIcon: () => "" });
  ok((form.match(/class="ts-grade"/g) || []).length === 12 && (form.match(/class="ts-stage-all"/g) || []).length === 3, "الفورم فيه 12 صف و3 مراحل");
  for (const f of ["docs/firestore.rules", "docs/firestore-rules.txt"]) {
    const r = fs.readFileSync(root + "/" + f, "utf8");
    ok(r.includes("match /teacherSignups/{signupId}") && /allow get, list, update, delete: if isAdmin\(\);/.test(r.split("match /teacherSignups/")[1]), f + ": قاعدة teacherSignups");
    ok((r.match(/\{/g) || []).length === (r.match(/\}/g) || []).length, f + ": الأقواس متزنة");
  }
  console.log("teacher-signup:" + n + " passed");
})().catch((e) => { console.log("teacher-signup FAIL", e.message); process.exit(1); });
