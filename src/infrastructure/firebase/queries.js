/* استعلامات عامة على أكتر من collection بالاسم (للأدمن والنقل والحذف) */
import { db } from "./db.js";
import { rows, one } from "./mapping.js";
export const listByTeacher = (col, teacherId) => db[col]().where("teacherId", "==", teacherId).get().then(rows);
export const listByTeacherIn = (col, ids) => db[col]().where("teacherId", "in", ids).get().then(rows);
export const listCreatedSince = async (col, field, ts) => rows(await db[col]().where(field, ">=", ts).get());
export const countByStage = (col, stage) => db[col]().where("stage", "==", stage).count().get().then((s) => s.data().count);
export const listLibraryNewestFirst = () => db.library().orderBy("createdAt", "desc").get().then(rows);
export const listLessonsOfTeacher = (teacherId) => db.lessons().where("teacherId", "==", teacherId).get().then(rows);
export const listExamsOfTeacher = (teacherId) => db.exams().where("teacherId", "==", teacherId).get().then(rows);
export const listQuizzesOfTeacher = (teacherId) => db.quizzes().where("teacherId", "==", teacherId).get().then(rows);
export const addQuizRaw = (data) => db.quizzes().add(data);
export const dropLessonQuizField = (id) => db.lessons().doc(id).update({ quiz: firebase.firestore.FieldValue.delete() });
export const getLessonMedia = (id) => db.lessonMedia().doc(id).get().then(one);
export const getLessonFileChunk = (lessonId, i) => db.lessonFileChunks().doc(lessonId + "_" + i).get().then(one);
export const getBroadcast = () => db.broadcasts().doc("current").get().then(one);
export const getSettings = (name) => db.settings().doc(name).get().then(one);
export const setSettings = (name, data, opts) => db.settings().doc(name).set(data, opts);
export const getAdmin = (email) => db.admins().doc(email).get().then(one);
export const setAdmin = (email, data) => db.admins().doc(email).set(data);
export const listAdmins = () => db.admins().get().then(rows);
export const listSubjects = () => db.subjects().get().then(rows);
/* بنك الأسئلة */
export const listBankOfTeacher = (teacherId) => db.questionBank().where("teacherId", "==", teacherId).get().then(rows);
export const deleteBankItem = (id) => db.questionBank().doc(id).delete();
export const batchAddBankItem = (batch, data) => batch.set(db.questionBank().doc(), data);
export const batchBumpBankUse = (batch, id, useCount) => batch.update(db.questionBank().doc(id), { useCount });
/* سجل الأدمن والمدفوعات */
export const addAdminLog = (data) => db.adminLog().add(data);
export const newPaymentRef = () => db.subscriptionPayments().doc();
export const addPayment = (data) => db.subscriptionPayments().doc().set(data);
export const listPayments = () => db.subscriptionPayments().orderBy("paidAt", "desc").limit(500).get().then(rows);
export const listAdminLog = () => db.adminLog().orderBy("at", "desc").limit(300).get().then(rows);
