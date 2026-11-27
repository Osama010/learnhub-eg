const assert = require("assert"), path = require("path");
(async () => {
  const D = await import(path.resolve(__dirname, "../src/domain/dropoff.js")), R = await import(path.resolve(__dirname, "../src/domain/reviews.js"));
  const P = await import(path.resolve(__dirname, "../src/domain/parent.js")), U = await import(path.resolve(__dirname, "../src/domain/user-state.js"));
  let n = 0; const ok = (c, m) => { assert(c, m); n++; };
  // dropoff tracker
  const t = D.createTracker();
  t.sample(10, 1, 300); t.sample(20, 1); t.sample(21, 2); // وقف عند 21 -> دلو 1
  t.sample(22, 1); t.sample(40, 1); t.sample(30, 1); // رجّع من 40 لـ 30 -> rewind دلو 2
  let s = t.take(); ok(s.stops[1] === 1 && s.rewinds[2] === 1, "stop + rewind bucketed");
  ok(t.take() === null, "take clears dirty");
  t.sample(31, 1); t.sample(295, 1); t.sample(295, 2); ok(t.take() === null, "no stop near end");
  const t2 = D.createTracker(); t2.sample(50, 1); t2.sample(51, 1); t2.leave(); ok(t2.take().stops[3] === 1, "leave while playing = stop");
  const t3 = D.createTracker(); t3.sample(5, 2); ok(t3.take() === null, "pause without playing ignored"); t3.sample(Infinity, 1); t3.sample(-1, 1); ok(t3.take() === null, "bad values ignored");
  ok(D.bucketOf(99999) === D.MAX_BUCKETS - 1 && D.bucketOf(-5) === 0, "bucket clamp");
  const sm = D.dropoffSummary([{ stops: { 4: 1 }, rewinds: {} }, { stops: { 4: 1, 9: 1 }, rewinds: { 4: 1 } }, { stops: { 4: 1 }, rewinds: { 9: 1 } }, null]);
  ok(sm.students === 3 && sm.enough && sm.top.b === 4 && sm.top.stops === 3 && sm.top.rewinds === 1 && sm.top.sec === 60, "summary top bucket counts distinct students");
  ok(!D.dropoffSummary([{ stops: { 1: 1 } }]).enough && D.dropoffSummary([]).top === null, "min students");
  ok(D.fmtSec(75) === "1:15" && D.fmtSec(5) === "0:05", "fmtSec");
  // reviews
  ok(R.validateReview({ stars: 0 }).error && R.validateReview({ stars: 6 }).error && R.validateReview({ stars: 5, text: "x".repeat(301) }).error, "review validation");
  ok(R.validateReview({ stars: "4", text: " جيد " }).stars === 4 && R.validateReview({ stars: 4, text: " جيد " }).text === "جيد", "review ok");
  const d = R.reviewDoc({ uid: "u", teacherId: "t", profile: { name: "سارة أحمد علي" }, stars: 5, text: "", now: 1 });
  ok(d.studentName === "سارة" && d.status === "pending" && Object.keys(d).sort().join() === "stars,status,studentId,studentName,teacherId,text,updatedAt", "reviewDoc first name + pending + exact keys");
  ok(R.reviewId("u", "t") === "u_t", "reviewId");
  const rs = R.reviewSummary([{ stars: 5 }, { stars: 4 }, { stars: 9 }, null]); ok(rs.count === 2 && rs.avg === 4.5 && R.reviewSummary([]).count === 0, "reviewSummary ignores bad");
  ok(R.starsText(4.4) === "★★★★☆" && R.starsText(0) === "☆☆☆☆☆", "starsText");
  // parent
  const code = P.newParentCode(); ok(P.CODE_RE.test(code) && code !== P.newParentCode() && code.length === 24, "parent code random + valid");
  ok(P.parentLink("https://x.io/repo/#/login", code) === "https://x.io/repo/#/p/" + code, "parentLink");
  const snap = P.parentSnapshot({ uid: "u", profile: { name: "علي محمد حسن", grade: "الصف الأول", phone: "01000000000" }, watched: 3, lessons: 10, attempts: [{ quizId: "q", score: 8, total: 10, createdAt: { seconds: 100 } }, { quizId: "q", score: 2, total: 10, createdAt: { seconds: 200 } }], quizzes: [{ id: "q", title: "كويز" }], weak: [{ level: "weak", label: "أ", pct: 20 }, { level: "mid", label: "ب", pct: 60 }], streak: { current: 2, best: 5, activeToday: true }, now: 5 });
  ok(snap.name === "علي محمد" && snap.stats.avg === 50 && snap.recent[0].pct === 20 && snap.weak.length === 1 && !JSON.stringify(snap).includes("0100"), "snapshot: no phone, avg, recent order, weak only");
  ok(Object.keys(snap).sort().join() === "grade,name,recent,stats,studentId,updatedAt,weak", "snapshot keys match rules");
  const v = P.parentView({ name: "x".repeat(99), stats: { watched: "z", avg: 500 }, weak: "bad", recent: [1, 2, 3, 4, 5, 6, 7] }); ok(v.name.length === 30 && v.stats.watched === 0 && v.stats.avg === 100 && v.weak.length === 0 && v.recent.length === 5 && P.parentView(null) === null, "parentView sanitizes");
  // user state merge
  let m = U.mergeState("boardHidden", true, 10, false, 20); ok(m.value === false && m.at === 20, "latest wins");
  m = U.mergeState("srs", { a: { wrongAt: 1, step: 1, at: 50 }, b: { wrongAt: 1, step: 0, at: 5 } }, 50, { a: { wrongAt: 1, step: 0, at: 40 }, b: { wrongAt: 1, step: 1, at: 30 }, c: { wrongAt: 2, step: 0, at: 1 } }, 60);
  ok(m.value.a.step === 1 && m.value.b.step === 1 && m.value.c && m.at === 60, "srs merged per item by latest answer");
  m = U.mergeState("bulkDone", { k: ["a", "b"] }, 1, { k: ["b", "c"], j: ["z"] }, 2); ok(m.value.k.length === 3 && m.value.j.length === 1, "bulkDone union");
  m = U.mergeState("backupLast", 5, 1, 9, 2); ok(m.value === 9, "backupLast max");
  m = U.mergeState("secState", { a: true }, 5, { b: false }, 9); ok(m.value.a === true && m.value.b === false, "secState keys union");
  ok(U.mergeState("srs", undefined, 0, { a: 1 }, 3).value.a === 1 && U.mergeState("srs", { a: 1 }, 3, undefined, 0).value.a === 1, "one-sided merge keeps value");
  const big = {}; for (let i = 0; i < 2000; i++) big["k" + i] = { wrongAt: i, step: 0, due: 1, at: i };
  const tr = U.srsTrim(big, 28000); ok(JSON.stringify(tr).length <= 28000 && tr.k1999 && !tr.k0, "srsTrim drops oldest");
  const LR = await import(path.resolve(__dirname, "../src/domain/lesson-report.js"));
  const studs = [{ id: "a", name: "أحمد", grade: "g1", status: "approved" }, { id: "b", name: "بسمة", grade: "g1", status: "approved", watchedLessons: { L: true } }, { id: "c", name: "جمال", grade: "g1" }, { id: "d", name: "دينا", grade: "g2", status: "approved" }, { id: "e", name: " endx", grade: "g1", status: "pending" }];
  const rep = LR.lessonReport({ students: studs, lessonId: "L", grade: "g1", docs: [{ lessonId: "L", studentId: "a", openedAt: 100, playedAt: 200, finishedAt: 300, pct: 95, pdfAt: 250 }, { lessonId: "X", studentId: "c", openedAt: 5 }, { lessonId: "L", studentId: "zz", openedAt: 9 }] });
  ok(rep.sum.total === 3 && rep.sum.opened === 2 && rep.sum.missing === 1 && rep.missing[0].id === "c", "report: grade filter, pending excluded, not-opened list, other lessons/unknown students ignored");
  const ra = rep.rows.find((r) => r.id === "a"), rb = rep.rows.find((r) => r.id === "b");
  ok(ra.played && ra.finished && ra.pdf && ra.lastAt === 300 && rep.rows[0].id === "a", "report: full activity + sorted by last activity");
  ok(rb.opened && rb.legacyOnly && !rb.played && !rb.pdf, "report: legacy watchedLessons counts as opened (no time)");
  const rp = LR.lessonReport({ students: studs, lessonId: "L", docs: [{ lessonId: "L", studentId: "d", pct: 91, pdfAt: 7 }] });
  ok(rp.rows[0].finished && rp.rows[0].pdf && rp.sum.total === 4, "report: pct>=90 counts as finished; no grade = all");
  const C = await import(path.resolve(__dirname, "../src/domain/contact.js"));
  ok(C.normalizePhone("01012345678") === "201012345678" && C.normalizePhone("+20 101 234 5678") === "201012345678" && C.normalizePhone("٠١٠١٢٣٤٥٦٧٨") === "201012345678" && C.normalizePhone("00201012345678") === "201012345678", "phone normalize");
  ok(C.normalizePhone("0101234") === "" && C.normalizePhone("") === "" && C.normalizePhone("00966501234567") === "966501234567", "phone rejects short, keeps intl");
  ok(C.validateContact({ phone: "", groupLink: "" }).error && C.validateContact({ phone: "12" }).error && C.validateContact({ groupLink: "http://t.me/x" }).error && C.validateContact({ groupLink: "https://evil.com/x" }).error && C.validateContact({ groupLink: "https://t.me.evil.com/x" }).error, "contact validation");
  ok(C.validateContact({ phone: "01012345678", groupLink: "https://chat.whatsapp.com/AbC123", on: true }).doc.on === true && C.validateContact({ groupLink: "https://t.me/grp" }).doc.on === false, "contact doc, hidden by default");
  ok(C.waLink("201012345678", "مرحبا") === "https://wa.me/201012345678?text=" + encodeURIComponent("مرحبا"), "waLink");
  ok(C.contactView({ on: false, phone: "201012345678" }) === null && C.contactView({ on: true, phone: "x", groupLink: "javascript:alert(1)" }) === null && C.contactView({ on: true, phone: "201012345678", groupLink: "https://t.me/a" }).group === "https://t.me/a", "contactView hides when off and sanitizes");
  console.log("v16: all pass (" + n + ")");
})().catch((e) => { console.log("v16 FAIL", e.stack || e); process.exit(1); });
