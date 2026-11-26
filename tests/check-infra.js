/* اختبار الـ infrastructure/firebase بالكامل على Firestore وهمي في الذاكرة (tests/lib/fake-firestore.js).
   كل دالة مصدّرة لازم تتنادى ويتأكد من أثرها على البيانات، وفي النهاية بنتأكد إن مفيش دالة اتنسيت. */
const path = require("path"), fs = require("fs"), assert = require("assert");
const root = path.resolve(__dirname, "..");
(async () => {
  const fake = require("./lib/fake-firestore.js").install();
  globalThis.document = { getElementById: () => null, addEventListener() {}, querySelector: () => null, documentElement: { dataset: {} } };
  globalThis.window = globalThis; globalThis.localStorage = { getItem: () => null, setItem() {} };
  globalThis.firebase = fake.firebase;
  (await import(root + "/src/infrastructure/firebase/client.js")).openFirebaseClient({});
  const dir = root + "/src/infrastructure/firebase/";
  const called = new Set(), exported = new Set();
  const load = async (f) => {
    const mod = await import(dir + f + ".js"), w = {};
    for (const [k, fn] of Object.entries(mod)) { if (typeof fn !== "function") continue; exported.add(f + "." + k); w[k] = (...a) => { called.add(f + "." + k); return fn(...a); }; }
    return w;
  };
  const M = {};
  for (const f of ["activity", "admins", "announcements", "auth", "batch", "exams", "lessons", "library", "mapping", "notes", "queries", "quizzes", "requests", "settings", "students", "subjects", "teachers", "values"]) M[f] = await load(f);
  const { col, ops } = fake; let n = 0;
  const ok = (c, m) => { assert(c, m); n++; };
  const T = (s) => new firebase.firestore.Timestamp(s * 1000);
  const ids = async (p) => (await p).map((x) => x.id).sort();

  // ---- students + lookups
  const { students: S, requests: R, batch: B, mapping: MP } = M;
  const ref = await S.addStudent({ name: "أ", teacherIds: ["t1"], status: "pending", createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  ok(ref.id && col("students").get(ref.id).createdAt.seconds > 0, "addStudent + serverTimestamp");
  await S.setStudent("s2", { name: "ب", teacherIds: ["t1", "t2"], status: "approved", createdAt: T(5) });
  await S.setStudent("s3", { name: "ج", teacherIds: ["t2"], status: "approved", createdAt: T(9e9) });
  ok((await S.getStudent("s2")).name === "ب" && (await S.getStudent("nope")) === null, "getStudent / null");
  ok((await ids(S.listStudentsOfTeacher("t1"))).join() === [ref.id, "s2"].sort().join(), "array-contains");
  ok((await S.listAllStudentsNewestFirst()).map((x) => x.id)[0] === "s3", "orderBy desc");
  await S.updateStudent("s2", { grade: "g1" }); ok((await S.getStudent("s2")).grade === "g1", "updateStudent");
  let threw = false; try { await S.updateStudent("ghost", { a: 1 }); } catch (e) { threw = true; } ok(threw, "update على مستند مش موجود بيرمي");
  threw = false; try { await S.setStudent("s9", { a: undefined }); } catch (e) { threw = true; } ok(threw, "undefined مرفوض");
  await S.setLookup("a@x.com", { status: "pending", studentId: "s2", teacherIds: ["t1"], pinHash: "h" });
  ok((await S.getLookup("a@x.com")).studentId === "s2" && (await S.getLookup("z@x.com")) === null, "lookup");
  await S.updateLookup("a@x.com", { status: "approved" }); ok(col("registrationLookup").get("a@x.com").status === "approved", "updateLookup");
  let b = B.newBatch();
  S.batchUpdateStudent(b, "s2", { status: "suspended" }); S.batchUpdateLookup(b, "a@x.com", { status: "suspended" });
  S.batchSetLookup(b, "b@x.com", { status: "pending" }); S.batchDeleteLookup(b, "b@x.com");
  ok(col("students").get("s2").status === "approved", "الدفعة مبتكتبش قبل commit"); await b.commit();
  ok(col("students").get("s2").status === "suspended" && col("registrationLookup").get("a@x.com").status === "suspended" && !col("registrationLookup").has("b@x.com"), "batch students/lookups");
  b = B.newBatch(); S.batchDeleteStudent(b, "s3"); await b.commit(); ok(!col("students").has("s3"), "batchDeleteStudent");
  await S.deleteStudent("s2"); ok(!col("students").has("s2"), "deleteStudent");
  // wipeByStudent / detach
  const A = M.activity;
  await A.saveAttempt("a1", { studentId: "sx", teacherId: "t1", score: 1 }); await A.saveAttempt("a2", { studentId: "sx", teacherId: "t2" }); await A.saveAttempt("a3", { studentId: "sy", teacherId: "t1" });
  await A.saveRating("sx", "L1", { studentId: "sx", lessonId: "L1", teacherId: "t1", stars: 5 }); ok(col("lessonRatings").has("sx_L1"), "saveRating id");
  ok((await S.wipeByStudent("quizAttempts", "sx")) === 2 && col("quizAttempts").size === 1, "wipeByStudent");
  await S.setStudent("d1", { teacherIds: ["tz", "t9"] }); await S.setStudent("d2", { teacherIds: ["tz"] });
  ok((await S.detachTeacherFromStudents("tz")) === 2 && col("students").get("d1").teacherIds.join() === "t9" && col("students").get("d2").teacherIds.length === 0, "detachTeacherFromStudents");

  // ---- activity
  ok((await ids(A.listAttemptsOfTeacher("t1"))).join() === "a3", "listAttemptsOfTeacher");
  ok((await ids(A.listAttemptsOfStudent("sy"))).join() === "a3", "listAttemptsOfStudent");
  ok((await ids(A.listRatingsOfTeacher("t1"))).join() === "sx_L1" && (await ids(A.listRatingsOfStudent("sx"))).join() === "sx_L1", "ratings lists");
  const act = await A.addActivity({ teacherId: "t1", studentId: "sy", points: 3 }); await A.addActivity({ teacherId: "t2", points: 1 });
  ok(act.id && (await A.listActivityOfTeacher("t1")).length === 1 && (await A.listActivityOfTeacher("t1"))[0].points === 3, "activity plain");
  ok((await A.listActivityOfTeachers(["t1", "t2"])).length === 2, "listActivityOfTeachers in");
  await S.setStudent("m1", { name: "م" }); await A.markStudentActiveDay("m1", { lastActive: "2026-01-01" }); ok(col("students").get("m1").lastActive === "2026-01-01", "markStudentActiveDay");

  // ---- requests
  await R.createTeacherRequest("sa", "tb", { studentId: "sa", teacherId: "tb", status: "pending" }); ok(col("teacherRequests").has("sa_tb"), "createTeacherRequest");
  ok((await R.listPendingRequestsOfTeacher("tb")).length === 1 && (await R.listRequestsOfStudent("sa")).length === 1, "list requests");
  b = B.newBatch(); R.batchSetRequestStatus(b, "sa_tb", "accepted"); await b.commit();
  ok((await R.listPendingRequestsOfTeacher("tb")).length === 0 && col("teacherRequests").get("sa_tb").status === "accepted", "batchSetRequestStatus");
  await R.deleteTeacherRequest("sa_tb"); ok(col("teacherRequests").size === 0, "deleteTeacherRequest");

  // ---- teachers
  const Tc = M.teachers;
  ok((await Tc.getTeacher("nobody")) === null, "getTeacher missing -> null");
  b = B.newBatch(); Tc.batchSetTeacher(b, "t1", { name: "م1", createdAt: T(1) }, { name: "م1", email: "m1@x.com", active: true }); Tc.batchSetTeacher(b, "t2", { name: "م2", createdAt: T(2) }, { name: "م2", email: "m2@x.com", active: false }); await b.commit();
  ok((await Tc.listTeachersNewestFirst())[0].id === "t2" && (await Tc.listTeachersPublic()).length === 2, "teachers lists");
  ok((await ids(Tc.listActiveTeachersPublic())).join() === "t1", "active public");
  ok((await Tc.getTeacher("t1")).name === "م1", "getTeacher existing");
  ok((await Tc.isTeacherEmailRegistered("m1@x.com")) === true && (await Tc.isTeacherEmailRegistered("no@x.com")) === false, "isTeacherEmailRegistered");
  ok((await ids(Tc.listTeachersPublicByIds(["t1", "t2", "t3"]))).join() === "t1,t2", "documentId in");
  b = B.newBatch(); Tc.batchUpdateTeacher(b, "t1", { phone: "1" }, { subject: "s" }); Tc.batchUpdateTeacherPublic(b, "t2", { avatar: "a" }); Tc.batchSetTeacherPublic(b, "t3", { name: "م3" }); await b.commit();
  ok(col("teachers").get("t1").phone === "1" && col("teachersPublic").get("t1").subject === "s" && col("teachersPublic").get("t2").avatar === "a" && col("teachersPublic").has("t3"), "teacher batches");
  await M.lessons.createLesson({ teacherId: "t1", title: "د" }); await M.lessons.createLesson({ teacherId: "t2", title: "د2" });
  ok((await Tc.wipeByTeacher("lessons", "t1")) === 1 && col("lessons").size === 1, "wipeByTeacher");
  b = B.newBatch(); Tc.batchDeleteTeacher(b, "t1"); await b.commit(); ok(!col("teachers").has("t1") && !col("teachersPublic").has("t1"), "batchDeleteTeacher");

  // ---- lessons / media / chunks
  const L = M.lessons;
  const lid = await L.createLesson({ teacherId: "t7", title: "ل", videoUrl: "v" });
  ok(typeof lid === "string" && col("lessons").get(lid).createdAt.seconds > 0 && (await L.getLesson(lid)).title === "ل" && (await L.getLesson("none")) === null, "createLesson/getLesson");
  await L.updateLesson(lid, { title: "ل2" }); ok(col("lessons").get(lid).title === "ل2" && !("videoUrl" in col("lessons").get(lid)), "updateLesson بيمسح videoUrl/pdfUrl");
  await L.setLessonPinned(lid, true); ok(col("lessons").get(lid).pinned === true, "pinned");
  await L.saveLessonMedia(lid, { teacherId: "t7", videoUrl: "u", pdfUrl: "", pdfFile: { chunks: 2 } });
  await L.saveLessonFileChunk(lid, 0, "t7", "AAA"); await L.saveLessonFileChunk(lid, 1, "t7", "BBB");
  ok((await M.queries.getLessonMedia(lid)).videoUrl === "u" && (await M.queries.getLessonFileChunk(lid, 1)).data === "BBB" && (await M.queries.getLessonFileChunk(lid, 5)) === null, "media/chunks");
  await L.deleteLessonFileChunks(lid, 1, 2); ok(col("lessonFileChunks").size === 1, "deleteLessonFileChunks");
  await L.deleteLessonMedia(lid); ok(col("lessonMedia").size === 0 && col("lessonFileChunks").size === 0, "deleteLessonMedia");
  await L.deleteLesson(lid); ok(!col("lessons").has(lid), "deleteLesson");

  // ---- exams / quizzes / announcements / notes / library / subjects
  const E = M.exams; await E.saveExam(null, { teacherId: "t1", title: "ا" });
  const eid = [...col("exams").keys()][0]; ok(col("exams").get(eid).createdAt.seconds > 0, "saveExam جديد");
  await E.saveExam(eid, { title: "ب" }); await E.setExamClosed(eid, true); ok(col("exams").get(eid).title === "ب" && col("exams").get(eid).closed === true, "saveExam/تعديل/close");
  ok((await ids(M.queries.listExamsOfTeacher("t1"))).length === 1, "listExamsOfTeacher"); await E.deleteExam(eid); ok(col("exams").size === 0, "deleteExam");
  const Q = M.quizzes; await Q.saveQuiz(null, { teacherId: "t1", lessonId: "L9", questions: [] });
  const qid = [...col("quizzes").keys()][0]; await Q.saveQuiz(qid, { title: "ك" });
  ok((await Q.listQuizzesOfLesson("L9")).length === 1 && (await M.queries.listQuizzesOfTeacher("t1")).length === 1 && col("quizzes").get(qid).title === "ك", "quizzes");
  await M.queries.addQuizRaw({ teacherId: "t1", lessonId: "L8" }); ok(col("quizzes").size === 2, "addQuizRaw");
  await Q.deleteQuiz(qid); ok(col("quizzes").size === 1, "deleteQuiz");
  await L.createLesson({ teacherId: "t1", quiz: [1] }); const lq = [...col("lessons").keys()].pop(); await M.queries.dropLessonQuizField(lq); ok(!("quiz" in col("lessons").get(lq)), "dropLessonQuizField");
  const AN = M.announcements; await AN.addAnnouncement({ teacherId: "t1", text: "x" }); await AN.addAnnouncement({ teacherId: "t1", text: "y" });
  ok((await AN.listTeacherAnnouncements("t1")).length === 2, "announcements"); await AN.deleteAnnouncement([...col("announcements").keys()][0]); ok(col("announcements").size === 1, "deleteAnnouncement");
  const NT = M.notes; await NT.addStudentNote("t1", "s1", "ن"); await NT.addStudentNote("t1", "s2", "ن2");
  ok((await NT.listStudentNotes("t1", "s1")).length === 1, "notes"); await NT.deleteStudentNote([...col("studentNotes").keys()][0]); ok(col("studentNotes").size === 1, "deleteStudentNote");
  const LB = M.library; await LB.saveLibraryItem(null, { title: "ك" }, "adm@x.com"); const lbid = [...col("library").keys()][0];
  ok(col("library").get(lbid).createdBy === "adm@x.com" && col("library").get(lbid).createdAt.seconds > 0, "saveLibraryItem جديد");
  await LB.saveLibraryItem(lbid, { title: "ك2" }); ok((await M.queries.listLibraryNewestFirst())[0].title === "ك2", "تعديل + listLibraryNewestFirst"); await LB.deleteLibraryItem(lbid); ok(col("library").size === 0, "deleteLibraryItem");
  const SB = M.subjects; await SB.addSubject({ name: "م", stage: "p", grade: "g1" }); const sbid = [...col("subjects").keys()][0];
  await SB.updateSubject(sbid, { name: "م2", stage: "p", grade: "g2" }); await SB.addCoreSubjects([{ name: "ع", stage: "p", grade: "g1" }, { name: "ر", stage: "p", grade: "g1" }]);
  ok(col("subjects").size === 3 && col("subjects").get(sbid).name === "م2" && col("subjects").get(sbid).core === false && (await M.queries.listSubjects()).filter((x) => x.core).length === 2, "subjects");
  ok((await M.queries.countByStage("subjects", "p")) === 3, "countByStage"); await SB.deleteSubject(sbid); ok(col("subjects").size === 2, "deleteSubject");

  // ---- settings / admins / queries متفرقة
  const ST = M.settings, QR = M.queries;
  await ST.setCurrentTerm(2); ok(col("settings").get("app").currentTerm === 2 && (await QR.getSettings("app")).currentTerm === 2, "setCurrentTerm/getSettings");
  await QR.setSettings("stats", { students: 5 }, { merge: true }); await QR.setSettings("stats", { teachers: 2 }, { merge: true });
  ok((await ST.getStatsSettings()).students === 5 && (await ST.getStatsSettings()).teachers === 2 && (await QR.getSettings("nope")) === null, "merge + getStatsSettings");
  ok(ST.isDataReady() === true, "isDataReady with an open client");
  await ST.publishBroadcast({ text: "إ", audience: "all", until: new Date("2030-01-01") }); ok((await QR.getBroadcast()).until.toDate().getFullYear() === 2030, "publishBroadcast");
  await ST.clearBroadcast(); ok((await QR.getBroadcast()) === null, "clearBroadcast");
  const AD = M.admins; const adoc = await AD.addAdmin("adm@x.com", "م", "النظام"); ok(adoc.email === "adm@x.com" && col("admins").has("adm@x.com"), "addAdmin");
  await AD.setAdminPinHash("adm@x.com", "HH"); ok((await QR.getAdmin("adm@x.com")).pinHash === "HH" && (await QR.listAdmins()).length === 1, "pin + getAdmin/listAdmins");
  await QR.setAdmin("b@x.com", { email: "b@x.com" }); ok((await QR.listAdmins()).length === 2, "setAdmin"); await AD.removeAdmin("b@x.com"); ok(!col("admins").has("b@x.com"), "removeAdmin");
  await QR.addAdminLog({ at: T(3), action: "a" }); await QR.addAdminLog({ at: T(8), action: "b" }); ok((await QR.listAdminLog())[0].action === "b", "adminLog desc");
  await QR.addPayment({ paidAt: T(1), amount: 5 }); const pr = QR.newPaymentRef(); await pr.set({ paidAt: T(7), amount: 9 }); ok((await QR.listPayments())[0].amount === 9 && pr.id, "payments + newPaymentRef");
  ok((await QR.listByTeacher("lessons", "t2")).length === 1 && (await QR.listByTeacherIn("lessons", ["t2", "t1"])).length >= 1, "listByTeacher/In");
  ok((await QR.listCreatedSince("lessons", "createdAt", T(0))).length >= 1 && (await QR.listLessonsOfTeacher("t2")).length === 1, "listCreatedSince/listLessonsOfTeacher");
  await M.queries.batchAddBankItem(b = B.newBatch(), { teacherId: "t1", q: "؟" }); await b.commit(); const bid = [...col("questionBank").keys()][0];
  b = B.newBatch(); QR.batchBumpBankUse(b, bid, 4); await b.commit();
  ok(col("questionBank").get(bid).useCount === 4 && (await QR.listBankOfTeacher("t1")).length === 1, "bank"); await QR.deleteBankItem(bid); ok(col("questionBank").size === 0, "deleteBankItem");

  // ---- auth + mapping
  const AU = M.auth;
  await AU.sendPasswordReset("p@x.com"); ok(ops.some((o) => o[0] === "resetEmail" && o[1] === "p@x.com"), "reset email");
  ok((await AU.signInWithPassword("e@x.com", "p")).user.email === "e@x.com" && (await AU.createAuthUser("n@x.com", "p")).user.email === "n@x.com" && (await AU.signInWithGoogle({})).user.uid === "uid-1", "sign in/up");
  await AU.signOutUser(); await AU.changeMyPassword("zzzzzz"); ok(AU.currentAuthUser().uid === "uid-1" && ops.some((o) => o[0] === "signOut"), "signOut/changeMyPassword/currentAuthUser");
  { let seen = null; AU.openSession({}); AU.onAuthChange((u) => { seen = u; }); ok(seen === null, "openSession/onAuthChange"); }
  ok(MP.one({ exists: false, data: () => ({}) }) === null && MP.rows({ docs: [{ id: "1", data: () => ({ a: 1 }) }] })[0].a === 1 && MP.plain({ docs: [{ id: "1", data: () => ({ a: 1 }) }] })[0].a === 1, "mapping");

  // ---- use cases فوق تنفيذ Firebase الحقيقي (repositories.js) على Firestore الوهمي: نفس سيناريوهات الـ memory
  {
    for (const c of [...fake.store.keys()]) fake.store.get(c).clear();
    const { createUseCases, DuplicateEmailError } = await import(root + "/src/application/usecases.js");
    const { firebaseRepositories } = await import(dir + "repositories.js");
    const uc = createUseCases({ ...firebaseRepositories(), hashPin: async (t) => "h:" + t, baseAdminEmail: "root@x.com" });
    const sid = await uc.registerStudent({ name: "أ", email: "a@x.com", grade: "g1", phone: "010", parentPhone: "011", pin: "1234", teacherIds: ["t1"] });
    ok(col("students").get(sid).status === "pending" && col("students").get(sid).pinHash === "h:a@x.com:1234" && col("students").get(sid).createdAt.seconds > 0 && col("registrationLookup").get("a@x.com").studentId === sid, "fb: registerStudent");
    let dup = false; try { await uc.registerStudent({ email: "a@x.com", pin: "1" }); } catch (e) { dup = e instanceof DuplicateEmailError; } ok(dup && col("students").size === 1, "fb: duplicate");
    await uc.changeStudentStatus({ id: sid, email: "A@x.com" }, "approved");
    ok(col("students").get(sid).status === "approved" && col("registrationLookup").get("a@x.com").status === "approved", "fb: changeStudentStatus");
    await uc.transferStudents([sid], "g3"); ok(col("students").get(sid).grade === "g3", "fb: transfer");
    col("teacherRequests").set("r1", { studentId: sid, teacherId: "t2", status: "pending" });
    await uc.answerJoinRequest({ id: "r1", studentId: sid, email: "a@x.com" }, true, "t2");
    ok(col("students").get(sid).teacherIds.includes("t2") && col("teacherRequests").get("r1").status === "accepted" && col("registrationLookup").get("a@x.com").teacherIds.includes("t2"), "fb: answerJoinRequest");
    await uc.suspendStudentForTeacher(sid, "t1", true); ok(col("students").get(sid).suspendedBy.join() === "t1", "fb: suspend");
    await uc.suspendStudentForTeacher(sid, "t1", false); ok(col("students").get(sid).suspendedBy.length === 0, "fb: unsuspend");
    await uc.saveParentPhone(sid, "0100"); await uc.changeStudentGrade(sid, "g9"); ok(col("students").get(sid).parentPhone === "0100" && col("students").get(sid).grade === "g9", "fb: phone/grade");
    // relink + first login
    col("students").set("old", { name: "ق", email: "r@x.com", teacherIds: ["a"], status: "approved" });
    col("registrationLookup").set("r@x.com", { status: "approved", studentId: "old", teacherIds: ["a"], pinHash: "zz", saltEmail: "r@x.com" });
    const rl = await uc.relinkStudent("r@x.com", { uid: "new1" });
    ok(rl.ok && col("students").has("new1") && !col("students").has("old") && col("registrationLookup").get("r@x.com").pinHash === "" && col("registrationLookup").get("r@x.com").authLinked === true, "fb: relinkStudent");
    col("students").set("fo", { name: "ف", email: "f@x.com", teacherIds: ["a"], status: "approved" });
    col("registrationLookup").set("f@x.com", { status: "approved", studentId: "fo", saltEmail: "f@x.com", pinHash: "h:f@x.com:4321", teacherIds: ["a"] });
    const fu = await uc.completeFirstLogin("f@x.com", "4321", "secret1");
    ok(fu.uid === "uid-1" && col("students").get("uid-1").emailVerifyRequired === true && !col("students").has("fo") && col("registrationLookup").get("f@x.com").pinHash === "", "fb: completeFirstLogin");
    ok((await uc.isTeacherEmailRegistered("zz@x.com")) === false, "fb: isTeacherEmailRegistered");
    await uc.sendPasswordReset("x@x.com"); ok(ops.some((o) => o[0] === "resetEmail" && o[1] === "x@x.com"), "fb: reset");
    const st0 = await uc.loadAdminPinState("Root@x.com"); ok(st0.doc === null, "fb: admin none");
    await uc.setAdminPin("root@x.com", null, "1234"); const st1 = await uc.loadAdminPinState("root@x.com");
    ok(st1.hasPin && st1.doc.name === "الأدمن الأساسي" && st1.doc.addedAt.seconds > 0 && await uc.verifyAdminPin("root@x.com", st1.doc, "1234"), "fb: setAdminPin + base admin name");
    await uc.setAdminPin("root@x.com", st1.doc, "9999"); ok(await uc.verifyAdminPin("root@x.com", (await uc.loadAdminPinState("root@x.com")).doc, "9999"), "fb: change pin");
    await uc.addSubject({ name: "م", stage: "p", grade: "g1" }); const sbk = [...col("subjects").keys()][0]; await uc.updateSubject(sbk, { name: "م2", stage: "p", grade: "g1" }); await uc.addCoreSubjects([{ name: "ع", stage: "p", grade: "" }]);
    ok(col("subjects").get(sbk).name === "م2" && col("subjects").size === 2, "fb: subjects"); await uc.deleteSubject(sbk); ok(col("subjects").size === 1, "fb: deleteSubject");
    await uc.saveLibraryItem(null, { title: "ك" }, "a@x.com"); const lbk = [...col("library").keys()][0]; await uc.saveLibraryItem(lbk, { title: "ك2" }); ok(col("library").get(lbk).title === "ك2" && col("library").get(lbk).createdBy === "a@x.com", "fb: library"); await uc.deleteLibraryItem(lbk);
    await uc.setCurrentTerm(2); await uc.publishBroadcast({ text: "ن", audience: "all", until: new Date("2030-01-01") }); await uc.saveSettingsSection("stats", { a: 1 }); await uc.saveSettingsSection("stats", { b: 2 });
    ok(col("settings").get("app").currentTerm === 2 && col("broadcasts").get("current").text === "ن" && col("settings").get("stats").a === 1 && col("settings").get("stats").b === 2, "fb: settings"); await uc.clearBroadcast(); ok(!col("broadcasts").has("current"), "fb: clearBroadcast");
    const nad = await uc.addAdmin("New@x.com", "ن", "me"); ok(nad.email === "new@x.com" && col("admins").has("new@x.com"), "fb: addAdmin"); await uc.changeAdminPin("new@x.com", "5678");
    ok(await uc.verifyAdminPin("new@x.com", col("admins").get("new@x.com"), "5678"), "fb: changeAdminPin"); await uc.removeAdmin("new@x.com"); ok(!col("admins").has("new@x.com"), "fb: removeAdmin");
    col("students").set("es1", { name: "ق", email: "old@x.com", status: "approved", teacherIds: ["t1"] }); col("registrationLookup").set("old@x.com", { status: "approved", studentId: "es1", pinHash: "h", saltEmail: "old@x.com", teacherIds: ["t1"] });
    await uc.editStudent("es1", col("students").get("es1"), { name: "ج", grade: "g2", phone: "010", parentPhone: "", email: "new@x.com" }, false);
    ok(col("students").get("es1").email === "new@x.com" && col("registrationLookup").has("new@x.com") && !col("registrationLookup").has("old@x.com") && col("registrationLookup").get("new@x.com").pinHash === "h" && col("registrationLookup").get("new@x.com").saltEmail === "old@x.com", "fb: editStudent moves lookup");
    await uc.editStudent("es1", col("students").get("es1"), { name: "ك", grade: "g2", phone: "010", parentPhone: "", email: "q@x.com" }, true); ok(col("students").get("es1").email === "new@x.com" && col("students").get("es1").name === "ك", "fb: editStudent linked");
    col("students").set("es2", { name: "ن", email: "gone@x.com", status: "pending", teacherIds: ["t9"] });
    await uc.editStudent("es2", col("students").get("es2"), { name: "ن", grade: "g1", phone: "010", parentPhone: "", email: "fresh@x.com" }, false);
    ok(col("registrationLookup").get("fresh@x.com").teacherIds.join() === "t9" && col("registrationLookup").get("fresh@x.com").status === "pending" && col("registrationLookup").get("fresh@x.com").studentId === "es2", "fb: editStudent without old lookup uses fallback");
    await uc.addTeacher("nt1", { name: "م", phone: "1" }, { name: "م" }, { amount: 50, teacherId: "nt1" });
    ok(col("teachers").get("nt1").phone === "1" && col("teachersPublic").get("nt1").phone === undefined && col("subscriptionPayments").size === 1, "fb: addTeacher atomic with payment");
    await uc.setTeacherActive("nt1", false); ok(col("teachers").get("nt1").active === false && col("teachersPublic").get("nt1").active === false, "fb: setTeacherActive");
    await uc.recordTeacherPayment("nt1", { subType: "yearly", subAmount: 9, subEnd: "E" }, { amount: 9 });
    ok(col("teachers").get("nt1").subAmount === 9 && col("teachersPublic").get("nt1").subEnd === "E" && col("teachersPublic").get("nt1").subAmount === undefined && col("subscriptionPayments").size === 2, "fb: recordTeacherPayment");
    await uc.updateTeacher("nt1", { name: "ن" }, { name: "ن" }, null); ok(col("teachersPublic").get("nt1").name === "ن" && col("subscriptionPayments").size === 2, "fb: updateTeacher no payment");
    let te2 = null; try { await uc.updateTeacher("nope", { a: 1 }, { a: 1 }, { amount: 1 }); } catch (e) { te2 = e; } ok(te2 && col("subscriptionPayments").size === 2, "fb: failed update writes no payment");
    await uc.submitAttempt("att_s1_q9", { score: 3, studentId: "s1" }); await uc.submitAttempt("att_s1_q9", { score: 4, studentId: "s1" });
    ok(col("quizAttempts").get("att_s1_q9").score === 4, "fb: submitAttempt replaces doc"); col("quizAttempts").delete("att_s1_q9");
    // حذف
    await A.saveAttempt("za", { studentId: sid, teacherId: "t1" }); await A.saveRating(sid, "L", { studentId: sid, teacherId: "t1" });
    const cnt = await uc.deleteStudentEverywhere({ id: sid, email: "a@x.com" });
    ok(cnt.attCount === 1 && cnt.rateCount === 1 && !col("students").has(sid) && !col("registrationLookup").has("a@x.com"), "fb: deleteStudentEverywhere");
    col("students").set("hs", { teacherIds: ["tdel"] });
    for (const c of ["lessons", "quizzes", "exams", "announcements", "questionBank", "studentNotes", "quizAttempts", "lessonRatings"]) col(c).set("x-" + c, { teacherId: "tdel" });
    col("teachers").set("tdel", { name: "م" }); col("teachersPublic").set("tdel", { name: "م" });
    const tcnt = await uc.deleteTeacherEverywhere({ id: "tdel" });
    ok(tcnt.students === 1 && col("students").get("hs").teacherIds.length === 0 && !col("teachers").has("tdel") && !col("teachersPublic").has("tdel") && ["lessons", "quizzes", "exams", "announcements", "questionBank", "studentNotes", "quizAttempts", "lessonRatings"].every((c) => col(c).size === 0 && tcnt[c] === 1), "fb: deleteTeacherEverywhere");
  }

  // ---- واجهة البيانات اللي الشاشات بتستوردها (main/data.js) متوصّلة بتنفيذ Firebase
  {
    for (const c of [...fake.store.keys()]) fake.store.get(c).clear();
    const data = await import(root + "/src/main/data.js"); const { infraData } = await import(root + "/src/main/infra-data.js"); const { DATA_GATEWAY } = await import(root + "/src/application/data-gateway.js");
    let unbound = false; try { data.getStudent("x"); } catch (e) { unbound = true; } ok(unbound, "data قبل bindData بيرمي");
    data.bindData(infraData);
    ok(DATA_GATEWAY.every((k) => typeof data[k] === "function" && typeof infraData[k] === "function"), "كل أسماء DataGateway موجودة في main/data.js وفي التنفيذ");
    await data.setStudent("g1", { name: "غ", teacherIds: ["tq"] });
    ok((await data.getStudent("g1")).name === "غ" && (await data.listStudentsOfTeacher("tq")).length === 1 && (await data.getStudent("zz")) === null, "data.* بيوصّل للتخزين");
    const b = data.newBatch(); data.batchUpdateStudent(b, "g1", { grade: "g4" }); await b.commit(); ok(col("students").get("g1").grade === "g4", "data.newBatch");
    let bad2 = false; try { data.bindData({}); } catch (e) { bad2 = true; } ok(bad2, "تنفيذ ناقص بيترفض"); data.bindData(infraData);
  }
  // ---- values + secondary auth + google provider
  {
    globalThis.FIREBASE_CONFIG = { apiKey: "k" };
    const V = M.values;
    ok(V.serverNow().__fv === "ts" && V.toStoredTime(new Date(2000, 0, 1)).seconds > 0 && V.removeField().__fv === "del", "values");
    const uid = await AU.createAuthUserSecondary("t@x.com", "secret1");
    ok(uid === "sec-t@x.com" && ops.some((o) => o[0] === "verifySent" && o[1] === "t@x.com") && ops.some((o) => o[0] === "secSignOut") && ops.some((o) => o[0] === "appDeleted"), "createAuthUserSecondary: إنشاء + تفعيل + خروج + قفل التطبيق الثانوي");
    const gp = AU.newGoogleProvider(); ok(gp.params.prompt === "select_account", "newGoogleProvider");
  }
  // ---- غطاء كامل: أي دالة مصدّرة ما اتنادتش = فشل
  const missing = [...exported].filter((x) => !called.has(x));
  if (missing.length) { console.log("infra FAIL: functions never exercised: " + missing.join(", ")); process.exit(1); }
  console.log("infra:" + n + " assertions, " + exported.size + "/" + exported.size + " functions exercised on fake Firestore");
})().catch((e) => { console.log("infra FAIL", e.stack || e); process.exit(1); });
