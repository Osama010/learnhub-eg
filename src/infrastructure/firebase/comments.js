/* أسئلة وتعليقات الدروس (collection: lessonComments). الاستعلامات محدودة (100) وبفلتر المدرس عشان قواعد الأمان. */
import { db } from "./db.js";
import { rows } from "./mapping.js";
export const listLessonComments = (lessonId, teacherId) => db.lessonComments().where("lessonId", "==", lessonId).where("teacherId", "==", teacherId).limit(100).get().then(rows);
export const listCommentsOfTeacher = (teacherId) => db.lessonComments().where("teacherId", "==", teacherId).limit(100).get().then(rows);
export const addLessonComment = (data) => db.lessonComments().add(data);
export const replyToComment = (id, reply, replyAt) => db.lessonComments().doc(id).update({ reply, replyAt });
export const deleteLessonComment = (id) => db.lessonComments().doc(id).delete();
