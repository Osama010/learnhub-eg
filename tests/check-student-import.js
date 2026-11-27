/* اختبار إضافة الطلاب بواسطة المدرس: دومين الاستيراد (CSV/Excel) + use cases على memory fakes + قارئ xlsx. تشغيل: node tests/check-student-import.js */
const path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, "..");
(async () => {
  const rules0 = require("fs").readFileSync(root + "/docs/firestore.rules", "utf8");
  let n = 0; const ok = (c, m) => { assert(c, m); n++; };
  const D = await import(root + "/src/domain/student-import.js");
  const { createUseCases, ExistingStudentError } = await import(root + "/src/application/usecases.js");
  const { memoryRepositories } = await import(root + "/src/infrastructure/memory/repositories.js");
  const { readXlsxRows } = await import(root + "/src/shared/xlsx-read.js");

  // ---- CSV
  ok(D.parseCsv("\uFEFFa,b\r\n\"x, y\",\"q\"\"z\"\r\n\r\n")[1].join("|") === "x, y|q\"z", "CSV: BOM + اقتباس + فاصلة جوه الخلية + صف فاضي");
  ok(D.parseCsv("a;b;c\n1;2;3")[1].join() === "1,2,3", "CSV: فاصلة منقوطة");
  ok(D.parseCsv("a\tb\n1\t2")[1].join() === "1,2", "CSV: تاب");
  // ---- الصفوف
  const G = "الصف الأول الثانوي";
  const tpl = D.prepareImport(D.parseCsv(D.templateCsv()));
  ok(tpl.rows.length === 0 && !tpl.error, "النموذج: صف المثال بيتجاهل");
  const head = "الاسم,الإيميل,الصف,رقم الطالب,رقم ولي الأمر\n";
  const r1 = D.prepareImport(D.parseCsv(head + [
    "أحمد علي,Ahmed@X.com,أولى ثانوي,01012345678,+201098765432",
    "سارة خالد,sara@x.com,اولى ثانوى,,",
    ",no@x.com,أولى ثانوي,,",
    "منى,mona@gmial,أولى ثانوي,,",
    "عمر سامي,omar@x.com,سنة غريبة,,",
    "هدى أحمد,,أولى ثانوي,,",
    "كريم حسن,karim@x.com,أولى ثانوي,0123,",
    "نور محمد,nour@x.com,أولى ثانوي,01012345678,01012345678",
    "ياسر عادل,AHMED@x.com,أولى ثانوي,,",
    "بسمة,basma@x.com,الصف الثالث الإعدادي,,",
  ].join("\n")));
  const byLine = (l) => r1.rows.find((r) => r.line === l);
  ok(!byLine(2).error && byLine(2).email === "ahmed@x.com" && byLine(2).grade === G && byLine(2).phone === "01012345678" && byLine(2).parentPhone === "01098765432", "صف سليم بيتنضف (إيميل lowercase، صف، أرقام)");
  ok(!byLine(3).error && byLine(3).grade === G, "صف بكتابة عربية حرة للصف");
  ok(/مفيش اسم/.test(byLine(4).error) && /شكله غلط/.test(byLine(5).error) && /مش معروف/.test(byLine(6).error) && /مفيش إيميل/.test(byLine(7).error) && /رقم الطالب/.test(byLine(8).error) && /نفس رقم/.test(byLine(9).error) && /مكرر/.test(byLine(10).error), "كل سبب خطأ بيظهر برسالته");
  ok(r1.validCount === 3 && r1.badCount === 7 && !r1.tooMany, "العدّاد: " + r1.validCount + "/" + r1.badCount);
  const r2 = D.prepareImport(D.parseCsv(head + "بسمة,basma@x.com,الصف الثالث الإعدادي,,"), { allowedGrades: [G] });
  ok(/مش من صفوفك/.test(r2.rows[0].error), "صف خارج صفوف المدرس");
  const r3 = D.prepareImport(D.parseCsv("name,email\nZed Ali,z@x.com"), { defaultGrade: G });
  ok(!r3.error && !r3.rows[0].error && r3.rows[0].grade === G, "ملف من غير عمود الصف + صف افتراضي، وعناوين إنجليزي");
  const r4 = D.prepareImport(D.parseCsv("name,email\nZed Ali,z@x.com"));
  ok(/مفيش صف/.test(r4.rows[0].error), "من غير صف ولا افتراضي = مشكلة");
  ok(/عمود الإيميل/.test(D.prepareImport(D.parseCsv("a,b\n1,2")).error) && /فاضي/.test(D.prepareImport([]).error), "ملف من غير عمود إيميل/فاضي");
  const noHead = D.prepareImport(D.parseCsv("سامي حسن,sami@x.com," + G + ",,"));
  ok(!noHead.error && noHead.rows.length === 1 && noHead.rows[0].line === 1, "ملف من غير صف عناوين (الإيميل في الصف الأول)");
  const many = D.prepareImport(D.parseCsv(head + Array.from({ length: 101 }, (_, i) => "طالب رقم " + i + ",s" + i + "@x.com," + G + ",,").join("\n")));
  ok(many.tooMany && many.validCount === 101, "أكتر من الحد المسموح");
  const ps = D.presentSingleStudent({ name: "  ليلى  حسن ", email: "L@X.com", grade: G, phone: "", parentPhone: "" });
  ok(ps.values && ps.values.name === "ليلى حسن" && ps.values.email === "l@x.com", "فورم واحد: نفس القواعد");
  ok(D.presentSingleStudent({ name: "ليلى", email: "bad", grade: G }).error, "فورم واحد: خطأ");
  ok(D.matchGrade("تالتة اعدادي") === "الصف الثالث الإعدادي" && D.matchGrade("3 ثانوي") === "الصف الثالث الثانوي" && D.matchGrade("رابعة ابتدائي") === "الصف الرابع الابتدائي" && D.matchGrade("xyz") === null, "مطابقة الصف");
  ok(D.importErrorReason({ code: "auth/too-many-requests" }).includes("Firebase") && D.isStopError({ code: "auth/too-many-requests" }) && !D.isStopError({ code: "auth/invalid-email" }), "أخطاء Firebase");
  ok(D.failedRowsCsv([{ status: "failed", name: "أ", email: "a@x.com", grade: G, reason: "س, ب" }, { status: "created", name: "ب" }]).includes('"س, ب"') && !D.failedRowsCsv([{ status: "created", name: "ZZZ" }]).includes("ZZZ"), "ملف الفاشلين فيه الفاشلين بس");

  // ---- Excel
  const bytes = new Uint8Array(Buffer.from("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", "base64"));
  const xr = await readXlsxRows(bytes);
  ok(xr.length === 3 && xr[1][1] === "Sara@Gmail.com" && xr[1][3] === "1012345678" && xr[2][0] === "علي & حسن" && xr[2][2] === "الصف الثالث الإعدادي", "xlsx: قراءة نصوص وأرقام وعلامات XML");
  const xp = D.prepareImport(xr);
  ok(xp.validCount === 2 && xp.rows[0].grade === G && xp.rows[0].phone === "01012345678" && xp.rows[0].parentPhone === "01098765432" && xp.rows[0].email === "sara@gmail.com", "xlsx: أرقام عربية وبدون صفر أول");
  let bad = false; try { await readXlsxRows(new Uint8Array([1, 2, 3, 4])); } catch (e) { bad = /Excel/.test(e.message); } ok(bad, "xlsx: ملف مش سليم");

  // ---- use cases
  const mk = () => { const { repos, db, log } = memoryRepositories(); return { uc: createUseCases({ ...repos, hashPin: async (t) => "h:" + t }), db, log }; };
  const rows = (arr) => arr.map((e, i) => ({ line: i + 2, name: "طالب " + e, email: e + "@x.com", grade: G, phone: "", parentPhone: "" }));
  const noSleep = { sleep: async () => {}, gapMs: 0 };
  {
    const { uc, db } = mk();
    const res = await uc.importStudents("tA", rows(["a", "b", "c"]), noSleep);
    ok(res.every((r) => r.status === "created") && db.students.size === 3, "استيراد 3 طلاب");
    const s = db.students.get("auth-a@x.com");
    ok(s.teacherIds.join() === "tA" && s.status === "approved" && s.addedBy === "tA" && s.authLinked === true && !s.pinHash && db.lookups.get("a@x.com").studentId === "auth-a@x.com" && db.lookups.get("a@x.com").status === "approved", "ملف الطالب والفهرس مربوطين بالمدرس");
    const allowed = ["name", "email", "grade", "phone", "parentPhone", "teacherIds", "status", "authLinked", "addedBy", "createdAt"];
    ok(Object.keys(s).every((k) => allowed.includes(k)) && ["name", "email", "grade", "teacherIds", "status", "authLinked", "addedBy"].every((k) => k in s), "مفاتيح ملف الطالب مطابقة لقاعدة Firestore (createdAt بيضيفه طبقة Firebase، متغطى في check-infra)");
    const lkAllowed = (rules0.match(/match \/registrationLookup[\s\S]*?hasOnly\(\[([^\]]*)\]/) || [])[1] || "";
    ok(Object.keys(db.lookups.get("a@x.com")).every((k) => lkAllowed.includes('"' + k + '"')), "مفاتيح الفهرس مطابقة للقاعدة: " + Object.keys(db.lookups.get("a@x.com")).join());
    ok(db.resets.length === 3 && db.resets.includes("b@x.com"), "إيميل اختيار الباسورد لكل طالب");
    const again = await uc.importStudents("tA", rows(["a", "d"]), noSleep);
    ok(again[0].status === "existing" && /بالفعل في طلابك/.test(again[0].reason) && again[1].status === "created", "نفس الإيميل تاني عند نفس المدرس = موجود");
    const other = await uc.importStudents("tB", rows(["a"]), noSleep);
    ok(other[0].status === "existing" && /لينك دعوتك/.test(other[0].reason) && db.students.get("auth-a@x.com").teacherIds.join() === "tA", "إيميل عند مدرس تاني = موجود ومفيش تعديل على حسابه");
    db.lookups.set("p@x.com", { status: "pending", teacherIds: ["tA"], studentId: "s1" });
    const pend = await uc.importStudents("tA", rows(["p"]), noSleep);
    ok(pend[0].status === "existing" && /الطلبات الجديدة/.test(pend[0].reason), "طلب تسجيل معلّق عند نفس المدرس");
  }
  {
    const { uc, db } = mk();
    db.authUsers = new Map([["g@x.com", "x"]]);
    const r = await uc.importStudents("tA", rows(["g"]), noSleep);
    ok(r[0].status === "existing" && /مستخدم في حساب تاني/.test(r[0].reason) && db.students.size === 0, "الإيميل في Auth من غير فهرس = موجود، ومفيش ملف اتكتب");
  }
  {
    const { uc, db } = mk();
    db.mailFail = true;
    const r = await uc.importStudents("tA", rows(["m"]), noSleep);
    ok(r[0].status === "created" && r[0].emailSent === false && /إعادة إرسال/.test(r[0].reason), "فشل إرسال الإيميل: الحساب اتعمل والرسالة بتقول أعد الإرسال");
  }
  {
    const { uc, db } = mk();
    let calls = 0; const orig = db.authFail;
    const repos2 = memoryRepositories(); const real = repos2.repos.auth.createManagedUser;
    repos2.repos.auth.createManagedUser = async (e) => { calls++; if (calls === 3) { const x = new Error("q"); x.code = "auth/too-many-requests"; throw x; } return real(e); };
    const uc2 = createUseCases({ ...repos2.repos, hashPin: async (t) => "h:" + t });
    const r = await uc2.importStudents("tA", rows(["a", "b", "c", "d", "e"]), noSleep);
    ok(r.map((x) => x.status).join() === "created,created,failed,skipped,skipped" && /Firebase/.test(r[2].reason) && calls === 3 && repos2.db.students.size === 2, "حد Firebase: بيقف، والباقي ماتعملوش (مش بيحاول)");
  }
  {
    const { uc, db } = mk();
    let k = 0;
    const r = await uc.importStudents("tA", rows(["a", "b", "c"]), { ...noSleep, shouldStop: () => k++ >= 1 });
    ok(r.map((x) => x.status).join() === "created,skipped,skipped" && db.students.size === 1, "زرار الإيقاف");
  }
  {
    const { uc, db } = mk();
    db.failLink = true;
    const r = await uc.importStudents("tA", rows(["o"]), noSleep);
    ok(r[0].status === "failed" && /حفظ ملف الطالب فشل/.test(r[0].reason) && db.students.size === 0, "حساب اتعمل وحفظ الملف فشل: بيتبلّغ بوضوح");
  }
  {
    const { uc } = mk(); const seen = [];
    await uc.importStudents("tA", rows(["a", "b"]), { ...noSleep, onProgress: (i, n, r) => seen.push(i + "/" + n + ":" + r.status) });
    ok(seen.join() === "1/2:created,2/2:created", "تقدّم الإضافة");
  }
  // ---- قواعد Firestore (نص)
  const rules = require("fs").readFileSync(root + "/docs/firestore.rules", "utf8");
  ok(/function teacherAddsStudent\(\)/.test(rules), "الدالة teacherAddsStudent موجودة");
  const stuCreate = rules.split("match /students/")[1].split("allow create:")[1].split(";")[0];
  ok(/teacherAddsStudent\(\)/.test(stuCreate) && !/isTeacher\(\)/.test(stuCreate), "إنشاء الطلاب: الشرط الضيق بدل isTeacher() المفتوح");
  const lkCreate = rules.split("match /registrationLookup/")[1].split("allow create:")[1].split(";")[0];
  ok(/hasOnly|keys\(\)/.test(rules.split("match /registrationLookup/")[1]) && /addedBy == request\.auth\.uid/.test(lkCreate.replace(/\s+/g, " ")) && !/isTeacher\(\)\s*\|\|/.test(lkCreate), "فهرس التسجيل: المدرس مقيّد (مفاتيح + addedBy + approved)");
  console.log("student-import: all pass (" + n + ")");
})().catch((e) => { console.log("student-import FAIL:", e && e.stack || e); process.exit(1); });
