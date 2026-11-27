/* لوحة شرف الكويزات (collection: quizBoard): كل طالب بيكتب مستنده بس، وزمايله عند نفس المدرس بيقروه. */
import { db } from "./db.js";
import { rows } from "./mapping.js";
export const listQuizBoard = (teacherIds) => db.quizBoard().where("teacherId", "in", teacherIds.slice(0, 10)).limit(200).get().then(rows);
export const saveQuizBoardEntry = (id, data) => db.quizBoard().doc(id).set(data);
