const assert = require("assert"), path = require("path");
(async () => {
  const { createUserState } = await import(path.resolve(__dirname, "../src/application/user-state.js"));
  let n = 0; const ok = (c, m) => { assert(c, m); n++; };
  const remote = {}; let gets = 0, saves = 0, offline = false, clock = 1000;
  const store = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; };
  const jobs = []; const setTimer = (f) => { jobs.push(f); return jobs.length; }, clearTimer = () => {};
  const run = async () => { const q = jobs.splice(0); for (const f of q) await f(); };
  const dev = (storage, uid = "u1") => createUserState({ getUid: () => uid, storage, now: () => ++clock, setTimer, clearTimer,
    remoteGet: async (id) => { if (offline) throw new Error("off"); gets++; return remote[id] ? JSON.parse(JSON.stringify(remote[id])) : null; },
    remoteSave: async (id, p) => { if (offline) throw new Error("off"); saves++; const r = remote[id] || (remote[id] = { v: {}, at: {} }); Object.assign(r.v, p.v); Object.assign(r.at, p.at); r.updatedAt = p.updatedAt; } });
  // جهاز 1: بيانات قديمة في localStorage (قبل التحديث) بتتهاجر
  const s1 = store(); s1.setItem("t4kSrs_u1", JSON.stringify({ q1: { wrongAt: 1, step: 0, due: 5, at: 10 } })); s1.setItem("t4kBoardHidden", "1"); s1.setItem("t4kLastBackup", "777");
  const A = dev(s1);
  ok(A.usGet("boardHidden", false) === true && A.usGet("backupLast", 0) === 777, "legacy local values seeded");
  await A.initUserState(); await run(); ok(gets === 1 && saves === 1, "first sync: one read, one batched write");
  ok(JSON.parse(remote.u1.v.srs).q1.step === 0 && remote.u1.v.boardHidden === "true" && remote.u1.v.backupLast === "777", "remote now holds migrated state");
  // جهاز 2 فاضي: بيستلم نفس الحالة
  const s2 = store(), B = dev(s2); await B.initUserState();
  ok(B.usGet("boardHidden", false) === true && B.usGet("srs", {}).q1.due === 5 && gets === 2 && saves === 1, "second device receives state with one read, no write");
  // تعديل من جهاز 2 يوصل جهاز 1 بعد مزامنة
  B.usSet("srs", { q1: { wrongAt: 1, step: 1, due: 99, at: 5000 }, q2: { wrongAt: 2, step: 0, due: 7, at: 4000 } }); B.usSet("boardHidden", false);
  ok(saves === 1, "writes are debounced (not immediate)"); await run(); ok(saves === 2 && !("srs" in {}) , "one batched write for two keys");
  const A2 = dev(s1); await A2.initUserState(); ok(A2.usGet("srs", {}).q1.step === 1 && A2.usGet("srs", {}).q2 && A2.usGet("boardHidden", true) === false, "device 1 picks up device 2 changes");
  // تعارض: جهازين غيّروا أوفلاين، الأحدث بالعنصر يكسب والباقي يتدمج
  offline = true; const C = dev(s1); C.usSet("srs", { ...C.usGet("srs", {}), q3: { wrongAt: 3, step: 0, due: 1, at: 9000 } }); await run(); ok(saves === 2, "offline write fails quietly and stays local");
  ok(JSON.parse(s1.getItem("t4kUS_u1")).v.srs.q3, "offline change cached locally");
  B.usSet("srs", { ...B.usGet("srs", {}), q4: { wrongAt: 4, step: 0, due: 1, at: 9500 } }); offline = false; await run();
  const C2 = dev(s1); await C2.initUserState(); await run(); const m = C2.usGet("srs", {});
  ok(m.q3 && m.q4 && m.q1 && m.q2, "offline edits from two devices merge without losing items");
  const D2 = dev(store()); await D2.initUserState(); ok(D2.usGet("srs", {}).q3 && D2.usGet("srs", {}).q4, "remote holds the merged state");
  // مستخدمين مختلفين مش بيتخلطوا
  const E = dev(store(), "u2"); await E.initUserState(); ok(E.usGet("srs", null) === null && !remote.u2, "other user's state is separate");
  // مفيش مستخدم = مفيش كتابة
  const F = createUserState({ getUid: () => "", storage: store(), remoteGet: async () => { throw new Error("no"); }, remoteSave: async () => { throw new Error("no"); } }); F.usSet("srs", {}); ok(F.usGet("srs", 5) === 5 && (await F.initUserState()) === false, "signed-out is a no-op");
  // مفاتيح غير معروفة مرفوضة
  A.usSet("evil", 1); ok(A.usGet("evil", "x") === "x", "unknown key ignored");
  console.log("user-state: all pass (" + n + ")");
})().catch((e) => { console.log("user-state FAIL", e.stack || e); process.exit(1); });
