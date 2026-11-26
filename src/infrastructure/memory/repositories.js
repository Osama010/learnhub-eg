/* تنفيذ البورتس في الذاكرة: للاختبارات (من غير Firebase ولا متصفح). نفس العقد بالظبط. */
export function memoryRepositories(seed = {}) {
  const db = { students: new Map(), lookups: new Map(), requests: new Map(), results: [], content: [], ...seed };
  let nextId = 1;
  const log = [];
  const repos = {
    students: {
      async saveAttempt(docId, data) { (db.attemptDocs = db.attemptDocs || new Map()).set(docId, { ...data }); },
      async setSuspendedFor(id, teacherId, suspend) { const s = db.students.get(id); const cur = new Set(s.suspendedBy || []); if (suspend) cur.add(teacherId); else cur.delete(teacherId); s.suspendedBy = [...cur]; },
      async update(id, patch) { if (!db.students.has(id)) throw new Error("not found"); Object.assign(db.students.get(id), patch); },
      async get(id) { return db.students.has(id) ? { ...db.students.get(id) } : null; },
      async replaceProfile(newId, data, oldId) { db.students.set(newId, { ...data }); if (oldId) db.students.delete(oldId); },
      async register(data) { const id = "s" + nextId++; db.students.set(id, { ...data }); log.push(["register", id]); return id; },
      async changeStatus(id, email, status) {
        if (!db.students.has(id)) throw new Error("not found");
        db.students.get(id).status = status;
        if (email && db.lookups.has(email)) db.lookups.get(email).status = status;
        log.push(["changeStatus", id, status]);
      },
      async changeGrade(ids, grade) { ids.forEach((id) => { db.students.get(id).grade = grade; }); },
      async removeResultsOf(id) {
        const mine = db.results.filter((r) => r.studentId === id);
        db.results = db.results.filter((r) => r.studentId !== id);
        return { attCount: mine.filter((r) => r.kind === "attempt").length, rateCount: mine.filter((r) => r.kind === "rating").length };
      },
      async removeWithIndex(id, email) { db.students.delete(id); if (email) db.lookups.delete(email); },
      async detachTeacher(teacherId) {
        let n = 0;
        for (const s of db.students.values()) if ((s.teacherIds || []).includes(teacherId)) { s.teacherIds = s.teacherIds.filter((t) => t !== teacherId); n++; }
        return n;
      },
    },
    lookups: {
      async update(email, patch) { const l = db.lookups.get(email); if (!l) throw new Error("no index"); Object.assign(l, patch); },
      async get(email) { return db.lookups.has(email) ? { ...db.lookups.get(email) } : null; },
      async create(email, data) { db.lookups.set(email, { ...data }); },
      async move(oldEmail, email, studentId, fallback) { const data = db.lookups.has(oldEmail) ? db.lookups.get(oldEmail) : fallback; db.lookups.set(email, { ...data, studentId, saltEmail: data.saltEmail || oldEmail }); db.lookups.delete(oldEmail); },
      async addTeacher(email, teacherId) { const l = db.lookups.get(email); if (!l) throw new Error("no index"); l.teacherIds = [...new Set([...(l.teacherIds || []), teacherId])]; },
    },
    teachers: {
      async isEmailRegistered(email) { return (db.publicTeachers || []).includes(email); },
      async removeContentOf(teacherId) {
        const mine = db.content.filter((c) => c.teacherId === teacherId);
        db.content = db.content.filter((c) => c.teacherId !== teacherId);
        return { content: mine.length };
      },
      async save({ mode, id, privateData, publicData, payment }) {
        const priv = (db.teacherDocs = db.teacherDocs || new Map()), pub = (db.teacherPublic = db.teacherPublic || new Map());
        if (mode === "update" && (!priv.has(id) || !pub.has(id))) throw new Error("not found");
        if (mode === "create") { priv.set(id, { ...privateData }); pub.set(id, { ...publicData }); } else { Object.assign(priv.get(id), privateData); Object.assign(pub.get(id), publicData); }
        if (payment) (db.payments = db.payments || []).push({ ...payment });
      },
      async removeWithPublic(id) { db.teachersRemoved = [...(db.teachersRemoved || []), id]; },
    },
    subjects: {
      async add(d) { (db.subjects = db.subjects || new Map()).set("sb" + nextId++, { ...d, core: false }); },
      async update(id, d) { if (!db.subjects.has(id)) throw new Error("not found"); Object.assign(db.subjects.get(id), d); },
      async remove(id) { db.subjects.delete(id); },
      async addCore(list) { (db.subjects = db.subjects || new Map()); list.forEach((x) => db.subjects.set("sb" + nextId++, { ...x, core: true })); },
    },
    library: {
      async save(id, data, by) { const m = (db.library = db.library || new Map()); if (id) { if (!m.has(id)) throw new Error("not found"); Object.assign(m.get(id), data); } else m.set("lb" + nextId++, { ...data, createdBy: by }); },
      async remove(id) { db.library.delete(id); },
    },
    settings: {
      async setCurrentTerm(t) { (db.settings = db.settings || {}).currentTerm = t; },
      async publishBroadcast(b) { (db.settings = db.settings || {}).broadcast = { ...b }; },
      async clearBroadcast() { (db.settings = db.settings || {}).broadcast = null; },
      async saveSection(name, data) { const s = (db.settings = db.settings || {}); s[name] = { ...(s[name] || {}), ...data }; },
    },
    admins: {
      async add(email, name, by) { const doc = { email, name, addedBy: by }; (db.admins = db.admins || new Map()).set(email, { ...doc }); return doc; },
      async remove(email) { db.admins.delete(email); },
      async get(email) { return db.admins && db.admins.has(email) ? { ...db.admins.get(email) } : null; },
      async create(email, data) { (db.admins = db.admins || new Map()).set(email, { ...data }); },
      async setPinHash(email, pinHash) { db.admins.get(email).pinHash = pinHash; },
    },
    auth: {
      async sendPasswordReset(email) { (db.resets = db.resets || []).push(email); },
      async createUser(email, password) {
        if (db.authUsers && db.authUsers.has(email)) { const e = new Error("exists"); e.code = "auth/email-already-in-use"; throw e; }
        (db.authUsers = db.authUsers || new Map()).set(email, password);
        return { uid: "auth-" + email, sendEmailVerification: async () => { db.verifySent = (db.verifySent || 0) + 1; } };
      },
    },
    joinRequests: {
      async answer({ requestId, studentId, accept, teacherId }) {
        const r = db.requests.get(requestId); if (!r) throw new Error("no request");
        if (accept) { const s = db.students.get(studentId); s.teacherIds = [...new Set([...(s.teacherIds || []), teacherId])]; }
        r.status = accept ? "accepted" : "rejected";
      },
    },
  };
  return { repos, db, log };
}
