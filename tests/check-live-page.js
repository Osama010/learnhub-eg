const fs = require("fs");
(async () => {
  let f = 0; const ok = (c, n) => { if (!c) { f++; console.log("FAIL", n); } };
  const R = __dirname + "/../src/";
  const L = await import(R + "domain/live.js"), P = await import(R + "domain/teacher-page.js"), N = await import(R + "domain/progress.js");
  const now = new Date(2026, 10, 27, 10, 0).getTime();
  const day = (n) => { const d = new Date(now + n * 86400000); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const base = { title: "مراجعة", url: "https://zoom.us/j/123", date: day(1), time: "18:30", grade: "" };
  const v = L.validateLive(base, now);
  ok(v.doc && v.doc.startsAtMs === new Date(day(1) + "T18:30:00").getTime() && v.doc.url.startsWith("https://"), "valid class");
  ok(L.validateLive({ ...base, url: "http://zoom.us/j/1" }, now).error, "http rejected");
  ok(L.validateLive({ ...base, url: "https://evil.com/zoom.us" }, now).error && L.validateLive({ ...base, url: "https://zoom.us.evil.com/j" }, now).error, "host must match exactly");
  ok(L.validateLive({ ...base, url: "javascript:alert(1)" }, now).error, "js url rejected");
  ok(L.validateLive({ ...base, url: "https://us04web.zoom.us/j/1" }, now).doc && L.validateLive({ ...base, url: "https://meet.google.com/abc-defg-hij" }, now).doc, "subdomain + meet ok");
  ok(L.validateLive({ ...base, title: "ab" }, now).error && L.validateLive({ ...base, date: "" }, now).error, "title/date required");
  ok(L.validateLive({ ...base, date: day(-2) }, now).error && L.validateLive({ ...base, date: day(400) }, now).error, "past/far rejected");
  const h = 3600000, st = now + 5 * h;
  ok(L.liveState(st, now) === "soon" && L.liveState(now + 3 * 86400000, now) === "upcoming" && L.liveState(now + 5 * 60000, now) === "live" && L.liveState(now - 60 * 60000, now) === "live" && L.liveState(now - 3 * h, now) === "ended", "states");
  const T = (ms) => ({ seconds: ms / 1000 });
  const up = L.upcomingLive([{ id: "a", startsAt: T(now + 2 * h) }, { id: "b", startsAt: T(now - 5 * h) }, { id: "c", startsAt: T(now + 1 * h) }, { id: "d" }, { id: "e", startsAt: T(now + h), teacherId: "x" }], now, (c) => c.teacherId !== "x");
  ok(up.map((c) => c.id).join() === "c,a", "upcoming sorted, ended/no-time/hidden dropped " + up.map((c) => c.id));
  // bell
  const n = N.notificationsOf({ lessons: [], quizzes: [], exams: [], ann: [], live: [{ id: "L1", title: "حصة", startsAt: T(now + h), createdAt: T(now - 1000) }, { id: "L2", title: "قديمة", startsAt: T(now - 5 * h), createdAt: T(now - 6 * h) }], sinceMs: now - 5000, nowMs: now, visible: () => true, lessonOpen: () => true, teacherName: () => "أ" });
  ok(n.length === 1 && n[0].kind === "live" && n[0].isNew && n[0].href === "#/student", "bell shows only the upcoming class as new");
  // page model + links
  const doc = { id: "t1", name: "أ. علي", subject: "علوم", stages: ["إعدادي"], pageOn: true, pageBio: "نبذة", pageStats: { students: 12, lessons: 30, quizzes: 9, at: 1 }, email: "secret@x.com", phone: "010" };
  const m = P.publicPageModel(doc);
  ok(m && m.stats.students === 12 && !("email" in m) && !("phone" in m), "model exposes only public fields");
  ok(P.publicPageModel({ ...doc, pageOn: false }) === null && P.publicPageModel({ ...doc, active: false }) === null && P.publicPageModel(null) === null, "closed/suspended/missing = null");
  ok(P.pageStatsOf({ students: -3, lessons: "7", quizzes: 1e9, now: 5 }).students === 0 && P.pageStatsOf({ students: -3, lessons: "7", quizzes: 1e9, now: 5 }).lessons === 7, "stats clamped");
  ok(P.validateBio("x".repeat(301)).error && P.validateBio(" ok ").bio === "ok", "bio");
  ok(P.inviteLink("https://a.io/r/?x=1#/old", "T 1") === "https://a.io/r/?x=1#/join/T%201" && P.pageLink("https://a.io/r/", "t1") === "https://a.io/r/#/t/t1", "links");
  const rules = fs.readFileSync(__dirname + "/../docs/firestore.rules", "utf8");
  ok(rules.includes("match /liveClasses/{liveId}") && rules.includes('"pageBio", "pageOn", "pageStats"') && rules.includes("matches('^https://.*')"), "rules blocks present");
  console.log(f ? "live-page: " + f + " FAIL" : "live-page: all pass"); process.exit(f ? 1 : 0);
})();
