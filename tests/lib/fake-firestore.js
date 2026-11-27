/* Firestore وهمي في الذاكرة بيحاكي سلوك الـ SDK الحقيقي في اللي بنستخدمه:
   collection/doc/add/set(merge)/update/delete/get، where (== in array-contains >= ...)، orderBy، limit، count()،
   batch (حد 500 عملية)، FieldValue (serverTimestamp/arrayUnion/arrayRemove/increment/delete)، Timestamp، FieldPath.documentId().
   وبيرمي نفس أخطاء Firestore الحقيقية: update على مستند مش موجود، قيمة undefined، in بأكتر من 10، دفعة أكتر من 500. */
function install() {
  const store = new Map(); // col -> Map(id -> data)
  const ops = []; // سجل العمليات المكتوبة
  let auto = 0;
  const col = (n) => { if (!store.has(n)) store.set(n, new Map()); return store.get(n); };
  class Timestamp {
    constructor(ms) { this.seconds = Math.floor(ms / 1000); this.nanoseconds = 0; this._ms = ms; }
    toDate() { return new Date(this._ms); }
    toMillis() { return this._ms; }
    static fromDate(d) { return new Timestamp(d.getTime()); }
    static now() { return new Timestamp(Date.now()); }
  }
  const S = (t) => ({ __fv: t });
  const FieldValue = { serverTimestamp: () => S("ts"), arrayUnion: (...v) => ({ __fv: "union", v }), arrayRemove: (...v) => ({ __fv: "remove", v }), increment: (n) => ({ __fv: "inc", n }), delete: () => S("del") };
  const isFV = (v) => v && typeof v === "object" && "__fv" in v;
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function checkNoUndefined(o, path) {
    for (const [k, v] of Object.entries(o || {})) {
      if (v === undefined) throw new Error(`Function DocumentReference.set() called with invalid data. Unsupported field value: undefined (found in field ${path + k})`);
      if (v && typeof v === "object" && !isFV(v) && !(v instanceof Timestamp) && !(v instanceof Date) && !Array.isArray(v)) checkNoUndefined(v, path + k + ".");
      if (Array.isArray(v)) v.forEach((x) => { if (x === undefined) throw new Error("undefined in array at " + path + k); });
    }
  }
  function resolve(prev, patch, isUpdate) {
    const out = isUpdate ? { ...prev } : {};
    for (const [k, v] of Object.entries(patch)) {
      if (!isFV(v)) { out[k] = v; continue; }
      if (v.__fv === "ts") out[k] = Timestamp.now();
      else if (v.__fv === "del") delete out[k];
      else if (v.__fv === "inc") out[k] = (Number(prev[k]) || 0) + v.n;
      else if (v.__fv === "union") { const cur = Array.isArray(prev[k]) ? prev[k] : []; out[k] = [...cur]; v.v.forEach((x) => { if (!out[k].some((y) => eq(x, y))) out[k].push(x); }); }
      else if (v.__fv === "remove") { const cur = Array.isArray(prev[k]) ? prev[k] : []; out[k] = cur.filter((y) => !v.v.some((x) => eq(x, y))); }
    }
    return out;
  }
  const clone = (o) => JSON.parse(JSON.stringify(o, (k, v) => v instanceof Timestamp ? { __ts: v._ms } : v), (k, v) => v && v.__ts !== undefined ? new Timestamp(v.__ts) : v);
  function applyWrite(c, id, kind, data, opts) {
    const m = col(c), has = m.has(id);
    if (kind === "delete") { m.delete(id); ops.push(["delete", c, id]); return; }
    if (typeof data !== "object" || data === null) throw new Error("data must be an object");
    checkNoUndefined(data, "");
    if (kind === "update") {
      if (!has) throw new Error(`No document to update: ${c}/${id}`);
      m.set(id, clone(resolve(m.get(id), data, true)));
    } else if (opts && opts.merge) { const dm = (x, y) => { const o = { ...x }; for (const k of Object.keys(y)) { const a = x[k], b = y[k]; o[k] = a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b) && !(a instanceof Timestamp) && !(b instanceof Timestamp) ? dm(a, b) : b; } return o; }; m.set(id, clone(dm(has ? m.get(id) : {}, resolve(has ? m.get(id) : {}, data, false)))); }
    else m.set(id, clone(resolve({}, data, false)));
    ops.push([kind, c, id]);
  }
  const docSnap = (c, id) => { const m = col(c), has = m.has(id); const ref = docRef(c, id); return { id, ref, exists: has, data: () => has ? clone(m.get(id)) : undefined }; };
  function docRef(c, id) {
    id = id || "auto" + (++auto);
    return {
      id, path: c + "/" + id, _c: c,
      get: async () => docSnap(c, id),
      set: async (d, o) => applyWrite(c, id, "set", d, o),
      update: async (d) => applyWrite(c, id, "update", d),
      delete: async () => applyWrite(c, id, "delete"),
    };
  }
  const getField = (d, f) => f === "__name__" ? d.__id : f.split(".").reduce((x, k) => (x == null ? undefined : x[k]), d);
  const cmpv = (a, b) => (a && a.toMillis ? a.toMillis() : a) - (b && b.toMillis ? b.toMillis() : b);
  function query(c, filters = [], order = null, lim = null) {
    const q = {
      where(f, op, v) {
        if (f && f.__docId) f = "__name__";
        if (op === "in" || op === "array-contains-any") { if (!Array.isArray(v) || v.length === 0) throw new Error("Invalid Query. A non-empty array is required for '" + op + "' filters."); if (v.length > 10) throw new Error("Invalid Query. 'in' filters support a maximum of 10 elements"); }
        if (v === undefined) throw new Error("Invalid query. Unsupported field value: undefined");
        return query(c, [...filters, { f, op, v }], order, lim);
      },
      orderBy(f, dir = "asc") { return query(c, filters, { f, dir }, lim); },
      limit(n) { return query(c, filters, order, n); },
      async get() {
        let docs = [...col(c).entries()].map(([id, d]) => ({ ...clone(d), __id: id }));
        for (const { f, op, v } of filters) {
          docs = docs.filter((d) => {
            const x = getField(d, f);
            if (op === "==") return eq(x, v);
            if (op === "in") return v.some((y) => eq(x, y));
            if (op === "array-contains") return Array.isArray(x) && x.some((y) => eq(y, v));
            if (op === "array-contains-any") return Array.isArray(x) && x.some((y) => v.some((z) => eq(y, z)));
            if (x === undefined) return false;
            if (op === ">=") return cmpv(x, v) >= 0; if (op === ">") return cmpv(x, v) > 0;
            if (op === "<=") return cmpv(x, v) <= 0; if (op === "<") return cmpv(x, v) < 0;
            throw new Error("unsupported op " + op);
          });
        }
        if (order) { docs = docs.filter((d) => getField(d, order.f) !== undefined); docs.sort((a, b) => (order.dir === "desc" ? -1 : 1) * cmpv(getField(a, order.f), getField(b, order.f))); }
        if (lim != null) docs = docs.slice(0, lim);
        const sdocs = docs.map((d) => { const id = d.__id; delete d.__id; const ref = docRef(c, id); return { id, ref, exists: true, data: () => clone(d) }; });
        return { docs: sdocs, size: sdocs.length, empty: !sdocs.length, forEach: (fn) => sdocs.forEach(fn) };
      },
      count() { return { get: async () => { const s = await q.get(); return { data: () => ({ count: s.size }) }; } }; },
    };
    return q;
  }
  const collection = (c) => Object.assign(query(c), { doc: (id) => docRef(c, id), add: async (d) => { const r = docRef(c); await r.set(d); return r; } });
  function batch() {
    const queue = [];
    const b = {
      set: (ref, d, o) => { queue.push(() => applyWrite(ref._c, ref.id, "set", d, o)); return b; },
      update: (ref, d) => { queue.push(() => applyWrite(ref._c, ref.id, "update", d)); return b; },
      delete: (ref) => { queue.push(() => applyWrite(ref._c, ref.id, "delete")); return b; },
      async commit() { if (queue.length > 500) throw new Error("maximum 500 writes allowed per request"); queue.forEach((f) => f()); },
    };
    return b;
  }
  const fsRoot = { collection, batch };
  const user = { uid: "uid-1", email: "u@x.com", updatePassword: async () => {}, sendEmailVerification: async () => {} };
  const authObj = {
    currentUser: user, languageCode: "",
    sendPasswordResetEmail: async (e) => { ops.push(["resetEmail", e]); },
    signInWithEmailAndPassword: async (e) => ({ user: { ...user, email: e } }),
    signInWithPopup: async () => ({ user }), createUserWithEmailAndPassword: async (e) => ({ user: { ...user, email: e } }),
    signOut: async () => { ops.push(["signOut"]); }, onAuthStateChanged() {},
  };
  class GoogleAuthProvider { setCustomParameters(p) { this.params = p; } }
  const initializeApp = (cfg, name) => ({ name, auth: () => ({ ...authObj, createUserWithEmailAndPassword: async (e) => ({ user: { ...user, uid: "sec-" + e, email: e, sendEmailVerification: async () => { ops.push(["verifySent", e]); } } }), signOut: async () => { ops.push(["secSignOut", name]); } }), delete: async () => { ops.push(["appDeleted", name]); } });
  const firebase = { initializeApp, auth: Object.assign(() => authObj, { GoogleAuthProvider }), firestore: Object.assign(() => fsRoot, { FieldValue, Timestamp, FieldPath: { documentId: () => ({ __docId: true }) } }) };
  return { firebase, store, ops, col, seed(c, id, data) { col(c).set(id, clone(data)); } };
}
module.exports = { install };
