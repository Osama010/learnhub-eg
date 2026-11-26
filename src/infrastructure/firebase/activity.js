/* نتائج الكويزات والتقييمات وسجل النشاط (collections: quizAttempts, lessonRatings, activityLog) */
import { db } from "./db.js";
import { rows, plain } from "./mapping.js";
export const listAttemptsOfTeacher = (teacherId) => db.quizAttempts().where("teacherId", "==", teacherId).get().then(rows);
export const listRatingsOfTeacher = (teacherId) => db.lessonRatings().where("teacherId", "==", teacherId).get().then(rows);
export const listAttemptsOfStudent = (studentId) => db.quizAttempts().where("studentId", "==", studentId).get().then(rows);
export const listRatingsOfStudent = (studentId) => db.lessonRatings().where("studentId", "==", studentId).get().then(rows);
export const saveAttempt = (docId, data) => db.quizAttempts().doc(docId).set(data);
export const saveRating = (studentId, lessonId, data) => db.lessonRatings().doc(studentId + "_" + lessonId).set(data);
export const listActivityOfTeacher = (teacherId) => db.activityLog().where("teacherId", "==", teacherId).get().then(plain);
export const listActivityOfTeachers = (teacherIds) => db.activityLog().where("teacherId", "in", teacherIds).get().then(plain);
export const addActivity = (data) => db.activityLog().add(data);
/** تسجيل يوم نشاط على ملف الطالب (نار ونسيان). */
export const markStudentActiveDay = (uid, upd) => db.students().doc(uid).update(upd);
