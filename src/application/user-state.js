import { STATE_KEYS, mergeState, srsTrim } from "../domain/user-state.js";

/* ---------- حالة المستخدم عبر الأجهزة (المنطق) ----------
   كل حاجة بتتحفظ فورًا في المتصفح (كاش + شغل من غير نت)، وبتترفع لمستند userState/{uid} بتاعه بعد ثواني (كتابة واحدة مجمّعة).
   أول مرة في الجلسة: قراءة واحدة للمستند ودمج آمن (الأحدث يكسب، والمراجعة والرسائل بتتدمج عنصر عنصر).
   الاعتماديات متحقونة (uid، تخزين، قراءة/كتابة بعيدة) عشان تتختبر من غير متصفح. */
export function createUserState({ getUid, storage, remoteGet, remoteSave, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout }) {
  const LEGACY = {
    srs: (uid) => "t4kSrs_" + uid, boardHidden: () => "t4kBoardHidden", secState: () => "stSecState", recipientMode: () => "t4k_wa_recipient",
    bulkDone: () => "t4k_bulk_done", parentCode: (uid) => "t4kParentCode_" + uid, backupLast: () => "t4kLastBackup", backupSnooze: () => "t4kBackupSnooze",
  };
  const ls = { get: (k) => { try { return storage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { storage.setItem(k, v); } catch (_) {} } };
  let mem = null, memUid = null, initP = null, kicked = false, timer = null;
  const dirty = new Set();
  const cacheKey = (uid) => "t4kUS_" + uid;
  function legacyVal(k, uid) {
    const raw = ls.get(LEGACY[k](uid)); if (raw == null) return undefined;
    if (k === "boardHidden") return raw === "1";
    if (k === "backupLast" || k === "backupSnooze") return Number(raw) || undefined;
    if (k === "recipientMode" || k === "parentCode") return raw;
    try { return JSON.parse(raw); } catch (_) { return undefined; }
  }
  function ensure() {
    const uid = getUid();
    if (!uid) return null;
    if (mem && memUid === uid) return mem;
    let c = {}; try { c = JSON.parse(ls.get(cacheKey(uid)) || "{}") || {}; } catch (_) { c = {}; }
    mem = { v: c.v || {}, at: c.at || {} }; memUid = uid; initP = null; kicked = false; dirty.clear();
    STATE_KEYS.forEach((k) => { if (mem.v[k] === undefined) { const l = legacyVal(k, uid); if (l !== undefined) { mem.v[k] = l; mem.at[k] = 1; } } });
    return mem;
  }
  const persist = () => { if (mem && memUid) ls.set(cacheKey(memUid), JSON.stringify(mem)); };
  function patchOf(keys) {
    const v = {}, at = {};
    keys.forEach((k) => { if (mem.v[k] !== undefined) { v[k] = JSON.stringify(mem.v[k]); at[k] = mem.at[k] || 0; } });
    return { v, at, updatedAt: now() };
  }
  /** قراءة واحدة للمستند ودمج مع المحلي. بتفشل بهدوء لو مفيش نت. */
  function initUserState() {
    const m = ensure(); if (!m) return Promise.resolve(false);
    if (initP) return initP;
    const uid = memUid;
    initP = (async () => {
      try {
        const remote = (await remoteGet(uid)) || {};
        const rv = remote.v || {}, ra = remote.at || {};
        const push = [];
        STATE_KEYS.forEach((k) => {
          let rval; try { rval = rv[k] === undefined ? undefined : JSON.parse(rv[k]); } catch (_) { rval = undefined; }
          const r = mergeState(k, m.v[k], m.at[k], rval, ra[k]);
          if (r.value === undefined) return;
          m.v[k] = r.value; m.at[k] = r.at;
          if (rv[k] === undefined || JSON.stringify(r.value) !== JSON.stringify(rval)) push.push(k);
        });
        persist();
        if (push.length) { push.forEach((k) => dirty.add(k)); schedule(0); }
        return true;
      } catch (e) { initP = null; kicked = false; return false; }
    })();
    return initP;
  }
  function schedule(ms) { clearTimer(timer); timer = setTimer(flush, ms); }
  async function flush() {
    try {
      clearTimer(timer);
      if (!dirty.size || !memUid) return;
      if (!(await initUserState())) { schedule(30000); return; }
      const keys = [...dirty]; dirty.clear();
      try { await remoteSave(memUid, patchOf(keys)); } catch (_) { keys.forEach((k) => dirty.add(k)); }
    } catch (_) {}
  }
  /** قراءة متزامنة من الكاش. أول نداء بيبدأ المزامنة في الخلفية. */
  function usGet(key, fallback) {
    const m = ensure(); if (!m) return fallback;
    if (!kicked) { kicked = true; initUserState().catch(() => {}); }
    return m.v[key] === undefined ? fallback : m.v[key];
  }
  function usSet(key, value) {
    const m = ensure(); if (!m || !STATE_KEYS.includes(key)) return;
    m.v[key] = key === "srs" ? srsTrim(value) : value; m.at[key] = now(); persist();
    dirty.add(key); schedule(2500);
  }
    return { initUserState, flush, usGet, usSet };
  }
