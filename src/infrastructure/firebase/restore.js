/* استرجاع مستند من نسخة احتياطية بنفس الـ id (lessons / quizzes / exams بس). */
import { db } from "./db.js";
const ALLOWED = ["lessons", "quizzes", "exams"];
export const restoreDoc = (col, id, data) => {
  if (!ALLOWED.includes(col)) return Promise.reject(new Error("collection مش مسموح: " + col));
  return db[col]().doc(id).set(data);
};
