/* نقطة الوصول الوحيدة لـ collections في Firestore. الواجهات بتنادي db.students() وهكذا،
   فأسماء الـ collections متجمّعة هنا في مكان واحد (وتتطابق مع docs/firestore.rules). */
import { fbDb } from "./client.js";

export const db = {
  batch: () => fbDb.batch(),
  activityLog: () => fbDb.collection("activityLog"),
  adminLog: () => fbDb.collection("adminLog"),
  admins: () => fbDb.collection("admins"),
  announcements: () => fbDb.collection("announcements"),
  broadcasts: () => fbDb.collection("broadcasts"),
  exams: () => fbDb.collection("exams"),
  lessonFileChunks: () => fbDb.collection("lessonFileChunks"),
  lessonMedia: () => fbDb.collection("lessonMedia"),
  lessonRatings: () => fbDb.collection("lessonRatings"),
  lessons: () => fbDb.collection("lessons"),
  library: () => fbDb.collection("library"),
  questionBank: () => fbDb.collection("questionBank"),
  quizAttempts: () => fbDb.collection("quizAttempts"),
  quizzes: () => fbDb.collection("quizzes"),
  registrationLookup: () => fbDb.collection("registrationLookup"),
  settings: () => fbDb.collection("settings"),
  studentNotes: () => fbDb.collection("studentNotes"),
  students: () => fbDb.collection("students"),
  subjects: () => fbDb.collection("subjects"),
  subscriptionPayments: () => fbDb.collection("subscriptionPayments"),
  teacherSignups: () => fbDb.collection("teacherSignups"),
  teacherRequests: () => fbDb.collection("teacherRequests"),
  teachers: () => fbDb.collection("teachers"),
  teachersPublic: () => fbDb.collection("teachersPublic"),
};
