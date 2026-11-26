/* طبقة الـ Use Cases (Application): قواعد سير العمل. بتعتمد على الدومين والبورتس بس، ومبتعرفش Firebase ولا DOM.
   كل شيء بيتحقن من برّه (composition root) عن طريق createUseCases. */
import { PORTS, assertPort } from "./ports.js";

export class DuplicateEmailError extends Error {}

const lower = (e) => String(e || "").toLowerCase();

export function createUseCases({ students, lookups, teachers, joinRequests, auth, admins, subjects, library, settings, baseAdminEmail = "", hashPin }) {
  assertPort("StudentRepository", students);
  assertPort("RegistrationIndexRepository", lookups);
  assertPort("TeacherRepository", teachers);
  assertPort("JoinRequestRepository", joinRequests);
  assertPort("AuthGateway", auth);
  assertPort("AdminRepository", admins);
  assertPort("SubjectRepository", subjects);
  assertPort("LibraryRepository", library);
  assertPort("SettingsRepository", settings);

  /** بعد ربط حساب الطالب: نمسح الرقم السري من الفهرس العام ونعلّم الحساب مربوط. محاولة غير حرجة: مبترميش. */
  async function clearLookupPin(email) {
    try {
      const em = lower(email);
      const lk = await lookups.get(em);
      if (lk && lk.pinHash) await lookups.update(em, { pinHash: "", authLinked: true });
    } catch (e) { console.warn("تعذر تنضيف فهرس التسجيل بعد الربط", e); }
  }

  return {
    /** تسجيل طالب جديد: بيرفض الإيميل المكرر، وبيحفظ الرقم السري مهشّر، والطلب بيبدأ pending. */
    async registerStudent({ name, email, grade, phone, parentPhone, pin, teacherIds }) {
      if (await lookups.get(email)) throw new DuplicateEmailError(email);
      const pinHash = await hashPin(email + ":" + pin);
      const id = await students.register({ name, email, grade, phone, parentPhone, pinHash, teacherIds, status: "pending" });
      await lookups.create(email, { pinHash, saltEmail: email, status: "pending", studentId: id, teacherIds });
      return id;
    },

    /** تغيير حالة طالب (قبول/إيقاف/رجوع...) مع فهرس تسجيله لو عنده إيميل. */
    async changeStudentStatus(student, status) {
      await students.changeStatus(student.id, student.email ? lower(student.email) : null, status);
    },

    clearLookupPin,

    /** أول دخول بالرقم السري: نتأكد من الفهرس العام، نعمل حساب Auth بالباسورد، وننقل ملف الطالب لنفس الـ uid. */
    async completeFirstLogin(email, pin, newPass) {
      const em = lower(email);
      const l = await lookups.get(em);
      if (!l) throw new Error("الإيميل ده مش مسجل. سجّل حسابك الأول.");
      if (l.status !== "approved") throw new Error(l.status === "rejected" ? "طلبك اترفض، كلّم مدرسك." : "المدرس لسه ما وافق على طلبك.");
      const hash = await hashPin((l.saltEmail || em) + ":" + pin);
      if (hash !== l.pinHash) throw new Error("الرقم السري غلط.");
      const user = await auth.createUser(em, newPass);
      const d = (await students.get(l.studentId)) || {};
      await students.replaceProfile(user.uid, {
        ...d, email: em, status: d.status || "approved", teacherIds: d.teacherIds || [], pinHash: "", authLinked: true,
        emailVerifyRequired: true, // حساب جديد: لازم يفعّل إيميله قبل أول دخول
      }, l.studentId && l.studentId !== user.uid ? l.studentId : null);
      await clearLookupPin(em);
      // لو الإرسال فشل مش بنوقف إنشاء الحساب — يقدر يطلب لينك تاني من بوابة التفعيل
      try { await user.sendEmailVerification(); } catch (_) {}
      return user;
    },

    /** حالة الرقم السري للمشرف: {doc, hasPin}. بيرمي لو القراءة فشلت. */
    async loadAdminPinState(email) {
      const doc = await admins.get(lower(email));
      return { doc, hasPin: !!(doc && doc.pinHash) };
    },

    /** هل الرقم السري المكتوب مطابق لرقم المشرف؟ */
    async verifyAdminPin(email, doc, pin) { return (await hashPin(lower(email) + ":" + pin)) === doc.pinHash; },

    /** حفظ أول رقم سري للمشرف (بيعدّل مستنده لو موجود، أو بينشئه). */
    async setAdminPin(email, doc, pin) {
      const em = lower(email);
      const pinHash = await hashPin(em + ":" + pin);
      if (doc) await admins.setPinHash(em, pinHash);
      else await admins.create(em, { email: em, name: em === baseAdminEmail ? "الأدمن الأساسي" : "مشرف", pinHash, addedBy: "النظام" });
    },

    // ---- إدارة المنصة (أدمن): المواد، المكتبة، الإعدادات، المشرفين
    addSubject: (d) => subjects.add(d),
    updateSubject: (id, d) => subjects.update(id, d),
    deleteSubject: (id) => subjects.remove(id),
    addCoreSubjects: (list) => subjects.addCore(list),
    saveLibraryItem: (id, data, createdBy) => library.save(id, data, createdBy),
    deleteLibraryItem: (id) => library.remove(id),
    setCurrentTerm: (t) => settings.setCurrentTerm(t),
    publishBroadcast: (b) => settings.publishBroadcast(b),
    clearBroadcast: () => settings.clearBroadcast(),
    saveSettingsSection: (name, data) => settings.saveSection(name, data),
    addAdmin: (email, name, addedBy) => admins.add(lower(email), name, addedBy),
    removeAdmin: (email) => admins.remove(lower(email)),
    /** تغيير الرقم السري لمشرف موجود. */
    async changeAdminPin(email, pin) { const em = lower(email); await admins.setPinHash(em, await hashPin(em + ":" + pin)); },

    /** تعديل بيانات طالب من الأدمن. لو الحساب مش مربوط واتغير الإيميل بينتقل فهرس التسجيل للإيميل الجديد. */
    async editStudent(id, current, { name, grade, phone, parentPhone, email }, linked) {
      const oldEmail = String(current.email || "").toLowerCase();
      const newData = { name, grade, phone, parentPhone };
      if (!linked) newData.email = email;
      await students.update(id, newData);
      if (!linked && email !== oldEmail) await lookups.move(oldEmail, email, id, { status: current.status || "pending", teacherIds: current.teacherIds || [] });
    },

    /** تغيير صف طالب واحد. */
    async changeStudentGrade(studentId, grade) { await students.update(studentId, { grade }); },

    /** إيقاف طالب عن محتوى مدرس بعينه (من غير ما يتأثر باقي مدرسيه) أو رجوعه. */
    async suspendStudentForTeacher(studentId, teacherId, suspend) { await students.setSuspendedFor(studentId, teacherId, suspend); },

    /** إيميل إعادة ضبط الباسورد. */
    async sendPasswordReset(email) { await auth.sendPasswordReset(email); },

    /** حفظ رقم ولي الأمر في ملف الطالب. */
    async saveParentPhone(studentId, phone) { await students.update(studentId, { parentPhone: phone }); },

    /** ربط ذاتي لحساب طالب موجود في Auth لكن ملفه مش بنفس الـ uid. بيرجّع {ok:true} أو {ok:false, stage:"R0..R6"} */
    async relinkStudent(email, user) {
      const fail = (stage) => ({ ok: false, stage });
      try {
        const em = lower(email);
        if (!em || !user || !user.uid) return fail("R0");
        const l = await lookups.get(em);
        if (!l) return fail("R1");
        if (l.status !== "approved" || !l.studentId || l.studentId === user.uid) return fail("R2");
        let d;
        try { d = await students.get(l.studentId); } catch (_) { return fail("R3"); }
        if (!d) return fail("R3");
        if (lower(d.email) !== em) return fail("R4");
        // القواعد بتشترط إن المدرسين في المستند الجديد يطابقوا الفهرس بالظبط
        const dT = (d.teacherIds || []).slice().sort().join("\u0001");
        const lT = (l.teacherIds || []).slice().sort().join("\u0001");
        if (dT !== lT) return fail("R6");
        await students.replaceProfile(user.uid, { ...d, email: em, status: "approved", teacherIds: d.teacherIds || [], pinHash: "", authLinked: true }, l.studentId);
        await clearLookupPin(em);
        return { ok: true };
      } catch (e) { return { ok: false, stage: "R5", code: (e && e.code) || "" }; }
    },

    /** مدرس بإيميل معين مسجّل عندنا؟ */
    isTeacherEmailRegistered(email) { return teachers.isEmailRegistered(lower(email)); },

    /** نقل مجموعة طلاب لصف تاني. */
    async transferStudents(studentIds, grade) {
      await students.changeGrade(studentIds, grade);
    },

    /** قبول/رفض طلب طالب عاوز يضيف مدرس. القبول بيحدّث فهرس الطالب كمان (فشله مش بيوقف القبول). */
    async answerJoinRequest(request, accept, teacherId) {
      await joinRequests.answer({ requestId: request.id, studentId: request.studentId, accept, teacherId });
      if (accept && request.email) {
        try { await lookups.addTeacher(lower(request.email), teacherId); } catch (_) {}
      }
    },

    /** حذف طالب نهائيًا مع كل بياناته. */
    async deleteStudentEverywhere(student) {
      const id = student.id || student;
      const email = lower(student.email);
      const counts = await students.removeResultsOf(id);
      await students.removeWithIndex(id, email || null);
      return counts;
    },

    /** حفظ محاولة الطالب (كويز أو امتحان). */
    async submitAttempt(docId, data) { await students.saveAttempt(docId, data); },

    /** إضافة مدرس جديد (بعد إنشاء حسابه): الملف الخاص + العامة + أول دفعة لو اشتراكه مش مجاني، في دفعة واحدة. */
    async addTeacher(id, privateData, publicData, payment) { await teachers.save({ mode: "create", id, privateData, publicData, payment: payment || null }); },

    /** تعديل بيانات مدرس (الخاص + العام) مع تسجيل دفعة لو الاشتراك اتجدد. */
    async updateTeacher(id, privateData, publicData, payment) { await teachers.save({ mode: "update", id, privateData, publicData, payment: payment || null }); },

    /** تسجيل دفعة واشتراك جديد لمدرس. */
    async recordTeacherPayment(id, subData, payment) { await teachers.save({ mode: "update", id, privateData: subData, publicData: { subType: subData.subType, subEnd: subData.subEnd }, payment }); },

    /** إيقاف مدرس مؤقتًا أو إرجاعه. */
    async setTeacherActive(id, active) { await teachers.save({ mode: "update", id, privateData: { active }, publicData: { active }, payment: null }); },

    /** حذف مدرس من كل حتة (محتواه ونتايج طلابه وقوائم طلابه وملفه ونسخته العامة). */
    async deleteTeacherEverywhere(teacher) {
      const id = teacher.id || teacher;
      const counts = await teachers.removeContentOf(id);
      counts.students = await students.detachTeacher(id);
      await teachers.removeWithPublic(id);
      return counts;
    },
  };
}
