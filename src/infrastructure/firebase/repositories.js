/* تنفيذ البورتس بـ Firebase (Firestore). بيستخدم دوال الوصول للبيانات الموجودة جنبه. */
import { newBatch } from "./batch.js";
import { updateStudent, getStudent, setStudent, deleteStudent, addStudent, batchDeleteLookup, batchSetLookup, batchDeleteStudent, batchUpdateLookup, batchUpdateStudent, detachTeacherFromStudents, getLookup, setLookup, updateLookup, wipeByStudent } from "./students.js";
import { isTeacherEmailRegistered, batchDeleteTeacher, batchSetTeacher, batchUpdateTeacher, wipeByTeacher } from "./teachers.js";
import { saveAttempt } from "./activity.js";
import { getAdmin, setAdmin, setSettings, newPaymentRef } from "./queries.js";
import { addAdmin, removeAdmin, setAdminPinHash } from "./admins.js";
import { addCoreSubjects, addSubject, deleteSubject, updateSubject } from "./subjects.js";
import { deleteLibraryItem, saveLibraryItem } from "./library.js";
import { clearBroadcast, publishBroadcast, setCurrentTerm } from "./settings.js";
import { createAuthUser, sendPasswordReset } from "./auth.js";
import { batchSetRequestStatus } from "./requests.js";

const TEACHER_COLLECTIONS = ["lessons", "quizzes", "exams", "announcements", "questionBank", "studentNotes", "quizAttempts", "lessonRatings"];

export function firebaseRepositories() {
  return {
    students: {
      saveAttempt: (docId, data) => saveAttempt(docId, data),
      get: (id) => getStudent(id),
      update: (id, patch) => updateStudent(id, patch),
      setSuspendedFor: (id, teacherId, suspend) => updateStudent(id, {
        suspendedBy: suspend ? firebase.firestore.FieldValue.arrayUnion(teacherId) : firebase.firestore.FieldValue.arrayRemove(teacherId),
      }),
      async replaceProfile(newId, data, oldId) { await setStudent(newId, data); if (oldId) await deleteStudent(oldId); },
      register: async (data) => (await addStudent({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() })).id,
      async changeStatus(id, email, status) {
        const batch = newBatch();
        batchUpdateStudent(batch, id, { status });
        if (email) batchUpdateLookup(batch, email, { status });
        await batch.commit();
      },
      async changeGrade(ids, grade) {
        for (let i = 0; i < ids.length; i += 400) {
          const batch = newBatch();
          ids.slice(i, i + 400).forEach((id) => batchUpdateStudent(batch, id, { grade }));
          await batch.commit();
        }
      },
      async removeResultsOf(id) {
        const attCount = await wipeByStudent("quizAttempts", id);
        const rateCount = await wipeByStudent("lessonRatings", id);
        return { attCount, rateCount };
      },
      async removeWithIndex(id, email) {
        const batch = newBatch();
        batchDeleteStudent(batch, id);
        if (email) batchDeleteLookup(batch, email);
        await batch.commit();
      },
      detachTeacher: (teacherId) => detachTeacherFromStudents(teacherId),
    },
    lookups: {
      get: (email) => getLookup(email),
      create: (email, data) => setLookup(email, data),
      move: async (oldEmail, email, studentId, fallback) => {
        const oldLk = await getLookup(oldEmail);
        const data = oldLk ? oldLk : fallback;
        const batch = newBatch();
        batchSetLookup(batch, email, { ...data, studentId, saltEmail: data.saltEmail || oldEmail });
        batchDeleteLookup(batch, oldEmail);
        await batch.commit();
      },
      update: (email, patch) => updateLookup(email, patch),
      addTeacher: (email, teacherId) => updateLookup(email, { teacherIds: firebase.firestore.FieldValue.arrayUnion(teacherId) }),
    },
    teachers: {
      isEmailRegistered: (email) => isTeacherEmailRegistered(email),
      async removeContentOf(teacherId) {
        const counts = {};
        for (const col of TEACHER_COLLECTIONS) counts[col] = await wipeByTeacher(col, teacherId);
        return counts;
      },
      async save({ mode, id, privateData, publicData, payment }) {
        const batch = newBatch();
        (mode === "create" ? batchSetTeacher : batchUpdateTeacher)(batch, id, privateData, publicData);
        if (payment) batch.set(newPaymentRef(), payment);
        await batch.commit();
      },
      async removeWithPublic(id) {
        const batch = newBatch();
        batchDeleteTeacher(batch, id);
        await batch.commit();
      },
    },
    subjects: {
      add: (d) => addSubject(d), update: (id, d) => updateSubject(id, d), remove: (id) => deleteSubject(id), addCore: (list) => addCoreSubjects(list),
    },
    library: { save: (id, data, by) => saveLibraryItem(id, data, by), remove: (id) => deleteLibraryItem(id) },
    settings: {
      setCurrentTerm: (t) => setCurrentTerm(t), publishBroadcast: (b) => publishBroadcast(b), clearBroadcast: () => clearBroadcast(),
      saveSection: (name, data) => setSettings(name, data, { merge: true }),
    },
    admins: {
      add: (email, name, by) => addAdmin(email, name, by),
      remove: (email) => removeAdmin(email),
      get: (email) => getAdmin(email),
      create: (email, data) => setAdmin(email, { ...data, addedAt: firebase.firestore.FieldValue.serverTimestamp() }),
      setPinHash: (email, pinHash) => setAdminPinHash(email, pinHash),
    },
    auth: {
      sendPasswordReset: (email) => sendPasswordReset(email),
      async createUser(email, password) {
        const cred = await createAuthUser(email, password);
        return { uid: cred.user.uid, sendEmailVerification: () => cred.user.sendEmailVerification() };
      },
    },
    joinRequests: {
      async answer({ requestId, studentId, accept, teacherId }) {
        const batch = newBatch();
        if (accept) batchUpdateStudent(batch, studentId, { teacherIds: firebase.firestore.FieldValue.arrayUnion(teacherId) });
        batchSetRequestStatus(batch, requestId, accept ? "accepted" : "rejected");
        await batch.commit();
      },
    },
  };
}
