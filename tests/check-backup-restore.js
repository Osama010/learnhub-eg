/* اختبار النسخة الاحتياطية والاسترجاع (دوال صافية من backup.presenter.js). */
(async () => {
  const path = require("path");
  const P = await import(path.join(__dirname, "../src/features/teacher/backup.presenter.js"));
  let n = 0; const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error("FAIL " + msg + ": " + JSON.stringify(a) + " != " + JSON.stringify(b)); process.exit(1); } n++; };
  const D = 86400000, now = 1e12;
  eq([P.backupDue(0, now), P.backupDue(now - 6 * D, now), P.backupDue(now - 7 * D, now), P.backupDue(now - 30 * D, now)], [true, false, true, true], "reminder after 7 days or never");
  eq([P.backupAgeDays(0, now), P.backupAgeDays(now - 9 * D - 5, now)], [null, 9], "age");
  const toStored = (d) => ({ ts: d.getTime() });
  const date = new Date("2026-11-20T10:00:00.000Z");
  const doc = P.reviveDoc({ id: "L1", title: "د", teacherId: "OTHER", publishAt: date.toISOString(), createdAt: null, grade: "الأول" }, "t1", toStored);
  eq(doc, { title: "د", teacherId: "t1", publishAt: { ts: date.getTime() }, createdAt: null, grade: "الأول" }, "revive: dates back to Timestamps, id dropped, teacher pinned");
  const b = P.buildBackup({ teacher: { id: "t1", name: "م" }, students: [{ id: "s", passwordHash: "x", name: "ط" }], lessons: [{ id: "L1", teacherId: "t1", title: "د1", hasVideo: true }, { id: "L2", teacherId: "t1", title: "د2" }], quizzes: [{ id: "Q1", teacherId: "t1", questions: [] }], exams: [], attempts: [], ratings: [], media: { L1: { videoUrl: "https://v", pdfUrl: "" } }, now: new Date(1e12) });
  eq([b.meta.version, b.students[0].passwordHash, b.media.L1.videoUrl], [2, undefined, "https://v"], "backup v2 keeps media links, strips secrets");
  const ex = { lessons: new Set(["L2"]), quizzes: new Set(), exams: new Set() };
  const plan = P.restorePlan({ backup: JSON.parse(JSON.stringify(b)), uid: "t1", existing: ex, toStored });
  eq([plan.items.map((i) => i.col + ":" + i.id), plan.counts, plan.kept.lessons, plan.media], [["lessons:L1", "quizzes:Q1"], { lessons: 1, quizzes: 1, exams: 0 }, 1, [{ lessonId: "L1", videoUrl: "https://v", pdfUrl: "" }]], "restore only missing items; existing untouched; media for restored lessons only");
  eq(P.restorePlan({ backup: b, uid: "t2", existing: ex, toStored }).error.includes("تخص حساب مدرس تاني"), true, "other teacher's backup refused");
  eq(!!P.restorePlan({ backup: { meta: { kind: "admin-backup" } }, uid: "t1", existing: ex, toStored }).error, true, "wrong kind refused");
  eq(!!P.restorePlan({ backup: null, uid: "t1", existing: ex, toStored }).error, true, "null refused");
  const evil = P.restorePlan({ backup: { meta: { kind: "teacher-backup", teacherId: "t1" }, lessons: [{ id: "a/b", teacherId: "t1" }, { id: "ok", teacherId: "someone" }, { id: "fine", teacherId: "t1" }, null, {}] }, uid: "t1", existing: ex, toStored });
  eq(evil.items.map((i) => i.id), ["fine"], "bad ids and foreign docs skipped");
  console.log("backup-restore:" + n + " passed");
})();
